// Master tape recorder processor: copies the final master output to the main thread while armed.
export const TAPE_WORKLET = `class NadTape extends AudioWorkletProcessor{constructor(){super();this.on=false;this.port.onmessage=e=>{this.on=e.data};}
process(i){const x=i[0];if(this.on&&x&&x.length){const l=x[0].slice(0),r=(x[1]||x[0]).slice(0);this.port.postMessage([l,r],[l.buffer,r.buffer]);}return true;}}
registerProcessor("nad-tape",NadTape);`;
