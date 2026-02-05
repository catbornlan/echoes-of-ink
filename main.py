"""
Entry point for Render deployment.
Exposes the FastAPI app from backend.main module.
"""
from backend.main import app

__all__ = ["app"]
