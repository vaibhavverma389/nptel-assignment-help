const express = require("express");
const ExcelJS = require("exceljs");

const User = require("../models/User");
const Answer = require("../models/Answer");
const Subject = require("../models/Subject");
const WeekMaterial = require("../models/WeekMaterial");
const VisitorLog = require("../models/VisitorLog");

const isAdmin = require("../middlewares/isAdmin");
const lastActive = require("../middlewares/lastActive");

const router = express.Router();
const ContactMessage = require("../models/ContactMessage");

router.get("/admin", isAdmin, async (req, res) => {
  try {
    const usersCount = await User.countDocuments();
    const answersCount = await Answer.countDocuments();

    const loggedInUsers = await VisitorLog.countDocuments({
      isAuthenticated: true
    });

    const guests = await VisitorLog.countDocuments({
      isAuthenticated: false
    });

    res.render("admin/dashboard", {
      usersCount,
      answersCount,
      loggedInUsers,
      guests
    });
  } catch (err) {
    console.error("Admin dashboard error:", err);
    res.status(500).send("Admin dashboard error");
  }
});
router.get("/admin/visitors", isAdmin, async (req, res) => {
  try {
    const logs = await VisitorLog.find()
      .sort({ visitedAt: -1 })
      .limit(500)
      .lean();

    const loggedInUsers = await VisitorLog.countDocuments({
      isAuthenticated: true
    });

    const guests = await VisitorLog.countDocuments({
      isAuthenticated: false
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayVisits = await VisitorLog.countDocuments({
      visitedAt: { $gte: today }
    });

    res.render("admin/visitors", {
      logs,
      loggedInUsers,
      guests,
      todayVisits
    });
  } catch (err) {
    console.error("Visitor list error:", err);
    res.status(500).send("Visitor list error");
  }
});

router.get("/admin/export/visitors", isAdmin, async (req, res) => {
  try {
    const logs = await VisitorLog.find()
      .sort({ visitedAt: -1 })
      .lean();

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Visitors");

    worksheet.columns = [
      { header: "IP Address", key: "ip", width: 18 },
      { header: "Email", key: "email", width: 30 },
      { header: "Role", key: "role", width: 12 },
      { header: "Authenticated", key: "isAuthenticated", width: 14 },

      // device
      { header: "Browser", key: "browser", width: 15 },
      { header: "OS", key: "os", width: 15 },
      { header: "Device Type", key: "device", width: 14 },

      // network
      { header: "ISP", key: "isp", width: 18 },
      { header: "Raw ISP", key: "rawIsp", width: 30 },
      { header: "ASN", key: "asn", width: 18 },
      { header: "Network Type", key: "networkType", width: 16 },
      { header: "Mobile IP (CGNAT)", key: "isMobileIP", width: 18 },
      { header: "Proxy / VPN", key: "proxy", width: 14 },

      // location
      { header: "Country", key: "country", width: 14 },
      { header: "Region", key: "region", width: 14 },
      { header: "City", key: "city", width: 14 },
      { header: "Timezone", key: "timezone", width: 16 },

      // request
      { header: "Path", key: "path", width: 30 },
      { header: "Method", key: "method", width: 10 },
      { header: "Status", key: "statusCode", width: 10 },
      { header: "Response Time", key: "responseTime", width: 14 },

      // misc
      { header: "Referrer", key: "referrer", width: 30 },
      { header: "Visited At (IST)", key: "visitedAt", width: 22 }
    ];

    logs.forEach(v => {
      worksheet.addRow({
        ip: v.ip,
        email: v.email || "Guest",
        role: v.role || "guest",
        isAuthenticated: v.isAuthenticated ? "Yes" : "No",

        browser: v.device?.browser || "Unknown",
        os: v.device?.os || "Unknown",
        device: v.device?.device || "desktop",

        isp: v.isp || "Unknown",
        rawIsp: v.rawIsp || "",
        asn: v.asn || "",
        networkType: v.networkType || "Broadband",
        isMobileIP: v.isMobileIP ? "Yes" : "No",
        proxy: v.proxy ? "Yes" : "No",

        country: v.location?.country || "Unknown",
        region: v.location?.region || "Unknown",
        city: v.location?.city || "Unknown",
        timezone: v.location?.timezone || "Unknown",

        path: v.path,
        method: v.method,
        statusCode: v.statusCode,
        responseTime: v.responseTime,
        referrer: v.referrer || "Direct",

        visitedAt: v.visitedAt
          ? new Date(v.visitedAt).toLocaleString("en-IN", {
              timeZone: "Asia/Kolkata"
            })
          : ""
      });
    });

    worksheet.getRow(1).font = { bold: true };

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=visitors.xlsx"
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("Visitor export error:", err);
    res.status(500).send("Visitor export error");
  }
});


/* ===================== SUBJECTS ===================== */
router.get("/admin/subjects", isAdmin, async (req, res) => {
  const subjects = await Subject.find().sort({ name: 1 });
  res.render("admin/subjects", { subjects });
});

router.post("/admin/subjects", isAdmin, async (req, res) => {
  if (!req.body.name) return res.redirect("/admin/subjects");
  await Subject.create({ name: req.body.name });
  res.redirect("/admin/subjects");
});

router.post("/admin/subjects/delete/:id", isAdmin, async (req, res) => {
  await Subject.findByIdAndDelete(req.params.id);
  res.redirect("/admin/subjects");
});
/* ================= CONTACT MESSAGES ================= */
router.get("/admin/contact-messages", isAdmin, async (req, res) => {
  try {
    const messages = await ContactMessage.find()
      .sort({ createdAt: -1 })
      .lean();

    res.render("admin/contactMessages", { messages });
  } catch (err) {
    console.error(err);
    res.redirect("/dashboard");
  }
});

/* ===================== USERS ===================== */
router.get("/admin/users", isAdmin, async (req, res) => {
  const users = await User.find();
  res.render("admin/users", { users });
});

/* ===================== ANSWERS ===================== */
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

/* ===================== EXPORT USERS ===================== */
router.get("/admin/export/users", isAdmin, async (req, res) => {
  const users = await User.find({ role: "student" });

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Students");

  worksheet.columns = [
    { header: "Name", key: "name", width: 25 },
    { header: "Email", key: "email", width: 30 },
    { header: "Role", key: "role", width: 15 },
    { header: "Date", key: "date", width: 20 },
    { header: "Last Active", key: "lastActive", width: 20 }
  ];

  users.forEach(u => {
    worksheet.addRow({
      name: u.name,
      email: u.email,
      role: u.role,
      date: u.date? new Date(u.date).toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata"
          })
        : "",
      lastActive: u.lastActive
        ? new Date(u.lastActive).toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata"
          })
        : ""

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

/* ===================== MATERIALS ===================== */
router.get("/admin/materials", isAdmin, async (req, res) => {
  const subjects = await Subject.find().sort({ name: 1 });
  const materials = await WeekMaterial.find().sort({
    subject: 1,
    week: 1
  });

  res.render("admin/materials", { subjects, materials });
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
    { subject, week, studyMaterialUrl, finalAnswerPdfUrl },
    { upsert: true, new: true }
  );

  res.redirect("/admin/materials");
});

router.post("/admin/materials/delete/:id", isAdmin, async (req, res) => {
  await WeekMaterial.findByIdAndDelete(req.params.id);
  res.redirect("/admin/materials");
});

module.exports = router;
