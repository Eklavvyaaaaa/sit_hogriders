require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDB } = require('./config/db');

// Import routes
const authRoutes = require('./routes/authRoutes');
const examRoutes = require('./routes/examRoutes');
const classroomRoutes = require('./routes/classroomRoutes');
const monitoringRoutes = require('./routes/monitoringRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/auth', authRoutes);
app.use('/exam', examRoutes);
app.use('/classroom', classroomRoutes);
app.use('/monitor', monitoringRoutes);

// Database initialization & Server start
const startServer = async () => {
    try {
        await initDB();
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
    }
};

startServer();
