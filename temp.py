import tkinter as tk
from tkinter import ttk, messagebox, font
import threading
import requests
import os
import shutil
from pathlib import Path
import queue
import time

# --- Configuration ---
MODELS_DIR = Path("./ai_models")  # Directory to store downloaded models

# Example Model Definitions (Replace with actual URLs/data)
# In a real app, this might come from an API or a config file.
# Make sure URLs point to actual downloadable model files (e.g., .bin, .gguf)
AVAILABLE_MODELS = {
    "DeepSeek-Coder-1.3b": {
        "url": "https://huggingface.co/deepseek-ai/deepseek-coder-1.3b-instruct/resolve/main/pytorch_model.bin?download=true", # Example URL - Replace!
        "filename": "deepseek-coder-1.3b-instruct.bin", # The final filename
        "description": "DeepSeek Coder 1.3B Instruct Model"
    },
    "Mistral-7B-Instruct-v0.1": {
        "url": "https://huggingface.co/mistralai/Mistral-7B-Instruct-v0.1/resolve/main/pytorch_model.bin.index.json?download=true", # Example URL - Replace!
        "filename": "mistral-7b-instruct-v0.1.json", # Example - might need multiple files or different formats
        "description": "Mistral 7B Instruct v0.1"
    },
    "TinyLlama-1.1B-Chat": {
        # Example placeholder - find a real GGUF or other format URL
        "url": "https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf?download=true",
        "filename": "tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf",
        "description": "TinyLlama 1.1B Chat v1.0 (GGUF)"
    }
    # Add more models here
}

# Ensure the main models directory exists
MODELS_DIR.mkdir(parents=True, exist_ok=True)

