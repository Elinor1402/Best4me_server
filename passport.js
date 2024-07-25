const JwtStrategy = require("passport-jwt").Strategy,
  ExtractJwt = require("passport-jwt").ExtractJwt;
const opts = {};
const database = require("./database");
const passport = require("passport");
opts.jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken();
opts.secretOrKey = process.env.ACCESS_TOKEN_SECRET;

passport.use(
  new JwtStrategy(opts, async (jwt_payload, done) => {
    try {
      // First, check if the payload indicates an admin
      if (jwt_payload.companyID) {
        const admin = await database.findAdmin(jwt_payload.companyID);
        if (admin) {
          return done(null, admin);
        } else {
          return done(null, false, { message: "Admin not found" });
        }
      }

      // If no admin, check for a user
      if (jwt_payload.userID) {
        const user = await database.findUser(jwt_payload.userID);
        if (user) {
          return done(null, user);
        } else {
          return done(null, false, { message: "User not found" });
        }
      }

      // If neither admin nor user is identified
      return done(null, false, { message: "Unauthorized" });
    } catch (err) {
      return done(err, false);
    }
  })

  //   console.log("JWT payload", jwt_payload);
  //   database
  //     .findAdmin(jwt_payload.companyID)
  //     .then((admin) => {
  //       if (admin) {
  //         // if the user exists
  //         return done(null, admin);
  //       } else {
  //         // if the user doesn't exist
  //         return done(null, false);
  //       }
  //     })
  //     .catch((err) => {
  //       database
  //         .findUser(jwt_payload.userID)
  //         .then((user) => {
  //           if (user) {
  //             // if the user exists
  //             console.log("got here1", user);
  //             return done(null, user);
  //           } else {
  //             // if the user doesn't exist
  //             return done(null, false);
  //           }
  //         })
  //         .catch((err) => {
  //           console.log("got here2");
  //           return done(err, false);
  //         });
  //       return done(err, false);
  //     });
);
