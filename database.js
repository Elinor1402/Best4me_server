//const bcryptjs = require('bcryptjs');
const { compareSync } = require("bcryptjs");
const { Pool } = require("pg");
// const email = require("./emails");
const { user } = require("pg/lib/defaults");
const bcrypt = require("bcryptjs");

const pool = new Pool({
  //user: 'fs-info',
  // user: "fs-info",
  user: "postgres",
  //host: '192.114.5.161',
  host: "localhost",
  database: "fs-info-db",
  password: "Elinorz2000",
  port: 5432,
  max: 40, // Max 20 connection
  connectionTimeoutMillis: 0, // if all the connection are busy, "0" means "wait forever" (we can change it to shorter time)
  idleTimeoutMillis: 0, // this destroy the connection if it is no use. "0" means never - but we can set any other number and it will be in seconds
});

//my change
pool.connect();

//login of admin.
const login = function (companyID, password) {
  return new Promise(function (resolve, reject) {
    pool
      .query(
        `SELECT "company_id", "Password" FROM "company_info" WHERE "company_id" = $1`,
        [companyID]
      )
      .then((user) => {
        if (user.rowCount == 0) {
          reject(new Error("admin does not exist"));
        }
        //if the password is incorrect
        else if (!compareSync(password, user.rows[0].Password)) {
          reject(new Error("wrong password"));
        } else {
          // if the user exists and the password is correct
          resolve(user.rows.od);
        }
      })
      .catch((err) => {
        console.log(err);
        reject(new Error("company id invalid, use only numbers"));
      });
  });
};

//login of user.
const loginUser = function (userID, password) {
  return new Promise(function (resolve, reject) {
    console.log("User id and password", userID, password);

    pool
      .query(
        `SELECT "Organizations domain" as od, ue."password",
        a.id AS answerid 
         FROM "users_email" ue JOIN 
         "company_info" ci 
         ON 
         ue."company_id" = ci."company_id" JOIN 
         "answers" a 
       ON 
         ci."Organizations domain" = a."answer" 
         WHERE ue."user_id" = $1`,
        [userID]
      )
      .then((user) => {
        console.log("User details", user.rows[0].password);

        if (user.rowCount == 0) {
          // if the user doesn't exist
          console.log("faild  user");
          //reject(false);
          reject(new Error("user does not exist"));
        }
        //if the password is incorrect
        else if (!compareSync(password, user.rows[0].password)) {
          reject(new Error("wrong password"));
        } else {
          // if the user exists and the password is correct
          console.log("Result", user.rows[0]);
          resolve({ od: user.rows[0].od, answerID: user.rows[0].answerid });
        }
      })
      .catch((err) => {
        console.log(err);
        console.log("faild");
        reject(new Error("userID does not valid, use only numbers"));
      });
  });
};
//sign up of admin.
const register = async function (formData) {
  try {
    console.log("Form data", formData);
    var companyID = Math.floor(1 + Math.random() * 9000);

    // Check if the email already exists
    const admin = await pool.query(
      `SELECT "company_id" FROM "company_info" WHERE "Referent email" = $1`,
      [formData["Referent email"]]
    );

    if (admin.rowCount != 0) {
      console.log("Try check Email exist", admin.rowCount);
      throw new Error("email already exists, use another one");
    }

    // Insert into company_info
    await pool.query(`INSERT INTO company_info (company_id) VALUES ($1)`, [companyID]);

    if (typeof formData === "object" && formData !== null) {
      if (formData.Password) {
        const email = require("./emails");
        email.sendAdminEmail(formData["Referent email"], formData.Password, companyID);
        const hashedPassword = bcrypt.hashSync(formData.Password, 5);
        formData.Password = hashedPassword;
      }

      const updatePromises = Object.entries(formData).map(([key, value]) => {
        // const sanitizedKey = `"${key.replace(/"/g, '""')}"`;
        const sanitizedKey = `"${key.replace(/’/g, '')}"`;
        // console.log("sanitizedKey New", sanitizedKey);
        const queryText = `UPDATE company_info SET ${sanitizedKey} = $1 WHERE company_id = $2`;
        return pool.query(queryText, [value, companyID]);
      });

      // Wait for all updates to complete
      await Promise.all(updatePromises);

    } else {
      throw new Error("formData is not an object. It is:", typeof formData);
    }

    return `${companyID}`;

  } catch (error) {
    console.error(error);
    throw error;
  }
};

