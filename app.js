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

app.set("view engine","ejs");
app.set('views', path.join(__dirname, 'views'));

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

io.on("connection", function (socket) {
    socket.on("send-location",function(data){
        io.emit("receive-location",{id: socket.id, ...data})
    }) //accepting location in backend
    socket.on("disconnect",function(){
        io.emit("user-disconnected", socket.id);
    })
    console.log("connected user: ", socket.id);
})

app.get("/",function(req,res){
    res.render("index");
})

server.listen(port,()=>{
    console.log(`Server is connected at http://${host}:${port}`);
});