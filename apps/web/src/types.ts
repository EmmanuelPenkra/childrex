import type { CardInstance, Cell, LastMove, LegalAction, SequenceRecord, Team, Seat } from '../../../packages/engine/src/types';

export interface Member { seatId:string; name:string; avatarId:string; connected:boolean; joinedAt:number; isYou:boolean }
export interface RoomLookup { found:boolean; joinable?:boolean; count?:number; expired?:boolean }
export interface RoomSnapshot {
  id:string; code:string; version:number; phase:'lobby'|'playing'|'finished'; isHost:boolean;
  teams:Team[]; seats:Seat[]; members:Member[]; yourSeatId:string|null;
  yourHand:CardInstance[]; yourActions:LegalAction[];
  round:null|{id:string;version:number;turn:number;turnOrder:string[];currentSeatId:string|null;chips:(string|null)[][];sequences:SequenceRecord[];lastMove:LastMove|null;result:null|{winnerTeamId:string|null;reason:string};exchangeUsed:boolean;handCounts:Record<string,number>};
}
export type Command = Record<string,unknown> & {type:string};
export type Selected = { cardId:string; cells:Cell[]; kind:'place'|'remove' } | null;
