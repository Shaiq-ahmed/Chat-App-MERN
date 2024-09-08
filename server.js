require('dotenv').config();
const http = require('http');
const app = require('./app');
const { Server } = require('socket.io');
const Chat = require('./models/chatSchema');
const Message = require('./models/messageSchema');
const jwt = require('jsonwebtoken');
// const socketHandlers = require('./sockets');


const server = http.createServer(app);
const io = new Server(server, {
    pingTimeout:60000, // it will 60 seconds before it goes off to save the bandwidth
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
    }
});




io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    
    // Verify token
    if (token) {
        jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
            if (err) {
                console.error("JWT verification failed:", err);
                return next(new Error('Authentication error'));
            }
            
            // Attach userId to the socket
            socket.userId = decoded.userId;
            next();  // Allow the connection
        });
    } else {
        next(new Error('Authentication error'));  // Reject the connection if no token is provided
    }
});



const users = {};  // userId -> [socketIds] map

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Register user socket
    socket.on('register', () => {
        const userId = socket.userId;
        if (!users[userId]) {
            users[userId] = [];
        }
        users[userId] = users[userId].filter(existingSocketId => existingSocketId !== socket.id);
        users[userId].push(socket.id);

        io.emit('users-online', Object.keys(users)); 
        console.log(`User registered: ${userId}`);
    });

    // Handle 'send-message' event
    socket.on('send-message', async (messageData) => {
        const { chatId, content } = messageData;

        try {
            const chat = await Chat.findById(chatId).populate('users').populate('latestMessage');
            if (!chat) {
                console.error("Chat not found");
                return;
            }

            const newMessage = new Message({
                sender: socket.userId,
                content,
                chat: chatId,
            });
            await newMessage.save();

            chat.latestMessage = newMessage._id;
            await chat.save();

            const populatedMessage = await Message.findById(newMessage._id).populate("sender", "name email avatar");

            const senderSocketIds = users[socket.userId] || [];
            senderSocketIds.forEach(socketId => {
                io.to(socketId).emit('receive-message', populatedMessage);
            });

            const usersToNotify = chat.isGroupChat 
                ? chat.users 
                : chat.users.filter(user => user._id.toString() !== socket.userId.toString());

            usersToNotify.forEach((user) => {
                const userSocketIds = users[user._id] || [];
                userSocketIds.forEach(socketId => {
                    io.to(socketId).emit('receive-message', populatedMessage);
                });
            });

            usersToNotify.forEach(async (user) => {
                const unreadCount = await Message.countDocuments({
                    chat: chat._id,
                    seen: false,
                    sender: { $ne: user._id },
                    readBy: { $ne: user._id }
                });

                const userSocketIds = users[user._id] || [];
                userSocketIds.forEach(socketId => {
                    io.to(socketId).emit('unread-count-update', { chatId, unreadCount });
                });
            });

            console.log(`Message sent from ${socket.userId} to chat ${chatId}`);
        } catch (error) {
            console.error("Error sending message:", error);
        }
    });

    // Handle 'message-seen' event
    socket.on('message-seen', async (data) => {
        const { chatId, messageId } = data;
        const userId = socket.userId;

        try {
            // Find the message and update the seen status and readBy array
            const message = await Message.findById(messageId);
            if (!message) {
                console.error("Message not found");
                return;
            }

            // Update the 'seen' field and add the user to the 'readBy' array if not already present
            if (!message.readBy.includes(userId)) {
                message.readBy.push(userId);
            }

            // Check if the message should be marked as 'seen' for a group chat
            if (message.chat.isGroupChat) {
                const chat = await Chat.findById(chatId).populate('users');
                const allUsersRead = chat.users.every(user => message.readBy.includes(user._id.toString()));

                if (allUsersRead) {
                    message.seen = true; // Mark as seen only if all users have read the message
                }
            } else {
                message.seen = true; // Direct chat message is marked seen immediately when the recipient reads it
            }

            await message.save();

            // Emit 'message-seen-update' to all users in the chat
            const usersToNotify = message.chat.isGroupChat 
                ? message.chat.users 
                : message.chat.users.filter(user => user._id.toString() !== userId.toString());

            usersToNotify.forEach((user) => {
                const userSocketIds = users[user._id] || [];
                userSocketIds.forEach(socketId => {
                    io.to(socketId).emit('message-seen-update', { messageId, chatId });
                });
            });

            console.log(`Message seen: ${messageId} in chat ${chatId} by user ${userId}`);
        } catch (error) {
            console.error("Error handling message seen:", error);
        }
    });

    socket.on('disconnect', () => {
        Object.keys(users).forEach((userId) => {
            users[userId] = users[userId].filter(socketId => socketId !== socket.id);
            if (users[userId].length === 0) {
                delete users[userId];
            }
        });

        io.emit('users-online', Object.keys(users));
        console.log(`User disconnected: ${socket.id}`);
    });
});

const port = process.env.PORT || 5001

server.listen(port, () => {
    console.log(`server listening on port ${port}`);
})