const express = require("express");
const app = express();
const path = require("path");
const http = require("http");
const socketio = require("socket.io");
const server = http.createServer(app);
const io = socketio(server);
const cors = require("cors");
require("dotenv").config();

const port = process.env.PORT;
const host = process.env.HOST;

// Store connected users and their locations
const connectedUsers = new Map();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

io.on("connection", function (socket) {
  console.log("Connected user:", socket.id);

  // Send existing users' locations to newly connected user
  connectedUsers.forEach((location, userId) => {
    if (userId !== socket.id) {
      socket.emit("receive-location", {
        id: userId,
        ...location,
      });
    }
  });

  socket.on("send-location", function (data) {
    // Store the user's location
    connectedUsers.set(socket.id, {
      latitude: data.latitude,
      longitude: data.longitude,
      timestamp: data.timestamp,
    });

    // Broadcast location to all clients
    io.emit("receive-location", {
      id: socket.id,
      ...data,
    });
  });

  socket.on("disconnect", function () {
    console.log("Disconnected user:", socket.id);
    connectedUsers.delete(socket.id);
    io.emit("user-disconnected", socket.id);
  });
});

app.get("/", function (req, res) {
  res.render("index");
});

server.listen(port, () => {
  console.log(`Server is connected at http://${host}:${port}`);
});
