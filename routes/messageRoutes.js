const express = require("express");
const router = express.Router();

const {sendMessage, getAllMessages} = require("../controllers/messageController");
const { isAuthenticatedUser } = require("../middleware/authMiddleware");

router.route("/").post(isAuthenticatedUser,sendMessage);
router.route("/:chatId").get(isAuthenticatedUser,getAllMessages);

module.exports = router;

