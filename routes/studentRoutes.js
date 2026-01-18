const express = require("express");
const Answer = require("../models/Answer");
const Subject = require("../models/Subject");
const WeekMaterial = require("../models/WeekMaterial");
const isAuth = require("../middlewares/auth");

const router = express.Router();

/* ======================================================
   🔥 SINGLE SOURCE OF TRUTH – WEEK & DEADLINE LOGIC
====================================================== */
function getWeekInfo(selectedWeek = null) {
  const COURSE_START_DATE = new Date("2026-01-21"); // 🔴 course start
  const BASE_DEADLINE = new Date("2026-02-04");     // week 1 & 2 deadline
  const TODAY = new Date();

  const diffDays = Math.floor(
    (TODAY - COURSE_START_DATE) / (1000 * 60 * 60 * 24)
  );

  let currentWeek = Math.floor(diffDays / 7) + 1;
  if (currentWeek < 1) currentWeek = 1;
  if (currentWeek > 12) currentWeek = 12;

  const week = selectedWeek ? Number(selectedWeek) : currentWeek;

  let lastDate = new Date(BASE_DEADLINE);
  if (week > 2) {
    lastDate.setDate(BASE_DEADLINE.getDate() + (week - 2) * 7);
  }

  const isWeekOver = TODAY > lastDate;

  return {
    currentWeek,
    week,
    lastDate,
    isWeekOver
  };
}

/* ======================================================
   📊 DASHBOARD
====================================================== */
router.get("/dashboard", isAuth, async (req, res) => {
  const { course, week } = req.query;

  const subjects = await Subject.find().sort({ name: 1 });

  const {
    currentWeek,
    week: selectedWeek,
    lastDate,
    isWeekOver
  } = getWeekInfo(week);

  let answers = [];
  let material = null;

  if (course) {
    answers = await Answer.find({
      course,
      week: selectedWeek
    }).sort({ question: 1 });

    material = await WeekMaterial.findOne({
      subject: course,
      week: selectedWeek
    });
  }

  res.render("student/dashboard", {
    user: req.user,
    subjects,
    course,
    week: selectedWeek,
    currentWeek,
    lastDate,
    isWeekOver,
    answers,
    material
  });
});

/* ======================================================
   ✍️ SINGLE SUBMIT
====================================================== */
router.get("/submit", isAuth, async (req, res) => {
  const subjects = await Subject.find().sort({ name: 1 });
  const { currentWeek } = getWeekInfo();

  res.render("student/submit", {
    subjects,
    currentWeek
  });
});

router.post("/submit", isAuth, async (req, res) => {
  const { course, week, question, option } = req.body;

  await Answer.create({
    course,
    week: Number(week),
    question: Number(question),
    option,
    user: req.user.name,
    email: req.user.email
  });

  res.redirect(`/dashboard?course=${course}&week=${week}`);
});

/* ======================================================
   📝 BULK SUBMIT
====================================================== */
router.get("/submit-bulk", isAuth, async (req, res) => {
  const subjects = await Subject.find().sort({ name: 1 });
  const { currentWeek } = getWeekInfo();

  res.render("student/submitBulk", {
    subjects,
    currentWeek
  });
});

router.post("/submit-bulk", isAuth, async (req, res) => {
  let { course, week, questions, options } = req.body;

  if (!Array.isArray(questions)) questions = [questions];
  if (!Array.isArray(options)) options = [options];

  const bulkAnswers = [];

  for (let i = 0; i < questions.length; i++) {
    if (questions[i] && options[i]) {
      bulkAnswers.push({
        course,
        week: Number(week),
        question: Number(questions[i]),
        option: options[i],
        user: req.user.name,
        email: req.user.email
      });
    }
  }

  if (bulkAnswers.length > 0) {
    await Answer.insertMany(bulkAnswers);
  }

  res.redirect(`/dashboard?course=${course}&week=${week}`);
});

module.exports = router;
