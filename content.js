console.log('Content script loaded on:', window.location.href);

let isListening = false;
let isPlayingBack = false;
let playbackActions = [];
let playbackIndex = 0;

// Add debugging for all events on the page
function addDebugListeners() {
  if (!window.debugListenersAdded) {
    window.debugListenersAdded = true;
    
    // Monitor all clicks globally
    document.addEventListener('click', function(e) {
      if (e.target.tagName === 'INPUT' && e.target.type === 'submit') {
        console.log('[DEBUG] Global click captured on submit:', e.target.value, 'Event stopped:', e.defaultPrevented);
      }
    }, true);
    
    // Monitor all mousedowns
    document.addEventListener('mousedown', function(e) {
      if (e.target.tagName === 'INPUT' && e.target.type === 'submit') {
        console.log('[DEBUG] Global mousedown on submit:', e.target.value);
      }
    }, true);
    
    // Monitor all submits
    document.addEventListener('submit', function(e) {
      console.log('[DEBUG] Form submit event:', e.target, 'Submitter:', e.submitter);
    }, true);
  }
}

// Initialize state
chrome.storage.local.get(['isRecording', 'isPlaying'], function(result) {
  console.log('Content script initial state:', result);
  if (result.isRecording) {
    startListening();
    addDebugListeners();
  }
  if (result.isPlaying) {
    // Will be handled by background script message
  }
});

// Listen for messages from background script
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log('Content script received message:', request.action);
  switch(request.action) {
    case 'startListening':
      startListening();
      addDebugListeners();
      sendResponse({success: true});
      break;
    case 'stopListening':
      stopListening();
      sendResponse({success: true});
      break;
    case 'startPlayback':
      startPlayback(request.actions, request.startIndex || 0);
      sendResponse({success: true});
      break;
    case 'stopPlayback':
      stopPlayback();
      sendResponse({success: true});
      break;
  }
  return true;
});

function startListening() {
  if (isListening) return;
  
  isListening = true;
  console.log('Started listening for actions');
  
  // Add event listeners with capture phase to catch events before they're stopped
  document.addEventListener('click', recordClick, true);
  document.addEventListener('mousedown', recordMouseDown, true);
  document.addEventListener('submit', recordSubmit, true);
  document.addEventListener('input', recordInput, true);
  document.addEventListener('change', recordInput, true);
}

function stopListening() {
  isListening = false;
  console.log('Stopped listening for actions');
  
  // Remove event listeners
  document.removeEventListener('click', recordClick, true);
  document.removeEventListener('mousedown', recordMouseDown, true);
  document.removeEventListener('submit', recordSubmit, true);
  document.removeEventListener('input', recordInput, true);
  document.removeEventListener('change', recordInput, true);
}

function recordMouseDown(event) {
  if (!isListening) return;
  
  const target = event.target;
  
  // Only record mousedown on submit buttons as backup
  if (target.tagName === 'INPUT' && (target.type === 'submit' || target.type === 'button')) {
    console.log('MouseDown detected on submit button:', target.value);
    
    // Check if we should record this as a click
    setTimeout(() => {
      // If no click event fired within 100ms, record this mousedown as a click
      if (!target.dataset.clickRecorded) {
        console.log('No click event detected, recording mousedown as click for:', target.value);
        recordClickAction(target, event);
      }
      delete target.dataset.clickRecorded;
    }, 100);
  }
}

function recordSubmit(event) {
  if (!isListening) return;
  
  console.log('Form submit detected');
  const form = event.target;
  const submitButton = form.querySelector('input[type="submit"]:focus') || 
                      document.activeElement;
  
  if (submitButton && submitButton.type === 'submit') {
    console.log('Recording submit button click:', submitButton.value);
    recordClickAction(submitButton, event);
  }
}

function recordClick(event) {
  if (!isListening) return;
  
  const target = event.target;
  console.log('Click event on:', target.tagName, target.id || target.className, 'Value:', target.value);
  
  // Mark that click was recorded to prevent duplicate from mousedown
  if (target.tagName === 'INPUT' && target.type === 'submit') {
    target.dataset.clickRecorded = 'true';
  }
  
  recordClickAction(target, event);
}

