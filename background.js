// Main background script that coordinates between modules
import { RecordingManager } from './background/recording-manager.js';
import { PlaybackManager } from './background/playback-manager.js';
import { StateManager } from './background/state-manager.js';
import { MessageHandler } from './background/message-handler.js';

// Initialize managers
const stateManager = new StateManager();
const recordingManager = new RecordingManager(stateManager);
const playbackManager = new PlaybackManager(stateManager);
const messageHandler = new MessageHandler(recordingManager, playbackManager, stateManager);

// Initialize state from storage
stateManager.initialize();

// Set up message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  return messageHandler.handleMessage(request, sender, sendResponse);
});