const express = require("express");
const nodemailer = require("nodemailer");
const Contact = require("../models/contact");
const router = express.Router();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});
router.post("/send", async (req, res) => {
  const { subject, message, groupIds = [], contactIds = [] } = req.body || {};
  if (typeof subject !== "string" || !subject.trim()) {
    return res.status(400).json({ message: "Вкажіть тему листа." });
  }
  if (typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ message: "Введіть текст повідомлення." });
  }
  if (!Array.isArray(groupIds) || !Array.isArray(contactIds)) {
    return res
      .status(400)
      .json({ message: "Некоректно вибрані контакти або групи." });
  }
  if (groupIds.length === 0 && contactIds.length === 0) {
    return res
      .status(400)
      .json({ message: "Виберіть хоча б одну групу або контакт." });
  }
  if (
    !process.env.SMTP_HOST ||
    !process.env.SMTP_USER ||
    !process.env.SMTP_PASS
  ) {
    return res.status(503).json({
      message: "SMTP помилка",
    });
  }
  try {
    const recipients = await Contact.find({
      deletedAt: null,
      consentToMailing: true,
      $or: [{ groupIds: { $in: groupIds } }, { _id: { $in: contactIds } }],
    }).select("email");
    if (recipients.length === 0) {
      return res.status(400).json({
        message:
          "Серед вибраних контактів немає активних адрес зі згодою на розсилку.",
      });
    }
    for (const recipient of recipients) {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: recipient.email,
        subject: subject.trim(),
        text: message.trim(),
      });
    }
    res.json({ sentCount: recipients.length });
  } catch (error) {
    console.error("Помилка розсилки:", error);
    res.status(500).json({
      message: "Не вдалося завершити розсилку",
    });
  }
});

module.exports = router;
