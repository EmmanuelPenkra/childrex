import { useEffect, useMemo, useRef, useState } from 'react';
import { BOARD, toLogical } from '../../../packages/engine/src/board';
import type { CardFace, Cell, Seat, Team, TeamColor } from '../../../packages/engine/src/types';
import { api, connect } from './api';
import { cues } from './audio';
import type { RoomSnapshot, Selected } from './types';

const COLORS: TeamColor[]=['blue','red','green'];
const COLOR_HEX:Record<TeamColor,string>={blue:'#2F6BFF',red:'#E5484D',green:'#30A46C'};
const avatar=(id:string)=>`/sequence/assets/avatars/${id}.svg`;
const card=(face:CardFace)=>`/sequence/assets/cards/${face}.svg`;
const cellKey=(cell:Cell)=>`${cell.row},${cell.col}`;

function Logo(){return <div className="brand" aria-label="Sequence"><span>SEQUE</span><span className="brand-link">N</span><span>CE</span></div>}
function Spinner(){return <div className="loading"><span/><p>Setting the table…</p></div>}

function Avatar({id,name,editable=false,onClick}:{id:string;name:string;editable?:boolean;onClick?:()=>void}){
  const content=<img src={avatar(id)} alt=""/>;
  return editable?<button className="avatar avatar-button" onClick={onClick} aria-label={`Change ${name}'s avatar`}>{content}</button>:<span className="avatar">{content}</span>;
}

function AvatarPicker({current,onSelect,onClose}:{current:string;onSelect:(id:string)=>void;onClose:()=>void}){
  return <div className="scrim" onMouseDown={e=>e.target===e.currentTarget&&onClose()}>
    <section className="dialog avatar-dialog" role="dialog" aria-modal="true" aria-labelledby="avatar-title">
      <button className="close" onClick={onClose} aria-label="Close">×</button><p className="eyebrow">PROFILE</p><h2 id="avatar-title">Choose your avatar</h2>
      <div className="avatar-grid">{Array.from({length:24},(_,i)=>`avataaars-${String(i+1).padStart(2,'0')}`).map((id,i)=><button key={id} className={id===current?'avatar-option selected':''} aria-label={`Avatar ${i+1}`} aria-pressed={id===current} onClick={()=>onSelect(id)}><img src={avatar(id)} alt=""/></button>)}</div>
    </section>
  </div>
}

function PlayerRow({seat,team,you,current,onAvatar,onName,onRemove}:{seat:Seat;team:Team;you:boolean;current?:boolean;onAvatar?:()=>void;onName?:(name:string)=>void;onRemove?:()=>void}){
  const [editing,setEditing]=useState(false);const [draft,setDraft]=useState(seat.name);const input=useRef<HTMLInputElement>(null);
  useEffect(()=>{if(editing)input.current?.select()},[editing]);useEffect(()=>setDraft(seat.name),[seat.name]);
  const save=()=>{const name=draft.trim().replace(/\s+/g,' ');if(name&&name.length<=24&&name!==seat.name)onName?.(name);setEditing(false)};
  return <div className={`player ${current?'current':''}`} style={{'--team':team.color?COLOR_HEX[team.color]:'#8B909A'} as React.CSSProperties} title={`${seat.name}${seat.computer?' · Computer':''}${current?' · Current turn':''}`}>
    <Avatar id={seat.avatarId} name={seat.name} editable={you} onClick={onAvatar}/>
    <div className="player-copy">{editing?<input ref={input} value={draft} maxLength={24} aria-label="Player name" onChange={e=>setDraft(e.target.value)} onBlur={save} onKeyDown={e=>{if(e.key==='Enter')save();if(e.key==='Escape'){setDraft(seat.name);setEditing(false)}}}/>:<button className="player-name" disabled={!you} onDoubleClick={()=>setEditing(true)} onKeyDown={e=>{if((e.key==='Enter'||e.key==='F2')&&you)setEditing(true)}}>{you?'You':seat.name}</button>}<small>{seat.computer?'Computer':you?seat.name:team.color?`${team.color} team`:'Team member'}</small></div>
    {current&&<span className="turn-dot" aria-label="Current turn"/>}{onRemove&&<button className="remove-player" onClick={onRemove} aria-label={`Remove ${seat.name}`}>×</button>}
  </div>
}

