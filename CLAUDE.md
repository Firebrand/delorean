# Web Action Recorder - Project Documentation

## Overview
Web Action Recorder is a Chrome extension that enables users to record and playback user interactions (clicks, typing, etc.) across websites. This documentation provides AI agents with the necessary context to understand and work with the codebase effectively.

## Project Structure

```
Plugy/
├── background/                 # Background script modules
│   ├── message-handler.js     # Handles communication between components
│   ├── playback-manager.js    # Manages playback functionality
│   ├── recording-manager.js   # Manages recording functionality
│   └── state-manager.js       # Manages extension state
├── content/                   # Content script modules
│   ├── action-executor.js     # Executes recorded actions
│   ├── message-handler.js     # Handles messages from background
│   ├── playback-manager.js    # Manages playback in content context
│   ├── recording-manager.js   # Manages recording in content context
│   ├── selector-generator.js  # Generates CSS selectors for elements
│   └── utils.js               # Utility functions
├── background.js              # Main background script
├── content.js                 # Main content script
├── manifest.json              # Extension manifest
├── popup.html                 # Extension popup UI
├── popup.js                   # Popup JavaScript
└── icon.png                   # Extension icon
```

## Core Components

### 1. Background Scripts
- **background.js**: Entry point for the background script, initializes all managers
- **recording-manager.js**: Handles the recording of user actions
- **playback-manager.js**: Manages the playback of recorded actions
- **state-manager.js**: Maintains the extension's state
- **message-handler.js**: Processes messages between background and content scripts

### 2. Content Scripts
- **content.js**: Main content script that coordinates between modules
- **recording-manager.js**: Records user interactions on the page
- **playback-manager.js**: Handles playback of actions in the page context
- **action-executor.js**: Executes specific actions during playback
- **selector-generator.js**: Generates reliable selectors for elements
- **utils.js**: Shared utility functions

### 3. User Interface
- **popup.html**: The extension's popup interface
- **popup.js**: Handles user interactions in the popup

## Key Concepts

### Recording Process
1. User initiates recording via the popup
2. Content script starts listening for user interactions
3. Interactions are recorded with relevant metadata (selectors, timings, etc.)
4. Recorded actions are stored in the extension's storage

### Playback Process
1. User initiates playback via the popup
2. Background script coordinates the playback process
3. Content script receives and executes the recorded actions
4. Actions are executed with appropriate delays to mimic user behavior

### State Management
The extension maintains state in `window.recorderState` (content script) and via `StateManager` (background script). Key states include:
- `isRecording`: Whether recording is in progress
- `isPlaying`: Whether playback is in progress
- `recordedActions`: Array of recorded actions
- `playbackIndex`: Current position during playback

## Message Flow
Communication between background and content scripts is handled through Chrome's message passing API:
- Popup <-> Background: Direct message passing
- Background <-> Content: Tab-based message passing

## Development Notes

### Adding New Action Types
1. Add the action type to `action-executor.js`
2. Update the recording logic in `recording-manager.js`
3. Ensure proper serialization/deserialization in message handlers

### Testing
- Test recording and playback on different types of websites
- Verify that selectors remain reliable across page reloads
- Test with various form inputs and interactive elements

### Performance Considerations
- Be mindful of memory usage when recording many actions
- Optimize selector generation for reliability and performance
- Implement proper cleanup of event listeners

## Common Tasks

### Debugging
- Check the browser's developer console for logs
- Use `console.log` statements in content scripts (visible in the page's console)
- Inspect background script logs in Chrome's extension debugger

### Extending Functionality
1. Add new action types to `action-executor.js`
2. Update the popup UI for any new features
3. Ensure proper state management for new features

## Dependencies
- Chrome Extensions API
- No external dependencies required

## Browser Compatibility
- Chrome (latest version)
- Should be compatible with other Chromium-based browsers

## Security Considerations
- The extension requires broad permissions (`<all_urls>`) to function
- User data is stored locally in the browser's storage
- No data is sent to external servers

## Future Enhancements
1. Add support for more interaction types
2. Implement action editing capabilities
3. Add export/import functionality for recorded actions
4. Improve selector reliability for dynamic content
5. Add visual feedback during recording and playback
