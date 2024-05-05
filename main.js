const express = require('express');
const bodyParser = require("body-parser");
const fileUpload = require('express-fileupload');
const jwt = require('jsonwebtoken');
const router = express.Router();
const database = require('./database');
const emails = require('./emails');
const cors = require('cors');
const passport = require('passport');
const path = require('path')
const app = express();
require('dotenv').config();
require('./passport');
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(passport.initialize());
const fs = require('fs');

app.use(fileUpload({
    createParentPath: true
}));


app.post('/log-in', (req,res)=>{
    console.log('try login');
    database.login(req.body.companyID, req.body.companyPassword)
    .then(message =>{                  
        const payload = { companyID: req.body.companyID};
        // creating access token
        const data = {
            token: "Bearer " + jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET),
            message: message
        }
        res.status(200).send(data);
        
    })
    .catch(err =>{
        //console.log(err.toString());
        res.status(400).send(err.toString());    
    });
});

app.post('/sign-up', (req,res)=>{
    const data = req.body;
    database.register(data.email,data.companyPassword,
        data.compName,data.domain,new Date(data.establishment),data.occupation,
        data.location, data.size,  data.numOfCeo,data.numOfManagers, data.numOfEmployees,
        data.systemUsed).then((message) =>{
            const data = {
                message:message.toString()
            }
            res.status(200).send(data);  
            
        }).catch(err => {
           
            res.status(400).send(err.toString());   
        });
});


app.post('/uploadfile', async (req,res)=>{
    console.log('got here');

    let file = req.files.file;

    let companyID=req.body.CompanyID;
    
    fileExtension = path.extname(file.name);
    await file.mv('./uploads/' + file.name); 
    // Checking if the file ends with .xls
    if (fileExtension == '.xls' ||  fileExtension == '.xlsx'){
   
       emails.readXLSX(file.name,companyID).then(() =>{                  
        res.status(200).send("emails were sent");
    });
    }

    else if (fileExtension == '.csv'){ // Checking if the file ends with .csv
        console.log("csv"+ file.name);
       //emails.readCSV(file.name,companyID)
       emails.readCSV(file.name,companyID).then(() =>{                  
        res.status(200).send("emails were sent");
    });
    }
    else
    {
        res.status(500).send("Wrong type file");
    }
    //delete temprory file
    //fs.rmdir depreacated
    fs.rm('./uploads/' + file.name, { recursive: true }, (err) => {
        if (err) {
            // throw err;
            res.status(500).send("invalid Name");
        }
    });
})

// verify access token

app.get('/admin', function(req, res, next) {
    const token = req.headers.authorization.split(' ')[1];
    if (!token) {
     return res.status(401).json({error:true,message: "Must pass token"});
    }
    passport.authenticate('jwt', function(err, user, info) {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).json({
          err: info
        });
      }
      console.log("yes");
      res.status(200).send("outhorized");

    })(req,res,next);

});

app.get('/users', function(req,res){
    database.getusers(req.query.companyID)
    .then(payload =>{                  
            
        const data = {
            users:payload
        }
        // console.log(data);
        res.status(200).send(data); 
        
    })
    .catch(err =>{
        //console.log(err.toString());
        res.status(400).send(err.toString());    
    });
})
    
app.put('/updateUserStatus', function (req,res){
    const data = req.body;
    console.log("Csv data",data);
    database.updateFillStatus(data.companyID, data.csvData)
    .then(payload =>{                  
            
        res.status(200).send(); 
        
    })
    .catch(err =>{
        //console.log(err.toString());
        res.status(400).send(err.toString());    
    });
})

app.get('/questions', function(req,res){
    database.getquestions(req.query.companyID)
    .then(payload =>{                  
            
        const data = {
            questions:payload
        }
        // console.log(data);
        res.status(200).send(data); 
        
    })
    .catch(err =>{
        //console.log(err.toString());
        res.status(400).send(err.toString());    
    });
})

const port = 3000
app.listen(port, () => {
    console.log(`App listening at http://localhost:${port}`)
});
