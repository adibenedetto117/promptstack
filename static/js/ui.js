/**
 * ui.js - UI handlers and rendering functions
 */

// UI Object
const UI = {
    // DOM Elements
    elements: {
        // Main elements
        sidebar: document.getElementById('sidebar'),
        menuToggle: document.getElementById('menu-toggle'),
        themeToggle: document.getElementById('theme-toggle'),
        themeSelect: document.getElementById('theme-select'),
        messagesContainer: document.getElementById('chat-messages'),
        userInput: document.getElementById('user-input'),
        sendButton: document.getElementById('send-button'),
        typingIndicator: document.getElementById('typing-indicator'),
        modelInfo: document.getElementById('model-info'),
        currentChatTitle: document.getElementById('current-chat-title'),
        currentSystemMessage: document.getElementById('current-system-message'),
        
        // List containers
        chatsList: document.getElementById('chats-list'),
        systemMessagesList: document.getElementById('system-messages-list'),
        
        // Tab elements
        sidebarTabs: document.querySelectorAll('.sidebar-tab'),
        tabPanels: document.querySelectorAll('.tab-panel'),
        
        // Settings elements
        temperatureSlider: document.getElementById('temperature'),
        temperatureValue: document.getElementById('temp-value'),
        maxTokens: document.getElementById('max-tokens'),
        
        // Modals
        modalOverlays: document.querySelectorAll('.modal-overlay'),
        closeModalButtons: document.querySelectorAll('[data-close-modal]')
    },
    
    /**
     * Initialize the UI components
     */
    init() {
        this.setupEventListeners();
        this.setupInputAutoResize();
    },
    
    /**
     * Set up event listeners for UI elements
     */
    setupEventListeners() {
        const { 
            menuToggle, themeToggle, themeSelect, sidebarTabs, 
            closeModalButtons, modalOverlays, temperatureSlider, userInput 
        } = this.elements;
        
        // Mobile menu toggle
        if (menuToggle) {
            menuToggle.addEventListener('click', () => {
                this.toggleSidebar();
            });
        }
        
        // Theme toggle button
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                this.toggleDarkMode();
            });
        }
        
        // Theme dropdown selector
        if (themeSelect) {
            themeSelect.addEventListener('change', (e) => {
                this.setTheme(e.target.value);
            });
        }
        
        // Sidebar tabs
        sidebarTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                this.switchTab(tab.dataset.tab);
            });
        });
        
        // Modal close buttons
        closeModalButtons.forEach(button => {
            button.addEventListener('click', () => {
                const modal = button.closest('.modal-overlay');
                this.closeModal(modal);
            });
        });
        
        // Modal overlay click to close
        modalOverlays.forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    this.closeModal(overlay);
                }
            });
        });
        
        // Temperature slider
        if (temperatureSlider) {
            temperatureSlider.addEventListener('input', (e) => {
                this.updateTemperatureValue(e.target.value);
            });
        }
        
        // Auto-resize textarea
        if (userInput) {
            userInput.addEventListener('input', () => {
                this.autoResizeTextarea(userInput);
            });
        }
    },
    
    /**
     * Set up auto-resize for textarea inputs
     */
    setupInputAutoResize() {
        document.querySelectorAll('textarea').forEach(textarea => {
            textarea.addEventListener('input', () => {
                this.autoResizeTextarea(textarea);
            });
        });
    },
    
    /**
     * Auto-resize a textarea based on its content
     * @param {HTMLTextAreaElement} textarea The textarea element
     */
    autoResizeTextarea(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = (textarea.scrollHeight) + 'px';
    },
    
    /**
     * Toggle the sidebar visibility on mobile
     */
    toggleSidebar() {
        const { sidebar } = this.elements;
        sidebar.classList.toggle('active');
    },
    
    /**
     * Toggle dark mode
     * @param {boolean} savePreference Whether to save the preference
     */
    async toggleDarkMode(savePreference = true) {
        const isDarkMode = document.body.classList.toggle('dark-mode');
        const { themeToggle, themeSelect } = this.elements;
        
        themeToggle.innerHTML = isDarkMode ? 
            '<i class="fas fa-sun"></i>' : 
            '<i class="fas fa-moon"></i>';
            
        // Update theme selector if it exists
        if (themeSelect) {
            themeSelect.value = isDarkMode ? 'dark' : 'light';
        }
        
        // Save setting to server
        if (savePreference) {
            await APIService.saveSettings({ isDarkMode });
        }
        
        return isDarkMode;
    },
    
    /**
     * Set the theme based on value
     * @param {string} theme The theme to set ('light', 'dark', or 'auto')
     */
    async setTheme(theme) {
        document.body.classList.remove('theme-auto', 'dark-mode');
        const { themeToggle } = this.elements;
        
        if (theme === 'auto') {
            document.body.classList.add('theme-auto');
            
            // Check if system prefers dark mode
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            
            if (prefersDark) {
                document.body.classList.add('dark-mode');
                themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
            } else {
                themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
            }
        } else if (theme === 'dark') {
            document.body.classList.add('dark-mode');
            themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        } else {
            themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        }
        
        // Save setting to server
        await APIService.saveSettings({ theme });
    },
    
    /**
     * Switch between sidebar tabs
     * @param {string} tabName The name of the tab to switch to
     */
    switchTab(tabName) {
        const { sidebarTabs, tabPanels } = this.elements;
        
        // Update tab buttons
        sidebarTabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });
        
        // Update tab panels
        tabPanels.forEach(panel => {
            panel.classList.toggle('active', panel.id === `${tabName}-panel`);
        });
    },
    
    /**
     * Open a modal dialog
     * @param {HTMLElement} modal The modal element to open
     */
    openModal(modal) {
        modal.classList.add('active');
        
        // Find the first input and focus it
        setTimeout(() => {
            const firstInput = modal.querySelector('input, textarea');
            if (firstInput) {
                firstInput.focus();
            }
        }, 100);
    },
    
    /**
     * Close a modal dialog
     * @param {HTMLElement} modal The modal element to close
     */
    closeModal(modal) {
        modal.classList.remove('active');
    },
    
    /**
     * Update the temperature value display
     * @param {number} value The temperature value
     */
    updateTemperatureValue(value) {
        const { temperatureValue } = this.elements;
        if (temperatureValue) {
            temperatureValue.textContent = value;
        }
    },
    
    /**
     * Show the typing indicator
     */
    showTypingIndicator() {
        const { typingIndicator } = this.elements;
        typingIndicator.classList.add('active');
    },
    
    /**
     * Hide the typing indicator
     */
    hideTypingIndicator() {
        const { typingIndicator } = this.elements;
        typingIndicator.classList.remove('active');
    },
    
    /**
     * Show welcome message when no chats are present
     */
    showWelcomeMessage() {
        const { messagesContainer } = this.elements;
        
        messagesContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-comments empty-state-icon"></i>
                <div class="empty-state-title">Welcome to AI Chat</div>
                <div class="empty-state-text">
                    Start a new conversation or select a previous chat from the sidebar.
                </div>
                <button class="btn btn-primary" id="welcome-new-chat-btn">
                    <i class="fas fa-plus"></i> New Chat
                </button>
            </div>
        `;
        
        // Add event listener to the welcome new chat button
        document.getElementById('welcome-new-chat-btn').addEventListener('click', () => {
            // We'll implement this in the Chat module
            if (typeof Chat !== 'undefined' && Chat.openNewChatModal) {
                Chat.openNewChatModal();
            }
        });
    },
    
    /**
     * Show empty chat state when no chat is selected
     */
    showEmptyChatState() {
        const { messagesContainer, currentChatTitle, currentSystemMessage } = this.elements;
        
        currentChatTitle.textContent = 'No Active Chat';
        currentSystemMessage.textContent = 'Start a new conversation';
        
        messagesContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-comment-slash empty-state-icon"></i>
                <div class="empty-state-title">No Active Conversation</div>
                <div class="empty-state-text">
                    Start a new chat or select one from the sidebar.
                </div>
                <button class="btn btn-primary" id="empty-new-chat-btn">
                    <i class="fas fa-plus"></i> New Chat
                </button>
            </div>
        `;
        
        // Add event listener to the empty new chat button
        document.getElementById('empty-new-chat-btn').addEventListener('click', () => {
            // We'll implement this in the Chat module
            if (typeof Chat !== 'undefined' && Chat.openNewChatModal) {
                Chat.openNewChatModal();
            }
        });
    },
    
    /**
     * Update the current chat header
     * @param {Object} chat The current chat object
     */
    updateCurrentChatHeader(chat) {
        const { currentChatTitle, currentSystemMessage } = this.elements;
        
        if (chat) {
            currentChatTitle.textContent = chat.title;
            currentSystemMessage.textContent = `System: ${Utils.truncateText(chat.systemMessage, 50)}`;
        } else {
            currentChatTitle.textContent = 'No Active Chat';
            currentSystemMessage.textContent = '';
        }
    },
    
    /**
     * Update model info display
     * @param {Object} info The model information object
     */
    updateModelInfo(info) {
        const { modelInfo } = this.elements;
        
        if (info && info.model) {
            modelInfo.textContent = info.model;
        }
    }
};

// Export the UI Object
window.UI = UI;