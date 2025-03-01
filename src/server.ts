import path from "path";
import fs from "fs";
import { createServer } from "https";

import express from "express";
import { Server, Socket } from "socket.io";

import { Data, DataStatus, RequestType } from "./types";

const frontRequestsAuthorized: RequestType[] = [
  "get",
  "mediaStreamOffer",
  "mediaStreamIce",
];
const backRequestsAuthorized: RequestType[] = [
  "update",
  "delete",
  "mediaStreamAnswer",
];

let list: Data[] = [
  { name: "Eleonore", status: "None" },
  { name: "Baptiste", status: "None" },
  { name: "Gabriel", status: "None" },
];

const app = express();
const server = createServer(
  {
    cert: fs.readFileSync("./ssl/cert.pem"),
    key: fs.readFileSync("./ssl/key.pem"),
  },
  app
);
const io = new Server(server);

let frontApps: Socket[] = [];
let backApps: Socket[] = [];

function hasData(name: string) {
  for (const element of list) {
    if (element.name === name) return true;
  }

  return false;
}

function updateStatus(name: string, status: DataStatus) {
  if (status === "Done") list = list.filter((element) => element.name !== name);
  else {
    for (const element of list) {
      if (element.name === name) {
        element.status = status;
        break;
      }
    }
  }
}

function isAuthorized(socket: Socket, requestType: RequestType) {
  // TODO: check if socket id is registered in front or back apps...?

  const clientType = socket.handshake.query.clientType;
  if (!clientType) return false;

  if ((clientType as string) === "front")
    return frontRequestsAuthorized.includes(requestType);
  else if ((clientType as string) === "back")
    return backRequestsAuthorized.includes(requestType);
  else return false;
}

function welcomeNewClient(socket: Socket) {
  const clientType = socket.handshake.query.clientType;
  if (clientType === "front") frontApps.push(socket);
  else if (clientType === "back") backApps.push(socket);
  else console.error(`Unknown client connected:${clientType}:${socket.id}`);
  console.log(`${clientType}:${socket.id} connected`);

  socket.on("disconnect", () => {
    console.log(
      `${socket.handshake.query.clientType}:${socket.id} disconnected`
    );
  });

  socket.on("get", (input) => {
    if (!isAuthorized(socket, "get")) {
      console.error(
        `${socket.handshake.query.clientType}:${socket.id} is not allowed to get`
      );
      return;
    }

    if (hasData(input)) {
      updateStatus(input, "Ordered");
      io.emit("get", "success");
      io.emit("list", list);
    } else io.emit("get", "error");
  });

  socket.on("update", (input) => {
    if (!isAuthorized(socket, "update")) {
      console.error(
        `${socket.handshake.query.clientType}:${socket.id} is not allowed to update`
      );
      return;
    }

    if (hasData(input)) {
      socket.emit("update", "success");
      updateStatus(input, "Preparing...");
      io.emit("list", list);
    } else socket.emit("update", "error");
  });

  socket.on("delete", (input) => {
    if (!isAuthorized(socket, "delete")) {
      console.error(
        `${socket.handshake.query.clientType}:${socket.id} is not allowed to delete`
      );
      return;
    }

    if (hasData(input)) {
      socket.emit("delete", "success");
      updateStatus(input, "Done");
      io.emit("list", list);
    } else socket.emit("delete", "error");
  });

  socket.on(
    "mediaStreamOffer",
    (webRtcSessionDescription: RTCSessionDescriptionInit) => {
      if (!isAuthorized(socket, "mediaStreamOffer")) {
        console.error(
          `${socket.handshake.query.clientType}:${socket.id} is not allowed to mediaStreamOffer`
        );
        return;
      }

      console.log(
        "New rtc offer received from client:",
        webRtcSessionDescription.type
      );
      console.log(
        "New rtc offer received from client:",
        webRtcSessionDescription.sdp
      );

      // To all backend ?
      const backendSocket = backApps.at(0);
      if (backendSocket)
        backendSocket.emit("mediaStreamOffer", webRtcSessionDescription);
    }
  );

  socket.on(
    "mediaStreamAnswer",
    (webRtcSessionDescription: RTCSessionDescriptionInit) => {
      if (!isAuthorized(socket, "mediaStreamAnswer")) {
        console.error(
          `${socket.handshake.query.clientType}:${socket.id} is not allowed to mediaStreamAnswer`
        );
        return;
      }

      console.log(
        "New rtc answer received from client:",
        webRtcSessionDescription.type
      );
      console.log(
        "New rtc answer received from client:",
        webRtcSessionDescription.sdp
      );

      // To all backend ?
      const frontendSocket = frontApps.at(0);
      if (frontendSocket)
        frontendSocket.emit("mediaStreamAnswer", webRtcSessionDescription);
    }
  );

  socket.on("mediaStreamIce", (iceCandidate: any) => {
    if (!isAuthorized(socket, "mediaStreamIce")) {
      console.error(
        `${socket.handshake.query.clientType}:${socket.id} is not allowed to mediaStreamIce`
      );
      return;
    }

    console.log(`New Ice candidate received: ${iceCandidate.candidate}`);

    // To all backend ?
    const backendSocket = backApps.at(0);
    if (backendSocket) backendSocket.emit("mediaStreamIce", iceCandidate);
  });
}

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

io.on("connection", (socket) => {
  welcomeNewClient(socket);
  io.emit("list", list);
});

server.listen(3000, () => {
  console.log("Server listening on localhost:3000");
});
