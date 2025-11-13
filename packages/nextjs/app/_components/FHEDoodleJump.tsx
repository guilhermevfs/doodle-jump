"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFhevm } from "@fhevm-sdk";
import { motion } from "framer-motion";
import { useAccount } from "wagmi";
import { RainbowKitCustomConnectButton } from "~~/components/helper/RainbowKitCustomConnectButton";
import { useFHEDoodleJump } from "~~/hooks/useFHEDoodleJump";

// --- Game Constants ---
const GAME_WIDTH = 600;
const GAME_HEIGHT = 580;
const PLAYER_SIZE = 40;
const PLATFORM_WIDTH = 64;
const PLATFORM_HEIGHT = 8;
const GRAVITY = 0.45;
const JUMP_POWER = 8.5;
const MOVE_SPEED = 7;
const SCROLL_STEP = 20;
const SCROLL_INTERVAL = 1000;

// --- Platform Component ---
const Platform = ({ x, y, type }: { x: number; y: number; type: string }) => {
  let color = "bg-green-400 border-green-600";
  if (type === "blue") color = "bg-teal-400 border-teal-500";
  if (type === "brown") color = "bg-amber-600 border-amber-800";
  if (type === "white") color = "bg-white border-gray-300";
  return (
    <div
      className={`absolute w-16 h-2 rounded-md border-b-2 shadow-sm ${color} transition-colors duration-100`}
      style={{ left: x, bottom: y }}
    />
  );
};

// --- Helper ---
const createNewPlatform = (minY: number, maxY: number) => {
  const types = ["green", "green", "green", "green", "blue", "blue", "brown"];
  const type = types[Math.floor(Math.random() * types.length)];
  const x = Math.random() * (GAME_WIDTH - PLATFORM_WIDTH);
  const y = minY + Math.random() * (maxY - minY);
  const direction = type === "blue" ? (Math.random() < 0.5 ? 1 : -1) : 0;
  return { x, y, type, direction };
};

// --- Collision check ---
function platsCollisionCheck(
  playerY: number,
  playerNextY: number,
  velocityY: number,
  playerX: number,
  platforms: any[],
  setMessage: (msg: string) => void,
  scrollOffset: number,
): number {
  let newVelocity = velocityY;

  for (const p of platforms) {
    const platformScreenY = p.y - scrollOffset;
    const willHit =
      velocityY > 0 &&
      playerY + PLAYER_SIZE <= platformScreenY &&
      playerNextY + PLAYER_SIZE >= platformScreenY &&
      playerX + PLAYER_SIZE > p.x &&
      playerX < p.x + PLATFORM_WIDTH;

    if (willHit) {
      newVelocity = -JUMP_POWER;
      setMessage("Bounce!");
      break;
    }
  }

  return newVelocity;
}

