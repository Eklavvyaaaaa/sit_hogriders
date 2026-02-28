const fs = require('fs');
const csv = require('csv-parser');
const { query } = require('../config/db');

exports.uploadQuestions = (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No CSV file uploaded' });
    }

    const results = [];
    const errors = [];
    let rowNumber = 1; // Header is row 1

    fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (data) => {
            rowNumber++;

            // Basic sanitization
            const type = data.type ? data.type.trim().toUpperCase() : '';
            const question = data.question ? data.question.trim() : '';
            const optionA = data.optionA ? data.optionA.trim() : '';
            const optionB = data.optionB ? data.optionB.trim() : '';
            const optionC = data.optionC ? data.optionC.trim() : '';
            const optionD = data.optionD ? data.optionD.trim() : '';
            let correctAnswer = data.correctAnswer ? data.correctAnswer.trim().toUpperCase() : '';
            const maxMarks = data.maxMarks ? parseInt(data.maxMarks, 10) : null;
            const difficulty = data.difficulty ? data.difficulty.trim() : '';
            const subject = data.subject ? data.subject.trim() : '';

            if (!question) {
                errors.push({ row: rowNumber, reason: 'Question text is empty' });
                return;
            }

            if (type === 'MCQ') {
                if (!optionA || !optionB || !optionC || !optionD) {
                    errors.push({ row: rowNumber, reason: 'MCQ requires all 4 options (A, B, C, D)' });
                    return;
                }
                if (!['A', 'B', 'C', 'D'].includes(correctAnswer)) {
                    errors.push({ row: rowNumber, reason: 'MCQ correctAnswer must be A, B, C, or D' });
                    return;
                }
                if (difficulty && !['Easy', 'Medium', 'Hard'].includes(difficulty)) {
                    errors.push({ row: rowNumber, reason: 'MCQ difficulty must be Easy, Medium, or Hard' });
                    return;
                }
                if (!subject) {
                    errors.push({ row: rowNumber, reason: 'MCQ subject must not be empty' });
                    return;
                }

                results.push({
                    type, question,
                    options_json: JSON.stringify({ A: optionA, B: optionB, C: optionC, D: optionD }),
                    correct_answer: correctAnswer,
                    max_marks: maxMarks || 1, // Optional for MCQ
                    difficulty: difficulty || 'Medium',
                    subject
                });
            } else if (type === 'SUBJECTIVE') {
                if (optionA || optionB || optionC || optionD) {
                    errors.push({ row: rowNumber, reason: 'SUBJECTIVE must not have options' });
                    return;
                }
                if (correctAnswer) {
                    errors.push({ row: rowNumber, reason: 'SUBJECTIVE must not have a correctAnswer' });
                    return;
                }
                if (maxMarks === null || isNaN(maxMarks)) {
                    errors.push({ row: rowNumber, reason: 'SUBJECTIVE maxMarks is required and must be numeric' });
                    return;
                }
                if (difficulty && !['Easy', 'Medium', 'Hard'].includes(difficulty)) {
                    errors.push({ row: rowNumber, reason: 'SUBJECTIVE difficulty must be Easy, Medium, or Hard' });
                    return;
                }
                if (!subject) {
                    errors.push({ row: rowNumber, reason: 'SUBJECTIVE subject must not be empty' });
                    return;
                }

                results.push({
                    type, question,
                    options_json: null,
                    correct_answer: null,
                    max_marks: maxMarks,
                    difficulty: difficulty || 'Medium',
                    subject: subject || 'General'
                });
            } else {
                errors.push({ row: rowNumber, reason: `Unknown question type: '${data.type}'. Must be MCQ or SUBJECTIVE` });
            }
        })
        .on('end', async () => {
            const teacherId = req.user.id;
            let insertedCount = 0;

            try {
                if (results.length > 0) {
                    const placeholders = [];
                    const params = [];
                    let pIndex = 1;

                    results.forEach(q => {
                        placeholders.push(`($${pIndex++}, $${pIndex++}, $${pIndex++}, $${pIndex++}, $${pIndex++}, $${pIndex++}, $${pIndex++}, $${pIndex++})`);
                        params.push(q.type, q.question, q.options_json, q.correct_answer, q.max_marks, q.difficulty, q.subject, teacherId);
                    });

                    const insertQuery = `
                        INSERT INTO question_bank 
                        (type, question, options_json, correct_answer, max_marks, difficulty, subject, created_by) 
                        VALUES ${placeholders.join(', ')}
                    `;

                    await query(insertQuery, params);
                    insertedCount = results.length;
                }

                // Cleanup temp file
                fs.unlink(req.file.path, (err) => {
                    if (err) console.error("Failed to delete temp file:", err);
                });

                res.status(200).json({
                    totalRows: rowNumber - 1, // Exclude header
                    inserted: insertedCount,
                    failed: errors.length,
                    errors: errors
                });

            } catch (dbError) {
                console.error("Database bulk insert error:", dbError);
                fs.unlink(req.file.path, () => { });
                res.status(500).json({ message: "Failed to save questions to database" });
            }
        })
        .on('error', (err) => {
            console.error("CSV Parse Error:", err);
            fs.unlink(req.file.path, () => { });
            res.status(500).json({ message: "Failed to parse CSV file" });
        });
};