function CodeBadge({room,onToast}:{room:RoomSnapshot;onToast:(text:string)=>void}){
  const copy=async()=>{await navigator.clipboard.writeText(`${location.origin}/sequence/join?code=${room.code}`);onToast('Invite link copied')};
  return <button className="code-badge" onClick={copy} aria-label={`Copy invite, code ${room.code}`}><small>CODE</small><strong>{room.code}</strong></button>
}

function ColorPicker({team,used,disabled,onPick}:{team:Team;used:(TeamColor|null)[];disabled:boolean;onPick:(c:TeamColor)=>void}){
  return <div className={`color-control ${team.color?'has-color':''}`} style={{'--team':team.color?COLOR_HEX[team.color]:'#9AA0AA'} as React.CSSProperties}>
    <span>{team.color?team.color.toUpperCase():'SELECT COLOR'}</span>
    <div className="color-dots">{COLORS.filter(c=>c===team.color||!used.includes(c)).map(c=><button key={c} disabled={disabled} className={c===team.color?'active':''} style={{'--dot':COLOR_HEX[c]} as React.CSSProperties} onClick={()=>onPick(c)} aria-label={`Select ${c}`} />)}</div>
  </div>
}

function Lobby({room,command,onJoin,onAvatar,onToast}:{room:RoomSnapshot;command:(x:Record<string,unknown>)=>Promise<void>;onJoin:()=>void;onAvatar:()=>void;onToast:(s:string)=>void}){
  const isHost=room.isHost;const sizes=room.teams.map(t=>t.seatIds.length);const balanced=sizes.every(n=>n>0&&n===sizes[0]);const colored=room.teams.every(t=>t.color);const canStart=isHost&&balanced&&colored;
  return <main className="lobby-shell"><header className="lobby-head"><Logo/><div><p className="eyebrow">PRIVATE GAME</p><h1>Gather your teams</h1><p>{room.teams.length} teams · {room.seats.length} player{room.seats.length===1?'':'s'}</p></div><CodeBadge room={room} onToast={onToast}/></header>
    <section className={`teams teams-${room.teams.length}`}>{room.teams.map(team=><article className="team-panel" key={team.id} style={{'--team':team.color?COLOR_HEX[team.color]:'#8B909A'} as React.CSSProperties}>
      <ColorPicker team={team} used={room.teams.map(t=>t.color)} disabled={!isHost} onPick={color=>command({type:'setColor',teamId:team.id,color})}/>
      <div className="team-players">{team.seatIds.map(seatId=>{const seat=room.seats.find(s=>s.id===seatId)!;const member=room.members.find(m=>m.seatId===seatId);return <PlayerRow key={seat.id} seat={seat} team={team} you={member?.isYou??false} onAvatar={member?.isYou?onAvatar:undefined} onName={member?.isYou?name=>command({type:'profile',name,avatarId:seat.avatarId}):undefined} onRemove={isHost&&seat.computer?()=>command({type:'removeComputer',seatId:seat.id}):undefined}/>})}</div>
      {isHost&&<button className="subtle-btn" onClick={()=>command({type:'addComputer',teamId:team.id})}>+ Add computer</button>}
      <button className="subtle-btn" onClick={()=>document.querySelector<HTMLButtonElement>('.code-badge')?.click()}>Invite a friend</button>
    </article>)}
    {room.teams.length===2&&isHost&&<button className="add-team" aria-label="Add third team" onClick={()=>command({type:'addTeam'})}>+</button>}</section>
    <footer className="lobby-footer"><button className="join-another" onClick={onJoin}>Join another game with code <span>→</span></button><button className="start" disabled={!canStart} onClick={()=>command({type:'start'})}>{!isHost?'Waiting for host':!colored?'Select team colors':!balanced?'Balance teams':'Start game'} <span>→</span></button></footer>
  </main>
}

