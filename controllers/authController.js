const User = require('../models/userModel');
const EmailVerToken = require('../models/emailVerificationTokenModel')
const PasswordVerToken = require('../models/passwordVerificationTokenModel')
const { StatusCodes } = require('http-status-codes')
// const CustomError = require('../errors')
const asyncHandler = require('express-async-handler')
const jwt = require('jsonwebtoken')
const crypto = require('crypto');
const sendVerificationEmail = require('../utils/sendVerificationEmail');
const Token = require('../models/tokenModel');
const sendResetPasswordEmail = require('../utils/sendResetPasswordEmail');
// const createHash = require('../utils/createHash')
const passport = require('passport');


//================================================ Function to generate access token and refresh token=========================================================


async function generateTokens(user, req) {
  try {

    const existingToken = await Token.findOne({ user: user._id })

    if (existingToken) {
      console.log('here is....refT')
      await Token.findOneAndDelete({ user: user._id })
    }

    let refreshToken = jwt.sign({ userId: user._id }, process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: `${process.env.REFRESH_TOKEN_EXPIRATION_TIME}` });

    const userAgent = req.headers['user-agent'];
    const ip = req.ip;
    const userToken = { refreshToken, ip, userAgent, user: user._id };
    await Token.create(userToken);

    const accessToken = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: `${process.env.JWT_EXPIRATION_TIME}`,
    })
    return { accessToken, refreshToken };

  } catch (error) {
    // Handle errors, e.g., log them or throw them
    console.error("Error in generateTokens:", error);
    throw error;
  }
}


const register = asyncHandler(async (req, res, next) => {
  try {
    const { email, name, password } = req.body;
    if (!password) {
      return res.status(400).json({ error: 'Please enter a password' });
    }
    const emailAlreadyExist = await User.findOne({ email });
    if (emailAlreadyExist) {
      return res.status(400).json({
        error: 'Email already exists',
      });
    }

    const user = await User.create({ name, email, password });

    const verificationToken = crypto.randomBytes(40).toString('hex');
    await EmailVerToken.create({
      userId: user._id,
      token: verificationToken,
    });

    const origin = `${req.protocol}://${req.get('host')}`;

    await sendVerificationEmail({
      name: user.name,
      email: user.email,
      verificationToken,
      origin,
    });

    return res.status(StatusCodes.CREATED).json({ msg: 'Success! Please check your email to verify your account.' });
  } catch (error) {
    console.error(error);
    next(error)

  }
});

const verifyEmail = asyncHandler(async (req, res) => {
  try {
    const { token } = req.query;

    const token_verification = await EmailVerToken.findOne({ token })
    if (!token_verification) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Verification failed" })

    }
    const user = await User.findById(token_verification.userId)
    if (!user) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Verification failed" })

    }

    const userVerified = await user.updateOne(
      {
        isVerified: true,
        verified: Date.now(),
        status: 'approved'
      })

    await EmailVerToken.deleteOne({ _id: token_verification._id });

    res.status(StatusCodes.OK).json({ msg: "Email Verified", success: true })
  } catch (error) {
    console.log(error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Something went wrong, please try again later!' });

  }
})

const resendVerificationEmail = asyncHandler(async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Please provide an email address' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Email does not exist' });
    }

    if (user.isVerified) {
      return res.status(400).json({ error: 'This account is already verified' });
    }

    const existingToken = await EmailVerToken.findOne({ userId: user._id });
    if (existingToken) {
      await Token.deleteOne({ _id: existingToken._id });
    }

    const verificationToken = crypto.randomBytes(40).toString('hex');
    await EmailVerToken.create({
      userId: user._id,
      token: verificationToken,
    });

    const origin = `${req.protocol}://${req.get('host')}`;

    await sendVerificationEmail({
      name: user.name,
      email: user.email,
      verificationToken,
      origin,
    });

    return res.status(StatusCodes.OK).json({ msg: 'Verification email sent. Please check your email to verify your account.' });
  } catch (error) {
    console.log(error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Something went wrong, please try again later!' });
  }
});

