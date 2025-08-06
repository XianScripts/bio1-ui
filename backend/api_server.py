from fastapi import FastAPI, WebSocket
from llama_cpp import Llama
import os, asyncio, json

MODEL_PATH = "/home/bio/bio1-chat/models/mistral/mistral-7b-instruct-v0.3.Q4_K_M.gguf"
N_CTX        = 4096
GPU_LAYERS   = -1            # -1 = put *all* layers on GPU

# 1️⃣ force cuBLAS kernels
os.environ["GGML_CUDA_FORCE"] = "1"       # or export in your shell

# 2️⃣ let llama-cpp pick the template that ships inside the GGUF
llm = Llama(
    model_path="/home/bio/bio1-chat/models/mistral/mistral-7b-instruct-v0.3.Q4_K_M.gguf",
    chat_format="mistral-instruct",
    n_gpu_layers=-1,  # THIS ensures all layers are offloaded to GPU
    n_ctx=4096,
)

app = FastAPI()

@app.websocket("/chat")
async def chat(ws: WebSocket):
    await ws.accept()
    while True:
        user_msg = await ws.receive_text()

        # llama-cpp wants *messages*, not a hand-rolled string
        stream = llm.create_chat_completion(
            messages=[{"role":"user", "content": user_msg}],
            stream=True,
        )
        async for chunk in stream:
            await ws.send_text(chunk["choices"][0]["delta"].get("content",""))
        await ws.send_text("[[END]]")

