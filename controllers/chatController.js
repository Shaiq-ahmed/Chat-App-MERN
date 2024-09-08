const { StatusCodes } = require('http-status-codes');
const Chat = require("../models/chatSchema");
const User = require("../models/userModel");
const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');

// access one to One chat if not existed it will create
const accessChat = async (req, res, next) => {
    const userLoggedIn = req.user.id;
    const { userId } = req.body;

    // Find the user to avoid unnecessary checks later
    const bodyUser = await User.findById(userId);
    if (!bodyUser) {
        return res.status(StatusCodes.NOT_FOUND).json({ error: "User not found" });
    }

    try {

        const existingChat = await Chat.findOne({
            isGroupChat: false,
            users: { $all: [userLoggedIn, userId] }
        }).populate("users", "name email phone avatar bio lastSeen")
            .populate("latestMessage.sender", "name email phone avatar bio lastSeen");

        if (existingChat) {
            return res.status(StatusCodes.OK).json({ chat: existingChat });
        }

        // Create new chat if not found
        const chatData = {
            chatName: "sender",
            users: [userLoggedIn, userId],
        };

        const newChat = await Chat.create(chatData);
        const fullChat = await Chat.findById(newChat._id)
            .populate("users", "name email phone avatar bio lastSeen")

        return res.status(StatusCodes.OK).json({ chat: fullChat });
    } catch (error) {
        console.error(error);
        next(error)
    }
};

const fetchChats = async (req, res, next) => {
    try {
        const user = req.user.id;

        // Find all chats the user is part of
        const userAllChats = await Chat.find({
            users: { $in: [user] }
        })
            .populate("users", "name email phone avatar bio lastSeen")
            .populate({
                path: "latestMessage",
                populate: {
                    path: "sender",
                    select: "name email phone avatar bio lastSeen"
                }
            })
            .sort({ updatedAt: -1 });

        // Calculate unread message count for each chat
        const chatsWithUnreadCount = await Promise.all(
            userAllChats.map(async (chat) => {
                const unreadCount = await Message.countDocuments({
                    chat: chat._id,
                    seen: false,
                    sender: { $ne: user },
                    readBy: { $ne: user } // Messages not read by the current user
                });
                return {
                    ...chat.toObject(),
                    unreadCount,
                };
            })
        );

        return res.status(StatusCodes.OK).json({ chats: chatsWithUnreadCount });

    } catch (error) {
        console.error(error);
        next(error)
    }
};

// create group chats
const CreateGroupChat = async (req, res, next) => {
    const { chatName, users } = req.body;
    if (!chatName || !users) {
        return res.status(StatusCodes.BAD_REQUEST).json({ error: "Please fill all the fields" })

    }
    if (users.length < 2) {
        return res.status(StatusCodes.BAD_REQUEST).json({ error: "More than 2 users are required to create a group chat." })
    }
    try {
        const user = req.user.id;
        const data = {
            isGroupChat: true,
            chatName: chatName,
            groupAdmin: user,
            users: [...users, user]
        }

        const createGroup = await Chat.create(data)

        const findChat = await Chat.findOne({ _id: createGroup._id })
            .populate("users", "name email phone avatar bio lastSeen")
            .populate("groupAdmin", "name email phone avatar bio lastSeen")

        return res.status(StatusCodes.OK).json({ chat: findChat })


    } catch (error) {
        console.error(error);
        next(error)
    }
}

const renameGroup = async (req, res, next) => {
    const { chatName, groupDescription } = req.body;
    const { chatId } = req.params;
    const userLoggedIn = req.user.id;


    
    try {
        if (!chatName) {
            return res.status(StatusCodes.BAD_REQUEST).json({ error: "group name is required" })

        }
        const chat = await Chat.findById(chatId).populate('users');
        if (!chat || !chat.groupAdmin.equals(userLoggedIn)) {
            return res.status(StatusCodes.BAD_REQUEST).json({ error: "Invalid chat ID or insufficient permissions" });
        }
        if (!chat.users.some(user => user._id.equals(userLoggedIn))) {
            return res.status(StatusCodes.BAD_REQUEST).json({ error: "User not found in the group" });
        }
        const updatedChat = await Chat.findByIdAndUpdate(
            chatId,
            {
                chatName: chatName,
                groupDescription: groupDescription ? groupDescription : ""
            },
            {
                new: true
            }
        )
        .populate("users", "name email phone avatar bio lastSeen")
        .populate("groupAdmin", "name email phone avatar bio lastSeen");

        if (!updatedChat) {
            return res.status(StatusCodes.BAD_REQUEST).json({ error: "Chat not found" });
        }
 

        return res.status(StatusCodes.OK).json({ msg: "Your group details has been updated.", chat: updatedChat })


    } catch (error) {
        console.error(error);
        next(error)

    }
}

