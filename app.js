require("dotenv").config();
const express = require("express");

const session = require("express-session");
const passport = require("passport");
const path = require("path");

const connectDB = require("./utils/db");

// Routes
const authRoutes = require("./routes/authRoutes");
const studentRoutes = require("./routes/studentRoutes");
const adminRoutes = require("./routes/adminRoutes");

// Passport config (VERY IMPORTANT)
require("./utils/passport");

const app = express();

app.set("trust proxy", 1);

/* ================= DATABASE ================= */
connectDB();

/* ================= MIDDLEWARE ================= */

// Body parser
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Static files
app.use(express.static(path.join(__dirname, "public")));

/* ================= SESSION ================= */
app.use(
  session({
    name: "nptel.sid",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // HTTPS only in prod
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    },
  })
);

/* ================= PASSPORT ================= */
app.use(passport.initialize());
app.use(passport.session());

/* ================= GLOBAL USER (for EJS) ================= */
app.use((req, res, next) => {
  res.locals.user = req.user || null;
  next();
});

/* ================= VIEW ENGINE ================= */
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

/* ================= ROUTES ================= */
app.use("/auth", authRoutes);
app.use(studentRoutes);
app.use(adminRoutes);

/* ================= DEFAULT ================= */
app.get("/", (req, res) => {
  res.redirect("/auth/login");
});
// 🔴 HANDLE ALL INVALID ROUTES
// app.use((req, res) => {
//   // logout user if logged in
//   req.logout(() => {
//     if (req.session) {
//       req.session.destroy(() => {
//         res.redirect("/auth/login");
//       });
//     } else {
//       res.redirect("/auth/login");
//     }
//   });
// });

/* ================= SERVER ================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
