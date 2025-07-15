// Main content script that coordinates between modules
console.log('Content script loaded on:', window.location.href);

// Import modules (Note: Chrome extensions don't support ES6 imports in content scripts yet,
// so we'll use a different approach - see instructions below)

// Global state
window.recorderState = {
  isListening: false,
  isPlayingBack: false,
  playbackActions: [],
  playbackIndex: 0
};

// Initialize components after scripts are loaded
function initializeComponents() {
  // Set up debug listeners if needed
  if (window.debugManager) {
    window.debugManager.addDebugListeners();
  }
  
  // Initialize state
  chrome.storage.local.get(['isRecording', 'isPlaying'], function(result) {
    console.log('Content script initial state:', result);
    if (result.isRecording && window.recordingManager) {
      window.recordingManager.startListening();
      window.debugManager.addDebugListeners();
    }
  });
  
  // Set up message listener
  if (window.messageHandler) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      return window.messageHandler.handleMessage(request, sender, sendResponse);
    });
  }
}

// Since content scripts don't support ES6 modules directly, we need to ensure
// all component scripts are loaded before initialization
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeComponents);
} else {
  initializeComponents();
}