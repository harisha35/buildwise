from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape
from weasyprint import HTML

TEMPLATES_DIR = Path(__file__).parent / "templates"

_env = Environment(
    loader=FileSystemLoader(str(TEMPLATES_DIR)),
    autoescape=select_autoescape(["html"]),
)


def render_pdf(template_name: str, context: dict) -> bytes:
    """§6.5: Jinja2 HTML template -> WeasyPrint -> PDF bytes, streamed directly by the API route."""
    html = _env.get_template(template_name).render(**context)
    return HTML(string=html, base_url=str(TEMPLATES_DIR)).write_pdf()
