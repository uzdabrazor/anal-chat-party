// Random party name generator
const PARTY_ADJECTIVES = [
    'Neon', 'Cyber', 'Glitch', 'Rave', 'Techno', 'Dark', 'Electric',
    'Laser', 'Synth', 'Binary', 'Pixel', 'Chrome', 'Shadow', 'Cosmic',
    'Acid', 'Bass', 'Void', 'Quantum', 'Hyper', 'Ultra', 'Mega', 'Turbo'
];

const PARTY_NOUNS = [
    'Raver', 'Ghost', 'Punk', 'Hacker', 'DJ', 'Cat', 'Wolf', 'Fox',
    'Ninja', 'Samurai', 'Wizard', 'Phantom', 'Dragon', 'Phoenix',
    'Shark', 'Viper', 'Crow', 'Owl', 'Bear', 'Tiger', 'Panda', 'Dude'
];

function generatePartyName() {
    const adj = PARTY_ADJECTIVES[Math.floor(Math.random() * PARTY_ADJECTIVES.length)];
    const noun = PARTY_NOUNS[Math.floor(Math.random() * PARTY_NOUNS.length)];
    const num = Math.floor(Math.random() * 100);
    return `${adj}${noun}${num}`;
}

// WebSocket connection and chat functionality
class RAGChat {
    constructor() {
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.currentMessage = null;
        this.sessionId = null;
        this.scrollPending = false;
        this.thinkingIndicator = null;

        this.initializeElements();
        this.initializeAuth();
    }
    
    initializeElements() {
        this.chatMessages = document.getElementById('chat-messages');
        this.nameInput = document.getElementById('name-input');
        this.messageInput = document.getElementById('message-input');
        this.sendButton = document.getElementById('send-button');
        this.connectionStatus = document.getElementById('connection-status');

        // Auth elements
        this.authScreen = document.getElementById('auth-screen');
        this.chatScreen = document.getElementById('chat-screen');
        this.passwordInput = document.getElementById('password-input');
        this.loginButton = document.getElementById('login-button');
        this.logoutButton = document.getElementById('logout-button');
        this.authError = document.getElementById('auth-error');

        // Welcome modal elements
        this.welcomeModal = document.getElementById('welcome-modal');
        this.welcomeCloseBtn = document.getElementById('welcome-close');

        // Load saved username or generate random party name
        const savedName = localStorage.getItem('userName');
        if (savedName) {
            this.nameInput.value = savedName;
        } else {
            const randomName = generatePartyName();
            this.nameInput.value = randomName;
            localStorage.setItem('userName', randomName);
        }

        // Initialize welcome modal
        this.initializeWelcomeModal();
    }

    initializeWelcomeModal() {
        const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');

        if (!hasSeenWelcome) {
            this.showWelcomeModal();
        } else {
            this.welcomeModal.classList.add('hidden');
        }

        this.welcomeCloseBtn.addEventListener('click', () => {
            this.closeWelcomeModal();
        });

        this.welcomeModal.addEventListener('click', (e) => {
            if (e.target === this.welcomeModal) {
                this.closeWelcomeModal();
            }
        });
    }

    showWelcomeModal() {
        this.welcomeModal.classList.remove('hidden');
    }

    closeWelcomeModal() {
        this.welcomeModal.classList.add('hidden');
        localStorage.setItem('hasSeenWelcome', 'true');
    }
    
    async initializeAuth() {
        const passwordRequired = document.body.getAttribute('data-password-required') === 'true';
        if (!passwordRequired) {
            // No password required, go straight to chat
            this.showChatScreen();
            this.connectWebSocket();
            this.setupEventListeners();
            return;
        }
        
        // Check if we have a valid session
        const savedSessionId = localStorage.getItem('sessionId');
        if (savedSessionId) {
            const isValid = await this.validateSession(savedSessionId);
            if (isValid) {
                this.sessionId = savedSessionId;
                this.showChatScreen();
                this.connectWebSocket();
                this.setupEventListeners();
                return;
            } else {
                localStorage.removeItem('sessionId');
            }
        }
        
        // Show authentication screen
        this.showAuthScreen();
        this.setupAuthListeners();
    }
    
    async validateSession(sessionId) {
        try {
            const response = await fetch('/auth/validate', {
                headers: {
                    'X-Session-ID': sessionId
                }
            });
            const data = await response.json();
            return data.valid;
        } catch (error) {
            console.error('Session validation failed:', error);
            return false;
        }
    }
    
    showAuthScreen() {
        this.authScreen.style.display = 'flex';
        this.chatScreen.style.display = 'none';
        this.passwordInput.focus();
    }
    
    showChatScreen() {
        this.authScreen.style.display = 'none';
        this.chatScreen.style.display = 'flex';
        const passwordRequired = document.body.getAttribute('data-password-required') === 'true';
        if (passwordRequired) {
            this.logoutButton.style.display = 'block';
        }
        // Focus message input when chat screen is shown
        setTimeout(() => this.messageInput.focus(), 100);
    }
    
