
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.api.router import api_router
from app.db.database import test_connection

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="API para sistema de gestión ganadera",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", 
        "http://127.0.0.1:5173", 
        "http://localhost:3000",
        "http://127.0.0.1:3000", 
    ],
    allow_credentials=True,
    allow_methods=["*"],   
    allow_headers=["*"],   
)

from app.api.router import api_router
app.include_router(api_router, prefix="/api/v1")

@app.get("/")
def root():
    return {"mensaje": "Sistema Ganadero API v1.0", "status": "online"}

@app.get("/health")
def health():
    return {"status": "ok"}

@app.on_event("startup")
async def startup():
    print("🚀 Iniciando servidor...")
    print("🌐 CORS: Permitido todo")
    test_connection()