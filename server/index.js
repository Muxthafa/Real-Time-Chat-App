const path = require("path");
const express = require("express");
const webpush = require("web-push");
const http = require("http");
const socketIO = require("socket.io");
const cors = require("cors");
const bodyParser = require("body-parser");

const {
  generateMessage,
  generateLocationMessage,
} = require("./utils/message.js");
const { isRealString } = require("./utils/validation");
const { Users } = require("./utils/users");
const publicPath = path.join(__dirname, "../public");
const PORT = process.env.PORT || 8080;

const app = express();

const publicVapidKey =
  "BCP2OKtumi6oAoWMM5iKFpCqGyKESeiVp6oipkRueZE6fSa_Qf82YLc8MChVpAPgRaNeaLca5aipOK8fY3kfPXw";
const privateVapidKey = "tySYz92A3_-oxIIU9ZKBJiwxGpy9AwJ05LsTmTx7F4w";

webpush.setVapidDetails(
  "mailto:musthafamohd17@gmail.com",
  publicVapidKey,
  privateVapidKey
);

app.use(
  cors({
    origin: "https://real-time-chat-applicatn.herokuapp.com/",
    methods: ["GET", "POST"],
  })
);

app.use(express.static(path.resolve(__dirname, "../frontend/build")));

app.use(bodyParser.json());
// Subscribe Route
let subscription;
app.post("/subscribe", (req, res) => {
  // Get pushSubscription object
  subscription = req.body;
  console.log(subscription);
  // Send 201 - resource created
  res.status(201).json({});

  // Create payload
  const payload = JSON.stringify({ title: "LetsChat app in progress" });

  // Pass object into sendNotification
  webpush
    .sendNotification(subscription, payload)
    .catch((err) => console.error(err));
});

const server = http.createServer(app);
app.use(express.static(publicPath));

var io = socketIO(server);
var users = new Users();

io.on("connection", (socket) => {
  socket.on("leave", (params) => {
    socket.leave(params.room);
  });

  socket.on("join", (params, callback) => {
    if (!isRealString(params.name) || !isRealString(params.room)) {
      return callback("Bad request");
    }

    socket.join(params.room);
    users.removeUser(socket.id);
    users.addUser(socket.id, params.name, params.room);

    io.to(params.room).emit("updateUserList", users.getUserList(params.room));
    socket.emit(
      "newMessage",
      generateMessage("Admin", params.room, "Welcome to the chat app.")
    );
    socket.broadcast
      .to(params.room)
      .emit(
        "newMessage",
        generateMessage("Admin", params.room, `${params.name} has joined.`)
      );

    callback();
  });

  socket.on("createMessage", (message, callback) => {
    var user = users.getUser(socket.id);
    if (user && isRealString(message.text)) {
      let tempObj = generateMessage(user.name, user.room, message.text);
      io.to(user.room).emit("newMessage", tempObj);
      callback({
        data: tempObj,
      });

      app.post("/message", (req, res) => {
        const payload = JSON.stringify({ title: message.text });
        console.log(payload);
        webpush
          .sendNotification(subscription, payload)
          .catch((err) => console.error(err));
      });
    }
    callback();
  });

  socket.on("createLocationMsg", (coords) => {
    var user = users.getUser(socket.id);
    if (user) {
      io.to(user.room).emit(
        "createLocationMsg",
        generateLocationMessage(user.name, user.room, coords.lat, coords.lon)
      );
    }
  });

  socket.on("disconnect", () => {
    var user = users.removeUser(socket.id);

    if (user) {
      io.to(user.room).emit("updateUserList", users.getUserList(user.room));
      io.to(user.room).emit(
        "newMessage",
        generateMessage("Admin", user.room, `${user.name} has left.`)
      );
    }
  });
});

server.listen(PORT, () => {
  console.log(`App running on port ${PORT}`);
});
