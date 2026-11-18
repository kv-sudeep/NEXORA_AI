"""
News Routes — JARVIS News Intelligence API Endpoints
Supports both RSS news aggregation and YouTube Live TV channels.
"""
import logging
from datetime import datetime
from flask import Blueprint, jsonify, request

news_bp = Blueprint("news", __name__, url_prefix="/api/jarvis/news")

logger = logging.getLogger(__name__)

# Import news aggregator (lazy import)
try:
    from modules.news_intelligence import news_aggregator
except ImportError:
    news_aggregator = None

try:
    from modules.news_intelligence.channel_registry import (
        CHANNEL_REGISTRY, get_all_languages, get_channels_by_language
    )
except ImportError:
    CHANNEL_REGISTRY = {}
    get_all_languages = lambda: []
    get_channels_by_language = lambda lang: []


@news_bp.route("/languages", methods=["GET"])
def get_languages():
    """Get all supported languages"""
    try:
        languages = get_all_languages()
        from modules.news_intelligence.channel_registry import LANGUAGE_NAMES
        return jsonify({
            "success": True,
            "languages": [
                {"code": lang, "name": LANGUAGE_NAMES.get(lang, lang.upper())}
                for lang in languages
            ]
        })
    except Exception as e:
        logger.error("Languages error: %s", e)
        return jsonify({"error": str(e)}), 500


@news_bp.route("/channels", methods=["GET"])
def list_channels():
    """List all news channels, optionally filtered by language"""
    try:
        language = request.args.get("language", "").lower()

        if language and language != "all":
            channels = get_channels_by_language(language)
        else:
            # Get all channels
            channels = []
            for lang_channels in CHANNEL_REGISTRY.values():
                channels.extend(lang_channels)

        # Convert to dict format
        channels_list = [
            {
                "name": ch.name,
                "language": ch.language,
                "youtube_handle": ch.youtube_handle,
                "youtube_channel_id": ch.youtube_channel_id,
                "streams_url": ch.streams_url,
                "logo_url": ch.logo_url
            }
            for ch in channels
        ]

        return jsonify({
            "success": True,
            "count": len(channels_list),
            "channels": channels_list
        })
    except Exception as e:
        logger.error("Channels error: %s", e)
        return jsonify({"error": str(e)}), 500


@news_bp.route("/channels/<channel_id>", methods=["GET"])
def get_channel(channel_id: str):
    """Get details for a specific channel"""
    try:
        from modules.news_intelligence.youtube_api import check_live_status, get_channel_info
        from modules.news_intelligence.channel_registry import get_channel_by_name

        # Try to find channel by ID or name
        channel = get_channel_by_name(channel_id)
        if not channel:
            return jsonify({"error": "Channel not found"}), 404

        # Get live status
        live_status = check_live_status(channel.youtube_channel_id, channel.youtube_handle)

        # Get channel info
        channel_info = get_channel_info(channel.youtube_channel_id)

        # Build status dict with correct youtube URL
        status_dict = {
            "status": live_status.status,
            "video_id": live_status.video_id,
            "title": live_status.title,
            "thumbnail": live_status.thumbnail,
            "is_embeddable": live_status.is_embeddable,
            "youtube_url": f"https://www.youtube.com/@{channel.youtube_handle}"
        }

        return jsonify({
            "success": True,
            "channel": {
                "name": channel.name,
                "language": channel.language,
                "youtube_handle": channel.youtube_handle,
                "youtube_channel_id": channel.youtube_channel_id,
                "streams_url": channel.streams_url,
                "logo_url": channel.logo_url,
                "live_status": status_dict
            }
        })
    except Exception as e:
        logger.error("Channel detail error: %s", e)
        return jsonify({"error": str(e)}), 500


@news_bp.route("/live", methods=["GET"])
def list_live_broadcasts():
    """List all currently live broadcasts"""
    try:
        from modules.news_intelligence.youtube_api import check_live_status

        live_broadcasts = []
        unavailable_count = 0

        # Check each channel
        for language, channels in CHANNEL_REGISTRY.items():
            for channel in channels:
                live = check_live_status(channel.youtube_channel_id, channel.youtube_handle)
                if live.status == "LIVE" and live.video_id:
                    live_broadcasts.append({
                        "channel_name": channel.name,
                        "language": channel.language,
                        "video_id": live.video_id,
                        "title": live.title,
                        "thumbnail": live.thumbnail,
                        "youtube_url": live.youtube_url,
                        "is_embeddable": live.is_embeddable,
                    })
                elif live.status in ("UNAVAILABLE", "OFFLINE"):
                    unavailable_count += 1

        return jsonify({
            "success": True,
            "live_count": len(live_broadcasts),
            "unavailable_count": unavailable_count,
            "broadcasts": live_broadcasts
        })
    except Exception as e:
        logger.error("Live broadcasts error: %s", e)
        return jsonify({"error": str(e)}), 500


