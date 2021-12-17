/* const dotenv = require("dotenv");
dotenv.config(); */

/*
const { MongoClient } = require("mongodb");
const client = new MongoClient(
  process.env.CONNECTIONSTRING,
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  },
);
client.connect((err) => {
  module.exports = client;
  const app = require("./app");
  app.listen(process.env.PORT, () => {
    console.log("server running on port 5000");
  });
  // client.close();
}); */

/* BRAD'S ORIGINAL CODE WITH OLD MONGODB NPM VERSION */
const mongodb = require("mongodb");
const connectionString =
  "mongodb+srv://webdevbro:t3l3cast3r@cluster0.mnxty.mongodb.net/wdb-blog?retryWrites=true&w=majority";

mongodb.connect(
  connectionString,
  { useNewUrlParser: true, useUnifiedTopology: true },
  (err, client) => {
    module.exports = client;
    const app = require("./app");
    app.listen(5000, () => {
      console.log("server running on port 5000");
    });
  },
);
