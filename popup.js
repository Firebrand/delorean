let isRecording = false;
let isPlaying = false;

document.addEventListener('DOMContentLoaded', function() {
  const recordBtn = document.getElementById('recordBtn');
  const playbackBtn = document.getElementById('playbackBtn');
  const clearBtn = document.getElementById('clearBtn');
  const importBtn = document.getElementById('importBtn');
  const fileInput = document.getElementById('fileInput');
  const statusDiv = document.getElementById('status');
  const statsDiv = document.getElementById('stats');

  // Check initial state
  checkState();

  recordBtn.addEventListener('click', function() {
    if (!isRecording) {
      startRecording();
    } else {
      stopRecording();
    }
  });

  playbackBtn.addEventListener('click', function() {
    if (!isPlaying) {
      startPlayback();
    } else {
      stopPlayback();
    }
  });

  clearBtn.addEventListener('click', function() {
    clearRecording();
  });

  importBtn.addEventListener('click', function() {
    fileInput.click();
  });

  fileInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
      importRecording(file);
    }
  });

  function checkState() {
    chrome.storage.local.get(['isRecording', 'isPlaying', 'recordedActions'], function(result) {
      isRecording = result.isRecording || false;
      isPlaying = result.isPlaying || false;
      const hasRecording = result.recordedActions && result.recordedActions.length > 0;
      
      updateUI(isRecording, isPlaying, hasRecording);
      
      if (hasRecording) {
        showStats(result.recordedActions);
      }
    });
  }

  function updateUI(recording, playing, hasRecording) {
    if (recording) {
      recordBtn.textContent = 'Stop Recording';
      recordBtn.classList.add('recording');
      playbackBtn.disabled = true;
      clearBtn.disabled = true;
      importBtn.disabled = true;
      updateStatus('Recording in progress...', 'info');
    } else {
      recordBtn.textContent = 'Start Recording';
      recordBtn.classList.remove('recording');
      playbackBtn.disabled = !hasRecording || playing;
      clearBtn.disabled = !hasRecording || playing || recording;
      importBtn.disabled = playing || recording;
    }
    
    if (playing) {
      recordBtn.disabled = true;
      playbackBtn.disabled = false;
      playbackBtn.textContent = 'Stop Playback';
      clearBtn.disabled = true;
      importBtn.disabled = true;
      updateStatus('Playback in progress...', 'info');
    } else if (!recording) {
      recordBtn.disabled = false;
      playbackBtn.textContent = 'Playback Recording';
    }
  }

  function startRecording() {
    chrome.runtime.sendMessage({action: 'startRecording'}, function(response) {
      if (chrome.runtime.lastError) {
        updateStatus('Error: ' + chrome.runtime.lastError.message, 'error');
      } else if (response && response.success) {
        isRecording = true;
        updateUI(true, false, false);
        statsDiv.style.display = 'none';
        updateStatus('Recording started! Click and type on the page...', 'success');
      }
    });
  }

  function stopRecording() {
    chrome.runtime.sendMessage({action: 'stopRecording'}, function(response) {
      if (chrome.runtime.lastError) {
        updateStatus('Error: ' + chrome.runtime.lastError.message, 'error');
      } else if (response && response.success) {
        isRecording = false;
        updateStatus('Recording saved!', 'success');
        checkState();
      }
    });
  }

  function startPlayback() {
    chrome.runtime.sendMessage({action: 'startPlayback'}, function(response) {
      if (chrome.runtime.lastError) {
        updateStatus('Error: ' + chrome.runtime.lastError.message, 'error');
      } else if (response && response.success) {
        isPlaying = true;
        updateUI(false, true, true);
      } else if (response && response.error) {
        updateStatus(response.error, 'error');
      }
    });
  }

  function stopPlayback() {
    chrome.runtime.sendMessage({action: 'stopPlayback'}, function(response) {
      if (chrome.runtime.lastError) {
        updateStatus('Error: ' + chrome.runtime.lastError.message, 'error');
      } else if (response && response.success) {
        isPlaying = false;
        updateStatus('Playback stopped', 'warning');
        checkState();
      }
    });
  }

  function clearRecording() {
    if (confirm('Are you sure you want to clear the recording?')) {
      chrome.storage.local.remove(['recordedActions'], function() {
        updateStatus('Recording cleared', 'success');
        statsDiv.style.display = 'none';
        checkState();
      });
    }
  }

  function updateStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = type;
    
    // Auto-hide success messages after 3 seconds
    if (type === 'success') {
      setTimeout(() => {
        if (statusDiv.textContent === message) {
          statusDiv.textContent = '';
          statusDiv.className = '';
        }
      }, 3000);
    }
  }

  function showStats(actions) {
    const clicks = actions.filter(a => a.type === 'click').length;
    const typing = actions.filter(a => a.type === 'input').length;
    const pages = new Set(actions.map(a => a.url)).size;
    
    statsDiv.innerHTML = `
      <div><strong>Recording Stats:</strong></div>
      <div>• Total actions: ${actions.length}</div>
      <div>• Clicks: ${clicks}</div>
      <div>• Text inputs: ${typing}</div>
      <div>• Pages visited: ${pages}</div>
      <button id="saveBtn">Save Recording</button>
    `;
    statsDiv.style.display = 'block';
    
    // Add save button listener
    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) {
      saveBtn.disabled = isRecording || isPlaying;
      saveBtn.addEventListener('click', function() {
        saveRecording(actions);
      });
    }
  }

  function saveRecording(actions) {
    // Create recording object with metadata
    const recording = {
      version: '1.0',
      created: new Date().toISOString(),
      userAgent: navigator.userAgent,
      actions: actions,
      metadata: {
        totalActions: actions.length,
        clicks: actions.filter(a => a.type === 'click').length,
        inputs: actions.filter(a => a.type === 'input').length,
        pages: Array.from(new Set(actions.map(a => a.url)))
      }
    };
    
    // Convert to JSON and create blob
    const jsonString = JSON.stringify(recording, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    
    // Create download link
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    a.href = url;
    a.download = `web-recording-${timestamp}.json`;
    
    // Trigger download
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    updateStatus('Recording saved to file!', 'success');
  }

  function importRecording(file) {
    const reader = new FileReader();
    
    reader.onload = function(e) {
      try {
        const recording = JSON.parse(e.target.result);
        
        // Validate the recording format
        if (!recording.version || !recording.actions || !Array.isArray(recording.actions)) {
          throw new Error('Invalid recording format');
        }
        
        // Check if there's an existing recording
        chrome.storage.local.get(['recordedActions'], function(result) {
          const hasExisting = result.recordedActions && result.recordedActions.length > 0;
          
          if (hasExisting) {
            if (!confirm('This will replace your current recording. Continue?')) {
              fileInput.value = ''; // Reset file input
              return;
            }
          }
          
          // Import the recording
          chrome.storage.local.set({ recordedActions: recording.actions }, function() {
            updateStatus(`Imported recording with ${recording.actions.length} actions`, 'success');
            checkState();
            fileInput.value = ''; // Reset file input
          });
        });
        
      } catch (error) {
        updateStatus('Error: Invalid recording file', 'error');
        console.error('Import error:', error);
        fileInput.value = ''; // Reset file input
      }
    };
    
    reader.onerror = function() {
      updateStatus('Error reading file', 'error');
      fileInput.value = ''; // Reset file input
    };
    
    reader.readAsText(file);
  }

  // Listen for updates from background script
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'playbackComplete') {
      isPlaying = false;
      updateStatus('Playback completed!', 'success');
      checkState();
    } else if (request.action === 'playbackError') {
      isPlaying = false;
      updateStatus('Playback error: ' + request.error, 'error');
      checkState();
    } else if (request.action === 'recordingUpdate') {
      // Update stats in real-time during recording
      if (isRecording && request.count) {
        updateStatus(`Recording... (${request.count} actions)`, 'info');
      }
    }
  });
  
  // Update state when popup reopens
  window.addEventListener('focus', checkState);
});