@news_bp.route("/daily", methods=["GET"])
def daily_news():
    """Get daily RSS news for a category"""
    try:
        category = request.args.get("category", "india")
        if not news_aggregator:
            return jsonify({"error": "News aggregator not initialized"}), 500

        news = news_aggregator.get_daily_news(category)
        return jsonify({
            "success": True,
            "category": category,
            "count": len(news),
            "articles": news[:10]  # Return top 10
        })
    except Exception as e:
        logger.error("Daily news error: %s", e)
        return jsonify({"error": str(e)}), 500


@news_bp.route("/briefing", methods=["GET"])
def news_briefing():
    """Get comprehensive news briefing"""
    try:
        if not news_aggregator:
            return jsonify({"error": "News aggregator not initialized"}), 500

        briefing = news_aggregator.get_briefing()
        return jsonify(briefing)
    except Exception as e:
        logger.error("News briefing error: %s", e)
        return jsonify({"error": str(e)}), 500


@news_bp.route("/notifications", methods=["GET"])
def daily_notifications():
    """Get daily notification format for display"""
    try:
        if not news_aggregator:
            return jsonify({"error": "News aggregator not initialized"}), 500

        briefing = news_aggregator.get_briefing()

        # Format as notifications
        notifications = []
        for category, articles in briefing.get("categories", {}).items():
            for article in articles[:3]:  # Top 3 per category
                notifications.append({
                    "type": "news",
                    "category": category,
                    "title": article.get("title", "News"),
                    "summary": article.get("summary", "")[:100] + "...",
                    "link": article.get("link", ""),
                    "timestamp": article.get("published", briefing.get("timestamp", ""))
                })

        return jsonify({
            "success": True,
            "date": datetime.now().strftime("%Y-%m-%d"),
            "count": len(notifications),
            "notifications": notifications[:15]  # Max 15 notifications
        })
    except Exception as e:
        logger.error("Notifications error: %s", e)
        return jsonify({"error": str(e)}), 500


@news_bp.route("/latest", methods=["GET"])
def latest_videos():
    """Get latest videos from all channels"""
    try:
        from modules.news_intelligence.youtube_api import get_latest_videos

        all_videos = []
        for language, channels in CHANNEL_REGISTRY.items():
            for channel in channels:
                videos = get_latest_videos(channel.youtube_channel_id, max_results=3)
                for video in videos:
                    if "snippet" in video:
                        all_videos.append({
                            "channel_name": channel.name,
                            "language": channel.language,
                            "video_id": video.get("id", {}).get("videoId"),
                            "title": video["snippet"].get("title"),
                            "thumbnail": video["snippet"].get("thumbnails", {}).get("high", {}).get("url"),
                            "published_at": video["snippet"].get("publishedAt"),
                            "youtube_url": f"https://www.youtube.com/watch?v={video.get('id', {}).get('videoId')}" if video.get("id", {}).get("videoId") else None,
                        })

        # Sort by publish date (newest first)
        all_videos.sort(key=lambda x: x.get("published_at") or "", reverse=True)

        return jsonify({
            "success": True,
            "count": len(all_videos),
            "videos": all_videos[:20]  # Return top 20
        })
    except Exception as e:
        logger.error("Latest videos error: %s", e)
        return jsonify({"error": str(e)}), 500


@news_bp.route("/search", methods=["GET"])
def search_channels():
    """Search for channels by name or keyword"""
    try:
        query = request.args.get("q", "").lower()
        language = request.args.get("language", "").lower()

        if not query:
            return jsonify({"error": "Search query required"}), 400

        matching_channels = []
        for lang, channels in CHANNEL_REGISTRY.items():
            if language and language != "all" and lang != language:
                continue
            for channel in channels:
                if query in channel.name.lower() or query in channel.youtube_handle.lower():
                    matching_channels.append({
                        "name": channel.name,
                        "language": channel.language,
                        "youtube_handle": channel.youtube_handle,
                        "youtube_channel_id": channel.youtube_channel_id,
                        "streams_url": channel.streams_url,
                    })

        return jsonify({
            "success": True,
            "query": query,
            "count": len(matching_channels),
            "channels": matching_channels
        })
    except Exception as e:
        logger.error("Search error: %s", e)
        return jsonify({"error": str(e)}), 500