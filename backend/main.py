from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import health, labs

app = FastAPI(title="SecureAI Backend API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, tags=["Health"])
app.include_router(labs.router, prefix="/labs", tags=["Labs"])