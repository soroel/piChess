import React, { useState, useRef, useEffect, useCallback } from 'react';
import './ChessBoard.css';
import { PieceColor, GameStatus } from './Chess';
import PromotionDialog from './PromotionDialog';
import CheckmatePopup from './CheckmatePopup';

type PieceType = 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn';

interface Piece {
  type: PieceType;
  color: PieceColor;
}

interface Square {
  piece: Piece | null;
  color: PieceColor;
}

interface Position {
  row: number;
  col: number;
}

interface Move {
  piece: string;
  from: string;
  to: string;
  capture?: boolean;
  check?: boolean;
  checkmate?: boolean;
}

interface ChessBoardProps {
  currentPlayer: PieceColor;
  gameStatus: GameStatus;
  onMove: (move: Move, boardState: Square[][]) => void;
  onNewGame: () => void;
  boardHistory: Array<{
    board: Array<Array<{
      piece: { type: string; color: PieceColor } | null;
      color: PieceColor;
    }>>;
    currentPlayer: PieceColor;
    gameStatus: GameStatus;
    move: Move;
  }>;
}

interface ChessBoardState {
  lastMove: {
    piece: Piece;
    from: Position;
    to: Position;
  } | null;
  canEnPassant: Position | null;
}

interface PromotionState {
  position: Position;
  dialogPosition: { x: number; y: number };
}

export interface PromotionDialogProps {
  color: PieceColor;
  position: { x: number; y: number };
  onSelect: (type: 'queen' | 'rook' | 'bishop' | 'knight') => void;
}

const PIECE_SYMBOLS: { [key in PieceType]: { [key in PieceColor]: string } } = {
  king: { white: '♔', black: '♚' },
  queen: { white: '♕', black: '♛' },
  rook: { white: '♖', black: '♜' },
  bishop: { white: '♗', black: '♝' },
  knight: { white: '♘', black: '♞' },
  pawn: { white: '♙', black: '♟' }
};

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

