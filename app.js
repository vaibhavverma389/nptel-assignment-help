process.env.TZ = "Asia/Kolkata";
require("dotenv").config();

const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo").default;
const passport = require("passport");
const path = require("path");

/* ================= DB ================= */
const connectDB = require("./utils/db");

/* ================= ROUTES ================= */
const authRoutes = require("./routes/authRoutes");
const studentRoutes = require("./routes/studentRoutes");
const adminRoutes = require("./routes/adminRoutes");

/* ================= MIDDLEWARES ================= */
const lastActive = require("./middlewares/lastActive");
const visitorLogger = require("./middlewares/visitorLogger");

/* ================= PASSPORT CONFIG ================= */
require("./utils/passport");

const app = express();

/* ================= TRUST PROXY ================= */
app.set("trust proxy", 1);

/* ================= DATABASE CONNECT ================= */
connectDB();

/* ================= BODY PARSER ================= */
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

/* ================= STATIC FILES ================= */
app.use(express.static(path.join(__dirname, "public")));

/* ================= SESSION (🔥 MOST IMPORTANT) ================= */
app.use(
  session({
    name: "nptel.sid",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,

    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      collectionName: "sessions",
      ttl: 60 * 60 * 24 * 7 // 7 days
    }),

    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
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

/* ================= USER ACTIVITY & VISITOR LOG ================= */
app.use(lastActive);
app.use(visitorLogger);

/* ================= VIEW ENGINE ================= */
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

/* ================= ROUTES ================= */
app.use("/auth", authRoutes);
app.use(studentRoutes);
app.use(adminRoutes);

/* ================= DEFAULT ROUTES ================= */
app.get("/", (req, res) => {
  res.redirect("/dashboard");
});

app.get("/login", (req, res) => {
  res.redirect("/dashboard");
});

/* ================= SERVER ================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
