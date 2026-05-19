// Full chess engine with complete rules, AI, and game-state management

export type PieceType = 'K' | 'Q' | 'R' | 'B' | 'N' | 'P';
export type Color = 'w' | 'b';

export interface Piece {
  type: PieceType;
  color: Color;
}

export type Square = Piece | null;
export type Board = Square[][];

export interface Move {
  from: [number, number];
  to: [number, number];
  promotion?: PieceType;
  captured?: Piece;
  isCastle?: 'kingside' | 'queenside';
  isEnPassant?: boolean;
  isPromotion?: boolean;
  notation?: string;
}

export type GameEndReason =
  | 'checkmate'
  | 'stalemate'
  | 'insufficient-material'
  | 'threefold-repetition'
  | 'fifty-move-rule'
  | 'resign'
  | 'draw-agreement';

export interface GameState {
  board: Board;
  turn: Color;
  castlingRights: { w: { k: boolean; q: boolean }; b: { k: boolean; q: boolean } };
  enPassantTarget: [number, number] | null;
  halfMoveClock: number;
  fullMoveNumber: number;
  moveHistory: Move[];
  positionHistory: string[];
  status: 'playing' | 'ended';
  winner: Color | 'draw' | null;
  endReason: GameEndReason | null;
  inCheck: boolean;
  capturedPieces: { w: Piece[]; b: Piece[] };
}

export type AiLevel = 'beginner' | 'easy' | 'medium' | 'hard' | 'expert';

// Piece values
const PIECE_VALUE: Record<PieceType, number> = {
  K: 20000,
  Q: 900,
  R: 500,
  B: 330,
  N: 320,
  P: 100,
};

// Position tables (from white's perspective, row 0 = rank 8)
const PAWN_TABLE = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [50, 50, 50, 50, 50, 50, 50, 50],
  [10, 10, 20, 30, 30, 20, 10, 10],
  [5, 5, 10, 25, 25, 10, 5, 5],
  [0, 0, 0, 20, 20, 0, 0, 0],
  [5, -5, -10, 0, 0, -10, -5, 5],
  [5, 10, 10, -20, -20, 10, 10, 5],
  [0, 0, 0, 0, 0, 0, 0, 0],
];

const KNIGHT_TABLE = [
  [-50, -40, -30, -30, -30, -30, -40, -50],
  [-40, -20, 0, 0, 0, 0, -20, -40],
  [-30, 0, 10, 15, 15, 10, 0, -30],
  [-30, 5, 15, 20, 20, 15, 5, -30],
  [-30, 0, 15, 20, 20, 15, 0, -30],
  [-30, 5, 10, 15, 15, 10, 5, -30],
  [-40, -20, 0, 5, 5, 0, -20, -40],
  [-50, -40, -30, -30, -30, -30, -40, -50],
];

const BISHOP_TABLE = [
  [-20, -10, -10, -10, -10, -10, -10, -20],
  [-10, 0, 0, 0, 0, 0, 0, -10],
  [-10, 0, 5, 10, 10, 5, 0, -10],
  [-10, 5, 5, 10, 10, 5, 5, -10],
  [-10, 0, 10, 10, 10, 10, 0, -10],
  [-10, 10, 10, 10, 10, 10, 10, -10],
  [-10, 5, 0, 0, 0, 0, 5, -10],
  [-20, -10, -10, -10, -10, -10, -10, -20],
];

const ROOK_TABLE = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [5, 10, 10, 10, 10, 10, 10, 5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [0, 0, 0, 5, 5, 0, 0, 0],
];

const QUEEN_TABLE = [
  [-20, -10, -10, -5, -5, -10, -10, -20],
  [-10, 0, 0, 0, 0, 0, 0, -10],
  [-10, 0, 5, 5, 5, 5, 0, -10],
  [-5, 0, 5, 5, 5, 5, 0, -5],
  [0, 0, 5, 5, 5, 5, 0, -5],
  [-10, 5, 5, 5, 5, 5, 0, -10],
  [-10, 0, 5, 0, 0, 0, 0, -10],
  [-20, -10, -10, -5, -5, -10, -10, -20],
];

