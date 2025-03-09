import { Socket, Server } from "socket.io";

import { ClientType, Data, RequestType } from "./types";
import PendingData from "./PendingData";

const frontRequestsAuthorized: RequestType[] = [
  "add",
  "get",
  "rtc-offer",
  "rtc-ice-candidate",
];
const backRequestsAuthorized: RequestType[] = [
  "add",
  "update",
  "delete",
  "rtc-answer",
];

const RequestSuccess = { result: "success" };
const RequestFailure = (errorMessage?: string) => {
  return { result: "error", errorMessage };
};

export default class SocketHandler {
  constructor(private io: Server, private pendingData: PendingData) {
    this.pendingData.on("data-changed", (data: Data[]) =>
      this.io.emit("data", data)
    );
  }

  async welcomeNewSocket(socket: Socket) {
    const clientType = socket.handshake.query.clientType;
    if (!clientType || this.isUnknownSocket(socket)) {
      console.error(`Unknown client connected:${clientType}:${socket.id}`);
      return;
    }

    // Allow only 1 front and 1 back
    await this.disconnectExistingSocketFrom(clientType);

    socket.join(clientType);
    if (clientType === ClientType.Back) {
      this.io.to(ClientType.Front).emit("trigger-stream");
    }
    console.log(`${clientType}:${socket.id} connected to room ${clientType}`);

    socket.on("disconnect", () => this.onSocketDisconnect(socket));

    // Data handling
    socket.on("add", ({ name }) => this.onAddData(socket, name));
    socket.on("get", ({ name }) => this.onGetData(socket, name));
    socket.on("update", ({ name }) => this.onUpdateData(socket, name));
    socket.on("delete", ({ name }) => this.onRemoveData(socket, name));

    // WebRtc handling (video stream)
    socket.on("rtc-offer", (sessionDescription) =>
      this.onRtcOfferReceived(socket, sessionDescription)
    );
    socket.on("rtc-answer", (sessionDescription) =>
      this.onRtcAnswerReceived(socket, sessionDescription)
    );
    socket.on("rtc-ice-candidate", (iceCandidate) =>
      this.onRtcIceCandidateReceived(socket, iceCandidate)
    );

    this.io.emit("data", this.pendingData.data);
  }

  private isSocketAuthorizedToRequest(
    socket: Socket,
    requestType: RequestType
  ) {
    const socketId = socket.id;
    const clientType = socket.handshake.query.clientType as string;

    if (this.isUnknownSocket(socket)) {
      console.error(`${clientType}:${socketId}: Unknown clientType`);
      return false;
    }

    const authorizedRequests =
      clientType === ClientType.Front
        ? frontRequestsAuthorized
        : backRequestsAuthorized;

    if (authorizedRequests.includes(requestType)) {
      return true;
    } else {
      console.error(
        `${clientType}:${socketId} is not allowed to request ${requestType}`
      );
      return false;
    }
  }

  private async disconnectExistingSocketFrom(roomId: string | string[]) {
    const hasClientInRoom = (await this.io.in(roomId).fetchSockets()).length;
    if (hasClientInRoom) {
      this.io.to(roomId).emit("about-to-close");
      this.io.in(roomId).disconnectSockets(true);
    }
  }

  private onSocketDisconnect(socket: Socket) {
    console.log(
      `${socket.handshake.query.clientType}:${socket.id} disconnected`
    );
  }

  private onAddData(socket: Socket, name: string) {
    if (!this.isSocketAuthorizedToRequest(socket, "add")) {
      this.io.emit("add", RequestFailure("Unauthorized request"));
      return;
    }

    this.pendingData.add(name);
    this.io.emit("add", RequestSuccess);
  }

  private onGetData(socket: Socket, name: string) {
    if (!this.isSocketAuthorizedToRequest(socket, "get")) {
      this.io.emit("get", RequestFailure("Unauthorized request"));
      return;
    }

    if (!this.pendingData.has(name)) {
      this.io.emit("get", RequestFailure(`${name} not exists`));
      return;
    }

    this.pendingData.update(name, "Ordered");
    this.io.emit("get", RequestSuccess);
  }

  private onUpdateData(socket: Socket, name: string) {
    if (!this.isSocketAuthorizedToRequest(socket, "update")) {
      this.io.emit("update", RequestFailure("Unauthorized request"));
      return;
    }

    if (!this.pendingData.has(name)) {
      this.io.emit("update", RequestFailure(`${name} not exists`));
      return;
    }

    socket.emit("update", RequestSuccess);
    this.pendingData.update(name, "Preparing...");
  }

  private onRemoveData(socket: Socket, name: string) {
    if (!this.isSocketAuthorizedToRequest(socket, "delete")) {
      this.io.emit("delete", RequestFailure("Unauthorized request"));
      return;
    }

    if (!this.pendingData.has(name)) {
      this.io.emit("delete", RequestFailure(`${name} not exists`));
      return;
    }

    socket.emit("delete", RequestSuccess);
    this.pendingData.remove(name);
  }

  private onRtcOfferReceived(
    socket: Socket,
    sessionDescription: RTCSessionDescriptionInit
  ) {
    if (!this.isSocketAuthorizedToRequest(socket, "rtc-offer")) {
      return;
    }

    this.io.to(ClientType.Back).emit("rtc-offer", sessionDescription);
  }

  private onRtcAnswerReceived(
    socket: Socket,
    sessionDescription: RTCSessionDescriptionInit
  ) {
    if (!this.isSocketAuthorizedToRequest(socket, "rtc-answer")) {
      return;
    }

    this.io.to(ClientType.Front).emit("rtc-answer", sessionDescription);
  }

  private onRtcIceCandidateReceived(
    socket: Socket,
    iceCandidate: RTCIceCandidate
  ) {
    if (!this.isSocketAuthorizedToRequest(socket, "rtc-ice-candidate")) {
      return;
    }

    this.io.to(ClientType.Back).emit("rtc-ice-candidate", iceCandidate);
  }

  private isUnknownSocket(socket: Socket) {
    const clientType = socket.handshake.query.clientType as string;
    return clientType !== ClientType.Front && clientType !== ClientType.Back;
  }
}
