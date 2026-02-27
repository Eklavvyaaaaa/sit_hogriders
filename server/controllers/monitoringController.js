const { getDB } = require('../config/db');

exports.logEvent = async (req, res) => {
    try {
        const { examId, eventType } = req.body;
        const studentId = req.user.id;

        if (!examId || !eventType) {
            return res.status(400).json({ message: 'Exam ID and event type are required' });
        }

        const db = getDB();

        await db.run(
            'INSERT INTO monitoring_logs (user_id, exam_id, event_type) VALUES (?, ?, ?)',
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

        const db = getDB();

        // Verify teacher owns this exam
        const exam = await db.get('SELECT * FROM exams WHERE id = ? AND teacher_id = ?', [examId, teacherId]);
        if (!exam) {
            return res.status(403).json({ message: 'Unauthorized access to these logs' });
        }

        const logs = await db.all(\`
      SELECT m.*, u.name as student_name, u.email as student_email 
      FROM monitoring_logs m
      JOIN users u ON m.user_id = u.id
      WHERE m.exam_id = ?
      ORDER BY m.timestamp DESC
    \`, [examId]);

    res.json(logs);
  } catch (error) {
    console.error('Get logs error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
