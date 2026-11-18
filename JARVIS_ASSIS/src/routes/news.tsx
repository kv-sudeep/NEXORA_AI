import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Background } from "@/components/jarvis/Background";
import { Panel } from "@/components/jarvis/Panel";
import { useClock } from "@/hooks/use-clock";
import { RefreshCw, AlertCircle, Video, Play, Loader2, Check, X } from "lucide-react";

interface Article {
  title: string;
  link: string;
  summary: string;
  source: string;
  published: string;
}

interface NewsResponse {
  success: boolean;
  category: string;
  count: number;
  articles: Article[];
}

interface Notification {
  type: string;
  category: string;
  title: string;
  summary: string;
  link: string;
  timestamp: string;
}

interface Channel {
  name: string;
  language: string;
  youtube_handle: string;
  youtube_channel_id: string;
  streams_url: string;
  logo_url: string;
}

interface ChannelResponse {
  success: boolean;
  count: number;
  channels: Channel[];
}

interface LiveStatus {
  status: string;
  video_id: string | null;
  title: string | null;
  thumbnail: string | null;
  is_embeddable: boolean;
  youtube_url: string | null;
}

interface Language {
  code: string;
  name: string;
}

interface LanguagesResponse {
  success: boolean;
  languages: Language[];
}

export const Route = createFileRoute("/news")({
  component: NewsPage,
});

export const LANGUAGES = [
  { code: 'all', name: 'ALL' },
  { code: 'hindi', name: 'Hindi' },
  { code: 'english', name: 'English' },
  { code: 'tamil', name: 'Tamil' },
  { code: 'telugu', name: 'Telugu' },
  { code: 'kannada', name: 'Kannada' },
  { code: 'malayalam', name: 'Malayalam' },
  { code: 'bengali', name: 'Bengali' },
  { code: 'marathi', name: 'Marathi' },
  { code: 'gujarati', name: 'Gujarati' },
  { code: 'punjabi', name: 'Punjabi' },
];

