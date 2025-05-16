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
  