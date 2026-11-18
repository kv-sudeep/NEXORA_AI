import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Background } from "@/components/jarvis/Background";
import { Panel } from "@/components/jarvis/Panel";
import { Button } from "@/components/ui/button";
import { Gamepad, Trophy, Clock, Star, Zap, Target, Shield, Sword, Play, Star as LucideStar, Heart, Share2 as LucideShare2 } from "lucide-react";

// Game library state
interface GameState {
  [key: string]: {
    plays: number;
    lastPlayed: string;
    rating: number;
  };
}

interface Game {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: "Easy" | "Medium" | "Hard";
  highScore: number;
}

const GAMES: Game[] = [
  { id: 'open-world-adventure', title: 'Open World Adventure', description: 'Explore a 3D city, collect coins, complete missions', category: 'Action', difficulty: 'Medium', highScore: 2840 },
  { id: 'zombie-survival', title: 'Zombie Survival', description: 'Survive waves of zombies with weapons', category: 'Action', difficulty: 'Hard', highScore: 125 },
  { id: 'battle-arena', title: 'Battle Arena', description: 'Combat with AI opponents', category: 'Action', difficulty: 'Hard', highScore: 1250 },
  { id: 'treasure-hunter', title: 'Treasure Hunter', description: 'Ancient temple exploration with puzzles', category: 'Adventure', difficulty: 'Medium', highScore: 3400 },
  { id: 'extreme-parkour', title: 'Extreme Parkour', description: 'Running, jumping, wall climbing', category: 'Sports', difficulty: 'Hard', highScore: 850 },
  { id: 'supercar-racing', title: 'Supercar Racing', description: 'Racing with realistic physics', category: 'Racing', difficulty: 'Medium', highScore: 2100 },
  { id: 'motorcycle-racing', title: 'Motorcycle Racing', description: 'Bike racing with leaning', category: 'Racing', difficulty: 'Hard', highScore: 1850 },
  { id: 'offroad-driving', title: 'Off-Road Driving', description: 'Jeep on mud and rocks', category: 'Racing', difficulty: 'Medium', highScore: 1500 },
  { id: 'space-racing', title: 'Space Racing', description: 'Spaceship racing in space', category: 'Racing', difficulty: 'Hard', highScore: 890 },
  { id: 'football-3d', title: 'Football 3D', description: 'Full 3D football with physics', category: 'Sports', difficulty: 'Medium', highScore: 2300 },
  { id: 'basketball-3d', title: 'Basketball 3D', description: '3D basketball with shooting', category: 'Sports', difficulty: 'Medium', highScore: 1800 },
  { id: 'cricket-3d', title: 'Cricket 3D', description: 'Batting and bowling cricket', category: 'Sports', difficulty: 'Medium', highScore: 1600 },
  { id: 'tennis-3d', title: 'Tennis 3D', description: '3D tennis serve and return', category: 'Sports', difficulty: 'Easy', highScore: 450 },
  { id: 'city-builder', title: 'City Builder 3D', description: 'Build your city', category: 'Strategy', difficulty: 'Medium', highScore: 0 },
  { id: 'flight-simulator', title: 'Flight Simulator', description: 'Take off and land aircraft', category: 'Simulation', difficulty: 'Hard', highScore: 1200 },
  { id: 'tank-battle', title: 'Tank Battle', description: 'Tank combat game', category: 'Strategy', difficulty: 'Hard', highScore: 920 },
  { id: 'space-exploration', title: 'Space Exploration', description: 'Explore planets', category: 'Adventure', difficulty: 'Medium', highScore: 0 },
  { id: 'maze-runner', title: '3D Maze Runner', description: 'Maze escape challenge', category: 'Puzzle', difficulty: 'Easy', highScore: 340 },
  { id: '3d-chess', title: '3D Chess', description: 'Chess in 3D', category: 'Puzzle', difficulty: 'Medium', highScore: 0 },
  { id: 'tower-defense', title: 'Tower Defense', description: 'Defend with towers', category: 'Strategy', difficulty: 'Hard', highScore: 0 },
];

export const Route = createFileRoute("/games")({
  component: GamesPage,
});

