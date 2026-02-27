const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');

const dbPath = path.resolve(__dirname, '../database/exam_system.db');

let db;

const initDB = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    console.log('Connected to the SQLite database.');

    // Create Tables
    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('teacher', 'student'))
      );

      CREATE TABLE IF NOT EXISTS exams (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        duration INTEGER NOT NULL,
        questions_json TEXT NOT NULL,
        teacher_id INTEGER,
        FOREIGN KEY (teacher_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS classrooms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        exam_id INTEGER,
        teacher_id INTEGER,
        FOREIGN KEY (exam_id) REFERENCES exams(id),
        FOREIGN KEY (teacher_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS submissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER,
        exam_id INTEGER,
        answers_json TEXT NOT NULL,
        score INTEGER,
        FOREIGN KEY (student_id) REFERENCES users(id),
        FOREIGN KEY (exam_id) REFERENCES exams(id)
      );

      CREATE TABLE IF NOT EXISTS monitoring_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        exam_id INTEGER,
        event_type TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (exam_id) REFERENCES exams(id)
      );
    `);

    console.log('Database tables initialized.');
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
};

const getDB = () => {
  if (!db) {
    throw new Error('Database not initialized! Call initDB first.');
  }
  return db;
};

module.exports = { initDB, getDB };
