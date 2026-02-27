require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { initDB } = require('./config/db');
const { initSocket } = require('./utils/socketSetup');
const reviewRoutes = require('./routes/reviewRoutes');

// Import routes
const authRoutes = require('./routes/authRoutes');
const examRoutes = require('./routes/examRoutes');
const classroomRoutes = require('./routes/classroomRoutes');
const monitoringRoutes = require('./routes/monitoringRoutes');
const submissionRoutes = require('./routes/submissionRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const historyRoutes = require('./routes/historyRoutes');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Initialize Socket.io
const io = initSocket(server);

app.use(cors());
app.use(express.json());

// Routes
app.use('/auth', authRoutes);
app.use('/exam', examRoutes);
app.use('/classroom', classroomRoutes);
app.use('/monitor', monitoringRoutes);
app.use('/submission', submissionRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/history', historyRoutes);
app.use('/api/review', reviewRoutes);

// Database initialization & Server start
const startServer = async () => {
  try {
    await initDB();
    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`WebSocket ready on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
  }
};

startServer();
