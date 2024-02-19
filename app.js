const express = require("express");
const logger = require("morgan");
const cors = require("cors");
// const nodemailer = require("nodemailer");

require("dotenv").config();

// const { META_PASSWORD } = process.env;

// const nodeMailerConfig = {
//   host: "smtp.meta.ua",
//   port: 465,
//   secure: true,
//   auth: {
//     user: "goit3.meta.ua",
//     pass: META_PASSWORD,
//   },
// };

// const transport = nodemailer.createTransport(nodeMailerConfig);

// const email = {
//   to: "rexih12480@oprevolt.com",
//   from: "goit3.meta.ua",
//   subject: "Test",
//   html: "<p>Test email</p>",
// };

// transport
//   .sendMail(email)
//   .then(() => console.log("Email sent"))
//   .catch((error) => console.log(error));

const authRouter = require("./routes/api/auth");
const contactsRouter = require("./routes/api/contacts");

const app = express();

const formatsLogger = app.get("env") === "development" ? "dev" : "short";

app.use(logger(formatsLogger));
app.use(cors());
app.use(express.json());

app.use("/users", authRouter);
app.use("/api/contacts", contactsRouter);

app.use((req, res) => {
  res.status(404).json({ message: "Not found" });
});

app.use((err, req, res, next) => {
  const { status = 500, message = "Server error" } = err;
  res.status(status).json({ message });
});

app.use(express.static("public"));

module.exports = app;
