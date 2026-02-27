const { getDB } = require('../config/db');

exports.createExam = async (req, res) => {
    try {
        const { title, duration, questions } = req.body;
        const teacherId = req.user.id; // From authMiddleware

        if (!title || !duration || !questions) {
            return res.status(400).json({ message: 'Title, duration, and questions are required' });
        }

        const db = getDB();
        const questionsJson = JSON.stringify(questions);

        const result = await db.run(
            'INSERT INTO exams (title, duration, questions_json, teacher_id) VALUES (?, ?, ?, ?)',
            [title, duration, questionsJson, teacherId]
        );

        res.status(201).json({ message: 'Exam created successfully', examId: result.lastID });
    } catch (error) {
        console.error('Create exam error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getTeacherExams = async (req, res) => {
    try {
        const teacherId = req.user.id;
        const db = getDB();

        const exams = await db.all('SELECT * FROM exams WHERE teacher_id = ?', [teacherId]);
        res.json(exams);
    } catch (error) {
        console.error('Get exams error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.submitExam = async (req, res) => {
    try {
        const { examId, answers, score } = req.body;
        const studentId = req.user.id;

        if (!examId || !answers) {
            return res.status(400).json({ message: 'Exam ID and answers are required' });
        }

        const db = getDB();
        const answersJson = JSON.stringify(answers);

        await db.run(
            'INSERT INTO submissions (student_id, exam_id, answers_json, score) VALUES (?, ?, ?, ?)',
            [studentId, examId, answersJson, score || 0]
        );

        res.status(201).json({ message: 'Exam submitted successfully' });
    } catch (error) {
        console.error('Submit exam error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
