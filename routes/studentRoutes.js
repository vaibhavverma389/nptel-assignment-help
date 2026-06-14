const express = require("express");
const router = express.Router();
const multer = require("multer");
const imagekit = require("../utils/imagekit");

const Answer = require("../models/Answer");
const Subject = require("../models/Subject");
const WeekMaterial = require("../models/WeekMaterial");
const Note = require("../models/Note");
const VisitorLog = require("../models/VisitorLog");
const ActivityLog = require("../models/ActivityLog");
const isAuth = require("../middlewares/auth");

const upload = multer({ storage: multer.memoryStorage() });

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
router.get("/dashboard", asyncHandler(async (req, res) => {
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

  // Study Insights & Stats
  let personalNotesCount = 0;
  let favoriteNotesCount = 0;
  let recentActivityCount = 0;
  let mostViewedSubject = "None yet";
  let streak = req.user ? (req.user.streak || 0) : 0;

  if (req.user) {
    personalNotesCount = await Note.countDocuments({ email: req.user.email });
    favoriteNotesCount = await Note.countDocuments({ email: req.user.email, isFavorite: true });
    
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    recentActivityCount = await Note.countDocuments({
      email: req.user.email,
      lastAccessed: { $gte: sevenDaysAgo }
    });

    try {
      const logs = await VisitorLog.find({
        email: req.user.email,
        path: { $regex: /subject=/i }
      }).lean();

      if (logs.length > 0) {
        const subjectCounts = {};
        logs.forEach(log => {
          try {
            const urlObj = new URL(log.path, "http://localhost");
            const subject = urlObj.searchParams.get("subject");
            if (subject) {
              subjectCounts[subject] = (subjectCounts[subject] || 0) + 1;
            }
          } catch (e) {}
        });

        let maxCount = 0;
        for (const [subj, count] of Object.entries(subjectCounts)) {
          if (count > maxCount) {
            maxCount = count;
            mostViewedSubject = subj;
          }
        }
      }
    } catch (err) {
      console.error("Dashboard visitor log query error:", err.message);
    }
  }

  res.render("student/dashboard", {
    user: req.user,
    subjects,
    course,
    week: weekNum,
    answers,
    material,
    personalNotesCount,
    favoriteNotesCount,
    recentActivityCount,
    mostViewedSubject,
    streak
  });
}));

/* ================= STUDY MATERIAL ================= */
router.get("/study-material", asyncHandler(async (req, res) => {
  const { subject = "" } = req.query;
  const subjects = await Subject.find().sort({ name: 1 });
  
  let materials = [];
  if (subject) {
    materials = await WeekMaterial.find({ subject, type: "material" }).sort({ createdAt: -1 }).lean();
  }
 
  res.render("study", { subject, subjects, materials });
}));