function Corner(){return <div className="corner-mark" aria-label="Free space"><span>♠</span><span>♥</span><span>♦</span><span>♣</span></div>}
function Board({room,selected,onPlay}:{room:RoomSnapshot;selected:Selected;onPlay:(cardId:string,cell:Cell)=>void}){
  const round=room.round!;const valid=new Set(selected?.cells.map(cellKey));const sequence=new Set(round.sequences.flatMap(s=>s.cells.map(cellKey)));const last=round.lastMove&&cellKey(round.lastMove.cell);
  return <div className="board-wrap"><div className="board-rule">TWO-EYED JACKS ARE WILD</div><div className="board-word">SEQUENCE</div><div className="board-grid" role="grid" aria-label="Sequence board">
    {Array.from({length:10},(_,r)=>Array.from({length:10},(_,c)=>({row:r,col:c}))).flat().map(display=>{const logical=toLogical(display);const face=BOARD[logical.row][logical.col];const key=cellKey(logical);const teamId=round.chips[logical.row][logical.col];const team=room.teams.find(t=>t.id===teamId);const isValid=valid.has(key);return <button key={`${display.row}-${display.col}`} role="gridcell" className={`board-cell ${isValid?'valid':''} ${last===key?'last':''} ${sequence.has(key)?'sequence-cell':''}`} style={{'--chip':team?.color?COLOR_HEX[team.color]:'#777','--valid':selected?colorForSeat(room,room.yourSeatId,true):'transparent'} as React.CSSProperties} disabled={!isValid} onClick={()=>selected&&onPlay(selected.cardId,logical)} aria-label={face==='F'?'Free corner':`${face}${team?' occupied':''}${isValid?' valid move':''}`}>
      {face==='F'?<Corner/>:<img src={card(face)} alt=""/>}{team&&<span className="chip"><i>SEQ</i></span>}
    </button>})}
  </div><div className="board-word right">SEQUENCE</div><div className="board-rule right">ONE-EYED JACKS REMOVE</div></div>
}

function colorForSeat(room:RoomSnapshot,seatId:string|null,light=false){const seat=room.seats.find(s=>s.id===seatId);const color=room.teams.find(t=>t.id===seat?.teamId)?.color??'blue';if(!light)return COLOR_HEX[color];return color==='blue'?'#92B5FF':color==='red'?'#FFAFB2':'#8ED9B1'}
function Hand({room,selected,onSelect,onExchange,onPass}:{room:RoomSnapshot;selected:Selected;onSelect:(next:Selected)=>void;onExchange:(id:string)=>void;onPass:()=>void}){
  const yourTurn=room.round?.currentSeatId===room.yourSeatId;const actions=new Map(room.yourActions.map(a=>[a.cardId,a]));
  const selectedAction=selected?actions.get(selected.cardId):undefined;const mustPass=yourTurn&&room.yourActions.length>0&&room.yourActions.every(a=>!a.cells.length)&&(room.round?.exchangeUsed||!room.yourActions.some(a=>a.dead));
  return <div className="hand" style={{'--team':colorForSeat(room,room.yourSeatId)} as React.CSSProperties}><p>{yourTurn?'YOUR TURN':'YOUR CARDS'}</p><div className="hand-row">{room.yourHand.map(item=>{const action=actions.get(item.id);const active=selected?.cardId===item.id;return <button key={item.id} disabled={!yourTurn} className={`hand-card ${active?'selected':''} ${action?.dead?'dead':''}`} onClick={()=>onSelect(active?null:action?{cardId:item.id,cells:action.cells,kind:action.kind}:null)} aria-pressed={active}><img src={card(item.face)} alt={item.face}/>{action?.dead&&<span>Dead</span>}</button>})}</div>{selectedAction?.dead&&!room.round?.exchangeUsed&&<button className="hand-action" onClick={()=>onExchange(selectedAction.cardId)}>Replace dead card</button>}{mustPass&&<button className="hand-action" onClick={onPass}>Pass</button>}</div>
}

