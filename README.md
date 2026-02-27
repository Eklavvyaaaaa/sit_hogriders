# AI-Based Secure Exam Monitoring System

A complete full-stack exam monitoring solution that uses AI (MediaPipe) to track student behavior during an exam. The student application runs securely in an Electron window (blocking other apps/shortcuts), while teachers have a web dashboard to create exams, generate classroom codes, and view live monitoring logs.

## Tech Stack
- **Electron.js**: Secure exam wrapper for students (Fullscreen, disables DevTools, shortcuts).
- **React.js (Vite)**: Frontend UI using Tailwind CSS for a premium dark layout.
- **Node.js & Express**: Backend API.
- **SQLite**: Database configuration.
- **MediaPipe**: Built-in webcam face monitoring (No face, Multiple faces, Looking away).

## Project Structure
- \`/server\`: Node.js API Backend
- \`/electron-app\`: Electron Wrapper + React App (\`/electron-app/client\`)

## Installation Instructions

### 1. Backend Setup
\`\`\`bash
cd server
npm install
npm start
\`\`\`
*(Server runs on port 5000 and initializes the SQLite \`exam_system.db\` automatically)*

### 2. Frontend & Electron Setup
\`\`\`bash
cd electron-app/client
npm install
cd ..
npm install
\`\`\`

## Run Scripts

### Run the completely integrated App (React Dev + Electron Wrapper)
From the \`electron-app\` directory, run:
\`\`\`bash
npm start
\`\`\`
This concurrently starts the Vite dev server on port 5173, waits for it, and then launches the secure Electron wrapper.

### Test regular Web Dashboard (Teacher View)
If you want to view the Teacher dashboard (or just run React on the web), you can simply go to:
\`\`\`bash
cd electron-app/client
npm run dev
\`\`\`
*(Runs Vite on port 5173)*

## Security / Features Implemented
- **Teachers**: Can create exams and view live cheating logs.
- **Students**: Enter exam code in the Electron App, ensuring a locked desktop experience.
- **AI Monitoring**: Tracks whether a face is present, missing, or multiple faces are detected, throttling logs automatically.
