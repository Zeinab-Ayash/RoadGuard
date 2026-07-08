# RoadGuard

**AI-Powered Driver Behavior Detection System**

RoadGuard is a mobile application that uses artificial intelligence to monitor driver behavior in real time and improve road safety, particularly for fleet operations such as taxis, delivery services, and logistics companies.

---

## Features

- Real-time detection of **5 driver misbehaviors**:
  - Drowsiness
  - Eyes off road
  - Phone usage
  - Eating while driving
  - No seatbelt
- **Two separate interfaces**:
  - **Company** — add drivers, monitor performance, view scores
  - **Driver** — start driving sessions, receive alerts, track score
- **Monthly scoring system** — each driver starts with 100 points, decreases per detected behavior, resets each month
- **Real-time alerts** with sound and notifications
- **Deployed** as a downloadable Android APK

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend  | React Native + Expo |
| Backend   | Node.js + Express |
| Database  | PostgreSQL via Supabase |
| AI Server | Python + FastAPI, MediaPipe, YOLOv8 |
| Deployment| Render (backend), Hugging Face Spaces (AI), EAS Build (APK) |

---

## Architecture

The system uses a distributed four-tier architecture:

- **Mobile App** ↔ **Backend** (REST API for authentication, sessions, history)
- **Mobile App** ↔ **AI Server** (WebSocket for real-time detection events)
- **Camera Source** ↔ **AI Server** (WebSocket for video frames)
- **Backend** ↔ **Database** (Supabase JavaScript client)

---

## How to Use

RoadGuard uses a **hybrid setup**: the driver interacts with the mobile app on their phone, while the camera and AI detection run on a laptop.

### For Drivers (Mobile App)

1. **Download the app**
   Install the RoadGuard APK on any Android phone from:
   👉 [Download RoadGuard APK](https://expo.dev/accounts/road_guard/projects/frontend/builds/9690c196-0022-40d5-a0c8-1532fba2635e)

   *Note: If Android blocks the installation, enable **"Install from unknown sources"** in Settings.*

2. **Login as a Driver**
   Use the Driver Code and password provided by your company.

3. **Press "Start Driving"**
   This starts a new session and connects to the AI server for real-time monitoring.

4. **Open the camera on the laptop**
   Open this link in a browser on the laptop or PC that will act as the camera:
   👉 https://zeinab-ayash-roadguard-ai-server.hf.space/publish

   Position the laptop so the camera has a clear view of the driver.

5. **Drive normally**
   Whenever a misbehavior is detected, the app plays an alarm and shows a notification. Your monthly score decreases based on the severity of the behavior.

6. **Press "Finish Driving"**
   This ends the session and stops the AI monitoring.

### For Companies (Mobile App)

1. Install the RoadGuard APK using the same link above.
2. **Sign up** or **Login as a Company**.
3. **Add Drivers** — the system generates a unique Driver Code and password to share with each driver.
4. **View the dashboard** to monitor driver performance, scores, and history.
5. Deactivate drivers when needed.

---

## Deployed Services

| Service | URL |
|---------|-----|
| Mobile APK | [Download here](https://expo.dev/accounts/road_guard/projects/frontend/builds/9690c196-0022-40d5-a0c8-1532fba2635e) |
| Backend API | https://roadguard-f0x4.onrender.com |
| AI Server (Camera Publisher) | https://zeinab-ayash-roadguard-ai-server.hf.space/publish |

---

## Repository Structure

```
frontend/     Mobile app (React Native + Expo)
backend/      REST API (Node.js + Express)
ai/           AI inference server (Python + FastAPI)
database/     SQL schema and seed data
```

---

## Team

- Zeinab Ayash
- Rania Hachem
- Mira Said

**Course:** IN448 — Lebanese University, Faculty of Sciences I, Department of Computer Sciences

**Supervisor:** Professor Ali Choumane
