const express = require("express");
const Answer = require("../models/Answer");
const Subject = require("../models/Subject");
const WeekMaterial = require("../models/WeekMaterial");
const isAuth = require("../middlewares/auth");

const { getWeekInfo } = require("../utils/weekUtils");

const router = express.Router();

/* ===================== DASHBOARD ===================== */
router.get("/dashboard", isAuth, async (req, res) => {
  try {
    const course = req.query.course;
    const week = req.query.week ? Number(req.query.week) : null;

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

  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});


/* ===================== SINGLE SUBMIT ===================== */
router.get("/submit", isAuth, async (req, res) => {
  try {
    const subjects = await Subject.find().sort({ name: 1 });
    const { currentWeek } = getWeekInfo();

    res.render("student/submit", {
      subjects,
      currentWeek
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

router.post("/submit", isAuth, async (req, res) => {
  try {
    const { course, week, question, option } = req.body;

    const { isWeekOver } = getWeekInfo(week);
    if (isWeekOver) {
      return res.status(403).send("⛔ Submission deadline over");
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

  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

/* ===================== BULK SUBMIT (GET) ===================== */
router.get("/submit-bulk", isAuth, async (req, res) => {
  try {
    const subjects = await Subject.find().sort({ name: 1 });

    const {
      currentWeek,
      week: selectedWeek,
      isWeekOver
    } = getWeekInfo(req.query.week);

    const selectedCourse = req.query.course || "";

    let existingAnswers = [];

    if (selectedCourse) {
      existingAnswers = await Answer.find({
        email: req.user.email,
        course: selectedCourse,
        week: selectedWeek
      }).sort({ question: 1 });
    }

    res.render("student/submitBulk", {
      subjects,
      currentWeek,
      selectedWeek,
      selectedCourse,
      isWeekOver,
      existingAnswers
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

/* ===================== BULK SUBMIT (POST) ===================== */
router.post("/submit-bulk", isAuth, async (req, res) => {
  try {
    let { course, week, questions, options } = req.body;

    if (!course || !week || !questions || !options) {
      return res.status(400).send("Invalid Data");
    }

    const { isWeekOver } = getWeekInfo(week);
    if (isWeekOver) {
      return res.status(403).send("⛔ Submission deadline over");
    }

    // ensure arrays
    if (!Array.isArray(questions)) questions = [questions];
    if (!Array.isArray(options)) options = [options];

    week = Number(week);

    // delete old answers
    await Answer.deleteMany({
      email: req.user.email,
      course,
      week
    });

    const answerDocs = questions.map((q, i) => ({
      email: req.user.email,
      course,
      week,
      question: Number(q),
      option: options[i]
    }));

    await Answer.insertMany(answerDocs);

    res.redirect(`/submit-bulk?course=${course}&week=${week}`);

  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
