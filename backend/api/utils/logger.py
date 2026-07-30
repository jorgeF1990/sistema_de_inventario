# -*- coding: utf-8 -*-
"""
Configuracion de Logging
"""

import logging
import os
from datetime import datetime
from logging.handlers import RotatingFileHandler

def setup_logging():
    """Configura el sistema de logging"""
    
    # Crear directorio de logs
    log_dir = 'logs'
    if not os.path.exists(log_dir):
        os.makedirs(log_dir)
    
    # Nombre del archivo de log
    fecha = datetime.now().strftime('%Y%m%d')
    log_file = os.path.join(log_dir, f'stock_system_{fecha}.log')
    
    # Configurar logger
    logger = logging.getLogger()
    logger.setLevel(logging.INFO)
    
    # Formato
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    # Handler para archivo
    file_handler = RotatingFileHandler(
        log_file,
        maxBytes=10_000_000,
        backupCount=5,
        encoding='utf-8'
    )
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)
    
    # Handler para consola
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)
    
    return logger