// --- Core Game Area ---
const CoreDoodleJumpArea = ({
  isGameActive,
  onGameOver,
  currentScore,
  setCurrentScore,
  setMessage,
}: {
  isGameActive: boolean;
  onGameOver: (score: number) => void;
  currentScore: React.MutableRefObject<number>;
  setCurrentScore: (score: number) => void;
  setMessage: (msg: string) => void;
}) => {
  const [playerX, setPlayerX] = useState(GAME_WIDTH / 2 - PLAYER_SIZE / 2);
  const [playerY, setPlayerY] = useState(100);
  const [velocityY, setVelocityY] = useState(-JUMP_POWER);
  const [platforms, setPlatforms] = useState(() => [
    { x: GAME_WIDTH / 2 - PLATFORM_WIDTH / 2, y: 50, type: "green", direction: 0 },
  ]);
  const [scrollOffset, setScrollOffset] = useState(0);
  const scoreRef = useRef(0);

  const platformsRef = useRef(platforms);
  useEffect(() => {
    platformsRef.current = platforms;
  }, [platforms]);

  const generatePlatforms = useCallback((currentHighestY: number) => {
    setPlatforms(plats => {
      let newPlats = [...plats];
      const PLATFORM_GAP_MIN = 50;
      const PLATFORM_GAP_MAX = 85;
      let highestY = newPlats.reduce((max, p) => Math.max(max, p.y), 0);

      while (highestY < currentHighestY + GAME_HEIGHT) {
        const newY = highestY + PLATFORM_GAP_MIN + Math.random() * (PLATFORM_GAP_MAX - PLATFORM_GAP_MIN);
        newPlats.push(createNewPlatform(newY, newY + PLATFORM_GAP_MAX));
        highestY = newY;
      }

      const cullThreshold = currentHighestY - 50;
      return newPlats.filter(p => p.y > cullThreshold);
    });
  }, []);

  useEffect(() => generatePlatforms(0), [generatePlatforms]);

  const keys = useRef({ ArrowLeft: false, ArrowRight: false });
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isGameActive) return;
      if (e.key === "ArrowLeft") keys.current.ArrowLeft = true;
      if (e.key === "ArrowRight") keys.current.ArrowRight = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") keys.current.ArrowLeft = false;
      if (e.key === "ArrowRight") keys.current.ArrowRight = false;
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [isGameActive]);

  // Game loop with substeps
  useEffect(() => {
    if (!isGameActive) return;
    const interval = setInterval(() => {
      let newVelocity = velocityY;
      let newY = playerY;

      const steps = Math.ceil(Math.abs(newVelocity)) || 1;
      for (let i = 0; i < steps; i++) {
        const stepV = newVelocity / steps;
        let nextY = newY + stepV;

        newVelocity = platsCollisionCheck(
          newY,
          nextY,
          newVelocity,
          playerX,
          platformsRef.current,
          setMessage,
          scrollOffset,
        );
        newY += stepV;
      }

      newVelocity += GRAVITY;

      let newX = playerX;
      if (keys.current.ArrowLeft) newX = Math.max(0, playerX - MOVE_SPEED);
      if (keys.current.ArrowRight) newX = Math.min(GAME_WIDTH - PLAYER_SIZE, playerX + MOVE_SPEED);
      setPlayerX(newX);

      const updatedPlatforms = platformsRef.current.map(p => {
        if (p.direction !== 0) {
          let newPX = p.x + p.direction * 2;
          let dir = p.direction;
          if (newPX <= 0 || newPX >= GAME_WIDTH - PLATFORM_WIDTH) dir *= -1;
          return { ...p, x: newPX, direction: dir };
        }
        return p;
      });
      platformsRef.current = updatedPlatforms;
      setPlatforms(updatedPlatforms);

      setPlayerY(newY);
      setVelocityY(newVelocity);

      if (newY > GAME_HEIGHT) onGameOver(scoreRef.current);
    }, 20);

    return () => clearInterval(interval);
  }, [isGameActive, playerY, velocityY, playerX, onGameOver, scrollOffset, generatePlatforms]);

  // Auto scroll
  useEffect(() => {
    if (!isGameActive) return;
    const scrollInterval = setInterval(() => {
      setScrollOffset(prev => {
        const newScroll = prev + SCROLL_STEP;
        generatePlatforms(newScroll);
        scoreRef.current = Math.floor(newScroll / 10);
        setCurrentScore(scoreRef.current);
        return newScroll;
      });
    }, SCROLL_INTERVAL);
    return () => clearInterval(scrollInterval);
  }, [isGameActive, generatePlatforms, setCurrentScore]);

  const visiblePlatforms = platforms.map(p => ({
    ...p,
    screenY: p.y - scrollOffset,
  }));

  return (
    <div
      className="w-full relative mx-auto overflow-hidden rounded-2xl border-4 border-yellow-500 shadow-2xl cursor-pointer bg-gray-900/90"
      style={{
        height: GAME_HEIGHT,
        width: GAME_WIDTH,
        backgroundColor: "#e0f7fa",
        backgroundImage:
          "linear-gradient(to right, #b2ebf2 1px, transparent 1px), linear-gradient(to bottom, #b2ebf2 1px, transparent 1px)",
        backgroundSize: "20px 20px",
      }}
    >
      {visiblePlatforms.map(
        (p, idx) =>
          p.screenY >= -PLATFORM_HEIGHT &&
          p.screenY <= GAME_HEIGHT && <Platform key={idx} x={p.x} y={p.screenY} type={p.type} />,
      )}

      <motion.div
        className="absolute transition-transform duration-100 ease-out"
        style={{ width: PLAYER_SIZE, height: PLAYER_SIZE, bottom: playerY, left: playerX }}
      >
        <div
          className="text-4xl w-full h-full flex items-center justify-center transition-all duration-300"
          style={{
            transform: `rotate(${velocityY < 0 ? "-10deg" : velocityY > 0 ? "10deg" : "0deg"})`,
          }}
        >
          {velocityY < 0 ? "🚀" : velocityY > 0 ? "😵" : "😎"}
        </div>
      </motion.div>

      <div className="absolute top-4 left-4 text-3xl font-extrabold text-teal-700 select-none z-10">
        SCORE: {scoreRef.current}
      </div>
    </div>
  );
};