const removeFromGroup = async (req, res, next) => {
    const userLoggedIn = req.user.id;
    console.log(req.body)
    const { chatId } = req.params;
    const { userId } = req.body;

    if (!userId) {
        return res.status(StatusCodes.BAD_REQUEST).json({ error: "Please provide userId" })
    }

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(StatusCodes.BAD_REQUEST).json({ error: "User not found" })
        }

        const chat = await Chat.findById(chatId).populate('users');
        if (!chat || !chat.groupAdmin.equals(userLoggedIn)) {
            return res.status(StatusCodes.BAD_REQUEST).json({ error: "Invalid chat ID or insufficient permissions" });
        }
        if (!chat.users.some(user => user._id.equals(userId))) {
            return res.status(StatusCodes.BAD_REQUEST).json({ error: "User not found in the group" });
        }
        const updatedChat = await Chat.findByIdAndUpdate(chatId, { $pull: { users: userId } }, { new: true })
        .populate("users", "name email phone avatar bio lastSeen")
        .populate("groupAdmin", "name email phone avatar bio lastSeen")
        .populate("latestMessage")
            
        return res.status(StatusCodes.OK).json({ chat: updatedChat, success: true });

    } catch (error) {
        console.error(error);
        next(error)
    }
}
// add user to group

const addToGroup = async (req, res, next) => {
    const userLoggedIn = req.user.id;
    const { chatId } = req.params;
    const { userId } = req.body; 

    if (!userId || !Array.isArray(userId) || userId.length === 0) {
        return res.status(StatusCodes.BAD_REQUEST).json({ error: "Please provide users to be added." });
    }

    try {
        // Validate each userId
        for (const id of userId) {
            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(StatusCodes.BAD_REQUEST).json({ error: `Invalid userId: ${id}` });
            }
        }

        // Find all users in the userId array
        const users = await User.find({ _id: { $in: userId } });
        if (users.length !== userId.length) {
            return res.status(StatusCodes.BAD_REQUEST).json({ error: "One or more users not found" });
        }

        const chat = await Chat.findById(chatId).populate('users', 'name');
        if (!chat || !chat.groupAdmin.equals(userLoggedIn)) {
            return res.status(StatusCodes.BAD_REQUEST).json({ error: "Invalid chat ID or insufficient permissions" });
        }

        // Check for existing users in the group
        const existingUsers = chat.users.filter(u => userId.includes(u._id.toString()));
        if (existingUsers.length > 0) {
            const existingUserNames = existingUsers.map(u => u.name).join(', ');
            return res.status(StatusCodes.BAD_REQUEST).json({ error: `Users ${existingUserNames} already exist in the group.` });
        }

        // Add new users to the group
        const updatedChat = await Chat.findByIdAndUpdate(chatId, { $push: { users: { $each: userId } } }, { new: true })
            .populate("users", "name email phone avatar bio lastSeen")
            .populate("groupAdmin", "name email phone avatar bio lastSeen")
            .populate("latestMessage");

        return res.status(StatusCodes.OK).json({ chat: updatedChat, success: true });

    } catch (error) {
        console.error(error);
        next(error);
    }
};

