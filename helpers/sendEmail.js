const nodemailer = require("nodemailer");

require("dotenv").config();

const { META_PASSWORD } = process.env;

const nodeMailerConfig = {
  host: "smtp.meta.ua",
  port: 25,
  secure: true,
  auth: {
    user: "goit3.meta.ua",
    pass: META_PASSWORD,
  },
};

const transport = nodemailer.createTransport(nodeMailerConfig);

const email = {
  from: "goit3.meta.ua",
  to: "hejace1274@fkcod.com",
  subject: "Test",
  text: "Test email",
};

transport
  .sendMail(email)
  .then(() => console.log("Email sent"))
  .catch((error) => console.log(error));

const sendEmail = (data) => {
  const email = { ...data, from: "goit3.meta.ua" };
  return transport.sendMail(email);
};

module.exports = sendEmail;
