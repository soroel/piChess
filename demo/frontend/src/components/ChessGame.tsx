// src/components/ChessGame.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from "react-chessboard";


interface ChessGameProps {
  gameId: string;
  userId?: string;
  onGameEnd: (result: { winner: string | null; gameId: string }) => void;
}

export const ChessGame: React.FC<ChessGameProps> = ({ gameId, onGameEnd }) => {
  const [game, setGame] = useState(new Chess());
  const [boardWidth, setBoardWidth] = useState(Math.min(window.innerWidth - 20, 600));

  // Resize board dynamically
  useEffect(() => {
    const handleResize = () => {
      setBoardWidth(Math.min(window.innerWidth - 20, 600));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const onDrop = useCallback(
    (sourceSquare: string, targetSquare: string) => {
      const newGame = new Chess(game.fen());
      const move = newGame.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      });

      if (move === null) return false;

      setGame(newGame);

      if (newGame.isGameOver() || newGame.isDraw()) {
        const result = newGame.isCheckmate()
          ? { winner: newGame.turn() === 'w' ? 'black' : 'white', gameId }
          : { winner: null, gameId };
        onGameEnd(result);
      }

      return true;
    },
    [game, gameId, onGameEnd]
  );

  return (
    <div className="chess-game">
    <Chessboard
      position={game.fen()}
      onPieceDrop={onDrop}
      boardWidth={boardWidth}
      boardOrientation="white" // valid prop
    />
  </div>
  
  );
};
