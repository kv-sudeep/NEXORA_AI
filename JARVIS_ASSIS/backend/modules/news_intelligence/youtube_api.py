"""
YouTube API Integration — Live broadcast detection and metadata retrieval
Uses YouTube Data API v3 for channel and video information.
"""
import os
import logging
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from datetime import datetime
import requests

logger = logging.getLogger("youtube_api")

# YouTube API base URL
YOUTUBE_API_URL = "https://www.googleapis.com/youtube/v3"

# Cache for channel IDs (resolves handles to IDs)
_channel_id_cache: Dict[str, str] = {}


def get_channel_id(handle: str) -> Optional[str]:
    """Resolve a YouTube handle to channel ID using customsearch API"""
    if handle in _channel_id_cache:
        return _channel_id_cache[handle]

    api_key = os.getenv("YOUTUBE_API_KEY")
    if not api_key:
        logger.warning("YOUTUBE_API_KEY not set")
        return None

    try:
        # Use search API to find channel by handle
        url = f"{YOUTUBE_API_URL}/search"
        params = {
            "part": "snippet",
            "q": f"@{handle}",
            "type": "channel",
            "maxResults": 1,
            "key": api_key
        }
        response = requests.get(url, params=params, timeout=10)
        data = response.json()

        if data.get("items"):
            channel_id = data["items"][0]["snippet"]["channelId"]
            _channel_id_cache[handle] = channel_id
            return channel_id
    except Exception as e:
        logger.error(f"Error resolving channel ID for @{handle}: {e}")

    return None


@dataclass
class LiveBroadcastStatus:
    """Live broadcast information"""
    status: str  # LIVE, OFFLINE, UPCOMING, UNAVAILABLE, RESTRICTED
    video_id: Optional[str] = None
    title: Optional[str] = None
    thumbnail: Optional[str] = None
    started_at: Optional[str] = None
    is_embeddable: bool = True
    youtube_url: Optional[str] = None


def check_live_status(channel_id: str, youtube_handle: str = None) -> LiveBroadcastStatus:
    """Check if a channel is currently live"""
    api_key = os.getenv("YOUTUBE_API_KEY")
    logger.info(f"YOUTUBE_API_KEY check: {bool(api_key)}, channel_id={channel_id}, youtube_handle={youtube_handle}")
    if not api_key:
        # Return default status - no API key configured
        # Use custom handle URL if available, otherwise use channel ID
        channel_url = f"https://www.youtube.com/@{youtube_handle}" if youtube_handle else f"https://www.youtube.com/channel/{channel_id}"
        return LiveBroadcastStatus(
            status="UNAVAILABLE",
            is_embeddable=True,
            youtube_url=channel_url
        )

    try:
        # First, get the channel's current live stream (if any)
        url = f"{YOUTUBE_API_URL}/search"
        params = {
            "part": "snippet",
            "channelId": channel_id,
            "eventType": "live",
            "type": "video",
            "maxResults": 1,
            "key": api_key
        }
        response = requests.get(url, params=params, timeout=10)
        data = response.json()

        if data.get("items") and len(data["items"]) > 0:
            item = data["items"][0]
            video_id = item["id"]["videoId"]
            title = item["snippet"]["title"]
            thumbnail = item["snippet"]["thumbnails"].get("high", {}).get("url")

            # All live streams are embeddable in their own player
            # All live streams are embeddable in their own player
            is_embeddable = True
            # Use youtube_handle if provided for better URL
            channel_url = f"https://www.youtube.com/@{youtube_handle}" if youtube_handle else f"https://www.youtube.com/channel/{channel_id}"

            return LiveBroadcastStatus(
                status="LIVE",
                video_id=video_id,
                title=title,
                thumbnail=thumbnail,
                youtube_url=f"https://www.youtube.com/watch?v={video_id}",
                is_embeddable=is_embeddable,
                started_at=response.headers.get('Date')  # Capture when stream started
            )

        # No live broadcast found - check for upcoming scheduled streams
        # Still provide a valid URL for the channel page
        logger.info(f"No live broadcast found for {channel_id}, handle={youtube_handle}")
        channel_url = f"https://www.youtube.com/@{youtube_handle}" if youtube_handle else f"https://www.youtube.com/channel/{channel_id}"
        logger.info(f"Channel URL: {channel_url}")
        return LiveBroadcastStatus(
            status="OFFLINE",
            is_embeddable=True,
            youtube_url=channel_url
        )

    except Exception as e:
        logger.error(f"Error checking live status for channel {channel_id}: {e}")
        channel_url = f"https://www.youtube.com/@{youtube_handle}" if youtube_handle else f"https://www.youtube.com/channel/{channel_id}"
        return LiveBroadcastStatus(
            status="UNAVAILABLE",
            is_embeddable=True,
            youtube_url=channel_url
        )


def get_channel_info(channel_id: str) -> Optional[Dict[str, Any]]:
    """Get channel information including subscriber count, description, etc."""
    api_key = os.getenv("YOUTUBE_API_KEY")
    if not api_key:
        return None

    try:
        url = f"{YOUTUBE_API_URL}/channels"
        params = {
            "part": "snippet,statistics,brandingSettings",
            "id": channel_id,
            "key": api_key
        }
        response = requests.get(url, params=params, timeout=10)
        return response.json()
    except Exception as e:
        logger.error(f"Error getting channel info for {channel_id}: {e}")
        return None


def get_video_metadata(video_id: str) -> Optional[Dict[str, Any]]:
    """Get metadata for a specific video"""
    api_key = os.getenv("YOUTUBE_API_KEY")
    if not api_key:
        return None

    try:
        url = f"{YOUTUBE_API_URL}/videos"
        params = {
            "part": "snippet,contentDetails,status",
            "id": video_id,
            "key": api_key
        }
        response = requests.get(url, params=params, timeout=10)
        return response.json()
    except Exception as e:
        logger.error(f"Error getting video metadata for {video_id}: {e}")
        return None


def search_videos(query: str, max_results: int = 10) -> List[Dict[str, Any]]:
    """Search for videos by query"""
    api_key = os.getenv("YOUTUBE_API_KEY")
    if not api_key:
        return []

    try:
        url = f"{YOUTUBE_API_URL}/search"
        params = {
            "part": "snippet",
            "q": query,
            "maxResults": max_results,
            "type": "video",
            "key": api_key
        }
        response = requests.get(url, params=params, timeout=10)
        data = response.json()
        return data.get("items", [])
    except Exception as e:
        logger.error(f"Error searching videos for '{query}': {e}")
        return []


def get_latest_videos(channel_id: str, max_results: int = 10) -> List[Dict[str, Any]]:
    """Get the latest videos from a channel"""
    api_key = os.getenv("YOUTUBE_API_KEY")
    if not api_key:
        return []

    try:
        url = f"{YOUTUBE_API_URL}/search"
        params = {
            "part": "snippet",
            "channelId": channel_id,
            "maxResults": max_results,
            "order": "date",
            "type": "video",
            "key": api_key
        }
        response = requests.get(url, params=params, timeout=10)
        data = response.json()
        return data.get("items", [])
    except Exception as e:
        logger.error(f"Error getting latest videos for {channel_id}: {e}")
        return []