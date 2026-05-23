from __future__ import annotations

from pathlib import Path

from stackcert.data.schemas import StackCertificate
from stackcert.reporting.markdown import render_certificate_markdown


def write_certificate_html(certificate: StackCertificate, path: str | Path) -> None:
    """No-dependency HTML export that can be printed to PDF by a browser later."""

    body = render_certificate_markdown(certificate)
    escaped = (
        body.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )
    html = f"""<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>StackCert Evidence Packet</title>
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 40px; line-height: 1.45; }}
    pre {{ white-space: pre-wrap; }}
  </style>
</head>
<body><pre>{escaped}</pre></body>
</html>
"""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(html, encoding="utf-8")

