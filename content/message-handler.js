// Handles message communication in content script
window.messageHandler = {
    handleMessage(request, sender, sendResponse) {
      console.log('Content script received message:', request.action);
      
      switch(request.action) {
        case 'startListening':
          window.recordingManager.startListening();
          window.debugManager.addDebugListeners();
          sendResponse({success: true});
          break;
          
        case 'stopListening':
          window.recordingManager.stopListening();
          sendResponse({success: true});
          break;
          
        case 'startPlayback':
          window.playbackManager.startPlayback(request.actions, request.startIndex || 0);
          sendResponse({success: true});
          break;
          
        case 'stopPlayback':
          window.playbackManager.stopPlayback();
          sendResponse({success: true});
          break;
          
        case 'continuePlayback':
          if (request.actionIndex !== undefined) {
            window.playbackManager.continuePlaybackFromIndex(request.actionIndex);
          }
          sendResponse({success: true});
          break;
      }
      
      return true;
    }
  };