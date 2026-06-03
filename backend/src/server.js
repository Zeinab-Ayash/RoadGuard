const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

// Import all your routing blocks
const authRoutes = require('./routes/authRoutes');
const companyRoutes = require('./routes/companyRoutes');
const driverRoutes = require('./routes/driverRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const profileRoutes = require('./routes/profileRoutes');
const misbehaviorRoutes = require('./routes/misbehaviorRoutes');
const drivingSessionRoutes = require('./routes/drivingSessionRoutes');
const sessionsRoutes = require('./routes/sessionsRoutes');

// 1. Initialize the Express Application instance FIRST
const app = express();

/* ================= MIDDLEWARE ================= */
app.use(cors());
app.use(express.json());

// 2. Initialize HTTP Server and Socket.io using the established 'app'
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

// 3. Attach io to the request context middleware BEFORE routes handle requests
app.use((req, res, next) => {
  req.io = io;
  next();
});

/* ================= ROUTES ================= */
app.use('/auth', authRoutes);
app.use('/company', companyRoutes);
app.use('/driver', driverRoutes);
app.use('/notifications', notificationRoutes);
app.use('/profile', profileRoutes);
app.use('/misbehavior', misbehaviorRoutes);
app.use('/driving-sessions', drivingSessionRoutes); // Toggles handleStartDriving/handleFinishDriving
app.use('/sessions', sessionsRoutes);               // Your Python engine targets /sessions/active here

/* ================= HEALTH CHECK ================= */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'roadguard-backend'
  });
});

/* ================= WEBSOCKET CHANNELS ================= */
io.on('connection', (socket) => {
  console.log(`[REALTIME] Laptop AI Subsystem connected to socket layer: ${socket.id}`);
  
  socket.on('disconnect', () => {
    console.log('[REALTIME] Laptop AI Subsystem disconnected');
  });
});

/* ================= START REALTIME SERVER ================= */
// Using process.env.PORT with a fallback to 3000
const PORT = process.env.PORT || 3000;

// CRITICAL: We listen using 'server.listen', NOT 'app.listen'. 
// This keeps BOTH HTTP routes and WebSockets active on the same port!
server.listen(PORT, '0.0.0.0', () => {
  console.log(`==============================================`);
  console.log(`🚀 RoadGuard Node Backend Running on Port ${PORT}`);
  console.log(`==============================================`);
});