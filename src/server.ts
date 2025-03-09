import fs from "fs";
import path from "path";
import { createServer } from "https";

import express from "express";
import { Server } from "socket.io";

import PendingData from "./PendingData";
import SocketHandler from "./SocketHandler";

const app = express();
const server = createServer(
  {
    cert: fs.readFileSync("./ssl/cert.pem"),
    key: fs.readFileSync("./ssl/key.pem"),
  },
  app
);
const io = new Server(server);
const pendingData = new PendingData();
const socketHandler = new SocketHandler(io, pendingData);

// app.get("/frontendClient.js", function (req, res) {
//   res.set("Content-Type", "text/javascript");
//   res.sendFile(__dirname + "/frontendClient.js");
// });

app.use(
  express.static(path.join(__dirname, "../public/audio"), {
    maxAge: "1y",
  })
);

app.get("/front", (_, res) => {
  res.sendFile(path.join(__dirname, "../public/front.html"));
});

app.get("/back", (_, res) => {
  res.sendFile(path.join(__dirname, "../public/back.html"));
});

io.on("connection", async (socket) => {
  await socketHandler.welcomeNewSocket(socket);
});

server.listen(3000, () => {
  console.log("Server listening on localhost:3000");
});