function Game({room,command,onMenu,onAvatar}:{room:RoomSnapshot;command:(x:Record<string,unknown>)=>Promise<void>;onMenu:()=>void;onAvatar:()=>void}){
  const [selected,setSelected]=useState<Selected>(null);useEffect(()=>setSelected(null),[room.round?.turn]);const current=room.round?.currentSeatId;
  const play=async(cardId:string,cell:Cell)=>{setSelected(null);await command({type:'play',cardId,row:cell.row,col:cell.col})};
  return <main className="game-shell"><header className="game-top"><Logo/><div className="player-strip">{room.round!.turnOrder.map(id=>{const seat=room.seats.find(s=>s.id===id)!;const team=room.teams.find(t=>t.id===seat.teamId)!;const member=room.members.find(m=>m.seatId===id);return <PlayerRow key={id} seat={seat} team={team} you={member?.isYou??false} current={id===current} onAvatar={member?.isYou?onAvatar:undefined} onName={member?.isYou?name=>command({type:'profile',name,avatarId:seat.avatarId}):undefined}/>})}</div><button className="menu-btn" onClick={onMenu}>Menu</button></header><Board room={room} selected={selected} onPlay={play}/><Hand room={room} selected={selected} onSelect={setSelected} onExchange={cardId=>command({type:'exchange',cardId})} onPass={()=>command({type:'pass'})}/></main>
}

function Menu({sound,setSound,onClose,onJoin}:{sound:boolean;setSound:(v:boolean)=>void;onClose:()=>void;onJoin:()=>void}){return <div className="scrim" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><section className="dialog menu-dialog" role="dialog" aria-modal="true"><button className="close" onClick={onClose}>×</button><p className="eyebrow">GAME MENU</p><h2>Paused for you</h2><button className="menu-row" onClick={()=>setSound(!sound)}><span>Sound</span><strong>{sound?'On':'Off'}</strong></button><button className="menu-row" onClick={onJoin}><span>Join another game</span><strong>→</strong></button><button className="primary" onClick={onClose}>Back to game</button></section></div>}
function Result({room,command}:{room:RoomSnapshot;command:(x:Record<string,unknown>)=>Promise<void>}){const winner=room.teams.find(t=>t.id===room.round?.result?.winnerTeamId);const yours=room.seats.find(s=>s.id===room.yourSeatId)?.teamId===winner?.id;return <div className="result-scrim"><section className="result-card" style={{'--team':winner?.color?COLOR_HEX[winner.color]:'#F5C451'} as React.CSSProperties}><p className="eyebrow">GAME COMPLETE</p><h1>{winner?`${winner.color?.toUpperCase()} TEAM WINS`:'DRAW'}</h1><p>{yours?'That sequence sealed it.':'A five-chip sequence finished the round.'}</p><button className="primary" onClick={()=>command({type:'replay'})}>Play again <span>↻</span></button><small>Replay starts immediately—no confirmations needed.</small></section></div>}
function JoinDialog({onClose,onJoin}:{onClose:()=>void;onJoin:(code:string)=>Promise<void>}){const initial=new URLSearchParams(location.search).get('code')?.slice(0,2)??'';const [code,setCode]=useState(initial);const [error,setError]=useState('');return <div className="scrim"><section className="dialog join-dialog" role="dialog" aria-modal="true"><button className="close" onClick={onClose}>×</button><Logo/><p className="eyebrow">JOIN A PRIVATE GAME</p><h2>Enter the two-digit code</h2><input autoFocus inputMode="numeric" maxLength={2} value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,''))} aria-label="Game code"/><button className="primary" disabled={code.length!==2} onClick={()=>onJoin(code).catch(e=>setError(e.message))}>Join game <span>→</span></button>{error&&<p className="error">{error}</p>}</section></div>}