//delete client amswers by his ID
const deleteUsersAnswers = async function (userID) {
  const deleteQuery = "DELETE FROM users_answers WHERE user_id = $1;";
  try {
    const res = await pool.query(deleteQuery, [userID]);
    console.log("user id ,Row deleted:", userID, res.rowCount);
  } catch (error) {
    console.error("Error querying the database:", error);
    throw error;
  }
};
// This func gets email,password,userID and companyID and saves them in the database.
// Each email is a employee
const saveEmail = function (email, password, companyID, userID) {
  console.log("All data", email, password, companyID, userID);
  return new Promise(function (resolve, reject) {
    const date = new Date();
    const hashedPassword = bcrypt.hashSync(password, 5);
    pool
      .query(
        `SELECT user_id FROM users_email WHERE email = $1 AND company_id = $2`,
        [email, companyID]
      )
      .then((result) => {
        if (result.rows.length > 0) {
          deleteUsersAnswers(result.rows[0].user_id);
          resolve(result.rows[0].user_id);
          console.log("After resolve");
          return pool.query(
            `UPDATE users_email 
             SET password = $1, email_date = $2
             WHERE email = $3 AND company_id = $4`,
            [hashedPassword, date.toLocaleString(), email, companyID]
          );
        } else {
          resolve(userID);
          return pool.query(
            `INSERT INTO users_email (user_id, email, password, company_id, isdone, email_date)
            VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              userID,
              email,
              hashedPassword,
              companyID,
              false,
              date.toLocaleString(),
            ]
          );
        }
      })
      .catch((e) => {
        reject(e);
      });
  });
};
//save the form answers of the client.
const saveAnswers = async function (formData, userID) {
  try {
    // Convert formData into a JSONB object
    const answersJson = JSON.stringify(formData);

    // Define the SQL query to insert or update the user answers
    const insertQuery = `
      INSERT INTO users_answers (user_id, answers)
      VALUES ($1, $2::jsonb)
      ON CONFLICT (user_id) DO UPDATE SET answers = users_answers.answers || EXCLUDED.answers;
    `;
    // Execute the query
    await pool.query(insertQuery, [userID, answersJson]);
    console.log("Answers saved successfully.");
  } catch (error) {
    console.error("Error querying the database:", error);
    throw error;
  }
};

//use this in passport.js for authentication and authorization.
const findAdmin = function (companyID) {
  return new Promise(function (resolve, reject) {
    pool
      .query(
        `SELECT "company_id", "Password" FROM company_info WHERE company_id = $1`,
        [companyID]
      )
      .then((user) => {
        resolve(user);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

const findReferentEmail = function (email) {
  return new Promise(function (resolve, reject) {
    pool
      .query(`SELECT * FROM company_info WHERE "Referent email" = $1`, [email])
      .then((referent) => {
        if (!referent.rows.length){
          console.log("Reject email")
          reject(new Error(`Email not found`));}
        else {
          resolve(true);
        }
      })
      .catch((err) => {
        console.log(err);
        reject(err);
      });
  });
}

//use this in passport.js for authentication and authorization.
const findUser = function (userID) {
  return new Promise(function (resolve, reject) {
    pool
      .query(
        `SELECT "user_id", "password" FROM users_email WHERE user_id = $1`,
        [userID]
      )
      .then((user) => {
        resolve(user);
      })
      .catch((err) => {
        console.log("Error here");
        reject(err);
      });
  });
};
//get all clients that got an email from the admin.
const getusers = function (companyID) {
  return new Promise(function (resolve, reject) {
    pool
      .query(`SELECT * FROM users_email WHERE company_id = $1`, [companyID])
      .then((users) => {
        if (!users.rows.length)
          reject(new Error(`Users not found, emails were not sent`));
        else {
          resolve(users);
        }
      })
      .catch((err) => {
        console.log(err);
        reject(err);
      });
  });
};
//update client status that he filled the form and submit it.
const updateFillStatus = function (companyID, usersData) {
  return new Promise(function (resolve, reject) {
    usersData.slice(1).map((row) => {
      const email = row[row.length - 1].trim(); // Extract email address
      if (email) {
        pool
          .query(
            `UPDATE users_email SET isdone = $1 WHERE company_id = $2 AND email = $3`,
            [true, companyID, email]
          )
          .then((result) => {
            resolve(1);
          })
          .catch((e) => {
            console.error(e);
            reject(e);
          });
      }
    });
  });
};

const getFirstQuestions = async function () {
  try {
    // Select all questions with page = 1
    const questionsResult = await pool.query(
      "SELECT * FROM questions WHERE page = $1 or page = $2 ORDER BY id ASC",
      [1,1.1]
    );
    const questions = questionsResult.rows;
    // Fetch answers for each question using qtoa table
    for (let question of questions) {
      const qtoaResult = await pool.query(
        "SELECT answerid FROM qtoa WHERE questionid = $1",
        [question.id]
      );
      const answerIds = qtoaResult.rows.map((row) => row.answerid);

      if (answerIds.length > 0) {
        console.log("Got here");
        const answersResult = await pool.query(
          "SELECT * FROM answers WHERE id = ANY($1::int[])",
          [answerIds]
        );
        question.answers = answersResult.rows;
      } else {
        question.answers = [];
      }
      // Fetch answer type for each question from q_appearance table
      const qApperanceResult = await pool.query(
        "SELECT answer_type, input_type FROM q_appearance WHERE questionid = $1",
        [question.id]
      );
      // Assign answer_type to question
      if (qApperanceResult.rows.length > 0) {
        // Assuming there is only one answer type associated with each question
        question.answerType = qApperanceResult.rows[0].answer_type;
        question.inputType = qApperanceResult.rows[0].input_type;
      } else {
        // If no answer type found, set it to null or a default value
        question.answerType = null; // Or set a default value as needed
        question.inputType = null;
      }
    }
    return questions;
  } catch (error) {
    console.log(error);
    return { error: "Internal server error" };
  }
};

// Function to get questions for clients by company domain to show that in form
const getQuestions = async function (answerID, userID) {
  try {
    // Query to fetch all required data using joins
    const query = `
        SELECT
          q.id AS question_id,
          q.question,
          qa.answer_type,
          a.id AS answer_id,
          a.answer
        FROM
        atoq at JOIN questions q ON q.id = at.next_questionid
        JOIN q_appearance qa ON qa.questionid = q.id
        LEFT JOIN qtoa qt ON qt.questionid = q.id AND qa.answer_type = 2
        LEFT JOIN answers a ON a.id = qt.answerid
        WHERE at.answerid =$1;
      `;
    // Execute the query
    const result = await pool.query(query, [answerID]);
    const rows = result.rows;

    // Process the result to group answers by question
    const questionsMap = {};
    rows.forEach((row) => {
      const questionId = row.question_id;
      if (!questionsMap[questionId]) {
        questionsMap[questionId] = {
          //id: questionId,
          question: row.question,
          answerType: row.answer_type,
          answers: row.answer_type === 2 ? [] : "None",
        };
      }
      if (row.answer_type === 2) {
        questionsMap[questionId].answers.push({
          //answer_id: row.answer_id,
          answer: row.answer,
        });
      }
    });
    // Build the JSONB object for answers
    const answersJson = {};
    for (const [questionId, questionData] of Object.entries(questionsMap)) {
      let answer;
      if (questionData.answerType === 2 && questionData.answers.length > 0) {
        answer = questionData.answers[0].answer; // Get the first answer
      } else if (questionData.answerType === 1) {
        answer = ""; // Insert an empty string for answerType 1
      } else {
        continue; // Skip if there are no relevant answers to insert
      }
      answersJson[questionData.question] = answer;
    }
    const query2 = "SELECT user_id FROM users_answers WHERE user_id = $1";
    const values = [userID];
    const res = await pool.query(query2, values);

    if (res.rows.length <= 0) {
      const insertQuery = `
      INSERT INTO users_answers (user_id, answers)
      VALUES ($1, $2::jsonb)
      ON CONFLICT (user_id) DO UPDATE SET answers = users_answers.answers || EXCLUDED.answers;
    `;
      await pool.query(insertQuery, [userID, answersJson]);
    }

    // Convert the map to a list
    const finalResult = Object.values(questionsMap);

    // Send the final result as response
    return finalResult;
  } catch (error) {
    console.log(error);
    return { error: "Internal server error" };
  }
};

// Function to get client answers in the form
const getUserAnswers = async function (userID) {
  const query = "SELECT answers FROM users_answers WHERE user_id = $1;";

  try {
    const res = await pool.query(query, [userID]);
    if (res.rows.length > 0) {
      return res.rows[0].answers;
    } else {
      return null; // Or handle no result found case
    }
  } catch (err) {
    console.error("Error executing query", err.stack);
    throw err;
  }
};
//Get the id of answer
const getAnswersID = async function (answer) {
  try {
    const query = "SELECT id FROM answers WHERE answer = $1";
    const values = [answer];

    const res = await pool.query(query, values);

    if (res.rows.length > 0) {
      return res.rows[0].id;
    } else {
      throw new Error("Answer not found");
    }
  } catch (error) {
    console.error("Error querying the database:", error);
    throw error;
  }
};

module.exports = { register, login, findAdmin, findUser, saveEmail, saveAnswers, getusers, updateFillStatus, getFirstQuestions, getQuestions, loginUser, getAnswersID, getUserAnswers, findReferentEmail };
