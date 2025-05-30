import { PieceColor } from './Chess';

export interface Position {
  row: number;
  col: number;
}

export interface Piece {
  type: 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn';
  color: PieceColor;
}

export interface Square {
  piece: Piece | null;
  color: PieceColor;
}

const PIECE_VALUES = {
  pawn: 1,
  knight: 3,
  bishop: 3,
  rook: 5,
  queen: 9,
  king: 100
};

// Position evaluation tables for improved piece positioning
const POSITION_VALUES = {
  pawn: [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [5, 5, 5, 5, 5, 5, 5, 5],
    [1, 1, 2, 3, 3, 2, 1, 1],
    [0.5, 0.5, 1, 2.5, 2.5, 1, 0.5, 0.5],
    [0, 0, 0, 2, 2, 0, 0, 0],
    [0.5, -0.5, -1, 0, 0, -1, -0.5, 0.5],
    [0.5, 1, 1, -2, -2, 1, 1, 0.5],
    [0, 0, 0, 0, 0, 0, 0, 0]
  ],
  knight: [
    [-5, -4, -3, -3, -3, -3, -4, -5],
    [-4, -2, 0, 0, 0, 0, -2, -4],
    [-3, 0, 1, 1.5, 1.5, 1, 0, -3],
    [-3, 0.5, 1.5, 2, 2, 1.5, 0.5, -3],
    [-3, 0, 1.5, 2, 2, 1.5, 0, -3],
    [-3, 0.5, 1, 1.5, 1.5, 1, 0.5, -3],
    [-4, -2, 0, 0.5, 0.5, 0, -2, -4],
    [-5, -4, -3, -3, -3, -3, -4, -5]
  ],
  bishop: [
    [-2, -1, -1, -1, -1, -1, -1, -2],
    [-1, 0, 0, 0, 0, 0, 0, -1],
    [-1, 0, 0.5, 1, 1, 0.5, 0, -1],
    [-1, 0.5, 0.5, 1, 1, 0.5, 0.5, -1],
    [-1, 0, 1, 1, 1, 1, 0, -1],
    [-1, 1, 1, 1, 1, 1, 1, -1],
    [-1, 0.5, 0, 0, 0, 0, 0.5, -1],
    [-2, -1, -1, -1, -1, -1, -1, -2]
  ],
  rook: [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0.5, 1, 1, 1, 1, 1, 1, 0.5],
    [-0.5, 0, 0, 0, 0, 0, 0, -0.5],
    [-0.5, 0, 0, 0, 0, 0, 0, -0.5],
    [-0.5, 0, 0, 0, 0, 0, 0, -0.5],
    [-0.5, 0, 0, 0, 0, 0, 0, -0.5],
    [-0.5, 0, 0, 0, 0, 0, 0, -0.5],
    [0, 0, 0, 0.5, 0.5, 0, 0, 0]
  ],
  queen: [
    [-2, -1, -1, -0.5, -0.5, -1, -1, -2],
    [-1, 0, 0, 0, 0, 0, 0, -1],
    [-1, 0, 0.5, 0.5, 0.5, 0.5, 0, -1],
    [-0.5, 0, 0.5, 0.5, 0.5, 0.5, 0, -0.5],
    [0, 0, 0.5, 0.5, 0.5, 0.5, 0, -0.5],
    [-1, 0.5, 0.5, 0.5, 0.5, 0.5, 0, -1],
    [-1, 0, 0.5, 0, 0, 0, 0, -1],
    [-2, -1, -1, -0.5, -0.5, -1, -1, -2]
  ],
  king: [
    [-3, -4, -4, -5, -5, -4, -4, -3],
    [-3, -4, -4, -5, -5, -4, -4, -3],
    [-3, -4, -4, -5, -5, -4, -4, -3],
    [-3, -4, -4, -5, -5, -4, -4, -3],
    [-2, -3, -3, -4, -4, -3, -3, -2],
    [-1, -2, -2, -2, -2, -2, -2, -1],
    [2, 2, 0, 0, 0, 0, 2, 2],
    [2, 3, 1, 0, 0, 1, 3, 2]
  ]
};

