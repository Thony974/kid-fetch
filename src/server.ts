import fs from "fs";
import path from "path";
import { createServer } from "https";

import express, { Request, Response, NextFunction } from "express";
import { Server } from "socket.io";

import PendingData from "./PendingData";
import SocketHandler from "./SocketHandler";

import dotenv from "dotenv";
dotenv.config();

const app = express();
const server = createServer(
  {
    cert: fs.readFileSync(path.join(__dirname, "../ssl/cert.pem")),
    key: fs.readFileSync(path.join(__dirname, "../ssl/key.pem")),
  },
  app
);
const io = new Server(server);
const pendingData = new PendingData();
const socketHandler = new SocketHandler(io, pendingData);

function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeaders = req.headers.authorization;
  console.log("authHeaders: ", authHeaders);

  if (!authHeaders) {
    let error = new Error("Unauthorized access");
    res.setHeader("WWW-Authenticate", "Basic");
    res.status(401).send(error.message);
    return next(error);
  }

  const auth = authHeaders.split(" ")[1];
  if (auth !== process.env.ACCESS_TOKEN) {
    let error = new Error("Invalid credentials");
    res.setHeader("WWW-Authenticate", "Basic");
    res.status(401).send(error.message);
    return next(error);
  }

  next();
}

app.use(authenticate);

app.use(
  express.static(path.join(__dirname, "../public"), {
    maxAge: "1y",
  })
);

app.get("/", (_, res) => {
  res.sendFile(path.join(__dirname, "../public/home.html"));
});

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
