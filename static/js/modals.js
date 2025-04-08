/**
 * modals.js - Modal dialog handlers
 */

// Modals Object
const Modals = {
    // DOM Elements for Modals
    elements: {
        // New Chat Modal
        newChatModal: document.getElementById('new-chat-modal'),
        newChatTitle: document.getElementById('new-chat-title'),
        newChatSystemMessage: document.getElementById('new-chat-system-message'),
        createChatBtn: document.getElementById('create-chat-btn'),
        savedSystemMessagesDropdown: document.getElementById('saved-system-messages'),
        selectedSystemTitle: document.getElementById('selected-system-title'),
        selectedSystemContent: document.getElementById('selected-system-content'),
        
        // System Message Modal
        systemMessageModal: document.getElementById('system-message-modal'),
        systemMessageName: document.getElementById('system-message-name'),
        systemMessageContent: document.getElementById('system-message-content'),
        saveSystemMessageBtn: document.getElementById('save-system-message-btn'),
        
        // Change System Modal
        changeSystemModal: document.getElementById('change-system-modal'),
        currentSystemPreview: document.getElementById('current-system-preview'),
        currentSystemMessageInput: document.getElementById('current-system-message-input'),
        updateSystemMessageBtn: document.getElementById('update-system-message-btn'),
        systemPromptsContainer: document.getElementById('system-prompts-container'),
        
        // Confirmation Modal
        confirmModal: document.getElementById('confirm-modal'),
        confirmTitle: document.getElementById('confirm-title'),
        confirmMessage: document.getElementById('confirm-message'),
        confirmActionBtn: document.getElementById('confirm-action-btn')
    },
    
    /**
     * Initialize the modals
     */
    init() {
        this.setupEventListeners();
    },
    
    /**
     * Set up event listeners for modal elements
     */
    setupEventListeners() {
        const {
            savedSystemMessagesDropdown,
            createChatBtn,
            saveSystemMessageBtn,
            updateSystemMessageBtn,
            newChatSystemMessage
        } = this.elements;
        
        // When saved system message dropdown changes in new chat modal
        if (savedSystemMessagesDropdown) {
            savedSystemMessagesDropdown.addEventListener('change', () => {
                this.handleSystemMessageSelection();
            });
        }
        
        // Create chat button
        if (createChatBtn) {
            createChatBtn.addEventListener('click', () => {
                this.handleCreateChat();
            });
        }
        
        // Save system message button
        if (saveSystemMessageBtn) {
            saveSystemMessageBtn.addEventListener('click', () => {
                this.handleSaveSystemMessage();
            });
        }
        
        // Update system message button
        if (updateSystemMessageBtn) {
            updateSystemMessageBtn.addEventListener('click', () => {
                this.handleUpdateSystemMessage();
            });
        }
        
        // New chat system message manual input
        if (newChatSystemMessage) {
            newChatSystemMessage.addEventListener('input', () => {
                // If the user types in the custom prompt field, deselect the dropdown
                if (newChatSystemMessage.value.trim() !== '' && savedSystemMessagesDropdown) {
                    savedSystemMessagesDropdown.value = '';
                }
            });
        }
    },
    
    /**
     * Open the new chat modal
     */
    openNewChatModal() {
        const { newChatModal, newChatTitle, newChatSystemMessage, selectedSystemTitle, selectedSystemContent } = this.elements;
        
        // Reset the form
        newChatTitle.value = '';
        newChatSystemMessage.value = '';
        
        // Pre-populate with default system message
        if (window.App && App.state.systemMessages.length > 0) {
            const defaultMessage = App.state.systemMessages[0];
            selectedSystemTitle.textContent = defaultMessage.name;
            selectedSystemContent.textContent = defaultMessage.content;
        }
        
        // Open the modal
        UI.openModal(newChatModal);
    },
    
    /**
     * Open the system message modal
     */
    openSystemMessageModal() {
        const { systemMessageModal, systemMessageName, systemMessageContent } = this.elements;
        
        // Reset the form
        systemMessageName.value = '';
        systemMessageContent.value = '';
        
        // Open the modal
        UI.openModal(systemMessageModal);
    },
    
    /**
     * Open the change system modal for the current chat
     */
    openChangeSystemModal() {
        const { changeSystemModal, currentSystemPreview, currentSystemMessageInput } = this.elements;
        
        if (window.App && App.state.currentChatId) {
            const currentChat = App.state.chats.find(chat => chat.id === App.state.currentChatId);
            
            if (currentChat) {
                currentSystemPreview.textContent = currentChat.systemMessage;
                currentSystemMessageInput.value = '';
                
                // Populate system prompts
                this.renderSystemPrompts();
                
                // Open the modal
                UI.openModal(changeSystemModal);
            }
        }
    },
    
    /**
     * Handle selection from system message dropdown
     */
    handleSystemMessageSelection() {
        const { savedSystemMessagesDropdown, selectedSystemTitle, selectedSystemContent, newChatSystemMessage } = this.elements;
        
        if (savedSystemMessagesDropdown.value && window.App) {
            const selectedMsg = App.state.systemMessages.find(m => m.id === savedSystemMessagesDropdown.value);
            
            if (selectedMsg) {
                // Update the preview
                selectedSystemTitle.textContent = selectedMsg.name;
                selectedSystemContent.textContent = selectedMsg.content;
                
                // Clear the custom input
                newChatSystemMessage.value = '';
            }
        }
    },
    
    /**
     * Handle create chat button click
     */
    async handleCreateChat() {
        const { newChatModal, newChatTitle, newChatSystemMessage, savedSystemMessagesDropdown } = this.elements;
        
        if (window.Chat && window.App) {
            const title = newChatTitle.value.trim() || 'New Chat';
            let systemMsg = newChatSystemMessage.value.trim();
            
            // If a saved system message is selected, use that instead
            if (savedSystemMessagesDropdown.value) {
                const selectedMsg = App.state.systemMessages.find(m => m.id === savedSystemMessagesDropdown.value);
                if (selectedMsg) {
                    systemMsg = selectedMsg.content;
                }
            }
            
            // Default to first system message if none provided
            if (!systemMsg && App.state.systemMessages.length > 0) {
                systemMsg = App.state.systemMessages[0].content;
            }
            
            // Create the new chat
            await Chat.createNewChat(title, systemMsg);
            
            // Close the modal
            UI.closeModal(newChatModal);
        }
    },
    
    /**
     * Handle save system message button click
     */
    async handleSaveSystemMessage() {
        const { systemMessageModal, systemMessageName, systemMessageContent } = this.elements;
        
        if (window.SystemMessages) {
            const name = systemMessageName.value.trim();
            const content = systemMessageContent.value.trim();
            
            if (!name || !content) {
                Utils.showToast('Please provide both a name and prompt content.', 'warning');
                return;
            }
            
            // Create and save the system message
            await SystemMessages.createSystemMessage(name, content);
            
            // Close the modal
            UI.closeModal(systemMessageModal);
        }
    },
    
    /**
     * Handle update system message button click
     */
    async handleUpdateSystemMessage() {
        const { changeSystemModal, currentSystemMessageInput } = this.elements;
        
        if (window.App && window.App.state.currentChatId) {
            const currentChat = App.state.chats.find(chat => chat.id === App.state.currentChatId);
            
            if (currentChat) {
                let newSystemMsg = currentSystemMessageInput.value.trim();
                
                // If no input and no system prompt selected, keep current
                if (!newSystemMsg && !document.querySelector('.system-prompt-item.selected')) {
                    UI.closeModal(changeSystemModal);
                    return;
                }
                
                // If a system prompt is selected, use that
                const selectedPrompt = document.querySelector('.system-prompt-item.selected');
                if (selectedPrompt && !newSystemMsg) {
                    const promptId = selectedPrompt.dataset.id;
                    const selectedMsg = App.state.systemMessages.find(m => m.id === promptId);
                    
                    if (selectedMsg) {
                        newSystemMsg = selectedMsg.content;
                    }
                }
                
                // Update chat
                if (newSystemMsg) {
                    currentChat.systemMessage = newSystemMsg;
                    currentChat.updatedAt = Date.now();
                    
                    await APIService.updateChat(currentChat);
                    UI.updateCurrentChatHeader(currentChat);
                    
                    Utils.showToast('System prompt updated', 'success');
                    UI.closeModal(changeSystemModal);
                }
            }
        }
    },
    
    /**
     * Render system prompts in the change system modal
     */
    renderSystemPrompts() {
        const { systemPromptsContainer } = this.elements;
        
        if (!systemPromptsContainer || !window.App) return;
        
        systemPromptsContainer.innerHTML = '';
        
        App.state.systemMessages.forEach(msg => {
            const promptEl = document.createElement('div');
            promptEl.className = 'saved-system-message system-prompt-item';
            promptEl.dataset.id = msg.id;
            
            promptEl.innerHTML = `
                <div class="saved-system-message-header">
                    <div class="saved-system-message-title">${msg.name}</div>
                </div>
                <div class="saved-system-message-content">${Utils.truncateText(msg.content, 100)}</div>
            `;
            
            promptEl.addEventListener('click', () => {
                // Remove selected class from all prompts
                document.querySelectorAll('.system-prompt-item').forEach(el => {
                    el.classList.remove('selected');
                });
                
                // Add selected class to this prompt
                promptEl.classList.add('selected');
                
                // Clear custom input
                if (this.elements.currentSystemMessageInput) {
                    this.elements.currentSystemMessageInput.value = '';
                }
            });
            
            systemPromptsContainer.appendChild(promptEl);
        });
    },
    
    /**
     * Update the system message dropdown
     */
    updateSystemMessagesDropdown() {
        const { savedSystemMessagesDropdown } = this.elements;
        
        if (!savedSystemMessagesDropdown || !window.App) return;
        
        // Clear existing options except the first one
        savedSystemMessagesDropdown.innerHTML = '<option value="">-- Select a saved prompt --</option>';
        
        // Add options for each system message
        App.state.systemMessages.forEach(msg => {
            const option = document.createElement('option');
            option.value = msg.id;
            option.textContent = msg.name;
            savedSystemMessagesDropdown.appendChild(option);
        });
    }
};

// Export the Modals Object
window.Modals = Modals;