// --- Main Component ---
export const FHEDoodleJump = () => {
  const { isConnected, chain } = useAccount();
  const activeChain = chain?.id;

  const ethProvider = useMemo(() => (typeof window !== "undefined" ? (window as any).ethereum : undefined), []);

  const initialMockChains = {
    11155111: `https://eth-sepolia.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`,
  };

  const { instance: doodleVM } = useFhevm({
    provider: ethProvider,
    chainId: activeChain,
    enabled: true,
    initialMockChains,
  });

  const doodle = useFHEDoodleJump({ instance: doodleVM, initialMockChains });

  const currentScore = useRef(0);
  const [maxScore, setMaxScore] = useState(0);
  const [feedbackMsg, setFeedbackMsg] = useState("FHE system is ready.");
  const [gameMessage, setGameMessage] = useState("Ready for your FHE adventure!");
  const [isGameActive, setIsGameActive] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);

  const handleSetCurrentScore = (score: number) => (currentScore.current = score);
  const handleSetGameMessage = (msg: string) => setGameMessage(msg);

  const handleGameOver = (finalScore: number) => {
    setIsGameActive(false);
    setIsGameOver(true);
    setMaxScore(finalScore);
    setFeedbackMsg(`🎮 GAME OVER! Your final score: ${finalScore} points. Please submit your score.`);
  };

  const handleSubmitScore = async () => {
    if (!doodle.canSubmit || doodle.isProcessing) return;
    setFeedbackMsg(`Encrypting score (${currentScore.current}) and sending to FHEVM...`);
    try {
      await doodle.submitJump(currentScore.current);
      setFeedbackMsg(`Score submitted successfully! Transaction pending.`);
      await doodle.refreshScores?.();
    } catch (err) {
      console.error(err);
      setFeedbackMsg("Failed to submit score. Check console for details.");
    }
  };

  const [gameKey, setGameKey] = useState(0);

  const handleStartGame = () => {
    currentScore.current = 0;
    setMaxScore(0);
    setIsGameOver(false);
    setIsGameActive(false);
    setGameKey(prev => prev + 1);
    setTimeout(() => {
      setIsGameActive(true);
    }, 10);
    setFeedbackMsg("Game STARTED! Use left/right arrows to move.");
    setGameMessage("Jump and reach the top! Use left/right arrows.");
  };

  const handleDecrypt = async () => {
    if (!doodle.canDecryptScores || doodle.isDecryptingScores) return;
    setFeedbackMsg("Requesting key and decrypting all submitted scores...");
    await doodle.decryptScores?.();
    setFeedbackMsg("Decryption complete! Check verified scores below.");
  };

  if (!isConnected) {
    return (
      <div className="h-[calc(100vh-58px)] w-full bg-gray-50 flex items-center justify-center text-gray-800">
        <motion.div
          className="h-[380px] w-[540px] bg-white border border-gray-200 rounded-xl p-10 text-center shadow-2xl"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <div className="text-5xl mb-5 text-teal-500">🛡️</div>
          <h2 className="text-3xl font-extrabold mb-3 tracking-wide text-gray-800">Access FHEVM Challenge</h2>
          <p className="text-gray-600 mb-6">Connect your wallet to join and secure your high score.</p>
          <RainbowKitCustomConnectButton />
        </motion.div>
      </div>
    );
  }

  const singleButton = !isGameActive && !isGameOver;
  const twoButtons = isGameOver;

  return (
    <div className="min-h-[calc(100vh-55px)] w-full text-gray-800 bg-gray-50 p-4 sm:p-8">
      <div className="max-w-[1200px] mx-auto space-y-8">
        <header className="flex items-center justify-center border-b border-teal-200 pb-4">
          <h1 className="text-4xl font-extrabold text-teal-600 tracking-wider">DOODLE JUMP</h1>
        </header>
        <div className="flex flex-col lg:flex-row gap-8">
          <section className="lg:w-3/5 bg-white p-6 rounded-xl shadow-xl flex flex-col items-center border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-700 mb-4 tracking-tight">Jump Zone</h2>
            <CoreDoodleJumpArea
              key={gameKey}
              isGameActive={isGameActive}
              onGameOver={handleGameOver}
              currentScore={currentScore}
              setCurrentScore={handleSetCurrentScore}
              setMessage={handleSetGameMessage}
            />

            <div className="flex flex-col sm:flex-row gap-4 mt-6 w-[600px]">
              <motion.button
                onClick={handleStartGame}
                disabled={(isGameActive && !isGameOver) || doodle.isProcessing}
                className={`px-6 py-3 rounded-xl text-lg font-bold text-white transition shadow-lg ${
                  !isGameActive && !isGameOver
                    ? "w-full bg-teal-500 hover:bg-teal-600 active:bg-teal-700"
                    : "flex-1 bg-teal-500 hover:bg-teal-600 active:bg-teal-700"
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {!isGameActive && !isGameOver ? "Start Challenge" : isGameOver ? "Restart Challenge" : "Jumping..."}
              </motion.button>
              {isGameOver && (
                <motion.button
                  onClick={handleSubmitScore}
                  disabled={doodle.isProcessing}
                  className="flex-1 px-6 py-3 rounded-xl text-lg font-bold text-white bg-green-500 hover:bg-green-600 transition shadow-lg"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {doodle.isProcessing ? "Encrypting..." : "Submit Score (FHE)"}
                </motion.button>
              )}
            </div>

            <div className="mt-4 text-sm text-center text-gray-500">{feedbackMsg}</div>
          </section>

          {/* Right sidebar with game status and decrypted scores */}
          <section className="lg:w-2/5 space-y-6">
            <div className="bg-white p-5 rounded-xl shadow-xl border border-gray-100">
              <h3 className="text-xl font-bold mb-3 text-yellow-600 flex items-center gap-2">
                <span className="text-2xl">📢</span> Game Status
              </h3>
              <motion.div
                className={`text-sm p-3 rounded-lg font-medium text-gray-800 border-l-4 ${
                  isGameActive ? "bg-yellow-100 border-yellow-500" : "bg-gray-100 border-gray-400"
                }`}
                key={gameMessage}
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                {gameMessage}
              </motion.div>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-xl border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xl font-bold text-gray-700 flex items-center gap-2">
                  <span className="text-2xl">🔑</span> Encrypted Scores
                </h3>
                <motion.button
                  onClick={handleDecrypt}
                  disabled={!doodle.canDecryptScores || doodle.isDecryptingScores || !doodle.scoreData?.length}
                  className={`px-3 py-1 rounded-full font-bold text-sm transition shadow-md ${
                    doodle.isDecryptingScores
                      ? "bg-gray-300 text-gray-700 cursor-wait animate-pulse"
                      : !doodle.scoreData?.length
                        ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                        : "bg-teal-500 hover:bg-teal-600 text-white"
                  }`}
                  whileHover={!doodle.isDecryptingScores && { scale: 1.05 }}
                  whileTap={!doodle.isDecryptingScores && { scale: 0.95 }}
                >
                  {doodle.isDecryptingScores ? "Decrypting..." : "Decrypt Scores"}
                </motion.button>
              </div>

              <div
                className="overflow-y-auto rounded-lg border border-gray-200 divide-y divide-gray-200 shadow-inner"
                style={{ maxHeight: "300px" }}
              >
                {doodle.scoreData?.length ? (
                  doodle.scoreData.map((item, idx) => {
                    const decrypted = doodle.decryptedScores?.[item];
                    const isDecrypted = decrypted !== undefined;
                    return (
                      <div
                        key={item}
                        className={`flex items-center justify-between px-4 py-3 text-sm transition-colors ${
                          idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                        } hover:bg-teal-50`}
                      >
                        <div className="text-gray-400 font-mono">#ID:{idx + 1}</div>
                        {isDecrypted ? (
                          <motion.div
                            className="font-extrabold flex items-center gap-2 text-green-600"
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.03 }}
                          >
                            <span>🔒➡️🔓</span>
                            <span>{Number(decrypted)} POINTS</span>
                          </motion.div>
                        ) : (
                          <div className="flex items-center gap-2 text-teal-500/80 font-medium">
                            <span>🔐</span>
                            <span className="italic">Encrypted</span>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <motion.div
                    className="text-gray-400 italic text-center py-6 text-base"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    No FHE scores recorded yet. Start playing!
                  </motion.div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
