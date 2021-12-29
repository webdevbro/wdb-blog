const User = require("../models/User");
const Post = require("../models/Post");
const Follow = require("../models/Follow");

/* SHARED PROFILE DATA */
exports.sharedProfileData = async function (
  req,
  res,
  next,
) {
  let isVisitorsProfile = false;
  let isFollowing = false;
  if (req.session.user) {
    isVisitorsProfile = req.profileUser._id.equals(
      req.session.user._id,
    );
    isFollowing = await Follow.isVisitorFollowing(
      req.profileUser._id,
      req.visitorId,
    );
  }
  req.isVisitorsProfile = isVisitorsProfile;
  req.isFollowing = isFollowing;

  // retrieve post, follower, and following counts

  let postsCountPromise = Post.countPostsByAuthor(
    req.profileUser._id,
  );
  let followersCountPromise = Follow.countFollowersById(
    req.profileUser._id,
  );
  let followingCountPromise = Follow.countFollowingById(
    req.profileUser._id,
  );
  let [postsCount, followersCount, followingCount] =
    await Promise.all([
      postsCountPromise,
      followersCountPromise,
      followingCountPromise,
    ]);
  req.postsCount = postsCount;
  req.followersCount = followersCount;
  req.followingCount = followingCount;

  next();
};

/* MUST BE LOGGED IN */
exports.mustBeLoggedIn = (req, res, next) => {
  if (req.session.user) {
    next();
  } else {
    req.flash(
      "errors",
      "You must be logged in to perform that action.",
    );
    req.session.save(() => {
      res.redirect("/");
    });
  }
};

/* LOGIN */
exports.login = (req, res) => {
  let user = new User(req.body);
  user
    .login()
    .then((result) => {
      req.session.user = {
        avatar: user.avatar,
        username: user.data.username,
        _id: user.data._id,
      };
      req.session.save(() => {
        res.redirect("/");
      });
    })
    .catch((err) => {
      req.flash("errors", err);
      req.session.save(() => {
        res.redirect("/");
      });
    });
};

/* LOGOUT */
exports.logout = (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
};

/* REGISTER */
exports.register = (req, res) => {
  let user = new User(req.body);
  user
    .register()
    .then(() => {
      req.session.user = {
        username: user.data.username,
        avatar: user.avatar,
        _id: user.data._id,
      };
      req.session.save(() => {
        res.redirect("/");
      });
    })
    .catch((regErrors) => {
      regErrors.forEach((error) => {
        req.flash("regErrors", error);
      });
      req.session.save(() => {
        res.redirect("/");
      });
    });
};

/* HOME! */
exports.home = async function (req, res) {
  if (req.session.user) {
    // fetch feed of posts for current user
    let posts = await Post.getFeed(req.session.user._id);
    res.render("home-dashboard", {
      posts: posts,
    });
  } else {
    res.render("home-guest", {
      regErrors: req.flash("regErrors"),
    });
  }
};

/* IF USER EXISTS */
exports.ifUserExists = (req, res, next) => {
  User.findByUsername(req.params.username)
    .then((userDocument) => {
      req.profileUser = userDocument;
      next();
    })
    .catch(() => {
      res.render("404");
    });
};

/* PROFILE POSTS */
exports.profilePostsScreen = (req, res) => {
  // request post model for posts by author id
  Post.findByAuthorId(req.profileUser._id)
    .then((posts) => {
      res.render("profile", {
        title: `Profile for ${req.profileUser.username}`,
        currentPage: "posts",
        posts: posts,
        profileUsername: req.profileUser.username,
        profileAvatar: req.profileUser.avatar,
        isFollowing: req.isFollowing,
        isVisitorsProfile: req.isVisitorsProfile,
        counts: {
          postsCount: req.postsCount,
          followersCount: req.followersCount,
          followingCount: req.followingCount,
        },
      });
    })
    .catch(() => {
      res.render("404");
    });
};

/* PROFILE POSTS */
exports.profileFollowersScreen = async function (req, res) {
  try {
    let followers = await Follow.getFollowersById(
      req.profileUser._id,
    );
    res.render("profile-followers", {
      currentPage: "followers",
      followers: followers,
      profileUsername: req.profileUser.username,
      profileAvatar: req.profileUser.avatar,
      isFollowing: req.isFollowing,
      isVisitorsProfile: req.isVisitorsProfile,
      counts: {
        postsCount: req.postsCount,
        followersCount: req.followersCount,
        followingCount: req.followingCount,
      },
    });
  } catch {
    res.render("404");
  }
};

/* PROFILE POSTS */
exports.profileFollowingScreen = async function (req, res) {
  try {
    let following = await Follow.getFollowingById(
      req.profileUser._id,
    );
    res.render("profile-following", {
      currentPage: "following",
      following: following,
      profileUsername: req.profileUser.username,
      profileAvatar: req.profileUser.avatar,
      isFollowing: req.isFollowing,
      isVisitorsProfile: req.isVisitorsProfile,
      counts: {
        postsCount: req.postsCount,
        followersCount: req.followersCount,
        followingCount: req.followingCount,
      },
    });
  } catch {
    res.render("404");
  }
};
