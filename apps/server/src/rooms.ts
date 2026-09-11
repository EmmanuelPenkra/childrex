import { randomInt, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { applyExchange, applyPass, applyPlay, createRound, currentSeatId, legalActions, type RoundState, type Seat, type Team, type TeamColor } from '../../../packages/engine/src/index.js';

export interface Member { guestId: string; seatId: string; name: string; avatarId: string; connected: boolean; joinedAt: number }
export interface Room {
  id: string; code: string; version: number; hostGuestId: string; phase: 'lobby'|'playing'|'finished';
  teams: Team[]; seats: Seat[]; members: Member[]; round: RoundState|null; receipts: Map<string, unknown>;
}

export class RoomStore {
  rooms = new Map<string, Room>();
  byCode = new Map<string,string>();
  guestRoom = new Map<string,string>();
  constructor(private dataFile?:string){if(dataFile&&existsSync(dataFile)){const saved=JSON.parse(readFileSync(dataFile,'utf8')) as Array<Omit<Room,'receipts'>&{receipts:[string,unknown][]}>;for(const raw of saved){const room={...raw,members:raw.members.map(member=>({...member,connected:false})),receipts:new Map(raw.receipts)} as Room;this.rooms.set(room.id,room);this.byCode.set(room.code,room.id);for(const member of room.members)this.guestRoom.set(member.guestId,room.id)}}}
  persist(){if(!this.dataFile)return;mkdirSync(path.dirname(this.dataFile),{recursive:true});const temp=`${this.dataFile}.tmp`;const data=[...this.rooms.values()].map(room=>({...room,receipts:[...room.receipts.entries()]}));writeFileSync(temp,JSON.stringify(data),'utf8');renameSync(temp,this.dataFile)}

  create(guestId:string,name:string,avatarId:string): Room {
    const existing=this.roomForGuest(guestId); if(existing)return existing;
    const id=randomUUID();let code='';
    const start=randomInt(100);for(let n=0;n<100;n++){const candidate=String((start+n)%100).padStart(2,'0');if(!this.byCode.has(candidate)){code=candidate;break;}}
    if(!code)throw new Error('CODES_EXHAUSTED');
    const seatId=randomUUID();
    const teams:Team[]=[{id:'team-blue',color:null,seatIds:[seatId]},{id:'team-red',color:null,seatIds:[]}];
    const seats:Seat[]=[{id:seatId,teamId:'team-blue',name,avatarId,computer:false}];
    const room:Room={id,code,version:1,hostGuestId:guestId,phase:'lobby',teams,seats,members:[{guestId,seatId,name,avatarId,connected:false,joinedAt:Date.now()}],round:null,receipts:new Map()};
    this.rooms.set(id,room);this.byCode.set(code,id);this.guestRoom.set(guestId,id);return room;
  }
  lookup(code:string){const id=this.byCode.get(code);return id?this.rooms.get(id):undefined;}
  roomForGuest(guestId:string){const id=this.guestRoom.get(guestId);return id?this.rooms.get(id):undefined;}
  join(code:string,guestId:string,name:string,avatarId:string):Room{
    const room=this.lookup(code);if(!room)throw new Error('ROOM_NOT_FOUND');if(room.phase!=='lobby')throw new Error('ROUND_STARTED');
    if(room.members.some(m=>m.guestId===guestId)){this.guestRoom.set(guestId,room.id);return room;}
    if(room.seats.length>=12)throw new Error('ROOM_FULL');
    const target=[...room.teams].sort((a,b)=>a.seatIds.length-b.seatIds.length)[0];
    const seat:Seat={id:randomUUID(),teamId:target.id,name,avatarId,computer:false};target.seatIds.push(seat.id);room.seats.push(seat);room.members.push({guestId,seatId:seat.id,name,avatarId,connected:false,joinedAt:Date.now()});room.version++;this.guestRoom.set(guestId,room.id);return room;
  }
  member(room:Room,guestId:string){const m=room.members.find(x=>x.guestId===guestId);if(!m)throw new Error('NOT_MEMBER');return m;}
  requireHost(room:Room,guestId:string){if(room.hostGuestId!==guestId)throw new Error('NOT_HOST');}
  addComputer(room:Room,guestId:string,teamId:string){this.requireHost(room,guestId);if(room.phase!=='lobby')throw new Error('ROUND_STARTED');const team=room.teams.find(t=>t.id===teamId);if(!team)throw new Error('TEAM_NOT_FOUND');const max=room.teams.length===2?6:4;if(team.seatIds.length>=max)throw new Error('TEAM_FULL');const n=room.seats.filter(s=>s.computer).length+1;const seat:Seat={id:randomUUID(),teamId,name:`Computer ${n}`,avatarId:`avataaars-${String((n+3)%24+1).padStart(2,'0')}`,computer:true};team.seatIds.push(seat.id);room.seats.push(seat);room.version++;return room;}
  addTeam(room:Room,guestId:string){this.requireHost(room,guestId);if(room.phase!=='lobby')throw new Error('ROUND_STARTED');if(room.teams.length===3)throw new Error('TEAM_LIMIT');room.teams.push({id:'team-green',color:null,seatIds:[]});room.version++;return room;}
  removeComputer(room:Room,guestId:string,seatId:string){this.requireHost(room,guestId);if(room.phase!=='lobby')throw new Error('ROUND_STARTED');const seat=room.seats.find(s=>s.id===seatId&&s.computer);if(!seat)throw new Error('NOT_FOUND');room.seats=room.seats.filter(s=>s.id!==seatId);for(const team of room.teams)team.seatIds=team.seatIds.filter(id=>id!==seatId);room.version++;return room;}
  moveSeat(room:Room,guestId:string,seatId:string,teamId:string){const member=this.member(room,guestId);if(room.phase!=='lobby')throw new Error('ROUND_STARTED');if(room.hostGuestId!==guestId&&member.seatId!==seatId)throw new Error('NOT_HOST');const seat=room.seats.find(s=>s.id===seatId);const dest=room.teams.find(t=>t.id===teamId);if(!seat||!dest)throw new Error('NOT_FOUND');const max=room.teams.length===2?6:4;if(dest.seatIds.length>=max)throw new Error('TEAM_FULL');for(const t of room.teams)t.seatIds=t.seatIds.filter(id=>id!==seatId);dest.seatIds.push(seatId);seat.teamId=dest.id;room.version++;return room;}
  setColor(room:Room,guestId:string,teamId:string,color:TeamColor){this.requireHost(room,guestId);if(!['blue','red','green'].includes(color))throw new Error('INVALID_COLOR');if(room.teams.some(t=>t.id!==teamId&&t.color===color))throw new Error('COLOR_IN_USE');const t=room.teams.find(t=>t.id===teamId);if(!t)throw new Error('NOT_FOUND');t.color=color;room.version++;return room;}
  start(room:Room,guestId:string){this.requireHost(room,guestId);const sizes=room.teams.map(t=>t.seatIds.length);if(!sizes[0]||!sizes.every(s=>s===sizes[0]))throw new Error('TEAMS_UNBALANCED');if(room.teams.some(t=>!t.color))throw new Error('SELECT_COLORS');room.round=createRound(room.teams,room.seats);room.phase='playing';room.version++;return this.runComputers(room);}
  play(room:Room,guestId:string,cardId:string,row:number,col:number){const member=this.member(room,guestId);if(!room.round)throw new Error('NO_ROUND');room.round=applyPlay(room.round,member.seatId,cardId,{row,col}).state;room.phase=room.round.result?'finished':'playing';room.version++;return this.runComputers(room);}
  exchange(room:Room,guestId:string,cardId:string){const member=this.member(room,guestId);if(!room.round)throw new Error('NO_ROUND');room.round=applyExchange(room.round,member.seatId,cardId).state;room.version++;return room;}
  pass(room:Room,guestId:string){const member=this.member(room,guestId);if(!room.round)throw new Error('NO_ROUND');room.round=applyPass(room.round,member.seatId).state;room.phase=room.round.result?'finished':'playing';room.version++;return this.runComputers(room);}
  replay(room:Room,guestId:string){this.member(room,guestId);if(!room.round?.result)throw new Error('ROUND_NOT_FINISHED');const nextDealer=(room.round.dealerSeatIndex+1)%room.seats.length;const next=createRound(room.teams,room.seats);next.dealerSeatIndex=nextDealer;next.currentSeatIndex=(nextDealer+1)%next.seats.length;room.round=next;room.phase='playing';room.version++;return room;}
  updateProfile(room:Room,guestId:string,name:string,avatarId:string){const m=this.member(room,guestId);m.name=name;m.avatarId=avatarId;const s=room.seats.find(s=>s.id===m.seatId)!;s.name=name;s.avatarId=avatarId;if(room.round){const rs=room.round.seats.find(x=>x.id===s.id);if(rs){rs.name=name;rs.avatarId=avatarId;}}room.version++;return room;}
  runComputers(room:Room){let guard=0;while(room.round&&!room.round.result&&guard++<24){const seatId=currentSeatId(room.round);const seat=room.seats.find(s=>s.id===seatId);if(!seat?.computer)break;const actions=legalActions(room.round,seat.id);const playable=actions.find(a=>a.cells.length);if(playable){const cell=playable.cells[Math.floor(Math.random()*playable.cells.length)];room.round=applyPlay(room.round,seat.id,playable.cardId,cell).state;}else{const dead=actions.find(a=>a.dead);if(dead&&!room.round.exchangeUsed){room.round=applyExchange(room.round,seat.id,dead.cardId).state;continue;}room.round=applyPass(room.round,seat.id).state;}room.version++;}room.phase=room.round?.result?'finished':'playing';return room;}
  snapshot(room:Room,guestId:string){const member=room.members.find(m=>m.guestId===guestId);const round=room.round;const yourHand=member&&round?round.hands[member.seatId]:[];const yourActions=member&&round?legalActions(round,member.seatId):[];return {id:room.id,code:room.code,version:room.version,phase:room.phase,isHost:room.hostGuestId===guestId,teams:room.teams,seats:room.seats.map(s=>({...s})),members:room.members.map(({guestId:gid,...m})=>({...m,isYou:gid===guestId})),round:round?{id:round.id,version:round.version,turn:round.turn,turnOrder:round.turnOrder,currentSeatId:currentSeatId(round),chips:round.chips,sequences:round.sequences,lastMove:round.lastMove,result:round.result,exchangeUsed:round.exchangeUsed,handCounts:Object.fromEntries(Object.entries(round.hands).map(([k,v])=>[k,v.length]))}:null,yourSeatId:member?.seatId??null,yourHand,yourActions};}
}
