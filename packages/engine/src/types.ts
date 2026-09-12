export type Suit = 'S' | 'H' | 'D' | 'C';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'T' | 'J' | 'Q' | 'K';
export type CardFace = `${Rank}${Suit}`;
export type TeamColor = 'blue' | 'red' | 'green';
export type Cell = { row: number; col: number };
export type PlayKind = 'place' | 'remove';

export interface CardInstance { id: string; face: CardFace }
export interface Team { id: string; color: TeamColor | null; seatIds: string[] }
export interface Seat {
  id: string;
  teamId: string;
  name: string;
  avatarId: string;
  computer: boolean;
}
export interface SequenceRecord { id: string; teamId: string; cells: Cell[]; createdTurn: number }
export interface LastMove { seatId: string; teamId: string; kind: PlayKind; cell: Cell; cardFace: CardFace; turn: number; removedTeamId?: string }
export interface RoundResult { winnerTeamId: string | null; reason: 'sequences' | 'passes' | 'move-limit' }
export interface RoundState {
  id: string;
  version: number;
  teams: Team[];
  seats: Seat[];
  turnOrder: string[];
  currentSeatIndex: number | null;
  dealerSeatIndex: number;
  turn: number;
  chips: (string | null)[][];
  hands: Record<string, CardInstance[]>;
  drawPile: CardInstance[];
  discards: CardInstance[];
  sequences: SequenceRecord[];
  exchangeUsed: boolean;
  consecutivePasses: number;
  lastMove: LastMove | null;
  result: RoundResult | null;
}
export interface LegalAction { cardId: string; face: CardFace; kind: PlayKind; cells: Cell[]; dead: boolean }
export interface EngineEvent { type: string; data?: Record<string, unknown> }
export interface EngineResult { state: RoundState; events: EngineEvent[] }