const KING_MIDDLE_TABLE = [
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-20, -30, -30, -40, -40, -30, -30, -20],
  [-10, -20, -20, -20, -20, -20, -20, -10],
  [20, 20, 0, 0, 0, 0, 20, 20],
  [20, 30, 10, 0, 0, 10, 30, 20],
];

function getPositionBonus(type: PieceType, color: Color, row: number, col: number): number {
  const r = color === 'w' ? row : 7 - row;
  switch (type) {
    case 'P': return PAWN_TABLE[r][col];
    case 'N': return KNIGHT_TABLE[r][col];
    case 'B': return BISHOP_TABLE[r][col];
    case 'R': return ROOK_TABLE[r][col];
    case 'Q': return QUEEN_TABLE[r][col];
    case 'K': return KING_MIDDLE_TABLE[r][col];
  }
}

function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

export function initBoard(): Board {
  const board: Board = Array.from({ length: 8 }, () => Array(8).fill(null));
  const backRank: PieceType[] = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'];
  for (let c = 0; c < 8; c++) {
    board[0][c] = { type: backRank[c], color: 'b' };
    board[1][c] = { type: 'P', color: 'b' };
    board[6][c] = { type: 'P', color: 'w' };
    board[7][c] = { type: backRank[c], color: 'w' };
  }
  return board;
}

export function createInitialState(): GameState {
  const board = initBoard();
  return {
    board,
    turn: 'w',
    castlingRights: { w: { k: true, q: true }, b: { k: true, q: true } },
    enPassantTarget: null,
    halfMoveClock: 0,
    fullMoveNumber: 1,
    moveHistory: [],
    positionHistory: [boardToFen(board, 'w', { w: { k: true, q: true }, b: { k: true, q: true } }, null)],
    status: 'playing',
    winner: null,
    endReason: null,
    inCheck: false,
    capturedPieces: { w: [], b: [] },
  };
}

export function boardToFen(
  board: Board,
  turn: Color,
  castling: GameState['castlingRights'],
  ep: [number, number] | null
): string {
  let fen = '';
  for (let r = 0; r < 8; r++) {
    let empty = 0;
    for (let c = 0; c < 8; c++) {
      const sq = board[r][c];
      if (!sq) { empty++; } else {
        if (empty) { fen += empty; empty = 0; }
        const ch = sq.type === 'N' ? 'N' : sq.type;
        fen += sq.color === 'w' ? ch.toUpperCase() : ch.toLowerCase();
      }
    }
    if (empty) fen += empty;
    if (r < 7) fen += '/';
  }
  fen += ` ${turn}`;
  const cstr = (castling.w.k ? 'K' : '') + (castling.w.q ? 'Q' : '') +
    (castling.b.k ? 'k' : '') + (castling.b.q ? 'q' : '') || '-';
  fen += ` ${cstr}`;
  fen += ep ? ` ${String.fromCharCode(97 + ep[1])}${8 - ep[0]}` : ' -';
  return fen;
}

