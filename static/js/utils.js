/**
 * utils.js - Utility functions for the application
 */

// Utility Object
const Utils = {
    /**
     * Generate a unique ID
     * @returns {string} Unique ID string
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substring(2);
    },
    
    /**
     * Format a date into a readable string
     * @param {number} timestamp The timestamp to format
     * @returns {string} The formatted date string
     */
    formatDate(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleString();
    },
    
    /**
     * Format a relative time (e.g. "2 hours ago")
     * @param {number} timestamp The timestamp to format
     * @returns {string} The relative time string
     */
    formatRelativeTime(timestamp) {
        const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
        const now = Date.now();
        const diff = timestamp - now;
        
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (Math.abs(days) > 0) {
            return rtf.format(days, 'day');
        }
        
        if (Math.abs(hours) > 0) {
            return rtf.format(hours, 'hour');
        }
        
        if (Math.abs(minutes) > 0) {
            return rtf.format(minutes, 'minute');
        }
        
        return rtf.format(seconds, 'second');
    },
    
    /**
     * Show a toast notification
     * @param {string} message The message to display
     * @param {string} type The type of toast (info, success, warning, error)
     * @param {number} duration How long to show the toast (ms)
     */
    showToast(message, type = 'info', duration = 3000) {
        // Create toast container if it doesn't exist
        let toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            toastContainer.className = 'toast-container';
            document.body.appendChild(toastContainer);
        }
        
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        // Add icon based on type
        let icon = 'info-circle';
        let iconColor = 'var(--primary-color)';
        
        if (type === 'success') {
            icon = 'check-circle';
            iconColor = 'var(--success-color)';
        } else if (type === 'warning') {
            icon = 'exclamation-triangle';
            iconColor = 'var(--warning-color)';
        } else if (type === 'error') {
            icon = 'exclamation-circle';
            iconColor = 'var(--danger-color)';
        }
        
        toast.innerHTML = `
            <i class="fas fa-${icon}" style="margin-right: 10px; color: ${iconColor}"></i>
            <span>${message}</span>
        `;
        
        // Add to container
        toastContainer.appendChild(toast);
        
        // Remove after specified duration
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => {
                if (toastContainer.contains(toast)) {
                    toastContainer.removeChild(toast);
                }
            }, 500);
        }, duration);
    },
    
    /**
     * Show a confirmation dialog
     * @param {string} message The confirmation message
     * @param {string} title The dialog title
     * @param {Function} onConfirm Callback function when confirmed
     * @param {string} confirmText Text for the confirm button
     * @param {string} cancelText Text for the cancel button
     */
    showConfirmation(message, title = 'Confirmation', onConfirm, confirmText = 'Confirm', cancelText = 'Cancel') {
        const confirmModal = document.getElementById('confirm-modal');
        const confirmTitle = document.getElementById('confirm-title');
        const confirmMessage = document.getElementById('confirm-message');
        const confirmButton = document.getElementById('confirm-action-btn');
        const cancelButtons = confirmModal.querySelectorAll('[data-close-modal]');
        
        confirmTitle.textContent = title;
        confirmMessage.textContent = message;
        confirmButton.textContent = confirmText;
        
        // Set up confirm action
        const confirmHandler = () => {
            onConfirm();
            UI.closeModal(confirmModal);
            // Remove the event listener to prevent memory leaks
            confirmButton.removeEventListener('click', confirmHandler);
        };
        
        // Remove any existing event listeners to prevent duplicates
        confirmButton.replaceWith(confirmButton.cloneNode(true));
        
        // Get the new button reference after cloning
        const newConfirmButton = document.getElementById('confirm-action-btn');
        
        // Add event listener to the new button
        newConfirmButton.addEventListener('click', confirmHandler);
        
        // Show the modal
        UI.openModal(confirmModal);
    },
    
    /**
     * Truncate text to a specified length
     * @param {string} text The text to truncate
     * @param {number} maxLength Maximum length before truncating
     * @returns {string} The truncated text
     */
    truncateText(text, maxLength) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    },
    
    /**
     * Debounce a function call
     * @param {Function} func The function to debounce
     * @param {number} wait Time to wait in ms
     * @returns {Function} Debounced function
     */
    debounce(func, wait = 300) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    },
    
    /**
     * Escape HTML special characters
     * @param {string} html The HTML string to escape
     * @returns {string} Escaped HTML string
     */
    escapeHtml(html) {
        const div = document.createElement('div');
        div.textContent = html;
        return div.innerHTML;
    }
};

// Export the Utilities
window.Utils = Utils;