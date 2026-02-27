const { query } = require('../config/db');
const { getIO } = require('../utils/socketSetup');

exports.getMessages = async (req, res) => {
    try {
        const { examId } = req.params;
        const result = await query(`
            SELECT c.id, c.exam_id, c.sender_id, c.message_text, c.created_at, u.name AS sender_name, u.role AS sender_role
            FROM chat_messages c
            JOIN users u ON c.sender_id = u.id
            WHERE c.exam_id = $1
            ORDER BY c.created_at ASC
        `, [examId]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching chat messages:', error);
        res.status(500).json({ message: 'Server error fetching messages' });
    }
};

exports.sendMessage = async (req, res) => {
    try {
        const { examId, message } = req.body;
        const senderId = req.user.id;

        const result = await query(`
            INSERT INTO chat_messages (exam_id, sender_id, message_text)
            VALUES ($1, $2, $3)
            RETURNING id, exam_id, sender_id, message_text, created_at
        `, [examId, senderId, message]);

        const newMsg = result.rows[0];

        const userResult = await query('SELECT name, role FROM users WHERE id = $1', [senderId]);
        if (userResult.rows.length > 0) {
            newMsg.sender_name = userResult.rows[0].name;
            newMsg.sender_role = userResult.rows[0].role;
        }

        // Broadcast to everyone in the chat room via Socket.io
        const io = getIO();
        if (io) {
            io.to(`chat:${examId}`).emit('receive:message', newMsg);
        }

        res.status(201).json(newMsg);
    } catch (error) {
        console.error('Error sending chat message:', error);
        res.status(500).json({ message: 'Server error sending message' });
    }
};
