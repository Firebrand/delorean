// Handles playback functionality in content script
window.playbackManager = {
  startPlayback(actions, startIndex) {
    window.recorderState.isPlayingBack = true;
    window.recorderState.playbackActions = actions;
    window.recorderState.playbackIndex = startIndex;
    
    console.log('Starting playback from index', startIndex);
    console.log('Current URL:', window.location.href);
    console.log('Total actions:', actions.length);
    
    // Get actions for current page starting from the given index
    const currentPageActions = this.getActionsForCurrentPage(startIndex);
    
    if (currentPageActions.length > 0) {
      console.log('Found', currentPageActions.length, 'actions for current page');
      this.playbackPageActions(currentPageActions);
    } else {
      console.log('No actions for current page');
      chrome.runtime.sendMessage({action: 'playbackNextAction'});
    }
  },

  continuePlaybackFromIndex(index) {
    if (!window.recorderState.playbackActions || window.recorderState.playbackActions.length === 0) {
      console.error('No playback actions available');
      return;
    }
    
    window.recorderState.isPlayingBack = true;
    window.recorderState.playbackIndex = index;
    
    console.log('Continuing playback from index', index);
    
    const currentPageActions = this.getActionsForCurrentPage(index);
    
    if (currentPageActions.length > 0) {
      console.log('Found', currentPageActions.length, 'actions for current page');
      this.playbackPageActions(currentPageActions);
    } else {
      console.log('No actions for current page at index', index);
      chrome.runtime.sendMessage({action: 'playbackNextAction'});
    }
  },

  getActionsForCurrentPage(startIndex) {
    const currentUrl = window.location.href;
    const currentPageActions = [];
    
    // Collect all action indices for the current URL starting from startIndex
    for (let i = startIndex; i < window.recorderState.playbackActions.length; i++) {
      if (window.recorderState.playbackActions[i].url === currentUrl) {
        currentPageActions.push(i);
      } else {
        // Stop when we hit a different URL
        break;
      }
    }
    
    return currentPageActions;
  },

  async playbackPageActions(actionIndices) {
    console.log('Playing actions:', actionIndices);
    
    for (let i = 0; i < actionIndices.length; i++) {
      const index = actionIndices[i];
      
      if (!window.recorderState.isPlayingBack) {
        console.log('Playback stopped by user');
        break;
      }
      
      const action = window.recorderState.playbackActions[index];
      console.log(`Executing action ${index + 1}/${window.recorderState.playbackActions.length}:`, action.type, action.selector);
      
      await this.executeAction(action);
      
      // Check if this action might cause navigation
      const mightNavigate = (action.type === 'click' && 
                            (action.inputType === 'submit' || 
                             action.href || 
                             action.value === 'Save' ||
                             action.text?.includes('Save')));
      
      if (mightNavigate && i === actionIndices.length - 1) {
        // This is the last action on the page and might cause navigation
        console.log('Last action might cause navigation, updating index');
        window.recorderState.playbackIndex = index;
        chrome.storage.local.set({playbackIndex: index});
      }
      
      // Variable wait time based on action type
      if (action.selector && action.selector.includes('dropbutton__toggle')) {
        await window.utils.wait(1000);
      } else if (mightNavigate) {
        // Give more time for potential navigation
        await window.utils.wait(2000);
      } else if (action.type === 'input') {
        // Shorter wait after input since we're setting the value all at once
        await window.utils.wait(400);
      } else {
        await window.utils.wait(600);
      }
    }
    
    if (window.recorderState.isPlayingBack) {
      const lastIndex = actionIndices[actionIndices.length - 1];
      window.recorderState.playbackIndex = lastIndex;
      
      // Check if there are more actions
      if (lastIndex < window.recorderState.playbackActions.length - 1) {
        console.log('More actions remaining, checking next action');
        chrome.runtime.sendMessage({action: 'playbackNextAction'});
      } else {
        console.log('All actions completed');
        chrome.runtime.sendMessage({action: 'playbackComplete'});
      }
    }
  },

  async executeAction(action) {
    console.log('Executing action:', action);
    
    try {
      const element = this.findElementByAction(action);
      
      if (!element) {
        console.warn('Element not found with any method:', action);
        return;
      }
      
      await window.actionExecutor.executeClickOnElement(element, action);
      
    } catch (error) {
      console.error('Error executing action:', error);
    }
  },

  findElementByAction(action) {
    let element = null;
    
    // First try the stored selector
    element = document.querySelector(action.selector);
    if (element) return element;
    
    // If selector includes id^= (partial ID match), it's already handled by querySelector
    // But let's also try direct ID lookup with the processed ID
    if (action.id) {
      // Try to find elements whose ID starts with the processed ID
      const allElements = document.querySelectorAll('[id]');
      for (const el of allElements) {
        if (el.id.startsWith(action.id)) {
          console.log(`Found element with ID starting with "${action.id}": ${el.id}`);
          return el;
        }
      }
    }
    
    // Try alternative methods for input buttons
    if (action.tagName === 'INPUT' && action.value) {
      element = Array.from(document.querySelectorAll('input[type="submit"], input[type="button"]'))
        .find(input => input.value === action.value);
      if (element) {
        console.log('Found element using value match');
        return element;
      }
    }
    
    // Try by name attribute
    if (action.name) {
      element = document.querySelector(`${action.tagName.toLowerCase()}[name="${action.name}"]`);
      if (element) {
        console.log('Found element using name attribute');
        return element;
      }
    }
    
    return null;
  },

  stopPlayback() {
    window.recorderState.isPlayingBack = false;
    console.log('Playback stopped');
  }
};