# Chat Box Implementation Backup

This file contains the complete technical implementation details of the working chat box feature with Claude API integration.

## Architecture Overview

```
YouTube Page → Content Script → Background Script → Claude API → Response Back
```

## File Structure

### 1. manifest.json
```json
{
  "manifest_version": 3,
  "name": "YouTube Transcript Downloader",
  "version": "1.0",
  "description": "Download YouTube transcript with one click",
  "permissions": [
    "activeTab",
    "storage"
  ],
  "host_permissions": [
    "https://www.youtube.com/*",
    "https://api.anthropic.com/*"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": ["https://www.youtube.com/watch*"],
      "js": ["content.js"],
      "css": ["style.css"]
    }
  ]
}
```

### 2. background.js - API Handler
```javascript
// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'generateSummary') {
    handleSummaryRequest(request.transcript, request.apiKey, request.videoTitle)
      .then(summary => sendResponse({ success: true, summary }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Will respond asynchronously
  } else if (request.action === 'sendChatMessage') {
    handleChatMessage(request)
      .then(message => sendResponse({ success: true, message }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

async function handleSummaryRequest(transcript, apiKey, videoTitle) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      system: `The assistant is Claude, created by Anthropic.

Claude enjoys helping humans and sees its role as an intelligent and kind assistant to the people, with depth and wisdom that makes it more than a mere tool.

Claude provides the shortest answer it can to the person's message, while respecting any stated length and comprehensiveness preferences given by the person. Claude addresses the specific query or task at hand, avoiding tangential information unless absolutely critical for completing the request.

Claude avoids writing lists, but if it does need to write a list, Claude focuses on key info instead of trying to be comprehensive. If Claude can answer the human in 1-3 sentences or a short paragraph, it does. If Claude can write a natural language list of a few comma separated items instead of a numbered or bullet-pointed list, it does so. Claude tries to stay focused and share fewer, high quality examples or ideas rather than many.

Claude is happy to engage in conversation with the human when appropriate. Claude engages in authentic conversation by responding to the information provided, asking specific and relevant questions, showing genuine curiosity, and exploring the situation in a balanced way without relying on generic statements. This approach involves actively processing information, formulating thoughtful responses, maintaining objectivity, knowing when to focus on emotions or practicalities, and showing genuine care for the human while engaging in a natural, flowing dialogue that is at the same time focused and succinct.

Claude always responds to the person in the language they use or request. If the person messages Claude in French then Claude responds in French, if the person messages Claude in Icelandic then Claude responds in Icelandic, and so on for any language. Claude is fluent in a wide variety of world languages.

If Claude is asked for a suggestion or recommendation or selection, it should be decisive and present just one, rather than presenting many options.`,
      messages: [{
        role: 'user',
        content: `Please summarize this transcript and provide summary in this format:

Video Title: ${videoTitle}

Direct Answer: IN ONE OR TWO LINES WHAT IS THE DIRECT ANSWER TO THE TITLE.

Main Points: The key 20% that gives you 80% of the value. Keep it short and simple, real simple, like I am 18.

Transcript:
${transcript.substring(0, 30000)}`
      }]
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'API request failed');
  }
  
  const data = await response.json();
  return data.content[0].text;
}

async function handleChatMessage(request) {
  // Build conversation messages array with full context
  const messages = [];
  
  // Add initial context
  messages.push({
    role: 'user',
    content: `Please summarize this transcript and provide summary in this format:

Video Title: ${request.videoTitle}

Direct Answer: IN ONE OR TWO LINES WHAT IS THE DIRECT ANSWER TO THE TITLE.

Main Points: The key 20% that gives you 80% of the value. Keep it short and simple, real simple, like I am 18.

Transcript:
${request.transcript.substring(0, 30000)}`
  });
  
  // Add conversation history
  request.conversationHistory.forEach(msg => {
    messages.push({
      role: msg.role,
      content: msg.content
    });
  });
  
  // Add new user message
  messages.push({
    role: 'user',
    content: request.message
  });
  
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': request.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      system: `[Same system prompt as above]`,
      messages: messages
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'API request failed');
  }
  
  const data = await response.json();
  return data.content[0].text;
}
```

### 3. content.js - Key Functions
```javascript
// Create AI Chat button
const summaryBtn = document.createElement('button');
summaryBtn.id = 'ai-summary-btn';
summaryBtn.innerHTML = '✨ AI Chat';
summaryBtn.style.cssText = getButtonStyle('#6f42c1', '#5a2ca0');
summaryBtn.onclick = function() {
  if (typeof aiSummaryHandler === 'function') {
    aiSummaryHandler();
  }
};

// Create collapsible summary container
const summaryContainer = document.createElement('div');
summaryContainer.id = 'ai-summary-container';
summaryContainer.style.cssText = `
  margin: 12px 8px;
  background: #f8f9fa;
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.3s ease;
  display: none;