function NewsPage() {
  const { time } = useClock();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [articles, setArticles] = useState<Article[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [liveStatus, setLiveStatus] = useState<Record<string, LiveStatus>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'rss' | 'channels'>('channels');

  // Fetch languages
  useEffect(() => {
    fetch("/api/jarvis/news/languages")
      .then(r => r.json())
      .then((data: LanguagesResponse) => setLanguages(data.languages || []))
      .catch(() => setLanguages([{ code: 'all', name: 'ALL' }]));
  }, []);

  const fetchChannels = async (language: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const url = language === 'all'
        ? "/api/jarvis/news/channels"
        : `/api/jarvis/news/channels?language=${language}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch channels");
      const data: ChannelResponse = await response.json();
      setChannels(data.channels || []);

      // Fetch live status for each channel
      const statusMap: Record<string, LiveStatus> = {};
      for (const channel of data.channels || []) {
        try {
          const statusRes = await fetch(`/api/jarvis/news/channels/${encodeURIComponent(channel.name)}`);
          if (statusRes.ok) {
            const statusData = await statusRes.json();
            statusMap[channel.youtube_channel_id] = statusData.channel.live_status;
          }
        } catch {}
      }
      setLiveStatus(statusMap);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await fetch("/api/jarvis/news/notifications");
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
      }
    } catch {}
  };

  const fetchNews = async (category: string) => {
    if (category === 'all') return;
    try {
      const response = await fetch(`/api/jarvis/news/daily?category=${category}`);
      if (response.ok) {
        const data: NewsResponse = await response.json();
        setArticles(data.articles || []);
      }
    } catch {}
  };

  useEffect(() => {
    if (activeTab === 'channels') {
      fetchChannels(selectedCategory);
    } else {
      fetchNews(selectedCategory);
      fetchNotifications();
    }
  }, [selectedCategory, activeTab]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'LIVE': return 'text-hud-green';
      case 'OFFLINE': return 'text-hud-cyan/50';
      case 'UPCOMING': return 'text-yellow-500';
      default: return 'text-hud-cyan/50';
    }
  };

  const getStatusBadge = (status: string) => {
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-display ${getStatusColor(status)} bg-black/30`}>
        {status}
      </span>
    );
  };

  return (
    <>
      <Background />
      <main className="relative h-screen w-screen overflow-hidden p-4">
        {/* Header */}
        <header className="mb-4">
          <div className="font-display text-sm tracking-[0.3em] text-hud-cyan">
            ◣ NEWS INTELLIGENCE · JARVIS 2.0 ◢
          </div>
          <div className="font-display text-xs tracking-wider text-hud-green mt-1">
            LAST UPDATED: {time}
          </div>
        </header>

        {/* Quick Notifications Banner (RSS tab only) */}
        {activeTab === 'rss' && notifications.length > 0 && (
          <section className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-display text-md text-hud-cyan">RECENT NOTIFICATIONS</h3>
              <button
                onClick={() => fetchNotifications()}
                className="p-1 rounded-full hover:bg-hud-cyan/10 transition-colors"
                title="Refresh notifications"
              >
                <RefreshCw className="h-4 w-4 text-hud-cyan" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto">
              {notifications.slice(0, 5).map((note, i) => (
                <div
                  key={i}
                  className="p-2 rounded border border-hud-cyan/20 bg-black/30 hover:bg-black/50 transition-colors"
                >
                  <div className="font-display text-xs text-hud-green">{note.category}</div>
                  <div className="font-display text-sm text-foreground">{note.title}</div>
                  <div className="text-xs text-muted-foreground line-clamp-1">{note.summary}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab('channels')}
            className={`px-3 py-1 rounded-full text-xs font-display transition-colors ${
              activeTab === 'channels'
                ? "bg-hud-cyan text-black"
                : "bg-black/30 text-hud-cyan hover:bg-hud-cyan/10"
            }`}
          >
            CHANNELS
          </button>
          <button
            onClick={() => setActiveTab('rss')}
            className={`px-3 py-1 rounded-full text-xs font-display transition-colors ${
              activeTab === 'rss'
                ? "bg-hud-cyan text-black"
                : "bg-black/30 text-hud-cyan hover:bg-hud-cyan/10"
            }`}
          >
            RSS NEWS
          </button>
        </div>

        {/* Language Filter (Channels tab) */}
        {activeTab === 'channels' && (
          <section className="mb-4">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {LANGUAGES.map((cat) => (
                <button
                  key={cat.code}
                  onClick={() => setSelectedCategory(cat.code)}
                  className={`px-3 py-1 rounded-full text-xs font-display transition-colors ${
                    selectedCategory === cat.code
                      ? "bg-hud-cyan text-black"
                      : "bg-black/30 text-hud-cyan hover:bg-hud-cyan/10"
                  }`}
                >
                  {cat.name.toUpperCase()}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Category Filter (RSS tab) */}
        {activeTab === 'rss' && selectedCategory === 'all' && (
          <section className="mb-4">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {["india", "technology", "world", "business", "sports", "entertainment"].map(
                (cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 rounded-full text-xs font-display transition-colors ${
                      selectedCategory === cat
                        ? "bg-hud-cyan text-black"
                        : "bg-black/30 text-hud-cyan hover:bg-hud-cyan/10"
                    }`}
                  >
                    {cat.toUpperCase()}
                  </button>
                )
              )}
            </div>
          </section>
        )}

        {/* Content Section */}
        <section className="flex-1 overflow-y-auto">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 text-hud-cyan animate-spin" />
            </div>
          )}

          {error && (
            <Panel title="ERROR">
              <div className="flex items-center gap-2 text-hud-red">
                <AlertCircle className="h-4 w-4" />
                <span>Failed to load data. {error}</span>
              </div>
            </Panel>
          )}

          {/* CHANNELS VIEW */}
          {activeTab === 'channels' && !isLoading && (
            <>
              <h3 className="font-display text-md text-hud-cyan mb-3">
                {selectedCategory === 'all' ? 'ALL CHANNELS' : selectedCategory.toUpperCase()} • {channels.length} CHANNEL{channels.length !== 1 ? 'S' : ''}
              </h3>

              {channels.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {channels.map((channel) => {
                    const status = liveStatus[channel.youtube_channel_id] || { status: 'UNAVAILABLE', is_embeddable: false };
                    return (
                      <Panel key={channel.name} title={channel.name}>
                        <div className="space-y-3">
                          {/* Live Status Badge */}
                          <div className="flex items-center justify-between">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-display ${getStatusColor(status.status)} bg-black/30`}>
                              {status.status}
                            </span>
                            {status.status === 'LIVE' && status.is_embeddable && (
                              <Play className="h-4 w-4 text-hud-green" title="Autoplaying live stream" />
                            )}
                          </div>

                          {/* Player Section - Show autoplay player when embeddable */}
                          {status.status === 'LIVE' && status.video_id ? (
                            <div className="aspect-video bg-black/20 rounded flex items-center justify-center">
                              <iframe
                                src={`https://www.youtube.com/embed/${status.video_id}?autoplay=1&playsinline=1`}
                                className="w-full h-full rounded"
                                allow="autoplay; encrypted-media; picture-in-picture"
                                allowFullScreen
                                title={status.title || `Live: ${channel.name}`}
                              />
                            </div>
                          ) : (
                            // eslint-disable-next-line react/jsx-key
                            <div className="aspect-video bg-black/30 rounded flex items-center justify-center">
                              <div className="text-center">
                                <X className="h-8 w-8 mx-auto mb-2 text-hud-cyan/50" />
                                <p className="text-xs text-hud-cyan/50">
                                  {status.status === 'LIVE' ? 'Live' : (status.status === 'OFFLINE' ? 'Offline' : 'Unavailable')}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Channel Info */}
                          <div className="text-xs">
                            <p className="text-hud-cyan font-display">Handle: @{channel.youtube_handle}</p>
                            <p className="text-muted-foreground">Status: {status.status}</p>
                            {status.status !== 'LIVE' && (
                              <a
                                href={channel.streams_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-hud-cyan hover:underline text-xs flex items-center gap-1 mt-1"
                              >
                                <Play className="h-3 w-3" />
                                Watch Live
                              </a>
                            )}
                          </div>
                        </div>
                      </Panel>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-hud-cyan/70">
                  <p>No channels available for {selectedCategory}</p>
                </div>
              )}
            </>
          )}

          {/* RSS NEWS VIEW */}
          {activeTab === 'rss' && (
            <>
              <h3 className="font-display text-md text-hud-cyan mb-3">
                DAILY NEWS • {selectedCategory === 'all' ? 'INDIA' : selectedCategory.toUpperCase()}
              </h3>

              {articles.length > 0 ? (
                <div className="space-y-3">
                  {articles.map((article, i) => (
                    <Panel key={i} title={article.source}>
                      <a
                        href={article.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block font-display text-sm text-foreground hover:text-hud-cyan transition-colors"
                      >
                        {article.title}
                      </a>
                      <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                        {article.summary || article.title}
                      </p>
                      <div className="mt-2 text-[9px] text-hud-cyan/70">
                        {new Date(article.published).toLocaleString()}
                      </div>
                    </Panel>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-hud-cyan/70">
                  <p>No news available for {selectedCategory}</p>
                </div>
              )}
            </>
          )}
        </section>

        {/* Quick Actions */}
        <footer className="absolute inset-x-4 bottom-4">
          <div className="flex gap-2 justify-center">
            <Link to="/" className="px-4 py-2 rounded bg-hud-cyan/20 text-hud-cyan hover:bg-hud-cyan/30 transition-colors">
              ← HOME
            </Link>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded bg-hud-cyan/20 text-hud-cyan hover:bg-hud-cyan/30 transition-colors flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              REFRESH
            </button>
          </div>
        </footer>
      </main>
    </>
  );
}