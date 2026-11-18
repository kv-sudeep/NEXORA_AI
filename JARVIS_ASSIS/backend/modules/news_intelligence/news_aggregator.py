"""
News Intelligence — Daily news aggregation and notifications
"""
import feedparser
import requests
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

# RSS feeds for news sources (free, public sources)
NEWS_SOURCES = {
    'india': [
        'http://feed.muktambitious.com/rss',
        'https://www.thehindu.com/news/national/?feed=rss',
        'https://www.bbc.com/news/worldAsia',
    ],
    'technology': [
        'http://feeds.feedburner.com/TechCrunch/?format=xml',
        'https://news.google.com/technology/feed/rss',
        'https://www.theverge.com/tech/rss',
    ],
    'world': [
        'http://feeds.bbci.co.uk/news/world/rss.xml',
        'https://feeds.bbci.co.uk/news/politics/rss.xml',
        'https://rss.cnn.com/rss/edition_world.rss',
    ],
    'business': [
        'http://feeds.businesstoday.in/rss',
        'https://www.economictimes.indiatimes.com/rssbusiness',
    ],
    'sports': [
        'https://www.espn.com/rss/sports',
        'https://sports.indiatimes.com/rss',
    ],
    'entertainment': [
        'https://www.bollywoodhungama.com/rss',
        'https://www.bbc.com/news/entertainment_and_arts/rss',
    ]
}

class NewsAggregator:
    def __init__(self):
        self.last_fetch: Dict[str, datetime] = {}

    def fetch_feed(self, url: str) -> List[Dict[str, Any]]:
        """Fetch news from an RSS feed URL"""
        try:
            feed = feedparser.parse(url)
            articles = []
            for entry in feed.entries[:10]:  # Get top 10 articles
                article = {
                    'title': entry.title,
                    'link': entry.link,
                    'summary': getattr(entry, 'summary', getattr(entry, 'description', '')),
                    'published': getattr(entry, 'published', getattr(entry, 'updated', '')),
                    'source': getattr(feed.feed, 'title', 'Unknown'),
                }
                articles.append(article)
            return articles
        except Exception as e:
            logger.error(f"Error fetching feed {url}: {e}")
            return []

    def get_daily_news(self, category: str = 'india') -> List[Dict[str, Any]]:
        """Get daily news for a specific category"""
        all_articles = []
        sources = NEWS_SOURCES.get(category, NEWS_SOURCES['india'])

        for source_url in sources:
            articles = self.fetch_feed(source_url)
            all_articles.extend(articles)

        # Remove duplicates based on title
        seen_titles = set()
        unique_articles = []
        for article in all_articles:
            if article['title'] not in seen_titles:
                seen_titles.add(article['title'])
                unique_articles.append(article)

        return unique_articles[:20]  # Return top 20

    def get_briefing(self) -> Dict[str, Any]:
        """Get a comprehensive daily briefing"""
        briefing = {
            'timestamp': datetime.now().isoformat(),
            'categories': {}
        }

        for category in ['india', 'technology', 'world', 'business', 'sports', 'entertainment']:
            briefing['categories'][category] = self.get_daily_news(category)

        return briefing

# Global instance
news_aggregator = NewsAggregator()