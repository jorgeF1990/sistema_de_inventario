# -*- coding: utf-8 -*-
"""
Configuracion de la aplicacion
"""

from typing import Optional, List
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    """Configuracion unificada de la aplicacion"""
    
    # ============================================
    # BASE DE DATOS
    # ============================================
    DB_HOST: str = "localhost"
    DB_PORT: int = 3306
    DB_USER: str = "root"
    DB_PASSWORD: str = ""
    DB_NAME: str = "control_stock"
    
    # ============================================
    # SEGURIDAD - JWT
    # ============================================
    JWT_SECRET_KEY: str = "tu_clave_secreta"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60
    JWT_REFRESH_EXPIRE_DAYS: int = 7
    
    # ============================================
    # APLICACION
    # ============================================
    APP_ENV: str = "development"
    APP_DEBUG: bool = True
    APP_NAME: str = "Sistema Control de Stock"
    APP_VERSION: str = "3.0.0"
    APP_TIMEZONE: str = "America/Argentina/Buenos_Aires"
    
    # ============================================
    # FRONTEND
    # ============================================
    FRONTEND_URL: str = "http://localhost:3000"
    FRONTEND_URL_PRODUCTION: Optional[str] = None
    
    # ============================================
    # CORS
    # ============================================
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173"
    
    # ============================================
    # EMAIL
    # ============================================
    SMTP_SERVER: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM_EMAIL: Optional[str] = None
    SMTP_FROM_NAME: str = "Sistema Control de Stock"
    SMTP_USE_TLS: bool = True
    SMTP_USE_SSL: bool = False
    
    # ============================================
    # LOGGING
    # ============================================
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    LOG_FILE: Optional[str] = None
    
    # ============================================
    # PAGINACION
    # ============================================
    PAGINATION_DEFAULT_PAGE: int = 1
    PAGINATION_DEFAULT_LIMIT: int = 20
    PAGINATION_MAX_LIMIT: int = 100
    
    # ============================================
    # STOCK
    # ============================================
    STOCK_MINIMO_DEFAULT: int = 5
    STOCK_MAXIMO_DEFAULT: int = 100
    STOCK_ALERTA_BAJA: int = 10
    
    # ============================================
    # MONEDA
    # ============================================
    MONEDA_DEFAULT: str = "ARS"
    IVA_DEFAULT: float = 21.00
    DECIMALES: int = 2
    
    # ============================================
    # SEGURIDAD
    # ============================================
    BCRYPT_ROUNDS: int = 10
    PASSWORD_MIN_LENGTH: int = 6
    SESSION_TIMEOUT_MINUTES: int = 60
    
    # ============================================
    # UPLOAD
    # ============================================
    UPLOAD_MAX_SIZE_MB: int = 5
    UPLOAD_ALLOWED_EXTENSIONS: str = ".jpg,.jpeg,.png,.gif,.pdf"
    UPLOAD_PATH: str = "uploads/"
    
    # ============================================
    # API
    # ============================================
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_REQUESTS: int = 100
    RATE_LIMIT_PERIOD_MINUTES: int = 1
    DOCS_ENABLED: bool = True
    DOCS_TITLE: str = "Sistema Control de Stock API"
    DOCS_DESCRIPTION: str = "API para gestion de inventario, ventas y pedidos"
    DOCS_VERSION: str = "3.0.0"
    
    # ============================================
    # PROPIEDADES
    # ============================================
    @property
    def frontend_urls(self) -> List[str]:
        urls = [self.FRONTEND_URL]
        if self.FRONTEND_URL_PRODUCTION:
            urls.append(self.FRONTEND_URL_PRODUCTION)
        return urls
    
    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]
    
    @property
    def is_production(self) -> bool:
        return self.APP_ENV == "production"
    
    @property
    def is_development(self) -> bool:
        return self.APP_ENV == "development"
    
    @property
    def is_railway(self) -> bool:
        import os
        return os.getenv("RAILWAY_ENVIRONMENT") is not None
    
    @property
    def is_vercel(self) -> bool:
        import os
        return os.getenv("VERCEL") is not None
    
    @property
    def database_url(self) -> str:
        return f"mysql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True
        # PERMITIR CAMPOS EXTRA - SOLUCIONA EL ERROR
        extra = "ignore"

settings = Settings()