const login = asyncHandler(async (req, res) => {
  try {

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: 'Please provide email and password' });
    }

    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ error: 'Incorrect email or password' });
    }

    const passwordMatch = await user.comparePassword(password);

    if (!passwordMatch) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ error: 'Invalid credentials' });
    }
    if (user.status === "blocked") {
      return res.status(StatusCodes.UNAUTHORIZED).json({ error: 'Your account is blocked by administrator' });
    }
    if (!user.verified) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ error: 'Please verify your email' });
    }

    const tokenUser = {
      name: user.name,
      id: user._id,
      email: user.email,
    };

    const existingToken = await Token.findOne({ user: user._id })

    if (existingToken) {
      console.log('here is....refT')
      await Token.findOneAndDelete({ user: user._id })
    }

    let refreshToken = jwt.sign({ userId: user._id }, process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: `${process.env.REFRESH_TOKEN_EXPIRATION_TIME}` });

    const userAgent = req.headers['user-agent'];
    const ip = req.ip;
    const userToken = { refreshToken, ip, userAgent, user: user._id };
    await Token.create(userToken);

    const accessToken = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: `${process.env.JWT_EXPIRATION_TIME}`,
    });

    res.cookie('refreshToken', refreshToken, { httpOnly: true }).status(StatusCodes.OK).json({ accessToken: accessToken, success: true });

  } catch (error) {
    console.log(error);
    res.status(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message });
  }
})

const refreshToken = asyncHandler(async (req, res) => {
  try {
    const refreshToken = req.cookies['refreshToken'];

    if (!refreshToken) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ error: 'Unauthorized' });
    }
    // console.log('secret',process.env.REFRESH_TOKEN_SECRET);
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

    const user = await User.findById(decoded.userId);
    console.log(user)

    if (!user) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ error: 'Unauthorized' });
    }

    const existingToken = await Token.findOne({ user: user._id });

    if (!existingToken || existingToken.refreshToken !== refreshToken) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const accessToken = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: `${process.env.JWT_EXPIRATION_TIME}`,
    });
    console.log('accessToken', accessToken)
    res.json({ success: true, accessToken: accessToken });
  } catch (error) {
    console.log(error);
    if (error.message === "jwt expired") {
      return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Token has been expired, login again." })
    }
    return res.status(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message });
  }
})

// //============================================================GOOgle auth redirect ========================================
// // const loginWithGoogle = (req, res, next) => {
// //   passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
// // };
//================================================================Google logic after successful login ====================================== 
const googleCallback = (req, res, next) => {
  passport.authenticate('google', { session: false }, async (err, user) => {
    try {
      if (err || !user) {
        console.error(err)
        // return res.redirect('http://localhost:3000/login?error=auth_failed');
        return next(err);
      }


      const { tokenUser, accessToken, refreshToken } = user;

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // Ensure secure cookies in production
      });

      res.status(StatusCodes.OK).json({ tokenUser, accessToken });
      return res.redirect('http://localhost:3000/');
    } catch (error) {
      console.error("Error in Google Callback:", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Internal Server Error' });
    }
  })(req, res, next);
};



const logout = asyncHandler(async (req, res) => {
  try {
    const token = await Token.findOneAndDelete({ user: req.user.id });

    if (!token) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        error: "Token not found",
      });
    }

    res.cookie('refreshToken', null, { expires: new Date(0), httpOnly: true });

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Logged Out",
    });
  } catch (error) {
    console.log(error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Something went wrong, Please try again later" });
  }



})

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(StatusCodes.BAD_REQUEST).json({ error: "Please provide an email" });
  }

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(StatusCodes.NOT_FOUND).json({ error: "User not found" });
  }

  // Check if a token already exists for this user
  const existingToken = await PasswordVerToken.findOne({ email });
  if (existingToken) {
    return res.status(StatusCodes.BAD_REQUEST).json({ error: "A password reset token has already been sent to this email. Please check your email." });
  }

  const passwordToken = crypto.randomBytes(70).toString('hex');

  await PasswordVerToken.create({
    passwordToken,
    email,
  });

  const origin = `${req.protocol}://${req.get('host')}`;

  await sendResetPasswordEmail({
    name: user.name,
    email: user.email,
    token: passwordToken,
    origin,
  });

  return res.status(StatusCodes.OK).json({ msg: "Please check your email for the reset password link" });
});

const resetPassword = asyncHandler(async (req, res) => {
  try {
    const { token, email, password, confirm_password } = req.body;

    if (!token || !email || !password || !confirm_password) {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: "Please provide all required fields" });
    }

    if (password !== confirm_password) {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: "Password and confirm password must be the same" });
    }

    const userToken = await PasswordVerToken.findOne({ passwordToken: token, email });

    if (!userToken) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Invalid or expired password reset token" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: "User not found" });
    }

    user.password = password;
    await user.save();

    await PasswordVerToken.findByIdAndDelete(userToken._id);

    return res.status(StatusCodes.OK).json({ msg: "Password has been reset successfully" });
  } catch (error) {
    console.error(error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Something went wrong. Please try again later." });
  }
});



module.exports = {
  register,
  login,
  logout,
  verifyEmail,
  resendVerificationEmail,
  forgotPassword,
  resetPassword,
  refreshToken,
  googleCallback
}