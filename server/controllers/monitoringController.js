const { query } = require('../config/db');

exports.logEvent = async (req, res) => {
    try {
        const { examId, eventType } = req.body;
        const studentId = req.user.id;

        if (!examId || !eventType) {
            return res.status(400).json({ message: 'Exam ID and event type are required' });
        }

        await query(
            'INSERT INTO monitoring_logs (user_id, exam_id, event_type) VALUES ($1, $2, $3)',
            [studentId, examId, eventType]
        );

        res.status(201).json({ message: 'Log recorded' });
    } catch (error) {
        console.error('Log event error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getLogs = async (req, res) => {
    try {
        const { examId } = req.params;
        const teacherId = req.user.id;

        // Verify teacher owns this exam
        const examResult = await query('SELECT * FROM exams WHERE id = $1 AND teacher_id = $2', [examId, teacherId]);
        if (examResult.rows.length === 0) {
            return res.status(403).json({ message: 'Unauthorized access to these logs' });
        }

        const logsResult = await query(`
            SELECT m.*, u.name as student_name, u.email as student_email 
            FROM monitoring_logs m
            JOIN users u ON m.user_id = u.id
            WHERE m.exam_id = $1
            ORDER BY m.timestamp DESC
        `, [examId]);

        res.json(logsResult.rows);
    } catch (error) {
        console.error('Get logs error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