export class ComputerPlayer {
  private getValidMoves(pos: Position, piece: Piece, board: Square[][]): Position[] {
    const moves: Position[] = [];
    const directions: { [key: string]: [number, number][] } = {
      pawn: piece.color === 'white' ? [[-1, 0]] : [[1, 0]],
      knight: [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]],
      bishop: [[-1, -1], [-1, 1], [1, -1], [1, 1]],
      rook: [[-1, 0], [1, 0], [0, -1], [0, 1]],
      queen: [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]],
      king: [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]]
    };

    const isSlidingPiece = ['bishop', 'rook', 'queen'].includes(piece.type);

    // Special pawn moves
    if (piece.type === 'pawn') {
      const direction = piece.color === 'white' ? -1 : 1;
      const startRow = piece.color === 'white' ? 6 : 1;

      // Forward move
      if (this.isValidPosition(pos.row + direction, pos.col) && 
          !board[pos.row + direction][pos.col].piece) {
        moves.push({ row: pos.row + direction, col: pos.col });

        // Initial two-square move
        if (pos.row === startRow && !board[pos.row + direction * 2][pos.col].piece) {
          moves.push({ row: pos.row + direction * 2, col: pos.col });
        }
      }

      // Captures
      [-1, 1].forEach(offset => {
        const newRow = pos.row + direction;
        const newCol = pos.col + offset;
        if (this.isValidPosition(newRow, newCol)) {
          const targetPiece = board[newRow][newCol].piece;
          if (targetPiece && targetPiece.color !== piece.color) {
            moves.push({ row: newRow, col: newCol });
          }
        }
      });

      return moves;
    }

    // Handle other pieces
    directions[piece.type].forEach(([rowDir, colDir]) => {
      let newRow = pos.row + rowDir;
      let newCol = pos.col + colDir;

      while (this.isValidPosition(newRow, newCol)) {
        const targetSquare = board[newRow][newCol];
        if (!targetSquare.piece) {
          moves.push({ row: newRow, col: newCol });
        } else {
          if (targetSquare.piece.color !== piece.color) {
            moves.push({ row: newRow, col: newCol });
          }
          break;
        }

        if (!isSlidingPiece) break;
        newRow += rowDir;
        newCol += colDir;
      }
    });

    return moves;
  }

  private isValidPosition(row: number, col: number): boolean {
    return row >= 0 && row < 8 && col >= 0 && col < 8;
  }

  private evaluatePosition(board: Square[][]): number {
    let score = 0;

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col].piece;
        if (piece) {
          const baseValue = PIECE_VALUES[piece.type];
          const positionValue = POSITION_VALUES[piece.type][piece.color === 'white' ? row : 7 - row][col];
          const value = baseValue + positionValue;
          score += piece.color === 'black' ? value : -value;
        }
      }
    }

    return score;
  }

  private minimax(
    board: Square[][],
    depth: number,
    alpha: number,
    beta: number,
    isMaximizing: boolean
  ): { score: number; move?: { from: Position; to: Position } } {
    if (depth === 0) {
      return { score: this.evaluatePosition(board) };
    }

    const moves: { from: Position; to: Position }[] = [];
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col].piece;
        if (piece && piece.color === (isMaximizing ? 'black' : 'white')) {
          const validMoves = this.getValidMoves({ row, col }, piece, board);
          validMoves.forEach(to => {
            moves.push({ from: { row, col }, to });
          });
        }
      }
    }

    if (isMaximizing) {
      let maxScore = -Infinity;
      let bestMove;

      for (const move of moves) {
        const newBoard = this.makeMove(board, move);
        const evaluation = this.minimax(newBoard, depth - 1, alpha, beta, false);
        
        if (evaluation.score > maxScore) {
          maxScore = evaluation.score;
          bestMove = move;
        }
        alpha = Math.max(alpha, evaluation.score);
        if (beta <= alpha) break;
      }

      return { score: maxScore, move: bestMove };
    } else {
      let minScore = Infinity;
      let bestMove;

      for (const move of moves) {
        const newBoard = this.makeMove(board, move);
        const evaluation = this.minimax(newBoard, depth - 1, alpha, beta, true);
        
        if (evaluation.score < minScore) {
          minScore = evaluation.score;
          bestMove = move;
        }
        beta = Math.min(beta, evaluation.score);
        if (beta <= alpha) break;
      }

      return { score: minScore, move: bestMove };
    }
  }

  private makeMove(board: Square[][], move: { from: Position; to: Position }): Square[][] {
    const newBoard = board.map(row => row.map(square => ({ ...square })));
    newBoard[move.to.row][move.to.col].piece = newBoard[move.from.row][move.from.col].piece;
    newBoard[move.from.row][move.from.col].piece = null;
    return newBoard;
  }

  getBestMove(board: Square[][]): { from: Position; to: Position } | null {
    const result = this.minimax(board, 3, -Infinity, Infinity, true);
    return result.move || null;
  }
} 