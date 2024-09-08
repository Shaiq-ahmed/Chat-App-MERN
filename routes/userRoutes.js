const express = require("express");
const router = express.Router();
// const passport = require("passport");

const {
    getUserProfile,
    updatePassword,
    UpdateUserProfile,
    searchUsers

} = require("../controllers/userController");
const { isAuthenticatedUser } = require("../middleware/authMiddleware");

router.route("/profile").get(isAuthenticatedUser,getUserProfile);
router.route("/change-password").patch(isAuthenticatedUser,updatePassword);
router.route("/profile").put(isAuthenticatedUser,UpdateUserProfile);
router.route("/search").get(isAuthenticatedUser,searchUsers);




module.exports = router;