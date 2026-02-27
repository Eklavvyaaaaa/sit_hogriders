const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

let io = null;

/**
 * Check if a user can access an exam (teacher or enrolled student).
 */
async function canAccessExam(userId, examId) {
    const teacherCheck = await query(
        'SELECT id FROM exams WHERE id = $1 AND teacher_id = $2',
        [examId, userId]
    );
    if (teacherCheck.rows.length > 0) return true;

    const studentCheck = await query(
        'SELECT id FROM students_exam WHERE exam_id = $1 AND student_id = $2',
        [examId, userId]
    );
    return studentCheck.rows.length > 0;
}

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
        socket.on('join:exam', async (examId, callback) => {
            const parsedId = parseInt(examId, 10);
            if (!parsedId || isNaN(parsedId) || parsedId <= 0) {
                console.log(`Invalid examId provided for socket join: ${examId}`);
                if (typeof callback === 'function') callback({ error: 'Invalid exam ID' });
                return;
            }
            try {
                if (!(await canAccessExam(socket.user.id, parsedId))) {
                    if (typeof callback === 'function') callback({ error: 'Not authorized' });
                    return;
                }
                socket.join(`exam:${parsedId}`);
                console.log(`Socket ${socket.id} joined exam:${parsedId}`);
                if (typeof callback === 'function') callback({ success: true });
            } catch (err) {
                console.error('Error in join:exam auth:', err);
                if (typeof callback === 'function') callback({ error: 'Server error' });
            }
        });

        // Chat room join (authenticated + authorized)
        socket.on('join:chat', async (examId, callback) => {
            const parsedId = parseInt(examId, 10);
            if (!parsedId || isNaN(parsedId) || parsedId <= 0) {
                if (typeof callback === 'function') callback({ error: 'Invalid exam ID' });
                return;
            }
            try {
                if (!(await canAccessExam(socket.user.id, parsedId))) {
                    if (typeof callback === 'function') callback({ error: 'Not authorized' });
                    return;
                }
                socket.join(`chat:${parsedId}`);
                console.log(`Socket ${socket.id} joined chat:${parsedId}`);
                if (typeof callback === 'function') callback({ success: true });
            } catch (err) {
                console.error('Error in join:chat auth:', err);
                if (typeof callback === 'function') callback({ error: 'Server error' });
            }
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
