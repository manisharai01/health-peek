"""
Chat Analysis Service
Provides comprehensive analysis like ChatRecap AI:
- Messaging patterns (frequency, most-active hours, message lengths)
- Response time and engagement metrics
- Sentiment and emotional tone analysis
- Red flag detection (drop in replies, low-investment patterns)
- Message counts, emoji usage, positive/negative text ratios
- Multilingual support: Hinglish, 6 Indian languages, 13 international languages
"""

from typing import List, Dict, Tuple, Optional, Iterable
from datetime import datetime, timedelta
from collections import Counter, defaultdict
from array import array
import re
import logging
import emoji

from .language_service import language_service

logger = logging.getLogger(__name__)

DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

# Core English words (always kept) — merged with the language-specific lexicon
ENGLISH_POSITIVE = {
    'love', 'happy', 'great', 'good', 'excellent', 'wonderful', 'amazing',
    'awesome', 'fantastic', 'perfect', 'best', 'beautiful', 'thanks', 'thank',
    'appreciate', 'joy', 'excited', 'glad', 'pleased', 'delighted', 'brilliant',
    'yay', 'haha', 'lol', 'lmao', 'cool', 'nice', 'sweet', 'fun',
}
ENGLISH_NEGATIVE = {
    'hate', 'sad', 'bad', 'terrible', 'awful', 'horrible', 'worst', 'angry',
    'mad', 'upset', 'annoyed', 'frustrated', 'disappointed', 'sorry', 'difficult',
    'hard', 'problem', 'issue', 'wrong', 'fail', 'failed', 'suck', 'sucks',
    'damn', 'hell', 'fuck', 'shit', 'stupid', 'dumb', 'boring', 'bored',
}


def _sentiment_lexicon(language: str) -> Tuple[set, set]:
    """Language-specific sentiment words (always includes English as base)."""
    pos_words_lang, neg_words_lang = language_service.get_sentiment_words(language)
    positive_words = set(w.lower() for w in pos_words_lang) | ENGLISH_POSITIVE
    negative_words = set(w.lower() for w in neg_words_lang) | ENGLISH_NEGATIVE
    return positive_words, negative_words


def _classify_sentiment(text: str, positive_words: set, negative_words: set) -> int:
    """Lexicon sentiment of one message: 0 = positive, 1 = negative, 2 = neutral."""
    text_lower = text.lower()
    words = re.findall(r'\b\w+\b', text_lower)

    pos = sum(1 for word in words if word in positive_words)
    neg = sum(1 for word in words if word in negative_words)

    # Also check full-string matches for multi-char languages (CJK, Arabic, etc.)
    for pw in positive_words:
        if len(pw) > 1 and pw in text_lower:
            pos += 1
            break
    for nw in negative_words:
        if len(nw) > 1 and nw in text_lower:
            neg += 1
            break

    if pos > neg:
        return 0
    if neg > pos:
        return 1
    return 2


def _language_info(lang_code: str) -> Dict:
    info = language_service.get_language_info(lang_code)
    return {
        "detected_language": lang_code,
        "language_name":     info.get("name", "English"),
        "native_name":       info.get("native", "English"),
        "region":            info.get("region", "international"),
        "script":            info.get("script", "latin"),
    }


def _empty_analysis() -> Dict:
    """Return empty analysis structure"""
    return {
        'participants': {},
        'basic_stats': {},
        'messaging_patterns': {},
        'engagement_metrics': {},
        'sentiment_analysis': {},
        'red_flags': {'red_flags': [], 'warnings': [], 'total_red_flags': 0, 'total_warnings': 0},
        'emoji_stats': {},
        'time_analysis': {},
        'language_info': {'detected_language': 'en', 'language_name': 'English', 'native_name': 'English', 'region': 'international', 'script': 'latin'},
        'conversation_period': {}
    }


