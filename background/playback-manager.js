// Handles all playback-related functionality
export class PlaybackManager {
    constructor(stateManager) {
      this.stateManager = stateManager;
      this.navigationListener = null;
    }
  
    startPlayback() {
      const recordedActions = this.stateManager.recordedActions;
      
      if (recordedActions.length === 0) {
        chrome.runtime.sendMessage({
          action: 'playbackError',
          error: 'No recording to playback'
        });
        return;
      }
      
      this.stateManager.setPlaying(true);
      this.stateManager.setPlaybackIndex(0);
      
      const firstAction = recordedActions[0];
      
      // Navigate to the first URL if needed
      chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        const currentTab = tabs[0];
        this.stateManager.setPlaybackTabId(currentTab.id);
        
        // Set up navigation listener for the playback tab
        this.setupNavigationListener();
        
        if (currentTab.url !== firstAction.url) {
          chrome.tabs.update(currentTab.id, {url: firstAction.url}, () => {
            // The navigation listener will handle the rest
          });
        } else {
          // Already on the right page, start playback
          this.injectAndStartPlayback(currentTab.id);
        }
      });
    }
  
    setupNavigationListener() {
      // Remove any existing listener
      if (this.navigationListener) {
        chrome.webNavigation.onCompleted.removeListener(this.navigationListener);
      }
      
      // Add navigation listener for the playback tab
      this.navigationListener = (details) => {
        const playbackTabId = this.stateManager.playbackTabId;
        if (details.tabId === playbackTabId && details.frameId === 0) {
          console.log('Navigation completed for playback tab:', details.url);
          
          // Small delay to ensure page is ready
          setTimeout(() => {
            if (this.stateManager.isPlaying) {
              this.injectAndStartPlayback(playbackTabId);
            }
          }, 1000);
        }
      };
      
      chrome.webNavigation.onCompleted.addListener(this.navigationListener);
    }
  
    injectAndStartPlayback(tabId) {
      // First inject the content script
      chrome.scripting.executeScript({
        target: {tabId: tabId},
        files: ['content.js']
      }, () => {
        if (chrome.runtime.lastError) {
          console.error('Error injecting content script:', chrome.runtime.lastError);
          return;
        }
        
        // Then start playback
        setTimeout(() => {
          this.startPlaybackOnTab(tabId);
        }, 500);
      });
    }
  
    startPlaybackOnTab(tabId) {
      const playbackIndex = this.stateManager.playbackIndex;
      console.log('Starting playback on tab', tabId, 'from index', playbackIndex);
      
      // Send the full recording and current index
      chrome.tabs.sendMessage(tabId, {
        action: 'startPlayback',
        actions: this.stateManager.recordedActions,
        startIndex: playbackIndex
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Error starting playback:', chrome.runtime.lastError);
        }
      });
    }
  
    playNextAction() {
      const newIndex = this.stateManager.playbackIndex + 1;
      this.stateManager.setPlaybackIndex(newIndex);
      
      const recordedActions = this.stateManager.recordedActions;
      
      if (newIndex >= recordedActions.length) {
        this.completePlayback();
        return;
      }
      
      const currentAction = recordedActions[newIndex];
      const previousAction = recordedActions[newIndex - 1];
      
      console.log('Playing next action:', newIndex, currentAction);
      
      // Check if we need to navigate to a new page
      if (currentAction.url !== previousAction.url) {
        console.log('Navigation required from', previousAction.url, 'to', currentAction.url);
        
        // Navigate to the new URL
        chrome.tabs.update(this.stateManager.playbackTabId, {url: currentAction.url}, () => {
          // The navigation listener will handle continuing playback
          console.log('Navigation initiated, waiting for page load...');
        });
      } else {
        // Same page, continue playback
        console.log('Same page, continuing playback');
        chrome.tabs.sendMessage(this.stateManager.playbackTabId, {
          action: 'continuePlayback',
          actionIndex: newIndex
        });
      }
    }
  
    stopPlayback() {
      console.log('Stopping playback...');
      this.stateManager.setPlaying(false);
      this.stateManager.resetPlaybackState();
      
      // Remove navigation listener
      if (this.navigationListener) {
        chrome.webNavigation.onCompleted.removeListener(this.navigationListener);
        this.navigationListener = null;
      }
      
      // Notify content script to stop
      chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, {action: 'stopPlayback'}).catch(() => {});
        }
      });
      
      // Notify popup
      chrome.runtime.sendMessage({action: 'playbackStopped'}).catch(() => {});
    }
  
    completePlayback() {
      console.log('Playback completed');
      this.stateManager.setPlaying(false);
      this.stateManager.resetPlaybackState();
      
      // Remove navigation listener
      if (this.navigationListener) {
        chrome.webNavigation.onCompleted.removeListener(this.navigationListener);
        this.navigationListener = null;
      }
      
      // Notify popup
      chrome.runtime.sendMessage({action: 'playbackComplete'});
      
      // Notify content script
      chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, {action: 'stopPlayback'}).catch(() => {});
        }
      });
    }
  }