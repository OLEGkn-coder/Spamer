const mongoose = require("mongoose");
const contactSchema = new mongoose.Schema(
  {
    lastName: { type: String, required: true, trim: true },
    firstName: { type: String, required: true, trim: true },
    middleName: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
    },

    consentToMailing: { type: Boolean, default: false },
    groupIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Group" }],
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Contact", contactSchema);
