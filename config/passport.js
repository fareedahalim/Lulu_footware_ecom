const passport=require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;

const User=require('../models/userModel');
require("dotenv").config();

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/auth/google/callback'
}, async (accessToken, refreshToken, profile, done) => {
    try {
        
        
        if (!profile.id) {
            return done(new Error("Google ID is missing or invalid"));
        }

        
        let user = await User.findOne({ googleId: profile.id });
        
        if (user) {
            return done(null, user);
        } else {
            // If user does not exist, create a new one
            user = new User({
                username: profile.displayName,
                email: profile.emails[0].value,
                googleId: profile.id,  // Ensure this is not null
            });
            await user.save();
            return done(null, user);
        }
    } catch (error) {
        return done(error, null);
    }
}));


passport.serializeUser((user, done) => {
    
    done(null, user.id);  
  });
  
  passport.deserializeUser((id, done) => {
    
    User.findById(id)  
      .then(foundUser => {
        
        done(null, foundUser);
      })
      .catch(err => {
        done(err, null);
      });
  });
  
module.exports=passport;