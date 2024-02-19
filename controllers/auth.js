const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");

require("dotenv").config();

const jwt = require("jsonwebtoken");
const gravatar = require("gravatar");
const fs = require("fs/promises");
const path = require("path");
const Jimp = require("jimp");
const { nanoid } = require("nanoid");
const { User } = require("../models/user.js");
const { HttpError, sendEmail } = require("../helpers");
const ctrlWrapper = require("../helpers/ctrlWrapper.js");

const { SECRET_KEY, BASE_URL } = process.env;

const avatarsDir = path.join(__dirname, "../", "public", "avatars");

const register = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (user) {
    throw HttpError(409, "Email in use");
  }

  const hashPassword = await bcrypt.hash(password, 10);

  const avatarURL = gravatar.url(email);
  const verificationToken = nanoid();

  const newUser = await User.create({
    ...req.body,
    password: hashPassword,
    avatarURL,
    verificationToken,
  });

  try {
    const transport = nodemailer.createTransport({
      host: "sandbox.smtp.mailtrap.io",
      port: 2525,
      auth: {
        user: "3961a8d39e9e5f",
        pass: "bccd33d93d5105",
      },
    });

    const verifyEmail = {
      from: "App admin <example@mail.ua>",
      to: "qw@example.com",
      subject: "Test",
      html: `<a href="${BASE_URL}/users/verify/${verificationToken}">Click to verify</a>`,
      text: "Test email",
    };

    await transport.sendMail(verifyEmail);
  } catch (error) {}

  res.status(201).json({
    user: {
      email: newUser.email,
      subscription: newUser.subscription,
      avatarURL: newUser.avatarURL,
    },
  });
};

const verifyEmail = async (req, res) => {
  const { verificationToken } = req.params;
  const user = await User.findOne({ verificationToken });
  if (!user) {
    throw HttpError(404, "User not found");
  }
  await User.findByIdAndUpdate(user._id, {
    verify: true,
    verificationToken: "",
  });
  res.json({ message: "Verification successful" });
};

const resendVerifyEmail = async (req, res) => {
  const { email } = req.body;
  const { verificationToken } = req.params;
  const user = User.findOne({ email });
  if (!user) {
    res.json(400, "missing required field email");
  }
  if (user.verify) {
    res.json(400, "Verification has already been passed");
  }
  const transport = nodemailer.createTransport({
    host: "sandbox.smtp.mailtrap.io",
    port: 2525,
    auth: {
      user: "3961a8d39e9e5f",
      pass: "bccd33d93d5105",
    },
  });
  const verifyEmail = {
    from: "App admin <example@mail.ua>",
    to: "q@example.com",
    subject: "Test",
    html: `<a href="${BASE_URL}/users/verify/${verificationToken}">Click to verify</a>`,
    text: "Test email",
  };

  await transport.sendMail(verifyEmail);

  res.json({ message: "Verification email sent" });
};

const login = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    throw HttpError(401, "Email or password is wrong");
  }

  if (!user.verify) {
    throw HttpError(404, "Email not verified");
  }
  const comparePassword = await bcrypt.compare(password, user.password);
  if (!comparePassword) {
    throw HttpError(401, "Email or password is wrong");
  }
  const payload = {
    id: user._id,
  };

  const token = jwt.sign(payload, SECRET_KEY, { expiresIn: "23h" });
  await User.findByIdAndUpdate(user._id, { token });
  res.json({ token, user: { email, subscription: "starter" } });
};

const getCurrent = (req, res, next) => {
  const { email, subscription } = req.user;

  res.json({ email, subscription });
};

const logout = async (req, res, next) => {
  const { _id } = req.user;
  await User.findByIdAndUpdate(_id, { token: "" });
  res.status(204).json();
};

const updateSubscription = async (req, res, next) => {
  const { id } = req.user;

  const validSubscriptions = ["starter", "pro", "business"];
  const { subscription } = req.body;

  if (!subscription || !validSubscriptions.includes(subscription)) {
    throw new HttpError(400);
  }

  const result = await User.findByIdAndUpdate(
    id,
    { subscription },
    {
      new: true,
    }
  );

  if (!result) {
    throw new HttpError(404, "User not found");
  }

  res.json(result);
};

const updateAvatar = async (req, res, next) => {
  const { id } = req.user;
  if (!req.file) {
    return res.status(400).json({ message: "Image isn't uploaded" });
  }
  const { path: tempUpload, originalname } = req.file;

  const fileName = `${id}_${originalname}`;
  const resultUpload = path.join(avatarsDir, fileName);
  await fs.rename(tempUpload, resultUpload);
  const avatarURL = path.join("avatars", fileName);

  const image = await Jimp.read(resultUpload);
  await image.resize(250, 250).write(path.join("public", avatarURL));

  await User.findByIdAndUpdate(id, { avatarURL });
  res.json({ avatarURL });
};

module.exports = {
  register: ctrlWrapper(register),
  login: ctrlWrapper(login),
  getCurrent: ctrlWrapper(getCurrent),
  logout: ctrlWrapper(logout),
  updateSubscription: ctrlWrapper(updateSubscription),
  updateAvatar: ctrlWrapper(updateAvatar),
  verifyEmail: ctrlWrapper(verifyEmail),
  resendVerifyEmail: ctrlWrapper(resendVerifyEmail),
};
