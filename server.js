require("dotenv").config();

const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const contactsRouter = require("./routes/contacts");
const groupsRouter = require("./routes/groups");
const mailingRouter = require("./routes/mailing");
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use("/api/contacts", contactsRouter);
app.use("/api/groups", groupsRouter);
app.use("/api/mailing", mailingRouter);

async function startServer() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Підключено");

    app.listen(port, () => {
      console.log("Сервер працює: http://localhost:" + port);
    });
  } catch (error) {
    console.error("Не вдалося підключитись", error);
    process.exit(1);
  }
}

startServer();
