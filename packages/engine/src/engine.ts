import { randomBytes, randomUUID } from 'node:crypto';
import { FIVE_WINDOWS, cellKey, faceAt, isCorner, isInside, matchingCells, sameCell } from './board.js';
import type { CardFace, CardInstance, Cell, EngineResult, LegalAction, RoundState, Seat, SequenceRecord, Suit, Team } from './types.js';

const SUITS: Suit[] = ['S','H','D','C'];
const RANKS = ['A','2','3','4','5','6','7','8','9','T','J','Q','K'] as const;
const TWO_EYED = new Set<CardFace>(['JC','JD']);
const ONE_EYED = new Set<CardFace>(['JH','JS']);

export function createDeck(): CardInstance[] {
  return [0,1].flatMap(deck => SUITS.flatMap(suit => RANKS.map(rank => ({ id: `d${deck}-${rank}${suit}`, face: `${rank}${suit}` as CardFace }))));
}

export function shuffle<T>(items: readonly T[], random = () => randomBytes(4).readUInt32BE() / 0x1_0000_0000): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [copy[i], copy[j]] = [copy[j], copy[i]]; }
  return copy;
}

export function handSize(playerCount: number): number {
  if (playerCount === 2) return 7;
  if (playerCount === 3 || playerCount === 4) return 6;
  if (playerCount === 6) return 5;
  if (playerCount === 8 || playerCount === 9) return 4;
  if (playerCount === 10 || playerCount === 12) return 3;
  throw new Error(`Unsupported player count ${playerCount}`);
}

export function createRound(teams: Team[], seats: Seat[], random = Math.random, roundId: string = randomUUID()): RoundState {
  if (![2,3].includes(teams.length)) throw new Error('Two or three teams required');
  const sizes = teams.map(t => t.seatIds.length);
  if (!sizes[0] || !sizes.every(size => size === sizes[0])) throw new Error('Teams must be balanced');
  if (seats.length !== sizes.reduce((a,b) => a + b, 0)) throw new Error('Seat count mismatch');
  const deal = handSize(seats.length);
  const teamTurnOrder = teams.map(t => t.id);
  const turnOrder = Array.from({ length: sizes[0] }, (_, index) => teamTurnOrder.map(teamId => teams.find(t => t.id === teamId)!.seatIds[index])).flat();
  const deck = shuffle(createDeck(), random);
  const hands: Record<string, CardInstance[]> = Object.fromEntries(seats.map(s => [s.id, []]));
  for (let n = 0; n < deal; n++) for (const seatId of turnOrder) hands[seatId].push(deck.pop()!);
  const dealerSeatIndex = Math.floor(random() * seats.length);
  return { id: roundId, version: 1, teams: structuredClone(teams), seats: structuredClone(seats), turnOrder, currentSeatIndex: (dealerSeatIndex + 1) % seats.length, dealerSeatIndex, turn: 1, chips: Array.from({length:10},()=>Array(10).fill(null)), hands, drawPile: deck, discards: [], sequences: [], exchangeUsed: false, consecutivePasses: 0, lastMove: null, result: null };
}

export const currentSeatId = (state: RoundState) => state.currentSeatIndex === null ? null : state.turnOrder[state.currentSeatIndex];
const teamOf = (state: RoundState, seatId: string) => state.seats.find(s => s.id === seatId)?.teamId;
const protectedKeys = (state: RoundState) => new Set(state.sequences.flatMap(s => s.cells.filter(c => !isCorner(c)).map(cellKey)));
const openCells = (state: RoundState) => {
  const result: Cell[] = [];
  for(let row=0;row<10;row++)for(let col=0;col<10;col++)if(!isCorner({row,col})&&!state.chips[row][col])result.push({row,col});
  return result;
};

export function legalActions(state: RoundState, seatId: string): LegalAction[] {
  if (state.result || currentSeatId(state) !== seatId) return [];
  const teamId = teamOf(state, seatId)!;
  const protectedSet = protectedKeys(state);
  return state.hands[seatId].map(card => {
    if (TWO_EYED.has(card.face)) return { cardId: card.id, face: card.face, kind: 'place' as const, cells: openCells(state), dead: false };
    if (ONE_EYED.has(card.face)) {
      const cells: Cell[]=[]; for(let row=0;row<10;row++)for(let col=0;col<10;col++)if(state.chips[row][col]&&state.chips[row][col]!==teamId&&!protectedSet.has(`${row},${col}`))cells.push({row,col});
      return { cardId: card.id, face: card.face, kind: 'remove' as const, cells, dead: false };
    }
    const cells = matchingCells(card.face).filter(c => !state.chips[c.row][c.col]);
    return { cardId: card.id, face: card.face, kind: 'place' as const, cells, dead: cells.length === 0 };
  });
}

export const isDeadCard = (state: RoundState, seatId: string, cardId: string) => legalActions(state, seatId).find(a => a.cardId === cardId)?.dead === true;

function windowKey(cells: readonly Cell[]) { return cells.map(c => String(c.row*10+c.col).padStart(2,'0')).sort().join('-'); }
function intersection(a: readonly Cell[], b: readonly Cell[]) { return a.filter(x => b.some(y => sameCell(x,y))).length; }

