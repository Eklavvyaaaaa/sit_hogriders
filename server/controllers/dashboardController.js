const { query } = require('../config/db');

exports.getStats = async (req, res) => {
    try {
        const teacherId = req.user.id;

        // Single CTE query to fetch all stats efficiently
        const statsQuery = `
            WITH teacher_exams AS (
                SELECT id FROM exams WHERE teacher_id = $1
            ),
            exam_counts AS (
                SELECT 
                    COUNT(*) as total,
                    COUNT(*) FILTER (WHERE status = 'active') as active
                FROM exams WHERE teacher_id = $1
            ),
            student_counts AS (
                SELECT 
                    COUNT(DISTINCT student_id) as total_students,
                    COUNT(DISTINCT student_id) FILTER (WHERE flagged = true) as flagged_students
                FROM students_exam 
                WHERE exam_id IN (SELECT id FROM teacher_exams)
            ),
            violation_counts AS (
                SELECT COUNT(*) as violations
                FROM monitoring_logs 
                WHERE exam_id IN (SELECT id FROM teacher_exams)
            ),
            avg_time AS (
                SELECT COALESCE(
                    AVG(EXTRACT(EPOCH FROM (s.submitted_at - se.joined_at)) / 60), 0
                ) as avg_minutes
                FROM submissions s
                JOIN students_exam se ON s.student_id = se.student_id AND s.exam_id = se.exam_id
                WHERE s.exam_id IN (SELECT id FROM teacher_exams) AND s.submitted_at IS NOT NULL
            )
            SELECT 
                (SELECT total FROM exam_counts) as count,
                (SELECT active FROM exam_counts) as active_count,
                (SELECT total_students FROM student_counts) as unique_students,
                (SELECT violations FROM violation_counts) as total_violations,
                (SELECT flagged_students FROM student_counts) as flagged_count,
                (SELECT avg_minutes FROM avg_time) as avg_minutes
        `;

        const result = await query(statsQuery, [teacherId]);
        const row = result.rows[0];

        res.json({
            totalExams: parseInt(row.count || 0),
            activeExams: parseInt(row.active_count || 0),
            totalStudents: parseInt(row.unique_students || 0),
            totalViolations: parseInt(row.total_violations || 0),
            flaggedStudents: parseInt(row.flagged_count || 0),
            avgCompletionMinutes: Math.round(parseFloat(row.avg_minutes || 0) * 10) / 10
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Dashboard overview — returns exact shape: totalExams, activeExams, completedExams, totalViolations, totalStudents
exports.getOverview = async (req, res) => {
  try {
    const teacherId = req.user.id;

    const overviewQuery = `
      WITH teacher_exams AS (
        SELECT id, status FROM exams WHERE teacher_id = $1
      ),
      exam_counts AS (
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'active') as active,
          COUNT(*) FILTER (WHERE status = 'completed') as completed
        FROM teacher_exams
      ),
      student_counts AS (
        SELECT COUNT(DISTINCT student_id) as total_students
        FROM students_exam
        WHERE exam_id IN (SELECT id FROM teacher_exams)
      ),
      violation_counts AS (
        SELECT COUNT(*) as violations
        FROM monitoring_logs
        WHERE exam_id IN (SELECT id FROM teacher_exams)
      )
      SELECT
        (SELECT total FROM exam_counts) as total_exams,
        (SELECT active FROM exam_counts) as active_exams,
        (SELECT completed FROM exam_counts) as completed_exams,
        (SELECT total_students FROM student_counts) as total_students,
        (SELECT violations FROM violation_counts) as total_violations
    `;

    const result = await query(overviewQuery, [teacherId]);
    const row = result.rows[0];

        res.json({
            totalExams: parseInt(row.total_exams || 0),
            activeExams: parseInt(row.active_exams || 0),
            completedExams: parseInt(row.completed_exams || 0),
            totalViolations: parseInt(row.total_violations || 0),
            totalStudents: parseInt(row.total_students || 0)
        });
    } catch (error) {
        console.error('Dashboard overview error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
