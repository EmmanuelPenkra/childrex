type Cue='place'|'remove'|'exchange'|'your-turn'|'sequence'|'win'|'loss'|'draw'|'enabled-preview';
type Note=[number,number,number,number?];
const RECIPES:Record<Cue,Note[]>={
  place:[[0,55,720,420]],remove:[[0,70,460,260]],exchange:[[0,45,620,480]],
  'your-turn':[[0,65,659.25],[85,85,783.99]],sequence:[[0,70,523.25],[85,70,659.25],[170,95,783.99]],
  win:[[0,80,523.25],[100,80,659.25],[200,150,783.99]],loss:[[0,85,440],[105,120,349.23]],draw:[[0,80,523.25],[100,100,523.25]],
  'enabled-preview':[[0,55,720,420]],
};
const KEY='childrex.sequence.preferences.v1';
class Cues{
  context:AudioContext|null=null;master:GainNode|null=null;enabled=false;revision=0;
  constructor(){try{this.enabled=JSON.parse(localStorage.getItem(KEY)??'{}').soundEnabled!==false}catch{this.enabled=true}}
  async setEnabled(value:boolean,preview=true){
    const revision=++this.revision;
    if(!value){this.enabled=false;this.master?.gain.setTargetAtTime(0,this.context?.currentTime??0,.007);this.store();return false}
    try{this.context??=new AudioContext();if(!this.master){this.master=this.context.createGain();this.master.connect(this.context.destination)}this.master.gain.value=.18;await this.context.resume();if(revision!==this.revision)return this.enabled;this.enabled=this.context.state==='running';this.store();if(this.enabled&&preview)this.play('enabled-preview');return this.enabled}catch{if(revision!==this.revision)return this.enabled;this.enabled=false;this.store();return false}
  }
  unlock(){return this.enabled?this.setEnabled(true,false):Promise.resolve(false)}
  store(){try{localStorage.setItem(KEY,JSON.stringify({soundEnabled:this.enabled}))}catch{return}}
  play(cue:Cue){if(!this.enabled||!this.context||!this.master||document.hidden)return;const base=this.context.currentTime+.006;for(const [offset,duration,start,end=start] of RECIPES[cue]){const osc=this.context.createOscillator();const gain=this.context.createGain();const at=base+offset/1000;const stop=at+duration/1000;osc.type='sine';osc.frequency.setValueAtTime(start,at);osc.frequency.linearRampToValueAtTime(end,stop);gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(.35,at+.005);gain.gain.linearRampToValueAtTime(0,stop);osc.connect(gain).connect(this.master);osc.start(at);osc.stop(stop+.005);osc.onended=()=>{osc.disconnect();gain.disconnect()}}}
}
export const cues=new Cues();
export type { Cue };
