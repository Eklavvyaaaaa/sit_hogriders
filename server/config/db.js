const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

/**
 * Initialize the database by creating all required tables.
 * Uses PostgreSQL syntax (SERIAL instead of AUTOINCREMENT, TEXT instead of DATETIME).
 */
const initDB = async () => {
  try {
    // Test the connection
    const client = await pool.connect();
    console.log('Connected to Neon PostgreSQL database.');
    client.release();

    // Create Tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('teacher', 'student'))
      );

      CREATE TABLE IF NOT EXISTS exams (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        duration INTEGER NOT NULL,
        questions_json TEXT NOT NULL,
        teacher_id INTEGER REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS classrooms (
        id SERIAL PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        exam_id INTEGER REFERENCES exams(id),
        teacher_id INTEGER REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS submissions (
        id SERIAL PRIMARY KEY,
        student_id INTEGER REFERENCES users(id),
        exam_id INTEGER REFERENCES exams(id),
        answers_json TEXT NOT NULL,
        score INTEGER,
        status TEXT DEFAULT 'in_progress',
        submitted_at TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS monitoring_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        exam_id INTEGER REFERENCES exams(id),
        event_type TEXT NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS answers (
        id SERIAL PRIMARY KEY,
        submission_id INTEGER REFERENCES submissions(id),
        question_id INTEGER,
        answer_text TEXT
      );

      CREATE TABLE IF NOT EXISTS nlp_evaluations (
        id SERIAL PRIMARY KEY,
        answer_id INTEGER UNIQUE REFERENCES answers(id),
        semantic_score REAL,
        reasoning_score REAL
      );

      CREATE TABLE IF NOT EXISTS pac_scores (
        id SERIAL PRIMARY KEY,
        answer_id INTEGER UNIQUE REFERENCES answers(id),
        similarity_score REAL
      );

      CREATE TABLE IF NOT EXISTS ati_scores (
        id SERIAL PRIMARY KEY,
        answer_id INTEGER UNIQUE REFERENCES answers(id),
        ati_value REAL
      );

      CREATE TABLE IF NOT EXISTS final_grades (
        id SERIAL PRIMARY KEY,
        submission_id INTEGER UNIQUE REFERENCES submissions(id),
        base_score REAL,
        trust_factor REAL,
        final_score REAL
      );
    `);

    console.log('Database tables initialized.');
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
};

/**
 * Execute a query against the PostgreSQL pool.
 * @param {string} text - SQL query string with $1, $2... placeholders
 * @param {Array} params - Query parameters
 * @returns {Promise<import('pg').QueryResult>}
 */
const query = (text, params) => pool.query(text, params);

module.exports = { initDB, query, pool };
