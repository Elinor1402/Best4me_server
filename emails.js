const csv = require('csv-parser');
const fs = require('fs');
const reader = require('xlsx');
const { type } = require('os');
var nodemailer = require('nodemailer');
const database = require('./database');
const { password } = require('pg/lib/defaults');
require('dotenv').config();


// This func reads CSV file, and create from each email "username" = email and password.
// For example: DavidDoe@gmail.com = email, password = DavidDoe
const readCSV =function (fileName, companyID){
    fs.createReadStream(fileName)
    .pipe(csv({
        delimiter:","
    })
    ).on('headers', (headers) => {
        head = headers[0];
    })
    .on('data', (row) => {
        if(row[head] != undefined){
            email = row[head];
            password = row[head].split("@")[0]; // Split the email before @ and after - and take only the before
            console.log(email);
            console.log(password);
            //database.saveEmail(email, password, companyID); // saving every email and password on the database
            sendEmail(email, password, companyID); // sending email to the employee
        }
    })
    .on('end', () => {
        console.log('CSV file successfully processed');
    });
}


// This func reads XL file, and create from each email "username" = email and password.
const  readXLSX=  async function (fileName, companyID){
    
    var file =  reader.readFile('uploads/'+fileName);
    const sheets = file.SheetNames;
    let data = []
  
    for(let i = 0; i < sheets.length; i++)
    {
        const temp = reader.utils.sheet_to_json(file.Sheets[sheets[i]],{ header: 1 ,raw: true, defval:null} )
        temp.forEach((res) => {
            data.push(res);
            Object.keys(res).forEach(key=> {
                if(res[key]!=null)
                {
                      var email=res[key];
                      var password = email.split("@")[0];
                      //working
                     sendEmail(email, password, companyID);// sending email to the employee

                }
            })
        })
    }
    
    console.log(data);
}

// Sending email to every employee.
// Email include "USERNAME" (we can change it to EMAIL), password and link to the website
// The with the username/email and password, the employee needs to login to the website

const  sendEmail= async function (email, password, companyID){
   await database.saveEmail(email, password, companyID)
   .then(() =>{
   
    var transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: 'best4mecomp@gmail.com',
          pass: 'pdhmsyzlivvdzplw'
        }
      });
      var mailOptions = {
        from: 'best4mecomp@gmail.com',
        to: email,
        subject: 'Welcome to Best4me Company',
        text: `Your username is: ${email} and your password is: ${password}
             link: https://forms.gle/pd6AGEen8vAXtiEv7`
      };
      transporter.sendMail(mailOptions, function(error, info){
        if (error) {
          console.log(error);
        } else {
          console.log('Email sent: ' + info.response);
        }
      });
    })
   .catch(err => {
           
        console.log(err);
    });
}
 


module.exports = {readCSV, readXLSX, sendEmail};