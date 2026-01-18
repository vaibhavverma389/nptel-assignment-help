const express = require("express");
const ExcelJS = require("exceljs");

const User = require("../models/User");
const Answer = require("../models/Answer");
const Subject = require("../models/Subject");
const WeekMaterial = require("../models/WeekMaterial");
const VisitorLog = require("../models/VisitorLog"); // ✅ ONLY ONCE

const isAdmin = require("../middlewares/admin");

const router = express.Router();

/* ================= ADMIN DASHBOARD ================= */
router.get("/admin", isAdmin, async (req, res) => {
  try {
    const usersCount = await User.countDocuments();
    const answersCount = await Answer.countDocuments();

    const loggedInUsers = await VisitorLog.countDocuments({
      email: { $ne: null }
    });

    const guests = await VisitorLog.countDocuments({
      email: null
    });

    res.render("admin/dashboard", {
      usersCount,
      answersCount,
      loggedInUsers,
      guests
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Admin dashboard error");
  }
});

/* ================= VISITOR LIST ================= */
router.get("/admin/visitors", isAdmin, async (req, res) => {
  try {
    const logs = await VisitorLog.find()
      .sort({ visitedAt: -1 })
      .limit(500);

    const loggedInUsers = await VisitorLog.countDocuments({
      email: { $ne: null }
    });

    const guests = await VisitorLog.countDocuments({
      email: null
    });

    res.render("admin/visitors", {
      logs,
      loggedInUsers,
      guests
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Visitor list error");
  }
});

/* ================= SUBJECT MANAGEMENT ================= */
router.get("/admin/subjects", isAdmin, async (req, res) => {
  const subjects = await Subject.find().sort({ name: 1 });
  res.render("admin/subjects", { subjects });
});

router.post("/admin/subjects", isAdmin, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.redirect("/admin/subjects");

  try {
    await Subject.create({ name });
  } catch (err) {}

  res.redirect("/admin/subjects");
});

router.post("/admin/subjects/delete/:id", isAdmin, async (req, res) => {
  await Subject.findByIdAndDelete(req.params.id);
  res.redirect("/admin/subjects");
});

/* ================= USERS ================= */
router.get("/admin/users", isAdmin, async (req, res) => {
  const users = await User.find();
  res.render("admin/users", { users });
});

/* ================= ANSWERS ================= */
router.get("/admin/answers", isAdmin, async (req, res) => {
  const answers = await Answer.find().sort({
    course: 1,
    week: 1,
    question: 1
  });

  res.render("admin/answers", { answers });
});

router.post("/admin/answers/delete/:id", isAdmin, async (req, res) => {
  await Answer.findByIdAndDelete(req.params.id);
  res.redirect("/admin/answers");
});

/* ================= EXPORT USERS ================= */
router.get("/admin/export/users", isAdmin, async (req, res) => {
  const users = await User.find({ role: "student" });

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Students");

  worksheet.columns = [
    { header: "Name", key: "name", width: 25 },
    { header: "Email", key: "email", width: 30 },
    { header: "Role", key: "role", width: 15 },
    { header: "Date", key: "date", width: 20 }
  ];

  users.forEach(u => {
    worksheet.addRow({
      name: u.name,
      email: u.email,
      role: u.role,
      date: u.date.toDateString()
    });
  });

  worksheet.getRow(1).font = { bold: true };

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader(
    "Content-Disposition",
    "attachment; filename=students.xlsx"
  );

  await workbook.xlsx.write(res);
  res.end();
});

/* ================= WEEK MATERIAL ================= */
router.get("/admin/materials", isAdmin, async (req, res) => {
  const subjects = await Subject.find().sort({ name: 1 });
  const materials = await WeekMaterial.find().sort({
    subject: 1,
    week: 1
  });

  res.render("admin/materials", {
    subjects,
    materials
  });
});

router.post("/admin/materials", isAdmin, async (req, res) => {
  const { subject, week, studyMaterialId, finalAnswerId } = req.body;

  const studyMaterialUrl = studyMaterialId
    ? `https://drive.google.com/uc?export=download&id=${studyMaterialId}`
    : "";

  const finalAnswerPdfUrl = finalAnswerId
    ? `https://drive.google.com/uc?export=download&id=${finalAnswerId}`
    : "";

  await WeekMaterial.findOneAndUpdate(
    { subject, week },
    {
      subject,
      week: Number(week),
      studyMaterialUrl,
      finalAnswerPdfUrl
    },
    { upsert: true, new: true }
  );

  res.redirect("/admin/materials");
});

router.post("/admin/materials/delete/:id", isAdmin, async (req, res) => {
  await WeekMaterial.findByIdAndDelete(req.params.id);
  res.redirect("/admin/materials");
});

module.exports = router;
