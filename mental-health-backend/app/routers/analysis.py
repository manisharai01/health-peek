from fastapi import APIRouter, HTTPException, Depends, status
from typing import Dict, List, Optional
from bson import ObjectId
from pymongo import ReturnDocument
import emoji
from ..models.schemas import (
    MessageRequest, BulkMessageRequest, AnalysisResponse, BulkAnalysisResponse,
    ChatImportRequest, ChatAnalysisResponse, ChatImportStartRequest, ChatImportChunkRequest
)
from ..services.sentiment_service import sentiment_service
from ..services.analysis_service import analysis_service
from ..services.chat_parser import chat_parser
from ..services.chat_analyzer import chat_analyzer, ConversationAccumulator
from ..services.language_service import language_service
from ..core.security import get_current_user
from ..core.database import get_database
from ..core.config import settings
from datetime import datetime, timedelta
import asyncio
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analysis", tags=["Message Analysis"])

# ── Language support endpoint ─────────────────────────────────────────────────

@router.get("/languages")
async def get_supported_languages():
    """Return list of all supported languages for frontend dropdowns."""
    return {
        "languages": language_service.list_supported(),
        "total": len(language_service.list_supported()),
        "note": (
            "Pass the language 'code' as the 'language' field in any analysis request. "
            "Leave empty for auto-detection."
        ),
    }

@router.post("/analyze", response_model=AnalysisResponse)
async def analyze_message(
    request: MessageRequest,
    current_user: dict = Depends(get_current_user)
):
    """Analyze a single message for sentiment and emotions"""
    try:
        logger.info(f"📝 Single message analysis request from user: {current_user['user_id']}")
        
        # Perform sentiment analysis (with optional language override)
        sentiment, confidence, emotions = await sentiment_service.analyze_sentiment(
            request.message,
            language=request.language
        )
        
        # Get emoji analysis
        emoji_sentiment, emoji_confidence = sentiment_service.analyze_emoji_sentiment(request.message)
        emoji_analysis = {
            "sentiment": emoji_sentiment,
            "confidence": emoji_confidence
        } if emoji_sentiment != "neutral" else None
        
        # Save analysis to database
        analysis_id = await analysis_service.save_analysis(
            user_id=current_user["user_id"],
            message=request.message,
            sentiment=sentiment,
            confidence=confidence,
            emotions=emotions,
            emoji_analysis=emoji_analysis
        )
        
        logger.info(f"✅ Analysis complete, ID: {analysis_id}")
        
        return AnalysisResponse(
            message=request.message,
            sentiment=sentiment,
            confidence=confidence,
            emotions=emotions,
            emoji_analysis=emoji_analysis,
            timestamp=datetime.utcnow(),
            analysis_id=analysis_id
        )
    
    except Exception as e:
        logger.error(f"Analysis error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to analyze message"
        )

