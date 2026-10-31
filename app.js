process.env.TZ = "Asia/Kolkata";
require("dotenv").config();

const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo").default;
const passport = require("passport");
const flash = require("connect-flash");
const path = require("path");
const helmet = require("helmet");
const compression = require("compression");

const http = require("http");
const { Server } = require("socket.io");

const connectDB = require("./utils/db");

/* ================= SECURITY VALIDATION ================= */
const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  if (process.env.NODE_ENV === "production") {
    console.error("FATAL ERROR: SESSION_SECRET is not set in production environment!");
    process.exit(1);
  } else {
    console.warn("⚠️ WARNING: SESSION_SECRET is not configured in .env. Please configure a strong secret.");
  }
}

/* ================= ROUTES ================= */
const authRoutes = require("./routes/authRoutes");
const studentRoutes = require("./routes/studentRoutes");
const adminRoutes = require("./routes/adminRoutes");
const contactRoutes = require("./routes/contactRoutes");
const pingRoutes = require("./routes/ping");

/* ================= MIDDLEWARES ================= */
const lastActive = require("./middlewares/lastActive");
const visitorLogger = require("./middlewares/visitorLogger");
const isAuth = require("./middlewares/auth");
const csrfMiddleware = require("./middlewares/csrf");
const mongoSanitize = require("./middlewares/mongoSanitize");

require("./utils/passport");

const app = express();

app.disable("x-powered-by");

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    hsts: process.env.NODE_ENV === "production" ? {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    } : false,
    noSniff: true,
    xssFilter: true
  })
);

app.use(compression());

app.set("trust proxy", 1);

// Production HTTPS Enforcement
if (process.env.NODE_ENV === "production") {
  app.use((req, res, next) => {
    if (req.headers["x-forwarded-proto"] && req.headers["x-forwarded-proto"] !== "https") {
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    next();
  });
}

connectDB();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(mongoSanitize);

app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    name: "nptel.sid",
    secret: sessionSecret || "nptel_development_secret_key_2026",

    resave: false,
    saveUninitialized: false,

    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      collectionName: "sessions",
      ttl: 60 * 60 * 24 * 7
    }),

    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 30
    }
  })
);

app.use(flash());

app.use(passport.initialize());
app.use(passport.session());

// Anti-CSRF Token Middleware (Session-bound)
app.use(csrfMiddleware);

app.use((req, res, next) => {
  res.locals.user = req.user || null;
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  next();
});

app.use(lastActive);
app.use(visitorLogger);

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use("/auth", authRoutes);
app.use(studentRoutes);
app.use(adminRoutes);
app.use(contactRoutes);
app.use(pingRoutes);

app.get("/", (req, res) => {
  res.redirect("/dashboard");
});

app.get("/login", (req, res) => {
  res.redirect("/dashboard");
});

// 404 Handler
app.use((req, res) => {
  res.status(404).render("404");
});

// Global Centralized Error Handling Middleware
app.use((err, req, res, next) => {
  console.error("Global Application Error:", err.stack || err.message || err);
  if (res.headersSent) {
    return next(err);
  }
  const isProd = process.env.NODE_ENV === "production";
  if (req.xhr || (req.headers.accept && req.headers.accept.includes("json"))) {
    return res.status(err.status || 500).json({
      error: isProd ? "An unexpected error occurred. Please try again later." : (err.message || "Internal Server Error")
    });
  }
  res.status(err.status || 500).render("404");
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.APP_URL || "*",
    methods: ["GET", "POST"]
  }
});

app.set("io", io);

let onlineUsers = 0;

io.on("connection", (socket) => {
  onlineUsers++;
  io.emit("liveUsers", onlineUsers);

  socket.on("disconnect", () => {
    if (onlineUsers > 0) onlineUsers--;
    io.emit("liveUsers", onlineUsers);
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
