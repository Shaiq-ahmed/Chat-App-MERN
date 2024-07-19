const express = require("express");
const router = express.Router();
const passport = require("passport");

const {
    register,
    login,
    logout,
    verifyEmail,
    resendVerificationEmail,
    forgotPassword,
    resetPassword,
    refreshToken,
    googleCallback,
} = require("../controllers/authController");
const { isAuthenticatedUser } = require("../middleware/authMiddleware");

router.route("/register").post(register);
router.route("/verify-email").get(verifyEmail);
router.route('/resend-verification').post(resendVerificationEmail);
router.route("/login").post(login);
router.route("/logout").delete(isAuthenticatedUser, logout);

router.get('/google',
    passport.authenticate('google', { scope: ['email', 'profile'] })
);

router.get('/google/callback', googleCallback);
router.route("/refresh-token").get(refreshToken);

router.route("/forgot-password").post(forgotPassword);
router.route("/reset-password").post(resetPassword);

module.exports = router;