@router.post("/analyze-bulk", response_model=BulkAnalysisResponse)
async def analyze_bulk_messages(
    request: BulkMessageRequest,
    current_user: dict = Depends(get_current_user)
):
    """Analyze multiple messages in bulk"""
    try:
        logger.info(f"📦 Bulk analysis request from user: {current_user['user_id']}, messages: {len(request.messages)}")
        
        results = []
        sentiment_counts = {"positive": 0, "negative": 0, "neutral": 0}
        total_confidence = 0
        saved_count = 0
        
        for idx, message in enumerate(request.messages):
            # Perform sentiment analysis (optional language applies to all messages)
            sentiment, confidence, emotions = await sentiment_service.analyze_sentiment(
                message, language=request.language
            )
            
            # Get emoji analysis
            emoji_sentiment, emoji_confidence = sentiment_service.analyze_emoji_sentiment(message)
            emoji_analysis = {
                "sentiment": emoji_sentiment,
                "confidence": emoji_confidence
            } if emoji_sentiment != "neutral" else None
            
            # Save analysis to database
            analysis_id = await analysis_service.save_analysis(
                user_id=current_user["user_id"],
                message=message,
                sentiment=sentiment,
                confidence=confidence,
                emotions=emotions,
                emoji_analysis=emoji_analysis
            )
            saved_count += 1
            logger.debug(f"  Saved bulk message {idx+1}/{len(request.messages)}: {analysis_id}")
            
            # Add to results
            result = AnalysisResponse(
                message=message,
                sentiment=sentiment,
                confidence=confidence,
                emotions=emotions,
                emoji_analysis=emoji_analysis,
                timestamp=datetime.utcnow(),
                analysis_id=analysis_id
            )
            results.append(result)
            
            # Update summary statistics
            sentiment_counts[sentiment] += 1
            total_confidence += confidence
        
        logger.info(f"✅ Bulk analysis complete: {saved_count}/{len(request.messages)} messages saved")
        
        # Calculate summary
        total_processed = len(results)
        avg_confidence = total_confidence / total_processed if total_processed > 0 else 0
        
        summary = {
            "total_messages": total_processed,
            "sentiment_distribution": sentiment_counts,
            "average_confidence": round(avg_confidence, 3),
            "processing_time": "completed"
        }
        
        return BulkAnalysisResponse(
            results=results,
            summary=summary,
            total_processed=total_processed
        )
    
    except Exception as e:
        logger.error(f"Bulk analysis error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to analyze messages in bulk"
        )

@router.get("/history")
async def get_analysis_history(
    limit: int = 50,
    offset: int = 0,
    current_user: dict = Depends(get_current_user)
):
    """Get user's analysis history"""
    try:
        logger.info(f"📚 History request from user: {current_user['user_id']}, limit={limit}, offset={offset}")
        
        analyses = await analysis_service.get_user_analyses(
            user_id=current_user["user_id"],
            limit=limit,
            offset=offset
        )
        
        logger.info(f"✅ Returning {len(analyses)} analyses")
        
        return {
            "analyses": analyses,
            "total": len(analyses),
            "limit": limit,
            "offset": offset
        }
    
    except Exception as e:
        logger.error(f"Get history error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get analysis history"
        )

@router.get("/history/{analysis_id}")
async def get_analysis_by_id(
    analysis_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get specific analysis by ID"""
    try:
        analysis = await analysis_service.get_analysis_by_id(analysis_id, current_user["user_id"])
        
        if not analysis:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Analysis not found"
            )
        
        return analysis
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get analysis by ID error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get analysis"
        )

@router.delete("/history/{analysis_id}")
async def delete_analysis(
    analysis_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete specific analysis"""
    try:
        success = await analysis_service.delete_analysis(analysis_id, current_user["user_id"])
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Analysis not found"
            )
        
        return {"message": "Analysis deleted successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete analysis error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete analysis"
        )

@router.delete("/history/by-date/{date}")
async def delete_analyses_by_date(
    date: str,  # Expected format: YYYY-MM-DD (e.g., "2025-11-07")
    current_user: dict = Depends(get_current_user)
):
    """Delete all single message analyses for a specific date"""
    try:
        from datetime import datetime
        
        # Parse the date string
        try:
            target_date = datetime.strptime(date, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid date format. Use YYYY-MM-DD (e.g., 2025-11-07)"
            )
        
        # Define start and end of the day
        start_of_day = target_date.replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_day = target_date.replace(hour=23, minute=59, second=59, microsecond=999999)
        
        logger.info(f"🗑️ Bulk delete request for date {date} from user: {current_user['user_id']}")
        
        # Delete all analyses for this date (excluding bulk imports)
        db = get_database()
        analysis_collection = db.analysis_history
        
        result = await analysis_collection.delete_many({
            "user_id": current_user["user_id"],
            "timestamp": {"$gte": start_of_day, "$lte": end_of_day},
            "$or": [
                {"source": {"$exists": False}},
                {"source": {"$ne": "bulk_import"}}
            ]
        })
        
        deleted_count = result.deleted_count
        
        logger.info(f"✅ Deleted {deleted_count} analyses for date {date} (user: {current_user['user_id']})")
        
        return {
            "message": f"Successfully deleted all analyses for {date}",
            "deleted_count": deleted_count,
            "date": date
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete by date error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete analyses by date: {str(e)}"
        )

