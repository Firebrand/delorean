let isRecording = false;
let isPlaying = false;
let recordedActions = [];
let playbackIndex = 0;
let playbackTabId = null;
let navigationListener = null;

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
      
    case 'navigationOccurred':
      if (isPlaying && sender.tab.id === playbackTabId) {
        handleNavigationDuringPlayback();
      }
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
  chrome.storage.local.set({
    isPlaying: true,
    playbackIndex: 0
  });
  
  // Group actions by URL to handle navigation
  const firstAction = recordedActions[0];
  
  // Navigate to the first URL if needed
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    const currentTab = tabs[0];
    playbackTabId = currentTab.id;
    
    // Set up navigation listener for the playback tab
    setupNavigationListener();
    
    if (currentTab.url !== firstAction.url) {
      chrome.tabs.update(currentTab.id, {url: firstAction.url}, function() {
        // The navigation listener will handle the rest
      });
    } else {
      // Already on the right page, start playback
      injectAndStartPlayback(currentTab.id);
    }
  });
}

function setupNavigationListener() {
  // Remove any existing listener
  if (navigationListener) {
    chrome.webNavigation.onCompleted.removeListener(navigationListener);
  }
  
  // Add navigation listener for the playback tab
  navigationListener = function(details) {
    if (details.tabId === playbackTabId && details.frameId === 0) {
      console.log('Navigation completed for playback tab:', details.url);
      
      // Small delay to ensure page is ready
      setTimeout(() => {
        if (isPlaying) {
          injectAndStartPlayback(playbackTabId);
        }
      }, 1000);
    }
  };
  
  chrome.webNavigation.onCompleted.addListener(navigationListener);
}

function injectAndStartPlayback(tabId) {
  // First inject the content script
  chrome.scripting.executeScript({
    target: {tabId: tabId},
    files: ['content.js']
  }, function() {
    if (chrome.runtime.lastError) {
      console.error('Error injecting content script:', chrome.runtime.lastError);
      return;
    }
    
    // Then start playback
    setTimeout(() => {
      startPlaybackOnTab(tabId);
    }, 500);
  });
}

function startPlaybackOnTab(tabId) {
  console.log('Starting playback on tab', tabId, 'from index', playbackIndex);
  
  // Send the full recording and current index
  chrome.tabs.sendMessage(tabId, {
    action: 'startPlayback',
    actions: recordedActions,
    startIndex: playbackIndex
  }, function(response) {
    if (chrome.runtime.lastError) {
      console.error('Error starting playback:', chrome.runtime.lastError);
    }
  });
}

function playNextAction() {
  playbackIndex++;
  
  // Store the updated index
  chrome.storage.local.set({playbackIndex: playbackIndex});
  
  if (playbackIndex >= recordedActions.length) {
    completePlayback();
    return;
  }
  
  const currentAction = recordedActions[playbackIndex];
  const previousAction = recordedActions[playbackIndex - 1];
  
  console.log('Playing next action:', playbackIndex, currentAction);
  
  // Check if we need to navigate to a new page
  if (currentAction.url !== previousAction.url) {
    console.log('Navigation required from', previousAction.url, 'to', currentAction.url);
    
    // Navigate to the new URL
    chrome.tabs.update(playbackTabId, {url: currentAction.url}, function() {
      // The navigation listener will handle continuing playback
      console.log('Navigation initiated, waiting for page load...');
    });
  } else {
    // Same page, continue playback
    console.log('Same page, continuing playback');
    chrome.tabs.sendMessage(playbackTabId, {
      action: 'continuePlayback',
      actionIndex: playbackIndex
    });
  }
}

function handleNavigationDuringPlayback() {
  console.log('Navigation detected during playback');
  // Navigation listener will handle reinjection and continuation
}

function stopPlayback() {
  console.log('Stopping playback...');
  isPlaying = false;
  playbackIndex = 0;
  playbackTabId = null;
  
  chrome.storage.local.set({
    isPlaying: false,
    playbackIndex: 0
  });
  
  // Remove navigation listener
  if (navigationListener) {
    chrome.webNavigation.onCompleted.removeListener(navigationListener);
    navigationListener = null;
  }
  
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
  console.log('Playback completed');
  isPlaying = false;
  playbackIndex = 0;
  playbackTabId = null;
  
  chrome.storage.local.set({
    isPlaying: false,
    playbackIndex: 0
  });
  
  // Remove navigation listener
  if (navigationListener) {
    chrome.webNavigation.onCompleted.removeListener(navigationListener);
    navigationListener = null;
  }
  
  // Notify popup
  chrome.runtime.sendMessage({action: 'playbackComplete'});
  
  // Notify content script
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, {action: 'stopPlayback'}).catch(() => {});
    }
  });
}