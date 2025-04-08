/**
 * app.js - Main application entry point
 */

// Main App Object
const App = {
    // Application State
    state: {
        chats: [],
        systemMessages: [],
        currentChatId: null,
        isDarkMode: false,
        theme: 'auto'
    },
    
    /**
     * Initialize the application
     */
    async init() {
        console.log('Initializing AI Chat application...');
        
        // Show welcome message
        UI.showWelcomeMessage();
        
        // Initialize UI components
        UI.init();
        Modals.init();
        SystemMessages.init();
        Chat.init();
        
        // Load application data
        await this.loadApplicationData();
        
        console.log('AI Chat application initialized successfully!');
    },
    
    /**
     * Load application data from the server
     */
    async loadApplicationData() {
        try {
            // Load settings
            const settings = await APIService.loadSettings();
            if (settings) {
                this.applySettings(settings);
            }
            
            // Load system messages
            this.state.systemMessages = await APIService.loadSystemMessages() || [];
            
            // Create default system message if none exists
            await SystemMessages.ensureDefaultSystemMessage();
            
            // Render system messages
            SystemMessages.renderSystemMessages();
            Modals.updateSystemMessagesDropdown();
            
            // Load chats
            this.state.chats = await APIService.loadChats() || [];
            
            // Load the last chat or show empty state
            if (this.state.chats.length > 0) {
                // Find the most recently updated chat
                const sortedChats = [...this.state.chats].sort((a, b) => b.updatedAt - a.updatedAt);
                this.state.currentChatId = sortedChats[0].id;
                Chat.loadChat(this.state.currentChatId);
            } else {
                // Show empty state
                UI.showEmptyChatState();
            }
            
            // Fetch and display model info
            this.loadModelInfo();
            
            // Apply chat settings
            if (settings) {
                if (settings.temperature !== undefined) {
                    Chat.settings.temperature = settings.temperature;
                    const temperatureSlider = document.getElementById('temperature');
                    const temperatureValue = document.getElementById('temp-value');
                    if (temperatureSlider) temperatureSlider.value = settings.temperature;
                    if (temperatureValue) temperatureValue.textContent = settings.temperature;
                }
                
                if (settings.maxTokens !== undefined) {
                    Chat.settings.maxTokens = settings.maxTokens;
                    const maxTokensInput = document.getElementById('max-tokens');
                    if (maxTokensInput) maxTokensInput.value = settings.maxTokens;
                }
            }
            
            // Render UI
            Chat.renderChats();
            
            return true;
        } catch (error) {
            console.error('Error loading application data:', error);
            Utils.showToast('Error loading application data. Some features may not work correctly.', 'error');
            return false;
        }
    },
    
    /**
     * Apply settings to the application
     * @param {Object} settings The settings object
     */
    applySettings(settings) {
        if (!settings) return;
        
        // Apply dark mode
        if (settings.isDarkMode !== undefined) {
            this.state.isDarkMode = settings.isDarkMode;
            document.body.classList.toggle('dark-mode', settings.isDarkMode);
            
            const themeToggle = document.getElementById('theme-toggle');
            if (themeToggle) {
                themeToggle.innerHTML = settings.isDarkMode ? 
                    '<i class="fas fa-sun"></i>' : 
                    '<i class="fas fa-moon"></i>';
            }
        }
        
        // Apply theme setting
        if (settings.theme) {
            this.state.theme = settings.theme;
            
            const themeSelect = document.getElementById('theme-select');
            if (themeSelect) {
                themeSelect.value = settings.theme;
            }
            
            // Apply the theme
            if (settings.theme === 'auto') {
                document.body.classList.add('theme-auto');
                document.body.classList.remove('dark-mode');
                
                // Check system preference
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                if (prefersDark) {
                    document.body.classList.add('dark-mode');
                    if (themeToggle) themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
                }
            }
        }
    },
    
    /**
     * Load model information
     */
    async loadModelInfo() {
        try {
            const modelInfo = await APIService.fetchModelInfo();
            if (modelInfo) {
                UI.updateModelInfo(modelInfo);
            }
        } catch (error) {
            console.error('Error fetching model info:', error);
        }
    }
};

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

// Listen for system dark mode changes if using auto theme
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (App.state.theme === 'auto') {
        document.body.classList.toggle('dark-mode', e.matches);
        
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.innerHTML = e.matches ? 
                '<i class="fas fa-sun"></i>' : 
                '<i class="fas fa-moon"></i>';
        }
    }
});

// Export the App Object
window.App = App;