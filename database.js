//const bcryptjs = require('bcryptjs');
const { compareSync } = require("bcryptjs");
const { Pool } = require("pg");
const { user } = require("pg/lib/defaults");
const bcrypt = require("bcryptjs");

const pool = new Pool({
  //user: 'fs-info',
  user: "postgres",
  //host: '192.114.5.161',
  host: "localhost",
  database: "fs-info-db",
  //password: '123',
  password: "Elinorz2000",
  port: 5432,
  max: 40, // Max 20 connection
  connectionTimeoutMillis: 0, // if all the connection are busy, "0" means "wait forever" (we can change it to shorter time)
  idleTimeoutMillis: 0, // this destroy the connection if it is no use. "0" means never - but we can set any other number and it will be in seconds
});

//my change
pool.connect();

// Define the updateStatus function

const login = function (companyID, password) {
  //console.log("try connect",companyID,password);

  return new Promise(function (resolve, reject) {
    pool
      .query(
        `SELECT "company_id", "Password" FROM "company_info" WHERE "company_id" = $1`,
        [companyID]
      )
      .then((user) => {
        console.log("User details", user);
        if (user.rowCount == 0) {
          // if the user doesn't exist
          console.log("faild  user");
          //reject(false);
          reject(new Error("companyID does not exist"));
        }
        //if the password is incorrect
        else if (!compareSync(password, user.rows[0].Password)) {
          reject(new Error("wrong password"));
        } else {
          // if the user exists and the password is correct
          //resolve(1);
          resolve(user.rows.od);
        }
      })
      .catch((err) => {
        console.log(err);
        console.log("faild");
        reject(new Error("companyID does not valid, use only numbers"));
      });
  });
};

const loginUser = function (userID, password) {
  return new Promise(function (resolve, reject) {
    // console.log("User id", userID, password);

    pool
      .query(
        `SELECT "Organizations domain" as od, ue."password" 
         FROM "users_email" ue JOIN 
         "company_info" ci 
         ON 
         ue."company_id" = ci."company_id" WHERE ue."user_id" = $1`,
        [userID]
      )
      .then((user) => {
        console.log("User details", user.rows[0].password);

        if (user.rowCount == 0) {
          // if the user doesn't exist
          console.log("faild  user");
          //reject(false);
          reject(new Error("userID does not exist"));
        }
        //if the password is incorrect
        else if (!compareSync(password, user.rows[0].password)) {
          reject(new Error("wrong password"));
        } else {
          // if the user exists and the password is correct
          resolve(user.rows[0].od);
        }
      })
      .catch((err) => {
        console.log(err);
        console.log("faild");
        reject(new Error("userID does not valid, use only numbers"));
      });
  });
};

const register = function (formData) {
  return new Promise(function (resolve, reject) {
    var companyID = Math.floor(1 + Math.random() * 9000);
    pool
      .query(`INSERT INTO company_info (company_id) VALUES(${companyID})`)
      .then(() => {
        if (typeof formData === "object" && formData !== null) {
          if (formData.Password) {
            const hashedPassword = bcrypt.hashSync(formData.Password, 5);
            formData.Password = hashedPassword;
          }

          Object.entries(formData).forEach(([key, value], index) => {
            const sanitizedKey = `"${key.replace(/"/g, '""')}"`;
            const queryText = `UPDATE company_info SET ${sanitizedKey} = $1 WHERE company_id = $2`;
            pool
              .query(queryText, [value, companyID])
              .then(() => console.log(`Inserted ${key}: ${value}`))
              .catch((err) => {
                console.error(`Error inserting ${key}: ${err}`);
                throw new Error("Server error");
              });
          });
        } else {
          reject("formData is not an object. It is:", typeof formData);
        }
      })
      .catch((e) => {
        console.error(e);
        reject(e.detail);
      });
    var message = `${companyID}`;
    resolve(message);
  });
};

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
// This func gets email,password and companyID and saves them in the database.
// Each email is a employee
const saveEmail = function (email, password, companyID, userID) {
  return new Promise(function (resolve, reject) {
    // console.log("save email in db");
    const date = new Date();
    const hashedPassword = bcrypt.hashSync(password, 5);
    //var user_id= Math.floor(1+Math.random()*9000);
    // Check if the record exists
    pool
      .query(
        `SELECT user_id FROM users_email WHERE email = '${email}' AND company_id = ${companyID}`
      )
      .then((result) => {
        if (result.rows.length > 0) {
          deleteUsersAnswers(result.rows[0].user_id);
          //console.log("Select ", result.rows[0].user_id);
          resolve(result.rows[0].user_id);
          console.log("After resolve");
          return pool.query(
            `UPDATE users_email 
             SET password = '${hashedPassword}'
             WHERE email = '${email}' AND company_id = ${companyID}`
          );
        } else {
          resolve(userID);
          return pool.query(
            `INSERT INTO users_email (user_id, email, password, company_id, isdone, email_date)
             VALUES (${userID}, '${email}', '${hashedPassword}', ${companyID}, False, '${date.toLocaleString()}')`
          );
        }
      })
      .catch((e) => {
        reject(e);
      });
  });
};

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

