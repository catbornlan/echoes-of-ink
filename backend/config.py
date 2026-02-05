"""
Configuration loader for the Murder Mystery Game.
Loads environment variables and provides configuration access.
"""
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Config:
    """Application configuration."""
    
    # Gemini API Configuration
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    
    # Game Configuration
    DEBUG_MODE = os.getenv("DEBUG_MODE", "false").lower() == "true"
    
    # Validate required configuration
    @classmethod
    def validate(cls):
        """Validate that all required configuration is present."""
        if not cls.GEMINI_API_KEY or cls.GEMINI_API_KEY == "your_gemini_api_key_here":
            raise ValueError(
                "GEMINI_API_KEY not configured. "
                "Please set your Gemini API key in the .env file."
            )
    
    @classmethod
    def get_gemini_api_key(cls):
        """Get Gemini API key with validation."""
        cls.validate()
        return cls.GEMINI_API_KEY

# Export config instance
config = Config()