// Generate pseudo-legal moves for a piece (ignoring check)
function pieceMoves(board: Board, row: number, col: number, state: GameState): Move[] {
  const piece = board[row][col];
  if (!piece) return [];
  const { color, type } = piece;
  const moves: Move[] = [];
  const enemy = color === 'w' ? 'b' : 'w';

  const addMove = (tr: number, tc: number, extra: Partial<Move> = {}) => {
    if (!inBounds(tr, tc)) return;
    const target = board[tr][tc];
    if (target && target.color === color) return;
    moves.push({ from: [row, col], to: [tr, tc], captured: target || undefined, ...extra });
  };

  const slide = (dirs: [number, number][]) => {
    for (const [dr, dc] of dirs) {
      let r = row + dr, c = col + dc;
      while (inBounds(r, c)) {
        const target = board[r][c];
        if (target) {
          if (target.color === enemy) addMove(r, c);
          break;
        }
        addMove(r, c);
        r += dr; c += dc;
      }
    }
  };

  switch (type) {
    case 'P': {
      const dir = color === 'w' ? -1 : 1;
      const startRow = color === 'w' ? 6 : 1;
      const promRow = color === 'w' ? 0 : 7;
      // Forward
      if (inBounds(row + dir, col) && !board[row + dir][col]) {
        const isPromo = row + dir === promRow;
        if (isPromo) {
          for (const p of ['Q', 'R', 'B', 'N'] as PieceType[])
            moves.push({ from: [row, col], to: [row + dir, col], promotion: p, isPromotion: true });
        } else {
          addMove(row + dir, col);
          if (row === startRow && !board[row + 2 * dir][col])
            addMove(row + 2 * dir, col);
        }
      }
      // Captures
      for (const dc of [-1, 1]) {
        const tr = row + dir, tc = col + dc;
        if (!inBounds(tr, tc)) continue;
        const target = board[tr][tc];
        const isPromo = tr === promRow;
        if (target && target.color === enemy) {
          if (isPromo) {
            for (const p of ['Q', 'R', 'B', 'N'] as PieceType[])
              moves.push({ from: [row, col], to: [tr, tc], captured: target, promotion: p, isPromotion: true });
          } else {
            addMove(tr, tc);
          }
        }
        // En passant
        if (state.enPassantTarget && state.enPassantTarget[0] === tr && state.enPassantTarget[1] === tc) {
          const epCapture: Piece = { type: 'P', color: enemy };
          moves.push({ from: [row, col], to: [tr, tc], isEnPassant: true, captured: epCapture });
        }
      }
      break;
    }
    case 'N':
      for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]])
        addMove(row + dr, col + dc);
      break;
    case 'B': slide([[-1,-1],[-1,1],[1,-1],[1,1]]); break;
    case 'R': slide([[-1,0],[1,0],[0,-1],[0,1]]); break;
    case 'Q': slide([[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]]); break;
    case 'K': {
      for (const [dr, dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]])
        addMove(row + dr, col + dc);
      // Castling
      const backR = color === 'w' ? 7 : 0;
      if (row === backR && col === 4) {
        if (state.castlingRights[color].k) {
          if (!board[backR][5] && !board[backR][6]) {
            moves.push({ from: [row, col], to: [backR, 6], isCastle: 'kingside' });
          }
        }
        if (state.castlingRights[color].q) {
          if (!board[backR][1] && !board[backR][2] && !board[backR][3]) {
            moves.push({ from: [row, col], to: [backR, 2], isCastle: 'queenside' });
          }
        }
      }
      break;
    }
  }
  return moves;
}

function findKing(board: Board, color: Color): [number, number] {
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (board[r][c]?.type === 'K' && board[r][c]?.color === color)
        return [r, c];
  return [-1, -1];
}

function isSquareAttacked(board: Board, row: number, col: number, by: Color): boolean {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p || p.color !== by) continue;
      if (p.type === 'K') {
        if (Math.abs(r - row) <= 1 && Math.abs(c - col) <= 1) return true;
        continue;
      }
      const dummyState: GameState = {
        board, turn: by,
        castlingRights: { w: { k: false, q: false }, b: { k: false, q: false } },
        enPassantTarget: null, halfMoveClock: 0, fullMoveNumber: 1,
        moveHistory: [], positionHistory: [], status: 'playing',
        winner: null, endReason: null, inCheck: false,
        capturedPieces: { w: [], b: [] }
      };
      const ms = pieceMoves(board, r, c, dummyState);
      if (ms.some(m => m.to[0] === row && m.to[1] === col)) return true;
    }
  }
  return false;
}

function isInCheck(board: Board, color: Color): boolean {
  const [kr, kc] = findKing(board, color);
  if (kr === -1) return false;
  return isSquareAttacked(board, kr, kc, color === 'w' ? 'b' : 'w');
}

function applyMoveToBoard(board: Board, move: Move, state: GameState): Board {
  const nb = board.map(r => [...r]);
  const piece = nb[move.from[0]][move.from[1]]!;
  nb[move.from[0]][move.from[1]] = null;

  if (move.isCastle === 'kingside') {
    const backR = piece.color === 'w' ? 7 : 0;
    nb[backR][6] = piece;
    nb[backR][5] = nb[backR][7];
    nb[backR][7] = null;
  } else if (move.isCastle === 'queenside') {
    const backR = piece.color === 'w' ? 7 : 0;
    nb[backR][2] = piece;
    nb[backR][3] = nb[backR][0];
    nb[backR][0] = null;
  } else if (move.isEnPassant) {
    nb[move.to[0]][move.to[1]] = piece;
    const captureRow = piece.color === 'w' ? move.to[0] + 1 : move.to[0] - 1;
    nb[captureRow][move.to[1]] = null;
  } else {
    nb[move.to[0]][move.to[1]] = move.promotion
      ? { type: move.promotion, color: piece.color }
      : piece;
  }
  return nb;
}

