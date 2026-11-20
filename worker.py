"""Cloudflare Python Worker entrypoint for InfoCivic.

This is the first migration scaffold. The legacy Flask app still needs
validation for Python Workers compatibility (HTTP clients, filesystem writes,
and secrets) before enabling public deployment.
"""
from workers import wsgi
from web.app import app

Default = wsgi.entrypoint(app)
