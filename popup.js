let isRecording = false;
let isPlaying = false;

document.addEventListener('DOMContentLoaded', function() {
  const recordBtn = document.getElementById('recordBtn');
  const playbackBtn = document.getElementById('playbackBtn');
  const clearBtn = document.getElementById('clearBtn');
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
      updateStatus('Recording in progress...', 'info');
    } else {
      recordBtn.textContent = 'Start Recording';
      recordBtn.classList.remove('recording');
      playbackBtn.disabled = !hasRecording || playing;
      clearBtn.disabled = !hasRecording || playing || recording;
    }
    
    if (playing) {
      recordBtn.disabled = true;
      playbackBtn.disabled = false;
      playbackBtn.textContent = 'Stop Playback';
      clearBtn.disabled = true;
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
    `;
    statsDiv.style.display = 'block';
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