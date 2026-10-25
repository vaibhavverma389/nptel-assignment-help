# 📘 NPTEL Assignment Helper & Student Study Portal

> **Full-Stack Academic Resource Management & Weekly MCQ Submission System**  
> Built with Node.js, Express, MongoDB, Socket.io, Passport.js, and ImageKit Cloud Storage.

---

## 🌟 Overview

**NPTEL Assignment Helper** is a full-featured, scalable academic portal designed to streamline NPTEL-style weekly coursework, assignments, and study resource sharing. The platform combines week-based assignment workflows, bulk MCQ submissions, an end-to-end peer-to-peer study notes moderation pipeline, real-time live presence tracking, comprehensive telemetry, and an admin analytics dashboard with automated Excel exports.

---

## 🚀 Key Features

### 👨‍🎓 Student & Guest Experience
- **Public & Guest Access**: Browse approved community notes, subject materials, and search resources without requiring immediate login.
- **Weekly MCQ Submission Engine**:
  - Week-wise assignment submission logic (Weeks 1–12) tailored to standard NPTEL cycles.
  - **Bulk MCQ Submission Form**: Fast input grid for multiple questions and answers (`A`, `B`, `C`, `D`, `True`, `False`) with automatic atomic batch upserts (`deleteMany` + `insertMany`).
  - Deadline validation and answer updates prior to week cutoffs.
- **Peer-to-Peer Study Notes Hub**:
  - Upload notes in text or file formats (PDF, JPEG, PNG) up to 10MB.
  - Integration with **ImageKit CDN** for instant, optimized document delivery.
  - Bookmark favorite notes, track recent study activity, and view personal study insights.
  - Built-in PDF reader viewer directly within the browser.
- **Engagement & Study Streaks**: Daily active streak tracking calculated automatically upon user activity.

### 🛡️ Admin & Moderation Controls
- **Study Materials & Assignment Management**:
  - Upload weekly assignment question sheets and global course materials.
  - Smart database validation: Enforces week numbers for assignments while allowing week-less global study materials via partial indexing.
  - Subject management with automatic cascading updates across all linked materials, notes, and answers upon renaming.
- **Content Moderation Pipeline**:
  - Multi-state note review system (`pending`, `approved`, `rejected`).
  - Strict privacy enforcement: Students only see approved notes and their own submissions; admins review and manage all uploads.
- **Real-Time Presence & Telemetry**:
  - **Socket.io Live Counter**: Real-time broadcast of active online users across all connected clients.
  - **Privacy-First Visitor Analytics**: Captures request paths, response times, HTTP methods, device/OS/browser metadata, screen dimensions, CPU cores, and GeoIP details (country, city, region, ISP, coordinates) using SHA-256 IP hashing.
  - In-memory GeoIP caching with TTL to optimize external API quota consumption.
- **Audit Trails & Excel Reports**:
  - Detailed `ActivityLog` capturing all uploads, downloads, approvals, rejections, and deletions with IST timestamps.
  - One-click multi-column **Excel Report Generation** (`.xlsx`) via **ExcelJS** for both visitor telemetry and student activity logs.

---

## 🛠️ Tech Stack & Architecture

| Layer | Technologies |
|---|---|
| **Runtime & Backend** | Node.js, Express.js (Modular MVC routing, Async handlers) |
| **Real-Time Layer** | Socket.io (WebSocket event-driven live user counter) |
| **Database & ORM** | MongoDB, Mongoose (Compound & Partial filtering indexes) |
| **Authentication & AuthZ** | Passport.js (Local Strategy with bcryptjs password hashing, Google OAuth 2.0), JWT, Role-Based Access Control (`student`, `admin`) |
| **Session Management** | `express-session`, `connect-mongo` (Persistent MongoDB session store) |
| **File Storage & CDN** | Multer (Memory storage & strict MIME filtering) + ImageKit Cloud API |
| **Frontend & Templating** | EJS (Embedded JavaScript), Vanilla CSS3, Responsive Design |
| **Security & Optimization** | Helmet (HTTP headers), Gzip Compression, ReDoS regex escaping, Parameterized MongoDB queries |
| **Reporting & Analytics** | ExcelJS, GeoIP Lite / IPinfo API, User-Agent Parser |

---

## 📂 Project Architecture