// GET /api/questions — Fetch all questions uploaded by this teacher
exports.getQuestions = async (req, res) => {
    try {
        const teacherId = req.user.id;
        const { subject, type } = req.query;

        let sql = 'SELECT * FROM question_bank WHERE created_by = $1';
        const params = [teacherId];

        if (type) {
            params.push(type.toUpperCase());
            sql += ` AND type = $${params.length}`;
        }
        if (subject) {
            params.push(subject);
            sql += ` AND subject = $${params.length}`;
        }

        sql += ' ORDER BY created_at DESC';

        const result = await query(sql, params);

        // Parse options_json back to object for convenience
        const questions = result.rows.map(q => ({
            ...q,
            options: q.options_json ? JSON.parse(q.options_json) : null
        }));

        res.json({ total: questions.length, questions });
    } catch (error) {
        console.error('Get questions error:', error);
        res.status(500).json({ message: 'Failed to fetch questions' });
    }
};

/**
 * POST /api/questions/generate-exam
 * Randomly selects questions from the question_bank and creates a full exam + classroom code.
 * 
 * Body: { title, duration, mcqCount, subjectiveCount, subject? }
 */
exports.generateExamFromBank = async (req, res) => {
    try {
        const teacherId = req.user.id;
        const { title, duration, mcqCount = 0, subjectiveCount = 0, subject } = req.body;

        if (!title || !duration) {
            return res.status(400).json({ message: 'Exam title and duration are required.' });
        }
        if (mcqCount + subjectiveCount === 0) {
            return res.status(400).json({ message: 'Must request at least 1 MCQ or 1 Subjective question.' });
        }

        // Build queries to randomly pick from question_bank
        const questions = [];

        if (mcqCount > 0) {
            let mcqSql = 'SELECT * FROM question_bank WHERE type = $1 AND created_by = $2';
            const mcqParams = ['MCQ', teacherId];
            if (subject) {
                mcqParams.push(subject);
                mcqSql += ` AND subject = $${mcqParams.length}`;
            }
            mcqSql += ' ORDER BY RANDOM() LIMIT $' + (mcqParams.length + 1);
            mcqParams.push(mcqCount);

            const mcqResult = await query(mcqSql, mcqParams);

            for (const row of mcqResult.rows) {
                const opts = row.options_json ? JSON.parse(row.options_json) : {};
                // Convert { A, B, C, D } + correctAnswer('A'/'B'/'C'/'D') → options array + correctOption index
                const optionsArray = [opts.A || '', opts.B || '', opts.C || '', opts.D || ''];
                const letterToIndex = { A: 0, B: 1, C: 2, D: 3 };
                questions.push({
                    text: row.question,
                    type: 'mcq',
                    options: optionsArray,
                    correctOption: letterToIndex[row.correct_answer] ?? 0,
                    model_answer: '',
                    key_points: [],
                    image_url: ''
                });
            }
        }

        if (subjectiveCount > 0) {
            let subjSql = 'SELECT * FROM question_bank WHERE type = $1 AND created_by = $2';
            const subjParams = ['SUBJECTIVE', teacherId];
            if (subject) {
                subjParams.push(subject);
                subjSql += ` AND subject = $${subjParams.length}`;
            }
            subjSql += ' ORDER BY RANDOM() LIMIT $' + (subjParams.length + 1);
            subjParams.push(subjectiveCount);

            const subjResult = await query(subjSql, subjParams);

            for (const row of subjResult.rows) {
                questions.push({
                    text: row.question,
                    type: 'subjective',
                    model_answer: '',
                    key_points: [],
                    image_url: ''
                });
            }
        }

        if (questions.length === 0) {
            return res.status(400).json({ message: 'No matching questions found in your question bank. Upload a CSV first.' });
        }

        // Create the exam using the same format as createExam
        const questionsJson = JSON.stringify(questions);
        const examResult = await query(
            `INSERT INTO exams (title, duration, questions_json, teacher_id, status, created_at)
             VALUES ($1, $2, $3, $4, 'scheduled', CURRENT_TIMESTAMP) RETURNING id`,
            [title, duration, questionsJson, teacherId]
        );
        const examId = examResult.rows[0].id;

        // Auto-generate classroom code
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        await query(
            'INSERT INTO classrooms (code, exam_id, teacher_id) VALUES ($1, $2, $3)',
            [code, examId, teacherId]
        );

        res.status(201).json({
            message: 'Exam generated successfully from question bank!',
            examId,
            classroomCode: code,
            questionsUsed: questions.length,
            mcqUsed: questions.filter(q => q.type === 'mcq').length,
            subjectiveUsed: questions.filter(q => q.type === 'subjective').length
        });

    } catch (error) {
        console.error('Generate exam from bank error:', error);
        res.status(500).json({ message: 'Failed to generate exam' });
    }
};