`;

// Chat messages area
const chatMessages = document.createElement('div');
chatMessages.id = 'chat-messages';
chatMessages.style.cssText = `
  flex: 1;
  overflow-y: auto;
  padding: 15px;
  font-size: 14px;
  line-height: 1.6;
  color: #333;
`;

// Input area
const chatInput = document.createElement('input');
chatInput.id = 'chat-input';
chatInput.type = 'text';
chatInput.placeholder = 'Ask a follow-up question...';
chatInput.onkeypress = (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    sendChatMessage();
  }
};

// API Key Management
async function getApiKey() {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      const stored = await chrome.storage.local.get(['claudeApiKey']);
      if (stored.claudeApiKey) return stored.claudeApiKey;
    }
  } catch (e) {
    console.log('[DEBUG] Chrome storage not available, using localStorage');
  }
  
  const storedKey = localStorage.getItem('claudeApiKey');
  if (storedKey) return storedKey;
  
  const key = prompt('Please enter your Claude API key:\n\nYou can get one from https://console.anthropic.com/api');
  if (key) {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        await chrome.storage.local.set({ claudeApiKey: key });
      }
    } catch (e) {
      console.log('[DEBUG] Falling back to localStorage');
    }
    localStorage.setItem('claudeApiKey', key);
    return key;
  }
  return null;
}

// Store conversation context
let conversationHistory = [];
let currentTranscript = '';
let currentVideoTitle = '';
let currentApiKey = '';

// AI Summary Handler
async function aiSummaryHandler() {
  const container = document.getElementById('ai-summary-container');
  const chatMessages = document.getElementById('chat-messages');
  const inputArea = document.getElementById('chat-input-area');
  container.style.display = 'block';
  
  // Check cache first
  const videoId = new URLSearchParams(window.location.search).get('v');
  const cacheKey = `chat_v2_${videoId}`;
  const cached = sessionStorage.getItem(cacheKey);
  if (cached) {
    const cachedData = JSON.parse(cached);
    conversationHistory = cachedData.history;
    currentTranscript = cachedData.transcript;
    currentVideoTitle = cachedData.title;
    displayConversation();
    inputArea.style.display = 'block';
    return;
  }
  
  // Show loading state
  chatMessages.innerHTML = '<div style="text-align: center;"><div class="spinner"></div><p style="color: #666; margin-top: 10px;">Generating summary...</p></div>';
  
  // Get API key
  currentApiKey = await getApiKey();
  if (!currentApiKey) {
    chatMessages.innerHTML = '<div style="color: #dc3545; text-align: center;">API key required to generate summaries</div>';
    return;
  }
  
  // Get transcript
  currentTranscript = await getTranscriptText();
  if (!currentTranscript) {
    chatMessages.innerHTML = '<div style="color: #dc3545; text-align: center;">No transcript available for this video</div>';
    return;
  }
  
  // Get video title
  currentVideoTitle = document.querySelector('#title h1')?.textContent || 'YouTube Video';
  
  // Generate initial summary
  const summary = await generateSummary(currentTranscript, currentApiKey, currentVideoTitle);
  
  // Add to conversation history
  conversationHistory = [{
    role: 'assistant',
    content: summary
  }];
  
  // Display conversation
  displayConversation();
  
  // Show input area
  inputArea.style.display = 'block';
  
  // Cache the conversation
  sessionStorage.setItem(cacheKey, JSON.stringify({
    videoId: videoId,
    history: conversationHistory,
    transcript: currentTranscript,
    title: currentVideoTitle
  }));
}

// Generate summary using Claude API (via background script)
async function generateSummary(transcript, apiKey, videoTitle) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        action: 'generateSummary',
        transcript: transcript,
        apiKey: apiKey,
        videoTitle: videoTitle
      },
      response => {
        if (response.success) {
          resolve(response.summary);
        } else {
          reject(new Error(response.error));
        }
      }
    );
  });
}

// Send follow-up message
async function sendChatMessage() {
  const input = document.getElementById('chat-input');
  const message = input.value.trim();
  
  if (!message) return;
  
  // Clear input
  input.value = '';
  
  // Add user message to history
  conversationHistory.push({
    role: 'user',
    content: message
  });
  
  // Display updated conversation
  displayConversation();
  
  // Show loading
  const chatMessages = document.getElementById('chat-messages');
  chatMessages.innerHTML += '<div style="margin: 10px 0; padding: 10px; background: #f0f0f0; border-radius: 8px;"><div class="spinner" style="width: 20px; height: 20px; border-width: 2px;"></div></div>';
  chatMessages.scrollTop = chatMessages.scrollHeight;
  
  try {
    // Send message with context
    const response = await sendMessageWithContext(message);
    
    // Remove loading indicator
    const lastChild = chatMessages.lastElementChild;
    if (lastChild && lastChild.querySelector('.spinner')) {
      lastChild.remove();
    }
    
    // Add assistant response
    conversationHistory.push({
      role: 'assistant',
      content: response
    });
    
    // Display updated conversation
    displayConversation();
    
    // Cache updated conversation
    const videoId = new URLSearchParams(window.location.search).get('v');
    const cacheKey = `chat_v2_${videoId}`;
    sessionStorage.setItem(cacheKey, JSON.stringify({
      videoId: videoId,
      history: conversationHistory,
      transcript: currentTranscript,
      title: currentVideoTitle
    }));
    
  } catch (error) {
    console.error('Error sending message:', error);
    const lastChild = chatMessages.lastElementChild;
    if (lastChild && lastChild.querySelector('.spinner')) {
      lastChild.remove();
    }
    chatMessages.innerHTML += `<div style="color: #dc3545; margin: 10px 0;">Error: ${error.message}</div>`;
  }
}

// Display conversation in chat format
function displayConversation() {
  const chatMessages = document.getElementById('chat-messages');
  chatMessages.innerHTML = '';
  
  conversationHistory.forEach((msg, index) => {
    const messageDiv = document.createElement('div');
    messageDiv.style.cssText = `
      margin: 10px 0;
      padding: 12px 15px;
      border-radius: 8px;
      ${msg.role === 'user' ? 
        'background: #e3f2fd; margin-left: 20%; text-align: right;' : 
        'background: #f5f5f5; margin-right: 20%;'}
    `;
    
    if (msg.role === 'user') {
      messageDiv.innerHTML = `<strong>You:</strong> ${msg.content}`;
    } else {
      messageDiv.innerHTML = formatSummary(msg.content);
    }
    
    chatMessages.appendChild(messageDiv);
  });
  
  // Scroll to bottom
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Format summary for display
function formatSummary(summary) {
  // Convert markdown-like formatting to HTML
  let formatted = summary
    .replace(/^# (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h4>$1</h4>')
    .replace(/^\* (.+)$/gm, '<li>$1</li>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/(<li>.*<\/li>\s*)+/g, '<ul>$&</ul>');
  
  // Wrap in paragraph tags if needed
  if (!formatted.startsWith('<')) {
    formatted = `<p>${formatted}</p>`;
  }
  
  return `<div class="summary-formatted">${formatted}</div>`;
}
```

