import { describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { RoomStore } from './rooms';

function ready(){const store=new RoomStore();const room=store.create('host','Host','avataaars-01');store.join(room.code,'guest','Guest','avataaars-02');store.setColor(room,'host',room.teams[0].id,'blue');store.setColor(room,'host',room.teams[1].id,'red');return{store,room}}

describe('room authorization and privacy',()=>{
  it('allocates an exact two-digit code',()=>{const room=new RoomStore().create('host','Host','avataaars-01');expect(room.code).toMatch(/^\d{2}$/)});
  it('refuses non-host configuration and start commands',()=>{const {store,room}=ready();expect(()=>store.addComputer(room,'guest',room.teams[0].id)).toThrow('NOT_HOST');expect(()=>store.start(room,'guest')).toThrow('NOT_HOST')});
  it('does not disclose another player hand or deck in personalized snapshots',()=>{const {store,room}=ready();store.start(room,'host');const host=store.snapshot(room,'host');const guest=store.snapshot(room,'guest');expect(host.yourHand).toHaveLength(7);expect(guest.yourHand).toHaveLength(7);expect(host.yourHand).not.toEqual(guest.yourHand);expect(JSON.stringify(host)).not.toContain(guest.yourHand[0].id);expect(host.round).not.toHaveProperty('drawPile');expect(host.round).not.toHaveProperty('hands')});
  it('requires membership before returning a member or acting',()=>{const {store,room}=ready();expect(()=>store.member(room,'stranger')).toThrow('NOT_MEMBER');expect(()=>store.play(room,'stranger','x',1,1)).toThrow('NOT_MEMBER')});
  it('balances joined humans onto opposite teams',()=>{const {room}=ready();expect(room.teams.map(t=>t.seatIds.length)).toEqual([1,1])});
  it('lets a computer make its turn without reading a human hand',()=>{const store=new RoomStore();const room=store.create('host','Host','avataaars-01');store.addComputer(room,'host',room.teams[1].id);store.setColor(room,'host',room.teams[0].id,'blue');store.setColor(room,'host',room.teams[1].id,'red');store.start(room,'host');expect(room.phase).toBe('playing');expect(room.round?.turn).toBeGreaterThanOrEqual(1);expect(room.round?.currentSeatIndex).not.toBeNull()});
  it('restores acknowledged room and round state after a process restart',()=>{const dir=mkdtempSync(path.join(tmpdir(),'sequence-store-'));try{const file=path.join(dir,'rooms.json');const first=new RoomStore(file);const room=first.create('host','Host','avataaars-01');first.addComputer(room,'host',room.teams[1].id);first.setColor(room,'host',room.teams[0].id,'blue');first.setColor(room,'host',room.teams[1].id,'red');first.start(room,'host');first.persist();const version=room.version;const second=new RoomStore(file);const restored=second.lookup(room.code);expect(restored?.id).toBe(room.id);expect(restored?.version).toBe(version);expect(restored?.round?.hands[room.seats[0].id]).toHaveLength(7)}finally{rmSync(dir,{recursive:true,force:true})}});
});
