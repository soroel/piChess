import React, { useState, useEffect, useCallback } from 'react';
import ChessBoard from './ChessBoard';
import MoveHistory from './MoveHistory';
import GameModeSelector, { GameMode } from './GameModeSelector';
import CapturedPieces from './CapturedPieces';
import { ComputerPlayer, Square, Piece } from './ComputerPlayer';
import './Chess.css';

export type PieceColor = 'white' | 'black';
export type GameStatus = 'active' | 'check' | 'checkmate';

interface Move {
  piece: string;
  from: string;
  to: string;
  capture?: boolean;
  check?: boolean;
  checkmate?: boolean;
}

interface BoardState {
  board: Square[][];
  currentPlayer: PieceColor;
  gameStatus: GameStatus;
  move: Move;
}

interface ChessProps {
  username: string;
}

const Chess: React.FC<ChessProps> = ({ username }) => {
  const [currentPlayer, setCurrentPlayer] = useState<PieceColor>('white');
  const [gameStatus, setGameStatus] = useState<GameStatus>('active');
  const [moveHistory, setMoveHistory] = useState<Move[]>([]);
  const [boardHistory, setBoardHistory] = useState<BoardState[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [gameMode, setGameMode] = useState<GameMode>(null);
  const [computerPlayer] = useState(() => new ComputerPlayer());
  const [capturedPieces, setCapturedPieces] = useState<{ white: Piece[], black: Piece[] }>({
    white: [],
    black: []
  });

  const getInitialPiece = (row: number, col: number): Piece | null => {
    if (row <= 1) {
      const color: PieceColor = 'black';
      if (row === 1) return { type: 'pawn', color };
      const pieceMap: Piece['type'][] = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
      return { type: pieceMap[col], color };
    } else if (row >= 6) {
      const color: PieceColor = 'white';
      if (row === 6) return { type: 'pawn', color };
      const pieceMap: Piece['type'][] = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
      return { type: pieceMap[col], color };
    }
    return null;
  };

  const getSquareNotation = (row: number, col: number): string => {
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    return `${files[col]}${8 - row}`;
  };

  const makeMove = (board: Square[][], move: { from: { row: number; col: number }; to: { row: number; col: number } }): Square[][] => {
    const newBoard = board.map(row => row.map(square => ({ ...square })));
    newBoard[move.to.row][move.to.col].piece = newBoard[move.from.row][move.from.col].piece;
    newBoard[move.from.row][move.from.col].piece = null;
    return newBoard;
  };

  const handleMove = useCallback((move: Move, boardState: Square[][]) => {
    setMoveHistory(prevMoves => [...prevMoves, move]);
    setCurrentPlayer(prevPlayer => prevPlayer === 'white' ? 'black' : 'white');
    
    const newStatus = move.checkmate ? 'checkmate' : (move.check ? 'check' : 'active');
    setGameStatus(newStatus);

    // Check for captured pieces
    if (move.capture) {
      const lastState = boardHistory[boardHistory.length - 1];
      if (lastState) {
        const toCoords = parseSquareNotation(move.to);
        const capturedPiece = lastState.board[toCoords.row][toCoords.col].piece;
        if (capturedPiece) {
          const capturingColor = currentPlayer === 'white' ? 'white' : 'black';
          setCapturedPieces(prev => ({
            ...prev,
            [capturingColor]: [...prev[capturingColor], capturedPiece]
          }));
        }
      }
    }

    setBoardHistory(prevHistory => [...prevHistory, {
      board: boardState,
      currentPlayer,
      gameStatus: newStatus,
      move
    }]);
    setCanUndo(true);
  }, [boardHistory, currentPlayer]);

  // This effect handles the computer's move in computer mode
  useEffect(() => {
    const initializeBoard = (): Square[][] => {
      const board: Square[][] = [];
      for (let i = 0; i < 8; i++) {
        const row: Square[] = [];
        for (let j = 0; j < 8; j++) {
          row.push({
            piece: getInitialPiece(i, j),
            color: (i + j) % 2 === 0 ? 'white' : 'black'
          });
        }
        board.push(row);
      }
      return board;
    };

    if (gameMode === 'computer' && currentPlayer === 'black') {
      const timeoutId = setTimeout(() => {
        const lastState = boardHistory[boardHistory.length - 1];
        if (lastState) {
          const computerMove = computerPlayer.getBestMove(lastState.board);
          if (computerMove) {
            const from = getSquareNotation(computerMove.from.row, computerMove.from.col);
            const to = getSquareNotation(computerMove.to.row, computerMove.to.col);
            handleMove({
              piece: lastState.board[computerMove.from.row][computerMove.from.col].piece?.type || '',
              from,
              to
            }, makeMove(lastState ? lastState.board : initializeBoard(), computerMove));
          }
        }
      }, 500);

      return () => clearTimeout(timeoutId);
    }
  }, [currentPlayer, gameMode, boardHistory, computerPlayer, handleMove]);

  const parseSquareNotation = (notation: string): { row: number; col: number } => {
    const file = notation.charAt(0).toLowerCase();
    const rank = parseInt(notation.charAt(1));
    const col = file.charCodeAt(0) - 'a'.charCodeAt(0);
    const row = 8 - rank;
    return { row, col };
  };

  const handleUndo = () => {
    if (boardHistory.length === 0) return;

    // In computer mode, undo both player's and computer's moves
    if (gameMode === 'computer') {
      const newMoveHistory = [...moveHistory];
      newMoveHistory.pop();
      newMoveHistory.pop();
      setMoveHistory(newMoveHistory);

      const newBoardHistory = [...boardHistory];
      newBoardHistory.pop();
      newBoardHistory.pop();
      setBoardHistory(newBoardHistory);

      const previousState = newBoardHistory[newBoardHistory.length - 1];
      if (previousState) {
        setCurrentPlayer(previousState.currentPlayer);
        setGameStatus(previousState.gameStatus);
      } else {
        setCurrentPlayer('white');
        setGameStatus('active');
      }

      setCanUndo(newBoardHistory.length > 0);
    } else {
      // In player vs player mode, undo one move at a time
      const newMoveHistory = [...moveHistory];
      newMoveHistory.pop();
      setMoveHistory(newMoveHistory);

      const newBoardHistory = [...boardHistory];
      const previousState = newBoardHistory.pop();
      setBoardHistory(newBoardHistory);

      if (previousState) {
        setCurrentPlayer(previousState.currentPlayer);
        setGameStatus(previousState.gameStatus);
      }

      setCanUndo(newBoardHistory.length > 0);
    }
  };

  const handleNewGame = () => {
    setCurrentPlayer('white');
    setGameStatus('active');
    setMoveHistory([]);
    setBoardHistory([]);
    setCanUndo(false);
    setCapturedPieces({ white: [], black: [] });
  };

  if (!gameMode) {
    return <GameModeSelector username={username} onSelectMode={setGameMode} />;
  }

  return (
    <div className="chess-game">
      <div className="game-info">
        <div className="current-player">
          Current Player: {currentPlayer.charAt(0).toUpperCase() + currentPlayer.slice(1)}
        </div>
        <div className="game-controls">
          <button 
            className="control-button undo-button" 
            onClick={handleUndo}
            disabled={!canUndo}
            title="Undo last move"
          >
            ↩ Undo
          </button>
          <button 
            className="control-button new-game-button" 
            onClick={handleNewGame}
            title="Start a new game"
          >
            New Game
          </button>
          <button
            className="control-button mode-button"
            onClick={() => setGameMode(null)}
            title="Change game mode"
          >
            Change Mode
          </button>
        </div>
        <div className="game-status">
          Status: {gameStatus.charAt(0).toUpperCase() + gameStatus.slice(1)}
        </div>
        <div className="game-mode">
          Mode: {gameMode === 'computer' ? 'vs Computer' : 'vs Player'}
        </div>
      </div>
      <div className="game-container">
        <div className="game-board">
          <CapturedPieces pieces={capturedPieces.black} color="black" />
          <ChessBoard
            currentPlayer={currentPlayer}
            gameStatus={gameStatus}
            onMove={handleMove}
            onNewGame={handleNewGame}
            boardHistory={boardHistory}
          />
          <CapturedPieces pieces={capturedPieces.white} color="white" />
        </div>
        <div className="move-history">
          <MoveHistory moves={moveHistory} />
        </div>
      </div>
    </div>
  );
};

export default Chess; 