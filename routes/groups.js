const express = require("express");
const Group = require("../models/group");
const Contact = require("../models/contact");
const router = express.Router();

function getGroupData(body = {}) {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  return { name: name, nameKey: name.toLowerCase() };
}

function handleError(res, error) {
  if (error.code === 11000) {
    return res.status(409).json({ message: "Група з такою назвою вже існує." });
  }
  if (error.name === "CastError") {
    return res
      .status(400)
      .json({ message: "Некоректний ідентифікатор групи." });
  }
  if (error.name === "ValidationError") {
    return res.status(400).json({ message: error.message });
  }
  console.error(error);
  res.status(500).json({ message: "Внутрішня помилка сервера." });
}

router.get("/", async (req, res) => {
  try {
    const groups = await Group.find()
      .sort({ name: 1 })
      .collation({ locale: "uk" });
    res.json(groups);
  } catch (error) {
    handleError(res, error);
  }
});

router.post("/", async (req, res) => {
  const data = getGroupData(req.body);
  if (!data.name) {
    return res.status(400).json({ message: "Вкажіть назву групи." });
  }
  try {
    const group = await Group.create(data);
    res.status(201).json(group);
  } catch (error) {
    handleError(res, error);
  }
});

router.put("/:id", async (req, res) => {
  const data = getGroupData(req.body);
  if (!data.name) {
    return res.status(400).json({ message: "Вкажіть назву групи." });
  }
  try {
    const group = await Group.findByIdAndUpdate(req.params.id, data, {
      returnDocument: "after",
      runValidators: true,
    });
    if (!group) {
      return res.status(404).json({ message: "Групу не знайдено." });
    }
    res.json(group);
  } catch (error) {
    handleError(res, error);
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const group = await Group.findByIdAndDelete(req.params.id);
    if (!group) {
      return res.status(404).json({ message: "Групу не знайдено." });
    }
    await Contact.updateMany(
      { groupIds: group._id },
      { $pull: { groupIds: group._id } },
    );
    res.json({ message: "Групу видалено." });
  } catch (error) {
    handleError(res, error);
  }
});

module.exports = router;