    setupAuthListeners() {
        this.loginButton.addEventListener('click', () => this.handleLogin());
        this.passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleLogin();
            }
        });
    }
    
    async handleLogin() {
        const password = this.passwordInput.value.trim();
        if (!password) {
            this.showAuthError('Please enter a password');
            return;
        }
        
        this.loginButton.disabled = true;
        this.loginButton.textContent = 'Logging in...';
        this.hideAuthError();
        
        try {
            const response = await fetch('/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ password })
            });
            
            if (response.ok) {
                const data = await response.json();
                this.sessionId = data.session_id;
                localStorage.setItem('sessionId', this.sessionId);
                
                this.showChatScreen();
                this.connectWebSocket();
                this.setupEventListeners();
            } else {
                const error = await response.json();
                this.showAuthError(error.detail || 'Authentication failed');
            }
        } catch (error) {
            this.showAuthError('Network error. Please try again.');
        } finally {
            this.loginButton.disabled = false;
            this.loginButton.textContent = 'Login';
            this.passwordInput.value = '';
        }
    }
    
    async handleLogout() {
        try {
            await fetch('/auth/logout', {
                method: 'POST',
                headers: {
                    'X-Session-ID': this.sessionId
                }
            });
        } catch (error) {
            console.error('Logout request failed:', error);
        }
        
        // Clean up regardless of server response
        localStorage.removeItem('sessionId');
        this.sessionId = null;
        
        if (this.ws) {
            this.ws.close();
            // Give server time to process WebSocket cleanup
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        this.showAuthScreen();
    }
    
    showAuthError(message) {
        this.authError.textContent = message;
        this.authError.style.display = 'block';
    }
    
    hideAuthError() {
        this.authError.style.display = 'none';
    }
    
    connectWebSocket() {
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        let wsUrl = `${wsProtocol}//${window.location.host}/ws`;

        // Add session ID if password is required
        const passwordRequired = document.body.getAttribute('data-password-required') === 'true';
        if (passwordRequired && this.sessionId) {
            wsUrl += `?session_id=${this.sessionId}`;
        }
        
        try {
            this.ws = new WebSocket(wsUrl);
            this.setupWebSocketHandlers();
        } catch (error) {
            console.error('WebSocket connection failed:', error);
            this.handleConnectionError();
        }
    }
    
    setupWebSocketHandlers() {
        this.ws.onopen = () => {
            console.log('WebSocket connected');
            this.connectionStatus.classList.remove('disconnected');
            this.connectionStatus.classList.add('connected');
            this.connectionStatus.querySelector('.status-text').textContent = 'Connected';
            this.nameInput.disabled = false;
            this.messageInput.disabled = false;
            this.sendButton.disabled = false;
            this.reconnectAttempts = 0;
        };
        
        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.handleWebSocketMessage(data);
            } catch (error) {
                console.error('Failed to parse WebSocket message:', error);
            }
        };
        
        this.ws.onclose = (event) => {
            console.log('WebSocket closed:', event.code, event.reason);
            this.handleConnectionError();
        };
        
        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.handleConnectionError();
        };
    }
    
    handleWebSocketMessage(data) {
        switch (data.type) {
            case 'message':
                this.finishCurrentMessage();
                this.addMessage(data.role, data.content, data.source, data.user_name);
                if (data.role === 'user' && data.expects_response) {
                    this.showThinkingIndicator();
                }
                break;
                
            case 'chunk':
                this.hideThinkingIndicator();
                this.appendToCurrentMessage(data.content);
                if (data.seq_id && this.ws && this.ws.readyState === WebSocket.OPEN) {
                    this.ws.send(JSON.stringify({
                        type: 'chunk_ack',
                        seq_id: data.seq_id
                    }));
                }
                break;
                
            case 'stream_complete':
                // Just finish the current streaming message
                this.finishCurrentMessage();
                // Ensure final scroll after stream completion
                this.scrollToBottom();
                break;
                
            case 'error':
                this.hideThinkingIndicator();
                this.addErrorMessage(data.content);
                break;
                
            default:
                console.log('Unknown message type:', data.type);
        }
    }
    
    handleConnectionError() {
        this.connectionStatus.classList.remove('connected');
        this.connectionStatus.classList.add('disconnected');
        this.connectionStatus.querySelector('.status-text').textContent = 'Disconnected';
        this.nameInput.disabled = true;
        this.messageInput.disabled = true;
        this.sendButton.disabled = true;

        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            setTimeout(() => this.connectWebSocket(), this.reconnectDelay);
            this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, 10000);
        } else {
            this.connectionStatus.querySelector('.status-text').textContent = 'Connection failed';
        }
    }
    
    setupEventListeners() {
        this.sendButton.addEventListener('click', () => this.sendMessage());
        
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // Auto-resize input
        this.messageInput.addEventListener('input', (e) => {
            e.target.style.height = 'auto';
            e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
        });
        
        // Save username to localStorage when changed or unfocused
        this.nameInput.addEventListener('input', () => {
            this.saveUserName();
        });
        
        this.nameInput.addEventListener('blur', () => {
            this.saveUserName();
        });
        
        // Logout button (always set up, even if not visible initially)
        this.logoutButton.addEventListener('click', () => this.handleLogout());
    }
    
    saveUserName() {
        const userName = this.nameInput.value.trim();
        if (userName) {
            localStorage.setItem('userName', userName);
        } else {
            // If empty, remove from localStorage and reset to default
            localStorage.removeItem('userName');
            this.nameInput.value = 'Anonymous';
        }
    }
    
    sendMessage() {
        const content = this.messageInput.value.trim();
        const userName = this.nameInput.value.trim();
        
        if (!content || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
            return;
        }
        
        // Finish any current streaming message before sending new one
        this.finishCurrentMessage();
        
        // Send message to server with user name (always include, even if "Anonymous")
        const messageData = {
            type: 'user_message',
            content: content,
            user_name: userName || "Anonymous"
        };
        
        this.ws.send(JSON.stringify(messageData));

        this.messageInput.value = '';
        this.messageInput.style.height = 'auto';
        
        // Disable inputs temporarily
        this.nameInput.disabled = true;
        this.messageInput.disabled = true;
        this.sendButton.disabled = true;
        
        // Re-enable after short delay
        setTimeout(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.nameInput.disabled = false;
                this.messageInput.disabled = false;
                this.sendButton.disabled = false;
                this.messageInput.focus();
            }
        }, 500);
    }
    
    addMessage(role, content, source = 'web', userName = null) {
        // Clear any existing current message when starting a new user message
        if (role === 'user') {
            this.finishCurrentMessage();
        }
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}-message`;
        
        if (source === 'cli') {
            messageDiv.classList.add('from-cli');
        }
        
        const headerDiv = document.createElement('div');
        headerDiv.className = 'message-header';
        
        let emoji, label;
        switch (role) {
            case 'user':
                emoji = source === 'cli' ? '💻' : '🗨️';
                if (source === 'cli') {
                    label = userName || 'CLI User';
                } else {
                    // Check if this message is from the current user
                    const currentUserName = this.nameInput.value.trim() || 'Anonymous';
                    if (userName && userName === currentUserName) {
                        label = 'You';
                    } else if (userName) {
                        label = userName;
                    } else {
                        label = 'You';  // Default for backward compatibility
                    }
                }
                break;
            case 'assistant':
                emoji = '<img src="https://raw.githubusercontent.com/uzdabrazor/uzdabrazor/refs/heads/main/logo.jpeg" class="assistant-avatar" />';
                label = 'uzdabrazor';
                break;
            case 'system':
                emoji = '⚙️';
                label = 'System';
                break;
            default:
                emoji = '💬';
                label = role;
        }
        
        headerDiv.innerHTML = `${emoji} <strong>${label}</strong>`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.textContent = content;
        
        messageDiv.appendChild(headerDiv);
        messageDiv.appendChild(contentDiv);

        messageDiv.style.animation = 'party-entrance 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';

        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
        
        // Store reference if this is an assistant message for streaming
        if (role === 'assistant') {
            this.currentMessage = contentDiv;
            messageDiv.classList.add('streaming');
        }
        
        return messageDiv;
    }
    
    appendToCurrentMessage(chunk) {
        if (this.currentMessage) {
            this.currentMessage.textContent += chunk;
            // Batch scroll updates to reduce DOM reflow
            if (!this.scrollPending) {
                this.scrollPending = true;
                requestAnimationFrame(() => {
                    this.scrollToBottom();
                    this.scrollPending = false;
                });
            }
        } else {
            // Start new assistant message if none exists
            this.finishCurrentMessage(); // Make sure no old messages are lingering
            const messageDiv = this.addMessage('assistant', chunk);
            this.currentMessage = messageDiv.querySelector('.message-content');
            messageDiv.classList.add('streaming');
        }
    }
    
    finishCurrentMessage() {
        if (this.currentMessage) {
            const messageDiv = this.currentMessage.parentElement;
            messageDiv.classList.remove('streaming');
            messageDiv.offsetHeight;
            this.currentMessage = null;
        }
    }

    showThinkingIndicator() {
        this.hideThinkingIndicator();

        const indicator = document.createElement('div');
        indicator.className = 'thinking-indicator';
        indicator.innerHTML = `
            <img src="https://raw.githubusercontent.com/uzdabrazor/uzdabrazor/refs/heads/main/logo.jpeg" class="thinking-avatar" />
            <div class="thinking-content">
                <span class="thinking-label">uzdabrazor is thinking...</span>
                <div class="thinking-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
                <span class="party-hint">PARTY MODE: keep chatting! tag @uzdabrazor for direct response</span>
            </div>
        `;

        this.chatMessages.appendChild(indicator);
        this.thinkingIndicator = indicator;
        this.scrollToBottom();
    }

    hideThinkingIndicator() {
        if (this.thinkingIndicator) {
            this.thinkingIndicator.remove();
            this.thinkingIndicator = null;
        }
    }
    
    addErrorMessage(content) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.innerHTML = `<strong>Error:</strong> ${content}`;
        this.chatMessages.appendChild(errorDiv);
        this.scrollToBottom();
    }
    
    scrollToBottom() {
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }
}

// Initialize chat when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.ragChat = new RAGChat();
    
    // Focus input field
    document.getElementById('message-input').focus();
});