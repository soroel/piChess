import React from 'react';
import './CheckmatePopup.css';
import { PieceColor } from './Chess';

interface CheckmatePopupProps {
  winner: PieceColor;
  onNewGame: () => void;
}

const CheckmatePopup: React.FC<CheckmatePopupProps> = ({ winner, onNewGame }) => {
  return (
    <div className="checkmate-overlay">
      <div className="checkmate-popup">
        <div className="checkmate-content">
          <h2>Checkmate!</h2>
          <p>{winner.charAt(0).toUpperCase() + winner.slice(1)} wins!</p>
          <button className="new-game-button" onClick={onNewGame}>
            New Game
          </button>
        </div>
      </div>
    </div>
  );
};

export default CheckmatePopup; 