const express = require("express");
const multer = require("multer");
const router = express.Router();

const imagekit = require("../utils/imagekit");

// Import models individually
const User = require("../models/User");
const Answer = require("../models/Answer");
const Subject = require("../models/Subject");
const WeekMaterial = require("../models/WeekMaterial");
const VisitorLog = require("../models/VisitorLog");
const ContactMessage = require("../models/ContactMessage");

const isAdmin = require("../middlewares/isAdmin");
const asyncHandler = require("../utils/asyncHandler");
const exportExcel = require("../utils/exportExcel");

// Multer configuration
const upload = multer({ storage: multer.memoryStorage() });

// ================= CONSTANTS & HELPERS =================

const DATE_RANGES = {
  LAST_24_HOURS: () => new Date(Date.now() - 24 * 60 * 60 * 1000),
  LAST_7_DAYS: () => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date;
  },
  TODAY: () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  }
};

const EXCEL_COLUMNS = {
  VISITORS: [
    { header: "S.N.", key: "sn", width: 8 },
    { header: "IP", key: "ip", width: 18 },
    { header: "Email", key: "email", width: 28 },
    { header: "Role", key: "role", width: 12 },
    { header: "Path", key: "path", width: 30 },
    { header: "Method", key: "method", width: 10 },
    { header: "Visited At", key: "visitedAt", width: 20 }
  ]
};

// Helper: Format visitor log for export
const formatVisitorLog = (logs) => {
  return logs.map((v, i) => ({
    sn: i + 1,
    ip: v.ip || "N/A",
    email: v.email || "Guest",
    role: v.role || "guest",
    path: v.path || "N/A",
    method: v.method || "GET",
    visitedAt: v.visitedAt
      ? new Date(v.visitedAt).toLocaleString("en-IN")
      : ""
  }));
};

// Helper: Get dashboard statistics
const getDashboardStats = async () => {
  const last24Hours = DATE_RANGES.LAST_24_HOURS();
  const oneWeekAgo = DATE_RANGES.LAST_7_DAYS();

  return Promise.all([
    User.countDocuments(),
    Answer.countDocuments(),
    VisitorLog.countDocuments({ role: { $ne: "admin" } }),
    VisitorLog.countDocuments({ visitedAt: { $gte: last24Hours } }),
    User.countDocuments({ date: { $gte: last24Hours } }),
    VisitorLog.aggregate([
      { $match: { visitedAt: { $gte: oneWeekAgo } } },
      { $group: { _id: "$path", total: { $sum: 1 } } },
      { $sort: { total: -1 } },
      { $limit: 5 }
    ])
  ]);
};

// ================= DASHBOARD =================

router.get(
  "/admin",
  isAdmin,
  asyncHandler(async (req, res) => {
    const [
      usersCount,
      answersCount,
      loggedInUsers,
      logsLast24h,
      newUsersLast24h,
      topRoutes
    ] = await getDashboardStats();

    res.render("admin/dashboard", {
      usersCount,
      answersCount,
      loggedInUsers,
      guests: 0,
      logsLast24h,
      newUsersLast24h,
      topRoutes
    });
  })
);

// ================= VISITORS =================

router.get(
  "/admin/visitors",
  isAdmin,
  asyncHandler(async (req, res) => {
    const today = DATE_RANGES.TODAY();

    const [logs, loggedInUsers, todayVisits] = await Promise.all([
      VisitorLog.find()
        .sort({ visitedAt: -1 })
        .limit(500)
        .lean(),
      VisitorLog.countDocuments({ role: { $ne: "admin" } }),
      VisitorLog.countDocuments({ visitedAt: { $gte: today } })
    ]);

    res.render("admin/visitors", {
      logs,
      loggedInUsers,
      guests: 0,
      todayVisits
    });
  })
);

// ================= EXPORT VISITORS =================

