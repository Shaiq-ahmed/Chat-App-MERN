const Message = require('../models/Message');
const Chat = require('../models/Chat');

module.exports = (io, socket) => {
    socket.on('sendMessage', async (data) => {
        const { senderId, chatId, content } = data;

        // Create a new message
        const message = new Message({
            sender: senderId,
            content,
            chat: chatId
        });
        await message.save();

        // Update last message in chat
        const chat = await Chat.findById(chatId);
        chat.lastMessage = message._id;
        await chat.save();

        // Emit message to participants
        io.to(chatId).emit('messageReceived', message);
    });

    socket.on('createChat', async (data) => {
        const { userIds, isGroupChat, groupName } = data;

        const chat = new Chat({
            participants: userIds,
            isGroupChat,
            groupName: isGroupChat ? groupName : null
        });
        await chat.save();

        // Join chat room
        userIds.forEach(userId => {
            socket.join(chat._id.toString());
        });

        io.to(chat._id.toString()).emit('chatCreated', chat);
    });

    socket.on('joinChat', (chatId) => {
        socket.join(chatId);
    });
};