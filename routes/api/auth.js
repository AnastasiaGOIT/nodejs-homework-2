const express = require("express");

const ctrl = require("../../controllers/auth");

const { validateBody, authenticate, upload } = require("../../middlewares");
const { schemasUser } = require("../../models/user");

const router = express.Router();

router.post(
  "/register",
  validateBody(schemasUser.registerSchema),
  ctrl.register
);

router.post("/login", validateBody(schemasUser.loginSchema), ctrl.login);
router.get("/current", authenticate, ctrl.getCurrent);
router.post("/logout", authenticate, ctrl.logout);
router.patch(
  "/",
  authenticate,
  validateBody(schemasUser.subscriptionSchema),
  ctrl.updateSubscription
);
router.patch(
  "/avatars",
  authenticate,
  upload.single("avatar"),
  ctrl.updateAvatar
);
module.exports = router;
