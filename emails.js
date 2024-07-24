const csv = require("csv-parser");
const fs = require("fs");
const reader = require("xlsx");
const { type } = require("os");
var nodemailer = require("nodemailer");
const database = require("./database");
const { password } = require("pg/lib/defaults");
require("dotenv").config();
const { parse } = require("csv-parse");
const { v4: uuidv4 } = require("uuid");

function generatePassword() {
  // Generate a UUID
  let uuid = uuidv4();

  // Remove dashes
  uuid = uuid.replace(/-/g, "");

  // Optionally, you can take a substring to control the length
  const password = uuid.substring(0, 12); // for a 12-character password

  return password;
}

// This func reads CSV file, and create from each email "username" = email and password.
// For example: DavidDoe@gmail.com = email, password = DavidDoe
const readCSV = async function (fileName, companyID) {
  fs.createReadStream("uploads/" + fileName)
    .pipe(
      parse({
        delimiter: ",",
      })
    )
    .on("error", (error) => {
      console.error("Error reading CSV file:", error);
    })
    .on("data", (row) => {
      Object.values(row).forEach((cellData) => {
        if (cellData) {
          //var password = cellData.split("@")[0];
          sendEmail(cellData, companyID); // sending email to the employee
        }
      });
    })
    .on("end", () => {
      console.log("CSV file successfully processed");
    });
};

// This func reads XL file, and create from each email "username" = email and password.
const readXLSX = async function (fileName, companyID) {
  var file = reader.readFile("uploads/" + fileName);
  const sheets = file.SheetNames;
  let data = [];

  for (let i = 0; i < sheets.length; i++) {
    const temp = reader.utils.sheet_to_json(file.Sheets[sheets[i]], {
      header: 1,
      raw: true,
      defval: null,
    });
    temp.forEach((res) => {
      data.push(res);
      Object.keys(res).forEach((key) => {
        if (res[key] != null) {
          var email = res[key];
          // var password = email.split("@")[0];
          //working
          sendEmail(email, companyID); // sending email to the employee
        }
      });
    });
  }

  console.log(data);
};

// Sending email to every employee.
// Email include "USERNAME" (we can change it to EMAIL), password and link to the website
// The with the username/email and password, the employee needs to login to the website

const sendEmail = async function (email, companyID) {
  // Generate a random password
  const password = generatePassword();

  var user_id = Math.floor(1 + Math.random() * 9000);

  await database
    .saveEmail(email, password, companyID, user_id)
    .then((userID) => {
      var transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: "best4mecomp@gmail.com",
          pass: "pdhmsyzlivvdzplw",
        },
      });
      var mailOptions = {
        from: "best4mecomp@gmail.com",
        to: email,
        subject: "Welcome to Best4me Company",
        text: `Your username is: ${userID} and your password is: ${password}
             link: http://localhost:3001/user-log-in`,
      };
      transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
          console.log(error);
        } else {
          console.log("Email sent: " + info.response);
        }
      });
    })
    .catch((err) => {
      console.log(err);
    });
};

module.exports = { readCSV, readXLSX, sendEmail };
