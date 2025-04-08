/**
 * api.js - API service for interacting with the backend
 */

// API Service Object
const APIService = {
    /**
     * Load all chats from the server
     * @returns {Promise<Array>} The list of chats
     */
    async loadChats() {
        try {
            const response = await fetch('/api/chats');
            if (response.ok) {
                return await response.json();
            }
            return [];
        } catch (error) {
            console.error('Error loading chats:', error);
            return [];
        }
    },
    
    /**
     * Save a new chat to the server
     * @param {Object} chat The chat object to save
     * @returns {Promise<boolean>} Whether the operation was successful
     */
    async saveChat(chat) {
        try {
            const response = await fetch('/api/chats', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(chat)
            });
            return response.ok;
        } catch (error) {
            console.error('Error saving chat:', error);
            return false;
        }
    },
    
    /**
     * Update an existing chat
     * @param {Object} chat The chat object to update
     * @returns {Promise<boolean>} Whether the operation was successful
     */
    async updateChat(chat) {
        try {
            const response = await fetch(`/api/chats/${chat.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(chat)
            });
            return response.ok;
        } catch (error) {
            console.error('Error updating chat:', error);
            return false;
        }
    },
    
    /**
     * Delete a chat from the server
     * @param {string} chatId The ID of the chat to delete
     * @returns {Promise<boolean>} Whether the operation was successful
     */
    async deleteChat(chatId) {
        try {
            const response = await fetch(`/api/chats/${chatId}`, {
                method: 'DELETE'
            });
            return response.ok;
        } catch (error) {
            console.error('Error deleting chat:', error);
            return false;
        }
    },
    
    /**
     * Load all system messages from the server
     * @returns {Promise<Array>} The list of system messages
     */
    async loadSystemMessages() {
        try {
            const response = await fetch('/api/system-messages');
            if (response.ok) {
                return await response.json();
            }
            return [];
        } catch (error) {
            console.error('Error loading system messages:', error);
            return [];
        }
    },
    
    /**
     * Save a new system message to the server
     * @param {Object} message The system message object to save
     * @returns {Promise<boolean>} Whether the operation was successful
     */
    async saveSystemMessage(message) {
        try {
            const response = await fetch('/api/system-messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(message)
            });
            return response.ok;
        } catch (error) {
            console.error('Error saving system message:', error);
            return false;
        }
    },
    
    /**
     * Delete a system message from the server
     * @param {string} messageId The ID of the system message to delete
     * @returns {Promise<boolean>} Whether the operation was successful
     */
    async deleteSystemMessage(messageId) {
        try {
            const response = await fetch(`/api/system-messages/${messageId}`, {
                method: 'DELETE'
            });
            return response.ok;
        } catch (error) {
            console.error('Error deleting system message:', error);
            return false;
        }
    },
    
    /**
     * Save application settings to the server
     * @param {Object} settings The settings object to save
     * @returns {Promise<boolean>} Whether the operation was successful
     */
    async saveSettings(settings) {
        try {
            const response = await fetch('/api/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(settings)
            });
            return response.ok;
        } catch (error) {
            console.error('Error saving settings:', error);
            return false;
        }
    },
    
    /**
     * Load application settings from the server
     * @returns {Promise<Object|null>} The settings object or null if an error occurred
     */
    async loadSettings() {
        try {
            const response = await fetch('/api/settings');
            if (response.ok) {
                return await response.json();
            }
            return null;
        } catch (error) {
            console.error('Error loading settings:', error);
            return null;
        }
    },
    
    /**
     * Fetch model information from the server
     * @returns {Promise<Object|null>} The model info object or null if an error occurred
     */
    async fetchModelInfo() {
        try {
            const response = await fetch('/api/info');
            if (response.ok) {
                return await response.json();
            }
            return null;
        } catch (error) {
            console.error('Error fetching model info:', error);
            return null;
        }
    },
    
    /**
     * Send a chat completion request to the API
     * @param {Array} messages Array of message objects
     * @param {Object} options Additional options like temperature and max_tokens
     * @returns {Promise<Object>} The response from the API
     */
    async sendChatRequest(messages, options = {}) {
        try {
            const defaultOptions = {
                temperature: 0.7,
                max_tokens: 512
            };
            
            const requestOptions = { ...defaultOptions, ...options };
            
            const response = await fetch('/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    messages: messages,
                    temperature: requestOptions.temperature,
                    max_tokens: requestOptions.max_tokens
                })
            });
            
            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error sending chat request:', error);
            throw error;
        }
    }
};

// Export the API Service
window.APIService = APIService;