// Get all legal moves (filters out moves that leave own king in check)
export function getLegalMoves(state: GameState, row: number, col: number): Move[] {
  const piece = state.board[row][col];
  if (!piece || piece.color !== state.turn) return [];
  const pseudo = pieceMoves(state.board, row, col, state);
  return pseudo.filter(move => {
    const nb = applyMoveToBoard(state.board, move, state);
    // Castling through check validation
    if (move.isCastle) {
      const color = piece.color;
      const enemy = color === 'w' ? 'b' : 'w';
      const backR = color === 'w' ? 7 : 0;
      // King cannot be in check, pass through check, or end in check
      if (isSquareAttacked(state.board, backR, 4, enemy)) return false;
      const passCols = move.isCastle === 'kingside' ? [5, 6] : [2, 3];
      for (const c of passCols)
        if (isSquareAttacked(state.board, backR, c, enemy)) return false;
    }
    return !isInCheck(nb, piece.color);
  });
}

export function getAllLegalMoves(state: GameState): Move[] {
  const moves: Move[] = [];
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (state.board[r][c]?.color === state.turn)
        moves.push(...getLegalMoves(state, r, c));
  return moves;
}

function generateNotation(state: GameState, move: Move): string {
  const piece = state.board[move.from[0]][move.from[1]]!;
  const files = 'abcdefgh';
  const toFile = files[move.to[1]];
  const toRank = (8 - move.to[0]).toString();

  if (move.isCastle === 'kingside') return 'O-O';
  if (move.isCastle === 'queenside') return 'O-O-O';

  let notation = '';
  if (piece.type !== 'P') {
    notation += piece.type === 'N' ? 'N' : piece.type;
    // Disambiguation
    const sameType = getAllLegalMoves(state).filter(m => {
      const p = state.board[m.from[0]][m.from[1]];
      return p?.type === piece.type && p?.color === piece.color &&
        (m.from[0] !== move.from[0] || m.from[1] !== move.from[1]) &&
        m.to[0] === move.to[0] && m.to[1] === move.to[1];
    });
    if (sameType.length > 0) {
      if (sameType.every(m => m.from[1] !== move.from[1])) notation += files[move.from[1]];
      else if (sameType.every(m => m.from[0] !== move.from[0])) notation += (8 - move.from[0]);
      else notation += files[move.from[1]] + (8 - move.from[0]);
    }
  }

  if (move.captured || move.isEnPassant) {
    if (piece.type === 'P') notation += files[move.from[1]];
    notation += 'x';
  }

  notation += toFile + toRank;
  if (move.promotion) notation += '=' + move.promotion;
  return notation;
}

