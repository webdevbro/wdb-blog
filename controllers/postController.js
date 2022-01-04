const Post = require("../models/Post");

/* CREATE POST! */
exports.viewCreateScreen = (req, res) => {
  res.render("create-post");
};
exports.createPost = (req, res) => {
  let post = new Post(req.body, req.session.user._id);
  post
    .createPost()
    .then((newId) => {
      req.flash("success", "Successfully created a new post!");
      req.session.save(() => {
        res.redirect(`/post/${newId}`);
      });
    })
    .catch((err) => {
      errors.forEach((item) => {
        req.flash("errors", error);
        req.session.save(() => {
          res.redirect("create-post");
        });
      });
    });
};

exports.apiCreatePost = (req, res) => {
  let post = new Post(req.body, req.apiUser._id);
  post
    .createPost()
    .then((newId) => {
      res.json("Congrats, new post was successfully created!");
    })
    .catch((err) => {
      res.json(err);
    });
};

exports.viewSingle = async (req, res) => {
  try {
    let post = await Post.findSingleById(req.params.id, req.visitorId);
    res.render("single-post-screen", {
      post: post,
      title: post.title,
    });
  } catch (err) {
    res.render("404");
  }
};

/* UPDATE (EDIT) */

exports.viewEditScreen = async (req, res) => {
  try {
    let post = await Post.findSingleById(req.params.id, req.visitorId);

    if (post.isVisitorOwner) {
      res.render("edit-post", {
        post: post,
      });
    } else {
      req.flash("errors", "You don't have permission to perform that action.");
      req.session.save(() => {
        res.redirect("/");
      });
    }
  } catch (err) {
    res.render("404");
  }
};

exports.editPost = (req, res) => {
  let post = new Post(req.body, req.visitorId, req.params.id);
  post
    .updatePost()
    .then((status) => {
      if (status === "success") {
        // post updated in DB
        req.flash("success", "Post successfully updated");
        req.session.save(() => {
          res.redirect(`/post/${req.params.id}/edit`);
        });
      } else {
        post.errors.forEach((error) => {
          req.flash("errors", error);
        });
        req.session.save(() => {
          res.redirect(`/post/${req.params.id}/edit`);
        });
      }
    })
    .catch(() => {
      req.flash("errors", "You don't have permission to perform that action.");
      req.session.save();
      res.redirect("/");
    });
};

exports.deletePost = (req, res) => {
  Post.delete(req.params.id, req.visitorId)
    .then(() => {
      req.flash("success", "Post successfully deleted!");
      req.session.save(() => {
        res.redirect(`/profile/${req.session.user.username}`);
      });
    })
    .catch(() => {
      req.flash("errors", "You don't have permission to perform that action.");
      req.session.save(() => {
        res.redirect("/");
      });
    });
};

exports.apiDeletePost = (req, res) => {
  Post.delete(req.params.id, req.apiUser._id)
    .then(() => {
      res.json("successfully deleted post");
    })
    .catch(() => {
      res.json("you do not have permission to perform that action");
    });
};

exports.search = (req, res) => {
  Post.search(req.body.searchTerm)
    .then((posts) => {
      res.json(posts);
    })
    .catch(() => {
      res.json([]);
    });
};
