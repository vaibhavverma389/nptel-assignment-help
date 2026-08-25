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

require("./utils/passport");

const app = express();


app.use(
  helmet({
    contentSecurityPolicy: false
  })
);

app.use(compression());


app.set("trust proxy", 1);

connectDB();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    name: "nptel.sid",
    secret: process.env.SESSION_SECRET || "nptel_default_secret_key_2026",

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
app.get("/auth/register", (req, res) => {
  res.redirect("login");
});
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
  if (req.xhr || (req.headers.accept && req.headers.accept.includes("json"))) {
    return res.status(500).json({ error: err.message || "Internal Server Error" });
  }
  res.status(err.status || 500).render("404");
});



const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

app.set("io", io);

let onlineUsers = 0;

io.on("connection", (socket) => {

  console.log("User connected:", socket.id);

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