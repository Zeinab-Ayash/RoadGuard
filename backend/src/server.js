const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });


const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const companyRoutes = require('./routes/companyRoutes');
const driverRoutes = require('./routes/driverRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const profileRoutes = require('./routes/profileRoutes');
const misbehaviorRoutes = require('./routes/misbehaviorRoutes');
const drivingSessionRoutes = require('./routes/drivingSessionRoutes');

const app = express();

/* ================= MIDDLEWARE ================= */
app.use(cors());
app.use(express.json());

/* ================= ROUTES ================= */
app.use('/auth', authRoutes);
app.use('/company', companyRoutes);
app.use('/driver', driverRoutes);
app.use('/notifications', notificationRoutes);
app.use('/profile', profileRoutes);
app.use('/misbehavior', misbehaviorRoutes);
app.use('/driving-sessions', drivingSessionRoutes);

/* ================= HEALTH CHECK ================= */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'roadguard-backend'
  });
});

/* ================= START SERVER ================= */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`RoadGuard backend running on http://localhost:${PORT}`);
});

