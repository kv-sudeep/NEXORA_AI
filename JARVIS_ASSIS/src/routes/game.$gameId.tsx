import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment, Html } from "@react-three/drei";
import { Background } from "@/components/jarvis/Background";
import { Panel } from "@/components/jarvis/Panel";
import { Button } from "@/components/ui/button";
import * as THREE from "three";

// Game configurations
const GAME_CONFIGS: Record<string, {
  title: string;
  description: string;
  category: string;
  difficulty: "Easy" | "Medium" | "Hard";
  highScore: number;
}> = {
  'open-world-adventure': { title: 'Open World Adventure', description: 'Explore a 3D city, collect coins, complete missions, and enter vehicles', category: 'Action & Adventure', difficulty: 'Medium', highScore: 2840 },
  'zombie-survival': { title: 'Zombie Survival', description: 'Survive waves of zombies with weapons and health packs', category: 'Action & Adventure', difficulty: 'Hard', highScore: 125 },
  'battle-arena': { title: 'Battle Arena', description: 'Third-person combat with AI opponents and weapons', category: 'Action & Adventure', difficulty: 'Hard', highScore: 1250 },
  'treasure-hunter': { title: 'Treasure Hunter', description: 'Ancient temple exploration with hidden chests and puzzles', category: 'Action & Adventure', difficulty: 'Medium', highScore: 3400 },
  'extreme-parkour': { title: 'Extreme Parkour', description: 'Running, jumping, wall climbing, and obstacle courses', category: 'Action & Adventure', difficulty: 'Hard', highScore: 850 },
  'supercar-racing': { title: 'Supercar Racing', description: 'Multiple sports cars with realistic physics and drift mechanics', category: 'Racing & Driving', difficulty: 'Medium', highScore: 2100 },
  'motorcycle-racing': { title: 'Motorcycle Racing', description: 'Motorcycle racing with bike leaning and traffic obstacles', category: 'Racing & Driving', difficulty: 'Hard', highScore: 1850 },
  'offroad-driving': { title: 'Off-Road Driving', description: 'Jeep and 4x4 vehicles on mud, rocks, and mountain roads', category: 'Racing & Driving', difficulty: 'Medium', highScore: 1500 },
  'space-racing': { title: 'Space Racing', description: 'Futuristic spaceships racing through space with asteroid obstacles', category: 'Racing & Driving', difficulty: 'Hard', highScore: 890 },
  'football-3d': { title: 'Football 3D', description: 'Full 3D football with player movement and ball physics', category: 'Sports', difficulty: 'Medium', highScore: 2300 },
  'basketball-3d': { title: 'Basketball 3D', description: '3D basketball with court physics and shooting mechanics', category: 'Sports', difficulty: 'Medium', highScore: 1800 },
  'cricket-3d': { title: 'Cricket 3D', description: 'Batting and bowling mechanics with ball physics', category: 'Sports', difficulty: 'Medium', highScore: 1600 },
  'tennis-3d': { title: 'Tennis 3D', description: '3D tennis with serve and return mechanics vs AI', category: 'Sports', difficulty: 'Easy', highScore: 450 },
  'city-builder': { title: 'City Builder 3D', description: 'Place buildings, build roads, and manage resources', category: 'Simulation & Strategy', difficulty: 'Medium', highScore: 0 },
  'flight-simulator': { title: 'Flight Simulator', description: 'Aircraft controls, takeoff, landing, and flight challenges', category: 'Simulation & Strategy', difficulty: 'Hard', highScore: 1200 },
  'tank-battle': { title: 'Tank Battle', description: 'Tank movement, turret rotation, and projectile physics', category: 'Simulation & Strategy', difficulty: 'Hard', highScore: 920 },
  'space-exploration': { title: 'Space Exploration', description: 'Explore planets, spaceships, and asteroid fields', category: 'Simulation & Strategy', difficulty: 'Medium', highScore: 0 },
  'maze-runner': { title: '3D Maze Runner', description: 'First-person maze exploration with keys and traps', category: 'Classic & Puzzle', difficulty: 'Easy', highScore: 340 },
  '3d-chess': { title: '3D Chess', description: '3D chessboard with legal move validation and checkmate', category: 'Classic & Puzzle', difficulty: 'Medium', highScore: 0 },
  'tower-defense': { title: '3D Tower Defense', description: 'Tower placement, upgrades, and wave progression', category: 'Classic & Puzzle', difficulty: 'Hard', highScore: 0 },
};

export const Route = createFileRoute("/game/$gameId")({
  component: GamePageRoute,
  loader: async ({ params }) => {
    const { gameId } = params;
    if (!gameId || !GAME_CONFIGS[gameId]) {
      throw notFound();
    }
    return { gameId, config: GAME_CONFIGS[gameId] };
  },
});

