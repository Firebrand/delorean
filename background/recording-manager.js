// Handles all recording-related functionality
export class RecordingManager {
    constructor(stateManager) {
      this.stateManager = stateManager;
    }
  
    startRecording() {
      this.stateManager.setRecording(true);
      this.stateManager.setRecordedActions([]);
      
      console.log('Background: Starting recording');
      
      // Inject content script into active tab if needed, then start listening
      chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        if (tabs[0]) {
          chrome.scripting.executeScript({
            target: {tabId: tabs[0].id},
            files: ['content.js']
          }, () => {
            // After injection (or if already injected), send the message
            chrome.tabs.sendMessage(tabs[0].id, {action: 'startListening'}, (response) => {
              if (chrome.runtime.lastError) {
                console.log('Error sending message:', chrome.runtime.lastError);
              } else {
                console.log('Started listening on tab:', tabs[0].id);
              }
            });
          });
        }
      });
    }
  
    stopRecording() {
      this.stateManager.setRecording(false);
      
      // Notify all tabs to stop listening
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
          chrome.tabs.sendMessage(tab.id, {action: 'stopListening'}).catch(() => {});
        });
      });
    }
  
    recordAction(actionData, tab) {
      const action = {
        ...actionData,
        url: tab.url,
        timestamp: Date.now(),
        tabId: tab.id
      };
      
      this.stateManager.addRecordedAction(action);
      console.log('Recorded action:', action);
    }
  }