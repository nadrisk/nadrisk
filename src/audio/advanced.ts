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
 static get parameterDescriptors(){return [{name:'time',defaultValue:.25},{name:'feedback',defaultValue:.3}];}
 constructor(){super();this.cap=Math.ceil(sampleRate*2);this.buffers=Array.from({length:2},()=>[new Float32Array(this.cap),new Float32Array(this.cap)]);this.pos=0;this.bank=0;this.ready=false;this.len=Math.floor(sampleRate*.25);this.prevLen=this.len;}
 process(ins,outs,p){const x=ins[0],y=outs[0];for(let n=0;n<y[0].length;n++){for(let c=0;c<y.length;c++){const b=this.buffers[c]||this.buffers[0],read=this.ready?b[1-this.bank][Math.max(0,this.prevLen-1-Math.floor(this.pos*this.prevLen/this.len))]:0;const edge=Math.min(1,this.pos/128,(this.len-1-this.pos)/128);y[c][n]=read*Math.max(0,edge);b[this.bank][this.pos]=(x[c]?.[n]||x[0]?.[n]||0)+Math.tanh(read)*Math.min(.85,p.feedback[0]);}if(++this.pos>=this.len){this.pos=0;this.bank=1-this.bank;this.ready=true;this.prevLen=this.len;this.len=Math.min(this.cap,Math.max(128,Math.floor(p.time[0]*sampleRate)));}}return true;}
}
class NadPerformance extends AudioWorkletProcessor {
 static get parameterDescriptors(){return [{name:'mode',defaultValue:0},{name:'length',defaultValue:.125}];}
 constructor(){super();this.cap=Math.ceil(sampleRate*8);this.b=[new Float32Array(this.cap),new Float32Array(this.cap)];this.frozen=[new Float32Array(this.cap),new Float32Array(this.cap)];this.w=0;this.read=0;this.start=0;this.pos=0;this.mode=0;this.blend=0;this.speed=1;}
 process(ins,outs,p){const x=ins[0],y=outs[0],mode=Math.round(p.mode[0]),len=Math.min(this.cap-2,Math.max(128,Math.floor(p.length[0]*sampleRate)));if(mode!==this.mode){this.mode=mode;this.start=(this.w-len+this.cap)%this.cap;this.read=(this.w-1+this.cap)%this.cap;this.pos=0;this.speed=1;if(mode)for(let c=0;c<2;c++)this.frozen[c].set(this.b[c]);}for(let n=0;n<y[0].length;n++){this.blend+=(mode?1-this.blend:-this.blend)*.008;for(let c=0;c<y.length;c++){const b=this.b[c]||this.b[0],dry=x[c]?.[n]||x[0]?.[n]||0;b[this.w]=dry;let idx=mode===1?(this.start+len-1-this.pos+this.cap)%this.cap:mode===2?(this.start+this.pos)%this.cap:this.read;const k=Math.floor(idx),frac=idx-k;const captured=this.frozen[c]||this.frozen[0];let wet=captured[k]*(1-frac)+captured[(k+1)%this.cap]*frac;const edge=mode===1||mode===2?Math.min(1,this.pos/64,(len-this.pos)/64):1;wet*=Math.max(0,edge);y[c][n]=dry*(1-this.blend)+wet*this.blend;}this.w=(this.w+1)%this.cap;this.pos=(this.pos+1)%len;if(mode===3){this.speed=Math.max(0,this.speed-1/(sampleRate*.8));this.read=(this.read+this.speed)%this.cap;}}return true;}
}
registerProcessor('nad-gate',NadGate);registerProcessor('nad-duck',NadDuck);registerProcessor('nad-bandgate',NadBandGate);registerProcessor('nad-reverse-delay',NadReverseDelay);registerProcessor('nad-performance',NadPerformance);
`;
