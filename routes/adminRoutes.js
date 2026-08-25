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
const Note = require("../models/Note");
const ActivityLog = require("../models/ActivityLog");

const isAdmin = require("../middlewares/isAdmin");
const asyncHandler = require("../utils/asyncHandler");
const exportExcel = require("../utils/exportExcel");

// Multer configuration
const upload = multer({ storage: multer.memoryStorage() });

// ================= CONSTANTS & HELPERS =================

// Helper: Escape special regex characters to prevent ReDoS injection
function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

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
    .select("+ip hashedIP userId email role country city region timezone postal lat lon isp asn path method statusCode responseTime eventType device browser browserVersion os isBot referer language dnt isAjax secFetchSite secFetchMode protocol queryParams sessionId visitedAt screenWidth screenHeight connectionType cpuCores deviceMemory")
    .sort({ visitedAt: -1 })
    .limit(20000)
    .lean();

  const rows = logs.map((v, i) => ({
    sn: i + 1,

    // 👤 USER
    userId: v.userId || "",
    email: v.email || "Guest",
    role: v.role || "guest",

    // 🌐 IP
    ip: v.ip || "",

    // 📍 GEO
    country: v.country || "",
    city: v.city || "",
    region: v.region || "",
    timezone: v.timezone || "",
    postal: v.postal || "",
    lat: v.lat || "",
    lon: v.lon || "",
    isp: v.isp || "",
    asn: v.asn || "",

    // 🌍 REQUEST
    path: v.path || "",
    method: v.method || "",
    statusCode: v.statusCode || "",
    responseTime: v.responseTime || "",
    eventType: v.eventType || "visit",

    // 💻 DEVICE
    device: v.device || "",
    browser: v.browser || "",
    browserVersion: v.browserVersion || "",
    os: v.os || "",
    isBot: v.isBot ? "Yes" : "No",

    // 💻 SYSTEM & NETWORK
    screenWidth: v.screenWidth || "",
    screenHeight: v.screenHeight || "",
    connectionType: v.connectionType || "",
    cpuCores: v.cpuCores || "",
    deviceMemory: v.deviceMemory || "",

    // 🔗 TRACKING
    referer: v.referer || "",
    language: v.language || "",
    dnt: v.dnt ? "Yes" : "No",
    isAjax: v.isAjax ? "Yes" : "No",
    secFetchSite: v.secFetchSite || "",
    secFetchMode: v.secFetchMode || "",
    protocol: v.protocol || "",
    queryParams: v.queryParams?.join(", ") || "",

    // 🔐 SESSION
    sessionId: v.sessionId || "",

    // ⏱️ TIME
    visitedAt: v.visitedAt
      ? new Date(v.visitedAt).toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata"
        })
      : ""
  }));

  const columns = [

    { header: "S.N.", key: "sn", width: 8 },

    // USER
    { header: "User ID", key: "userId", width: 28 },
    { header: "Email", key: "email", width: 28 },
    { header: "Role", key: "role", width: 12 },

    // IP
    { header: "IP Address", key: "ip", width: 18 },

    // GEO
    { header: "Country", key: "country", width: 12 },
    { header: "City", key: "city", width: 18 },
    { header: "Region", key: "region", width: 18 },
    { header: "Timezone", key: "timezone", width: 18 },
    { header: "Postal", key: "postal", width: 12 },
    { header: "Latitude", key: "lat", width: 12 },
    { header: "Longitude", key: "lon", width: 12 },
    { header: "ISP", key: "isp", width: 20 },
    { header: "ASN", key: "asn", width: 12 },

    // REQUEST
    { header: "Path", key: "path", width: 40 },
    { header: "Method", key: "method", width: 10 },
    { header: "Status Code", key: "statusCode", width: 12 },
    { header: "Response Time (ms)", key: "responseTime", width: 18 },
    { header: "Event Type", key: "eventType", width: 18 },

    // DEVICE
    { header: "Device", key: "device", width: 12 },
    { header: "Browser", key: "browser", width: 14 },
    { header: "Browser Version", key: "browserVersion", width: 16 },
    { header: "OS", key: "os", width: 14 },
    { header: "Bot", key: "isBot", width: 10 },

    // SYSTEM & NETWORK INFO
    { header: "Screen Width", key: "screenWidth", width: 14 },
    { header: "Screen Height", key: "screenHeight", width: 14 },
    { header: "Connection Type", key: "connectionType", width: 16 },
    { header: "CPU Cores", key: "cpuCores", width: 12 },
    { header: "Device Memory (GB)", key: "deviceMemory", width: 18 },

    // TRACKING
    { header: "Referer", key: "referer", width: 30 },
    { header: "Language", key: "language", width: 14 },
    { header: "DNT", key: "dnt", width: 10 },
    { header: "AJAX", key: "isAjax", width: 10 },
    { header: "Fetch Site", key: "secFetchSite", width: 16 },
    { header: "Fetch Mode", key: "secFetchMode", width: 16 },
    { header: "Protocol", key: "protocol", width: 10 },
    { header: "Query Params", key: "queryParams", width: 25 },

    // SESSION
    { header: "Session ID", key: "sessionId", width: 25 },

    // TIME
    { header: "Visited At (IST)", key: "visitedAt", width: 22 }

  ];

  await exportExcel(res, "Full Visitor Logs", columns, rows, "visitors_full.xlsx");

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
    if (!subject || !type) {
      return res.status(400).send("Subject and type are required");
    }

    if (type === "assignment" && !week) {
      return res.status(400).send("Week is required for assignments");
    }

    try {
      // Create a unique file name
      const filePrefix = type === "assignment" 
        ? `${subject.replace(/\s+/g, "_")}-week${week}` 
        : `${subject.replace(/\s+/g, "_")}-material-${Date.now()}`;

      // Upload to ImageKit
      const result = await imagekit.upload({
        file: req.file.buffer,
        fileName: `${filePrefix}.pdf`,
        folder: "study-material"
      });

      // Save in database
      if (type === "assignment") {
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
      } else {
        await WeekMaterial.create({
          subject,
          type,
          fileUrl: result.url,
          fileName: req.file.originalname
        });
      }

      req.flash("success", "Material uploaded successfully");
      res.redirect("/admin/materials?success=Material uploaded successfully");
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).send("Error uploading material");
    }
  })
);

