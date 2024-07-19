const GoogleStrategy = require("passport-google-oauth20").Strategy;
const { StatusCodes } = require("http-status-codes");
const User = require("./models/userModel");
const Token = require("./models/tokenModel");
const passport = require("passport");
const jwt = require('jsonwebtoken')

// Define strategies for Google and Facebook

// passport.use(
//     new GoogleStrategy(
//         {
//             clientID: process.env.GOOGLE_CLIENT_ID,
//             clientSecret: process.env.GOOGLE_CLIENT_SECRET,
//             callbackURL: "http://localhost:5001/api/v1/auth/google/callback",
//             scope: ["email", "profile"],
//         },
//         async (req, accessToken, refreshToken, profile, done) => {
//             try {
//                 // Check if the user already exists based on the providerId
//                 console.log("Google Strategy invoked");

//                 if (profile) {
//                     const existingUser = await User.findOne({
//                         providerId: profile.id,
//                         provider: "google",
//                     });

//                     if (existingUser) {
//                         // User exists, return it
//                         console.log("Existing User found:", existingUser);
//                         return done(null, existingUser);
//                     }

//                     // If not, create a new user with the Google profile data
//                     const newUser = await User.create({
//                         name: profile.displayName,
//                         email: profile.emails[0].value,
//                         provider: "google",
//                         providerId: profile.id,
//                         status: "approved",
//                         isVerified: true
//                     });

//                     // User created, return it
//                     console.log("New User created:", newUser);
//                     return done(null, newUser);
//                 } else {
//                     // If there's no profile, throw an error
//                     return res.status(StatusCodes.BAD_REQUEST).json({ error: 'No profile data received from Google' });
//                 }
//             } catch (error) {
//                 // Handle errors and pass them to done
//                 console.error("Error in Google Strategy:", error);
//                 done(error, null);
//             }
//         }
//     )
// );

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:5001/api/v1/auth/google/callback",
    proxy:true
},
    async (accessToken, refreshToken, profile, done) => {
        try {
            let user = await User.findOne({ googleId: profile.id });

            if (!user) {
                user = await User.create({
                    name: profile.displayName,
                    email: profile.emails[0].value,
                    provider: "google",
                    providerId: profile.id,
                    status: "approved",
                    isVerified: true
                });
            }

            const tokenUser = {
                name: user.name,
                id: user._id,
                email: user.email,
            };

            let refreshToken = '';
            const existingToken = await Token.findOne({ user: user._id });

            if (existingToken && existingToken.isValid) {
                refreshToken = existingToken.refreshToken;
            } else {
                refreshToken = jwt.sign(
                    { userId: user._id },
                    process.env.REFRESH_TOKEN_SECRET,
                    { expiresIn: process.env.REFRESH_TOKEN_EXPIRATION_TIME }
                );
                // Generate user agent and ip here
                const userAgent = profile._json.user_agent || ''; // Adjust as needed
                const ip = profile._json.ip || ''; // Adjust as needed
                const userToken = { refreshToken, ip, userAgent, user: user._id };
                await Token.create(userToken);
            }

            const accessToken = jwt.sign(
                { userId: user._id, role: user.role },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRATION_TIME }
            );

            done(null, { tokenUser, accessToken, refreshToken });
        } catch (err) {
            done(err, null);
        }
    }
));


// passport.serializeUser(function (user, done) {
//     console.log('user', user)
//     done(null, user);
// });

// passport.deserializeUser(function (user, done) {
//     done(null, user);
// });