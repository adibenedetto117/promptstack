import os
from typing import List, Optional
import time
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
from dotenv import load_dotenv
from llama_cpp import Llama

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(title="DeepSeek LLM API")

# Mount static files directory
app.mount("/static", StaticFiles(directory="static"), name="static")

# Model configuration
MODEL_PATH = os.getenv("MODEL_PATH", "/app/models/deepseek-llm-7b-chat.Q6_K.gguf")
N_THREADS = int(os.getenv("THREADS", "4"))
N_CONTEXT = int(os.getenv("CONTEXT_LENGTH", "4096"))

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

# API endpoints
@app.get("/", response_class=HTMLResponse)
async def root():
    with open("static/index.html", "r") as f:
        html_content = f.read()
    return HTMLResponse(content=html_content, status_code=200)

@app.get("/api/info")
async def info():
    return {"status": "ok", "model": MODEL_PATH.split("/")[-1]}

@app.post("/v1/chat/completions")
async def chat_completions(request: ChatRequest):
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    # Format messages for the model
    prompt = ""
    for msg in request.messages:
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)