function GamesPage() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [gameState, setGameState] = useState<GameState>({});
  const [totalPlays, setTotalPlays] = useState(0);

  const categories = ['All', 'Action', 'Adventure', 'Racing', 'Sports', 'Strategy', 'Puzzle'];

  // Load game stats from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('jarvis-game-stats');
    if (saved) {
      setGameState(JSON.parse(saved));
    }
  }, []);

  const saveGameStats = (gameId: string, result: 'play' | 'complete') => {
    const newStats = { ...gameState };
    if (!newStats[gameId]) {
      newStats[gameId] = { plays: 0, lastPlayed: '', rating: 5 };
    }
    newStats[gameId].plays += 1;
    newStats[gameId].lastPlayed = new Date().toISOString();
    if (result === 'complete') {
      newStats[gameId].rating = Math.min(5, newStats[gameId].rating + 0.5);
    }
    setGameState(newStats);
    localStorage.setItem('jarvis-game-stats', JSON.stringify(newStats));
    setTotalPlays(prev => prev + 1);
  };

  const handleGameClick = (gameId: string) => {
    saveGameStats(gameId, 'play');
  };

  const filteredGames = GAMES.filter(game => {
    const matchCategory = selectedCategory === 'All' || game.category === selectedCategory;
    const matchSearch = game.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      game.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchCategory && matchSearch;
  });

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'bg-green-500/20 text-green-400';
      case 'Medium': return 'bg-yellow-500/20 text-yellow-400';
      case 'Hard': return 'bg-red-500/20 text-red-400';
      default: return 'bg-blue-500/20 text-blue-400';
    }
  };

  const gameStats = (gameId: string) => gameState[gameId] || { plays: 0, rating: 5 };

  return (
    <>
      <Background />
      <main className="relative h-screen w-screen overflow-hidden p-4">
        <header className="mb-4">
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">🎮 NEXUS 3D ARCADE</h1>
          <p className="text-muted-foreground">20+ Playable 3D Games</p>
        </header>

        {/* Category Filter */}
        <div className="flex gap-2 mb-4 overflow-x-auto">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                selectedCategory === cat
                  ? 'bg-hud-cyan text-black'
                  : 'bg-black/30 text-hud-cyan hover:bg-hud-cyan/10'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search games..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full md:max-w-xs px-3 py-1 bg-black/30 border border-hud-cyan/30 rounded text-foreground placeholder:text-muted-foreground"
          />
        </div>

        {/* Game Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredGames.map(game => {
            const stats = gameStats(game.id);
            return (
              <div key={game.id} className="block">
                <Panel title={game.title} className="hover:scale-105 transition-transform">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="h-12 w-12 bg-gradient-to-br from-hud-cyan/20 to-hud-blue/20 rounded-full flex items-center justify-center">
                        <Play className="h-6 w-6 text-hud-cyan" />
                      </div>
                      <div className="flex gap-1">
                        {stats.plays > 0 && (
                          <div className="flex items-center gap-0.5">
                            <Heart className="h-3 w-3 text-hud-green" />
                            <span className="text-xs text-hud-cyan/60">{stats.plays}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-0.5">
                          <LucideStar className="h-3 w-3 text-yellow-400" />
                          <span className="text-xs text-hud-cyan/60">{stats.rating.toFixed(1)}</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{game.description}</p>
                    <div className="flex justify-between items-center">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getDifficultyColor(game.difficulty)}`}>
                        {game.difficulty}
                      </span>
                      <div className="flex gap-2">
                        <Link
                          to={`/game/${game.id}`}
                          className="inline-block"
                          onClick={() => handleGameClick(game.id)}
                        >
                          <Button size="sm" className="gap-1">
                            <Gamepad className="h-3 w-3" /> PLAY
                          </Button>
                        </Link>
                        <Button variant="ghost" size="sm" onClick={() => {
                          navigator.clipboard.writeText(`Jarvis Games: ${game.title}`);
                        }}>
                          <LucideShare2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </Panel>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <footer className="absolute bottom-4 text-center text-hud-cyan/50 text-sm">
          <div className="flex items-center gap-4 justify-center">
            <span>{totalPlays} games played today</span>
            <span className="text-hud-green">●</span>
            <span>JARVIS Gaming Platform</span>
          </div>
        </footer>
      </main>
    </>
  );
}