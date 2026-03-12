const express = require("express");

const User = require("../models/User");
const Answer = require("../models/Answer");
const Subject = require("../models/Subject");
const WeekMaterial = require("../models/WeekMaterial");
const VisitorLog = require("../models/VisitorLog");
const ContactMessage = require("../models/ContactMessage");

const isAdmin = require("../middlewares/isAdmin");

const asyncHandler = require("../utils/asyncHandler");
const exportExcel = require("../utils/exportExcel");

const router = express.Router();



router.get("/admin", isAdmin, asyncHandler(async (req, res) => {

  const now = new Date();
  const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const [
    usersCount,
    answersCount,
    loggedInUsers,
    logsLast24h,
    newUsersLast24h,
    topRoutes
  ] = await Promise.all([

    User.countDocuments(),

    Answer.countDocuments(),

    VisitorLog.countDocuments({
      role: { $ne: "admin" }
    }),

    VisitorLog.countDocuments({
      visitedAt: { $gte: last24Hours }
    }),

    User.countDocuments({
      date: { $gte: last24Hours }
    }),

    VisitorLog.aggregate([
      { $match: { visitedAt: { $gte: oneWeekAgo } } },
      { $group: { _id: "$path", total: { $sum: 1 } } },
      { $sort: { total: -1 } },
      { $limit: 5 }
    ])

  ]);

  res.render("admin/dashboard", {
    usersCount,
    answersCount,
    loggedInUsers,
    guests: 0,
    logsLast24h,
    newUsersLast24h,
    topRoutes
  });  

}));

/* ===================== VISITORS ===================== */

router.get("/admin/visitors", isAdmin, asyncHandler(async (req, res) => {

  const logs = await VisitorLog.find()
    .sort({ visitedAt: -1 })
    .limit(500)
    .lean();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [loggedInUsers, todayVisits] = await Promise.all([

    VisitorLog.countDocuments({
      role: { $ne: "admin" }
    }),

    VisitorLog.countDocuments({
      visitedAt: { $gte: today }
    })

  ]);

  res.render("admin/visitors", {
    logs,
    loggedInUsers,
    guests: 0,
    todayVisits
  });

}));

/* ===================== EXPORT VISITORS ===================== */

router.get("/admin/export/visitors", isAdmin, asyncHandler(async (req, res) => {

const logs = await VisitorLog.find()
.sort({ visitedAt: -1 })
.lean()

const rows = logs.map((v, i) => ({

sn: i + 1,

ip: v.ip,

email: v.email || "Guest",

role: v.role || "guest",

country: v.country || "",

city: v.city || "",

device: v.device || "",

browser: v.browser || "",

os: v.os || "",

path: v.path,

method: v.method,

statusCode: v.statusCode,

responseTime: v.responseTime,

referer: v.referer || "",

language: v.language || "",

screen: v.screenWidth && v.screenHeight
? `${v.screenWidth}x${v.screenHeight}`
: "",

connection: v.connectionType || "",

sessionId: v.sessionId || "",

visitedAt: v.visitedAt
? new Date(v.visitedAt).toLocaleString("en-IN",{ timeZone:"Asia/Kolkata" })
: ""

}))

const columns = [

{ header:"S.N.", key:"sn", width:8 },

{ header:"IP Address", key:"ip", width:18 },

{ header:"Email", key:"email", width:28 },

{ header:"Role", key:"role", width:12 },

{ header:"Country", key:"country", width:12 },

{ header:"City", key:"city", width:18 },

{ header:"Device", key:"device", width:12 },

{ header:"Browser", key:"browser", width:14 },

{ header:"OS", key:"os", width:14 },

{ header:"Path", key:"path", width:35 },

{ header:"Method", key:"method", width:10 },

{ header:"Status Code", key:"statusCode", width:12 },

{ header:"Response Time (ms)", key:"responseTime", width:18 },

{ header:"Referer", key:"referer", width:30 },

{ header:"Language", key:"language", width:14 },

{ header:"Screen Size", key:"screen", width:16 },

{ header:"Connection", key:"connection", width:14 },

{ header:"Session ID", key:"sessionId", width:25 },

{ header:"Visited At (IST)", key:"visitedAt", width:22 }

]

await exportExcel(res,"Visitors",columns,rows,"visitors.xlsx")

}))

