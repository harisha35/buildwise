import logging
import smtplib
from email.message import EmailMessage

from app.core.config import get_settings

logger = logging.getLogger(__name__)


def send_email(to: str, subject: str, body: str) -> None:
    """Send a plaintext email via SMTP. Falls back to logging the message when
    no SMTP host is configured (e.g. local development)."""
    settings = get_settings()
    if not settings.smtp_host:
        logger.info("SMTP not configured; email to %s not sent.\nSubject: %s\n%s", to, subject, body)
        return

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = settings.smtp_from
    message["To"] = to
    message.set_content(body)

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as server:
            if settings.smtp_use_tls:
                server.starttls()
            if settings.smtp_user:
                server.login(settings.smtp_user, settings.smtp_password or "")
            server.send_message(message)
    except OSError:
        logger.exception("Failed to send email to %s", to)
