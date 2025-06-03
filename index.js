import { CallClient, DtmfTone } from "@azure/communication-calling";
import { AzureCommunicationTokenCredential } from '@azure/communication-common';
import { AzureLogger, setLogLevel } from "@azure/logger";

// Set the log level and output
// setLogLevel('verbose');
// AzureLogger.log = (...args) => {
//     console.log(...args);
// };
let call;
let incomingCall;
let callAgent;
let tokenCredential;
const userToken = document.getElementById("token-id"); 
const tokenExpiry = document.getElementById("token-expiry");
const calleeInput = document.getElementById("callee-id-input");
const callButton = document.getElementById("call-button");
const hangUpButton = document.getElementById("hang-up-button");
const acceptCallButton = document.getElementById('accept-call-button');
const userCallId = document.getElementById("caller-id");

function isTokenExpired(expiresOn) {
  const expiry = new Date(expiresOn);
  const now = new Date();
  return now >= expiry;
}

function log(msg) {
    document.getElementById("debug-log").innerText += msg + "\n";
}

window.addEventListener("DOMContentLoaded", async () => {
    try {
      let userTokenCredential;
      let userTokenExpiryValue;
      let userCallIdValue;
      if (localStorage.getItem("userToken") && !isTokenExpired(localStorage.getItem("userTokenExpiry")) ) {
        userTokenCredential = localStorage.getItem("userToken");
        userTokenExpiryValue = localStorage.getItem("userTokenExpiry");
        userCallIdValue = localStorage.getItem("userCallId");
      }
      else {
        // Call your Azure Function endpoint
        userToken.textContent = "Fetching token value...";
        tokenExpiry.textContent = "Fetching token expiry...";
        userCallId.textContent = "Fetching Caller ID...";

        // Determine the base URL based on the environment
        // Use localhost for local development and production URL for deployed environment
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const baseUrl = isLocal
          ? "http://localhost:7071/api"
          : "https://opptak-t-bachelor2025.azurewebsites.net/api";

        const response = await fetch(`${baseUrl}/generate-user-and-token`);

        if (!response.ok) throw new Error("Failed to fetch token");
        const data = await response.json();
        const token = data.token;
        const callerId = data.user.rawId;

        console.log("Token acquired:", token);
        console.log("User acquired:", data.user);

        userTokenCredential = token.tokenValue;
        userTokenExpiryValue = token.expiresOn;
        userCallIdValue = callerId;

        localStorage.setItem("userToken", userTokenCredential); // Store the token in local storage
        localStorage.setItem("userTokenExpiry", userTokenExpiryValue); // Store the expiry time in local storage
        localStorage.setItem("userCallId", userCallIdValue); // Store the caller ID in local storage
      }
      
      userToken.textContent = userTokenCredential; // Set the token input field with the received token
      tokenExpiry.textContent = new Date(userTokenExpiryValue).toLocaleString(); // Display the token expiry time
      tokenExpiry.value = userTokenExpiryValue; // Set the expiry time in the input field
      userCallId.textContent = userCallIdValue;
      
      // Optionally: Trigger any setup code here
      initializeCallClient(userTokenCredential);
    } catch (error) {
      console.error("Failed to get token:", error);
    }
  });

async function initializeCallClient(token) {
    const callClient = new CallClient();
    tokenCredential = new AzureCommunicationTokenCredential(token);
    callAgent = await callClient.createCallAgent(tokenCredential);

    const callStateDisplay = document.getElementById("call-state-display");
    callStateDisplay.textContent = `Call state: ${callAgent.connectionState}`;
    callStateDisplay.style = "color: red; font-weight: bold;";

    const deviceManager = await callClient.getDeviceManager();
    await deviceManager.askDevicePermission({ audio: true });

    
    // try {
    //   const [speakers, microphones] = await Promise.all([
    //     deviceManager.getMicrophones ? deviceManager.getMicrophones() : Promise.resolve([])
    //   ]);
    //   console.log("Speakers:", speakers);
    //   console.log("Microphones:", microphones);
    // } catch (error) {
    //   console.error("Error fetching devices:", error);
    //   alert("Error fetching devices: " + error.message);
    //   return;
    // }



    callButton.disabled = false;

    callAgent.on("incomingCall", async (args) => {
      try {
        incomingCall = args.incomingCall;
        acceptCallButton.disabled = false;
        callButton.disabled = true;
      } catch (error) {
        console.error(error);
      }
    });
}



callButton.addEventListener("click", () => {
  const userToCall = calleeInput.value.trim();
  console.log(userToCall);
  if (!userToCall) {
      alert("Please enter a callee ID (e.g. 8:echo123)");
      return;
  }

  call = callAgent.startCall(
    [{ id: userToCall }],
    {
      audioOptions: {
          muted: false
      }
    }
  );

  hangUpButton.disabled = false;
  callButton.disabled = true;

  call.on('stateChanged', () => {
    const callStateDisplay = document.getElementById("call-state-display");
    callStateDisplay.textContent = `Call state: ${call.state}`;
    if (call.state === "Connected") {
      callStateDisplay.style = "color: green; font-weight: bold;";
      hangUpButton.disabled = false;
      acceptCallButton.disabled = true;
    } else if (call.state === "Connecting") {
      callStateDisplay.style = "color: orange; font-weight: bold;";
      acceptCallButton.disabled = false;
    } else if (call.state === "Disconnecting") {
      callStateDisplay.style = "color: blue; font-weight: bold;";
      hangUpButton.disabled = true;
      acceptCallButton.disabled = true;
    } else {
      callStateDisplay.style = "color: red; font-weight: bold;";
    }
    console.log("Call state:", call.state);
  });
  
});


hangUpButton.addEventListener("click", () => {
  // end the current call
  // The `forEveryone` property ends the call for all call participants.
  call.hangUp({ forEveryone: true });

  // toggle button states
  hangUpButton.disabled = true;
  callButton.disabled = false;
  acceptCallButton.disabled = true;
});

acceptCallButton.onclick = async () => {
  try {
    call = await incomingCall.accept();
    acceptCallButton.disabled = true;
    hangUpButton.disabled = false;
  } catch (error) {
    console.error(error);
  }
}



//   call.on('remoteParticipantsUpdated', (e) => {
//     console.log(e);
//     e.added.forEach(participant => {
//       participant.on('stateChanged', () => {
//         participant.streams.forEach(stream => {
//           if (stream.isAvailable && stream.kind === 'audio') {
//             stream.setAudioOutput(document.getElementById('remoteAudio'));
//           }
//         });
//       });
//     });
//   });
  
const dtmfKeypad = document.getElementById("dtmf-keypad");
const dtmfButtons = document.querySelectorAll(".dtmf-btn");

dtmfButtons.forEach(button => {
    button.addEventListener("click", () => {
      const tone = button.value; // e.g., "Num3", "Star", etc.
      console.log("Sending DTMF tone:", tone);
      
      if (call && call.state === "Connected") {
        try {
          call.sendDtmf(tone); // ✅ tone is already valid
          console.log("Sent DTMF tone:", tone);
        } catch (err) {
          console.error("Failed to send DTMF:", err);
        }
      } else {
        console.warn("DTMF sender not available.");
      }
    });
});
  