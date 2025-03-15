import { getText } from "./common.js";

const socket = io("https://192.168.1.156:3000", {
  query: { clientType: "front" },
});
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

    const callActionItem = document.createElement("button");
    callActionItem.style = "font-weight: bold";
    callActionItem.innerText = getText("call");
    callActionItem.onclick = () => {
      socket.emit("get", { name: element.name });
    };
    item.appendChild(callActionItem);

    const cancelActionItem = document.createElement("button");
    cancelActionItem.style = "font-weight: bold";
    cancelActionItem.disabled = true; // TODO
    cancelActionItem.innerText = getText("cancel");
    cancelActionItem.onclick = () => {
      // TODO
    };
    item.appendChild(cancelActionItem);

    messages.appendChild(item);
  }
  window.scrollTo(0, document.body.scrollHeight);
});
socket.on("add", (response) => {
  console.log(`Add response:`, response);
});
socket.on("get", (response) => {
  console.log(`Get response:`, response);
});
socket.on("about-to-close", () => {
  // TODO: Disabled action buttons and warn
  alert("Un nouveau client a pris la main...");
});

// Handle video
const webRtcPeerConnection = new RTCPeerConnection({
  iceServers: [],
});
webRtcPeerConnection.onicecandidate = (ice) => {
  socket.emit("rtc-ice-candidate", ice.candidate);
};
webRtcPeerConnection.onnegotiationneeded = () => {
  webRtcPeerConnection.createOffer(
    (offer) => {
      webRtcPeerConnection.setLocalDescription(
        { sdp: offer.sdp },
        () => {
          socket.emit("rtc-offer", offer);
        },
        (error) => {
          console.error(`Error setting local desc:`, error.message);
        }
      );
    },
    (error) => console.error(`Error creating offer: ${error.message}`)
  );
};

socket.on("trigger-stream", (webRtcSessionDescription) => {
  // TODO: Factorize with onnegotiationneeded
  // webRtcPeerConnection.restartIce();
  // webRtcPeerConnection.createOffer(
  //   (offer) => {
  //     webRtcPeerConnection.setLocalDescription(
  //       { sdp: offer.sdp },
  //       () => {
  //         socket.emit("rtc-offer", offer);
  //       },
  //       (error) => {
  //         console.error(`Error setting local desc:`, error.message);
  //       }
  //     );
  //   },
  //   (error) => console.error(`Error creating offer: ${error.message}`),
  //   { iceRestart: true }
  // );
  //TODO: remove track and re attach new ones

  // Brut force for now...
  window.location.reload();
});

socket.on("rtc-answer", (webRtcSessionDescription) => {
  console.log("New rtc answer received", webRtcSessionDescription);
  webRtcPeerConnection.setRemoteDescription(
    new RTCSessionDescription(webRtcSessionDescription),
    () => console.log("Remote description set"),
    (error) => console.error("Error setting remote desc:", error.message)
  );
});

navigator.mediaDevices
  .getUserMedia({ audio: false, video: { width: 1280, height: 720 } })
  .then((stream) => {
    video.srcObject = stream;
    video.play();
    stream
      .getTracks()
      .forEach((track) => webRtcPeerConnection.addTrack(track, stream));
  })
  .catch((error) => {
    console.error("Error getting user media:", error);
  });
