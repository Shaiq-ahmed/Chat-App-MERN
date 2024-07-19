const express = require("express");
const router = express.Router();
// const passport = require("passport");

const {
    getUserProfile,
    updatePassword,
    UpdateUserProfile

} = require("../controllers/userController");
const { isAuthenticatedUser } = require("../middleware/authMiddleware");

router.route("/profile").get(isAuthenticatedUser,getUserProfile);
router.route("/change-password").patch(isAuthenticatedUser,updatePassword);
router.route("/profile").put(isAuthenticatedUser,UpdateUserProfile);



module.exports = router;