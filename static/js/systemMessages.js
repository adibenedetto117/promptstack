/**
 * systemMessages.js - System message handling
 */

// System Messages Object
const SystemMessages = {
    /**
     * Initialize the system messages functionality
     */
    init() {
        this.setupEventListeners();
    },
    
    /**
     * Set up event listeners for system message functionality
     */
    setupEventListeners() {
        // New system message button
        const newSystemMessageBtn = document.getElementById('new-system-message-btn');
        if (newSystemMessageBtn) {
            newSystemMessageBtn.addEventListener('click', () => {
                Modals.openSystemMessageModal();
            });
        }
    },
    
    /**
     * Render system messages list
     */
    renderSystemMessages() {
        const systemMessagesList = document.getElementById('system-messages-list');
        if (!systemMessagesList || !window.App) return;
        
        systemMessagesList.innerHTML = '';
        
        if (App.state.systemMessages.length === 0) {
            systemMessagesList.innerHTML = `
                <li class="empty-state" style="padding: 1rem; text-align: center;">
                    <div class="empty-state-text">No system prompts yet</div>
                </li>
            `;
            return;
        }
        
        App.state.systemMessages.forEach(msg => {
            const li = document.createElement('li');
            li.className = 'system-message-item';
            li.dataset.id = msg.id;
            
            li.innerHTML = `
                <div class="system-message-item-icon">
                    <i class="fas fa-cog"></i>
                </div>
                <div class="system-message-item-content">
                    <div class="system-message-item-title">${msg.name}</div>
                    <div class="system-message-item-preview">${Utils.truncateText(msg.content, 40)}</div>
                </div>
                <div class="system-message-item-actions">
                    <button class="btn-icon use-system-btn" title="Use This Prompt">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="btn-icon delete-system-btn" title="Delete Prompt">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            
            // Apply system message to current chat
            const useBtn = li.querySelector('.use-system-btn');
            if (useBtn) {
                useBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    this.applySystemMessageToChat(msg);
                });
            }
            
            // Delete system message
            const deleteBtn = li.querySelector('.delete-system-btn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.promptDeleteSystemMessage(msg.id);
                });
            }
            
            // Show full system message on click
            li.addEventListener('click', () => {
                this.showSystemMessageDetails(msg);
            });
            
            systemMessagesList.appendChild(li);
        });
    },
    
    /**
     * Create a new system message
     * @param {string} name The name of the system message
     * @param {string} content The content of the system message
     * @returns {Promise<boolean>} Whether the operation was successful
     */
    async createSystemMessage(name, content) {
        if (!window.App) return false;
        
        const newSystemMessage = {
            id: Utils.generateId(),
            name,
            content,
            createdAt: Date.now()
        };
        
        // Add to state
        App.state.systemMessages.push(newSystemMessage);
        
        // Save to server
        const success = await APIService.saveSystemMessage(newSystemMessage);
        
        if (success) {
            // Update UI
            this.renderSystemMessages();
            Modals.updateSystemMessagesDropdown();
            Utils.showToast(`System prompt "${name}" created`, 'success');
            return true;
        } else {
            Utils.showToast('Failed to save system prompt', 'error');
            return false;
        }
    },
    
    /**
     * Delete a system message
     * @param {string} messageId The ID of the system message to delete
     * @returns {Promise<boolean>} Whether the operation was successful
     */
    async deleteSystemMessage(messageId) {
        if (!window.App) return false;
        
        const index = App.state.systemMessages.findIndex(msg => msg.id === messageId);
        if (index === -1) return false;
        
        // Don't allow deleting the last system message
        if (App.state.systemMessages.length <= 1) {
            Utils.showToast('Cannot delete the last system prompt. At least one prompt must exist.', 'warning');
            return false;
        }
        
        // Delete from server
        const success = await APIService.deleteSystemMessage(messageId);
        
        if (success) {
            // Remove from state
            App.state.systemMessages.splice(index, 1);
            
            // Update UI
            this.renderSystemMessages();
            Modals.updateSystemMessagesDropdown();
            Utils.showToast('System prompt deleted', 'success');
            return true;
        } else {
            Utils.showToast('Failed to delete system prompt', 'error');
            return false;
        }
    },
    
    /**
     * Apply a system message to the current chat
     * @param {Object} message The system message to apply
     */
    async applySystemMessageToChat(message) {
        if (!window.App) return;
        
        if (App.state.currentChatId) {
            const currentChat = App.state.chats.find(chat => chat.id === App.state.currentChatId);
            
            if (currentChat) {
                currentChat.systemMessage = message.content;
                currentChat.updatedAt = Date.now();
                
                const success = await APIService.updateChat(currentChat);
                
                if (success) {
                    UI.updateCurrentChatHeader(currentChat);
                    Utils.showToast(`System prompt "${message.name}" applied to chat`, 'success');
                    
                    // Close sidebar on mobile
                    if (window.innerWidth <= 768) {
                        UI.toggleSidebar();
                    }
                } else {
                    Utils.showToast('Failed to update chat', 'error');
                }
            }
        } else {
            // No current chat, open new chat modal with this system message
            Modals.openNewChatModal();
            
            if (Modals.elements.selectedSystemTitle && Modals.elements.selectedSystemContent && 
                Modals.elements.savedSystemMessagesDropdown) {
                Modals.elements.selectedSystemTitle.textContent = message.name;
                Modals.elements.selectedSystemContent.textContent = message.content;
                Modals.elements.savedSystemMessagesDropdown.value = message.id;
            }
        }
    },
    
    /**
     * Show system message details
     * @param {Object} message The system message to show
     */
    showSystemMessageDetails(message) {
        Utils.showToast(`${message.name}: ${Utils.truncateText(message.content, 100)}`, 'info', 5000);
    },
    
    /**
     * Prompt the user to confirm deletion of a system message
     * @param {string} messageId The ID of the system message to delete
     */
    promptDeleteSystemMessage(messageId) {
        if (!window.App) return;
        
        const message = App.state.systemMessages.find(msg => msg.id === messageId);
        if (!message) return;
        
        Utils.showConfirmation(
            `Are you sure you want to delete the system prompt "${message.name}"?`,
            'Delete System Prompt',
            () => this.deleteSystemMessage(messageId),
            'Delete',
            'Cancel'
        );
    },
    
    /**
     * Ensure a default system message exists
     */
    async ensureDefaultSystemMessage() {
        if (!window.App) return;
        
        if (App.state.systemMessages.length === 0) {
            const defaultMessage = {
                id: Utils.generateId(),
                name: 'Default Assistant',
                content: 'You are a helpful assistant.',
                createdAt: Date.now()
            };
            
            // Add to state
            App.state.systemMessages.push(defaultMessage);
            
            // Save to server
            await APIService.saveSystemMessage(defaultMessage);
            
            // Update UI
            this.renderSystemMessages();
            Modals.updateSystemMessagesDropdown();
        }
    }
};

// Export the System Messages Object
window.SystemMessages = SystemMessages;