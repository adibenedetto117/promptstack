/**
 * chat.js - Chat functionality
 */

// Chat Object
const Chat = {
    // Settings
    settings: {
        temperature: 0.7,
        maxTokens: 512
    },
    
    /**
     * Initialize the chat functionality
     */
    init() {
        this.setupEventListeners();
    },
    
    /**
     * Set up event listeners for chat functionality
     */
    setupEventListeners() {
        // New chat button
        const newChatBtn = document.getElementById('new-chat-btn');
        if (newChatBtn) {
            newChatBtn.addEventListener('click', () => {
                this.openNewChatModal();
            });
        }
        
        // Change system button
        const changeSystemBtn = document.getElementById('change-system-btn');
        if (changeSystemBtn) {
            changeSystemBtn.addEventListener('click', () => {
                this.openChangeSystemModal();
            });
        }
        
        // Clear chat button
        const clearChatBtn = document.getElementById('clear-chat-btn');
        if (clearChatBtn) {
            clearChatBtn.addEventListener('click', () => {
                this.promptClearChat();
            });
        }
        
        // Send message button
        const sendButton = document.getElementById('send-button');
        if (sendButton) {
            sendButton.addEventListener('click', () => {
                this.sendMessage();
            });
        }
        
        // Enter key to send message
        const userInput = document.getElementById('user-input');
        if (userInput) {
            userInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        }
        
        // Temperature slider
        const temperatureSlider = document.getElementById('temperature');
        if (temperatureSlider) {
            temperatureSlider.addEventListener('change', (e) => {
                this.settings.temperature = parseFloat(e.target.value);
                this.saveSettings();
            });
        }
        
        // Max tokens input
        const maxTokensInput = document.getElementById('max-tokens');
        if (maxTokensInput) {
            maxTokensInput.addEventListener('change', (e) => {
                this.settings.maxTokens = parseInt(e.target.value, 10);
                this.saveSettings();
            });
        }
    },
    
    /**
     * Open new chat modal
     */
    openNewChatModal() {
        if (window.Modals) {
            Modals.openNewChatModal();
        }
    },
    
    /**
     * Open change system modal
     */
    openChangeSystemModal() {
        if (window.Modals) {
            Modals.openChangeSystemModal();
        }
    },
    
    /**
     * Save chat settings
     */
    async saveSettings() {
        if (!window.App) return;
        
        // Save to server
        await APIService.saveSettings({
            temperature: this.settings.temperature,
            maxTokens: this.settings.maxTokens
        });
    },
    
    /**
     * Create a new chat
     * @param {string} title The title of the chat
     * @param {string} systemMessage The system message for the chat
     * @returns {Promise<string>} The ID of the new chat
     */
    async createNewChat(title, systemMessage) {
        if (!window.App) return null;
        
        const newChat = {
            id: Utils.generateId(),
            title: title || 'New Chat',
            systemMessage: systemMessage || 'You are a helpful assistant.',
            messages: [],
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        
        // Add to state
        App.state.chats.unshift(newChat);
        App.state.currentChatId = newChat.id;
        
        // Save to server
        const success = await APIService.saveChat(newChat);
        
        if (success) {
            // Update UI
            this.renderChats();
            this.loadChat(newChat.id);
            Utils.showToast('New chat created', 'success');
            return newChat.id;
        } else {
            Utils.showToast('Failed to create chat', 'error');
            return null;
        }
    },
    
    /**
     * Load a chat
     * @param {string} chatId The ID of the chat to load
     */
    loadChat(chatId) {
        if (!window.App) return;
        
        App.state.currentChatId = chatId;
        
        const chat = App.state.chats.find(chat => chat.id === chatId);
        if (chat) {
            // Render chat messages
            this.renderChatMessages();
            
            // Update header
            UI.updateCurrentChatHeader(chat);
            
            // Update chats list
            this.renderChats();
        }
    },
    
    /**
     * Delete a chat
     * @param {string} chatId The ID of the chat to delete
     * @returns {Promise<boolean>} Whether the operation was successful
     */
    async deleteChat(chatId) {
        if (!window.App) return false;
        
        const index = App.state.chats.findIndex(chat => chat.id === chatId);
        if (index === -1) return false;
        
        // Delete from server
        const success = await APIService.deleteChat(chatId);
        
        if (success) {
            // Remove from state
            App.state.chats.splice(index, 1);
            
            // If we deleted the current chat, load the newest chat or show empty state
            if (App.state.currentChatId === chatId) {
                if (App.state.chats.length > 0) {
                    App.state.currentChatId = App.state.chats[0].id;
                    this.loadChat(App.state.currentChatId);
                } else {
                    App.state.currentChatId = null;
                    UI.showEmptyChatState();
                }
            }
            
            // Update UI
            this.renderChats();
            Utils.showToast('Chat deleted', 'success');
            return true;
        } else {
            Utils.showToast('Failed to delete chat', 'error');
            return false;
        }
    },
    
    /**
     * Clear the current chat
     * @returns {Promise<boolean>} Whether the operation was successful
     */
    async clearChat() {
        if (!window.App || !App.state.currentChatId) return false;
        
        const currentChat = App.state.chats.find(chat => chat.id === App.state.currentChatId);
        if (!currentChat) return false;
        
        // Clear messages
        currentChat.messages = [];
        currentChat.updatedAt = Date.now();
        
        // Save to server
        const success = await APIService.updateChat(currentChat);
        
        if (success) {
            // Update UI
            this.renderChatMessages();
            Utils.showToast('Chat cleared', 'success');
            return true;
        } else {
            Utils.showToast('Failed to clear chat', 'error');
            return false;
        }
    },
    
    /**
     * Render chats list
     */
    renderChats() {
        const chatsList = document.getElementById('chats-list');
        if (!chatsList || !window.App) return;
        
        chatsList.innerHTML = '';
        
        if (App.state.chats.length === 0) {
            chatsList.innerHTML = `
                <li class="empty-state" style="padding: 1rem; text-align: center;">
                    <div class="empty-state-text">No chats yet</div>
                </li>
            `;
            return;
        }
        
        // Sort chats by updated time (newest first)
        const sortedChats = [...App.state.chats].sort((a, b) => b.updatedAt - a.updatedAt);
        
        sortedChats.forEach(chat => {
            const li = document.createElement('li');
            li.className = `chat-item ${chat.id === App.state.currentChatId ? 'active' : ''}`;
            li.dataset.id = chat.id;
            
            // Get first message or placeholder
            const firstMessage = chat.messages.length > 0 ? 
                Utils.truncateText(chat.messages[0].content, 30) : 
                'No messages yet';
            
            li.innerHTML = `
                <div class="chat-item-icon">
                    <i class="fas fa-comment"></i>
                </div>
                <div class="chat-item-content">
                    <div class="chat-item-title">${chat.title}</div>
                    <div class="chat-item-date">${Utils.formatDate(chat.updatedAt)}</div>
                </div>
                <div class="chat-item-actions">
                    <button class="btn-icon delete-chat-btn" title="Delete Chat">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            
            li.addEventListener('click', (e) => {
                if (!e.target.closest('.delete-chat-btn')) {
                    this.loadChat(chat.id);
                    
                    // Close sidebar on mobile
                    if (window.innerWidth <= 768) {
                        UI.toggleSidebar();
                    }
                }
            });
            
            const deleteBtn = li.querySelector('.delete-chat-btn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.promptDeleteChat(chat.id);
                });
            }
            
            chatsList.appendChild(li);
        });
    },
    
    /**
     * Render chat messages
     */
    renderChatMessages() {
        const messagesContainer = document.getElementById('chat-messages');
        if (!messagesContainer || !window.App) return;
        
        messagesContainer.innerHTML = '';
        
        const currentChat = App.state.chats.find(chat => chat.id === App.state.currentChatId);
        if (!currentChat) return;
        
        // Add welcome message if there are no messages
        if (currentChat.messages.length === 0) {
            const welcomeMsg = document.createElement('div');
            welcomeMsg.className = 'message system-message';
            welcomeMsg.innerHTML = `
                <div class="message-content">
                    This is the start of your conversation. Type a message below to begin.
                </div>
            `;
            messagesContainer.appendChild(welcomeMsg);
            return;
        }
        
        // Render each message
        currentChat.messages.forEach(msg => {
            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${msg.role === 'user' ? 'user-message' : 'assistant-message'}`;
            
            // Use markdown for assistant messages
            const content = msg.role === 'assistant' ? 
                marked.parse(msg.content) : 
                Utils.escapeHtml(msg.content).replace(/\n/g, '<br>');
            
            messageDiv.innerHTML = `
                <div class="message-content">${content}</div>
            `;
            
            messagesContainer.appendChild(messageDiv);
        });
        
        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    },
    
    /**
     * Send a message
     */
    async sendMessage() {
        const userInput = document.getElementById('user-input');
        if (!userInput || !window.App) return;
        
        const messageText = userInput.value.trim();
        if (!messageText) return;
        
        // If no active chat, create one
        if (!App.state.currentChatId) {
            const defaultSystemMessage = App.state.systemMessages.length > 0 ? 
                App.state.systemMessages[0].content : 
                'You are a helpful assistant.';
                
            await this.createNewChat('New Chat', defaultSystemMessage);
        }
        
        // Clear input and reset height
        userInput.value = '';
        userInput.style.height = 'auto';
        
        // Disable input during processing
        userInput.disabled = true;
        document.getElementById('send-button').disabled = true;
        
        const currentChat = App.state.chats.find(chat => chat.id === App.state.currentChatId);
        if (!currentChat) return;
        
        // Add user message to current chat
        currentChat.messages.push({
            role: 'user',
            content: messageText,
            timestamp: Date.now()
        });
        
        // Update UI
        this.renderChatMessages();
        currentChat.updatedAt = Date.now();
        await APIService.updateChat(currentChat);
        this.renderChats();
        
        // Show typing indicator
        UI.showTypingIndicator();
        
        try {
            // Prepare messages for API
            const messages = [
                { role: 'system', content: currentChat.systemMessage },
                ...currentChat.messages
            ];
            
            // Send request to API
            const data = await APIService.sendChatRequest(messages, {
                temperature: this.settings.temperature,
                max_tokens: this.settings.maxTokens
            });
            
            // Add assistant response to chat
            currentChat.messages.push({
                role: 'assistant',
                content: data.text,
                timestamp: Date.now()
            });
            
            // Update UI
            UI.hideTypingIndicator();
            this.renderChatMessages();
            currentChat.updatedAt = Date.now();
            await APIService.updateChat(currentChat);
            this.renderChats();
            
        } catch (error) {
            console.error('Error:', error);
            UI.hideTypingIndicator();
            
            // Add error message
            const errorMsg = document.createElement('div');
            errorMsg.className = 'message system-message';
            errorMsg.innerHTML = `
                <div class="message-content">
                    Error: ${error.message}. Please try again.
                </div>
            `;
            messagesContainer.appendChild(errorMsg);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            
            // Show toast notification
            Utils.showToast(`Error: ${error.message}`, 'error');
            
        } finally {
            // Re-enable input
            userInput.disabled = false;
            document.getElementById('send-button').disabled = false;
            userInput.focus();
        }
    },
    
    /**
     * Prompt the user to confirm deletion of a chat
     * @param {string} chatId The ID of the chat to delete
     */
    promptDeleteChat(chatId) {
        if (!window.App) return;
        
        const chat = App.state.chats.find(chat => chat.id === chatId);
        if (!chat) return;
        
        Utils.showConfirmation(
            `Are you sure you want to delete "${chat.title}"?`,
            'Delete Chat',
            () => this.deleteChat(chatId),
            'Delete',
            'Cancel'
        );
    },
    
    /**
     * Prompt the user to confirm clearing the current chat
     */
    promptClearChat() {
        if (!window.App || !App.state.currentChatId) return;
        
        const currentChat = App.state.chats.find(chat => chat.id === App.state.currentChatId);
        if (!currentChat) return;
        
        Utils.showConfirmation(
            `Are you sure you want to clear all messages in "${currentChat.title}"?`,
            'Clear Chat',
            () => this.clearChat(),
            'Clear',
            'Cancel'
        );
    }
};

// Export the Chat Object
window.Chat = Chat;