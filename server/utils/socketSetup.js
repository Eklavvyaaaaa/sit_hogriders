const { Server } = require('socket.io');

let io = null;

/**
 * Initialize Socket.io with the HTTP server.
 */
function initSocket(httpServer) {
    io = new Server(httpServer, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST']
        }
    });

    io.on('connection', (socket) => {
        console.log(`Socket connected: ${socket.id}`);

        // Teachers join an exam room to receive updates
        socket.on('join:exam', (examId) => {
            socket.join(`exam:${examId}`);
            console.log(`Socket ${socket.id} joined exam:${examId}`);
        });

        socket.on('disconnect', () => {
            console.log(`Socket disconnected: ${socket.id}`);
        });
    });

    return io;
}

/**
 * Get the active Socket.io instance.
 */
function getIO() {
    return io;
}

module.exports = { initSocket, getIO };
