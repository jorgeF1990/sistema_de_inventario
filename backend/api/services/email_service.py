# -*- coding: utf-8 -*-
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional, List
import os
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self):
        self.smtp_server = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
        self.smtp_port = int(os.getenv('SMTP_PORT', 587))
        self.smtp_user = os.getenv('SMTP_USER')
        self.smtp_password = os.getenv('SMTP_PASSWORD')
        self.from_email = os.getenv('SMTP_FROM_EMAIL', self.smtp_user)
        self.from_name = os.getenv('SMTP_FROM_NAME', 'Sistema Control de Stock')
        self.use_tls = os.getenv('SMTP_USE_TLS', 'true').lower() == 'true'
        
    def _get_connection(self):
        try:
            if self.use_tls:
                server = smtplib.SMTP(self.smtp_server, self.smtp_port)
                server.starttls()
            else:
                server = smtplib.SMTP_SSL(self.smtp_server, self.smtp_port)
            
            if self.smtp_user and self.smtp_password:
                server.login(self.smtp_user, self.smtp_password)
            
            return server
        except Exception as e:
            logger.error(f"Error SMTP: {e}")
            raise
    
    def send_email(self, to_email: str, subject: str, body: str, html_body: Optional[str] = None) -> bool:
        try:
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = f"{self.from_name} <{self.from_email}>"
            msg['To'] = to_email
            
            part_text = MIMEText(body, 'plain', 'utf-8')
            msg.attach(part_text)
            
            if html_body:
                part_html = MIMEText(html_body, 'html', 'utf-8')
                msg.attach(part_html)
            
            with self._get_connection() as server:
                server.send_message(msg, self.from_email, [to_email])
            
            logger.info(f"Email enviado a {to_email}")
            return True
            
        except Exception as e:
            logger.error(f"Error enviando email: {e}")
            return False
    
    def send_password_reset_email(self, to_email: str, token: str, nombre_usuario: str) -> bool:
        frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:5173')
        reset_link = f"{frontend_url}/reset-password?token={token}"
        
        subject = "Recuperacion de Contraseña"
        
        body = f"""
Hola {nombre_usuario},

Has solicitado restablecer tu contraseña.

Haz clic en el siguiente enlace para continuar:
{reset_link}

Este enlace expirara en 60 minutos.

Si no solicitaste este cambio, ignora este mensaje.

Saludos,
Sistema Control de Stock
"""
        
        html_body = f"""
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #333;">Recuperacion de Contraseña</h2>
    <p>Hola <strong>{nombre_usuario}</strong>,</p>
    <p>Has solicitado restablecer tu contraseña en el Sistema Control de Stock.</p>
    <p>Para continuar, haz clic en el siguiente boton:</p>
    <p style="text-align: center;">
        <a href="{reset_link}" style="
            display: inline-block;
            padding: 12px 24px;
            background-color: #3498DB;
            color: white;
            text-decoration: none;
            border-radius: 4px;
            font-weight: bold;
        ">Restablecer Contraseña</a>
    </p>
    <p>O copia este enlace en tu navegador:</p>
    <p><a href="{reset_link}">{reset_link}</a></p>
    <p><small>Este enlace expirara en 60 minutos.</small></p>
    <p>Si no solicitaste este cambio, ignora este mensaje.</p>
    <hr>
    <p><small>Sistema Control de Stock</small></p>
</body>
</html>
"""
        
        return self.send_email(to_email, subject, body, html_body)

email_service = EmailService()
