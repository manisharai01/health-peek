"""Voice router - endpoints for voice/audio analysis"""
from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.voice_service import voice_service

router = APIRouter(
    prefix="/api/voice",
    tags=["voice"]
)


@router.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    """Transcribe audio file to text"""
    if not voice_service.is_initialized:
        raise HTTPException(status_code=503, detail="Voice service not initialized")
    
    try:
        audio_data = await file.read()
        result = await voice_service.transcribe(audio_data)
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status")
async def voice_status():
    """Check voice service status"""
    return {
        "success": True,
        "initialized": voice_service.is_initialized
    }