class ConversationAccumulator:
    """
    Builds the full conversation analysis one message at a time, so a chat of any
    size can be analyzed without holding all of its messages in memory.

    Messages must be added in timestamp order (ties in their original order), and the
    total message count must be known up front (the frequency-drop red flag needs it).
    Memory grows with the number of participants, days, weeks and distinct emojis,
    plus ~24 bytes per message for the gap / response-time samples.
    """

    def __init__(self, total_messages: int, current_user_name: Optional[str] = None, language: str = "en"):
        self.total_messages = total_messages
        self.current_user_name = current_user_name
        self.language = language
        self.positive_words, self.negative_words = _sentiment_lexicon(language)
        self.split_point = int(total_messages * 0.75)

        self.count = 0
        self.first_ts = self.last_ts = None
        self.prev_sender = self.prev_ts = None

        # Basic stats
        self.sender_counts = Counter()
        self.length_sum = 0
        self.longest = self.shortest = None  # (sender, length)

        # Messaging patterns
        self.by_date = defaultdict(int)
        self.by_hour = defaultdict(int)
        self.by_weekday = defaultdict(int)
        self.sender_last_ts = {}
        self.sender_gaps = defaultdict(lambda: array('d'))  # hours between a sender's consecutive messages

        # Engagement
        self.responses = defaultdict(lambda: array('d'))  # responder -> minutes (< 24h)
        self.initiations = defaultdict(int)
        self.exchange_len = 0
        self.exchanges_total = self.exchanges_sum = self.exchanges_max = 0

        # Sentiment, red flags, emojis, time patterns
        self.sentiment_counts = defaultdict(lambda: [0, 0, 0])  # positive, negative, neutral
        self.sender_length_sum = defaultdict(int)
        self.sender_questions = defaultdict(int)
        self.sender_emojis = defaultdict(Counter)
        self.weekly_responses = defaultdict(lambda: array('d'))
        self.historical_first = self.historical_last = self.recent_first = None

    def add_many(self, messages: Iterable[Dict]) -> None:
        for msg in messages:
            self.add(msg)

    def add(self, msg: Dict) -> None:
        sender, ts, text = msg['sender'], msg['timestamp'], msg['message']
        i = self.count
        self.count += 1

        if i == 0:
            self.first_ts = ts
            self.historical_first = ts
        if i == self.split_point - 1:
            self.historical_last = ts
        if i == self.split_point:
            self.recent_first = ts
        self.last_ts = ts

        self.sender_counts[sender] += 1
        length = len(text)
        self.length_sum += length
        if self.longest is None or length > self.longest[1]:
            self.longest = (sender, length)
        if self.shortest is None or length < self.shortest[1]:
            self.shortest = (sender, length)

        self.by_date[ts.date()] += 1
        self.by_hour[ts.hour] += 1
        self.by_weekday[DAY_NAMES[ts.weekday()]] += 1
        last = self.sender_last_ts.get(sender)
        if last is not None:
            self.sender_gaps[sender].append((ts - last).total_seconds() / 3600)
        self.sender_last_ts[sender] = ts

        if i == 0:
            self.initiations[sender] += 1
            self.exchange_len = 1
        else:
            if self.prev_sender != sender:
                minutes = (ts - self.prev_ts).total_seconds() / 60
                # Only count reasonable response times (< 24 hours)
                if minutes < 1440:
                    self.responses[sender].append(minutes)
                self.weekly_responses[ts.strftime('%Y-W%W')].append(minutes)
                self.exchange_len += 1
            else:
                # Same sender, end exchange if it has >= 2 messages
                if self.exchange_len >= 2:
                    self._record_exchange(self.exchange_len)
                self.exchange_len = 1
            # New conversation if > 4 hours gap
            if (ts - self.prev_ts).total_seconds() / 3600 > 4:
                self.initiations[sender] += 1

        self.sentiment_counts[sender][_classify_sentiment(text, self.positive_words, self.negative_words)] += 1
        self.sender_length_sum[sender] += length
        if '?' in text:
            self.sender_questions[sender] += 1
        self.sender_emojis[sender].update(e['emoji'] for e in emoji.emoji_list(text))

        self.prev_sender, self.prev_ts = sender, ts

    def _record_exchange(self, length: int) -> None:
        self.exchanges_total += 1
        self.exchanges_sum += length
        self.exchanges_max = max(self.exchanges_max, length)

    def result(self) -> Dict:
        if self.count == 0:
            return _empty_analysis()
        if self.count != self.total_messages:
            raise ValueError(f"Expected {self.total_messages} messages, got {self.count}")

        participants = {}
        for sender, count in self.sender_counts.most_common():
            participants[sender] = {
                'name': sender,
                'role': 'you' if sender == self.current_user_name else 'other',
                'message_count': count
            }

        engagement = self._engagement_metrics(participants)
        return {
            "participants":       participants,
            "basic_stats":        self._basic_stats(participants),
            "messaging_patterns": self._messaging_patterns(participants),
            "engagement_metrics": engagement,
            "sentiment_analysis": self._sentiment_distribution(participants),
            "red_flags":          self._red_flags(participants, engagement),
            "emoji_stats":        self._emoji_stats(participants),
            "time_analysis":      self._time_patterns(),
            "language_info":      _language_info(self.language),
            "conversation_period": {
                "start":         self.first_ts.isoformat(),
                "end":           self.last_ts.isoformat(),
                "duration_days": (self.last_ts - self.first_ts).days,
            },
        }

    def _basic_stats(self, participants: Dict) -> Dict:
        return {
            'total_messages': self.count,
            'messages_per_participant': {name: info['message_count'] for name, info in participants.items()},
            'average_message_length': round(self.length_sum / self.count, 1),
            'longest_message': {'sender': self.longest[0], 'length': self.longest[1]},
            'shortest_message': {'sender': self.shortest[0], 'length': self.shortest[1]},
        }

    def _messaging_patterns(self, participants: Dict) -> Dict:
        most_active_days = sorted(self.by_date.items(), key=lambda x: x[1], reverse=True)[:5]
        most_active_hours = sorted(self.by_hour.items(), key=lambda x: x[1], reverse=True)[:5]

        span_days = max(1, (self.last_ts - self.first_ts).days)
        freq_by_participant = {}
        for name in participants:
            gaps = self.sender_gaps.get(name)
            if gaps:
                freq_by_participant[name] = {
                    'average_hours_between_messages': round(sum(gaps) / len(gaps), 2),
                    'messages_per_day': round(participants[name]['message_count'] / span_days, 2)
                }

        return {
            'most_active_days': [{'date': str(date), 'count': count} for date, count in most_active_days],
            'most_active_hours': [{'hour': f"{hour:02d}:00", 'count': count} for hour, count in most_active_hours],
            'frequency_per_participant': freq_by_participant,
            'day_of_week_distribution': dict(self.by_weekday)
        }

    def _engagement_metrics(self, participants: Dict) -> Dict:
        avg_response_by_participant = {}
        for name in participants:
            times = self.responses.get(name)
            if times:
                avg_response_by_participant[name] = {
                    'average_minutes': round(sum(times) / len(times), 2),
                    'median_minutes': round(sorted(times)[len(times) // 2], 2),
                    'fastest_minutes': round(min(times), 2),
                    'slowest_minutes': round(max(times), 2)
                }

        total, length_sum, longest = self.exchanges_total, self.exchanges_sum, self.exchanges_max
        if self.exchange_len >= 2:  # the conversation ends mid-exchange
            total, length_sum, longest = total + 1, length_sum + self.exchange_len, max(longest, self.exchange_len)

        return {
            'response_time_analysis': avg_response_by_participant,
            'conversation_initiations': dict(self.initiations),
            'back_and_forth_metrics': {
                'total_exchanges': total,
                'average_exchange_length': round(length_sum / total if total else 0, 2),
                'longest_exchange': longest if total else 0
            }
        }

    def _sentiment_distribution(self, participants: Dict) -> Dict:
        sentiment_by_participant = {}
        for name in participants:
            positive_count, negative_count, neutral_count = self.sentiment_counts[name]
            total = participants[name]['message_count']
            sentiment_by_participant[name] = {
                'positive_messages': positive_count,
                'negative_messages': negative_count,
                'neutral_messages':  neutral_count,
                'positive_ratio':    round(positive_count / total, 3) if total > 0 else 0,
                'negative_ratio':    round(negative_count / total, 3) if total > 0 else 0,
                'neutral_ratio':     round(neutral_count  / total, 3) if total > 0 else 0,
            }
        return sentiment_by_participant

    def _red_flags(self, participants: Dict, engagement: Dict) -> Dict:
        """Detect potential red flags in communication patterns"""
        red_flags = []
        warnings = []

        # Red Flag 1: Significant imbalance in message counts
        if len(participants) == 2:
            counts = list(participants.values())
            ratio = max(counts[0]['message_count'], counts[1]['message_count']) / max(1, min(counts[0]['message_count'], counts[1]['message_count']))

            if ratio > 3:
                red_flags.append({
                    'type': 'message_imbalance',
                    'severity': 'high',
                    'description': f"Significant message imbalance: one person sends {ratio:.1f}x more messages",
                    'suggestion': "This may indicate unequal investment in the conversation"
                })
            elif ratio > 2:
                warnings.append({
                    'type': 'message_imbalance',
                    'severity': 'medium',
                    'description': f"Message imbalance detected: one person sends {ratio:.1f}x more messages",
                    'suggestion': "Consider if both people are equally engaged"
                })

        # Red Flag 2: Slow or declining response times
        response_analysis = engagement.get('response_time_analysis', {})
        for name, times in response_analysis.items():
            avg_minutes = times.get('average_minutes', 0)
            if avg_minutes > 180:  # > 3 hours average
                warnings.append({
                    'type': 'slow_responses',
                    'severity': 'medium',
                    'description': f"{name} takes an average of {avg_minutes/60:.1f} hours to respond",
                    'suggestion': "Delayed responses might indicate low prioritization"
                })

        # Red Flag 3: Drop in message frequency (recent 25% vs historical 75%)
        if self.count > 20:
            historical_period = (self.historical_last - self.historical_first).days or 1
            recent_period = (self.last_ts - self.recent_first).days or 1

            historical_rate = self.split_point / historical_period
            recent_rate = (self.count - self.split_point) / recent_period

            if recent_rate < historical_rate * 0.5:  # 50% drop
                red_flags.append({
                    'type': 'frequency_drop',
                    'severity': 'high',
                    'description': f"Messaging frequency dropped by {((historical_rate - recent_rate) / historical_rate * 100):.0f}%",
                    'suggestion': "Significant decrease in communication may indicate fading interest"
                })

        # Red Flag 4: One-sided conversation initiation
        initiations = engagement.get('conversation_initiations', {})
        if len(initiations) == 2:
            counts = list(initiations.values())
            if max(counts) / max(1, min(counts)) > 4:
                red_flags.append({
                    'type': 'one_sided_initiation',
                    'severity': 'high',
                    'description': "One person initiates conversations 4x more often",
                    'suggestion': "Consider if the other person is reciprocating interest"
                })

        # Red Flag 5: Low engagement (short responses, no questions)
        for name in participants:
            message_count = participants[name]['message_count']
            if message_count > 5:
                avg_length = self.sender_length_sum[name] / message_count
                question_ratio = self.sender_questions.get(name, 0) / message_count

                if avg_length < 15 and question_ratio < 0.1:
                    warnings.append({
                        'type': 'low_engagement',
                        'severity': 'medium',
                        'description': f"{name} sends short messages (avg {avg_length:.0f} chars) with few questions",
                        'suggestion': "Short, non-inquisitive responses may indicate low engagement"
                    })

        return {
            'red_flags': red_flags,
            'warnings': warnings,
            'total_red_flags': len(red_flags),
            'total_warnings': len(warnings),
            'overall_health': 'healthy' if len(red_flags) == 0 else ('concerning' if len(red_flags) < 3 else 'unhealthy')
        }

    def _emoji_stats(self, participants: Dict) -> Dict:
        emoji_by_participant = {}
        for name in participants:
            emoji_counter = self.sender_emojis[name]
            total_emojis = sum(emoji_counter.values())
            message_count = participants[name]['message_count']
            emoji_by_participant[name] = {
                'total_emojis': total_emojis,
                'unique_emojis': len(emoji_counter),
                'emojis_per_message': round(total_emojis / message_count, 2) if message_count else 0,
                'most_used_emojis': [
                    {'emoji': em, 'count': count}
                    for em, count in emoji_counter.most_common(10)
                ]
            }
        return emoji_by_participant

    def _time_patterns(self) -> Dict:
        """Response time trends by week"""
        return {
            'weekly_response_trends': {
                week: {
                    'average_response_minutes': round(sum(times) / len(times), 2) if times else 0,
                    'messages': len(times)
                }
                for week, times in self.weekly_responses.items()
            }
        }


class ChatAnalyzer:
    """Comprehensive chat analysis engine"""

    def analyze_conversation(
        self,
        messages: List[Dict],
        current_user_name: str = None,
        language: Optional[str] = None,
    ) -> Dict:
        """
        Perform comprehensive analysis on a conversation held in memory.
        (Large imports stream messages through ConversationAccumulator instead.)

        Args:
            messages:          List of message dicts (timestamp, sender, message)
            current_user_name: Name of the current user ("you" vs "other")
            language:          Optional ISO lang code to override auto-detection

        Returns:
            Comprehensive analysis dictionary (now includes language_info)
        """
        if not messages:
            return _empty_analysis()

        messages = sorted(messages, key=lambda x: x["timestamp"])
        detected_language = self._detect_conversation_language(messages, language)

        accumulator = ConversationAccumulator(len(messages), current_user_name, detected_language)
        accumulator.add_many(messages)
        return accumulator.result()

    # ── Language helpers ──────────────────────────────────────────────────────

    def _detect_conversation_language(
        self, messages: List[Dict], override: Optional[str] = None
    ) -> str:
        """
        Detect the dominant language of the conversation by sampling up to 30
        messages from the body of the chat (skipping very short filler messages).
        """
        if override and language_service.is_supported(override):
            return override

        sample_texts = []
        for msg in messages:
            text = msg.get("message", "").strip()
            if len(text) > 10:
                sample_texts.append(text)
            if len(sample_texts) >= 30:
                break

        if not sample_texts:
            return "en"

        # Vote on language across the sample
        lang_votes: Dict[str, int] = {}
        for text in sample_texts:
            lang, conf = language_service.detect_language(text)
            if conf > 0.4:
                lang_votes[lang] = lang_votes.get(lang, 0) + 1

        if not lang_votes:
            return "en"

        dominant = max(lang_votes, key=lang_votes.__getitem__)
        logger.info(f"Dominant conversation language: {dominant} (votes: {lang_votes})")
        return dominant

    def _empty_analysis(self) -> Dict:
        return _empty_analysis()


# Singleton instance
chat_analyzer = ChatAnalyzer()
