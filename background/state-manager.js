// Manages the global state and storage
export class StateManager {
    constructor() {
      this.isRecording = false;
      this.isPlaying = false;
      this.recordedActions = [];
      this.playbackIndex = 0;
      this.playbackTabId = null;
    }
  
    initialize() {
      chrome.storage.local.get(['isRecording', 'isPlaying', 'recordedActions', 'playbackIndex'], (result) => {
        this.isRecording = result.isRecording || false;
        this.isPlaying = result.isPlaying || false;
        this.recordedActions = result.recordedActions || [];
        this.playbackIndex = result.playbackIndex || 0;
      });
    }
  
    setRecording(value) {
      this.isRecording = value;
      chrome.storage.local.set({ isRecording: value });
    }
  
    setPlaying(value) {
      this.isPlaying = value;
      chrome.storage.local.set({ isPlaying: value });
    }
  
    setRecordedActions(actions) {
      this.recordedActions = actions;
      chrome.storage.local.set({ recordedActions: actions });
    }
  
    addRecordedAction(action) {
      this.recordedActions.push(action);
      chrome.storage.local.set({ recordedActions: this.recordedActions });
    }
  
    setPlaybackIndex(index) {
      this.playbackIndex = index;
      chrome.storage.local.set({ playbackIndex: index });
    }
  
    setPlaybackTabId(tabId) {
      this.playbackTabId = tabId;
    }
  
    resetPlaybackState() {
      this.playbackIndex = 0;
      this.playbackTabId = null;
      chrome.storage.local.set({ playbackIndex: 0 });
    }
  
    clearRecording() {
      this.recordedActions = [];
      chrome.storage.local.remove(['recordedActions']);
    }
  }