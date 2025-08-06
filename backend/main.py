import os
import asyncio
from fastapi import FastAPI, Request, UploadFile, Form
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from llama_cpp import Llama
from fastapi.middleware.cors import CORSMiddleware
import fitz  # PyMuPDF

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # or ["http://localhost:5173"] for tighter security
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Static & template setup
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# -----------------------------------------------------------------------------
# Initialize Mistral-7B-Instruct on GPU with a large batch size
# -----------------------------------------------------------------------------
MODEL_PATH = os.path.expanduser(
    "~/models/mistral/mistral-7b-instruct-v0.3.Q4_K_M.gguf"
)
llm = Llama(
    model_path=MODEL_PATH,
    n_ctx=2048,
    n_threads=6,        # CPU threads for scheduling
    n_gpu_layers=32,    # offload all 32 transformer layers to GPU
    n_batch=512,        # batch size for faster per-token throughput
    use_mlock=True,     # lock model in RAM
    use_mmap=True,      # memory-map the model file
)

# In-memory chat history
chat_history: list[dict[str, str]] = []

# -----------------------------------------------------------------------------
# Routes
# -----------------------------------------------------------------------------

@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    return templates.TemplateResponse("index.html", {
        "request": request,
        "history": chat_history
    })


@app.post("/chat")
async def chat_endpoint(message: str = Form(...)):
    # 1) record user
    chat_history.append({"role": "user", "content": message})

    # 2) build full prompt
    prompt = "".join(f"{h['role']}: {h['content']}\n" for h in chat_history)
    prompt += "assistant:"

    # 3) run inference in a thread so FastAPI can serve other requests
    response: dict = await asyncio.to_thread(
        llm,
        prompt,
        max_tokens=256,
        stop=["user:", "assistant:"],
        temperature=0.7,
        top_p=0.9,
    )

    # 4) extract assistant reply
    reply = response["choices"][0]["text"].strip()

    # 5) record assistant
    chat_history.append({"role": "assistant", "content": reply})

    return {"answer": reply}


@app.post("/upload")
async def upload_file(file: UploadFile):
    os.makedirs("uploads", exist_ok=True)
    save_path = os.path.join("uploads", file.filename)
    contents = await file.read()
    with open(save_path, "wb") as f:
        f.write(contents)

    preview = ""
    if file.filename.lower().endswith(".pdf"):
        doc = fitz.open(save_path)
        pages = [page.get_text() for page in doc]
        preview = "\n".join(pages)

    return {"filename": file.filename, "preview": preview[:500]}

