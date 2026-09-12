import { describe, expect, it } from 'vitest';
import { applyExchange, applyPlay, createDeck, createRound, handSize, legalActions } from './engine';
import { BOARD, FIVE_WINDOWS, matchingCells, toDisplay, toLogical } from './board';
import type { Seat, Team } from './types';

const teams:Team[]=[{id:'blue',color:'blue',seatIds:['a']},{id:'red',color:'red',seatIds:['b']}];
const seats:Seat[]=[{id:'a',teamId:'blue',name:'A',avatarId:'1',computer:false},{id:'b',teamId:'red',name:'B',avatarId:'2',computer:false}];
const fixed=()=>0;

describe('board contract',()=>{
  it('contains four free corners and every non-jack face exactly twice',()=>{
    const flat=BOARD.flat();expect(flat.filter(x=>x==='F')).toHaveLength(4);
    for(const card of createDeck().filter((c,i,a)=>c.face[0]!=='J'&&a.findIndex(x=>x.face===c.face)===i))expect(flat.filter(x=>x===card.face)).toHaveLength(2);
  });
  it('round-trips horizontal display coordinates',()=>{for(let row=0;row<10;row++)for(let col=0;col<10;col++)expect(toLogical(toDisplay({row,col}))).toEqual({row,col})});
  it('enumerates all five-cell windows inside the board',()=>{expect(FIVE_WINDOWS).toHaveLength(192);expect(FIVE_WINDOWS.every(w=>w.length===5)).toBe(true)});
});

describe('round rules',()=>{
  it.each([[2,7],[4,6],[6,5],[8,4],[9,4],[10,3],[12,3]])('deals %i players %i cards',(players,size)=>expect(handSize(players)).toBe(size));
  it('deals unique physical cards and alternates team seats',()=>{const state=createRound(teams,seats,fixed,'round');expect(state.turnOrder).toEqual(['a','b']);expect(Object.values(state.hands).flat()).toHaveLength(14);expect(new Set(Object.values(state.hands).flat().map(c=>c.id)).size).toBe(14)});
  it('places a matching card, draws, records the move, and advances',()=>{const state=createRound(teams,seats,fixed,'round');state.currentSeatIndex=0;const target=matchingCells('2S')[0];state.hands.a[0]={id:'play',face:'2S'};const next=applyPlay(state,'a','play',target,fixed).state;expect(next.chips[target.row][target.col]).toBe('blue');expect(next.hands.a).toHaveLength(7);expect(next.lastMove?.cell).toEqual(target);expect(next.currentSeatIndex).toBe(1)});
  it('two-eyed jacks can target every open non-corner cell',()=>{const state=createRound(teams,seats,fixed,'round');state.currentSeatIndex=0;state.hands.a[0]={id:'wild',face:'JC'};const action=legalActions(state,'a').find(a=>a.cardId==='wild');expect(action?.kind).toBe('place');expect(action?.cells).toHaveLength(96)});
  it('one-eyed jacks remove opponents but not protected chips',()=>{const state=createRound(teams,seats,fixed,'round');state.currentSeatIndex=0;state.hands.a[0]={id:'remove',face:'JH'};state.chips[1][1]='red';state.chips[2][2]='red';state.sequences=[{id:'s',teamId:'red',createdTurn:1,cells:[{row:0,col:0},{row:1,col:1},{row:2,col:2},{row:3,col:3},{row:4,col:4}]}];const cells=legalActions(state,'a').find(a=>a.cardId==='remove')!.cells;expect(cells).not.toContainEqual({row:1,col:1});expect(cells).not.toContainEqual({row:2,col:2})});
  it('records which team lost a chip so a removal cannot look like vanished state',()=>{const state=createRound(teams,seats,fixed,'round');state.currentSeatIndex=0;state.hands.a[0]={id:'remove',face:'JH'};state.chips[1][2]='red';const next=applyPlay(state,'a','remove',{row:1,col:2},fixed).state;expect(next.chips[1][2]).toBeNull();expect(next.lastMove).toMatchObject({kind:'remove',removedTeamId:'red',cell:{row:1,col:2}})});
  it('exchanges a dead card without ending the turn',()=>{const state=createRound(teams,seats,fixed,'round');state.currentSeatIndex=0;const face='2S';for(const c of matchingCells(face))state.chips[c.row][c.col]='red';state.hands.a[0]={id:'dead',face};const next=applyExchange(state,'a','dead',fixed).state;expect(next.currentSeatIndex).toBe(0);expect(next.exchangeUsed).toBe(true);expect(next.hands.a).toHaveLength(7)});
  it('detects and stores a completed sequence',()=>{const state=createRound(teams,seats,fixed,'round');state.currentSeatIndex=0;state.hands.a[0]={id:'wild',face:'JC'};for(let col=1;col<5;col++)state.chips[1][col]='blue';const next=applyPlay(state,'a','wild',{row:1,col:5},fixed).state;expect(next.sequences).toHaveLength(1);expect(next.sequences[0].cells).toHaveLength(5)});
});
