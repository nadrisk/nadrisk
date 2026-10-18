/** Stereo-linked lookahead peak guard after the compressor. O(1) sliding maximum. */
export const PEAK_LIMITER_WORKLET = `class NadPeakLimit extends AudioWorkletProcessor {
  static get parameterDescriptors(){return [{name:'ceiling',defaultValue:-1,minValue:-24,maxValue:0,automationRate:'k-rate'}];}
  constructor(){super();this.delay=Math.ceil(sampleRate*.003);this.size=this.delay+2;this.l=new Float32Array(this.size);this.r=new Float32Array(this.size);this.qv=new Float64Array(this.size);this.qi=new Float64Array(this.size);this.head=0;this.tail=0;this.n=0;this.g=1;this.rel=Math.exp(-1/(sampleRate*.08));}
  process(inp,out,p){const i=inp[0],o=out[0];if(!o||!o[0])return true;const c=Math.pow(10,p.ceiling[0]/20);
    for(let k=0;k<o[0].length;k++){const n=this.n++,pos=n%this.size,L=i?.[0]?.[k]||0,R=i?.[1]?.[k]??L,v=Math.max(Math.abs(L),Math.abs(R));this.l[pos]=L;this.r[pos]=R;
      while(this.head!==this.tail&&this.qi[this.head]<n-this.delay)this.head=(this.head+1)%this.size;
      while(this.head!==this.tail&&this.qv[(this.tail+this.size-1)%this.size]<=v)this.tail=(this.tail+this.size-1)%this.size;
      this.qv[this.tail]=v;this.qi[this.tail]=n;this.tail=(this.tail+1)%this.size;
      const peak=this.qv[this.head],target=peak>c?c/peak:1;this.g=Math.min(target,1-(1-this.g)*this.rel);
      const read=(n-this.delay+this.size)%this.size;o[0][k]=n<this.delay?0:this.l[read]*this.g;if(o[1])o[1][k]=n<this.delay?0:this.r[read]*this.g;
    }return true;}
}registerProcessor('nad-peak-limit',NadPeakLimit);`;