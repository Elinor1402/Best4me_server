//const bcryptjs = require('bcryptjs');
const {compareSync } = require('bcryptjs');
const {Pool} = require('pg');
const {user } = require('pg/lib/defaults');

const pool = new Pool({
  //user: 'fs-info',
  user:'postgres',
  //host: '192.114.5.161',
  host: "localhost",
  database: 'fs-info-db',
  //password: '123',
  password:'Elinorz2000',
  port: 5432,
  "max": 40, // Max 20 connection
  "connectionTimeoutMillis" : 0, // if all the connection are busy, "0" means "wait forever" (we can change it to shorter time)
  "idleTimeoutMillis": 0, // this destroy the connection if it is no use. "0" means never - but we can set any other number and it will be in seconds
})

//my change
pool.connect();

// Define the updateStatus function


const login = function(companyID, password){
   console.log("try connect",companyID,password);

    return new Promise(function(resolve, reject){
    
        pool.query(`SELECT company_id, password FROM users_info WHERE company_id= 
        ${companyID}`).then(user =>{
            //console.log(user);
            if(user.rowCount==0){ // if the user doesn't exist
               console.log("faild  user");
                //reject(false);
                reject(new Error('companyID does not exist'));
            }
            //if the password is incorrect
            else if(!compareSync(password, user.rows[0].password)){
                reject(new Error('wrong password'));
            }
            else{ // if the user exists and the password is correct
                //resolve(1);
                resolve('Lets start!');
            }

        }).catch(err =>{
            console.log(err);
            console.log("faild");
            reject(new Error('companyID does not valid, use only numbers'));
        })
    })
}

const register = function(email,password, name, domain,establishment, occupation, location, size, amountCEO,amountManagers,
                         amountEmployees,systemUsed){
        return new Promise(function(resolve, reject){
     
            var companyID= Math.floor(1+Math.random()*9000);
            // console.log("Company id",companyID);

            pool.query(`INSERT INTO users_info (company_id, year_establishment, organization_size, num_of_ceo, num_of_managers, num_of_employees, email, organization_domain, organization_name, occupation, location, organization_system_used, password)
                VALUES( ${companyID} , '${establishment.toDateString()}', ${size} , ${amountCEO} ,${amountManagers},${amountEmployees}, '${email}', '${domain}' , '${name}', '${occupation}' , '${location}' , '${systemUsed}', '${password}' )`).
                then(result => {
                    // var message = `Your Company ID is ${companyID}`;
                    var message = `${companyID}`;
                    resolve(message);
                }).catch(e => {
                    console.error(e);
                    //reject(e.detail);
                }).then(() => {
                });
        });
}

// This func gets email,password and companyID and saves them in the database.
// Each email is a employee
const saveEmail = function(email, password, companyID){
    return new Promise(function(resolve, reject){

        console.log("save email in db");
        const date = new Date();
        
        var user_id= Math.floor(1+Math.random()*9000);

        pool.query(`INSERT INTO users_email (user_id, email, password, company_id, isdone, email_date)
            VALUES(${user_id}, '${email}' , '${password}' , ${companyID} , False , '${date.toLocaleString()}')`).
            then(result => {
                resolve(1);
            }).catch(e => {
               // console.error(e);
                reject(e);
            })
    });
}


const findUser = function(companyID){
    return new Promise(function(resolve, reject){
        pool.query(`SELECT company_id, password FROM users_info WHERE company_id= ${companyID}`)
        .then(user =>{
                resolve(user);
            }).catch(err =>{
                reject(err);
            });
    });
}


const getusers= function(companyID)
{
    return new Promise(function(resolve, reject){
        console.log("get users",companyID);
        pool.query(`SELECT * FROM users_email WHERE company_id= ${companyID}`)
        .then(users =>{
            // console.log("users",users);
            //need to check
            if(!users.rows.length)
            reject(new Error(`Users not found`));
            
            else
            {
               //console.log( "new Date",users.rows[0].email_date);
                resolve(users);
                
            }
               
            }).catch(err =>{
                console.log(err);
                reject(err);
            });
    });
}

const updateFillStatus =function(companyID, usersData) {
    
    return new Promise(function(resolve, reject) {
        
        usersData.slice(1).map(row => {
            const email = row[row.length - 1].trim(); // Extract email address
            console.log("The email is",email);
            if (email) {
                pool.query(`UPDATE users_email SET isdone=${true} WHERE company_id=${companyID} AND email='${email}'`)
                .then(result => {
                    // console.log("Result is", result);
                    resolve(1);
                })
                .catch(e => {
                    console.error(e);
                    reject(e);
                });
            }
        });
        
    });
}


const getquestions= function(companyID)
{
    return new Promise(function(resolve, reject){
        console.log("get questions",companyID);
        pool.query(`SELECT * FROM questions WHERE company_id=${companyID} OR code=1`)
        .then(questions =>{
             console.log("questiond",questions.rows);
            if(!questions.rows.length)
            reject(new Error(`Questions not found`));
            
            else
            {
               //console.log( "new Date",users.rows[0].email_date);
                resolve(questions);
                
            }
               
            }).catch(err =>{
                console.log(err);
                reject(err);
            });
    });
}

module.exports = {register, login, findUser,saveEmail,getusers,updateFillStatus,getquestions};