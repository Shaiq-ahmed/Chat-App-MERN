const { StatusCodes } = require('http-status-codes');
const Chat = require("../models/chatSchema");
const User = require("../models/userModel");
const Message = require("../models/messageSchema");

// send message 
const sendMessage = async (req, res, next) => {
    const { chatId, content } = req.body;
    const user = req.user.id;

    // Validate input early
    if (!chatId || !content) {
        return res.status(StatusCodes.BAD_REQUEST).json({ error: "An error occurred. Please check your input and try again." });
    }

    try {
        const chat = await Chat.findById(chatId);

        if (!chat) {
            return res.status(StatusCodes.NOT_FOUND).json({ error: "Chat not found" });
        }

        const userExist = chat.users.find(userCheck => userCheck.equals(user));

        if (!userExist) {
            return res.status(StatusCodes.BAD_REQUEST).json({error:"Insufficient Permission", success:false});
        }

        const messageData = {
            sender: user,
            content: content,
            chat: chatId,
        };


        let createMessage = await Message.create(messageData);

        await Chat.findByIdAndUpdate(chatId, {
            latestMessage: createMessage._id
        });
        
        createMessage = await Message.findById(createMessage._id)
            .populate({
                path: 'chat',
                select: '-_id -__v'
            })
            .populate({
                path: 'sender',
                select: 'name email avatar'
            })

        createMessage = await User.populate(createMessage,{
            path: "chat.users",
            select:"name email avatar"

        } );

        return res.status(StatusCodes.OK).json({ result: createMessage, success:true});

    } catch (error) {
        console.error(error);
        next(error);
    }
};

// fetch all the chat messages
const getAllMessages = async (req, res, next) => {
    const chatId = req.params.chatId;
    const user = req.user.id;
    const { offset = 0, limit = 20 } = req.query; 

    if (!chatId) {
        return res.status(StatusCodes.BAD_REQUEST).json({ error: "Chat ID is required. Please ensure you've entered a valid chat ID." });
    }

    try {
        const chat = await Chat.findById(chatId);

        if (!chat) {
            return res.status(StatusCodes.NOT_FOUND).json({ error: "Chat not found" });
        }

        const userExist = chat.users.find(userCheck => userCheck.equals(user));

        if (!userExist) {
            return res.status(StatusCodes.BAD_REQUEST).json({ error: "Insufficient Permission", success: false });
        }

        const fetchChatMessages = await Message.find({ chat: chatId })
            .populate("sender", "name avatar")
            .sort({ createdAt: -1 })
            .skip(parseInt(offset)) // Skip the first 'offset' messages
            .limit(parseInt(limit)); // Limit the number of messages returned

        return res.status(StatusCodes.OK).json({ messages: fetchChatMessages, success: true });

    } catch (error) {
        console.error(error);
        next(error);
    }
};



module.exports = {
    sendMessage,
    getAllMessages
}