function GamePageRoute() {
  const loaderData = Route.useLoaderData();
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(loaderData.config.highScore);
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'won' | 'lost'>('menu');
  const [elapsed, setElapsed] = useState(0);
  const elapsedRef = useRef(0);
  const gameWonRef = useRef(false);

  useEffect(() => {
    document.title = `${loaderData.config.title} - JARVIS Games`;
    const interval = setInterval(() => {
      if (gameState === 'playing') {
        elapsedRef.current += 0.1;
        setElapsed(elapsedRef.current);
        if (elapsedRef.current > 30 && !gameWonRef.current) {
          gameWonRef.current = true;
          const winScore = 100;
          setScore(winScore);
          if (winScore > highScore) setHighScore(winScore);
          setGameState('won');
        }
      }
    }, 100);
    return () => clearInterval(interval);
  }, [gameState, highScore]);

  const handleStartGame = () => {
    setScore(0);
    setElapsed(0);
    elapsedRef.current = 0;
    gameWonRef.current = false;
    setGameState('playing');
  };

  if (gameState === 'menu') {
    return (
      <>
        <Background />
        <main className="relative h-screen w-screen overflow-hidden flex items-center justify-center">
          <Panel title={loaderData.config.title} className="p-6 max-w-md mx-4">
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-hud-cyan text-center">{loaderData.config.title}</h2>
              <p className="text-muted-foreground text-center">{loaderData.config.description}</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-hud-cyan/10 p-2 rounded">Category: {loaderData.config.category}</div>
                <div className="bg-hud-cyan/10 p-2 rounded">Difficulty: {loaderData.config.difficulty}</div>
              </div>
              <div className="bg-hud-cyan/10 p-3 rounded-lg">
                <div className="text-xs text-hud-cyan/70">High Score:</div>
                <div className="text-xl font-bold text-hud-cyan">{highScore}</div>
              </div>
              <div className="flex gap-2 justify-center">
                <Button onClick={handleStartGame}>PLAY</Button>
                <Button variant="outline" asChild><Link to="/games">← LOBBY</Link></Button>
              </div>
            </div>
          </Panel>
        </main>
      </>
    );
  }

  return (
    <>
      <Background />
      <main className="relative h-screen w-screen overflow-hidden">
        <div className="absolute top-4 left-4 z-10 bg-black/50 rounded p-3">
          <div className="text-sm text-hud-cyan"><span className="font-bold">Score:</span> {score}</div>
          <div className="text-sm text-hud-cyan"><span className="font-bold">Time:</span> {elapsed.toFixed(1)}s</div>
        </div>
        <div className="absolute top-4 right-4 z-10 bg-black/50 rounded p-3 flex gap-2">
          <Button variant="outline" size="sm" asChild><Link to="/games">← LOBBY</Link></Button>
          {gameState === 'playing' && <Button variant="destructive" size="sm" onClick={handleStartGame}>MENU</Button>}
        </div>
        <div className="absolute inset-0">
          <Canvas camera={{ position: [0, 5, 10], fov: 75 }}>
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 10, 10]} intensity={1} />
            <GameScene gameState={gameState} gameTitle={loaderData.config.title} />
            <Environment preset="sunset" />
            <OrbitControls enabled={gameState === 'playing'} />
          </Canvas>
        </div>
        {(gameState === 'won' || gameState === 'lost') && (
          <Panel className="absolute inset-0 m-auto p-6 max-w-sm" title={gameState.toUpperCase()}>
            <div className="text-center space-y-4">
              <h3 className="text-2xl font-bold text-hud-cyan">{gameState === 'won' ? '🎉 VICTORY!' : '💀 GAME OVER'}</h3>
              <div className="text-lg">Score: {score}</div>
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={handleStartGame}>RESTART</Button>
                <Button variant="outline" asChild><Link to="/games">LOBBY</Link></Button>
              </div>
            </div>
          </Panel>
        )}
      </main>
    </>
  );
}

interface GameSceneProps {
  gameState: 'menu' | 'playing' | 'won' | 'lost';
  gameTitle: string;
}

function GameScene({ gameState, gameTitle }: GameSceneProps) {
  const groupRef = useRef<THREE.Group>(null);
  const elapsed = useRef(0);

  useFrame((state, delta) => {
    if (groupRef.current && gameState === 'playing') {
      elapsed.current += delta;
      groupRef.current.rotation.y += delta * 0.1;
    }
  });

  const color = new THREE.Color().setHSL(Math.random(), 0.7, 0.5);

  return (
    <group ref={groupRef}>
      <mesh rotation-x={-Math.PI / 2}>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color={0x111111} side={THREE.DoubleSide} />
      </mesh>
      {[...Array(5)].map((_, i) => (
        <mesh key={i} position={[(Math.random() - 0.5) * 10, 0.5, (Math.random() - 0.5) * 10]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={color} />
        </mesh>
      ))}
      <Html position={[0, 4, 0]} center>
        <div className="text-center">
          <div className="text-xl font-bold text-white mb-1">{gameTitle}</div>
          <div className="text-cyan-400 text-sm">Survive 30 seconds to win!</div>
        </div>
      </Html>
    </group>
  );
}