export function applyMove(state: GameState, move: Move): GameState {
  const piece = state.board[move.from[0]][move.from[1]]!;
  const newBoard = applyMoveToBoard(state.board, move, state);
  const notation = generateNotation(state, move);

  const newCastling = {
    w: { ...state.castlingRights.w },
    b: { ...state.castlingRights.b },
  };

  if (piece.type === 'K') {
    newCastling[piece.color].k = false;
    newCastling[piece.color].q = false;
  }
  if (piece.type === 'R') {
    const backR = piece.color === 'w' ? 7 : 0;
    if (move.from[0] === backR) {
      if (move.from[1] === 7) newCastling[piece.color].k = false;
      if (move.from[1] === 0) newCastling[piece.color].q = false;
    }
  }
  // Rook captured
  if (move.captured?.type === 'R') {
    const enemy = piece.color === 'w' ? 'b' : 'w';
    const backR = enemy === 'w' ? 7 : 0;
    if (move.to[0] === backR) {
      if (move.to[1] === 7) newCastling[enemy].k = false;
      if (move.to[1] === 0) newCastling[enemy].q = false;
    }
  }

  let newEP: [number, number] | null = null;
  if (piece.type === 'P' && Math.abs(move.to[0] - move.from[0]) === 2) {
    newEP = [(move.from[0] + move.to[0]) / 2, move.from[1]];
  }

  const newTurn: Color = state.turn === 'w' ? 'b' : 'w';
  const newHalf = (piece.type === 'P' || move.captured) ? 0 : state.halfMoveClock + 1;
  const newFull = state.turn === 'b' ? state.fullMoveNumber + 1 : state.fullMoveNumber;

  const newCaptured = { w: [...state.capturedPieces.w], b: [...state.capturedPieces.b] };
  if (move.captured) newCaptured[piece.color].push(move.captured);
  if (move.isEnPassant) newCaptured[piece.color].push({ type: 'P', color: newTurn });

  const newFen = boardToFen(newBoard, newTurn, newCastling, newEP);
  const newPositionHistory = [...state.positionHistory, newFen];
  const newMoveHistory = [...state.moveHistory, { ...move, notation }];

  const newInCheck = isInCheck(newBoard, newTurn);
  const nextState: GameState = {
    board: newBoard,
    turn: newTurn,
    castlingRights: newCastling,
    enPassantTarget: newEP,
    halfMoveClock: newHalf,
    fullMoveNumber: newFull,
    moveHistory: newMoveHistory,
    positionHistory: newPositionHistory,
    status: 'playing',
    winner: null,
    endReason: null,
    inCheck: newInCheck,
    capturedPieces: newCaptured,
  };

  // Check end conditions
  return checkGameEnd(nextState);
}

function checkGameEnd(state: GameState): GameState {
  const legalMoves = getAllLegalMoves(state);

  if (legalMoves.length === 0) {
    if (state.inCheck) {
      const winner = state.turn === 'w' ? 'b' : 'w';
      return { ...state, status: 'ended', winner, endReason: 'checkmate' };
    } else {
      return { ...state, status: 'ended', winner: 'draw', endReason: 'stalemate' };
    }
  }

  // Fifty-move rule
  if (state.halfMoveClock >= 100) {
    return { ...state, status: 'ended', winner: 'draw', endReason: 'fifty-move-rule' };
  }

  // Threefold repetition
  const currentFen = state.positionHistory[state.positionHistory.length - 1];
  const count = state.positionHistory.filter(f => f.split(' ')[0] === currentFen.split(' ')[0]).length;
  if (count >= 3) {
    return { ...state, status: 'ended', winner: 'draw', endReason: 'threefold-repetition' };
  }

  // Insufficient material
  if (isInsufficientMaterial(state.board)) {
    return { ...state, status: 'ended', winner: 'draw', endReason: 'insufficient-material' };
  }

  return state;
}

function isInsufficientMaterial(board: Board): boolean {
  const pieces: Piece[] = [];
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (board[r][c]) pieces.push(board[r][c]!);

  if (pieces.length === 2) return true; // K vs K
  if (pieces.length === 3) {
    const nonKings = pieces.filter(p => p.type !== 'K');
    if (nonKings.length === 1 && (nonKings[0].type === 'B' || nonKings[0].type === 'N')) return true;
  }
  // K+B vs K+B same color bishops
  if (pieces.length === 4) {
    const bishops = pieces.filter(p => p.type === 'B');
    if (bishops.length === 2) {
      let b1r = -1, b1c = -1, b2r = -1, b2c = -1;
      let found = 0;
      for (let r = 0; r < 8; r++)
        for (let c = 0; c < 8; c++)
          if (board[r][c]?.type === 'B') {
            if (found === 0) { b1r = r; b1c = c; }
            else { b2r = r; b2c = c; }
            found++;
          }
      if ((b1r + b1c) % 2 === (b2r + b2c) % 2) return true;
    }
  }
  return false;
}

// --- AI ENGINE ---

const AI_DEPTH: Record<AiLevel, number> = {
  beginner: 1,
  easy: 2,
  medium: 3,
  hard: 4,
  expert: 5,
};

// Time limit in milliseconds for AI to think
const AI_THINK_TIME = 3000; // 3 seconds

// Track when search started and if time is up
let searchStartTime: number;
let isTimeUp: boolean = false;

function evaluateBoard(board: Board): number {
  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p) continue;
      const val = PIECE_VALUE[p.type] + getPositionBonus(p.type, p.color, r, c);
      score += p.color === 'w' ? val : -val;
    }
  }
  return score;
}