router.post(
  "/admin/materials/delete/:id",
  isAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).send("Invalid material ID");
    }

    await WeekMaterial.findByIdAndDelete(id);

    req.flash("success", "Material deleted successfully");
    res.redirect("/admin/materials?success=Material deleted successfully");
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

router.post(
  "/admin/subjects/edit/:id",
  isAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).send("Invalid subject ID");
    }

    if (!name || name.trim() === "") {
      return res.status(400).redirect("/admin/subjects?error=Subject name cannot be empty");
    }

    const newName = name.trim();
    const subject = await Subject.findById(id);
    if (!subject) {
      return res.status(404).send("Subject not found");
    }

    const oldName = subject.name;
    
    // Update subject name
    subject.name = newName;
    await subject.save();

    // Cascading updates
    if (oldName !== newName) {
      await Promise.all([
        Answer.updateMany({ course: oldName }, { course: newName }),
        WeekMaterial.updateMany({ subject: oldName }, { subject: newName }),
        Note.updateMany({ subject: oldName }, { subject: newName })
      ]);
    }

    res.redirect("/admin/subjects?success=Subject updated successfully");
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

// ================= ACTIVITY LOGS =================

router.get(
  "/admin/activity-logs",
  isAdmin,
  asyncHandler(async (req, res) => {
    const { email, activityType, subject } = req.query;
    const filter = {};

    if (email && email.trim()) {
      filter.$or = [
        { email: { $regex: email.trim(), $options: "i" } },
        { userName: { $regex: email.trim(), $options: "i" } }
      ];
    }
    if (activityType) {
      filter.activityType = activityType;
    }
    if (subject) {
      filter.subject = subject;
    }

    const [logs, subjects] = await Promise.all([
      ActivityLog.find(filter).sort({ timestamp: -1 }).limit(1000).lean(),
      Subject.find().sort({ name: 1 }).lean()
    ]);

    res.render("admin/activityLogs", {
      logs,
      subjects,
      filter: {
        email: email || "",
        activityType: activityType || "",
        subject: subject || ""
      }
    });
  })
);

