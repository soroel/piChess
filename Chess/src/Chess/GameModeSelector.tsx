import React from 'react';
import './GameModeSelector.css';

export type GameMode = 'computer' | 'player' | null;

interface GameModeSelectorProps {
  onSelectMode: (mode: GameMode) => void;
  username: string;
}

const GameModeSelector: React.FC<GameModeSelectorProps> = ({ onSelectMode, username }) => {
  return (
    <div className="game-mode-selector">
      <h2>Welcome, {username}!</h2>
      <p>Choose your game mode:</p>
      <div className="mode-buttons">
        <button 
          className="mode-button computer"
          onClick={() => onSelectMode('computer')}
        >
          <span className="icon">🤖</span>
          <span className="label">Play vs Computer</span>
        </button>
        <button 
          className="mode-button player"
          onClick={() => onSelectMode('player')}
        >
          <span className="icon">👥</span>
          <span className="label">Play vs Player</span>
        </button>
      </div>
    </div>
  );
};

export default GameModeSelector; 