export function findNewSequences(state: RoundState, teamId: string, lastCell: Cell): SequenceRecord[] {
  const existingKeys = new Set(state.sequences.filter(s=>s.teamId===teamId).map(s=>windowKey(s.cells)));
  const candidates = FIVE_WINDOWS.filter(w => w.some(c=>sameCell(c,lastCell)))
    .filter(w => w.every(c => isCorner(c) || state.chips[c.row][c.col] === teamId))
    .filter(w => !existingKeys.has(windowKey(w)))
    .filter(w => state.sequences.filter(s=>s.teamId===teamId).every(s => intersection(w,s.cells)<=1))
    .map(cells => [...cells]);
  const sets: Cell[][][] = candidates.map(c=>[c]);
  for(let i=0;i<candidates.length;i++)for(let j=i+1;j<candidates.length;j++)if(intersection(candidates[i],candidates[j])<=1)sets.push([candidates[i],candidates[j]]);
  sets.sort((a,b)=>b.length-a.length||a.map(windowKey).sort().join('|').localeCompare(b.map(windowKey).sort().join('|')));
  const needed = Math.max(0,(state.teams.length===2?2:1)-state.sequences.filter(s=>s.teamId===teamId).length);
  return (sets[0]??[]).slice(0,needed).map((cells,i)=>({id:`seq-${state.turn}-${i}-${windowKey(cells)}`,teamId,cells,createdTurn:state.turn}));
}

function draw(state: RoundState, random = Math.random): CardInstance | undefined {
  if (!state.drawPile.length && state.discards.length) { state.drawPile = shuffle(state.discards, random); state.discards = []; }
  return state.drawPile.pop();
}
function advance(state: RoundState) { state.currentSeatIndex = ((state.currentSeatIndex ?? -1) + 1) % state.turnOrder.length; state.turn++; state.exchangeUsed=false; }
function assertTurn(state: RoundState, seatId: string) { if(state.result)throw new Error('ROUND_FINISHED'); if(currentSeatId(state)!==seatId)throw new Error('NOT_YOUR_TURN'); }

export function applyPlay(input: RoundState, seatId: string, cardId: string, cell: Cell, random=Math.random): EngineResult {
  assertTurn(input,seatId); if(!isInside(cell)||isCorner(cell))throw new Error('ILLEGAL_TARGET');
  const action=legalActions(input,seatId).find(a=>a.cardId===cardId); if(!action)throw new Error('CARD_NOT_IN_HAND');
  if(!action.cells.some(c=>sameCell(c,cell)))throw new Error('ILLEGAL_TARGET');
  const state=structuredClone(input); const hand=state.hands[seatId]; const index=hand.findIndex(c=>c.id===cardId); const [card]=hand.splice(index,1); state.discards.push(card);
  const teamId=teamOf(state,seatId)!;
  if(action.kind==='place')state.chips[cell.row][cell.col]=teamId; else state.chips[cell.row][cell.col]=null;
  const sequences=action.kind==='place'?findNewSequences(state,teamId,cell):[]; state.sequences.push(...sequences);
  const replacement=draw(state,random); if(replacement)hand.push(replacement);
  state.lastMove={seatId,teamId,kind:action.kind,cell,cardFace:card.face,turn:state.turn}; state.consecutivePasses=0; state.version++;
  const score=state.sequences.filter(s=>s.teamId===teamId).length; const target=state.teams.length===2?2:1;
  if(score>=target){state.result={winnerTeamId:teamId,reason:'sequences'};state.currentSeatIndex=null;} else advance(state);
  return {state,events:[{type:action.kind,data:{seatId,cell,face:card.face}},...sequences.map(s=>({type:'sequence',data:{id:s.id,teamId}})),...(state.result?[{type:'finished',data:{winnerTeamId:teamId}}]:[])]};
}

export function applyExchange(input: RoundState, seatId: string, cardId: string, random=Math.random): EngineResult {
  assertTurn(input,seatId); if(input.exchangeUsed)throw new Error('EXCHANGE_USED'); if(!isDeadCard(input,seatId,cardId))throw new Error('NOT_DEAD');
  const state=structuredClone(input);const hand=state.hands[seatId];const index=hand.findIndex(c=>c.id===cardId);const [card]=hand.splice(index,1);state.discards.push(card);const replacement=draw(state,random);if(replacement)hand.splice(index,0,replacement);state.exchangeUsed=true;state.version++;
  return {state,events:[{type:'exchange',data:{seatId,face:card.face}}]};
}

export function applyPass(input: RoundState, seatId: string): EngineResult {
  assertTurn(input,seatId);const actions=legalActions(input,seatId);if(actions.some(a=>a.cells.length)||(!input.exchangeUsed&&actions.some(a=>a.dead)))throw new Error('LEGAL_MOVE_AVAILABLE');
  const state=structuredClone(input);state.consecutivePasses++;state.version++;
  if(state.consecutivePasses>=state.turnOrder.length){state.result={winnerTeamId:null,reason:'passes'};state.currentSeatIndex=null;}else advance(state);
  return {state,events:[{type:'pass',data:{seatId}},...(state.result?[{type:'finished',data:{winnerTeamId:null}}]:[])]};
}

export { TWO_EYED, ONE_EYED, faceAt };
