import React, { useEffect } from 'react';
import './PromotionDialog.css';
import { PieceColor } from './Chess';

interface PromotionDialogProps {
  color: PieceColor;
  position: { x: number; y: number };
  onSelect: (pieceType: 'queen' | 'rook' | 'bishop' | 'knight') => void;
}

const PIECE_SYMBOLS = {
  queen: { white: '♕', black: '♛' },
  rook: { white: '♖', black: '♜' },
  bishop: { white: '♗', black: '♝' },
  knight: { white: '♘', black: '♞' }
};

const PIECE_DESCRIPTIONS = {
  queen: 'Moves any number of squares diagonally, horizontally, or vertically',
  rook: 'Moves any number of squares horizontally or vertically',
  bishop: 'Moves any number of squares diagonally',
  knight: 'Moves in an L-shape: 2 squares in one direction and 1 square perpendicular'
};

const PromotionDialog: React.FC<PromotionDialogProps> = ({ color, position, onSelect }) => {
  const promotionPieces: Array<'queen' | 'rook' | 'bishop' | 'knight'> = [
    'queen', 'rook', 'bishop', 'knight'
  ];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onSelect('queen'); // Default to queen on ESC (or add a cancel option)
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSelect]);

  return (
    <div className="promotion-overlay">
      <div 
        className="promotion-dialog"
        style={{
          position: 'absolute',
          left: `${position.x}px`,
          top: `${position.y}px`,
          transform: 'translate(-50%, -50%)',
          animation: 'slideIn 0.3s ease-out'
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Pawn promotion selection"
      >
        <div className="promotion-header">
          Choose a piece for promotion
        </div>
        <div className="promotion-options">
          {promotionPieces.map(pieceType => (
            <button
              key={pieceType}
              className="promotion-option"
              onClick={() => onSelect(pieceType)}
              title={PIECE_DESCRIPTIONS[pieceType]}
              aria-label={`Promote to ${pieceType}`}
            >
              <div className="piece-symbol">
                {PIECE_SYMBOLS[pieceType][color]}
              </div>
              <div className="piece-name">
                {pieceType.toUpperCase()}
              </div>
            </button>
          ))}
        </div>
        <div className="promotion-footer">
          Press ESC to cancel (default: Queen)
        </div>
      </div>
    </div>
  );
};

export default PromotionDialog;
