import React, { useState, useEffect } from 'react';
import { Login } from './components/Login';
import { PlayForPi } from './components/PlayForPi';
import { Matchmaking } from './components/Matchmaking';
import { ChessGame } from './components/ChessGame';
import { ResultHandler } from './components/ResultHandler';
import './App.css';

type GameState = 'login' | 'lobby' | 'matchmaking' | 'payment' | 'playing' | 'gameOver';

interface User {
  uid: string;
  username: string;
  accessToken: string;
}

interface GameResult {
  winner: string | null;
  gameId: string;
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [gameState, setGameState] = useState<GameState>('login');
  const [gameId, setGameId] = useState<string>('');
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [currentMatch, setCurrentMatch] = useState<{
    matchId: string;
    opponent: { id: string; username: string };
  } | null>(null);

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = () => {
      const storedUser = localStorage.getItem('pi_user');
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          setUser(userData);
          setGameState('lobby');
        } catch (e) {
          console.error('Failed to parse stored user data', e);
          localStorage.removeItem('pi_user');
        }
      }
      setSdkReady(true);
    };

    checkSession();
  }, []);

  const handleLogin = (userData: { uid: string; username: string; accessToken: string }) => {
    // Store user data in localStorage for persistence
    localStorage.setItem('pi_user', JSON.stringify(userData));
    localStorage.setItem('pi_access_token', userData.accessToken);
    
    setUser(userData);
    setGameState('lobby');
  };

  const handleLogout = async () => {
    try {
      if (window.Pi) {
        await window.Pi.logout();
      }
    } catch (error) {
      console.error('Error during logout:', error);
    }
    localStorage.removeItem('pi_user');
    localStorage.removeItem('pi_access_token');
    setUser(null);
    setGameState('login');
  };

  const handleGameStart = (newGameId: string) => {
    setGameId(newGameId);
    setGameState('playing');
  };

  const handleGameEnd = (result: GameResult) => {
    setGameResult(result);
    setGameState('gameOver');
  };

  const returnToLobby = () => {
    setGameResult(null);
    setCurrentMatch(null);
    setGameState('lobby');
  };

  const handleMatchFound = (matchId: string, opponent: { id: string; username: string }) => {
    setCurrentMatch({ matchId, opponent });
    setGameState('payment');
  };

  const handleStartGame = (gameId: string) => {
    setGameId(gameId);
    setGameState('playing');
  };

  if (!sdkReady) {
    return <div className="loading">Loading Pi Chess...</div>;
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1>Pi Chess</h1>
          {user && (
            <div className="user-actions">
              <span className="username">Welcome, {user.username}</span>
              <button onClick={handleLogout} className="logout-button">
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="app-main">
        {gameState === 'login' && <Login onLogin={handleLogin} />}
        
        {gameState === 'lobby' && user && (
          <div className="lobby">
            <h2>Play Chess for Pi</h2>
            <button 
              onClick={() => setGameState('matchmaking')}
              className="find-match-button"
            >
              Find a Match
            </button>
          </div>
        )}

        {gameState === 'matchmaking' && user && (
          <Matchmaking 
            userId={user.uid}
            username={user.username}
            accessToken={user.accessToken}
            onMatchFound={handleMatchFound}
            onBack={() => setGameState('lobby')}
          />
        )}

        {gameState === 'payment' && user && currentMatch && (
          <div className="payment-screen">
            <PlayForPi 
              userId={user.uid}
              username={user.username}
              opponent={currentMatch.opponent}
              matchId={currentMatch.matchId}
              onGameStart={handleStartGame}
              onBack={() => setGameState('lobby')}
            />
          </div>
        )}

        {gameState === 'playing' && (
          <ChessGame 
            gameId={gameId} 
            onGameEnd={handleGameEnd} 
            userId={user?.uid}
          />
        )}

        {gameState === 'gameOver' && gameResult && (
          <ResultHandler 
            result={gameResult} 
            onComplete={returnToLobby} 
          />
        )}
      </main>
    </div>
  );
}

export default App;