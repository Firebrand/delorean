// Handles the actual execution of actions during playback
window.actionExecutor = {
  async executeClickOnElement(element, action) {
    // Scroll element into view
    element.scrollIntoView({behavior: 'smooth', block: 'center'});
    await window.utils.wait(300);
    
    // Highlight element
    window.visualFeedback.highlightElement(element);
    
    if (action.type === 'click') {
      // Check if this is a dropdown toggle button
      if (element.classList.contains('dropbutton__toggle') || 
          element.closest('.dropbutton__toggle')) {
        console.log('Clicking dropdown toggle...');
        element.click();
        
        // Wait for dropdown to open and add visual confirmation
        await window.utils.wait(800); // Give dropdown time to animate open
        
        // Verify dropdown is open
        const dropbutton = element.closest('.dropbutton');
        if (dropbutton) {
          console.log('Dropdown state after click:', {
            hasOpenClass: dropbutton.classList.contains('open'),
            ariaExpanded: element.getAttribute('aria-expanded')
          });
        }
        return;
      }
      
      // For elements inside dropdowns, ensure dropdown is open first
      const dropdown = element.closest('.dropbutton');
      if (dropdown && (element.closest('.secondary-action') || 
                       element.closest('.dropbutton__item'))) {
        console.log('Element is in dropdown, checking if expanded...');
        
        // Find the toggle button
        const toggle = dropdown.querySelector('.dropbutton__toggle button');
        if (toggle) {
          // Check multiple ways if dropdown is open
          const isOpen = dropdown.classList.contains('open') || 
                        toggle.getAttribute('aria-expanded') === 'true' ||
                        element.offsetParent !== null;
          
          if (!isOpen) {
            console.log('Dropdown is closed, opening it first...');
            toggle.click();
            await window.utils.wait(800); // Wait for dropdown animation
            
            // Double-check element is now visible
            if (!element.offsetParent) {
              console.log('Element still not visible, trying to click toggle again...');
              toggle.click();
              await window.utils.wait(800);
            }
          } else {
            console.log('Dropdown already open');
          }
        }
      }
      
      // Ensure element is visible and enabled
      if (!element.offsetParent) {
        console.warn('Element is not visible after dropdown handling');
        // Try one more time to find the element by value
        if (action.value) {
          const alternativeElement = Array.from(document.querySelectorAll('input[type="submit"]'))
            .find(input => input.value === action.value && input.offsetParent);
          if (alternativeElement) {
            console.log('Found visible alternative element');
            element = alternativeElement;
            window.visualFeedback.highlightElement(element);
          } else {
            return;
          }
        } else {
          return;
        }
      }
      
      if (element.disabled) {
        console.warn('Element is disabled');
        return;
      }
      
      console.log('Clicking element...', {
        tag: element.tagName,
        value: element.value,
        id: element.id,
        visible: !!element.offsetParent
      });
      
      // Try multiple click methods
      await this.performClick(element);
      
    } else if (action.type === 'input') {
      await this.performInput(element, action);
    }
  },

  async performClick(element) {
    // Method 1: Focus and click
    if (element.focus) {
      element.focus();
      await window.utils.wait(100);
    }
    
    // Method 2: Direct click
    element.click();
    
    // Method 3: Dispatch mouse events (for stubborn elements)
    await window.utils.wait(100);
    const mousedownEvent = new MouseEvent('mousedown', {
      view: window,
      bubbles: true,
      cancelable: true
    });
    element.dispatchEvent(mousedownEvent);
    
    const mouseupEvent = new MouseEvent('mouseup', {
      view: window,
      bubbles: true,
      cancelable: true
    });
    element.dispatchEvent(mouseupEvent);
    
    const clickEvent = new MouseEvent('click', {
      view: window,
      bubbles: true,
      cancelable: true
    });
    element.dispatchEvent(clickEvent);
  },

  async performInput(element, action) {
    // Focus the element
    element.focus();
    await window.utils.wait(100);
    
    // Clear existing value
    element.value = '';
    
    // Set the complete value at once
    element.value = action.value;
    
    // Dispatch input event to trigger any listeners
    element.dispatchEvent(new Event('input', {
      bubbles: true,
      cancelable: true
    }));
    
    // Small delay to ensure the value is processed
    await window.utils.wait(100);
    
    // Dispatch change event
    element.dispatchEvent(new Event('change', {
      bubbles: true,
      cancelable: true
    }));
    
    // Handle checkboxes/radios
    if (action.inputType === 'checkbox' || action.inputType === 'radio') {
      element.checked = action.checked;
      element.dispatchEvent(new Event('change', {bubbles: true}));
    }
    
    console.log('Input value set:', element.value);
  }
};