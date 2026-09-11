import { io } from 'socket.io-client';
import type { Command, RoomSnapshot } from './types';

async function post<T>(url:string, body:unknown={}):Promise<T>{
  const response=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},credentials:'same-origin',body:JSON.stringify(body)});
  const data=await response.json(); if(!response.ok)throw new Error(data.message??data.error??'Request failed'); return data;
}
export const api={
  session:()=>post<{guestId:string;room:RoomSnapshot|null}>('/sequence/api/session'),
  create:(name:string,avatarId:string)=>post<RoomSnapshot>('/sequence/api/rooms',{name,avatarId}),
  lookup:(code:string)=>post<{found:boolean;joinable?:boolean;count?:number}>('/sequence/api/rooms/lookup',{code}),
  join:(code:string,name:string,avatarId:string)=>post<RoomSnapshot>('/sequence/api/rooms/join',{code,name,avatarId}),
  command:(roomId:string,command:Command)=>post<RoomSnapshot>('/sequence/api/commands',{roomId,commandId:crypto.randomUUID(),...command}),
};
export const connect=(onSnapshot:(room:RoomSnapshot)=>void)=>{
  const socket=io({path:'/sequence/socket.io',transports:['websocket','polling']});
  socket.on('snapshot',onSnapshot); return()=>socket.disconnect();
};