function minimax(
  state: GameState,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean
): number {
  // Check time limit every 1000 nodes (performance optimization)
  if (depth % 2 === 0 && Date.now() - searchStartTime > AI_THINK_TIME) {
    isTimeUp = true;
  }
  
  // Early exit if time is up
  if (isTimeUp) {
    return evaluateBoard(state.board);
  }
  if (depth === 0 || state.status === 'ended') {
    if (state.status === 'ended') {
      if (state.winner === 'w') return 100000 + depth;
      if (state.winner === 'b') return -100000 - depth;
      return 0;
    }
    return evaluateBoard(state.board);
  }

  const moves = getAllLegalMoves(state);
  // Order captures first for better pruning
  moves.sort((a, b) => (b.captured ? PIECE_VALUE[b.captured.type] : 0) - (a.captured ? PIECE_VALUE[a.captured.type] : 0));

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      const next = applyMove(state, move);
      const ev = minimax(next, depth - 1, alpha, beta, false);
      maxEval = Math.max(maxEval, ev);
      alpha = Math.max(alpha, ev);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      const next = applyMove(state, move);
      const ev = minimax(next, depth - 1, alpha, beta, true);
      minEval = Math.min(minEval, ev);
      beta = Math.min(beta, ev);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

export function getBestMove(state: GameState, level: AiLevel): Move | null {
  const moves = getAllLegalMoves(state);
  if (moves.length === 0) return null;

  const isAiWhite = state.turn === 'w';

  // Beginner: random moves with occasional blunders
  if (level === 'beginner') {
    const rand = Math.random();
    if (rand < 0.7) {
      return moves[Math.floor(Math.random() * moves.length)];
    }
  }

  // Easy: sometimes picks random move
  if (level === 'easy' && Math.random() < 0.3) {
    return moves[Math.floor(Math.random() * moves.length)];
  }

  // Initialize time tracking for this search
  searchStartTime = Date.now();
  isTimeUp = false;
  
  let bestMove: Move | null = null;
  let bestScore = isAiWhite ? -Infinity : Infinity;

  // Add small randomness for medium to make it human-like
  const randomFactor = level === 'medium' ? 15 : level === 'easy' ? 30 : 0;

  // Iterative deepening with time limit
  const maxDepth = AI_DEPTH[level];
  for (let currentDepth = 1; currentDepth <= maxDepth; currentDepth++) {
    // Reset best score for this depth iteration
    bestScore = isAiWhite ? -Infinity : Infinity;
    
    for (const move of moves) {
      if (isTimeUp) break;
      
      const next = applyMove(state, move);
      const score = minimax(next, currentDepth - 1, -Infinity, Infinity, !isAiWhite)
        + (Math.random() - 0.5) * randomFactor;

      if (isAiWhite ? score > bestScore : score < bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }
    
    // If time is up, use the best move found so far
    if (isTimeUp) break;
  }

  return bestMove;
}

export function squareToAlg(row: number, col: number): string {
  return String.fromCharCode(97 + col) + (8 - row);
}

export function getEndMessage(state: GameState): { title: string; subtitle: string } {
  switch (state.endReason) {
    case 'checkmate':
      return {
        title: state.winner === 'w' ? 'White Wins!' : 'Black Wins!',
        subtitle: 'by Checkmate',
      };
    case 'stalemate':
      return { title: "It's a Draw!", subtitle: 'by Stalemate' };
    case 'insufficient-material':
      return { title: "It's a Draw!", subtitle: 'by Insufficient Material' };
    case 'threefold-repetition':
      return { title: "It's a Draw!", subtitle: 'by Threefold Repetition' };
    case 'fifty-move-rule':
      return { title: "It's a Draw!", subtitle: 'by 50-Move Rule' };
    case 'resign':
      return {
        title: state.winner === 'w' ? 'White Wins!' : state.winner === 'b' ? 'Black Wins!' : "It's a Draw!",
        subtitle: 'by Resignation',
      };
    case 'draw-agreement':
      return { title: "It's a Draw!", subtitle: 'by Agreement' };
    default:
      return { title: 'Game Over', subtitle: '' };
  }
}
