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
/* NAD reverb: our own smooth "void" FDN. Mono sum -> SIZE-scaled pre-delay -> five series allpass diffusers
   (DENS = coefficient, transients melt) -> two decorrelated 8-line Householder networks (one per side). Each line
   is long (60-250 ms x SIZE scale), slowly wobbled with its own sine LFO (kills metallic ringing), darkened by a
   one-pole DAMP lowpass per pass, and decays with an exact per-line T60 gain so tails fade smoothly to silence. */
class NadReverb extends AudioWorkletProcessor {
  static get parameterDescriptors(){return [{name:'size',defaultValue:2.5},{name:'density',defaultValue:.6},{name:'damp',defaultValue:6000}];}
  constructor(){super();const sr=sampleRate;this.cap=Math.ceil(sr*.42);this.apCap=Math.ceil(sr*.026);
    this.base=[[.0613,.0787,.0937,.1103,.1291,.1531,.1823,.2179],[.0671,.0829,.0991,.1171,.1373,.1621,.1949,.2467]];
    this.apBase=[[.0071,.0113,.0089,.0157,.0097,.0131,.0079,.0149],[.0083,.0121,.0101,.0139,.0073,.0163,.0091,.0127]];
    this.d=this.base.map(s=>s.map(()=>new Float32Array(this.cap)));this.lap=this.base.map(s=>s.map(()=>new Float32Array(this.apCap)));this.w=0;this.w2=0;this.lp=[new Float64Array(8),new Float64Array(8)];
    this.ph=this.base.map((s,si)=>s.map((_,j)=>(j*.618+si*.31)%1*Math.PI*2));this.rate=this.base.map((s,si)=>s.map((_,j)=>(.13+.07*j+.04*si)*2*Math.PI/sr));
    this.apLen=[.0047,.0036,.0127,.0093,.0071].map(t=>Math.floor(t*sr));this.ap=this.apLen.map(l=>new Float32Array(l));this.apPos=[0,0,0,0,0];
    this.pre=new Float32Array(Math.ceil(sr*.12));this.preW=0;this.hp=0;this.hpx=0;this.key='';}
  setup(t60,dens){const sr=sampleRate,ls=Math.max(.35,Math.min(1.6,Math.sqrt(t60/3))),key=ls.toFixed(3)+'|'+t60.toFixed(2)+'|'+dens.toFixed(2);if(key===this.key)return;this.key=key;
    this.lens=this.base.map(s=>s.map(t=>Math.min(this.cap-4,Math.floor(t*ls*sr))));
    this.md=(.001+.002*dens)*sr;this.apL=this.apBase.map(s=>s.map(t=>Math.min(this.apCap-this.md*2-4,t*sr)));
    this.g=this.lens.map((s,si)=>s.map((l,j)=>Math.pow(10,-3*(l+this.apL[si][j]+this.md)/(sr*t60))));
    /* Loudness match: steady-state wet energy grows with T60 / loop length, so scale it back toward the dry level. */
    this.outG=.95/Math.sqrt(1+t60/(.14*ls));this.preLen=Math.min(this.pre.length-1,Math.floor(sr*Math.min(.1,.008+t60*.005)));}
  process(ins,outs,p){const x=ins[0],y=outs[0];if(!y||!y[0])return true;
    const t60=Math.max(.2,Math.min(20,p.size[0])),dens=Math.max(0,Math.min(1,p.density[0]));this.setup(t60,dens);
    const apc=.3+.42*dens,ga=.5+.12*dens,lk=1-Math.exp(-2*Math.PI*Math.max(500,Math.min(16000,p.damp[0]))/sampleRate),hk=Math.exp(-2*Math.PI*120/sampleRate),cap=this.cap,ac=this.apCap,md=this.md,og=this.outG;
    for(let n=0;n<y[0].length;n++){const pw=this.preW,pl=this.pre.length,xin=((x?.[0]?.[n]||0)+((x?.[1]||x?.[0])?.[n]||0))*.5;
      this.hp=hk*(this.hp+xin-this.hpx);this.hpx=xin;this.pre[pw]=this.hp;let v=this.pre[(pw-this.preLen+pl)%pl];this.preW=(pw+1)%pl;
      for(let a=0;a<5;a++){const b=this.ap[a],i=this.apPos[a],r=b[i],o=r-apc*v;b[i]=v+apc*r;this.apPos[a]=(i+1)%this.apLen[a];v=o;}
      for(let s=0;s<2;s++){const D=this.d[s],A=this.lap[s],L=this.lens[s],AL=this.apL[s],G=this.g[s],LP=this.lp[s],PH=this.ph[s],R=this.rate[s],f=[0,0,0,0,0,0,0,0];let sum=0,out=0;
        for(let j=0;j<8;j++){let ri=this.w-L[j];if(ri<0)ri+=cap;const r=D[j][ri];LP[j]+=lk*(r-LP[j]);
          PH[j]+=R[j];if(PH[j]>6.2832)PH[j]-=6.2832;let idx=this.w2-AL[j]-md*(1+Math.sin(PH[j]));if(idx<0)idx+=ac;const k=Math.floor(idx),fr=idx-k,b=A[j];
          const dl=b[k]+(b[(k+1)%ac]-b[k])*fr,vn=LP[j]+ga*dl;b[this.w2]=vn;const z=(dl-ga*vn)*G[j];f[j]=z;sum+=z;out+=(j&1?-r:r);}
        sum*=.25;for(let j=0;j<8;j++)D[j][this.w]=f[j]-sum+v*(j&1?-.35:.35);
        const o=out*og;if(y[s])y[s][n]=o;else if(y[0])y[0][n]=(y[0][n]+o)*.5;}
      this.w=(this.w+1)%cap;this.w2=(this.w2+1)%ac;}return true;}
}
registerProcessor('nad-reverb',NadReverb);
registerProcessor('nad-duck2',NadDuck2);registerProcessor('nad-vca',NadVca);registerProcessor('nad-gate',NadGate);registerProcessor('nad-duck',NadDuck);registerProcessor('nad-bandgate',NadBandGate);registerProcessor('nad-reverse-delay',NadReverseDelay);registerProcessor('nad-performance',NadPerformance);
`;
