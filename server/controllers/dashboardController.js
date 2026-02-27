const { query } = require('../config/db');

exports.getStats = async (req, res) => {
    try {
        const teacherId = req.user.id;

        // Total exams for this teacher
        const totalExams = await query('SELECT COUNT(*) as count FROM exams WHERE teacher_id = $1', [teacherId]);

        // Active exams
        const activeExams = await query(
            "SELECT COUNT(*) as count FROM exams WHERE teacher_id = $1 AND status = 'active'",
            [teacherId]
        );

        // Total unique students across teacher's exams
        const totalStudents = await query(`
      SELECT COUNT(DISTINCT se.student_id) as count
      FROM students_exam se
      JOIN exams e ON se.exam_id = e.id
      WHERE e.teacher_id = $1
    `, [teacherId]);

        // Total violations across teacher's exams
        const totalViolations = await query(`
      SELECT COUNT(*) as count
      FROM monitoring_logs ml
      JOIN exams e ON ml.exam_id = e.id
      WHERE e.teacher_id = $1
    `, [teacherId]);

        // Total flagged students
        const flaggedStudents = await query(`
      SELECT COUNT(*) as count
      FROM students_exam se
      JOIN exams e ON se.exam_id = e.id
      WHERE e.teacher_id = $1 AND se.flagged = true
    `, [teacherId]);

        // Average completion time (from join to submission)
        const avgCompletion = await query(`
      SELECT COALESCE(
        AVG(EXTRACT(EPOCH FROM (s.submitted_at - se.joined_at)) / 60), 0
      ) as avg_minutes
      FROM submissions s
      JOIN students_exam se ON s.student_id = se.student_id AND s.exam_id = se.exam_id
      JOIN exams e ON s.exam_id = e.id
      WHERE e.teacher_id = $1 AND s.submitted_at IS NOT NULL
    `, [teacherId]);

        res.json({
            totalExams: parseInt(totalExams.rows[0].count),
            activeExams: parseInt(activeExams.rows[0].count),
            totalStudents: parseInt(totalStudents.rows[0].count),
            totalViolations: parseInt(totalViolations.rows[0].count),
            flaggedStudents: parseInt(flaggedStudents.rows[0].count),
            avgCompletionMinutes: Math.round(parseFloat(avgCompletion.rows[0].avg_minutes) * 10) / 10
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
