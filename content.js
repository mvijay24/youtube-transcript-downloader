// Enhanced content.js with Claude integration
function addDownloadButton() {
  if (document.getElementById('transcript-buttons-container')) return;

  const secondary = document.querySelector('#secondary');
  if (!secondary) {
    setTimeout(addDownloadButton, 1000);
    return;
  }

  // Create container for both buttons
  const buttonContainer = document.createElement('div');
  buttonContainer.id = 'transcript-buttons-container';
  buttonContainer.style.cssText = `
    display: flex;
    gap: 8px;
    margin: 8px;
    flex-wrap: wrap;
  `;

  // Download button
  const downloadBtn = document.createElement('button');
  downloadBtn.id = 'transcript-download-btn';
  downloadBtn.innerHTML = '📥 Download';
  downloadBtn.style.cssText = getButtonStyle('#ff0000', '#cc0000');
  downloadBtn.onclick = downloadTranscript;
  
  // Send to Claude button
  const claudeBtn = document.createElement('button');
  claudeBtn.id = 'send-to-claude-btn';
  claudeBtn.innerHTML = '🤖 Send to Claude';
  claudeBtn.style.cssText = getButtonStyle('#1a5490', '#14406d');
  claudeBtn.onclick = sendToClaudeHandler;
  
  buttonContainer.appendChild(downloadBtn);
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
    padding: 8px 16px;
    border-radius: 4px; 
    cursor: pointer; 
    font-size: 13px; 
    font-weight: bold; 
    transition: all 0.3s ease;
    display: inline-flex;
    align-items: center;
    gap: 4px;
  `;
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
    showNotification('Transcript copied to clipboard! Paste it in Claude and ask for a summary.');
    
  } catch (error) {
    console.error('Error sending to Claude:', error);
    // Fallback if clipboard fails
    const transcriptBlob = await getTranscriptBlob();
    if (transcriptBlob) {
      // Download the file and open Claude
      downloadFile(transcriptBlob, 'transcript_for_claude.txt');
      window.open('https://claude.ai/new', '_blank');
      showNotification('Transcript downloaded! Upload the file to Claude and ask for a summary.');
    }
  }
}

async function getTranscriptText() {
  // Open transcript if needed
  const transcriptBtn = document.querySelector('[aria-label="Show transcript"]');
  if (transcriptBtn) {
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

async function getTranscriptBlob() {
  const transcript = await getTranscriptText();
  if (!transcript) return null;
  
  const videoTitle = document.querySelector('#title h1')?.textContent || 'YouTube Video';
  const videoUrl = window.location.href;
  
  const content = `Video: ${videoTitle}
URL: ${videoUrl}

Transcript:

${transcript}`;
  
  return new Blob([content], { type: 'text/plain' });
}

async function downloadTranscript() {
  const blob = await getTranscriptBlob();
  if (!blob) {
    alert('No transcript available for this video');
    return;
  }
  
  const videoId = new URLSearchParams(window.location.search).get('v');
  downloadFile(blob, `transcript_${videoId}.txt`);
}

function downloadFile(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
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
  `;
  
  notification.innerHTML = message;
  document.body.appendChild(notification);
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transition = 'opacity 0.3s';
    setTimeout(() => notification.remove(), 300);
  }, 5000);
}

// Initialize
function init() {
  addDownloadButton();
  
  // Re-add buttons when URL changes
  let lastUrl = location.href;
  new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      setTimeout(addDownloadButton, 2000);
    }
  }).observe(document, { subtree: true, childList: true });
  
  // Periodically check if buttons exist
  setInterval(() => {
    if (!document.getElementById('transcript-buttons-container')) {
      addDownloadButton();
    }
  }, 5000);
}

// Add hover effects
document.addEventListener('DOMContentLoaded', () => {
  const style = document.createElement('style');
  style.innerHTML = `
    #transcript-download-btn:hover {
      background: #cc0000 !important;
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

// Start
if (document.readyState === 'complete') {
  init();
} else {
  window.addEventListener('load', init);
}

setTimeout(init, 3000);