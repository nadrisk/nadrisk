// Receives K-weighted master audio on input 0 and a 20-120 Hz band on input 1.
// It emits EBU-style momentary/short-term/integrated loudness plus sub-band dBFS.
export const METER_WORKLET = `class NadMeter extends AudioWorkletProcessor {
  constructor(){super();this.m=[];this.s=[];this.blocks=[];this.sub=[];this.n=0;this.port.onmessage=e=>{if(e.data==='reset')this.blocks=[];};}
  mean(a){let n=0,s=0;for(const x of a){s+=x;n++;}return n?s/n:0;}
  lu(e){return e>1e-12?-0.691+10*Math.log10(e):-Infinity;}
  process(inputs){const k=inputs[0],b=inputs[1];if(!k||!k.length)return true;let ke=0,se=0,sp=0,N=k[0].length;
    for(let i=0;i<N;i++){let kv=0,sv=0;for(let c=0;c<k.length;c++){const x=k[c][i]||0;kv+=x*x;}for(let c=0;c<(b?.length||0);c++){const x=b[c][i]||0;sv+=x*x;sp=Math.max(sp,Math.abs(x));}this.m.push(kv);this.s.push(kv);this.sub.push(sv);}
    const trim=(a,n)=>{if(a.length>n)a.splice(0,a.length-n);};trim(this.m,Math.round(sampleRate*.4));trim(this.s,Math.round(sampleRate*3));trim(this.sub,Math.round(sampleRate*.4));
    this.n+=N;if(this.n>=sampleRate*.1){this.n=0;const me=this.mean(this.m),short=this.mean(this.s);if(this.m.length>=sampleRate*.39&&this.lu(me)>-70)this.blocks.push(me);if(this.blocks.length>72000)this.blocks.shift();
      const ung=this.mean(this.blocks),rel=this.lu(ung)-10,gate=Math.max(-70,rel),g=this.blocks.filter(x=>this.lu(x)>=gate),integ=this.mean(g);
      const sube=this.mean(this.sub),db=x=>x>1e-12?10*Math.log10(x):-Infinity;
      this.port.postMessage({m:this.lu(me),s:this.lu(short),i:this.lu(integ),sub:db(sube),peak:sp>1e-6?20*Math.log10(sp):-Infinity});}
    return true;}}
registerProcessor('nad-meter',NadMeter);`;