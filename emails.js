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
  try {
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
            try {
              sendEmail(cellData, companyID); // sending email to the employee
            } catch (emailError) {
              console.log("Failed to send email in readCSV");
              throw emailError;
            }
          }
        });
      })
      .on("end", () => {
        console.log("CSV file successfully processed");
      });
  } catch (error) {
    throw new Error(error);
  }
};

const readXLSX = async function (fileName, companyID) {
  console.log("Go here");
  try {
    const file = reader.readFile("uploads/" + fileName);
    const sheets = file.SheetNames;
    let data = [];

    for (let i = 0; i < sheets.length; i++) {
      const temp = reader.utils.sheet_to_json(file.Sheets[sheets[i]], {
        header: 1,
        raw: true,
        defval: null,
      });

      for (let res of temp) {
        data.push(res);

        for (let key of Object.keys(res)) {
          if (res[key] !== null) {
            try {
              const email = res[key];
              await sendEmail(email, companyID); // Sending email to the employee
            } catch (emailError) {
              console.log("Failed to send email in readXLSX");
              throw emailError;
            }
          }
        }
      }
    }
  } catch (error) {
    throw new Error(error); // Re-throw if you want the caller to handle it
  }
};

// Sending email to every employee.
// Email include "USERNAME" (we can change it to EMAIL), password and link to the website
// The with the username and password, the employee needs to login to the website

const sendEmail = async function (email, companyID) {
  try {
    // Regular expression for validating an email address
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      throw new Error(
        "Recipient email is not defined or is not in a valid format"
      );
    }
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

        transporter.sendMail(mailOptions, function (error, info) { });
      })
      .catch((err) => {
        throw new Error("Failed to send email");
      });
  } catch (error) {
    throw error;
  }
};

const sendAdminEmail = async function (email, password, companyID) {
  try {
    // Regular expression for validating an email address
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      throw new Error(
        "Recipient email is not defined or is not in a valid format"
      );
    }
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
      text: `Your Comany ID is: ${companyID} and your password is: ${password}`,
    };

    transporter.sendMail(mailOptions, function (error, info) { });


  } catch (error) {
    throw error;
  }
};

module.exports = { readCSV, readXLSX, sendEmail, sendAdminEmail };
