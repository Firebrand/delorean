// Handles all message routing
export class MessageHandler {
    constructor(recordingManager, playbackManager, stateManager) {
      this.recordingManager = recordingManager;
      this.playbackManager = playbackManager;
      this.stateManager = stateManager;
    }
  
    handleMessage(request, sender, sendResponse) {
      console.log('Background received message:', request.action);
      
      switch(request.action) {
        case 'startRecording':
          this.recordingManager.startRecording();
          sendResponse({success: true});
          break;
          
        case 'stopRecording':
          this.recordingManager.stopRecording();
          sendResponse({success: true});
          break;
          
        case 'startPlayback':
          this.playbackManager.startPlayback();
          sendResponse({success: true});
          break;
          
        case 'stopPlayback':
          this.playbackManager.stopPlayback();
          sendResponse({success: true});
          break;
          
        case 'recordAction':
          if (this.stateManager.isRecording) {
            this.recordingManager.recordAction(request.data, sender.tab);
          }
          sendResponse({success: true});
          break;
          
        case 'playbackNextAction':
          this.playbackManager.playNextAction();
          sendResponse({success: true});
          break;
          
        case 'playbackComplete':
          this.playbackManager.completePlayback();
          sendResponse({success: true});
          break;
          
        case 'navigationOccurred':
          if (this.stateManager.isPlaying && sender.tab.id === this.stateManager.playbackTabId) {
            // Navigation is handled by the navigation listener in PlaybackManager
            console.log('Navigation occurred during playback');
          }
          sendResponse({success: true});
          break;
      }
      
      return true; // Keep message channel open for async responses
    }
  }