const findUser = function (companyID) {
  return new Promise(function (resolve, reject) {
    pool
      .query(
        `SELECT company_id, password FROM users_info WHERE company_id= ${companyID}`
      )
      .then((user) => {
        resolve(user);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

const getusers = function (companyID) {
  return new Promise(function (resolve, reject) {
    console.log("get users", companyID);
    pool
      .query(`SELECT * FROM users_email WHERE company_id= ${companyID}`)
      .then((users) => {
        // console.log("users",users);
        //need to check
        if (!users.rows.length) reject(new Error(`Users not found`));
        else {
          //console.log( "new Date",users.rows[0].email_date);
          resolve(users);
        }
      })
      .catch((err) => {
        console.log(err);
        reject(err);
      });
  });
};

const updateFillStatus = function (companyID, usersData) {
  return new Promise(function (resolve, reject) {
    usersData.slice(1).map((row) => {
      const email = row[row.length - 1].trim(); // Extract email address
      console.log("The email is", email);
      if (email) {
        pool
          .query(
            `UPDATE users_email SET isdone=${true} WHERE company_id=${companyID} AND email='${email}'`
          )
          .then((result) => {
            // console.log("Result is", result);
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

// const getquestions= function(companyID)
// {
//     return new Promise(function(resolve, reject){
//         console.log("get questions",companyID);
//         pool.query(`SELECT * FROM questions WHERE company_id=${companyID} OR code=1`)
//         .then(questions =>{
//              console.log("questiond",questions.rows);
//             if(!questions.rows.length)
//             reject(new Error(`Questions not found`));

//             else
//             {
//                //console.log( "new Date",users.rows[0].email_date);
//                 resolve(questions);

//             }

//             }).catch(err =>{
//                 console.log(err);
//                 reject(err);
//             });
//     });
// }

const getFirstQuestions = async function () {
  try {
    // Select all questions with page = 1
    const questionsResult = await pool.query(
      "SELECT * FROM questions WHERE page = $1",
      [1]
    );
    const questions = questionsResult.rows;

    // Fetch answers for each question using qtoa table
    for (let question of questions) {
      const qtoaResult = await pool.query(
        "SELECT answerid FROM qtoa WHERE questionid = $1",
        [question.id]
      );

      const answerIds = qtoaResult.rows.map((row) => row.answerid);
      console.log("Answers id", answerIds);

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
      const answerTypeResult = await pool.query(
        "SELECT answer_type FROM q_appearance WHERE questionid = $1",
        [question.id]
      );

      // Assign answer_type to question
      if (answerTypeResult.rows.length > 0) {
        // Assuming there is only one answer type associated with each question
        question.answerType = answerTypeResult.rows[0].answer_type;
      } else {
        // If no answer type found, set it to null or a default value
        question.answerType = null; // Or set a default value as needed
      }
    }

    console.log("questions", questions);
    return questions;
  } catch (error) {
    console.log(error);
    return { error: "Internal server error" };
  }
};

// Function to get health questions
const getQuestions = async function (answerID, userID) {
  console.log("answer id final", answerID);
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

// Function to get health questions
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

module.exports = {
  register,
  login,
  findUser,
  saveEmail,
  saveAnswers,
  getusers,
  updateFillStatus,
  getFirstQuestions,
  getQuestions,
  loginUser,
  getAnswersID,
  getUserAnswers,
};