export function App(){
  const [room,setRoom]=useState<RoomSnapshot|null>(null);const [loading,setLoading]=useState(true);const [error,setError]=useState('');const [toast,setToast]=useState('');const [join,setJoin]=useState(location.pathname.includes('/join'));const [menu,setMenu]=useState(false);const [picker,setPicker]=useState(false);const [sound,setSound]=useState(cues.enabled);const previous=useRef<RoomSnapshot|null>(null);
  useEffect(()=>{let off=()=>{};api.session().then(async session=>{setRoom(session.room??await api.create(`Player ${Math.floor(Math.random()*90+10)}`,'avataaars-01'));off=connect(setRoom)}).catch(e=>setError(e.message)).finally(()=>setLoading(false));return()=>off()},[]);
  useEffect(()=>{if(!toast)return;const timer=setTimeout(()=>setToast(''),2200);return()=>clearTimeout(timer)},[toast]);
  useEffect(()=>{const before=previous.current;previous.current=room;if(!before?.round||!room?.round||before.round.id!==room.round.id)return;if(room.round.result&&!before.round.result){const winner=room.round.result.winnerTeamId;const mine=room.seats.find(s=>s.id===room.yourSeatId)?.teamId;cues.play(winner?winner===mine?'win':'loss':'draw');return}if(room.round.lastMove?.turn!==before.round.lastMove?.turn){const made=room.round.sequences.some(s=>s.createdTurn===room.round!.lastMove?.turn);cues.play(made?'sequence':room.round.lastMove?.kind==='remove'?'remove':'place');if(room.round.currentSeatId===room.yourSeatId)setTimeout(()=>cues.play('your-turn'),made?305:110)}},[room]);
  const command=async(x:Record<string,unknown>)=>{if(!room)return;try{setError('');setRoom(await api.command(room.id,x as never))}catch(e){setError(e instanceof Error?e.message:'Something went wrong')}};
  const me=useMemo(()=>room?.seats.find(s=>s.id===room.yourSeatId),[room]);
  const chooseAvatar=(id:string)=>{if(me)command({type:'profile',name:me.name,avatarId:id});setPicker(false)};
  if(loading)return <Spinner/>;if(!room)return <div className="fatal"><Logo/><h1>Couldn’t open the game</h1><p>{error}</p><button onClick={()=>location.reload()}>Try again</button></div>;
  const toggleSound=async(value:boolean)=>{const accepted=await cues.setEnabled(value);setSound(accepted);if(value&&!accepted)setToast('Sound is unavailable in this browser.')};
  return <><div className="app">{room.phase==='lobby'?<Lobby room={room} command={command} onJoin={()=>setJoin(true)} onAvatar={()=>setPicker(true)} onToast={setToast}/>:<Game room={room} command={command} onMenu={()=>setMenu(true)} onAvatar={()=>setPicker(true)}/>}</div>{room.phase==='finished'&&<Result room={room} command={command}/>} {menu&&<Menu sound={sound} setSound={toggleSound} onClose={()=>setMenu(false)} onJoin={()=>{setMenu(false);setJoin(true)}}/>}{join&&<JoinDialog onClose={()=>{setJoin(false);history.replaceState({},'',`/sequence/room/${room.id}`)}} onJoin={async code=>{const joined=await api.join(code,me?.name??'Player',me?.avatarId??'avataaars-01');setRoom(joined);setJoin(false);history.replaceState({},'',`/sequence/room/${joined.id}`)}}/>}{picker&&me&&<AvatarPicker current={me.avatarId} onSelect={chooseAvatar} onClose={()=>setPicker(false)}/>} {toast&&<div className="toast" role="status">{toast}</div>}{error&&<div className="error-toast" role="alert">{error}<button onClick={()=>setError('')}>×</button></div>}</>;
}
