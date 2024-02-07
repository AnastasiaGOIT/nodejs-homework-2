const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const gravatar = require("gravatar");
const fs = require("fs/promises");
const path = require("path");
const Jimp = require("jimp");
const { User } = require("../models/user.js");
const { HttpError } = require("../helpers");
const ctrlWrapper = require("../helpers/ctrlWrapper.js");

const { SECRET_KEY } = process.env;

const avatarsDir = path.join(__dirname, "../", "public", "avatars");

const register = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (user) {
    throw HttpError(409, "Email in use");
  }

  const hashPassword = await bcrypt.hash(password, 10);

  const avatarURL = gravatar.url(email);

  const newUser = await User.create({
    ...req.body,
    password: hashPassword,
    avatarURL,
  });
  res.status(201).json({
    user: {
      email: newUser.email,
      subscription: newUser.subscription,
      avatarURL: newUser.avatarURL,
    },
  });
};

const login = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    throw HttpError(401, "Email or password is wrong");
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
};
