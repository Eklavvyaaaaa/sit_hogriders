const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

// In-memory cache: userId -> { name, role }
// Bounded to prevent memory leaks
const MAX_CACHE_SIZE = 500;
const userInfoCache = new Map();

function cacheSet(key, value) {
    // Simple LRU: delete oldest entries when cache exceeds max size
    if (userInfoCache.size >= MAX_CACHE_SIZE) {
        const oldest = userInfoCache.keys().next().value;
        userInfoCache.delete(oldest);
    }
    userInfoCache.set(key, value);
}


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

                // Cache user info on first join to avoid DB lookups per message
                if (!userInfoCache.has(socket.user.id)) {
                    const userRes = await query('SELECT name, role FROM users WHERE id = $1', [socket.user.id]);
                    if (userRes.rows.length > 0) {
                        cacheSet(socket.user.id, userRes.rows[0]);
                    }
                }

                if (typeof callback === 'function') callback({ success: true });
            } catch (err) {
                console.error('Error in join:chat auth:', err);
                if (typeof callback === 'function') callback({ error: 'Server error' });
            }
        });

        // Fast socket-based message sending (bypasses HTTP)
        socket.on('send:message', async ({ examId, message }, callback) => {
            try {
                const parsedId = parseInt(examId, 10);
                if (!parsedId || isNaN(parsedId) || parsedId <= 0) {
                    if (typeof callback === 'function') callback({ error: 'Invalid exam ID' });
                    return;
                }
                if (!message || typeof message !== 'string' || !message.trim()) {
                    if (typeof callback === 'function') callback({ error: 'Message empty' });
                    return;
                }
                const trimmed = message.trim().slice(0, 2000);

                // Verify user is in the chat room (already authorized on join)
                const rooms = socket.rooms;
                if (!rooms.has(`chat:${parsedId}`)) {
                    if (typeof callback === 'function') callback({ error: 'Not in chat room' });
                    return;
                }

                // Insert into DB
                const result = await query(
                    `INSERT INTO chat_messages (exam_id, sender_id, message_text) VALUES ($1, $2, $3) RETURNING id, exam_id, sender_id, message_text, created_at`,
                    [parsedId, socket.user.id, trimmed]
                );
                const newMsg = result.rows[0];

                // Attach cached user info (no extra DB query)
                const cached = userInfoCache.get(socket.user.id);
                if (cached) {
                    newMsg.sender_name = cached.name;
                    newMsg.sender_role = cached.role;
                } else {
                    newMsg.sender_name = 'Unknown';
                    newMsg.sender_role = 'student';
                }

                // Broadcast to all in chat room
                io.to(`chat:${parsedId}`).emit('receive:message', newMsg);

                // Acknowledge to sender with the saved message
                if (typeof callback === 'function') callback({ success: true, msg: newMsg });
            } catch (err) {
                console.error('Error in send:message:', err);
                if (typeof callback === 'function') callback({ error: 'Server error' });
            }
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
