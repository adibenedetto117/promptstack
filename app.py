import os
import json
import time
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from dotenv import load_dotenv
from llama_cpp import Llama

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(title="LLM API")

# Mount static files directory
app.mount("/static", StaticFiles(directory="static"), name="static")

# Model configuration
MODEL_PATH = os.getenv("MODEL_PATH", "/app/models/model.gguf")
N_THREADS = int(os.getenv("THREADS", "4"))
N_CONTEXT = int(os.getenv("CONTEXT_LENGTH", "4096"))

# Storage paths
DATA_DIR = os.getenv("DATA_DIR", "data")
CHATS_DIR = os.path.join(DATA_DIR, "chats")
SYSTEM_MESSAGES_DIR = os.path.join(DATA_DIR, "system_messages")
SETTINGS_FILE = os.path.join(DATA_DIR, "settings.json")

# Create directories if they don't exist
os.makedirs(CHATS_DIR, exist_ok=True)
os.makedirs(SYSTEM_MESSAGES_DIR, exist_ok=True)

# Initialize model
try:
    print(f"Loading model from {MODEL_PATH}...")
    model = Llama(
        model_path=MODEL_PATH,
        n_threads=N_THREADS,
        n_ctx=N_CONTEXT,
    )
    print("Model loaded successfully!")
except Exception as e:
    print(f"Error loading model: {e}")
    model = None

# Request and response models
class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[Message]
    temperature: Optional[float] = 0.7
    max_tokens: Optional[int] = 512
    stream: Optional[bool] = False

class ChatResponse(BaseModel):
    text: str
    usage: dict

class ChatData(BaseModel):
    id: str
    title: str
    systemMessage: str
    messages: List[Dict[str, Any]]
    createdAt: int
    updatedAt: int

class SystemMessageData(BaseModel):
    id: str
    name: str
    content: str
    createdAt: int

class SettingsData(BaseModel):
    isDarkMode: Optional[bool] = False

# Helper functions for file operations
def save_chat(chat_data: dict) -> bool:
    """Save a chat to a file"""
    chat_id = chat_data.get("id")
    if not chat_id:
        return False
    
    chat_file = os.path.join(CHATS_DIR, f"{chat_id}.json")
    try:
        with open(chat_file, "w") as f:
            json.dump(chat_data, f, indent=2)
        return True
    except Exception as e:
        print(f"Error saving chat: {e}")
        return False

def load_chat(chat_id: str) -> Optional[dict]:
    """Load a chat from a file"""
    chat_file = os.path.join(CHATS_DIR, f"{chat_id}.json")
    if not os.path.exists(chat_file):
        return None
    
    try:
        with open(chat_file, "r") as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading chat: {e}")
        return None

def load_all_chats() -> List[dict]:
    """Load all chats from files"""
    chats = []
    for filename in os.listdir(CHATS_DIR):
        if filename.endswith(".json"):
            chat_id = filename.replace(".json", "")
            chat = load_chat(chat_id)
            if chat:
                chats.append(chat)
    return chats

def delete_chat(chat_id: str) -> bool:
    """Delete a chat file"""
    chat_file = os.path.join(CHATS_DIR, f"{chat_id}.json")
    if not os.path.exists(chat_file):
        return False
    
    try:
        os.remove(chat_file)
        return True
    except Exception as e:
        print(f"Error deleting chat: {e}")
        return False

def save_system_message(message_data: dict) -> bool:
    """Save a system message to a file"""
    message_id = message_data.get("id")
    if not message_id:
        return False
    
    message_file = os.path.join(SYSTEM_MESSAGES_DIR, f"{message_id}.json")
    try:
        with open(message_file, "w") as f:
            json.dump(message_data, f, indent=2)
        return True
    except Exception as e:
        print(f"Error saving system message: {e}")
        return False

def load_system_message(message_id: str) -> Optional[dict]:
    """Load a system message from a file"""
    message_file = os.path.join(SYSTEM_MESSAGES_DIR, f"{message_id}.json")
    if not os.path.exists(message_file):
        return None
    
    try:
        with open(message_file, "r") as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading system message: {e}")
        return None

def load_all_system_messages() -> List[dict]:
    """Load all system messages from files"""
    messages = []
    for filename in os.listdir(SYSTEM_MESSAGES_DIR):
        if filename.endswith(".json"):
            message_id = filename.replace(".json", "")
            message = load_system_message(message_id)
            if message:
                messages.append(message)
    return messages

def delete_system_message(message_id: str) -> bool:
    """Delete a system message file"""
    message_file = os.path.join(SYSTEM_MESSAGES_DIR, f"{message_id}.json")
    if not os.path.exists(message_file):
        return False
    
    try:
        os.remove(message_file)
        return True
    except Exception as e:
        print(f"Error deleting system message: {e}")
        return False

def save_settings(settings_data: dict) -> bool:
    """Save settings to a file"""
    try:
        with open(SETTINGS_FILE, "w") as f:
            json.dump(settings_data, f, indent=2)
        return True
    except Exception as e:
        print(f"Error saving settings: {e}")
        return False

def load_settings() -> Optional[dict]:
    """Load settings from a file"""
    if not os.path.exists(SETTINGS_FILE):
        return {"isDarkMode": False}
    
    try:
        with open(SETTINGS_FILE, "r") as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading settings: {e}")
        return {"isDarkMode": False}

