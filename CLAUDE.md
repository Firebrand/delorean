# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Web Action Recorder - Chrome Extension

## Overview
A Chrome extension that records and replays user interactions (clicks, typing, form inputs) across websites. Built with vanilla JavaScript using Chrome Extensions Manifest V3.

## Quick Start

### Installation & Development
1. **Install the extension:**
   ```bash
   # No build required - this is vanilla JavaScript
   # 1. Open Chrome and go to chrome://extensions/
   # 2. Enable "Developer mode" (top right)
   # 3. Click "Load unpacked"
   # 4. Select this directory
   ```

2. **Development workflow:**
   - Edit source files
   - Refresh extension in chrome://extensions/
   - Test changes on web pages

3. **Debugging:**
   - **Content scripts**: Open DevTools on target webpage
   - **Background script**: Click "service worker" in chrome://extensions/
   - **Popup**: Right-click extension icon → "Inspect popup"

## Architecture

The extension follows a modular architecture with three main contexts:

### 1. Background Service Worker (`background.js` + modules)
Coordinates all extension activities:
- **StateManager**: Maintains global extension state
- **RecordingManager**: Handles recording logic and storage
- **PlaybackManager**: Manages playback execution across tabs
- **MessageHandler**: Routes messages between components

### 2. Content Scripts (`content.js` + modules)
Injected into web pages to interact with DOM:
- **RecordingManager**: Captures user interactions
- **PlaybackManager**: Executes actions on the page
- **ActionExecutor**: Performs specific action types (click, type, etc.)
- **SelectorGenerator**: Creates reliable CSS selectors
- **Utils**: Shared utilities (visual feedback, ID handling)

### 3. Popup UI (`popup.html/js`)
Simple control interface for users

## Message Flow

```
Popup ←→ Background ←→ Content Scripts
         (via Chrome     (per tab)
          runtime API)
```

Key messages:
- `startRecording`/`stopRecording`
- `startPlayback`/`stopPlayback`
- `recordAction`/`executeAction`
- `getState`/`stateChanged`

## Important Implementation Details

### Dynamic ID Handling
The extension strips suffixes after `--` in element IDs to handle dynamically generated IDs:
```javascript
// content/utils.js:stripDynamicIdSuffix()
// Converts "button--12345" → "button"
```

### Selector Generation Priority
1. ID (if not dynamic)
2. Data attributes
3. CSS path with optimizations

### Visual Feedback
- **Recording**: Red ripple effect on clicks
- **Playback**: Green outline on target elements

### Storage
- Uses Chrome storage API
- Recordings include metadata (timestamp, URL, user agent)
- Import/export as JSON files

## Common Development Tasks

### Adding New Action Types
1. Add handler in `content/action-executor.js`
2. Update recording logic in `content/recording-manager.js`
3. Ensure proper serialization in message handlers

### Testing Scenarios
- Test on sites with dynamic content
- Verify cross-origin navigation during playback
- Test form inputs with various types
- Ensure selector reliability after page reloads

### Performance Considerations
- Event listeners use capture phase for reliability
- Cleanup listeners when recording stops
- Limit stored actions to prevent memory issues

## Current Features
- Click recording/playback
- Text input recording/playback
- Form element interactions
- Cross-page navigation support
- Import/export recordings
- Visual feedback during record/playback

## Known Limitations
- Requires broad permissions (`<all_urls>`)
- No automated tests
- Limited to user-initiated actions
- May have issues with heavily dynamic SPAs

## Recent Development Focus
Based on git history, recent work has centered on:
- Modularizing the codebase for better maintainability
- Improving dropdown menu and dynamic element handling
- Adding import/export functionality
- Enhancing playback reliability with navigation handling