router.get("/admin/export/visitors", isAdmin, asyncHandler(async (req, res) => {

  const { from, to } = req.query;

  const query = {};

  if (from && to) {
    query.visitedAt = {
      $gte: new Date(from),
      $lte: new Date(to)
    };
  }

  const logs = await VisitorLog.find(query)
    .select("ip email role country city device browser os path method statusCode responseTime referer language isBot sessionId visitedAt isp eventType")
    .sort({ visitedAt: -1 })
    .limit(10000)
    .lean();

  const rows = logs.map((v, i) => ({

    sn: i + 1,

    ip: v.ip,

    email: v.email || "Guest",

    role: v.role || "guest",

    country: v.country || "",

    city: v.city || "",

    isp: v.isp || "",

    device: v.device || "",

    browser: v.browser || "",

    os: v.os || "",

    path: v.path,

    method: v.method,

    statusCode: v.statusCode,

    responseTime: v.responseTime,

    referer: v.referer || "",

    language: v.language || "",

    isBot: v.isBot ? "Yes" : "No",

    sessionId: v.sessionId || "",

    eventType: v.eventType || "visit",

    visitedAt: v.visitedAt
      ? new Date(v.visitedAt).toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata"
        })
      : ""

  }));

  const columns = [

    { header: "S.N.", key: "sn", width: 8 },
    { header: "IP Address", key: "ip", width: 18 },
    { header: "Email", key: "email", width: 28 },
    { header: "Role", key: "role", width: 12 },
    { header: "Country", key: "country", width: 12 },
    { header: "City", key: "city", width: 18 },
    { header: "ISP", key: "isp", width: 18 },
    { header: "Device", key: "device", width: 12 },
    { header: "Browser", key: "browser", width: 14 },
    { header: "OS", key: "os", width: 14 },
    { header: "Path", key: "path", width: 35 },
    { header: "Method", key: "method", width: 10 },
    { header: "Status Code", key: "statusCode", width: 12 },
    { header: "Response Time (ms)", key: "responseTime", width: 18 },
    { header: "Referer", key: "referer", width: 30 },
    { header: "Language", key: "language", width: 14 },
    { header: "Bot", key: "isBot", width: 10 },
    { header: "Session ID", key: "sessionId", width: 25 },
    { header: "Event Type", key: "eventType", width: 18 },
    { header: "Visited At (IST)", key: "visitedAt", width: 22 }

  ];

  await exportExcel(res, "Visitors", columns, rows, "visitors.xlsx");

}));

// ================= MATERIALS =================

router.get(
  "/admin/materials",
  isAdmin,
  asyncHandler(async (req, res) => {
    const [subjects, materials] = await Promise.all([
      Subject.find().sort({ name: 1 }).lean(),
      WeekMaterial.find()
        .sort({ subject: 1, week: 1 })
        .lean()
    ]);

    res.render("admin/materials", { subjects, materials });
  })
);

router.post(
  "/admin/materials",
  isAdmin,
  upload.single("pdf"),
  asyncHandler(async (req, res) => {
    const { subject, week, type } = req.body;

    if (!req.file) {
      return res.status(400).redirect("/admin/materials");
    }

    // Validate required fields
    if (!subject || !week || !type) {
      return res.status(400).send("Subject, week, and type are required");
    }

    try {
      // Upload to ImageKit
      const result = await imagekit.upload({
        file: req.file.buffer,
        fileName: `${subject}-week${week}-${type}.pdf`,
        folder: "study-material"
      });

      // Save in database
      await WeekMaterial.findOneAndUpdate(
        { subject, week: Number(week), type },
        {
          subject,
          week: Number(week),
          type,
          fileUrl: result.url,
          fileName: req.file.originalname
        },
        { upsert: true, new: true }
      );

      res.redirect("/admin/materials?success=Material uploaded successfully");
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).send("Error uploading material");
    }
  })
);

// ================= SUBJECTS =================

router.get(
  "/admin/subjects",
  isAdmin,
  asyncHandler(async (req, res) => {
    const subjects = await Subject.find().sort({ name: 1 }).lean();
    res.render("admin/subjects", { subjects });
  })
);

router.post(
  "/admin/subjects",
  isAdmin,
  asyncHandler(async (req, res) => {
    const { name } = req.body;

    if (!name || name.trim() === "") {
      return res.status(400).redirect("/admin/subjects");
    }

    await Subject.create({ name: name.trim() });

    res.redirect("/admin/subjects?success=Subject added");
  })
);

router.post(
  "/admin/subjects/delete/:id",
  isAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Validate ObjectId
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).send("Invalid subject ID");
    }

    await Subject.findByIdAndDelete(id);

    res.redirect("/admin/subjects?success=Subject deleted");
  })
);

// ================= ANSWERS =================

router.get(
  "/admin/answers",
  isAdmin,
  asyncHandler(async (req, res) => {
    const answers = await Answer.find()
      .sort({ course: 1, week: 1, question: 1 })
      .lean();

    res.render("admin/answers", { answers });
  })
);

router.post(
  "/admin/answers/delete/:id",
  isAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).send("Invalid answer ID");
    }

    await Answer.findByIdAndDelete(id);

    res.redirect("/admin/answers?success=Answer deleted");
  })
);

// ================= USERS =================

router.get(
  "/admin/users",
  isAdmin,
  asyncHandler(async (req, res) => {
    const users = await User.find().lean();
    res.render("admin/users", { users });
  })
);

// ================= CONTACT MESSAGES =================

router.get(
  "/admin/contact-messages",
  isAdmin,
  asyncHandler(async (req, res) => {
    const messages = await ContactMessage.find()
      .sort({ createdAt: -1 })
      .lean();

    res.render("admin/contactMessages", { messages });
  })
);

module.exports = router;