/* ================= STUDY VIEW ================= */
router.get("/study-view",  asyncHandler(async (req, res) => {
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
router.get("/pdf/:type/:week", asyncHandler(async (req, res) => {
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

/* ================= NOTES MANAGEMENT ================= */

// List notes (All Students + Subject Filter + Admin Materials)
router.get("/notes", asyncHandler(async (req, res) => {
  const { subject = "" } = req.query;
  const subjects = await Subject.find().sort({ name: 1 }).lean();
  
  const query = {};
  if (subject) {
    query.subject = subject;
  }

  // Only show approved notes to regular users. Logged-in students can also see their own pending/rejected notes. Admin sees all notes.
  if (!req.user) {
    query.status = "approved";
  } else if (req.user.role !== "admin") {
    query.$or = [
      { status: "approved" },
      { email: req.user.email }
    ];
  }
  
  const [notes, adminMaterials] = await Promise.all([
    Note.find(query).sort({ createdAt: -1 }).lean(),
    subject ? WeekMaterial.find({ subject, type: "material" }).sort({ createdAt: -1 }).lean() : []
  ]);
  
  res.render("student/notes", { 
    notes, 
    subjects, 
    selectedSubject: subject,
    adminMaterials
  });
}));

// Render Upload note page
router.get("/upload", isAuth, asyncHandler(async (req, res) => {
  const subjects = await Subject.find().sort({ name: 1 }).lean();
  res.render("student/upload", { subjects });
}));

// Handle note upload (file/text)
router.post("/upload", isAuth, upload.single("noteFile"), asyncHandler(async (req, res) => {
  const { title, description, subject } = req.body;

  if (!title || !subject) {
    return res.status(400).send("Title and subject are required");
  }

  let fileUrl = null;
  let fileName = null;

  if (req.file) {
    try {
      const result = await imagekit.upload({
        file: req.file.buffer,
        fileName: `${req.user.name.replace(/\s+/g, "_")}-note-${Date.now()}-${req.file.originalname}`,
        folder: "student-notes"
      });
      fileUrl = result.url;
      fileName = req.file.originalname;
    } catch (error) {
      console.error("ImageKit upload error:", error);
      return res.status(500).send("Error uploading file to storage");
    }
  }

  const note = await Note.create({
    title: title.trim(),
    description: description ? description.trim() : "",
    subject,
    fileUrl,
    fileName,
    email: req.user.email,
    user: req.user.name,
    lastAccessed: new Date()
  });

  // Log upload activity
  await ActivityLog.create({
    userId: req.user ? req.user._id : null,
    email: req.user ? req.user.email : "guest",
    userName: req.user ? req.user.name : "Guest",
    activityType: "upload",
    itemType: "Note",
    itemId: note._id,
    title: note.title,
    fileName: note.fileName || "Text Note (No File)",
    subject: note.subject,
    timestamp: new Date()
  });

  res.redirect("/notes?success=Note added successfully");
}));

// Toggle Favorite status
router.post("/notes/favorite/:id", isAuth, asyncHandler(async (req, res) => {
  const note = await Note.findOne({ _id: req.params.id, email: req.user.email });
  if (note) {
    note.isFavorite = !note.isFavorite;
    await note.save();
  }
  res.redirect(req.get("Referrer") || "/notes");
}));

// Favorite Notes list
router.get("/favorites", isAuth, asyncHandler(async (req, res) => {
  const notes = await Note.find({ email: req.user.email, isFavorite: true }).sort({ createdAt: -1 }).lean();
  res.render("student/favorites", { notes });
}));

// Recent Activity
router.get("/recent", isAuth, asyncHandler(async (req, res) => {
  const notes = await Note.find({ email: req.user.email }).sort({ lastAccessed: -1 }).limit(12).lean();
  res.render("student/recent", { notes });
}));

// Search Notes
router.get("/search", asyncHandler(async (req, res) => {
  const { query = "" } = req.query;
  let notes = [];
  if (query.trim()) {
    const statusQuery = {};
    if (!req.user) {
      statusQuery.status = "approved";
    } else if (req.user.role !== "admin") {
      statusQuery.$or = [
        { status: "approved" },
        { email: req.user.email }
      ];
    }

    notes = await Note.find({
      $and: [
        statusQuery,
        {
          $or: [
            { title: { $regex: query.trim(), $options: "i" } },
            { description: { $regex: query.trim(), $options: "i" } },
            { subject: { $regex: query.trim(), $options: "i" } }
          ]
        }
      ]
    }).sort({ createdAt: -1 }).lean();
  }
  res.render("student/search", { notes, query });
}));

// View Single Note (tracks access / downloads / views)
router.get("/notes/view/:id", asyncHandler(async (req, res) => {
  const note = await Note.findById(req.params.id);
  if (!note) {
    return res.status(404).render("404");
  }

  // Authorization Check: prevent guests/other students from viewing pending/rejected notes
  if (note.status !== "approved") {
    const isOwner = req.user && req.user.email === note.email;
    const isAdmin = req.user && req.user.role === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).send("Unauthorized access. This note is pending approval or has been rejected.");
    }
  }

  note.viewsCount += 1;
  note.lastAccessed = new Date();
  await note.save();

  if (note.fileUrl && note.fileUrl.toLowerCase().endsWith(".pdf")) {
    return res.render("student/pdf-view", {
      material: note,
      secureUrl: note.fileUrl,
      week: "Study Note",
      subject: note.subject,
      type: "Note"
    });
  }

  res.render("student/note-view", { note });
}));

// Edit Note GET
router.get("/notes/edit/:id", isAuth, asyncHandler(async (req, res) => {
  const query = { _id: req.params.id };
  if (req.user.role !== 'admin') {
    query.email = req.user.email;
  }
  const note = await Note.findOne(query).lean();
  if (!note) {
    return res.status(404).render("404");
  }
  const subjects = await Subject.find().sort({ name: 1 }).lean();
  res.render("student/edit", { note, subjects });
}));

// Edit Note POST
router.post("/notes/edit/:id", isAuth, asyncHandler(async (req, res) => {
  const { title, description, subject } = req.body;
  const query = { _id: req.params.id };
  if (req.user.role !== 'admin') {
    query.email = req.user.email;
  }
  const note = await Note.findOne(query);
  if (!note) {
    return res.status(404).render("404");
  }

  note.title = title.trim();
  note.description = description ? description.trim() : "";
  note.subject = subject;
  note.lastAccessed = new Date();
  await note.save();

  res.redirect("/notes?success=Note updated successfully");
}));

// Delete Note POST
router.post("/notes/delete/:id", isAuth, asyncHandler(async (req, res) => {
  const query = { _id: req.params.id };
  if (req.user.role !== 'admin') {
    query.email = req.user.email;
  }
  await Note.deleteOne(query);
  res.redirect("/notes?success=Note deleted successfully");
}));

// Download Student Note
router.get("/notes/download/:id", asyncHandler(async (req, res) => {
  const note = await Note.findById(req.params.id);
  if (!note || !note.fileUrl) {
    return res.status(404).send("File not found");
  }

  // Authorization Check: prevent guests/other students from downloading pending/rejected notes
  if (note.status !== "approved") {
    const isOwner = req.user && req.user.email === note.email;
    const isAdmin = req.user && req.user.role === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).send("Unauthorized access. This note is pending approval or has been rejected.");
    }
  }

  await ActivityLog.create({
    userId: req.user ? req.user._id : null,
    email: req.user ? req.user.email : "guest",
    userName: req.user ? req.user.name : "Guest",
    activityType: "download",
    itemType: "Note",
    itemId: note._id,
    title: note.title,
    fileName: note.fileName || "attachment",
    subject: note.subject,
    timestamp: new Date()
  });

  res.redirect(note.fileUrl);
}));

// Download WeekMaterial (Admin PDF)
router.get("/materials/download/:id", asyncHandler(async (req, res) => {
  const material = await WeekMaterial.findById(req.params.id);
  if (!material || !material.fileUrl) {
    return res.status(404).send("File not found");
  }

  await ActivityLog.create({
    userId: req.user ? req.user._id : null,
    email: req.user ? req.user.email : "guest",
    userName: req.user ? req.user.name : "Guest",
    activityType: "download",
    itemType: "WeekMaterial",
    itemId: material._id,
    title: `Week ${material.week} ${material.type === "assignment" ? "Assignment" : "Study Material"}`,
    fileName: material.fileName || `${material.subject}-week${material.week}-${material.type}.pdf`,
    subject: material.subject,
    timestamp: new Date()
  });

  res.redirect(material.fileUrl);
}));

module.exports = router;