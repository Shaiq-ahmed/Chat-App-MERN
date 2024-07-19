const express = require("express");
const router = express.Router();

const {
    accessChat,
    fetchChats,
    CreateGroupChat,
    renameGroup,
    removeFromGroup,
    addToGroup,
    leaveChat,
    fetchGroupChats

} = require("../controllers/chatController");
const { isAuthenticatedUser } = require("../middleware/authMiddleware");

router.route("/").post(isAuthenticatedUser,accessChat);
router.route("/").get(isAuthenticatedUser,fetchChats);
router.route("/group").get(isAuthenticatedUser,fetchGroupChats);
router.route("/group").post(isAuthenticatedUser,CreateGroupChat);
router.route("/group/:chatId/rename").put(isAuthenticatedUser,renameGroup);
router.route("/group/:chatId/remove-user").put(isAuthenticatedUser,removeFromGroup);
router.route("/group/:chatId/add-user").put(isAuthenticatedUser, addToGroup);
router.route("/group/:chatId/leave-chat").put(isAuthenticatedUser,leaveChat);


module.exports = router;