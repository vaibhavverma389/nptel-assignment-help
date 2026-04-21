const express = require("express");
const router = express.Router();

const Answer = require("../models/Answer");
const Subject = require("../models/Subject");
const WeekMaterial = require("../models/WeekMaterial");
const isAuth = require("../middlewares/auth");

// Constants
const WEEK_RANGE = { MIN: 1, MAX: 12 };
const MATERIAL_TYPES = {
  assi: "assignment",
  study: "material"
};

// Async handler
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Validate week
const isValidWeek = (week) => {
  const weekNum = Number(week);
  return !isNaN(weekNum) && weekNum >= WEEK_RANGE.MIN && weekNum <= WEEK_RANGE.MAX;
};

/* ================= DASHBOARD ================= */
router.get("/dashboard",isAuth, asyncHandler(async (req, res) => {
  const { course = "", week = null } = req.query;
  const weekNum = week ? Number(week) : null;

  const subjects = await Subject.find().sort({ name: 1 });
  let answers = [];
  let material = null;

  if (course && weekNum) {
    answers = await Answer.find({ course, week: weekNum }).sort({ question: 1 });

    material = await WeekMaterial.findOne({
      subject: course,
      week: weekNum,
      type: "material"
    });
  }

  res.render("student/dashboard", {
    user: req.user,
    subjects,
    course,
    week: weekNum,
    answers,
    material
  });
}));

/* ================= STUDY MATERIAL ================= */
router.get("/study-material", isAuth, asyncHandler(async (req, res) => {
  const { subject = "" } = req.query;
  const subjects = await Subject.find().sort({ name: 1 });
  res.render("study", { subject, subjects });
}));

/* ================= STUDY VIEW ================= */
router.get("/study-view", isAuth, asyncHandler(async (req, res) => {
  const { subject, week } = req.query;

  if (!subject) {
    return res.status(400).send("Subject is required");
  }

  const material = await WeekMaterial.findOne({
    subject,
    week,
    type: "material"
  });

  if (!material) {
    return res.render("student/pdf-view", { material: null, week });
  }

  // ✅ DIRECT URL USE (FIXED)
  const secureUrl = material.fileUrl;

  res.render("student/pdf-view", {
    material,
    secureUrl,
    week
  });
}));

/* ================= SHORT PDF ROUTE ================= */
router.get("/pdf/:type/:week", isAuth, asyncHandler(async (req, res) => {
  const { type, week } = req.params;
  const { subject } = req.query;

  if (!subject) {
    return res.status(400).send("Subject is required");
  }

  if (!["assi", "study"].includes(type) || !isValidWeek(week)) {
    return res.status(400).send("Invalid URL");
  }

  const materialType = MATERIAL_TYPES[type];

  const material = await WeekMaterial.findOne({
    subject,
    week: Number(week),
    type: materialType
  });

  if (!material) {
    return res.status(404).send("PDF not found");
  }

  const secureUrl = material.fileUrl;

  res.render("student/pdf-view", {
    material,
  secureUrl,
  week,
  subject,
  type: material.type
  });
}));

/* ================= SINGLE ANSWER SUBMIT ================= */
router.get("/submit", isAuth, asyncHandler(async (req, res) => {
  const subjects = await Subject.find().sort({ name: 1 });
  res.render("student/submit", { subjects });
}));

router.post("/submit", isAuth, asyncHandler(async (req, res) => {
  const { course, week, question, option } = req.body;

  if (!isValidWeek(week)) {
    return res.status(400).send("Invalid Week");
  }

  await Answer.create({
    course,
    week: Number(week),
    question: Number(question),
    option,
    user: req.user.name,
    email: req.user.email
  });

  res.redirect(`/dashboard?course=${course}&week=${week}`);
}));

/* ================= BULK ANSWER SUBMIT ================= */
router.get("/submit-bulk", isAuth, asyncHandler(async (req, res) => {
  const subjects = await Subject.find().sort({ name: 1 });
  const { course = "", week = 1 } = req.query;
  const selectedWeek = Number(week);

  let existingAnswers = [];

  if (course) {
    existingAnswers = await Answer.find({
      email: req.user.email,
      user: req.user.name,
      course,
      week: selectedWeek
    }).sort({ question: 1 });
  }

  res.render("student/submitBulk", {
    subjects,
    selectedCourse: course,
    selectedWeek,
    existingAnswers
  });
}));

router.post("/submit-bulk", isAuth, asyncHandler(async (req, res) => {
  let { course, week, questions, options } = req.body;

  if (!course || !week || !questions || !options) {
    return res.status(400).send("Invalid Data");
  }

  const weekNum = Number(week);

  if (!isValidWeek(weekNum)) {
    return res.status(400).send("Invalid Week");
  }

  const questionsArray = Array.isArray(questions) ? questions : [questions];
  const optionsArray = Array.isArray(options) ? options : [options];

  await Answer.deleteMany({
    email: req.user.email,
    user: req.user.name,
    course,
    week: weekNum
  });

  const answerDocs = questionsArray.map((q, i) => ({
    email: req.user.email,
    user: req.user.name,
    course,
    week: weekNum,
    question: Number(q),
    option: optionsArray[i]
  }));

  await Answer.insertMany(answerDocs);

  res.redirect(`/submit-bulk?course=${course}&week=${weekNum}`);
}));

module.exports = router;