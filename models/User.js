const bcrypt = require("bcryptjs");
const usersColletion = require("../db")
  .db()
  .collection("users");
const validator = require("validator");
const md5 = require("md5");

let User = function (data) {
  this.data = data;
  this.errors = [];
};

User.prototype.cleanUp = function () {
  if (typeof this.data.username !== "string") {
    this.data.username = "";
  }
  if (typeof this.data.email !== "string") {
    this.data.email = "";
  }
  if (typeof this.data.password !== "string") {
    this.data.password = "";
  }
  // get rid of bogus properties
  this.data = {
    username: this.data.username.trim().toLowerCase(),
    email: this.data.email.trim().toLowerCase(),
    password: this.data.password,
  };
};

User.prototype.validate = function () {
  return new Promise(async (resolve, reject) => {
    if (this.data.username === "") {
      this.errors.push("You must provide a username");
    }
    if (
      this.data.username !== "" &&
      !validator.isAlphanumeric(this.data.username)
    ) {
      this.errors.push(
        "Username can only contain letters and numbers!",
      );
    }
    if (
      this.data.username.length > 0 &&
      this.data.username.length < 3
    ) {
      this.errors.push(
        "Username must be at least 3 characters!",
      );
    }
    if (this.data.username.length > 15) {
      this.errors.push(
        "Username cannot exceed 15 characters",
      );
    }
    // check if username exists
    if (
      this.data.username.length > 2 &&
      this.data.username.length < 31 &&
      validator.isAlphanumeric(this.data.username)
    ) {
      let usernameExists = await usersColletion.findOne({
        username: this.data.username,
      });
      if (usernameExists) {
        this.errors.push("That username is already taken!");
      }
    }
    /* EMAIL */
    if (!validator.isEmail(this.data.email)) {
      this.errors.push("You must provide a valid email");
    }
    // check if email exists
    if (validator.isEmail(this.data.email)) {
      let emailExists = await usersColletion.findOne({
        email: this.data.email,
      });
      if (emailExists) {
        this.errors.push("That email is already taken!");
      }
    }
    /* PASSWORD */
    if (this.data.password === "") {
      this.errors.push("You must provide a password");
    }
    if (
      this.data.password.length > 0 &&
      this.data.password.length < 8
    ) {
      this.errors.push(
        "Passwords must be at least 8 characters!",
      );
    }
    if (this.data.password.length > 25) {
      this.errors.push(
        "Passwords cannot exceed 25 characters",
      );
    }
    resolve();
  });
};

User.prototype.login = function () {
  return new Promise((resolve, reject) => {
    this.cleanUp();
    usersColletion
      .findOne({ username: this.data.username })
      .then((attemptedUser) => {
        if (
          attemptedUser &&
          bcrypt.compareSync(
            this.data.password,
            attemptedUser.password,
          )
        ) {
          this.data = attemptedUser;
          this.getAvatar();
          resolve("Congrats");
        } else {
          reject(
            "Invalid username/password, try again later.",
          );
        }
      })
      .catch((err) => {
        reject("Please try again later!");
      });
  });
};

User.prototype.register = function () {
  return new Promise(async (resolve, reject) => {
    // 1. validate data
    this.cleanUp();
    await this.validate();
    // 2. if no validation errors save data into database
    if (!this.errors.length) {
      let salt = bcrypt.genSaltSync(10);
      this.data.password = bcrypt.hashSync(
        this.data.password,
        salt,
      );
      await usersColletion.insertOne(this.data);
      this.getAvatar();
      resolve();
    } else {
      reject(this.errors);
    }
  });
};

User.prototype.getAvatar = function () {
  this.avatar = `https://gravatar.com/avatar/${md5(
    this.data.email,
  )}?s=128`;
};

module.exports = User;
