# 📘 Student MCQ Submission System
**(Week-based | Deadline Controlled | Bulk Submission)**

A web-based system where students can submit MCQ answers **week-wise**, with **automatic deadline handling**.  
This project follows **NPTEL-style weekly assignment logic**.

---

## 🚀 Features

### 👨‍🎓 Student Features
- Login & Authentication
- Subject-wise MCQ submission
- Week-wise submission system
- Single question submission
- Bulk MCQ submission
- Edit answers before deadline
- Automatic week progression
- Deadline-based submission lock
- Dashboard with:
  - Submitted answers
  - Study material
  - Submission deadline

### 🛡️ Security & Validation
- Session-based authentication
- Server-side deadline validation
- User-specific answer access
- Protected routes using middleware

---



These functions are used in:
- Dashboard
- Submit routes
- Bulk submit routes
- Deadline locking (GET & POST)

---

## 🛠️ Tech Stack

- Backend: Node.js, Express.js
- Database: MongoDB (Mongoose)
- Frontend: EJS, HTML, CSS
- Authentication: Passport.js
- Session: express-session
- Timezone: Asia/Kolkata

---

## 📂 Project Structure

project/
│
├── routes/
│ ├── authRoutes.js
│ ├── studentRoutes.js
│ └── adminRoutes.js
│
├── utils/
│ ├── db.js
│ └── passport.js
│
├── models/
│ ├── User.js
│ ├── Answer.js
│ └── Subject.js
│ 
│
├── middlewares/
│ ├── auth.js
│ └── visitorLogger.js
│
├── views/
│ ├── student/
│ ├── admin/
│ └── partials/
│
├── public/
│
├── app.js
└── README.md


---

## ⚙️ Installation & Setup

### 1. Clone the repository
```bash
git clone <repository-url>
cd project
2. Install dependencies
npm install
3. Create .env file
PORT=3000
MONGO_URI=your_mongodb_connection
SESSION_SECRET=your_session_secret
NODE_ENV=development
4. Start the server
npm start
Open in browser:

http://localhost:3000
🔐 Authentication Flow
User logs in

Session is created

Protected routes checked using middleware

req.user available in all views

🧪 Validation Rules
Future weeks cannot be selected

Submission blocked after deadline

Deadline validated again on POST request

One user can edit answers before deadline

🎓 Academic Usage
Suitable for:

College mini project

Final year project

Internship demonstration

Inspired by NPTEL / Coursera platforms

🧩 Future Enhancements
Admin deadline override

Auto evaluation of MCQs

Result analytics

Excel / CSV export

Notification system

👨‍💻 Developer Notes
Business logic separated into utility files

Clean MVC-inspired structure

Production-ready Express setup

📄 License
This project is created for educational purposes only.
