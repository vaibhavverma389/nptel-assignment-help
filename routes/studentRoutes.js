const express = require("express");
const Answer = require("../models/Answer"); 
const Subject = require("../models/Subject"); 
const WeekMaterial = require("../models/WeekMaterial"); 
const isAuth = require("../middlewares/auth"); 
const router = express.Router();
router.get("/dashboard", async (req, res) => {
  try {
    const course = req.query.course || "";
    const week = req.query.week ? Number(req.query.week) : null;

    const subjects = await Subject.find().sort({ name: 1 });

    let answers = [];
    let material = null;

    if (course && week) {
      answers = await Answer.find({
        course,
        week
      }).sort({ question: 1 });

      material = await WeekMaterial.findOne({
        subject: course,
        week
      });
    }

    res.render("student/dashboard", {
      user: req.user,
      subjects,
      course,
      week,
      answers,
      material
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

router.get("/submit", isAuth, async (req, res) => {
  try {
    const subjects = await Subject.find().sort({ name: 1 });

    res.render("student/submit", {
      subjects
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

router.post("/submit", isAuth, async (req, res) => {
  try {
    const { course, week, question, option } = req.body;

    // basic validation
    if (week < 1 || week > 12) {
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

  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

router.get("/submit-bulk", isAuth, async (req, res) => {
  try {
    const subjects = await Subject.find().sort({ name: 1 });

    const selectedCourse = req.query.course || "";
    const selectedWeek = Number(req.query.week) || 1;

    let existingAnswers = [];

    if (selectedCourse) {
      existingAnswers = await Answer.find({
        email: req.user.email,
        user: req.user.name,
        course: selectedCourse,
        week: selectedWeek
      }).sort({ question: 1 });
    }

    res.render("student/submitBulk", {
      subjects,
      selectedCourse,
      selectedWeek,
      existingAnswers
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

router.post("/submit-bulk", isAuth, async (req, res) => {
  try {
    let { course, week, questions, options } = req.body;

    if (!course || !week || !questions || !options) {
      return res.status(400).send("Invalid Data");
    }

    week = Number(week);

    if (week < 1 || week > 12) {
      return res.status(400).send("Invalid Week");
    }

    // ensure arrays
    if (!Array.isArray(questions)) questions = [questions];
    if (!Array.isArray(options)) options = [options];

    await Answer.deleteMany({
      email: req.user.email,
      user: req.user.name,
      course,
      week
    });

    const answerDocs = questions.map((q, i) => ({
      email: req.user.email,
      user: req.user.name,
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