function recordClickAction(target, event) {
  const selector = getUniqueSelector(target);
  
  const actionData = {
    type: 'click',
    selector: selector,
    tagName: target.tagName,
    text: target.textContent.substring(0, 100),
    value: target.value || '',
    href: target.href || '',
    inputType: target.type || '',
    id: target.id || '',
    name: target.name || '',
    className: target.className || '',
    position: {
      x: event.clientX,
      y: event.clientY
    }
  };
  
  console.log('Recording action:', actionData);
  
  chrome.runtime.sendMessage({
    action: 'recordAction',
    data: actionData
  }, function(response) {
    if (chrome.runtime.lastError) {
      console.error('Error sending click:', chrome.runtime.lastError);
    } else {
      console.log('Action recorded successfully');
    }
  });
  
  // Visual feedback
  showClickFeedback(event.clientX, event.clientY);
}

function recordInput(event) {
  if (!isListening) return;
  
  const target = event.target;
  const selector = getUniqueSelector(target);
  
  const actionData = {
    type: 'input',
    selector: selector,
    tagName: target.tagName,
    inputType: target.type || 'text',
    value: target.value,
    checked: target.checked
  };
  
  chrome.runtime.sendMessage({
    action: 'recordAction',
    data: actionData
  });
}

function getUniqueSelector(element) {
  // Try ID first
  if (element.id) {
    return `#${element.id}`;
  }
  
  // For input elements with value, create a specific selector
  if (element.tagName === 'INPUT' && element.value) {
    // Try to use value as primary identifier
    const valueSelector = `input[value="${element.value}"]`;
    if (document.querySelectorAll(valueSelector).length === 1) {
      return valueSelector;
    }
    
    // Try with type and value
    const typeValueSelector = `input[type="${element.type}"][value="${element.value}"]`;
    if (document.querySelectorAll(typeValueSelector).length === 1) {
      return typeValueSelector;
    }
  }
  
  // Try unique attributes
  const attributes = ['name', 'data-drupal-selector', 'data-test', 'data-testid', 'aria-label'];
  for (const attr of attributes) {
    if (element.hasAttribute(attr)) {
      const value = element.getAttribute(attr);
      const selector = `${element.tagName.toLowerCase()}[${attr}="${value}"]`;
      if (document.querySelectorAll(selector).length === 1) {
        return selector;
      }
    }
  }
  
  // Build a path selector
  const path = [];
  let current = element;
  
  while (current && current.tagName) {
    let selector = current.tagName.toLowerCase();
    
    if (current.className && typeof current.className === 'string') {
      const classes = current.className.split(' ')
        .filter(c => c.trim() && !c.startsWith('js-') && !c.includes('drupal'))
        .slice(0, 2); // Limit to 2 classes to avoid over-specific selectors
      if (classes.length > 0) {
        selector += '.' + classes.join('.');
      }
    }
    
    // Add nth-child if needed
    if (current.parentElement) {
      const siblings = Array.from(current.parentElement.children);
      const index = siblings.indexOf(current);
      if (siblings.filter(s => s.tagName === current.tagName).length > 1) {
        selector += `:nth-child(${index + 1})`;
      }
    }
    
    path.unshift(selector);
    
    // Stop if we have a unique selector
    if (document.querySelectorAll(path.join(' > ')).length === 1) {
      break;
    }
    
    current = current.parentElement;
  }
  
  return path.join(' > ');
}

function showClickFeedback(x, y) {
  const dot = document.createElement('div');
  dot.style.cssText = `
    position: fixed;
    left: ${x - 10}px;
    top: ${y - 10}px;
    width: 20px;
    height: 20px;
    background: rgba(255, 0, 0, 0.5);
    border: 2px solid red;
    border-radius: 50%;
    pointer-events: none;
    z-index: 999999;
    animation: ripple 0.6s ease-out;
  `;
  
  const style = document.createElement('style');
  style.textContent = `
    @keyframes ripple {
      0% { transform: scale(1); opacity: 1; }
      100% { transform: scale(3); opacity: 0; }
    }
  `;
  
  document.head.appendChild(style);
  document.body.appendChild(dot);
  
  setTimeout(() => {
    dot.remove();
    style.remove();
  }, 600);
}

// Playback functions
function startPlayback(actions, startIndex) {
  isPlayingBack = true;
  playbackActions = actions;
  playbackIndex = startIndex;
  
  console.log('Starting playback from index', startIndex);
  
  // Filter actions for current URL
  const currentUrl = window.location.href;
  const currentPageActions = [];
  
  for (let i = startIndex; i < actions.length; i++) {
    if (actions[i].url === currentUrl) {
      currentPageActions.push(i);
    } else {
      break; // Stop when we hit a different URL
    }
  }
  
  if (currentPageActions.length > 0) {
    playbackPageActions(currentPageActions);
  } else {
    console.log('No actions for current page');
    chrome.runtime.sendMessage({action: 'playbackNextAction'});
  }
}

