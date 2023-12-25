const JwtStrategy = require('passport-jwt').Strategy,
    ExtractJwt = require('passport-jwt').ExtractJwt;
const opts = {}
const database = require('./database')
const passport = require('passport')
opts.jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken();
opts.secretOrKey = process.env.ACCESS_TOKEN_SECRET;

passport.use(new JwtStrategy(opts, function (jwt_payload, done) {
    database.findUser(jwt_payload.companyID).then(user =>{     
        if (user) { // if the user exists
            return done(null, user);
        } else { // if the user doesn't exist
            return done(null, false);
        }
    }).catch(err =>{
        if (err) {
            return done(err, false);
        }
    })
})); 