## Key Features Implemented

1. **Auto-trigger on page load** - Automatically opens summary when page loads
2. **Interactive chat with follow-ups** - Full conversation capability
3. **Cache per video** - Uses sessionStorage to cache conversations
4. **API key storage** - Secure storage using chrome.storage with localStorage fallback
5. **Transcript extraction** - Extracts full transcript with timestamps
6. **Markdown formatting** - Converts Claude's markdown responses to HTML
7. **Loading states** - Shows spinner while generating responses
8. **Error handling** - Graceful handling of API errors and missing transcripts

## User Prompt Format

```
Please summarize this transcript and provide summary in this format:

Video Title: [Video Title]

Direct Answer: IN ONE OR TWO LINES WHAT IS THE DIRECT ANSWER TO THE TITLE.

Main Points: The key 20% that gives you 80% of the value. Keep it short and simple, real simple, like I am 18.

Transcript:
[Transcript Text]
```

## Cache Management

- Uses sessionStorage for per-tab persistence
- Cache key format: `chat_v2_${videoId}`
- Stores: videoId, conversation history, transcript, video title
- Clears on video change to prevent wrong summaries

## Error Scenarios Handled

1. No API key - Prompts user to enter
2. Invalid API key - Shows error message
3. No transcript available - Shows appropriate message
4. Network errors - Displays error to user
5. Rate limits - Shows API error message

## CSS Styling

```css
.spinner {
  display: inline-block;
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #6f42c1;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.summary-formatted h3 {
  margin: 15px 0 10px 0;
  color: #333;
  font-size: 16px;
}

.summary-formatted ul {
  margin: 10px 0;
  padding-left: 25px;
}
```

## Notes

- Uses Claude 3.5 Sonnet model for best quality
- Max tokens set to 4096 for detailed responses
- Includes full Claude system prompt for authentic behavior
- Background script handles API calls to avoid CORS issues
- All conversations preserved in Claude.ai format for consistency