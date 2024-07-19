require('dotenv').config();
const http = require('http');
const app = require('./app');
const { Server } = require('socket.io');
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
// socketHandlers(io);

io.on("connection", (socket) => {
    console.log("User is connected");

    // when user is connected to the application it will send the user Id
    // when client emit "setup" event with userData 
    socket.on("setup", (userData)=>{
        socket.join(userData._id)
        console.log(userData._id)
        socket.emit("connected")
    })

    socket.on("join chat", (room)=>{
        socket.join(room)
        console.log("User has joined room" + room)
    })

    socket.on("new message", (newMessageReceived)=>{
        let chat = newMessageReceived.chat;

        if(!chat.users) {
            return console.log("chat.users not defined")
        }

        // send all the users in a chat except the sender 
        chat.users.forEach(user => {
            if(user._id !== newMessageReceived.sender._id) {
                socket.to(user._id).emit("message received", newMessageReceived) 
            }
        })

    })

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

const port = process.env.PORT || 5001

server.listen(port, () => {
    console.log(`server listening on port ${port}`);
})