# --- Application Class ---
class ModelManagerApp:
    def __init__(self, root):
        self.root = root
        self.root.title("AI Model Manager")
        self.root.geometry("600x500")

        # Style
        self.style = ttk.Style()
        self.style.theme_use('clam') # Use a modern theme if available

        # Data structures
        self.download_queue = queue.Queue()
        self.active_download_thread = None
        self.selected_model_name = None

        # UI Elements
        self.setup_ui()
        self.populate_models_list()

        # Start queue processor
        self.process_queue()

    def setup_ui(self):
        # Frame for Listbox and Scrollbar
        list_frame = ttk.Frame(self.root, padding="10")
        list_frame.pack(fill=tk.BOTH, expand=True)

        # Listbox
        self.model_listbox = tk.Listbox(list_frame, height=15, exportselection=False, font=("Arial", 11))
        self.model_listbox.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        self.model_listbox.bind('<<ListboxSelect>>', self.on_model_select)

        # Scrollbar for Listbox
        scrollbar = ttk.Scrollbar(list_frame, orient=tk.VERTICAL, command=self.model_listbox.yview)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        self.model_listbox.config(yscrollcommand=scrollbar.set)

        # Frame for Buttons
        button_frame = ttk.Frame(self.root, padding="10")
        button_frame.pack(fill=tk.X)

        self.download_button = ttk.Button(button_frame, text="Download", command=self.download_selected_model, state=tk.DISABLED)
        self.download_button.pack(side=tk.LEFT, padx=5)

        self.remove_button = ttk.Button(button_frame, text="Remove", command=self.remove_selected_model, state=tk.DISABLED)
        self.remove_button.pack(side=tk.LEFT, padx=5)

        # Frame for Progress and Status
        status_frame = ttk.Frame(self.root, padding="10")
        status_frame.pack(fill=tk.X)

        # Progress Bar
        self.progress_label = ttk.Label(status_frame, text="Progress:")
        self.progress_label.pack(side=tk.LEFT, padx=(0, 5))
        self.progress_bar = ttk.Progressbar(status_frame, orient=tk.HORIZONTAL, length=300, mode='determinate')
        self.progress_bar.pack(side=tk.LEFT, fill=tk.X, expand=True)

        # Status Label
        self.status_label = ttk.Label(self.root, text="Status: Ready", padding="5", relief=tk.SUNKEN, anchor=tk.W)
        self.status_label.pack(side=tk.BOTTOM, fill=tk.X)

    def get_model_path(self, model_name):
        """Gets the expected directory path for a given model."""
        # Use a sanitized version of the model name for the folder
        folder_name = "".join(c for c in model_name if c.isalnum() or c in ('-', '_')).rstrip()
        return MODELS_DIR / folder_name

    def get_model_status(self, model_name):
        """Checks if the model appears to be downloaded."""
        model_path = self.get_model_path(model_name)
        # A simple check: does the directory exist and contain the expected file?
        # More robust checks might verify file integrity/size if known.
        expected_file = model_path / AVAILABLE_MODELS[model_name]['filename']
        return model_path.is_dir() and expected_file.is_file()

    def update_listbox_entry_status(self, index, model_name, is_downloaded):
        """Updates the text in the listbox for a specific model."""
        status_text = "[Downloaded]" if is_downloaded else "[Available]"
        display_text = f"{model_name} {status_text}"
        self.model_listbox.delete(index)
        self.model_listbox.insert(index, display_text)
        if is_downloaded:
             self.model_listbox.itemconfig(index, {'fg': 'green'})
        else:
            self.model_listbox.itemconfig(index, {'fg': 'black'}) # Or default color


    def populate_models_list(self):
        """Fills the listbox with available models and their status."""
        self.model_listbox.delete(0, tk.END)  # Clear existing entries
        sorted_model_names = sorted(AVAILABLE_MODELS.keys())
        for i, model_name in enumerate(sorted_model_names):
            is_downloaded = self.get_model_status(model_name)
            self.update_listbox_entry_status(i, model_name, is_downloaded)


    def on_model_select(self, event=None):
        """Handles selection changes in the listbox."""
        selection_indices = self.model_listbox.curselection()
        if not selection_indices:
            self.selected_model_name = None
            self.download_button.config(state=tk.DISABLED)
            self.remove_button.config(state=tk.DISABLED)
            return

        selected_index = selection_indices[0]
        selected_text = self.model_listbox.get(selected_index)
        # Extract model name (remove status part)
        self.selected_model_name = selected_text.split(" [")[0]

        if self.selected_model_name in AVAILABLE_MODELS:
            is_downloaded = self.get_model_status(self.selected_model_name)
            # Enable/disable buttons based on status and if a download is active
            can_download = not is_downloaded and self.active_download_thread is None
            can_remove = is_downloaded and self.active_download_thread is None

            self.download_button.config(state=tk.NORMAL if can_download else tk.DISABLED)
            self.remove_button.config(state=tk.NORMAL if can_remove else tk.DISABLED)
            self.update_status(f"Selected: {self.selected_model_name} ({AVAILABLE_MODELS[self.selected_model_name]['description']})")
        else:
             # Should not happen if list population is correct
            self.selected_model_name = None
            self.download_button.config(state=tk.DISABLED)
            self.remove_button.config(state=tk.DISABLED)
            self.update_status("Error: Invalid selection.")


    def update_status(self, message):
        """Updates the status bar text."""
        self.status_label.config(text=f"Status: {message}")
        # Force GUI update if needed immediately (use sparingly)
        # self.root.update_idletasks()

    def download_selected_model(self):
        """Starts the download process for the selected model."""
        if not self.selected_model_name or self.active_download_thread:
            return

        model_info = AVAILABLE_MODELS.get(self.selected_model_name)
        if not model_info:
            messagebox.showerror("Error", "Model details not found.")
            return

        model_url = model_info['url']
        model_filename = model_info['filename']
        model_dest_dir = self.get_model_path(self.selected_model_name)
        model_dest_path = model_dest_dir / model_filename

        # Prevent starting multiple downloads
        if self.active_download_thread and self.active_download_thread.is_alive():
             messagebox.showwarning("Busy", "Another download is already in progress.")
             return

        # Disable buttons during download
        self.download_button.config(state=tk.DISABLED)
        self.remove_button.config(state=tk.DISABLED)
        self.update_status(f"Starting download for {self.selected_model_name}...")
        self.progress_bar['value'] = 0

        # Create target directory
        model_dest_dir.mkdir(parents=True, exist_ok=True)

        # Start download in a separate thread
        self.active_download_thread = threading.Thread(
            target=self.download_thread_func,
            args=(model_url, model_dest_path, self.selected_model_name),
            daemon=True # Allows app to exit even if thread is running
        )
        self.active_download_thread.start()

    def download_thread_func(self, url, destination_path, model_name):
        """The actual download logic running in a thread."""
        try:
            self.download_queue.put({"type": "status", "message": f"Connecting to {url}..."})
            response = requests.get(url, stream=True, timeout=30) # Added timeout
            response.raise_for_status()  # Raise HTTPError for bad responses (4xx or 5xx)

            total_size_in_bytes = response.headers.get('content-length')
            if total_size_in_bytes:
                total_size_in_bytes = int(total_size_in_bytes)
                self.download_queue.put({"type": "progress_max", "value": total_size_in_bytes}) # Inform GUI of total size if possible
            else:
                total_size_in_bytes = None # Indicate unknown size
                self.download_queue.put({"type": "progress_mode", "value": "indeterminate"}) # Use indeterminate mode

            block_size = 8192 # 8KB chunks
            downloaded_size = 0

            self.download_queue.put({"type": "status", "message": f"Downloading {model_name}..."})

            with open(destination_path, 'wb') as file:
                for chunk in response.iter_content(chunk_size=block_size):
                    if chunk:  # Filter out keep-alive new chunks
                        file.write(chunk)
                        downloaded_size += len(chunk)
                        if total_size_in_bytes:
                             # Calculate percentage for determinate mode
                             percentage = (downloaded_size / total_size_in_bytes) * 100
                             self.download_queue.put({"type": "progress", "value": percentage})
                        else:
                             # Indeterminate mode doesn't use percentage, maybe update status periodically
                             # Put a small progress update just to show activity
                             self.download_queue.put({"type": "progress_step"})


            # Ensure progress reaches 100% on completion if determinate
            if total_size_in_bytes:
                 self.download_queue.put({"type": "progress", "value": 100})

            self.download_queue.put({"type": "complete", "model_name": model_name})

        except requests.exceptions.RequestException as e:
            self.download_queue.put({"type": "error", "message": f"Download failed: {e}"})
            # Clean up potentially incomplete file
            if destination_path.exists():
                try:
                    os.remove(destination_path)
                except OSError as remove_err:
                    print(f"Warning: Could not remove incomplete file {destination_path}: {remove_err}")
        except Exception as e:
             self.download_queue.put({"type": "error", "message": f"An unexpected error occurred: {e}"})
             # Clean up potentially incomplete file
             if destination_path.exists():
                 try:
                     os.remove(destination_path)
                 except OSError as remove_err:
                     print(f"Warning: Could not remove incomplete file {destination_path}: {remove_err}")
        finally:
            # Signal the thread is finishing, regardless of success/failure
             self.download_queue.put({"type": "thread_done"})


    def remove_selected_model(self):
        """Removes the selected model's folder."""
        if not self.selected_model_name or self.active_download_thread:
            return

        if not self.get_model_status(self.selected_model_name):
            messagebox.showinfo("Info", f"Model '{self.selected_model_name}' is not downloaded.")
            return

        if messagebox.askyesno("Confirm Removal", f"Are you sure you want to remove the model '{self.selected_model_name}'?"):
            model_path = self.get_model_path(self.selected_model_name)
            try:
                self.update_status(f"Removing {self.selected_model_name}...")
                shutil.rmtree(model_path) # Removes the directory and its contents
                self.update_status(f"Successfully removed {self.selected_model_name}.")
                # Update listbox
                selection_indices = self.model_listbox.curselection()
                if selection_indices:
                    idx = selection_indices[0]
                    self.update_listbox_entry_status(idx, self.selected_model_name, False)
                # Reselect to update button states correctly
                self.on_model_select()

            except OSError as e:
                messagebox.showerror("Error", f"Failed to remove model folder '{model_path}':\n{e}")
                self.update_status(f"Error removing {self.selected_model_name}.")
            except Exception as e:
                messagebox.showerror("Error", f"An unexpected error occurred during removal:\n{e}")
                self.update_status(f"Error removing {self.selected_model_name}.")

    def process_queue(self):
        """Processes messages from the download thread queue."""
        try:
            while True: # Process all messages currently in queue
                msg = self.download_queue.get_nowait()

                msg_type = msg.get("type")

                if msg_type == "status":
                    self.update_status(msg["message"])
                elif msg_type == "progress_max": # Set total size for determinate progress
                     self.progress_bar.config(maximum=100, mode='determinate') # Assuming percentage later
                elif msg_type == "progress_mode": # Switch progress bar mode
                     self.progress_bar.config(mode=msg["value"])
                     if msg["value"] == "indeterminate":
                         self.progress_bar.start(10) # Start pulsing animation
                     else:
                         self.progress_bar.stop() # Stop pulsing
                elif msg_type == "progress":
                    if self.progress_bar['mode'] == 'determinate':
                        self.progress_bar['value'] = msg["value"]
                elif msg_type == "progress_step": # For indeterminate, just step it
                     if self.progress_bar['mode'] == 'indeterminate':
                         self.progress_bar.step(5) # Advance indeterminate bar slightly
                elif msg_type == "complete":
                    model_name = msg["model_name"]
                    self.update_status(f"Download complete: {model_name}")
                    if self.progress_bar['mode'] == 'indeterminate':
                        self.progress_bar.stop()
                        self.progress_bar['value'] = 100 # Show full bar on completion
                    # Update listbox status
                    list_items = self.model_listbox.get(0, tk.END)
                    try:
                        # Find the index matching the completed model name
                        idx = next(i for i, item in enumerate(list_items) if item.startswith(model_name))
                        self.update_listbox_entry_status(idx, model_name, True)
                         # If the completed model is still the selected one, update buttons
                        if self.selected_model_name == model_name:
                           self.on_model_select() # Re-evaluate button states
                    except StopIteration:
                        print(f"Warning: Completed model '{model_name}' not found in listbox?")

                elif msg_type == "error":
                    self.update_status(f"Error: {msg['message']}")
                    messagebox.showerror("Download Error", msg['message'])
                    if self.progress_bar['mode'] == 'indeterminate':
                        self.progress_bar.stop()
                    self.progress_bar['value'] = 0 # Reset progress bar on error
                    # Re-enable buttons if selection exists
                    if self.selected_model_name:
                        self.on_model_select()


                elif msg_type == "thread_done":
                     self.active_download_thread = None # Mark thread as finished
                     # Final check to enable buttons based on current selection
                     if self.selected_model_name:
                        self.on_model_select()
                     else: # No selection, ensure buttons are disabled
                         self.download_button.config(state=tk.DISABLED)
                         self.remove_button.config(state=tk.DISABLED)
                     if self.progress_bar['mode'] == 'indeterminate':
                          self.progress_bar.stop() # Ensure stopped if it was indeterminate


        except queue.Empty:
            # Queue is empty, do nothing this time
            pass
        finally:
            # Schedule the next check
            self.root.after(100, self.process_queue) # Check queue every 100ms

# --- Main Execution ---
if __name__ == "__main__":
    root = tk.Tk()
    app = ModelManagerApp(root)
    root.mainloop()