# ── Chat import helpers ───────────────────────────────────────────────────────

async def _message_history_doc(msg: dict, user_id: str, language: str, chat_analysis_id: str) -> Optional[dict]:
    """
    Score one of the user's own chat messages for analysis_history, which feeds the dashboard,
    mood trends, recommendations and reports. Returns None for short or low-confidence neutral messages.
    """
    # Skip messages with less than 3 words (like "ok", "yes", "k") unless they have emojis or strong sentiment
    message_text = msg['message'].strip()
    if len(message_text.split()) < 3:
        has_emojis = len(emoji.emoji_list(message_text)) > 0
        has_strong_punctuation = ('!' in message_text or '?' in message_text * 2)
        if not has_emojis and not has_strong_punctuation:
            return None

    sentiment, confidence, emotions = await sentiment_service.analyze_sentiment(msg['message'], language=language)

    # Skip if confidence is too low (likely neutral filler messages)
    if sentiment == "neutral" and confidence < 0.6:
        return None

    emoji_sentiment, emoji_confidence = sentiment_service.analyze_emoji_sentiment(msg['message'])
    return {
        "user_id": user_id,
        "message": msg['message'],
        "sentiment": sentiment,
        "confidence": confidence,
        "emotions": emotions,
        "emoji_analysis": {"sentiment": emoji_sentiment, "confidence": emoji_confidence} if emoji_sentiment != "neutral" else None,
        "timestamp": msg['timestamp'],  # Use original message timestamp
        "created_at": datetime.utcnow(),
        "source": "bulk_import",
        "chat_analysis_id": chat_analysis_id,  # lets deleting the chat import remove these too
    }


def _chat_analysis_response(analysis_id: str, analysis: dict, total_messages: int, format_detected: str) -> ChatAnalysisResponse:
    return ChatAnalysisResponse(
        analysis_id=analysis_id,
        participants=analysis['participants'],
        basic_stats=analysis['basic_stats'],
        messaging_patterns=analysis['messaging_patterns'],
        engagement_metrics=analysis['engagement_metrics'],
        sentiment_analysis=analysis['sentiment_analysis'],
        red_flags=analysis['red_flags'],
        emoji_stats=analysis['emoji_stats'],
        time_analysis=analysis['time_analysis'],
        language_info=analysis.get('language_info', {'detected_language': 'en', 'language_name': 'English', 'native_name': 'English', 'region': 'international', 'script': 'latin'}),
        conversation_period=analysis['conversation_period'],
        total_messages_analyzed=total_messages,
        format_detected=format_detected
    )


