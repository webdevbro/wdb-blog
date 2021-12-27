const usersCollection = require("../db")
  .db()
  .collection("users");
const followsCollection = require("../db")
  .db()
  .collection("follows");
const ObjectId = require("mongodb").ObjectId;
const User = require("./User");

let Follow = function (followedUsername, authorId) {
  this.followedUsername = followedUsername;
  this.authorId = authorId;
  this.errors = [];
};

Follow.prototype.cleanUp = function () {
  if (typeof this.followedUsername !== "string") {
    this.followedUsername = "";
  }
};

Follow.prototype.validate = async function (action) {
  // followed username must exist in database
  let followedAccount = await usersCollection.findOne({
    username: this.followedUsername,
  });
  if (followedAccount) {
    this.followedId = followedAccount._id;
  } else {
    this.errors.push(
      "You can't follow a user that does not exist",
    );
  }

  let doesFollowAlreadyExists =
    await followsCollection.findOne({
      followedId: this.followedId,
      authorId: new ObjectId(this.authorId),
    });

  if (action === "create") {
    if (doesFollowAlreadyExists) {
      this.errors.push(
        "You are already following this user",
      );
    }
  }
  if (action === "destroy") {
    if (!doesFollowAlreadyExists) {
      this.errors.push(
        "You can't stop following someone you are do not already follow",
      );
    }
  }

  // should not be able to follow yourself
  if (this.followedId.equals(this.authorId)) {
    this.errors.push("You cannot follow yourself");
  }
};

Follow.prototype.create = function () {
  return new Promise(async (resolve, reject) => {
    this.cleanUp();
    await this.validate("create");
    if (!this.errors.length) {
      await followsCollection.insertOne({
        followedId: this.followedId,
        authorId: new ObjectId(this.authorId),
      });
      resolve();
    } else {
      reject(this.errors);
    }
  });
};
Follow.prototype.destroy = function () {
  return new Promise(async (resolve, reject) => {
    this.cleanUp();
    await this.validate("destroy");
    if (!this.errors.length) {
      await followsCollection.deleteOne({
        followedId: this.followedId,
        authorId: new ObjectId(this.authorId),
      });
      resolve();
    } else {
      reject(this.errors);
    }
  });
};

Follow.isVisitorFollowing = async function (
  followedId,
  visitorId,
) {
  let followDoc = await followsCollection.findOne({
    followedId: followedId,
    authorId: new ObjectId(visitorId),
  });
  if (followDoc) {
    return true;
  } else {
    return false;
  }
};

Follow.getFollowersById = function (id) {
  return new Promise(async (resolve, reject) => {
    try {
      let followers = await followsCollection
        .aggregate([
          {
            $match: {
              followedId: id,
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "authorId",
              foreignField: "_id",
              as: "userDoc",
            },
          },
          {
            $project: {
              username: {
                $arrayElemAt: ["$userDoc.username", 0],
              },
              email: {
                $arrayElemAt: ["$userDoc.email", 0],
              },
            },
          },
        ])
        .toArray();
      followers = followers.map((follower) => {
        let user = new User(follower, true);
        return {
          username: follower.username,
          avatar: user.avatar,
        };
      });
      resolve(followers);
    } catch {
      reject();
    }
  });
};

Follow.getFollowingById = function (id) {
  return new Promise(async (resolve, reject) => {
    try {
      let following = await followsCollection
        .aggregate([
          {
            $match: {
              authorId: id,
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "followedId",
              foreignField: "_id",
              as: "userDoc",
            },
          },
          {
            $project: {
              username: {
                $arrayElemAt: ["$userDoc.username", 0],
              },
              email: {
                $arrayElemAt: ["$userDoc.email", 0],
              },
            },
          },
        ])
        .toArray();
      following = following.map((followingPerson) => {
        let user = new User(followingPerson, true);
        return {
          username: followingPerson.username,
          avatar: user.avatar,
        };
      });
      resolve(following);
    } catch {
      reject();
    }
  });
};

Follow.countFollowersById = function (id) {
  return new Promise(async (resolve, reject) => {
    let followersCount =
      await followsCollection.countDocuments({
        followedId: id,
      });
    resolve(followersCount);
  });
};
Follow.countFollowingById = function (id) {
  return new Promise(async (resolve, reject) => {
    let followingCount =
      await followsCollection.countDocuments({
        authorId: id,
      });
    resolve(followingCount);
  });
};

module.exports = Follow;
