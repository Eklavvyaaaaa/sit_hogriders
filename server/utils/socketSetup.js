const { Server } = require('socket.io');

let io = null;

/**
 * Initialize Socket.io with the HTTP server.
 */
function initSocket(httpServer) {
    io = new Server(httpServer, {
        cors: {
            origin: process.env.NODE_ENV === 'production' ? process.env.CLIENT_URL : '*',
            methods: ['GET', 'POST']
        }
    });

    io.on('connection', (socket) => {
        console.log(`Socket connected: ${socket.id}`);

        // Teachers join an exam room to receive updates
        socket.on('join:exam', (examId) => {
            const parsedId = parseInt(examId, 10);
            if (!parsedId || isNaN(parsedId) || parsedId <= 0) {
                console.log(`Invalid examId provided for socket join: ${examId}`);
                return;
            }
            // Ideally we'd authenticate the token here, but basic validation is a start
            socket.join(`exam:${parsedId}`);
            console.log(`Socket ${socket.id} joined exam:${parsedId}`);
        });

        // Chat specific events to isolate from monitoring
        socket.on('join:chat', (examId) => {
            const parsedId = parseInt(examId, 10);
            if (!parsedId || isNaN(parsedId) || parsedId <= 0) return;
            socket.join(`chat:${parsedId}`);
            console.log(`Socket ${socket.id} joined chat:${parsedId}`);
        });

        socket.on('send:message', (data) => {
            const { examId, message } = data;
            const parsedId = parseInt(examId, 10);
            if (!parsedId || isNaN(parsedId) || parsedId <= 0) return;
            // Broadcast to everyone else in the room
            socket.to(`chat:${parsedId}`).emit('receive:message', message);
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