@router.post("/import-chat", response_model=ChatAnalysisResponse)
async def import_and_analyze_chat(
    request: ChatImportRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Import chat history and perform comprehensive analysis
    Supports WhatsApp, Telegram, Discord, iMessage, and generic formats
    """
    try:
        logger.info(f"Chat import request from user {current_user['user_id']} ({len(request.content):,} chars)")

        if len(request.content) > settings.MAX_CHAT_IMPORT_CHARS:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=(
                    f"Chat is too long to import ({len(request.content):,} characters). "
                    f"Please keep it under {settings.MAX_CHAT_IMPORT_CHARS:,} characters, e.g. only recent months."
                )
            )

        # Parse chat content (CPU-bound: run in a thread so other requests keep being served)
        messages, detected_format = await asyncio.to_thread(
            chat_parser.parse,
            content=request.content,
            format_type=request.format_type
        )
        
        if not messages:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No messages could be parsed from the content. Please check the format."
            )
        
        logger.info(f"Parsed {len(messages)} messages, format: {detected_format}")
        
        # Perform comprehensive analysis (CPU-bound, see above)
        analysis = await asyncio.to_thread(
            chat_analyzer.analyze_conversation,
            messages=messages,
            current_user_name=request.current_user_name,
            language=request.language,
        )
        
        # Save comprehensive chat analysis to chat_analyses collection
        db = get_database()
        chat_analysis_collection = db.chat_analyses
        
        analysis_doc = {
            "user_id": current_user["user_id"],
            "format_detected": detected_format,
            "total_messages": len(messages),
            "messages": [
                {
                    "timestamp": msg["timestamp"],
                    "sender": msg["sender"],
                    "message": msg["message"],
                    "platform": msg["platform"]
                }
                for msg in messages
            ],
            "analysis": analysis,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        result = await chat_analysis_collection.insert_one(analysis_doc)
        analysis_id = str(result.inserted_id)
        
        logger.info(f"✅ Chat analysis saved with ID: {analysis_id} (saved to chat_analyses collection)")
        
        # 🔥 Extract individual messages and save to analysis_history
        # This ensures bulk imports affect dashboard, mood trends, reports, and recommendations
        logger.info(f"📊 Extracting individual message sentiments for dashboard integration...")
        saved_individual_count = 0
        skipped_other_person = 0
        skipped_short_messages = 0
        
        # Identify the current user's messages for sentiment analysis
        user_participants = []
        
        # Find which participant is "you"
        for participant_data in analysis['participants'].values():
            if participant_data.get('role') == 'you':
                user_participants.append(participant_data['name'])
        
        logger.info(f"🔍 Identified user participants: {user_participants if user_participants else 'NONE - Will skip all messages'}")
        
        # If user didn't provide their name, warn them and don't save any messages
        if not user_participants:
            logger.warning(f"⚠️ No user name provided! Skipping individual message saves to prevent incorrect data.")
            logger.warning(f"💡 User should provide 'current_user_name' parameter to save only their messages")
        
        # Process each message and save individual sentiment analyses
        detected_lang = analysis.get('language_info', {}).get('detected_language')
        for idx, msg in enumerate(messages):
            # Sentiment scoring is synchronous; yield regularly so other requests aren't starved
            if idx % 200 == 0:
                await asyncio.sleep(0)

            # ONLY save messages from the current user (when identified)
            # Never save other person's messages to prevent incorrect statistics
            if not (user_participants and msg['sender'] in user_participants):
                skipped_other_person += 1
                continue

            history_doc = await _message_history_doc(msg, current_user["user_id"], detected_lang, analysis_id)
            if history_doc is None:
                skipped_short_messages += 1
                continue

            try:
                await db.analysis_history.insert_one(history_doc)
                saved_individual_count += 1
            except Exception as save_error:
                logger.warning(f"Failed to save individual message analysis: {save_error}")

        logger.info(f"✅ Saved {saved_individual_count}/{len(messages)} individual message analyses to analysis_history")
        logger.info(f"📊 Skipped {skipped_other_person} messages from other person(s)")
        logger.info(f"📊 Skipped {skipped_short_messages} short/low-confidence neutral messages")
        logger.info(f"🎯 Bulk import data will now affect dashboard, mood trends, recommendations, and reports!")

        return _chat_analysis_response(analysis_id, analysis, len(messages), detected_format)
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chat import error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to import and analyze chat: {str(e)}"
        )

# ── Chunked chat import (chats of any size) ───────────────────────────────────
# The browser uploads a chat in parts; each part is parsed and staged in chat_import_messages.
# A background job then streams the staged messages in timestamp order through
# ConversationAccumulator, so server memory stays bounded however large the chat is.
# The browser polls GET /import-chat/{id} until the job is done.

IMPORT_SORT = [("timestamp", 1), ("chunk", 1), ("seq", 1)]  # same order as a stable sort by timestamp
IMPORT_BATCH_SIZE = 2000
IMPORT_MAX_ATTEMPTS = 3
_import_jobs: Dict[str, asyncio.Task] = {}


class ChatImportError(Exception):
    """An import problem whose message can be shown to the user as-is."""


async def _get_import_session(db, import_id: str, user_id: str) -> dict:
    session = None
    if ObjectId.is_valid(import_id):
        session = await db.chat_imports.find_one({"_id": ObjectId(import_id), "user_id": user_id})
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat import not found")
    return session


def _ensure_import_job(import_id: str, user_id: str) -> None:
    """Start the analysis job unless it is already running in this process."""
    if import_id in _import_jobs:
        return
    task = asyncio.create_task(_run_import_job(import_id, user_id))
    _import_jobs[import_id] = task
    task.add_done_callback(lambda _: _import_jobs.pop(import_id, None))


async def _run_import_job(import_id: str, user_id: str) -> None:
    db = get_database()
    session_id = ObjectId(import_id)
    try:
        session = await db.chat_imports.find_one_and_update(
            {"_id": session_id}, {"$inc": {"attempts": 1}, "$set": {"processed": 0}}, return_document=ReturnDocument.AFTER
        )
        if session.get("attempts", 1) > IMPORT_MAX_ATTEMPTS:
            raise ChatImportError("The analysis was interrupted too many times. Please try the import again.")

        # A fixed id for the chat analysis lets a restarted job replace a partial earlier attempt
        chat_analysis_id = session.get("chat_analysis_id") or str(ObjectId())
        await db.chat_imports.update_one({"_id": session_id}, {"$set": {"chat_analysis_id": chat_analysis_id}})
        await db.analysis_history.delete_many({"user_id": user_id, "chat_analysis_id": chat_analysis_id})

        query = {"import_id": import_id}
        total = await db.chat_import_messages.count_documents(query)
        if total == 0:
            raise ChatImportError("No messages could be parsed from the content. Please check the format.")
        logger.info(f"Analyzing chat import {import_id}: {total:,} messages")

        # Dominant language from the earliest messages, as analyze_conversation() does
        language = session.get("language")
        if not (language and language_service.is_supported(language)):
            sample = []
            async for doc in db.chat_import_messages.find(query, {"_id": 0, "message": 1}).sort(IMPORT_SORT).batch_size(100):
                if len(doc["message"].strip()) > 10:
                    sample.append(doc)
                if len(sample) >= 30:
                    break
            language = await asyncio.to_thread(chat_analyzer._detect_conversation_language, sample)

        user_name = session.get("current_user_name")
        accumulator = ConversationAccumulator(total, user_name, language)
        counts = {"saved": 0, "skipped_other": 0, "skipped_short": 0}

        async def process(batch: List[dict]) -> None:
            await asyncio.to_thread(accumulator.add_many, batch)
            history_docs = []
            for idx, msg in enumerate(batch):
                # Sentiment scoring is synchronous; yield regularly so other requests aren't starved
                if idx % 200 == 0:
                    await asyncio.sleep(0)
                # ONLY save the current user's own messages
                if user_name is None or msg["sender"] != user_name:
                    counts["skipped_other"] += 1
                    continue
                history_doc = await _message_history_doc(msg, user_id, language, chat_analysis_id)
                if history_doc is None:
                    counts["skipped_short"] += 1
                    continue
                history_docs.append(history_doc)
            if history_docs:
                await db.analysis_history.insert_many(history_docs)
                counts["saved"] += len(history_docs)
            await db.chat_imports.update_one(
                {"_id": session_id}, {"$set": {"processed": accumulator.count, "updated_at": datetime.utcnow()}}
            )

        batch = []
        projection = {"_id": 0, "timestamp": 1, "sender": 1, "message": 1}
        async for doc in db.chat_import_messages.find(query, projection).sort(IMPORT_SORT).batch_size(IMPORT_BATCH_SIZE):
            batch.append(doc)
            if len(batch) >= IMPORT_BATCH_SIZE:
                await process(batch)
                batch = []
        if batch:
            await process(batch)

        analysis = await asyncio.to_thread(accumulator.result)
        now = datetime.utcnow()
        await db.chat_analyses.replace_one({"_id": ObjectId(chat_analysis_id)}, {
            "user_id": user_id,
            "format_detected": session.get("detected_format") or "unknown",
            "total_messages": total,
            "messages_count": total,
            "analysis": analysis,
            "created_at": now,
            "updated_at": now
        }, upsert=True)
        await db.chat_imports.update_one({"_id": session_id}, {"$set": {
            "status": "done", "processed": total, "saved_messages": counts["saved"], "updated_at": now
        }})
        # The staged copy of the chat is no longer needed
        await db.chat_import_messages.delete_many(query)

        logger.info(f"✅ Chat import {import_id} analyzed: {total:,} messages, saved {counts['saved']:,} to analysis_history "
                    f"(skipped {counts['skipped_other']:,} from others, {counts['skipped_short']:,} short/low-confidence)")
    except Exception as e:
        logger.error(f"Chat import {import_id} failed: {e}", exc_info=not isinstance(e, ChatImportError))
        error = str(e) if isinstance(e, ChatImportError) else f"Failed to analyze chat: {e}"
        try:
            await db.chat_imports.update_one({"_id": session_id}, {"$set": {
                "status": "failed", "error": error, "updated_at": datetime.utcnow()
            }})
        except Exception:
            # Status stays 'processing'; the next status poll restarts the job (up to IMPORT_MAX_ATTEMPTS)
            logger.exception(f"Could not record failure of chat import {import_id}")


@router.post("/import-chat/start")
async def start_chat_import(
    request: ChatImportStartRequest,
    current_user: dict = Depends(get_current_user)
):
    """Begin a chat import of any size; upload it with /import-chat/{id}/chunk, then call /finish"""
    db = get_database()
    user_id = current_user["user_id"]
    now = datetime.utcnow()

    # Clean up this user's abandoned uploads (closed tab, failed analysis) older than a day
    stale = await db.chat_imports.find({
        "user_id": user_id, "status": {"$in": ["uploading", "failed"]}, "updated_at": {"$lt": now - timedelta(days=1)}
    }, {"_id": 1}).to_list(length=None)
    for old in stale:
        await db.chat_import_messages.delete_many({"import_id": str(old["_id"])})
        await db.chat_imports.delete_one({"_id": old["_id"]})

    await db.chat_import_messages.create_index([("import_id", 1)] + IMPORT_SORT)
    result = await db.chat_imports.insert_one({
        "user_id": user_id,
        "status": "uploading",
        "format_type": request.format_type,
        "current_user_name": request.current_user_name,
        "language": request.language,
        "chunks_received": [],
        "total_messages": 0,
        "processed": 0,
        "attempts": 0,
        "created_at": now,
        "updated_at": now
    })
    logger.info(f"Chat import {result.inserted_id} started by user {user_id}")
    return {"import_id": str(result.inserted_id), "max_chunk_chars": settings.MAX_CHAT_CHUNK_CHARS}


@router.post("/import-chat/{import_id}/chunk")
async def upload_chat_chunk(
    import_id: str,
    request: ChatImportChunkRequest,
    current_user: dict = Depends(get_current_user)
):
    """Parse one part of a chat and stage its messages (re-sending a part is safe)"""
    if len(request.content) > settings.MAX_CHAT_CHUNK_CHARS:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Each part must be under {settings.MAX_CHAT_CHUNK_CHARS:,} characters"
        )

    db = get_database()
    session = await _get_import_session(db, import_id, current_user["user_id"])
    if session["status"] != "uploading":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This chat import is no longer accepting uploads")
    if request.index in session["chunks_received"]:
        return {"index": request.index, "status": "already_received"}
    if request.index > 0 and 0 not in session["chunks_received"]:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Upload part 0 first")

    # Part 0 determines the chat format for the remaining parts
    format_type = session.get("detected_format") or session.get("format_type")
    messages, detected_format = await asyncio.to_thread(
        chat_parser.parse, content=request.content, format_type=format_type
    )

    # A retried part may have been partly stored by the failed attempt
    await db.chat_import_messages.delete_many({"import_id": import_id, "chunk": request.index})
    if messages:
        await db.chat_import_messages.insert_many([
            {
                "import_id": import_id, "chunk": request.index, "seq": seq,
                "timestamp": msg["timestamp"], "sender": msg["sender"],
                "message": msg["message"], "platform": msg["platform"]
            }
            for seq, msg in enumerate(messages)
        ])

    updates = {"updated_at": datetime.utcnow()}
    if request.index == 0:
        updates["detected_format"] = detected_format
    await db.chat_imports.update_one({"_id": session["_id"]}, {
        "$addToSet": {"chunks_received": request.index},
        "$inc": {"total_messages": len(messages)},
        "$set": updates
    })
    logger.info(f"Chat import {import_id}: part {request.index} parsed {len(messages):,} messages ({detected_format})")
    return {"index": request.index, "messages": len(messages)}


@router.post("/import-chat/{import_id}/finish")
async def finish_chat_import(
    import_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Start analyzing all uploaded parts in the background; poll GET /import-chat/{id} for the result"""
    db = get_database()
    session = await _get_import_session(db, import_id, current_user["user_id"])
    if session["status"] == "done":
        return {"status": "done"}
    if session["status"] in ("uploading", "failed"):
        await db.chat_imports.update_one({"_id": session["_id"]}, {"$set": {
            "status": "processing", "error": None, "attempts": 0, "updated_at": datetime.utcnow()
        }})
    _ensure_import_job(import_id, current_user["user_id"])
    return {"status": "processing"}


@router.get("/import-chat/{import_id}")
async def get_chat_import_status(
    import_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Progress of a chat import; includes the full analysis once status is 'done'"""
    db = get_database()
    session = await _get_import_session(db, import_id, current_user["user_id"])

    if session["status"] == "processing":
        # Resumes the analysis if the server restarted while it was running
        _ensure_import_job(import_id, current_user["user_id"])

    response = {
        "status": session["status"],
        "processed": session.get("processed", 0),
        "total": session.get("total_messages", 0),
    }
    if session["status"] == "failed":
        response["error"] = session.get("error")
    elif session["status"] == "done":
        chat = await db.chat_analyses.find_one({"_id": ObjectId(session["chat_analysis_id"])})
        if not chat:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="This chat analysis was deleted")
        response["result"] = _chat_analysis_response(
            session["chat_analysis_id"], chat["analysis"], chat["total_messages"], chat["format_detected"]
        )
    return response


@router.get("/chat-history")
async def get_chat_analyses(
    limit: int = 20,
    offset: int = 0,
    current_user: dict = Depends(get_current_user)
):
    """Get user's chat analysis history (conversation imports - separate from single message analyses)"""
    try:
        logger.info(f"📱 Chat history request from user: {current_user['user_id']}")
        
        db = get_database()
        chat_analysis_collection = db.chat_analyses
        
        # Get total count
        total_count = await chat_analysis_collection.count_documents(
            {"user_id": current_user["user_id"]}
        )
        
        cursor = chat_analysis_collection.find(
            {"user_id": current_user["user_id"]}
        ).sort("created_at", -1).skip(offset).limit(limit)
        
        analyses = []
        async for doc in cursor:
            doc["id"] = str(doc["_id"])
            del doc["_id"]
            # Don't include full messages in list view
            if "messages" in doc:
                doc["messages_count"] = len(doc["messages"])
                del doc["messages"]
            analyses.append(doc)
        
        logger.info(f"✅ Returning {len(analyses)} chat analyses (total: {total_count})")
        
        return {
            "analyses": analyses,
            "total": total_count,
            "limit": limit,
            "offset": offset
        }
    
    except Exception as e:
        logger.error(f"Get chat history error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get chat analysis history"
        )

@router.get("/chat-history/{analysis_id}")
async def get_chat_analysis_by_id(
    analysis_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get specific chat analysis by ID"""
    try:
        from bson import ObjectId
        db = get_database()
        chat_analysis_collection = db.chat_analyses
        
        analysis = await chat_analysis_collection.find_one({
            "_id": ObjectId(analysis_id),
            "user_id": current_user["user_id"]
        })
        
        if not analysis:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Chat analysis not found"
            )
        
        analysis["id"] = str(analysis["_id"])
        del analysis["_id"]
        
        return analysis
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get chat analysis by ID error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get chat analysis"
        )

@router.post("/migrate-bulk-imports")
async def migrate_bulk_import_sources(
    current_user: dict = Depends(get_current_user)
):
    """
    Migration endpoint: Add 'source: bulk_import' to old bulk import messages
    This identifies messages that were imported as part of bulk imports but don't have the source field
    """
    try:
        db = get_database()
        analysis_collection = db.analysis_history
        chat_analyses_collection = db.chat_analyses
        
        # Get all chat analyses for this user to identify bulk import timestamps
        chat_analyses = await chat_analyses_collection.find(
            {"user_id": current_user["user_id"]}
        ).to_list(length=100)
        
        total_updated = 0
        
        for chat in chat_analyses:
            chat_timestamp = chat.get("created_at")
            if not chat_timestamp:
                continue
            
            # Find messages that were likely from this bulk import
            # They should have timestamps close to the chat analysis timestamp
            # and not already have a source field
            time_start = chat_timestamp - timedelta(minutes=5)
            time_end = chat_timestamp + timedelta(minutes=5)
            
            # Update messages without source field that match the time window
            result = await analysis_collection.update_many(
                {
                    "user_id": current_user["user_id"],
                    "source": {"$exists": False},
                    "timestamp": {"$gte": time_start, "$lte": time_end}
                },
                {
                    "$set": {"source": "bulk_import"}
                }
            )
            
            total_updated += result.modified_count
        
        logger.info(f"🔄 Migration: Updated {total_updated} bulk import messages for user: {current_user['user_id']}")
        
        return {
            "message": "Migration completed successfully",
            "updated_count": total_updated,
            "chat_analyses_checked": len(chat_analyses)
        }
    
    except Exception as e:
        logger.error(f"Migration error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to migrate bulk imports: {str(e)}"
        )

@router.delete("/chat-history/{chat_id}")
async def delete_chat_import(
    chat_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a specific chat import and all its associated messages"""
    try:
        from bson import ObjectId
        db = get_database()
        chat_analyses_collection = db.chat_analyses
        analysis_collection = db.analysis_history
        
        # First, verify the chat analysis exists and belongs to the user
        chat_analysis = await chat_analyses_collection.find_one({
            "_id": ObjectId(chat_id),
            "user_id": current_user["user_id"]
        })
        
        if not chat_analysis:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Chat import not found"
            )
        
        # Delete all individual messages from this bulk import. They carry the chat's id; older
        # imports didn't tag them, so match those by when they were saved (their "timestamp" is the
        # original chat time, not the import time)
        chat_timestamp = chat_analysis.get("created_at")
        messages_result = await analysis_collection.delete_many({
            "user_id": current_user["user_id"],
            "source": "bulk_import",
            "$or": [
                {"chat_analysis_id": chat_id},
                {
                    "chat_analysis_id": {"$exists": False},
                    "created_at": {"$gte": chat_timestamp - timedelta(minutes=5), "$lte": chat_timestamp + timedelta(minutes=15)}
                },
            ]
        })
        
        # Delete the chat analysis document itself
        chat_result = await chat_analyses_collection.delete_one({
            "_id": ObjectId(chat_id),
            "user_id": current_user["user_id"]
        })
        
        deleted_messages = messages_result.deleted_count
        deleted_chat = chat_result.deleted_count > 0
        
        logger.info(f"🗑️ Deleted chat import {chat_id} and {deleted_messages} associated messages for user: {current_user['user_id']}")
        
        return {
            "message": "Chat import deleted successfully",
            "deleted_messages": deleted_messages,
            "deleted_chat_analysis": deleted_chat,
            "chat_id": chat_id
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete chat import error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete chat import: {str(e)}"
        )