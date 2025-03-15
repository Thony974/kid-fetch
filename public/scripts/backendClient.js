import { getText } from "./common.js";

const socket = io("https://192.168.1.156:3000", {
  query: { clientType: "back" },
});

const audioNotification = new Audio(
  "https://192.168.1.156:3000/audio/classic_notif.mp3"
);

const form = document.getElementById("form");
const input = document.getElementById("input");
const video = document.getElementById("video");
const messages = document.getElementById("messages");

form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (input.value) {
    socket.emit("add", { name: input.value });
    input.value = "";
  }
});

socket.on("data", (data) => {
  while (messages.firstChild) messages.removeChild(messages.lastChild);
  for (const element of data) {
    const item = document.createElement("li");
    const status = getText(element.status);
    item.textContent = `${element.name} ${status ? `[${status}]` : ""} `;

    const actionItemPrepare = document.createElement("button");
    actionItemPrepare.style = "font-weight: bold";
    actionItemPrepare.innerText = getText("preparing");
    actionItemPrepare.onclick = () => {
      socket.emit("update", { name: element.name });
    };
    item.appendChild(actionItemPrepare);

    const actionItemDone = document.createElement("button");
    actionItemDone.style = "font-weight: bold";
    actionItemDone.innerText = getText("done");
    actionItemDone.onclick = () => {
      socket.emit("delete", { name: element.name });
    };
    item.appendChild(actionItemDone);

    messages.appendChild(item);
  }
  window.scrollTo(0, document.body.scrollHeight);
});
socket.on("add", (response) => {
  console.log(`Add response:`, response);
});
socket.on("get", (response) => {
  console.log(`Get response:`, response);
  audioNotification.play();
});
socket.on("update", (response) => {
  console.log(`Update response:`, response);
});
socket.on("delete", (response) => {
  console.log(`Delete response:`, response);
});
socket.on("about-to-close", () => {
  // TODO: Disabled action buttons and warn
  alert("Un nouveau client a pris la main...");
});

// Handle video
let webRtcPeerConnection;

socket.on("rtc-ice-candidate", (candidate) => {
  console.log("New ice candidate received:", candidate);
  webRtcPeerConnection.addIceCandidate(candidate);
});
socket.on("rtc-offer", (webRtcSessionDescription) => {
  console.log("New rtc offer received from client:", webRtcSessionDescription);

  webRtcPeerConnection = new RTCPeerConnection({
    iceServers: [],
  });
  webRtcPeerConnection.ontrack = ({ streams: [stream] }) => {
    video.srcObject = stream;
    video.play();
  };

  webRtcPeerConnection.setRemoteDescription(
    new RTCSessionDescription(webRtcSessionDescription),
    () => {
      if (webRtcSessionDescription.type === "offer") {
        webRtcPeerConnection.createAnswer(
          (anwser) => {
            webRtcPeerConnection.setLocalDescription(
              { sdp: anwser.sdp },
              () => {
                socket.emit("rtc-answer", anwser);
              },
              (error) => {
                console.error(`Error setting local desc:`, error.message);
              }
            );
          },
          (error) => console.error(`Error creating answer: ${error.message}`)
        );
      } else
        console.error(
          `Error creating answer: Received something that is not an offer`
        );
    },
    (error) => console.error(`Error setting remote desc: ${error.message}`)
  );
});
