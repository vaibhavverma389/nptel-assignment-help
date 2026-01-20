📘 Student MCQ Submission System

(Week-based | Deadline Controlled | Bulk Submission)

A web-based system where students can submit MCQ answers week-wise, with automatic deadline handling.
Designed similar to NPTEL-style weekly assignments.

🚀 Features
👨‍🎓 Student Features

Login / Authentication (Passport.js)

Select Subject + Week

Submit answers:

Single Question

Bulk MCQ Submission

Edit answers before deadline

Automatic Week progression

Deadline-based submission lock

Dashboard with:

Submitted answers

Study material (PDF / link)

Last submission date

🛡️ Security & Logic

Week logic centralized in utils

Server-side deadline validation

User-specific answers

Session-based authentication

Visitor logging

🗓️ Week & Deadline Rules
Week	Last Date
Week 1	4 Feb 2026
Week 2	4 Feb 2026
Week 3	11 Feb 2026
Week 4	18 Feb 2026
...	+7 days each

📌 Important Rule

4 Feb (including) → Week 1

5 Feb onwards → Week 2

After that → every 7 days new week

🧠 Week Logic (Core Concept)

All week & deadline logic is handled in:

utils/weekUtils.js

Functions:

getWeekInfo(selectedWeek)

getWeekLastDate(week)

Used in:

Dashboard

Submit

Submit Bulk

Deadline lock (GET + POST)

🛠️ Tech Stack

Backend: Node.js, Express.js

Database: MongoDB (Mongoose)

Frontend: EJS, HTML, CSS

Auth: Passport.js

Session: express-session

Timezone: Asia/Kolkata

Logging: Custom visitor logger

📂 Project Structure
project/
│
├── routes/
│   ├── authRoutes.js
│   ├── studentRoutes.js
│   └── adminRoutes.js
│
├── utils/
│   ├── db.js
│   ├── passport.js
│   └── weekUtils.js
│
├── models/
│   ├── User.js
│   ├── Answer.js
│   ├── Subject.js
│   └── WeekMaterial.js
│
├── middlewares/
│   ├── auth.js
│   └── visitorLogger.js
│
├── views/
│   ├── student/
│   ├── admin/
│   └── partials/
│
├── public/
│
├── app.js
└── README.md

⚙️ Installation & Setup
1️⃣ Clone Repository
git clone <repo-url>
cd project

2️⃣ Install Dependencies
npm install

3️⃣ Create .env File
PORT=3000
MONGO_URI=your_mongodb_url
SESSION_SECRET=your_secret_key
NODE_ENV=development

4️⃣ Start Server
npm start


Open browser:

http://localhost:3000

🔐 Authentication Flow

Login → Session created

Protected routes using isAuth middleware

req.user available in all views

🧪 Validation & Protection

Frontend week select limited

Backend hard validation

Deadline checked again in POST routes

Future week selection blocked

🎓 Academic Use

Suitable for:

College mini project

Final year project

Internship demo

Inspired by:

NPTEL

Coursera

SWAYAM portals

🧩 Future Enhancements

Admin override deadlines

Week locking after evaluation

Excel / CSV export

Auto grading

Notifications

Result analytics

👨‍💻 Developer Notes

Business logic separated from routes
Clean MVC-inspired structure
Production-ready Express setup

📄 License

This project is for educational purposes.