# Create default system message if none exists
def ensure_default_system_message():
    """Ensure a default system message exists"""
    messages = load_all_system_messages()
    if not messages:
        default_message = {
            "id": "default",
            "name": "Default Assistant",
            "content": "You are a helpful AI assistant. Respond to user queries appropriately without assuming the system message applies to the current conversation unless explicitly mentioned by the user.",
            "createdAt": int(time.time() * 1000)
        }
        save_system_message(default_message)

# Ensure default system message exists
ensure_default_system_message()

# API endpoints
@app.get("/", response_class=HTMLResponse)
async def root():
    with open("static/index.html", "r") as f:
        html_content = f.read()
    return HTMLResponse(content=html_content, status_code=200)

@app.get("/api/info")
async def info():
    model_name = os.path.basename(MODEL_PATH) if MODEL_PATH else "Unknown"
    return {
        "status": "ok" if model is not None else "error",
        "model": model_name,
        "threads": N_THREADS,
        "context_length": N_CONTEXT
    }

@app.post("/v1/chat/completions")
async def chat_completions(request: ChatRequest):
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    # Process and format system message to give better instructions
    system_message = None
    modified_messages = []
    
    for msg in request.messages:
        if msg.role == "system":
            # Modify the system message to clarify how it should be used
            system_message = msg.content
            clarified_system_message = (
                "IMPORTANT INSTRUCTION: The following is contextual information that may be helpful "
                "during the conversation. DO NOT directly refer to or repeat this information unless "
                "relevant to answering a specific user query. DO NOT assume this information describes "
                "the current user unless they explicitly confirm it. DO NOT greet the user with details "
                "from this system message.\n\n"
                f"{system_message}"
            )
            modified_messages.append(Message(role="system", content=clarified_system_message))
        else:
            modified_messages.append(msg)
    
    # Format messages for the model
    prompt = ""
    for msg in modified_messages:
        if msg.role == "system":
            prompt += f"<|system|>\n{msg.content}</s>\n"
        elif msg.role == "user":
            prompt += f"<|user|>\n{msg.content}</s>\n"
        elif msg.role == "assistant":
            prompt += f"<|assistant|>\n{msg.content}</s>\n"
    
    # Add final assistant prompt
    prompt += "<|assistant|>\n"
    
    # Generate response
    start_time = time.time()
    try:
        response = model.create_completion(
            prompt=prompt,
            max_tokens=request.max_tokens,
            temperature=request.temperature,
            stop=["</s>", "<|user|>"],
        )
        end_time = time.time()
        
        # Format the response
        generated_text = response["choices"][0]["text"]
        tokens = {
            "prompt_tokens": response["usage"]["prompt_tokens"],
            "completion_tokens": response["usage"]["completion_tokens"],
            "total_tokens": response["usage"]["total_tokens"],
            "time_taken": round(end_time - start_time, 2)
        }
        
        return ChatResponse(text=generated_text, usage=tokens)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating completion: {str(e)}")

# API endpoints for chat management
@app.get("/api/chats")
async def get_chats():
    chats = load_all_chats()
    # Sort by updated time (newest first)
    chats.sort(key=lambda x: x.get("updatedAt", 0), reverse=True)
    return chats

@app.post("/api/chats")
async def create_chat(chat: ChatData):
    success = save_chat(chat.dict())
    if not success:
        raise HTTPException(status_code=500, detail="Failed to save chat")
    return {"success": True, "id": chat.id}

@app.put("/api/chats/{chat_id}")
async def update_chat(chat_id: str, chat: ChatData):
    if chat_id != chat.id:
        raise HTTPException(status_code=400, detail="Chat ID mismatch")
    
    success = save_chat(chat.dict())
    if not success:
        raise HTTPException(status_code=500, detail="Failed to update chat")
    return {"success": True}

@app.delete("/api/chats/{chat_id}")
async def remove_chat(chat_id: str):
    success = delete_chat(chat_id)
    if not success:
        raise HTTPException(status_code=404, detail="Chat not found")
    return {"success": True}

# API endpoints for system message management
@app.get("/api/system-messages")
async def get_system_messages():
    messages = load_all_system_messages()
    # Sort by created time (newest first)
    messages.sort(key=lambda x: x.get("createdAt", 0), reverse=True)
    return messages

@app.post("/api/system-messages")
async def create_system_message(message: SystemMessageData):
    success = save_system_message(message.dict())
    if not success:
        raise HTTPException(status_code=500, detail="Failed to save system message")
    return {"success": True, "id": message.id}

@app.delete("/api/system-messages/{message_id}")
async def remove_system_message(message_id: str):
    # Don't allow deleting the last system message
    messages = load_all_system_messages()
    if len(messages) <= 1:
        raise HTTPException(status_code=400, detail="Cannot delete the last system message")
    
    success = delete_system_message(message_id)
    if not success:
        raise HTTPException(status_code=404, detail="System message not found")
    return {"success": True}

# API endpoints for settings management
@app.get("/api/settings")
async def get_settings():
    settings = load_settings()
    return settings

@app.post("/api/settings")
async def update_settings(settings: SettingsData):
    success = save_settings(settings.dict())
    if not success:
        raise HTTPException(status_code=500, detail="Failed to save settings")
    return {"success": True}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)