router.get(
  "/admin/export/activity-logs",
  isAdmin,
  asyncHandler(async (req, res) => {
    const { email, activityType, subject } = req.query;
    const filter = {};

    if (email && email.trim()) {
      filter.$or = [
        { email: { $regex: email.trim(), $options: "i" } },
        { userName: { $regex: email.trim(), $options: "i" } }
      ];
    }
    if (activityType) {
      filter.activityType = activityType;
    }
    if (subject) {
      filter.subject = subject;
    }

    const logs = await ActivityLog.find(filter).sort({ timestamp: -1 }).lean();

    const rows = logs.map((v, i) => ({
      sn: i + 1,
      userName: v.userName || "N/A",
      email: v.email || "N/A",
      activityType: v.activityType === "upload"
        ? "Upload"
        : v.activityType === "download"
          ? "Download"
          : v.activityType === "approve_note"
            ? "Approve Note"
            : v.activityType === "reject_note"
              ? "Reject Note"
              : v.activityType === "delete_note"
                ? "Delete Note"
                : v.activityType,
      itemType: v.itemType,
      title: v.title,
      fileName: v.fileName,
      subject: v.subject,
      timestamp: v.timestamp
        ? new Date(v.timestamp).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
        : ""
    }));

    const columns = [
      { header: "S.N.", key: "sn", width: 8 },
      { header: "Student Name", key: "userName", width: 22 },
      { header: "Email", key: "email", width: 28 },
      { header: "Action", key: "activityType", width: 14 },
      { header: "Type", key: "itemType", width: 16 },
      { header: "Title/Resource", key: "title", width: 30 },
      { header: "File Name", key: "fileName", width: 30 },
      { header: "Subject", key: "subject", width: 18 },
      { header: "Timestamp", key: "timestamp", width: 22 }
    ];

    await exportExcel(res, "Student Activity Logs", columns, rows, "student_activity_logs.xlsx");
  })
);

// ================= STUDENT NOTES MANAGEMENT =================

router.get(
  "/admin/notes",
  isAdmin,
  asyncHandler(async (req, res) => {
    const { status = "", subject = "" } = req.query;
    
    const filter = {};
    if (status) {
      filter.status = status;
    }
    if (subject) {
      filter.subject = subject;
    }

    const [notes, subjects, stats] = await Promise.all([
      Note.find(filter).sort({ createdAt: -1 }).lean(),
      Subject.find().sort({ name: 1 }).lean(),
      Promise.all([
        Note.countDocuments(),
        Note.countDocuments({ status: "pending" }),
        Note.countDocuments({ status: "approved" }),
        Note.countDocuments({ status: "rejected" })
      ])
    ]);

    res.render("admin/notes", {
      notes,
      subjects,
      selectedStatus: status,
      selectedSubject: subject,
      stats: {
        total: stats[0],
        pending: stats[1],
        approved: stats[2],
        rejected: stats[3]
      }
    });
  })
);

router.post(
  "/admin/notes/approve/:id",
  isAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).send("Invalid note ID");
    }

    const note = await Note.findById(id);
    if (!note) {
      return res.status(404).send("Note not found");
    }

    note.status = "approved";
    await note.save();

    await ActivityLog.create({
      userId: req.user ? req.user._id : null,
      email: req.user ? req.user.email : "admin",
      userName: req.user ? req.user.name : "Admin",
      activityType: "approve_note",
      itemType: "Note",
      itemId: note._id,
      title: `Approved note: ${note.title}`,
      fileName: note.fileName || "Text Note (No File)",
      subject: note.subject,
      timestamp: new Date()
    });

    res.redirect("/admin/notes?success=Note approved successfully");
  })
);

router.post(
  "/admin/notes/reject/:id",
  isAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).send("Invalid note ID");
    }

    const note = await Note.findById(id);
    if (!note) {
      return res.status(404).send("Note not found");
    }

    note.status = "rejected";
    await note.save();

    await ActivityLog.create({
      userId: req.user ? req.user._id : null,
      email: req.user ? req.user.email : "admin",
      userName: req.user ? req.user.name : "Admin",
      activityType: "reject_note",
      itemType: "Note",
      itemId: note._id,
      title: `Rejected note: ${note.title}`,
      fileName: note.fileName || "Text Note (No File)",
      subject: note.subject,
      timestamp: new Date()
    });

    res.redirect("/admin/notes?success=Note rejected successfully");
  })
);

router.post(
  "/admin/notes/delete/:id",
  isAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).send("Invalid note ID");
    }

    const note = await Note.findById(id);
    if (!note) {
      return res.status(404).send("Note not found");
    }

    await Note.deleteOne({ _id: id });

    await ActivityLog.create({
      userId: req.user ? req.user._id : null,
      email: req.user ? req.user.email : "admin",
      userName: req.user ? req.user.name : "Admin",
      activityType: "delete_note",
      itemType: "Note",
      itemId: note._id,
      title: `Deleted note: ${note.title}`,
      fileName: note.fileName || "Text Note (No File)",
      subject: note.subject,
      timestamp: new Date()
    });

    res.redirect("/admin/notes?success=Note deleted successfully");
  })
);

module.exports = router;