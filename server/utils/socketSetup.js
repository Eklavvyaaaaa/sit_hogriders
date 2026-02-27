const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

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

    // Socket-level JWT authentication middleware
    io.use((socket, next) => {
        const token = socket.handshake.auth?.token;
        if (!token) {
            return next(new Error('Authentication required'));
        }
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.user = decoded;
            next();
        } catch (err) {
            return next(new Error('Invalid or expired token'));
        }
    });

    io.on('connection', (socket) => {
        console.log(`Socket connected: ${socket.id} (user: ${socket.user?.id})`);

        // Teachers join an exam room to receive updates
        socket.on('join:exam', (examId) => {
            const parsedId = parseInt(examId, 10);
            if (!parsedId || isNaN(parsedId) || parsedId <= 0) {
                console.log(`Invalid examId provided for socket join: ${examId}`);
                return;
            }
            socket.join(`exam:${parsedId}`);
            console.log(`Socket ${socket.id} joined exam:${parsedId}`);
        });

        // Chat room join (authenticated via middleware above)
        socket.on('join:chat', (examId) => {
            const parsedId = parseInt(examId, 10);
            if (!parsedId || isNaN(parsedId) || parsedId <= 0) return;
            socket.join(`chat:${parsedId}`);
            console.log(`Socket ${socket.id} joined chat:${parsedId}`);
        });

        // Note: send:message removed — broadcasting is handled by the
        // authenticated HTTP POST /chat endpoint in chatController.sendMessage

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

