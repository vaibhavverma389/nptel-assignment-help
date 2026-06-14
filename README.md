# 📘 Student MCQ Submission System
**(Week-based | Deadline Controlled | Bulk Submission)**

A web-based system where students can submit MCQ answers **week-wise**, with **automatic deadline handling**.  
This project follows **NPTEL-style weekly assignment logic**.

---

## 🚀 Features

### 👨‍🎓 Student & Guest Features
- **Public Access**: Guest students can browse, search, view, and download shared notes and official study materials **without logging in**.
- **Public Notes Hub**: Lists official admin-uploaded study materials and public student-shared notes together for any selected subject.
- **Subject Hub (Dashboard)**: List of all courses/subjects on the dashboard to access subject notes and materials in one click.
- **Login & Authentication**: Simple login/registration flow (required to submit answers or upload new student notes).
- **Subject-wise MCQ submission**: Week-wise answer submission logic.
- **Bulk MCQ submission**: Dynamic form to enter multiple options (A, B, C, D, True, False) at once.
- **Edit Answers**: Modify submitted answers dynamically before the assignment deadline.
- **Deadline-based locking**: Automated server-side and client-side lock preventing submissions after deadlines.

### 🛡️ Admin Features
- **Upload Materials**: Upload PDF study resources and assignment sheets.
- **Smart Validation**: Dynamically requires `Week` input for **Assignments** but hides/disables it for **Study Materials** (upload notes globally without week restrictions).
- **Material Deletion**: Dedicated actions panel to safely remove uploaded PDFs and files.
- **Student Activity Log**: View uploads and downloads made by students.

---

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB (Mongoose with Partial Indexing)
- **Storage**: ImageKit API integration for secure PDF/image uploads
- **Frontend**: HTML5, Vanilla CSS, EJS Templates
- **Authentication**: Passport.js & Express Session
- **Timezone**: Asia/Kolkata (IST)

---

## 📂 Project Structure

```text
project/
├── models/
│   ├── User.js          # Student/Admin profiles
│   ├── Answer.js        # MCQ submissions
│   ├── Subject.js       # Subject/Course lists
│   ├── Note.js          # Shared student notes
│   ├── WeekMaterial.js  # Uploaded admin study materials & assignments
│   └── ActivityLog.js   # Student upload/download logs
├── routes/
│   ├── authRoutes.js    # Login/Register routes
│   ├── studentRoutes.js # Notes search, view, and MCQ submission routes
│   └── adminRoutes.js   # Materials upload/delete, subjects management
├── middlewares/
│   ├── auth.js          # Authentication guard
│   ├── isAdmin.js       # Admin guard
│   └── visitorLogger.js # Geo/IP visitor logging
├── views/
│   ├── student/         # Student dashboard, notes and submission pages
│   ├── admin/           # Admin dashboard and materials panels
│   └── partials/        # Global header/footer templates
├── utils/
│   ├── db.js            # Mongo connection & automatic index manager
│   └── imagekit.js      # ImageKit integration setup
├── app.js               # Entry point
└── README.md
```

---

## ⚙️ Installation & Setup

### 1. Clone the repository & Install dependencies
```bash
npm install
```

### 2. Configure Environment Variables (`.env`)
Create a `.env` file in the root directory:
```env
PORT=3000
MONGO_URI=mongodb_connection_string
SESSION_SECRET=your_secret_key
IMAGEKIT_PUBLIC_KEY=your_imagekit_public_key
IMAGEKIT_PRIVATE_KEY=your_imagekit_private_key
IMAGEKIT_URL_ENDPOINT=your_imagekit_url_endpoint
```

### 3. Start the Server
```bash
npm start
```
Open in browser: `http://localhost:3000`

---

## 🧪 Validation & Routing Rules
- **Guest Access**: Guest students can access `/notes`, `/notes/view/:id`, `/notes/download/:id`, and `/search` without being authenticated.
- **Uniqueness checks**: Enforces one assignment PDF per week per subject, but allows **multiple** study materials without a week due to Mongoose partial indexing.
- **MCQ Submission**: Validation blocks MCQ editing or submitting after assignment deadlines.

---

## 📄 License
This project is created for educational purposes only.
