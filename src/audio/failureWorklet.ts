// NADRISK master "Failure" stage: zero-knob, loudness-reactive sub-harmonics, asymmetric diode drive and sluggish pumping.
export const FAILURE_WORKLET = `
class NadFailure extends AudioWorkletProcessor{
constructor(){super();const s=sampleRate;this.a=(ms)=>Math.exp(-1/(s*ms/1000));
this.eA=this.a(8);this.eR=this.a(220);this.pA=this.a(80);this.pR=this.a(650);this.gS=this.a(120);
this.k=1-Math.exp(-2*Math.PI*140/s);this.ks=1-Math.exp(-2*Math.PI*90/s);this.env=0;this.pe=0;this.g=1;
this.ch=[0,1].map(()=>({lp:0,lp2:0,amp:0,last:0,f1:1,f2:1,sub:0}));}
process(ins,outs){const i=ins[0],o=outs[0];if(!i||!i.length||!o)return true;const n=o[0].length,L=i[0],R=i[1]||i[0];
for(let t=0;t<n;t++){const m=Math.max(Math.abs(L[t]),Math.abs(R[t]));this.env=m>this.env?m+this.eA*(this.env-m):m+this.eR*(this.env-m);
const db=20*Math.log10(this.env+1e-6),lv=Math.min(1,Math.max(0,(db+30)/24));
for(let c=0;c<o.length;c++){const x=(c?R:L)[t],s=this.ch[c];
s.lp+=this.k*(x-s.lp);s.lp2+=this.k*(s.lp-s.lp2);const a=Math.abs(s.lp2);s.amp=a>s.amp?a:s.amp*.9995;
const sg=s.lp2>=0?1:-1;if(sg>0&&s.last<0){s.f1=-s.f1;if(s.f1>0)s.f2=-s.f2;}s.last=sg;
s.sub+=this.ks*((s.f1*.65+s.f2*.45)*s.amp-s.sub);
const d=(1+lv*7)*x,y=d>=0?1-Math.exp(-d):-.7*(1-Math.exp(d/.7)),nrm=1-Math.exp(-(1+lv*7));
o[c][t]=(y/nrm+s.sub*1.4*lv)*this.g;}
const mo=Math.max(Math.abs(o[0][t]),o[1]?Math.abs(o[1][t]):0);this.pe=mo>this.pe?mo+this.pA*(this.pe-mo):mo+this.pR*(this.pe-mo);
const tg=1/(1+Math.max(0,this.pe-.35)*3.5)*(1+.25*(1-lv));this.g=tg+this.gS*(this.g-tg);}
return true;}}
registerProcessor('nad-failure',NadFailure);`;