const ChessBoard: React.FC<ChessBoardProps> = ({ 
  currentPlayer, 
  gameStatus, 
  onMove, 
  onNewGame,
  boardHistory 
}) => {
  // Initialize the board function using useCallback
  const initializeBoard = useCallback((): Square[][] => {
    const newBoard: Square[][] = [];
    for (let i = 0; i < 8; i++) {
      const row: Square[] = [];
      for (let j = 0; j < 8; j++) {
        row.push({
          piece: getInitialPiece(i, j),
          color: (i + j) % 2 === 0 ? 'white' : 'black'
        });
      }
      newBoard.push(row);
    }
    return newBoard;
  }, []); // No dependencies needed as it's a pure function

  const [board, setBoard] = useState<Square[][]>(initializeBoard());
  const [selectedPiece, setSelectedPiece] = useState<Position | null>(null);
  const [validMoves, setValidMoves] = useState<Position[]>([]);
  const [boardState, setBoardState] = useState<ChessBoardState>({
    lastMove: null,
    canEnPassant: null
  });
  const [promotionState, setPromotionState] = useState<PromotionState | null>(null);
  const [lastMove, setLastMove] = useState<{ from: Position; to: Position } | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  // Update board when history changes
  useEffect(() => {
    if (boardHistory.length > 0) {
      const lastState = boardHistory[boardHistory.length - 1];
      setBoard(lastState.board as Square[][]);
      if (lastState.move) {
        const fromCoords = parseSquareNotation(lastState.move.from);
        const toCoords = parseSquareNotation(lastState.move.to);
        setLastMove({ from: fromCoords, to: toCoords });
      }
    } else {
      setBoard(initializeBoard());
      setLastMove(null);
    }
  }, [boardHistory, initializeBoard]);

  function getInitialPiece(row: number, col: number): Piece | null {
    if (row <= 1) {
      const color: PieceColor = 'black';
      if (row === 1) return { type: 'pawn', color };
      const pieceMap: PieceType[] = [
        'rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'
      ];
      return { type: pieceMap[col], color };
    } else if (row >= 6) {
      const color: PieceColor = 'white';
      if (row === 6) return { type: 'pawn', color };
      const pieceMap: PieceType[] = [
        'rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'
      ];
      return { type: pieceMap[col], color };
    }
    return null;
  }

  function getSquareNotation(row: number, col: number): string {
    return `${FILES[col]}${8 - row}`;
  }

  function parseSquareNotation(notation: string): Position {
    const file = notation.charAt(0).toLowerCase();
    const rank = parseInt(notation.charAt(1));
    return {
      row: 8 - rank,
      col: FILES.indexOf(file)
    };
  }

  function isValidCastling(kingPos: Position, rookPos: Position, color: PieceColor): boolean {
    // Check if king or rook has moved
    if (boardState.lastMove?.piece.type === 'king' && boardState.lastMove.piece.color === color) return false;
    
    const row = color === 'white' ? 7 : 0;
    if (kingPos.row !== row || kingPos.col !== 4) return false;
    
    const king = board[kingPos.row][kingPos.col].piece;
    const rook = board[rookPos.row][rookPos.col].piece;
    
    if (!king || !rook || king.type !== 'king' || rook.type !== 'rook') return false;

    // Check if path is clear
    const direction = rookPos.col < kingPos.col ? -1 : 1;
    for (let col = kingPos.col + direction; col !== rookPos.col; col += direction) {
      if (board[row][col].piece) return false;
    }

    // Check if king passes through check
    for (let col = kingPos.col; col !== kingPos.col + (direction * 3); col += direction) {
      const testBoard = board.map(row => row.map(square => ({ ...square })));
      testBoard[row][col].piece = king;
      testBoard[row][kingPos.col].piece = null;
      if (isKingInCheck(color, testBoard)) return false;
    }

    return true;
  }

  function getPieceMoves(pos: Position, piece: Piece, testBoard: Square[][]): Position[] {
    const moves: Position[] = [];

    switch (piece.type) {
      case 'pawn':
        const direction = piece.color === 'white' ? -1 : 1;
        const startRow = piece.color === 'white' ? 6 : 1;
        
        // Forward move
        let newRow = pos.row + direction;
        if (newRow >= 0 && newRow < 8 && !testBoard[newRow][pos.col].piece) {
          moves.push({ row: newRow, col: pos.col });
          
          // Initial two-square move
          if (pos.row === startRow) {
            const twoSquares = pos.row + (direction * 2);
            if (!testBoard[twoSquares][pos.col].piece) {
              moves.push({ row: twoSquares, col: pos.col });
            }
          }
        }
        
        // Captures (including en passant)
        [-1, 1].forEach(offset => {
          const newCol = pos.col + offset;
          if (newCol >= 0 && newCol < 8 && newRow >= 0 && newRow < 8) {
            const targetPiece = testBoard[newRow][newCol].piece;
            if (targetPiece && targetPiece.color !== piece.color) {
              moves.push({ row: newRow, col: newCol });
            }
          }
        });
        break;

      case 'knight':
        const knightMoves = [
          [-2, -1], [-2, 1], [-1, -2], [-1, 2],
          [1, -2], [1, 2], [2, -1], [2, 1]
        ];
        knightMoves.forEach(([rowOffset, colOffset]) => {
          const newRow = pos.row + rowOffset;
          const newCol = pos.col + colOffset;
          if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
            const targetPiece = testBoard[newRow][newCol].piece;
            if (!targetPiece || targetPiece.color !== piece.color) {
              moves.push({ row: newRow, col: newCol });
            }
          }
        });
        break;

      case 'bishop':
        const bishopDirections = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
        bishopDirections.forEach(([rowDir, colDir]) => {
          let newRow = pos.row + rowDir;
          let newCol = pos.col + colDir;
          while (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
            const targetPiece = testBoard[newRow][newCol].piece;
            if (!targetPiece) {
              moves.push({ row: newRow, col: newCol });
            } else {
              if (targetPiece.color !== piece.color) {
                moves.push({ row: newRow, col: newCol });
              }
              break;
            }
            newRow += rowDir;
            newCol += colDir;
          }
        });
        break;

      case 'rook':
        const rookDirections = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        rookDirections.forEach(([rowDir, colDir]) => {
          let newRow = pos.row + rowDir;
          let newCol = pos.col + colDir;
          while (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
            const targetPiece = testBoard[newRow][newCol].piece;
            if (!targetPiece) {
              moves.push({ row: newRow, col: newCol });
            } else {
              if (targetPiece.color !== piece.color) {
                moves.push({ row: newRow, col: newCol });
              }
              break;
            }
            newRow += rowDir;
            newCol += colDir;
          }
        });
        break;

      case 'queen':
        const queenDirections = [
          [-1, -1], [-1, 0], [-1, 1],
          [0, -1], [0, 1],
          [1, -1], [1, 0], [1, 1]
        ];
        queenDirections.forEach(([rowDir, colDir]) => {
          let newRow = pos.row + rowDir;
          let newCol = pos.col + colDir;
          while (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
            const targetPiece = testBoard[newRow][newCol].piece;
            if (!targetPiece) {
              moves.push({ row: newRow, col: newCol });
            } else {
              if (targetPiece.color !== piece.color) {
                moves.push({ row: newRow, col: newCol });
              }
              break;
            }
            newRow += rowDir;
            newCol += colDir;
          }
        });
        break;

      case 'king':
        const kingMoves = [
          [-1, -1], [-1, 0], [-1, 1],
          [0, -1], [0, 1],
          [1, -1], [1, 0], [1, 1]
        ];
        kingMoves.forEach(([rowOffset, colOffset]) => {
          const newRow = pos.row + rowOffset;
          const newCol = pos.col + colOffset;
          if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
            const targetPiece = testBoard[newRow][newCol].piece;
            if (!targetPiece || targetPiece.color !== piece.color) {
              moves.push({ row: newRow, col: newCol });
            }
          }
        });
        break;
    }

    return moves;
  }

  function findKingPosition(color: PieceColor, testBoard: Square[][]): Position | null {
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = testBoard[row][col].piece;
        if (piece?.type === 'king' && piece.color === color) {
          return { row, col };
        }
      }
    }
    return null;
  }

  function isSquareUnderAttack(pos: Position, byColor: PieceColor, testBoard: Square[][]): boolean {
    // Check pawn attacks
    const pawnDirection = byColor === 'white' ? 1 : -1;
    const pawnAttacks = [
      { row: pos.row + pawnDirection, col: pos.col - 1 },
      { row: pos.row + pawnDirection, col: pos.col + 1 }
    ];
    
    for (const attack of pawnAttacks) {
      if (attack.row >= 0 && attack.row < 8 && attack.col >= 0 && attack.col < 8) {
        const piece = testBoard[attack.row][attack.col].piece;
        if (piece?.type === 'pawn' && piece.color === byColor) {
          return true;
        }
      }
    }

    // Check knight attacks
    const knightMoves = [
      [-2, -1], [-2, 1], [-1, -2], [-1, 2],
      [1, -2], [1, 2], [2, -1], [2, 1]
    ];
    
    for (const [rowOffset, colOffset] of knightMoves) {
      const newRow = pos.row + rowOffset;
      const newCol = pos.col + colOffset;
      if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
        const piece = testBoard[newRow][newCol].piece;
        if (piece?.type === 'knight' && piece.color === byColor) {
          return true;
        }
      }
    }

    // Check diagonal attacks (bishop/queen)
    const diagonalDirections = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    for (const [rowDir, colDir] of diagonalDirections) {
      let newRow = pos.row + rowDir;
      let newCol = pos.col + colDir;
      while (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
        const piece = testBoard[newRow][newCol].piece;
        if (piece) {
          if (piece.color === byColor && 
             (piece.type === 'bishop' || piece.type === 'queen')) {
            return true;
          }
          break; // Stop checking this direction if we hit any piece
        }
        newRow += rowDir;
        newCol += colDir;
      }
    }

    // Check straight attacks (rook/queen)
    const straightDirections = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [rowDir, colDir] of straightDirections) {
      let newRow = pos.row + rowDir;
      let newCol = pos.col + colDir;
      while (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
        const piece = testBoard[newRow][newCol].piece;
        if (piece) {
          if (piece.color === byColor && 
             (piece.type === 'rook' || piece.type === 'queen')) {
            return true;
          }
          break; // Stop checking this direction if we hit any piece
        }
        newRow += rowDir;
        newCol += colDir;
      }
    }

    // Check king proximity (for adjacent squares)
    const kingMoves = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1], [0, 1],
      [1, -1], [1, 0], [1, 1]
    ];
    
    for (const [rowOffset, colOffset] of kingMoves) {
      const newRow = pos.row + rowOffset;
      const newCol = pos.col + colOffset;
      if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
        const piece = testBoard[newRow][newCol].piece;
        if (piece?.type === 'king' && piece.color === byColor) {
          return true;
        }
      }
    }

    return false;
  }

  function isKingInCheck(color: PieceColor, testBoard: Square[][]): boolean {
    const kingPos = findKingPosition(color, testBoard);
    if (!kingPos) return false;

    const opponentColor = color === 'white' ? 'black' : 'white';
    return isSquareUnderAttack(kingPos, opponentColor, testBoard);
  }

  function getCheckingPieces(color: PieceColor, testBoard: Square[][]): Position[] {
    const kingPos = findKingPosition(color, testBoard);
    if (!kingPos) return [];

    const checkingPieces: Position[] = [];
    const opponentColor = color === 'white' ? 'black' : 'white';

    // Check for pawns
    const pawnDirection = opponentColor === 'white' ? 1 : -1;
    const pawnAttacks = [
      { row: kingPos.row + pawnDirection, col: kingPos.col - 1 },
      { row: kingPos.row + pawnDirection, col: kingPos.col + 1 }
    ];

    for (const attack of pawnAttacks) {
      if (attack.row >= 0 && attack.row < 8 && attack.col >= 0 && attack.col < 8) {
        const piece = testBoard[attack.row][attack.col].piece;
        if (piece?.type === 'pawn' && piece.color === opponentColor) {
          checkingPieces.push({ row: attack.row, col: attack.col });
        }
      }
    }

    // Check for knights
    const knightMoves = [
      [-2, -1], [-2, 1], [-1, -2], [-1, 2],
      [1, -2], [1, 2], [2, -1], [2, 1]
    ];
    
    for (const [rowOffset, colOffset] of knightMoves) {
      const newRow = kingPos.row + rowOffset;
      const newCol = kingPos.col + colOffset;
      if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
        const piece = testBoard[newRow][newCol].piece;
        if (piece?.type === 'knight' && piece.color === opponentColor) {
          checkingPieces.push({ row: newRow, col: newCol });
        }
      }
    }

    // Check for sliding pieces (bishop, rook, queen)
    const directions = [
      [-1, -1], [-1, 1], [1, -1], [1, 1], // Diagonal (bishop/queen)
      [-1, 0], [1, 0], [0, -1], [0, 1]    // Straight (rook/queen)
    ];

    for (const [rowDir, colDir] of directions) {
      let newRow = kingPos.row + rowDir;
      let newCol = kingPos.col + colDir;
      while (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
        const piece = testBoard[newRow][newCol].piece;
        if (piece) {
          if (piece.color === opponentColor) {
            const isDiagonal = Math.abs(rowDir) === Math.abs(colDir);
            if ((isDiagonal && (piece.type === 'bishop' || piece.type === 'queen')) ||
                (!isDiagonal && (piece.type === 'rook' || piece.type === 'queen'))) {
              checkingPieces.push({ row: newRow, col: newCol });
            }
          }
          break; // Stop checking this direction if we hit any piece
        }
        newRow += rowDir;
        newCol += colDir;
      }
    }

    return checkingPieces;
  }

  function canBlockCheck(color: PieceColor, testBoard: Square[][]): boolean {
    const checkingPieces = getCheckingPieces(color, testBoard);
    if (checkingPieces.length === 0) return true;
    
    // If more than one piece is checking the king, the king must move
    if (checkingPieces.length > 1) {
      return canKingEscape(color, testBoard);
    }

    const kingPos = findKingPosition(color, testBoard)!;
    const checkingPiece = checkingPieces[0];
    const checkingPieceType = testBoard[checkingPiece.row][checkingPiece.col].piece!.type;

    // For knight checks or adjacent pawns, we must capture the checking piece or move the king
    if (checkingPieceType === 'knight' || checkingPieceType === 'pawn') {
      return canCaptureCheckingPiece(color, checkingPiece, testBoard) ||
             canKingEscape(color, testBoard);
    }

    // For sliding pieces (bishop, rook, queen), we can also block
    const squares = getSquaresBetween(kingPos, checkingPiece);
    return squares.some(square => canSquareBeCovered(square, color, testBoard)) ||
           canCaptureCheckingPiece(color, checkingPiece, testBoard) ||
           canKingEscape(color, testBoard);
  }

  function getSquaresBetween(from: Position, to: Position): Position[] {
    const squares: Position[] = [];
    const rowDir = Math.sign(to.row - from.row);
    const colDir = Math.sign(to.col - from.col);
    let row = from.row + rowDir;
    let col = from.col + colDir;

    while (row !== to.row || col !== to.col) {
      squares.push({ row, col });
      row += rowDir;
      col += colDir;
    }

    return squares;
  }

  function canSquareBeCovered(pos: Position, byColor: PieceColor, testBoard: Square[][]): boolean {
    // Check if any piece of our color can move to this square
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = testBoard[row][col].piece;
        if (piece && piece.color === byColor) {
          const moves = getPieceMoves({ row, col }, piece, testBoard);
          if (moves.some(move => move.row === pos.row && move.col === pos.col)) {
            // Verify the move doesn't leave or put the king in check
            const boardCopy = testBoard.map(row => row.map(square => ({ ...square })));
            boardCopy[pos.row][pos.col].piece = boardCopy[row][col].piece;
            boardCopy[row][col].piece = null;
            if (!isKingInCheck(byColor, boardCopy)) {
              return true;
            }
          }
        }
      }
    }
    return false;
  }

  function canCaptureCheckingPiece(color: PieceColor, checkingPiecePos: Position, testBoard: Square[][]): boolean {
    return canSquareBeCovered(checkingPiecePos, color, testBoard);
  }

  function canKingEscape(color: PieceColor, testBoard: Square[][]): boolean {
    const kingPos = findKingPosition(color, testBoard)!;
    const king = testBoard[kingPos.row][kingPos.col].piece!;
    const moves = getPieceMoves(kingPos, king, testBoard);

    return moves.some(move => {
      const boardCopy = testBoard.map(row => row.map(square => ({ ...square })));
      boardCopy[move.row][move.col].piece = king;
      boardCopy[kingPos.row][kingPos.col].piece = null;
      return !isSquareUnderAttack(move, color === 'white' ? 'black' : 'white', boardCopy);
    });
  }

  function isCheckmate(color: PieceColor, testBoard: Square[][]): boolean {
    // First, verify that the king is in check
    if (!isKingInCheck(color, testBoard)) {
      return false;
    }

    // Then check if any move can get out of check
    return !canBlockCheck(color, testBoard);
  }

  function handlePawnPromotion(pos: Position): boolean {
    const piece = board[pos.row][pos.col].piece;
    if (!piece || piece.type !== 'pawn') return false;

    // Check if pawn has reached the promotion rank
    const isPromotionRow = (piece.color === 'white' && pos.row === 0) ||
                          (piece.color === 'black' && pos.row === 7);

    if (isPromotionRow) {
      // Calculate dialog position
      if (boardRef.current) {
        const square = boardRef.current.querySelector(`[data-position="${pos.row}-${pos.col}"]`);
        if (square) {
          const rect = square.getBoundingClientRect();
          const boardRect = boardRef.current.getBoundingClientRect();
          
          // Calculate position relative to the board
          const x = rect.left - boardRect.left + (rect.width / 2);
          const y = rect.top - boardRect.top + (rect.height / 2);
          
          setPromotionState({
            position: pos,
            dialogPosition: { x, y }
          });
          return true;
        }
      }
    }
    return false;
  }

  function handlePromotion(pieceType: 'queen' | 'rook' | 'bishop' | 'knight') {
    if (!promotionState || !boardState.lastMove) return;

    const newBoard = board.map(row => row.map(square => ({ ...square })));
    const piece = newBoard[promotionState.position.row][promotionState.position.col].piece!;
    
    // Create the promoted piece
    newBoard[promotionState.position.row][promotionState.position.col].piece = {
      type: pieceType,
      color: piece.color
    };

    // Check if this promotion puts the opponent in check/checkmate
    const opponentColor = piece.color === 'white' ? 'black' : 'white';
    const isCheck = isKingInCheck(opponentColor, newBoard);
    const wouldBeCheckmate = isCheck && isCheckmate(opponentColor, newBoard);

    // Create move notation for the promotion
    const move = {
      piece: PIECE_SYMBOLS[pieceType][piece.color],
      from: getSquareNotation(boardState.lastMove.from.row, boardState.lastMove.from.col),
      to: getSquareNotation(promotionState.position.row, promotionState.position.col),
      capture: boardState.lastMove.piece.type === 'pawn' && 
              boardState.lastMove.from.col !== promotionState.position.col,
      check: isCheck,
      checkmate: wouldBeCheckmate
    };

    setPromotionState(null);
    onMove(move, newBoard);
  }

  function handleSquareClick(row: number, col: number) {
    if (gameStatus === 'checkmate' || promotionState) return;

    if (!selectedPiece) {
      const piece = board[row][col].piece;
      if (piece && piece.color === currentPlayer) {
        setSelectedPiece({ row, col });
        setValidMoves(getValidMoves({ row, col }, board));
      }
    } else {
      const isValidMove = validMoves.some(
        move => move.row === row && move.col === col
      );

      if (isValidMove) {
        const newBoard = board.map(row => row.map(square => ({ ...square })));
        const movingPiece = newBoard[selectedPiece.row][selectedPiece.col].piece!;
        const targetPiece = newBoard[row][col].piece;
        const isCapture = !!targetPiece || (movingPiece.type === 'pawn' && col !== selectedPiece.col);
        
        // Handle castling
        if (movingPiece.type === 'king' && Math.abs(col - selectedPiece.col) === 2) {
          const rookCol = col > selectedPiece.col ? 7 : 0;
          const newRookCol = col > selectedPiece.col ? col - 1 : col + 1;
          newBoard[row][newRookCol].piece = newBoard[row][rookCol].piece;
          newBoard[row][rookCol].piece = null;
        }

        // Handle en passant capture
        if (movingPiece.type === 'pawn' && col !== selectedPiece.col && !targetPiece) {
          const capturedPawnRow = selectedPiece.row;
          newBoard[capturedPawnRow][col].piece = null;
        }

        // Make the move
        newBoard[row][col].piece = movingPiece;
        newBoard[selectedPiece.row][selectedPiece.col].piece = null;

        // Update last move
        setLastMove({
          from: { row: selectedPiece.row, col: selectedPiece.col },
          to: { row, col }
        });

        // Set en passant flag
        const newBoardState: ChessBoardState = {
          lastMove: {
            piece: movingPiece,
            from: { ...selectedPiece },
            to: { row, col }
          },
          canEnPassant: null
        };

        if (movingPiece.type === 'pawn' && Math.abs(row - selectedPiece.row) === 2) {
          newBoardState.canEnPassant = { row: row, col: col };
        }

        // Update the board state immediately for visual feedback
        setBoard(newBoard);
        setBoardState(newBoardState);

        // Check for pawn promotion
        if (movingPiece.type === 'pawn') {
          // Check if pawn has reached the promotion rank (first or last rank)
          const isPromotionRank = (movingPiece.color === 'white' && row === 0) || 
                                 (movingPiece.color === 'black' && row === 7);
          
          if (isPromotionRank) {
            // Show promotion dialog and wait for selection
        const needsPromotion = handlePawnPromotion({ row, col });
            if (needsPromotion) {
              return; // Wait for promotion selection before completing the move
            }
          }
        }

        // If no promotion needed, complete the move
          const opponentColor = currentPlayer === 'white' ? 'black' : 'white';
          const isCheck = isKingInCheck(opponentColor, newBoard);
          const wouldBeCheckmate = isCheck && isCheckmate(opponentColor, newBoard);

          // Create move notation
          const move = {
            piece: PIECE_SYMBOLS[movingPiece.type][movingPiece.color],
            from: getSquareNotation(selectedPiece.row, selectedPiece.col),
            to: getSquareNotation(row, col),
          capture: isCapture,
            check: isCheck,
            checkmate: wouldBeCheckmate
          };

          onMove(move, newBoard);
      }

      setSelectedPiece(null);
      setValidMoves([]);
    }
  }

  function getValidMoves(pos: Position, testBoard: Square[][], isCheckTest: boolean = false): Position[] {
    const piece = testBoard[pos.row][pos.col].piece;
    if (!piece || (piece.color !== currentPlayer && !isCheckTest)) return [];

    // Get basic moves for the piece
    let moves = getPieceMoves(pos, piece, testBoard);

    // Add special moves if not in check test
    if (!isCheckTest) {
      // Add castling moves for king
      if (piece.type === 'king' && !isKingInCheck(piece.color, testBoard)) {
        // Kingside castling
        if (isValidCastling(pos, { row: pos.row, col: 7 }, piece.color)) {
          moves.push({ row: pos.row, col: pos.col + 2 });
        }
        // Queenside castling
        if (isValidCastling(pos, { row: pos.row, col: 0 }, piece.color)) {
          moves.push({ row: pos.row, col: pos.col - 2 });
        }
      }

      // Add en passant moves for pawns
      if (piece.type === 'pawn' && boardState.canEnPassant) {
        const enPassantRow = piece.color === 'white' ? 3 : 4;
        if (pos.row === enPassantRow) {
          [-1, 1].forEach(offset => {
            if (pos.col + offset === boardState.canEnPassant?.col) {
              moves.push({ 
                row: pos.row + (piece.color === 'white' ? -1 : 1), 
                col: pos.col + offset 
              });
            }
          });
        }
      }
    }

    // Filter out moves that would put or leave the king in check
    if (!isCheckTest) {
      moves = moves.filter(move => {
        const boardCopy = testBoard.map(row => row.map(square => ({ ...square })));
        boardCopy[move.row][move.col].piece = boardCopy[pos.row][pos.col].piece;
        boardCopy[pos.row][pos.col].piece = null;
        return !isKingInCheck(piece.color, boardCopy);
      });
    }

    return moves;
  }

  return (
    <div className="chess-board" ref={boardRef}>
      {board.map((row, i) => (
        <div key={i} className="board-row">
          {row.map((square, j) => {
            const isLastMoveFrom = lastMove?.from.row === i && lastMove?.from.col === j;
            const isLastMoveTo = lastMove?.to.row === i && lastMove?.to.col === j;
            const isCheck = square.piece?.type === 'king' && 
                          square.piece.color === currentPlayer && 
                          gameStatus === 'check';

            return (
            <div
              key={`${i}-${j}`}
              className={`square ${square.color} ${
                selectedPiece?.row === i && selectedPiece?.col === j ? 'selected' : ''
              } ${
                validMoves.some(move => move.row === i && move.col === j) ? 'valid-move' : ''
                } ${
                  isLastMoveFrom || isLastMoveTo ? 'last-move' : ''
                } ${
                  isCheck ? 'check' : ''
              }`}
              data-position={`${i}-${j}`}
                data-file={i === 7 ? FILES[j] : ''}
                data-rank={j === 0 ? RANKS[i] : ''}
              onClick={() => handleSquareClick(i, j)}
            >
                {square.piece && (
                  <div className={`piece ${isLastMoveTo ? 'piece-moving' : ''}`}>
                    {PIECE_SYMBOLS[square.piece.type][square.piece.color]}
            </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
      {promotionState && (
        <PromotionDialog
          color={board[promotionState.position.row][promotionState.position.col].piece!.color}
          position={promotionState.dialogPosition}
          onSelect={handlePromotion}
        />
      )}

      {gameStatus === 'checkmate' && (
        <CheckmatePopup
          winner={currentPlayer === 'white' ? 'black' : 'white'}
          onNewGame={onNewGame}
        />
      )}
    </div>
  );
};

export default ChessBoard; 