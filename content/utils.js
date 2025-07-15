// Utility functions and visual feedback
window.utils = {
    wait(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }
  };
  
  window.visualFeedback = {
    showClickFeedback(x, y) {
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
    },
  
    highlightElement(element) {
      const originalOutline = element.style.outline;
      element.style.outline = '3px solid #00ff00';
      
      setTimeout(() => {
        element.style.outline = originalOutline;
      }, 500);
    }
  };
  
  window.debugManager = {
    addDebugListeners() {
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
  };