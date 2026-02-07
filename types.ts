
export type PieceColor = 'w' | 'b';
export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';

export interface Piece {
  type: PieceType;
  color: PieceColor;
}

export interface Square {
  file: string;
  rank: number;
  id: string; // e.g., 'a1'
}

export interface Move {
  from: string;
  to: string;
  promotion?: PieceType;
  san?: string;
  piece?: PieceType;
  color?: PieceColor;
  flags?: string;
}

export interface GameState {
  fen: string;
  turn: PieceColor;
  history: Move[];
  isCheck: boolean;
  isCheckmate: boolean;
  isDraw: boolean;
  winner: PieceColor | 'draw' | null;
  captured: {
    w: PieceType[];
    b: PieceType[];
  };
}

export enum SoundType {
  MOVE = 'move',
  CAPTURE = 'capture',
  CHECK = 'check',
  START = 'start',
  END = 'end'
}