const leaveChat = async (req, res, next) => {
    const userLoggedIn = req.user.id;
    const { chatId } = req.params;

    try {
        const chat = await Chat.findById(chatId).populate('users');

        // Check if the user is part of the chat
        if (!chat || !chat.users.map(user => user._id.toString()).includes(userLoggedIn)) {
            return res.status(StatusCodes.BAD_REQUEST).json({ error: "Invalid chat ID or insufficient permissions" });
        }

        // Check if the user is the current admin
        const isAdmin = chat.groupAdmin.equals(userLoggedIn);
        let updatedChat;

        if (isAdmin) {
            // Find user index within the chat
            const userIndex = chat.users.findIndex(user => user._id.toString() === userLoggedIn);

            // Conditional Admin Update
            if (chat.users.length > 1) { // Check if there are remaining users
                if (userIndex !== 1) {
                    // Existing logic - promote user at index 1 if not admin leaving
                    const newAdmin = chat.users[1];
                    updatedChat = await Chat.findByIdAndUpdate(chatId, {
                        groupAdmin: newAdmin._id,
                        $pull: {
                            users: userLoggedIn
                        }
                    }, { new: true }).populate('users');
                } else {
                    // Admin leaving is at index 1, choose another user (randomly)
                    const remainingUsers = chat.users.filter(user => user._id.toString() !== userLoggedIn);
                    if (remainingUsers.length > 0) {
                        const randomIndex = Math.floor(Math.random() * remainingUsers.length);
                        const newAdmin = remainingUsers[randomIndex];
                        updatedChat = await Chat.findByIdAndUpdate(chatId, {
                            groupAdmin: newAdmin._id,
                            $pull: {
                                users: userLoggedIn
                            }
                        }, { new: true }).populate('users');
                    } else {
                        // No remaining users, delete the chat
                        await Chat.findByIdAndDelete(chatId);
                        return res.status(StatusCodes.OK).json({ msg: "You successfully left the chat and the chat has been deleted since there are no remaining users.", success: true });
                    }
                }
            } else {
                // No remaining users, delete the chat
                await Chat.findByIdAndDelete(chatId);
                return res.status(StatusCodes.OK).json({ msg: "You successfully left the chat and the chat has been deleted since there are no remaining users.", success: true });
            }
        } else {
            // If the user is not the admin, simply remove them from the chat
            updatedChat = await Chat.findByIdAndUpdate(chatId, { $pull: { users: userLoggedIn } }, { new: true }).populate('users');

            // Check if any users remain after removing the current user
            if (updatedChat.users.length === 0) {
                await Chat.findByIdAndDelete(chatId);
                return res.status(StatusCodes.OK).json({ msg: "You successfully left the chat and the chat has been deleted since there are no remaining users.", success: true });
            }
        }

        return res.status(StatusCodes.OK).json({
            msg: isAdmin ? "You successfully left the chat and a new admin has been promoted." : "You successfully left the chat.",
            success: true
        });

    } catch (error) {
        console.error(error);
        next(error);
    }
};

const fetchGroupChats = async (req, res, next) => {
    const user = req.user.id;

    try {
        const chats = await Chat.find({ isGroupChat: true, users: { $in: [user] } }).populate("users", "name email phone avatar bio lastSeen")
        .populate("groupAdmin", "name email phone avatar bio lastSeen")
        .populate({
            path: "latestMessage",
            populate: {
                path: "sender",
                select: "name email phone avatar bio lastSeen"
            }
        })
        .sort({ updatedAt: -1 });

        return res.status(StatusCodes.OK).json({
            chats,
            success: true
        });

    } catch (error) {
        console.error(error);
        next(error);
    }

}

const fetchChatDetails = async (req, res, next) => {
    const { chatId } = req.params;
    const user = req.user.id

    try {
        const chat = await Chat.findOne({_id:chatId, users:{$in:[user]}})
            .populate("users", "name email phone avatar bio lastSeen")
            .populate("groupAdmin", "name email phone avatar bio lastSeen")
            .populate({
                path: "latestMessage",
                populate: {
                    path: "sender",
                    select: "name email phone avatar bio lastSeen"
                }
            });

        if (!chat) {
            return res.status(StatusCodes.NOT_FOUND).json({ error: "Chat not found" });
        }
        console.log(chat)
        return res.status(StatusCodes.OK).json({ chat });
    } catch (error) {
        console.error(error);
        next(error);
    }
};



module.exports = {
    accessChat,
    fetchChats,
    CreateGroupChat,
    renameGroup,
    removeFromGroup,
    addToGroup,
    leaveChat,
    fetchGroupChats,
    fetchChatDetails
}


