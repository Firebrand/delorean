let isRecording = false;
let isPlaying = false;
let recordedActions = [];
let playbackIndex = 0;

// Initialize state from storage
chrome.storage.local.get(['isRecording', 'isPlaying', 'recordedActions'], function(result) {
  isRecording = result.isRecording || false;
  isPlaying = result.isPlaying || false;
  recordedActions = result.recordedActions || [];
});

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log('Background received message:', request.action);
  
  switch(request.action) {
    case 'startRecording':
      startRecording();
      sendResponse({success: true});
      break;
      
    case 'stopRecording':
      stopRecording();
      sendResponse({success: true});
      break;
      
    case 'startPlayback':
      startPlayback();
      sendResponse({success: true});
      break;
      
    case 'stopPlayback':
      stopPlayback();
      sendResponse({success: true});
      break;
      
    case 'recordAction':
      if (isRecording) {
        recordAction(request.data, sender.tab);
      }
      sendResponse({success: true});
      break;
      
    case 'playbackNextAction':
      playNextAction();
      sendResponse({success: true});
      break;
      
    case 'playbackComplete':
      completePlayback();
      sendResponse({success: true});
      break;
  }
  return true;
});

function startRecording() {
  isRecording = true;
  recordedActions = [];
  chrome.storage.local.set({
    isRecording: true,
    recordedActions: []
  });
  
  console.log('Background: Starting recording');
  
  // Inject content script into active tab if needed, then start listening
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    if (tabs[0]) {
      chrome.scripting.executeScript({
        target: {tabId: tabs[0].id},
        files: ['content.js']
      }, function() {
        // After injection (or if already injected), send the message
        chrome.tabs.sendMessage(tabs[0].id, {action: 'startListening'}, function(response) {
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

function stopRecording() {
  isRecording = false;
  chrome.storage.local.set({
    isRecording: false,
    recordedActions: recordedActions
  });
  
  // Notify all tabs to stop listening
  chrome.tabs.query({}, function(tabs) {
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, {action: 'stopListening'}).catch(() => {});
    });
  });
}

function recordAction(actionData, tab) {
  const action = {
    ...actionData,
    url: tab.url,
    timestamp: Date.now(),
    tabId: tab.id
  };
  
  recordedActions.push(action);
  chrome.storage.local.set({recordedActions: recordedActions});
  
  console.log('Recorded action:', action);
}

function startPlayback() {
  if (recordedActions.length === 0) {
    chrome.runtime.sendMessage({
      action: 'playbackError',
      error: 'No recording to playback'
    });
    return;
  }
  
  isPlaying = true;
  playbackIndex = 0;
  chrome.storage.local.set({isPlaying: true});
  
  // Group actions by URL to handle navigation
  const firstAction = recordedActions[0];
  
  // Navigate to the first URL if needed
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    const currentTab = tabs[0];
    if (currentTab.url !== firstAction.url) {
      chrome.tabs.update(currentTab.id, {url: firstAction.url}, function() {
        // Wait for page to load before starting playback
        chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
          if (tabId === currentTab.id && info.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(listener);
            setTimeout(() => {
              startPlaybackOnTab(currentTab.id);
            }, 1000);
          }
        });
      });
    } else {
      startPlaybackOnTab(currentTab.id);
    }
  });
}

function startPlaybackOnTab(tabId) {
  chrome.tabs.sendMessage(tabId, {
    action: 'startPlayback',
    actions: recordedActions,
    startIndex: playbackIndex
  });
}

function playNextAction() {
  playbackIndex++;
  
  if (playbackIndex >= recordedActions.length) {
    completePlayback();
    return;
  }
  
  const currentAction = recordedActions[playbackIndex];
  const previousAction = recordedActions[playbackIndex - 1];
  
  // Check if we need to navigate to a new page
  if (currentAction.url !== previousAction.url) {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      const currentTab = tabs[0];
      chrome.tabs.update(currentTab.id, {url: currentAction.url}, function() {
        // Wait for page to load
        chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
          if (tabId === currentTab.id && info.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(listener);
            setTimeout(() => {
              startPlaybackOnTab(currentTab.id);
            }, 1000);
          }
        });
      });
    });
  }
}

function stopPlayback() {
  console.log('Stopping playback...');
  isPlaying = false;
  playbackIndex = 0;
  chrome.storage.local.set({isPlaying: false});
  
  // Notify content script to stop
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, {action: 'stopPlayback'}).catch(() => {});
    }
  });
  
  // Notify popup
  chrome.runtime.sendMessage({action: 'playbackStopped'}).catch(() => {});
}

function completePlayback() {
  isPlaying = false;
  playbackIndex = 0;
  chrome.storage.local.set({isPlaying: false});
  
  // Notify popup
  chrome.runtime.sendMessage({action: 'playbackComplete'});
  
  // Notify content script
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {action: 'stopPlayback'});
  });
}