/* ===================== SUBJECTS ===================== */

router.get("/admin/subjects", isAdmin, asyncHandler(async (req, res) => {

  const subjects = await Subject.find().sort({ name: 1 }).lean();

  res.render("admin/subjects", { subjects });

}));

router.post("/admin/subjects", isAdmin, asyncHandler(async (req, res) => {

  if (!req.body.name) return res.redirect("/admin/subjects");

  await Subject.create({ name: req.body.name });

  res.redirect("/admin/subjects");

}));

router.post("/admin/subjects/delete/:id", isAdmin, asyncHandler(async (req, res) => {

  await Subject.findByIdAndDelete(req.params.id);

  res.redirect("/admin/subjects");

}));

/* ================= CONTACT MESSAGES ================= */

router.get("/admin/contact-messages", isAdmin, asyncHandler(async (req, res) => {

  const messages = await ContactMessage.find()
    .sort({ createdAt: -1 })
    .lean();

  res.render("admin/contactMessages", { messages });

}));

/* ===================== USERS ===================== */

router.get("/admin/users", isAdmin, asyncHandler(async (req, res) => {

  const users = await User.find().lean();

  res.render("admin/users", { users });

}));

/* ===================== ANSWERS ===================== */

router.get("/admin/answers", isAdmin, asyncHandler(async (req, res) => {

  const answers = await Answer.find()
    .sort({ course: 1, week: 1, question: 1 })
    .lean();

  res.render("admin/answers", { answers });

}));

router.post("/admin/answers/delete/:id", isAdmin, asyncHandler(async (req, res) => {

  await Answer.findByIdAndDelete(req.params.id);

  res.redirect("/admin/answers");

}));

/* ===================== EXPORT USERS ===================== */

router.get("/admin/export/users", isAdmin, asyncHandler(async (req, res) => {

  const users = await User.find({ role: "student" }).lean();

  const rows = users.map(u => ({

    name: u.name,
    email: u.email,
    role: u.role,

    date: u.date
      ? new Date(u.date).toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata"
        })
      : "",

    lastActive: u.lastActive
      ? new Date(u.lastActive).toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata"
        })
      : ""

  }));

  const columns = [

    { header: "Name", key: "name", width: 25 },
    { header: "Email", key: "email", width: 30 },
    { header: "Role", key: "role", width: 15 },
    { header: "Date", key: "date", width: 20 },
    { header: "Last Active", key: "lastActive", width: 20 }

  ];

  await exportExcel(res, "Students", columns, rows, "students.xlsx");

}));

/* ===================== MATERIALS ===================== */

router.get("/admin/materials", isAdmin, asyncHandler(async (req, res) => {

  const subjects = await Subject.find().sort({ name: 1 }).lean();

  const materials = await WeekMaterial.find()
    .sort({ subject: 1, week: 1 })
    .lean();

  res.render("admin/materials", { subjects, materials });

}));

router.post("/admin/materials", isAdmin, asyncHandler(async (req, res) => {

  const { subject, week, studyMaterialId, finalAnswerId } = req.body;

  const studyMaterialUrl = studyMaterialId
    ? `https://drive.google.com/uc?export=download&id=${studyMaterialId}`
    : "";

  const finalAnswerPdfUrl = finalAnswerId
    ? `https://drive.google.com/uc?export=download&id=${finalAnswerId}`
    : "";

  await WeekMaterial.findOneAndUpdate(

    { subject, week },

    { subject, week, studyMaterialUrl, finalAnswerPdfUrl },

    { upsert: true, new: true }

  );

  res.redirect("/admin/materials");

}));

router.post("/admin/materials/delete/:id", isAdmin, asyncHandler(async (req, res) => {

  await WeekMaterial.findByIdAndDelete(req.params.id);

  res.redirect("/admin/materials");

}));

module.exports = router;