/** Inline stereo DSP shared by slot effects and the master performance recorder. */
export const ADVANCED_WORKLETS = `
class NadGate extends AudioWorkletProcessor {
 static get parameterDescriptors() { return [{name:'rate',defaultValue:8},{name:'mask',defaultValue:21845},{name:'steps',defaultValue:16},{name:'depth',defaultValue:1},{name:'smooth',defaultValue:.1},{name:'tight',defaultValue:0}]; }
 constructor(){super();this.g=1;this.last=-1;this.age=0;}
 process(ins,outs,p){const x=ins[0],y=outs[0];for(let n=0;n<y[0].length;n++){const step=Math.floor((currentFrame+n)/sampleRate*p.rate[0])%p.steps[0];if(step!==this.last){this.last=step;this.age=0;}else this.age++;const tg=p.tight[0],stepLen=sampleRate/Math.max(.1,p.rate[0]),dec=tg>0?Math.exp(-this.age/(stepLen*(1.05-tg)*.35)):1;const target=(p.mask[0]&(1<<step))?1-p.depth[0]*(1-dec):1-p.depth[0];this.g+=(target-this.g)/(1+p.smooth[0]*sampleRate*.03);for(let c=0;c<y.length;c++)y[c][n]=(x[c]?.[n]||x[0]?.[n]||0)*this.g;}return true;}
}
class NadDuck extends AudioWorkletProcessor {
 static get parameterDescriptors(){return [{name:'threshold',defaultValue:-24},{name:'ratio',defaultValue:6},{name:'depth',defaultValue:1},{name:'attack',defaultValue:.005},{name:'release',defaultValue:.2}];}
 constructor(){super();this.e=0;this.g=1;}
 process(ins,outs,p){const x=ins[0],key=ins[1],y=outs[0],th=Math.pow(10,p.threshold[0]/20);for(let n=0;n<y[0].length;n++){const v=Math.max(Math.abs(key[0]?.[n]||0),Math.abs(key[1]?.[n]||0));const tc=v>this.e?p.attack[0]:p.release[0];this.e+=(v-this.e)*(1-Math.exp(-1/(sampleRate*Math.max(.001,tc))));const reduction=this.e>th?Math.pow(th/this.e,1-1/p.ratio[0]):1;this.g+=(1-p.depth[0]+p.depth[0]*reduction-this.g)*.03;for(let c=0;c<y.length;c++)y[c][n]=(x[c]?.[n]||x[0]?.[n]||0)*this.g;}return true;}
}
class NadBandGate extends AudioWorkletProcessor {
 static get parameterDescriptors(){return [{name:'threshold',defaultValue:-35},{name:'release',defaultValue:.08},{name:'floor',defaultValue:0}];}
 constructor(){super();this.e=0;this.g=0;}
 process(ins,outs,p){const x=ins[0],y=outs[0],th=Math.pow(10,p.threshold[0]/20);for(let n=0;n<y[0].length;n++){const v=Math.max(Math.abs(x[0]?.[n]||0),Math.abs(x[1]?.[n]||0));this.e=v>this.e?v:this.e*Math.exp(-1/(sampleRate*Math.max(.005,p.release[0])));const target=this.e>th?1:p.floor[0];this.g+=(target-this.g)*.015;for(let c=0;c<y.length;c++)y[c][n]=(x[c]?.[n]||x[0]?.[n]||0)*this.g;}return true;}
}
class NadReverseDelay extends AudioWorkletProcessor {
 static get parameterDescriptors(){return [{name:'time',defaultValue:.25},{name:'feedback',defaultValue:.3},{name:'ping',defaultValue:0}];}
 constructor(){super();this.cap=Math.ceil(sampleRate*2);this.buffers=Array.from({length:2},()=>[new Float32Array(this.cap),new Float32Array(this.cap)]);this.pos=0;this.bank=0;this.ready=false;this.len=Math.floor(sampleRate*.25);this.prevLen=this.len;}
 process(ins,outs,p){const x=ins[0],y=outs[0],ping=p.ping[0]>=.5,rd=[0,0];for(let n=0;n<y[0].length;n++){const idx=Math.max(0,this.prevLen-1-Math.floor(this.pos*this.prevLen/this.len));for(let c=0;c<2;c++)rd[c]=this.ready?this.buffers[c][1-this.bank][idx]:0;const edge=Math.max(0,Math.min(1,this.pos/128,(this.len-1-this.pos)/128)),fbk=Math.min(.85,p.feedback[0]),mono=((x[0]?.[n]||0)+((x[1]||x[0])?.[n]||0))*.5;for(let c=0;c<y.length;c++){const b=this.buffers[c]||this.buffers[0],read=rd[c]||0;y[c][n]=read*edge;/* PING: input enters the left side only and each repeat crosses to the other side. */const src=ping?(c===0?mono:0):(x[c]?.[n]||x[0]?.[n]||0),back=ping?rd[1-c]:read;b[this.bank][this.pos]=src+Math.tanh(back)*fbk;}if(++this.pos>=this.len){this.pos=0;this.bank=1-this.bank;this.ready=true;this.prevLen=this.len;this.len=Math.min(this.cap,Math.max(128,Math.floor(p.time[0]*sampleRate)));}}return true;}
}
class NadPerformance extends AudioWorkletProcessor {
 static get parameterDescriptors(){return [{name:'mode',defaultValue:0},{name:'length',defaultValue:.125}];}
 constructor(){super();this.cap=Math.ceil(sampleRate*8);this.b=[new Float32Array(this.cap),new Float32Array(this.cap)];this.frozen=[new Float32Array(this.cap),new Float32Array(this.cap)];this.w=0;this.read=0;this.start=0;this.pos=0;this.mode=0;this.blend=0;this.speed=1;}
 process(ins,outs,p){const x=ins[0],y=outs[0],mode=Math.round(p.mode[0]),len=Math.min(this.cap-2,Math.max(128,Math.floor(p.length[0]*sampleRate)));if(mode!==this.mode){this.mode=mode;this.start=(this.w-len+this.cap)%this.cap;this.read=(this.w-1+this.cap)%this.cap;this.pos=0;this.speed=1;if(mode)for(let c=0;c<2;c++)this.frozen[c].set(this.b[c]);}for(let n=0;n<y[0].length;n++){this.blend+=(mode?1-this.blend:-this.blend)*.008;for(let c=0;c<y.length;c++){const b=this.b[c]||this.b[0],dry=x[c]?.[n]||x[0]?.[n]||0;b[this.w]=dry;let idx=mode===1?(this.start+len-1-this.pos+this.cap)%this.cap:mode===2?(this.start+this.pos)%this.cap:this.read;const k=Math.floor(idx),frac=idx-k;const captured=this.frozen[c]||this.frozen[0];let wet=captured[k]*(1-frac)+captured[(k+1)%this.cap]*frac;const edge=mode===1||mode===2?Math.min(1,this.pos/64,(len-this.pos)/64):1;wet*=Math.max(0,edge);y[c][n]=dry*(1-this.blend)+wet*this.blend;}this.w=(this.w+1)%this.cap;this.pos=(this.pos+1)%len;if(mode===3){this.speed=Math.max(0,this.speed-1/(sampleRate*.8));this.read=(this.read+this.speed)%this.cap;}}return true;}
}
class NadDuck2 extends AudioWorkletProcessor {
 static get parameterDescriptors(){return [{name:'hp',defaultValue:80},{name:'depth',defaultValue:.8},{name:'attack',defaultValue:.005},{name:'release',defaultValue:.2}];}
 constructor(){super();this.e=0;this.g=1;this.px=0;this.py=0;this.pk=.05;}
 process(ins,outs,p){const x=ins[0],key=ins[1],y=outs[0],a=1/(1+2*Math.PI*p.hp[0]/sampleRate);for(let n=0;n<y[0].length;n++){const k=key&&key.length?((key[0]?.[n]||0)+((key[1]||key[0])?.[n]||0))*.5:0;this.py=a*(this.py+k-this.px);this.px=k;const v=Math.abs(this.py);this.pk=Math.max(v,this.pk*.99999,.02);const tc=v>this.e?p.attack[0]:p.release[0];this.e+=(v-this.e)*(1-Math.exp(-1/(sampleRate*Math.max(.001,tc))));const amt=Math.min(1,this.e/(this.pk*.5));this.g=1-p.depth[0]*amt;for(let c=0;c<y.length;c++)y[c][n]=(x[c]?.[n]||x[0]?.[n]||0)*this.g;}return true;}
}
class NadVca extends AudioWorkletProcessor {
 static get parameterDescriptors(){return [{name:'threshold',defaultValue:-24},{name:'ratio',defaultValue:4},{name:'attack',defaultValue:.01},{name:'release',defaultValue:.2},{name:'makeup',defaultValue:6}];}
 constructor(){super();this.gr=0;}
 process(ins,outs,p){const x=ins[0],y=outs[0];if(!x||!x.length)return true;const th=p.threshold[0],r=Math.max(1,p.ratio[0]),W=6,ka=1-Math.exp(-1/(sampleRate*Math.max(.0005,p.attack[0]))),kr=1-Math.exp(-1/(sampleRate*Math.max(.01,p.release[0]))),mk=Math.pow(10,p.makeup[0]/20);
 for(let n=0;n<y[0].length;n++){const v=Math.max(Math.abs(x[0][n]||0),Math.abs((x[1]||x[0])[n]||0)),db=20*Math.log10(v+1e-9),o=db-th;let tgt=0;if(2*o>W)tgt=o*(1-1/r);else if(2*o>-W){const q=o+W/2;tgt=(1-1/r)*q*q/(2*W);}this.gr+=(tgt-this.gr)*(tgt>this.gr?ka:kr);const g=Math.pow(10,-this.gr/20)*mk;for(let c=0;c<y.length;c++)y[c][n]=((x[c]||x[0])[n]||0)*g;}return true;}
}
/* NAD reverb: our own feedback-delay-network design. A mono sum passes two allpass diffusers (DENS sets their
   coefficient), then feeds two decorrelated 4-line delay networks (one per side) with Householder mixing, a
   one-pole DAMP lowpass per line and per-line decay gains derived from SIZE as T60. Techniques learned from
   classic FDN/plate literature; all code, lengths and tuning are ours. */
class NadReverb extends AudioWorkletProcessor {
  static get parameterDescriptors(){return [{name:'size',defaultValue:2.5},{name:'density',defaultValue:.6},{name:'damp',defaultValue:6000}];}
  constructor(){super();this.cap=Math.ceil(sampleRate*.12);this.base=[[.0297,.0371,.0411,.0437],[.0305,.0349,.0399,.0451]];
    this.d=this.base.map(s=>s.map(()=>new Float32Array(this.cap)));this.pos=[[0,0,0,0],[0,0,0,0]];this.lp=[[0,0,0,0],[0,0,0,0]];
    this.apBuf=[new Float32Array(512),new Float32Array(512)];this.apPos=[0,0];this.apLen=[226,172];this.lens=null;}
  process(ins,outs,p){const x=ins[0],y=outs[0];if(!x||!x.length)return true;
    const t60=Math.max(.2,p.size[0]),ls=Math.round(Math.max(.25,Math.min(2,Math.sqrt(t60/2.5)))*20)/20;
    if(!this.lens||this.ls!==ls){this.ls=ls;this.lens=this.base.map(s=>s.map(t=>Math.min(this.cap-2,Math.max(64,Math.floor(t*ls*sampleRate)))));}
    const apc=.25+.5*Math.max(0,Math.min(1,p.density[0])),lk=1-Math.exp(-2*Math.PI*Math.max(500,Math.min(16000,p.damp[0]))/sampleRate);
    const g=this.lens.map(s=>s.map(l=>Math.pow(10,-3*l/(sampleRate*t60))*.97));
    for(let n=0;n<y[0].length;n++){let v=((x[0]?.[n]||0)+((x[1]||x[0])?.[n]||0))*.5;
      for(let s=0;s<2;s++){const b=this.apBuf[s],L=this.apLen[s],i=this.apPos[s],r=b[i];const o=r-apc*v;b[i]=v+apc*r;this.apPos[s]=(i+1)%L;v=o;}
      for(let s=0;s<2;s++){const f=[0,0,0,0];let out=0;
        for(let j=0;j<4;j++){const r=this.d[s][j][this.pos[s][j]];this.lp[s][j]+=lk*(r-this.lp[s][j]);f[j]=this.lp[s][j];out+=r;}
        const avg=(f[0]+f[1]+f[2]+f[3])*.5;
        for(let j=0;j<4;j++){this.d[s][j][this.pos[s][j]]=v+(f[j]-avg)*g[s][j];this.pos[s][j]=(this.pos[s][j]+1)%this.lens[s][j];}
        if(y[s])y[s][n]=out*.6;}return true;}}
}
registerProcessor('nad-reverb',NadReverb);
registerProcessor('nad-duck2',NadDuck2);registerProcessor('nad-vca',NadVca);registerProcessor('nad-gate',NadGate);registerProcessor('nad-duck',NadDuck);registerProcessor('nad-bandgate',NadBandGate);registerProcessor('nad-reverse-delay',NadReverseDelay);registerProcessor('nad-performance',NadPerformance);
`;
