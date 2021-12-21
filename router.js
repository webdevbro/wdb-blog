const express = require("express");
const router = express.Router();
const userController = require("./controllers/userController");
const postController = require("./controllers/postController");

router.get("/", userController.home);
/* USERS */
router.get(
  "/profile/:username",
  userController.ifUserExists,
  userController.profilePostsScreen,
);
router.post("/register", userController.register);
router.post("/login", userController.login);
router.post("/logout", userController.logout);

/* POSTS */
router.get(
  "/create-post",
  userController.mustBeLoggedIn,
  postController.viewCreateScreen,
);
router.get("/post/:id", postController.viewSingle);
router.get(
  "/post/:id/edit",
  userController.mustBeLoggedIn,
  postController.viewEditScreen,
);
router.post(
  "/create-post",
  userController.mustBeLoggedIn,
  postController.createPost,
);
router.post(
  "/post/:id/edit",
  userController.mustBeLoggedIn,
  postController.editPost,
);
router.post(
  "/post/:id/delete",
  userController.mustBeLoggedIn,
  postController.deletePost,
);

module.exports = router;
