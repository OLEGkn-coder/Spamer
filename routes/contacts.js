const express = require("express");
const Contact = require("../models/contact");
const Group = require("../models/group");
const router = express.Router();
const sortOrder = { lastName: 1, firstName: 1, middleName: 1 };
const ukrainian = { locale: "uk" };

function handleError(res, error) {
  if (error.code === 11000) {
    return res.status(409).json({ message: "Ця електронна адреса вже існує." });
  }
  if (error.name === "CastError") {
    return res.status(400).json({ message: "Некоректний ідентифікатор." });
  }
  if (error.name === "ValidationError") {
    return res.status(400).json({ message: error.message });
  }

  console.error(error);
  res.status(500).json({ message: "Внутрішня помилка сервера." });
}

function getContactData(body = {}) {
  return {
    lastName: body.lastName,
    firstName: body.firstName,
    middleName: body.middleName,
    email: body.email,
    consentToMailing: body.consentToMailing,
    groupIds: body.groupIds,
  };
}

async function groupsExist(groupIds = []) {
  const count = await Group.countDocuments({ _id: { $in: groupIds } });
  return count === groupIds.length;
}

router.get("/trash", async (req, res) => {
  try {
    const contacts = await Contact.find({ deletedAt: { $ne: null } })
      .sort(sortOrder)
      .collation(ukrainian);
    res.json(contacts);
  } catch (error) {
    handleError(res, error);
  }
});

router.post("/trash/:id/restore", async (req, res) => {
  try {
    const contact = await Contact.findOneAndUpdate(
      { _id: req.params.id, deletedAt: { $ne: null } },
      { deletedAt: null },
      { returnDocument: "after" },
    );
    if (!contact) {
      return res.status(404).json({ message: "Контакт у кошику не знайдено." });
    }
    res.json(contact);
  } catch (error) {
    handleError(res, error);
  }
});

router.delete("/trash", async (req, res) => {
  try {
    const result = await Contact.deleteMany({ deletedAt: { $ne: null } });
    res.json({ deletedCount: result.deletedCount });
  } catch (error) {
    handleError(res, error);
  }
});

router.get("/", async (req, res) => {
  try {
    const filter = { deletedAt: null };
    if (req.query.groupId) {
      filter.groupIds = String(req.query.groupId);
    }
    const contacts = await Contact.find(filter)
      .populate("groupIds", "name")
      .sort(sortOrder)
      .collation(ukrainian);
    res.json(contacts);
  } catch (error) {
    handleError(res, error);
  }
});

router.post("/", async (req, res) => {
  try {
    const data = getContactData(req.body);

    if (!(await groupsExist(data.groupIds))) {
      return res
        .status(400)
        .json({ message: "Одна або кілька груп не знайдені." });
    }
    const contact = await Contact.create(data);
    res.status(201).json(contact);
  } catch (error) {
    handleError(res, error);
  }
});

router.put("/:id", async (req, res) => {
  try {
    const data = getContactData(req.body);
    if (!(await groupsExist(data.groupIds))) {
      return res
        .status(400)
        .json({ message: "Одна або кілька груп не знайдені." });
    }
    const contact = await Contact.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      data,
      { returnDocument: "after", runValidators: true },
    ).populate("groupIds", "name");
    if (!contact) {
      return res.status(404).json({ message: "Контакт не знайдено." });
    }
    res.json(contact);
  } catch (error) {
    handleError(res, error);
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const contact = await Contact.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      { deletedAt: new Date() },
    );
    if (!contact) {
      return res.status(404).json({ message: "Контакт не знайдено." });
    }
    res.json({ message: "Контакт переміщено до кошика." });
  } catch (error) {
    handleError(res, error);
  }
});

module.exports = router;
