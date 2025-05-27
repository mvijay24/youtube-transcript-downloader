function addDownloadButton() {
  if (document.getElementById('transcript-buttons-container')) return;

  const secondary = document.querySelector('#secondary');
  if (!secondary) {
    // Retry more aggressively with shorter intervals
    setTimeout(addDownloadButton, 500);
    return;
  }

  // Create container for both buttons
  const buttonContainer = document.createElement('div');
  buttonContainer.id = 'transcript-buttons-container';
  buttonContainer.style.cssText = `
    display: flex;
    gap: 6px;
    margin: 6px 8px;
    flex-wrap: wrap;
    justify-content: flex-start;
  `;

  // Copy to clipboard button (shortened)
  const copyBtn = document.createElement('button');
  copyBtn.id = 'transcript-copy-btn';
  copyBtn.innerHTML = '📋 Copy';
  copyBtn.style.cssText = getButtonStyle('#28a745', '#218838');
  copyBtn.onclick = copyTranscriptHandler;
  
  // Send to Claude button (shortened)
  const claudeBtn = document.createElement('button');
  claudeBtn.id = 'send-to-claude-btn';
  claudeBtn.innerHTML = '🤖 Claude';
  claudeBtn.style.cssText = getButtonStyle('#1a5490', '#14406d');
  claudeBtn.onclick = sendToClaudeHandler;
  
  buttonContainer.appendChild(copyBtn);
  buttonContainer.appendChild(claudeBtn);
  
  // Add container after description
  const metaContents = secondary.querySelector('#meta-contents');
  if (metaContents) {
    metaContents.insertBefore(buttonContainer, metaContents.querySelector('#description'));
  } else {
    const insertPoint = secondary.querySelector('#owner') || secondary.firstChild;
    secondary.insertBefore(buttonContainer, insertPoint);
  }
}

function getButtonStyle(bgColor, hoverColor) {
  return `
    background: ${bgColor}; 
    color: white; 
    border: none; 
    padding: 6px 12px;
    border-radius: 4px; 
    cursor: pointer; 
    font-size: 12px; 
    font-weight: bold; 
    transition: all 0.3s ease;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    min-width: 70px;
    justify-content: center;
  `;
}

async function copyTranscriptHandler() {
  try {
    // Extract transcript
    const transcript = await getTranscriptText();
    
    if (!transcript) {
      alert('No transcript available for this video');
      return;
    }
    
    // Just copy to clipboard - no download
    await navigator.clipboard.writeText(transcript);
    
    // Show notification
    showNotification('✅ Transcript copied to clipboard!');
    
  } catch (error) {
    console.error('Error copying transcript:', error);
    alert('Failed to copy transcript. Please try again.');
  }
}

async function sendToClaudeHandler() {
  try {
    // Extract transcript
    const transcript = await getTranscriptText();
    
    if (!transcript) {
      alert('No transcript available for this video');
      return;
    }
    
    // Prepare the text for Claude
    const videoId = new URLSearchParams(window.location.search).get('v');
    const videoTitle = document.querySelector('#title h1')?.textContent || 'YouTube Video';
    const videoUrl = window.location.href;
    
    const claudeText = `Video: ${videoTitle}
URL: ${videoUrl}

Here's the transcript:

${transcript}

Please summarize this video transcript for me.`;
    
    // Copy to clipboard
    await navigator.clipboard.writeText(claudeText);
    
    // Open Claude
    window.open('https://claude.ai/new', '_blank');
    
    // Show notification
    showNotification('✅ Transcript copied! Paste in Claude with Ctrl+V');
    
  } catch (error) {
    console.error('Error sending to Claude:', error);
    showNotification('❌ Failed to copy. Try the Copy button first.');
  }
}

async function getTranscriptText() {
  // Open transcript if needed
  const transcriptBtn = document.querySelector('[aria-label="Show transcript"]');
  if (transcriptBtn && !transcriptBtn.getAttribute('aria-pressed')) {
    transcriptBtn.click();
    await new Promise(r => setTimeout(r, 1500));
  }
  
  // Get transcript items
  const items = document.querySelectorAll('ytd-transcript-segment-renderer');
  if (!items.length) return null;
  
  let transcript = '';
  items.forEach(item => {
    const time = item.querySelector('.segment-timestamp')?.textContent?.trim() || '';
    const text = item.querySelector('.segment-text')?.textContent?.trim() || '';
    if (text) transcript += `[${time}] ${text}\n`;
  });
  
  return transcript;
}

function showNotification(message) {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    background: #333;
    color: white;
    padding: 12px 20px;
    border-radius: 6px;
    z-index: 10000;
    font-size: 14px;
    max-width: 300px;
    animation: slideIn 0.3s ease;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  `;
  
  notification.innerHTML = message;
  document.body.appendChild(notification);
  
  // Auto-remove after 3 seconds
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transition = 'opacity 0.3s';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Initialize with better retry logic
function init() {
  // Try immediately
  addDownloadButton();
  
  // Set up multiple retry attempts for initial load
  const retryIntervals = [500, 1000, 2000, 3000, 5000];
  retryIntervals.forEach(delay => {
    setTimeout(() => {
      if (!document.getElementById('transcript-buttons-container')) {
        addDownloadButton();
      }
    }, delay);
  });
  
  // Re-add buttons when URL changes
  let lastUrl = location.href;
  new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      // Remove existing buttons first to avoid duplicates
      const existing = document.getElementById('transcript-buttons-container');
      if (existing) existing.remove();
      
      // Try multiple times after navigation
      setTimeout(addDownloadButton, 1000);
      setTimeout(addDownloadButton, 2500);
    }
  }).observe(document, { subtree: true, childList: true });
  
  // Periodically check if buttons exist (reduced frequency)
  setInterval(() => {
    if (!document.getElementById('transcript-buttons-container')) {
      addDownloadButton();
    }
  }, 8000);
}

// Add hover effects
document.addEventListener('DOMContentLoaded', () => {
  const style = document.createElement('style');
  style.innerHTML = `
    #transcript-copy-btn:hover {
      background: #218838 !important;
    }
    #send-to-claude-btn:hover {
      background: #14406d !important;
    }
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `;
  document.head.appendChild(style);
});

// Start with multiple initialization strategies
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
  window.addEventListener('load', init);
} else if (document.readyState === 'interactive') {
  setTimeout(init, 100);
  window.addEventListener('load', init);
} else {
  // Document already loaded
  init();
}

// Backup initialization attempts
setTimeout(init, 1000);
setTimeout(init, 3000);
setTimeout(init, 6000);