# -*- coding: utf-8 -*-
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging

from api.config import settings
from api.routes import auth, productos, ventas, pedidos, reportes, configuracion, categorias
from api.routes.optimized import router as optimized_router

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format=settings.LOG_FORMAT
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.DOCS_TITLE,
    description=settings.DOCS_DESCRIPTION,
    version=settings.DOCS_VERSION,
    docs_url="/docs" if settings.DOCS_ENABLED else None,
    redoc_url="/redoc" if settings.DOCS_ENABLED else None,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Registrar rutas
app.include_router(auth.router)
app.include_router(productos.router)
app.include_router(ventas.router)
app.include_router(pedidos.router)
app.include_router(reportes.router)
app.include_router(configuracion.router)
app.include_router(categorias.router)
app.include_router(optimized_router)

@app.get("/")
async def root():
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "docs": "/docs" if settings.DOCS_ENABLED else None
    }

@app.get("/health")
async def health():
    from api.database.connection import is_connected
    return {
        "status": "healthy",
        "database": "connected" if is_connected() else "disconnected",
        "environment": settings.APP_ENV
    }

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Error: {exc}")
    return JSONResponse(
        status_code=500,
        content={"error": str(exc)}
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "api.index:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.is_development
    )