```text
nptel-assignment-help/
├── app.js                   # Application bootstrap, Express config, Socket.io, session & error handling
├── models/
│   ├── User.js              # User profiles, roles, credentials & daily learning streak
│   ├── Answer.js            # MCQ submission documents with indexed course/week pairs
│   ├── Subject.js           # Academic courses/subjects
│   ├── Note.js              # Student-contributed notes with moderation statuses & metrics
│   ├── WeekMaterial.js      # Admin assignments & study resources with partial uniqueness index
│   ├── VisitorLog.js        # Comprehensive telemetry & privacy-safe client metadata
│   ├── ActivityLog.js       # Student actions audit trail (upload, download, approve, reject)
│   └── ContactMessage.js    # Contact form inquiries
├── routes/
│   ├── authRoutes.js        # Registration, login, Google OAuth 2.0 callback, logout
│   ├── studentRoutes.js     # Student dashboard, notes, PDF viewer, bulk MCQ submissions
│   ├── adminRoutes.js       # Admin portal, content moderation, subjects, Excel exports
│   ├── contactRoutes.js     # Contact inquiries handling
│   └── ping.js              # Client hardware & screen telemetry collector
├── middlewares/
│   ├── auth.js              # Authentication guard
│   ├── isAdmin.js           # Admin role-based authorization guard
│   ├── lastActive.js        # Activity heartbeat & daily streak incrementer
│   └── visitorLogger.js     # Automated IP geolocation & request telemetry logging
├── utils/
│   ├── db.js                # MongoDB connection lifecycle & automated index migration
│   ├── passport.js          # Passport Google OAuth & Local authentication configuration
│   ├── imagekit.js          # Cloud storage CDN client setup
│   ├── exportExcel.js       # Excel workbook generation utility
│   ├── asyncHandler.js      # Asynchronous route exception wrapper
│   └── weekUtils.js         # Week range validation helper
├── views/
│   ├── admin/               # Admin dashboards, materials, notes moderation, logs, visitors
│   ├── student/             # Student dashboard, bulk submit, notes, favorites, search, viewer
│   ├── auth/                # Login and registration templates
│   ├── partials/            # Shared headers, navigation bars, and footers
│   ├── home.ejs             # Landing page
│   ├── study.ejs            # Subject resources overview
│   └── 404.ejs              # Error fallback view
├── public/                  # Static assets (CSS styles, client JavaScript, images)
├── package.json             # Project dependencies and metadata
└── README.md
```

---

## ⚙️ Installation & Local Setup

### 1. Prerequisites
- **Node.js** (v18.x or later)
- **MongoDB** instance (local or MongoDB Atlas)
- **ImageKit** account for cloud media storage
- *(Optional)* Google Cloud Console OAuth credentials for Google Login

### 2. Clone and Install
```bash
git clone https://github.com/vaibhavverma389/nptel-assignment-helper.git
cd nptel-assignment-helper
npm install
```

### 3. Configure Environment Variables
Create a `.env` file in the project root:
```env
# Server
PORT=3000
NODE_ENV=development

# Database
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/nptel_db?retryWrites=true&w=majority

# Sessions & Security
SESSION_SECRET=your_super_secret_session_key_2026
JWT_SECRET=your_jwt_signing_secret_key

# ImageKit Storage
IMAGEKIT_PUBLIC_KEY=your_imagekit_public_key
IMAGEKIT_PRIVATE_KEY=your_imagekit_private_key
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your_id

# Optional: Google OAuth 2.0
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

# Optional: IPinfo Token for Geo Location
IPINFO_TOKEN=your_ipinfo_api_token
```

### 4. Run Application
```bash
# Production start
npm start

# Development with nodemon
npx nodemon app.js
```
Open your browser and navigate to:  
`http://localhost:3000`

---

## 🔒 Security & Data Integrity Highlights

1. **ReDoS Defense**: Dynamic user search patterns are sanitized via regex character escaping helpers before constructing MongoDB queries.
2. **Partial Indexing**: Avoids null uniqueness collisions on week-less study materials while enforcing strict uniqueness on weekly assignments (`subject + week + type`).
3. **Atomic Multi-Row Replacements**: Bulk MCQ updates utilize atomic batch operations to guarantee zero partial-write anomalies.
4. **MIME & Buffer Validation**: File uploads enforce in-memory buffering, 10MB limits, and strict MIME whitelisting for PDF and image formats.
5. **PII Anonymization**: IP addresses are hashed using SHA-256 for analytics storage, safeguarding student privacy.
6. **Graceful Error Handling**: Global Express error handler catches unhandled rejections, handles JSON vs HTML requests cleanly, and renders custom 404 error views.

---

## 📄 License
This project is open-source and available under the [ISC License](LICENSE).
