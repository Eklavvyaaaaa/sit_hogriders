const { pool } = require('../config/db');

exports.getNotifications = async (req, res) => {
    const userId = req.user.id;
    try {
        const result = await pool.query(
            'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
            [userId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Failed to get notifications', err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.markAsRead = async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params; // 'all' or specific ID

    try {
        if (id === 'all') {
            await pool.query(
                'UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false',
                [userId]
            );
        } else {
            await pool.query(
                'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2 AND is_read = false',
                [id, userId]
            );
        }
        res.json({ success: true });
    } catch (err) {
        console.error('Failed to mark notification(s) as read', err);
        res.status(500).json({ message: 'Server error' });
    }
};
