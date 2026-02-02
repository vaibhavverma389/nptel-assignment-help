process.env.TZ = "Asia/Kolkata";
require("dotenv").config();

const express = require("express");
const session = require("express-session");
const passport = require("passport");
const path = require("path");

const connectDB = require("./utils/db");

const authRoutes = require("./routes/authRoutes");
const studentRoutes = require("./routes/studentRoutes");
const adminRoutes = require("./routes/adminRoutes");

const lastActive = require("./middlewares/lastActive");
const visitorLogger = require("./middlewares/visitorLogger");

// Passport config
require("./utils/passport");

const app = express(); // ✅ app FIRST

app.set("trust proxy", 1);

/* ================= DATABASE ================= */
connectDB();

/* ================= BODY PARSER ================= */
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

/* ================= STATIC FILES ================= */
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
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24 * 7
    }
  })
);

/* ================= PASSPORT ================= */
app.use(passport.initialize());
app.use(passport.session());

/* ================= GLOBAL USER (EJS) ================= */
app.use((req, res, next) => {
  res.locals.user = req.user || null;
  next();
});

/* ================= USER ACTIVITY + VISITOR LOG ================= */
app.use(lastActive);       // ✅ req.user available
app.use(visitorLogger);    // ✅ clean logging

/* ================= VIEW ENGINE ================= */
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

/* ================= ROUTES ================= */
app.use("/auth", authRoutes);
app.use(studentRoutes);
app.use(adminRoutes);

/* ================= DEFAULT ================= */
app.get("/", (req, res) => {
  res.redirect("/dashboard");
});

/* ================= SERVER ================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
