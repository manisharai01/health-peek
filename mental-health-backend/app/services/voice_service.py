"""Voice service stub - Whisper-based voice analysis (placeholder)"""
import logging

logger = logging.getLogger(__name__)


class VoiceService:
    """Voice analysis service using Whisper model"""
    
    def __init__(self):
        self.is_initialized = False
        self.model = None
    
    async def initialize(self):
        """Initialize voice service (placeholder - Whisper model)"""
        logger.info("Voice service initialized (stub mode - no Whisper model loaded)")
        self.is_initialized = True
    
    async def transcribe(self, audio_data: bytes) -> dict:
        """Transcribe audio to text"""
        if not self.is_initialized:
            raise RuntimeError("Voice service not initialized")
        return {
            "text": "",
            "language": "en",
            "message": "Voice transcription not yet implemented"
        }


voice_service = VoiceService()
