// Handles recording functionality in content script
window.recordingManager = {
  inputDebounceTimers: new Map(), // Store debounce timers for each input element
  
  startListening() {
    if (window.recorderState.isListening) return;
    
    window.recorderState.isListening = true;
    console.log('Started listening for actions');
    
    // Add event listeners with capture phase to catch events before they're stopped
    document.addEventListener('click', this.recordClick, true);
    document.addEventListener('mousedown', this.recordMouseDown, true);
    document.addEventListener('submit', this.recordSubmit, true);
    document.addEventListener('input', this.recordInput, true);
    document.addEventListener('change', this.recordInput, true);
    document.addEventListener('focusout', this.recordFocusOut, true);
  },

  stopListening() {
    window.recorderState.isListening = false;
    console.log('Stopped listening for actions');
    
    // Clear any pending input timers
    for (const timer of this.inputDebounceTimers.values()) {
      clearTimeout(timer);
    }
    this.inputDebounceTimers.clear();
    
    // Remove event listeners
    document.removeEventListener('click', this.recordClick, true);
    document.removeEventListener('mousedown', this.recordMouseDown, true);
    document.removeEventListener('submit', this.recordSubmit, true);
    document.removeEventListener('input', this.recordInput, true);
    document.removeEventListener('change', this.recordInput, true);
    document.removeEventListener('focusout', this.recordFocusOut, true);
  },

  recordMouseDown(event) {
    if (!window.recorderState.isListening) return;
    
    const target = event.target;
    
    // Only record mousedown on submit buttons as backup
    if (target.tagName === 'INPUT' && (target.type === 'submit' || target.type === 'button')) {
      console.log('MouseDown detected on submit button:', target.value);
      
      // Check if we should record this as a click
      setTimeout(() => {
        // If no click event fired within 100ms, record this mousedown as a click
        if (!target.dataset.clickRecorded) {
          console.log('No click event detected, recording mousedown as click for:', target.value);
          window.recordingManager.recordClickAction(target, event);
        }
        delete target.dataset.clickRecorded;
      }, 100);
    }
  },

  recordSubmit(event) {
    if (!window.recorderState.isListening) return;
    
    console.log('Form submit detected');
    const form = event.target;
    const submitButton = form.querySelector('input[type="submit"]:focus') || 
                        document.activeElement;
    
    if (submitButton && submitButton.type === 'submit') {
      console.log('Recording submit button click:', submitButton.value);
      window.recordingManager.recordClickAction(submitButton, event);
    }
  },

  recordClick(event) {
    if (!window.recorderState.isListening) return;
    
    const target = event.target;
    console.log('Click event on:', target.tagName, target.id || target.className, 'Value:', target.value);
    
    // Mark that click was recorded to prevent duplicate from mousedown
    if (target.tagName === 'INPUT' && target.type === 'submit') {
      target.dataset.clickRecorded = 'true';
    }
    
    window.recordingManager.recordClickAction(target, event);
  },

  recordClickAction(target, event) {
    const selector = window.selectorGenerator.getUniqueSelector(target);
    
    // Process ID to remove everything after double dash
    let processedId = target.id || '';
    if (processedId && processedId.includes('--')) {
      processedId = processedId.split('--')[0];
    }
    
    const actionData = {
      type: 'click',
      selector: selector,
      tagName: target.tagName,
      text: target.textContent.substring(0, 100),
      value: target.value || '',
      href: target.href || '',
      inputType: target.type || '',
      id: processedId, // Store the processed ID
      originalId: target.id || '', // Store original for debugging
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
    window.visualFeedback.showClickFeedback(event.clientX, event.clientY);
  },

  recordInput(event) {
    if (!window.recorderState.isListening) return;
    
    const target = event.target;
    
    // Only handle text-like inputs and textareas
    if (!((target.tagName === 'INPUT' && ['text', 'email', 'password', 'search', 'tel', 'url', 'number'].includes(target.type)) ||
          target.tagName === 'TEXTAREA')) {
      // For checkboxes, radios, selects, etc., record immediately
      if (target.tagName === 'INPUT' && ['checkbox', 'radio'].includes(target.type)) {
        window.recordingManager.recordInputAction(target);
      }
      return;
    }
    
    // Clear existing timer for this element
    const existingTimer = window.recordingManager.inputDebounceTimers.get(target);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    
    // Set a new timer to record after user stops typing
    const timer = setTimeout(() => {
      window.recordingManager.recordInputAction(target);
      window.recordingManager.inputDebounceTimers.delete(target);
    }, 500); // Wait 500ms after last keystroke
    
    window.recordingManager.inputDebounceTimers.set(target, timer);
  },

  recordFocusOut(event) {
    if (!window.recorderState.isListening) return;
    
    const target = event.target;
    
    // When focus leaves an input, immediately record its final value
    const timer = window.recordingManager.inputDebounceTimers.get(target);
    if (timer) {
      clearTimeout(timer);
      window.recordingManager.inputDebounceTimers.delete(target);
      window.recordingManager.recordInputAction(target);
    }
  },

  recordInputAction(target) {
    const selector = window.selectorGenerator.getUniqueSelector(target);
    
    // Process ID to remove everything after double dash
    let processedId = target.id || '';
    if (processedId && processedId.includes('--')) {
      processedId = processedId.split('--')[0];
    }
    
    const actionData = {
      type: 'input',
      selector: selector,
      tagName: target.tagName,
      inputType: target.type || 'text',
      value: target.value,
      checked: target.checked,
      id: processedId, // Store the processed ID
      originalId: target.id || '' // Store original for debugging
    };
    
    console.log('Recording input action:', actionData);
    
    chrome.runtime.sendMessage({
      action: 'recordAction',
      data: actionData
    });
  }
};