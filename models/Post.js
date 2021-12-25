const postsCollection = require("../db")
  .db()
  .collection("posts");
const ObjectId = require("mongodb").ObjectId;
const User = require("./User");
const sanitizeHTML = require("sanitize-html");

let Post = function (data, userid, requestedPostId) {
  this.data = data;
  this.errors = [];
  this.userid = userid;
  this.requestedPostId = requestedPostId;
};

Post.prototype.cleanUp = function () {
  if (typeof this.data.title !== "string") {
    this.data.title = "";
  }
  if (typeof this.data.body !== "string") {
    this.data.body = "";
  }
  // get rid of bogus properties
  this.data = {
    title: sanitizeHTML(this.data.title.trim(), {
      allowedTags: [],
      allowedAttributes: {},
    }),
    body: sanitizeHTML(this.data.body.trim(), {
      allowedTags: [],
      allowedAttributes: {},
    }),
    createdDate: new Date(),
    author: ObjectId(this.userid),
  };
};
Post.prototype.validate = function () {
  if (this.data.title === "") {
    this.errors.push("This is required field.");
  }
  if (this.data.body === "") {
    this.errors.push("This is required field.");
  }
};
Post.prototype.createPost = function () {
  return new Promise((resolve, reject) => {
    this.cleanUp();
    this.validate();
    if (!this.errors.length) {
      // save post into database
      postsCollection
        .insertOne(this.data)
        .then((info) => {
          resolve(info.ops[0]._id);
        })
        .catch((err) => {
          this.errors.push("Please try again later");
          reject(this.errors);
        });
    } else {
      reject(this.errors);
    }
  });
};
/* UPDATE (EDIT) */
Post.prototype.updatePost = function () {
  return new Promise(async (resolve, reject) => {
    try {
      let post = await Post.findSingleById(
        this.requestedPostId,
        this.userid,
      );
      if (post.isVisitorOwner) {
        // actually update post in DB
        let status = await this.actuallyUpdate();
        resolve(status);
      } else {
        reject();
      }
    } catch (err) {
      reject();
    }
  });
};

Post.prototype.actuallyUpdate = function () {
  return new Promise(async (resolve, reject) => {
    this.cleanUp();
    this.validate();
    if (!this.errors.length) {
      await postsCollection.findOneAndUpdate(
        {
          _id: new ObjectId(this.requestedPostId),
        },
        {
          $set: {
            title: this.data.title,
            body: this.data.body,
          },
        },
      );
      resolve("success");
    } else {
      resolve("failure");
    }
  });
};

/* show post by id */
Post.reusablePostQuery = (
  uniqueOperations,
  visitorId,
  finalOperations = [],
) => {
  return new Promise(async (resolve, reject) => {
    let aggOperations = uniqueOperations
      .concat([
        {
          $lookup: {
            from: "users",
            localField: "author",
            foreignField: "_id",
            as: "authorDocument",
          },
        },
        {
          $project: {
            title: 1,
            body: 1,
            createdDate: 1,
            authorId: "$author",
            author: {
              $arrayElemAt: ["$authorDocument", 0],
            },
          },
        },
      ])
      .concat(finalOperations);

    let posts = await postsCollection
      .aggregate(aggOperations)
      .toArray();
    // clean up author property in each post object
    posts = posts.map((post) => {
      post.isVisitorOwner = post.authorId.equals(visitorId);
      post.authorId = undefined;
      post.author = {
        username: post.author.username,
        avatar: new User(post.author, true).avatar,
      };
      return post;
    });
    resolve(posts);
  });
};

Post.findSingleById = (id, visitorId) => {
  return new Promise(async (resolve, reject) => {
    if (typeof id !== "string" || !ObjectId.isValid(id)) {
      reject();
      return;
    }
    let posts = await Post.reusablePostQuery(
      [
        {
          $match: { _id: new ObjectId(id) },
        },
      ],
      visitorId,
    );
    if (posts.length) {
      resolve(posts[0]);
    } else {
      reject();
    }
  });
};

Post.findByAuthorId = function (authorId) {
  return Post.reusablePostQuery([
    {
      $match: {
        author: authorId,
      },
    },
    { $sort: { createdDate: -1 } },
  ]);
};

Post.delete = function (postIdToDelete, currentUserId) {
  return new Promise(async (resolve, reject) => {
    try {
      let post = await Post.findSingleById(
        postIdToDelete,
        currentUserId,
      );
      if (post.isVisitorOwner) {
        await postsCollection.deleteOne({
          _id: new ObjectId(postIdToDelete),
        });
        resolve();
      } else {
        reject();
      }
    } catch (err) {
      reject();
    }
  });
};

Post.search = function (searchTerm) {
  return new Promise(async (resolve, reject) => {
    if (typeof searchTerm == "string") {
      let posts = await Post.reusablePostQuery(
        [
          {
            $match: {
              $text: {
                $search: searchTerm,
              },
            },
          },
        ],
        undefined,
        [
          {
            $sort: {
              score: {
                $meta: "textScore",
              },
            },
          },
        ],
      );
      resolve(posts);
    } else {
      reject();
    }
  });
};

module.exports = Post;
