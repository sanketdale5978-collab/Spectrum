"""
Configuration for Spectra Lens
"""

import os

class Config:
    """Base configuration"""
    # Flask
    DEBUG = False
    TESTING = False
    SECRET_KEY = os.environ.get('SECRET_KEY', 'spectra-lens-secret-key-change-in-production')
    
    # File uploads
    MAX_CONTENT_LENGTH = 32 * 1024 * 1024  # 32 MB max
    UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'uploads')
    EXPORT_FOLDER = os.path.join(os.path.dirname(__file__), 'exports')
    
    # Model
    WEIGHTS_PATH = os.path.join(os.path.dirname(__file__), 'weights')
    
    # Allowed extensions
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'bmp', 'gif'}
    
    # Default grid parameters
    DEFAULT_GRID_SIZE = 64
    MIN_BLOCK_SIZE = 2
    MAX_BLOCK_SIZE = 32
    
    # Spectral parameters
    SPEC_START = 380
    SPEC_END = 780
    SPEC_CHANNELS = 401  # 380-780 inclusive
    
    # Server
    HOST = '0.0.0.0'
    PORT = 5000
    THREADED = True


class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    TESTING = False


class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    TESTING = False


class TestingConfig(Config):
    """Testing configuration"""
    TESTING = True
    MAX_CONTENT_LENGTH = 1 * 1024 * 1024  # 1 MB for testing


# Select config based on environment
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}
