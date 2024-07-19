const chatSocket = require('./chatSocket');

function setupSockets(io) {
    io.on('connection', (socket) => {
        console.log('User connected');

        chatSocket(io, socket);

        socket.on('disconnect', () => {
            console.log('User disconnected');
        });
    });
}

module.exports = { setupSockets };