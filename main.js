const express = require("express");
const bodyParser = require("body-parser");
const fileUpload = require("express-fileupload");
const jwt = require("jsonwebtoken");
const router = express.Router();
const database = require("./database");
const emails = require("./emails");
const cors = require("cors");
const passport = require("passport");
const path = require("path");
const app = express();
require("dotenv").config();
require("./passport");
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(passport.initialize());
const fs = require("fs");
const axios = require("axios");

app.use(
  fileUpload({
    createParentPath: true,
  })
);

app.post("/log-in", (req, res) => {
  const { companyID, companyPassword } = req.body;
  database
    .login(companyID, companyPassword)
    .then((message) => {
      const payload = { companyID: companyID };
      // creating access token
      const data = {
        token: "Bearer " + jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET),
        message: "message",
      };
      res.status(200).send(data);
    })
    .catch((err) => {
      //console.log(err.toString());
      res.status(400).send(err.toString());
    });
});
app.post("/user-log-in", (req, res) => {
  const { userID, userPassword } = req.body;
  database
    .loginUser(userID, userPassword)
    .then((message) => {
      const payload = { userID: userID };
      // creating access token
      const data = {
        token: "Bearer " + jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET),
        message: message,
      };
      res.status(200).send(data);
    })
    .catch((err) => {
      //console.log(err.toString());
      res.status(400).send(err.toString());
    });
});

app.post("/sign-up", (req, res) => {
  const data = req.body;
  console.log("The data is", data.formData);

  database
    .register(data.formData)
    .then((message) => {
      const data = {
        message: message.toString(),
      };
      res.status(200).send(data);
    })
    .catch((err) => {
      res.status(400).send(err.toString());
    });
});

app.post("/uploadfile", authenticate, authorize("admin"), async (req, res) => {
  console.log("got here");

  let file = req.files.file;

  let companyID = req.body.CompanyID;

  fileExtension = path.extname(file.name);
  await file.mv("./uploads/" + file.name);
  // Checking if the file ends with .xls
  if (fileExtension == ".xls" || fileExtension == ".xlsx") {
    emails.readXLSX(file.name, companyID).then(() => {
      res.status(200).send("emails were sent");
    });
  } else if (fileExtension == ".csv") {
    // Checking if the file ends with .csv
    console.log("csv" + file.name);
    //emails.readCSV(file.name,companyID)
    emails.readCSV(file.name, companyID).then(() => {
      res.status(200).send("emails were sent");
    });
  } else {
    res.status(500).send("Wrong type file");
  }
  //delete temprory file
  //fs.rmdir depreacated
  fs.rm("./uploads/" + file.name, { recursive: true }, (err) => {
    if (err) {
      // throw err;
      res.status(500).send("invalid Name");
    }
  });
});

// verify access token
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: true, message: "Must pass token" });
  }
  const token = req.headers.authorization.split(" ")[1];
  console.log("Token", token);
  if (!token) {
    return res.status(401).json({ error: true, message: "Must pass token" });
  }

  passport.authenticate("jwt", { session: false }, function (err, user, info) {
    if (err) {
      console.log("Next error");
      return next(err);
    }
    if (!user) {
      return res.status(401).json({
        err: info ? info.message : "Unauthorized",
      });
    }
    req.user = user; // Attach the authenticated user to the request object
    next();
  })(req, res, next);
}

function authorize(...allowedRoles) {
  return (req, res, next) => {
    // `user` should be attached to `req` by the `passport.authenticate` middleware
    if (!req.user) {
      return res.status(403).json({ message: "Forbidden" });
    }

    // Check if the user's role is allowed
    const userRole = req.user.role; // Assume user object has a 'role' field
    if (!allowedRoles.includes(userRole)) {
      return res
        .status(403)
        .json({ message: "Forbidden: Insufficient rights" });
    }

    next(); // User is authorized, proceed to the next middleware or route handler
  };
}

app.get(
  "/admin",
  authenticate,
  authorize("admin"),
  function (req, res, next) {}
);

app.get("/files", authenticate, authorize("admin"), function (req, res, next) {
  console.log("Go to files");
});

app.get(
  "/csvData",
  authenticate,
  authorize("admin"),
  async function (req, res, next) {
    const csvUrl =
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vRi5yiyL7OjyVehkofqLeKfN2XhY8KbTxaSsQ7_HVSLHeM6uUh7oHMPjmaMD62QrdsC8bGCip3tV9YD/pub?output=csv"; // Replace with your Google Sheets CSV file URL

    try {
      const response = await axios.get(csvUrl);
      res.status(200).send(response.data);
    } catch (error) {
      console.error("Error fetching CSV data:", error);
    }
  }
);

