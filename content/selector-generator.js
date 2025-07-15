// Generates unique selectors for elements
window.selectorGenerator = {
    getUniqueSelector(element) {
      // Process ID for selector generation
      if (element.id) {
        const processedId = element.id.includes('--') ? element.id.split('--')[0] : element.id;
        // Use a special selector that indicates we need partial matching
        return `[id^="${processedId}"]`;
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
  };