async function playbackPageActions(actionIndices) {
  for (const index of actionIndices) {
    if (!isPlayingBack) {
      console.log('Playback stopped by user');
      break;
    }
    
    const action = playbackActions[index];
    await executeAction(action);
    
    // Wait between actions
    await wait(1000);
  }
  
  if (isPlayingBack) {
    // Check if there are more actions
    const lastIndex = actionIndices[actionIndices.length - 1];
    if (lastIndex < playbackActions.length - 1) {
      chrome.runtime.sendMessage({action: 'playbackNextAction'});
    } else {
      chrome.runtime.sendMessage({action: 'playbackComplete'});
    }
  }
}

async function executeAction(action) {
  console.log('Executing action:', action);
  
  try {
    const element = document.querySelector(action.selector);
    
    if (!element) {
      console.warn('Element not found:', action.selector);
      // Try alternative selectors for input buttons
      if (action.tagName === 'INPUT' && action.value) {
        const altElement = Array.from(document.querySelectorAll('input[type="submit"], input[type="button"]'))
          .find(input => input.value === action.value);
        if (altElement) {
          console.log('Found element using alternative method');
          await executeClickOnElement(altElement, action);
          return;
        }
      }
      return;
    }
    
    await executeClickOnElement(element, action);
    
  } catch (error) {
    console.error('Error executing action:', error);
  }
}

async function executeClickOnElement(element, action) {
  // Scroll element into view
  element.scrollIntoView({behavior: 'smooth', block: 'center'});
  await wait(300);
  
  // Highlight element
  highlightElement(element);
  
  if (action.type === 'click') {
    // For dropdowns, ensure parent is expanded first
    const dropdown = element.closest('.dropbutton');
    if (dropdown && element.closest('.secondary-action')) {
      console.log('Element is in dropdown, checking if expanded...');
      const toggle = dropdown.querySelector('.dropbutton__toggle button');
      if (toggle) {
        // Check if dropdown is collapsed
        const isCollapsed = !dropdown.classList.contains('open') && 
                          !element.offsetParent;
        if (isCollapsed) {
          console.log('Expanding dropdown first...');
          toggle.click();
          await wait(500);
        }
      }
    }
    
    // Ensure element is visible and enabled
    if (!element.offsetParent) {
      console.warn('Element is not visible');
      return;
    }
    
    if (element.disabled) {
      console.warn('Element is disabled');
      return;
    }
    
    console.log('Clicking element...');
    
    // Try multiple click methods
    // Method 1: Focus and click
    if (element.focus) {
      element.focus();
      await wait(100);
    }
    
    // Method 2: Direct click
    element.click();
    
    // Method 3: Dispatch mouse events
    const clickEvent = new MouseEvent('click', {
      view: window,
      bubbles: true,
      cancelable: true,
      clientX: action.position?.x || element.getBoundingClientRect().left + 10,
      clientY: action.position?.y || element.getBoundingClientRect().top + 10
    });
    element.dispatchEvent(clickEvent);
    
    // For submit inputs, also try submitting the form
    if (element.tagName === 'INPUT' && element.type === 'submit') {
      console.log('Submit button clicked, checking for form submission...');
      const form = element.closest('form');
      if (form && !form.hasAttribute('data-drupal-ajax-submit')) {
        // Don't submit AJAX forms this way
        console.log('Standard form found, letting natural submission occur');
      }
    }
    
  } else if (action.type === 'input') {
    // Clear and set value
    element.focus();
    element.value = '';
    
    // Type character by character for better simulation
    for (const char of action.value) {
      element.value += char;
      element.dispatchEvent(new Event('input', {bubbles: true}));
      await wait(50);
    }
    
    element.dispatchEvent(new Event('change', {bubbles: true}));
    
    // Handle checkboxes/radios
    if (action.inputType === 'checkbox' || action.inputType === 'radio') {
      element.checked = action.checked;
      element.dispatchEvent(new Event('change', {bubbles: true}));
    }
  }
}

function highlightElement(element) {
  const originalOutline = element.style.outline;
  element.style.outline = '3px solid #00ff00';
  
  setTimeout(() => {
    element.style.outline = originalOutline;
  }, 500);
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function stopPlayback() {
  isPlayingBack = false;
  console.log('Playback stopped');
}