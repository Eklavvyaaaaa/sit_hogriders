const { pool } = require('../config/db');

exports.getExamReview = async (req, res) => {
    const { exam_id } = req.params;

    try {
        const result = await pool.query(
            `
      SELECT 
        u.name AS student_name,
        s.id AS submission_id,
        fg.base_score,
        fg.final_score,
        fg.trust_factor,
        AVG(a.ati_value)::float AS avg_ati,
        AVG(p.similarity_score)::float AS avg_pac
      FROM submissions s
      JOIN users u ON s.student_id = u.id
      LEFT JOIN final_grades fg ON s.id = fg.submission_id
      LEFT JOIN answers ans ON s.id = ans.submission_id
      LEFT JOIN ati_scores a ON ans.id = a.answer_id
      LEFT JOIN pac_scores p ON ans.id = p.answer_id
      WHERE s.exam_id = $1
      GROUP BY u.name, s.id, fg.base_score, fg.final_score, fg.trust_factor
      ORDER BY fg.final_score DESC NULLS LAST
      `,
            [exam_id]
        );

        const formatted = result.rows.map(row => {
            let trustBand = "Not Evaluated";

            const atiNum = row.avg_ati !== null && row.avg_ati !== undefined ? Number(row.avg_ati) : null;
            const pacNum = row.avg_pac !== null && row.avg_pac !== undefined ? Number(row.avg_pac) : null;

            if (atiNum !== null) {
                trustBand = "High";
                if (atiNum < 0.5) trustBand = "Low";
                else if (atiNum < 0.75) trustBand = "Medium";
            }

            return {
                ...row,
                avg_ati: atiNum,
                avg_pac: pacNum,
                trust_band: trustBand
            };
        });

        res.json(formatted);

    } catch (err) {
        console.error("Error in getExamReview:", err);
        res.status(500).json({ error: err.message });
    }
};