app.get("/users", authenticate, authorize("admin"), function (req, res) {
  database
    .getusers(req.query.companyID)
    .then((payload) => {
      const data = {
        users: payload,
      };
      // console.log(data);
      res.status(200).send(data);
    })
    .catch((err) => {
      //console.log(err.toString());
      res.status(400).send(err.toString());
    });
});

app.put("/updateUserStatus", function (req, res) {
  const data = req.body;
  console.log("Csv data", data);
  database
    .updateFillStatus(data.companyID, data.csvData)
    .then((payload) => {
      res.status(200).send();
    })
    .catch((err) => {
      //console.log(err.toString());
      res.status(400).send(err.toString());
    });
});

// app.get('/questions', function(req,res){
//     database.getquestions(req.query.companyID)
//     .then(payload =>{

//         const data = {
//             questions:payload
//         }
//         // console.log(data);
//         res.status(200).send(data);

//     })
//     .catch(err =>{
//         //console.log(err.toString());
//         res.status(400).send(err.toString());
//     });
// })

// API route to get the sign up question
app.get("/first-question", async (req, res) => {
  const result = await database.getFirstQuestions();
  console.log("The final result is 2", result);
  if (result.error) {
    if (result.error === "First question not found") {
      res.status(404).send(result);
    } else {
      res.status(500).send(result);
    }
  } else {
    res.status(200).send(result);
    //res.json(result);
  }
});

// API route to get the pages of user form
app.get(
  "/second-questions",
  authenticate,
  authorize("user"),
  async (req, res, next) => {
    const { answerID, userID } = req.query;
    const result = await database.getQuestions(answerID, userID);
    console.log("The final result is 3", result);
    if (result.error) {
      if (result.error === "Internal server error") {
        res.status(404).send(result);
      } else {
        res.status(500).send(result);
      }
    } else {
      res.status(200).send(result);
      //res.json(result);
    }
  }
);

app.get("/users-answers", authenticate, authorize("user"), async (req, res) => {
  const result = await database.getUserAnswers(req.query.userID);
  console.log("The final result is 4", result);
  if (result.error) {
    if (result.error === "Internal server error") {
      res.status(404).send(result);
    } else {
      res.status(500).send(result);
    }
  } else {
    res.status(200).send(result);
    //res.json(result);
  }
});
app.get(
  "/translate-answers",
  authenticate,
  authorize("user"),
  async (req, res) => {
    console.log("Answer", req.query.answer);
    const result = await database.getAnswersID(req.query.answer);
    console.log("The final result is 2", result);
    if (result.error) {
      if (result.error === "Internal server error") {
        res.status(404).send(result);
      } else {
        res.status(500).send(result);
      }
    } else {
      res.status(200).send(result.toString());
      // res.status(200).json(result);
    }
  }
);

// API route to get the next question based on the answer
app.get(
  "/api/next-question/:answerId",
  authenticate,
  authorize("user"),
  async (req, res) => {
    const answerId = req.params.answerId;
    try {
      const atoqResult = await pool.query(
        "SELECT next_question_id FROM atoq WHERE answer_id = $1",
        [answerId]
      );
      const atoq = atoqResult.rows[0];

      if (atoq) {
        const nextQuestionResult = await pool.query(
          "SELECT * FROM questions WHERE id = $1",
          [atoq.next_question_id]
        );
        const nextQuestion = nextQuestionResult.rows[0];

        if (nextQuestion) {
          const answersResult = await pool.query(
            "SELECT * FROM answers WHERE question_id = $1",
            [nextQuestion.id]
          );
          nextQuestion.answers = answersResult.rows;
          res.json(nextQuestion);
        } else {
          res.status(404).json({ error: "Next question not found" });
        }
      } else {
        res.status(404).json({ error: "No mapping found for this answer" });
      }
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

app.post("/save-answers", authenticate, authorize("user"), (req, res) => {
  const { formData, userID } = req.body;
  database
    .saveAnswers(formData, userID)
    .then((message) => {
      // creating access token
      const data = {
        message: "message",
      };
      res.status(200).send(data);
    })
    .catch((err) => {
      //console.log(err.toString());
      res.status(400).send(err.toString());
    });
});

const port = 3000;
app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
});
