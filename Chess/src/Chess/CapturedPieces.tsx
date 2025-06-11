import React from 'react';
import { Piece } from './ComputerPlayer';
import './CapturedPieces.css';

interface CapturedPiecesProps {
  pieces: Piece[];
  color: 'white' | 'black';
}

const CapturedPieces: React.FC<CapturedPiecesProps> = ({ pieces, color }) => {
  const getPieceSymbol = (piece: Piece): string => {
    const symbols = {
      king: { white: '♔', black: '♚' },
      queen: { white: '♕', black: '♛' },
      rook: { white: '♖', black: '♜' },
      bishop: { white: '♗', black: '♝' },
      knight: { white: '♘', black: '♞' },
      pawn: { white: '♙', black: '♟' }
    };
    return symbols[piece.type][piece.color];
  };

  // Sort pieces by value
  const pieceValues = {
    queen: 9,
    rook: 5,
    bishop: 3,
    knight: 3,
    pawn: 1,
    king: 0
  };

  const sortedPieces = [...pieces].sort((a, b) => pieceValues[b.type] - pieceValues[a.type]);

  return (
    <div className={`captured-pieces ${color}`}>
      <div className="captured-pieces-label">{color === 'white' ? 'White' : 'Black'} captures:</div>
      <div className="captured-pieces-list">
        {sortedPieces.map((piece, index) => (
          <span key={index} className="captured-piece">
            {getPieceSymbol(piece)}
          </span>
        ))}
      </div>
    </div>
  );
};

export default CapturedPieces; 