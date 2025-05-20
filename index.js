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
let deviceManager;
let tokenCredential;
const userToken = document.getElementById("token-input"); 
const calleeInput = document.getElementById("callee-id-input");
const submitToken = document.getElementById("token-submit");
const callButton = document.getElementById("call-button");
const hangUpButton = document.getElementById("hang-up-button");
const acceptCallButton = document.getElementById('accept-call-button');
const caller_user = document.getElementById("caller-id");

const getToken = document.getElementById('get-token-from-server');
getToken.addEventListener("click", async () => {
    const callClient = new CallClient();
  
    try {
      // Call your Azure Function endpoint
      const response = await fetch("https://opptak-t-bachelor2025.azurewebsites.net/api/generate-user-and-token"); // Update the URL to your actual function URL
      if (!response.ok) throw new Error("Failed to fetch token");
    
      console.log(response);
      const data = await response.json();
      console.log(data);
      // Assuming data.token contains the token string
      const userTokenCredential = data.token.tokenValue;
      const callerId = data.user.rawId;
      caller_user.textContent = callerId;
      console.log("Caller ID:", callerId);
  
      console.log(userTokenCredential);
      tokenCredential = new AzureCommunicationTokenCredential(userTokenCredential);
      callAgent = await callClient.createCallAgent(tokenCredential);
      const deviceManager = await callClient.getDeviceManager();
      await deviceManager.askDevicePermission({ audio: true });
  
      const speakers = await deviceManager.getSpeakers();
      console.log("Speakers:", speakers);
      const microphones = await deviceManager.getMicrophones();
      console.log("Microphones:", microphones);
  
      callButton.disabled = false;
      submitToken.disabled = true;
  
      callAgent.on("incomingCall", async (args) => {
        try {
          incomingCall = args.incomingCall;
          acceptCallButton.disabled = false;
          callButton.disabled = true;
        } catch (error) {
          console.error(error);
        }
      });
    } catch (error) {
      console.error(error);
      window.alert("Please submit a valid token!");
    }
  });

submitToken.addEventListener("click", async () => {
    const callClient = new CallClient();
    const userTokenCredential = userToken.value;
      try {
        tokenCredential = new AzureCommunicationTokenCredential(userTokenCredential);
        callAgent = await callClient.createCallAgent(tokenCredential);
        deviceManager = await callClient.getDeviceManager();
        await deviceManager.askDevicePermission({ audio: true });
        
        // Get speakers
        const speakers = await deviceManager.getSpeakers();
        console.log("Speakers:", speakers);
        const microphones = await deviceManager.getMicrophones();
        console.log("Microphones:", microphones);
        // deviceManager.selectMicrophone();
        
        callButton.disabled = false;
        submitToken.disabled = true;
        // Listen for an incoming call to accept.
        callAgent.on('incomingCall', async (args) => {
          try {
            incomingCall = args.incomingCall;
            acceptCallButton.disabled = false;
            callButton.disabled = true;
          } catch (error) {
            console.error(error);
          }
        });
      } catch(error) {
        window.alert("Please submit a valid token!");
      }
  })

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
    submitToken.disabled = false;
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
  