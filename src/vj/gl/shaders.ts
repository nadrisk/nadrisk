// Fragment sources ported from the reference shaders the artist supplied (shaders_pasted.txt).
// Each world keeps its original math, constants, colours and camera; only object SDFs, the
// four audio bands (uBand = kick, snare, hat, level) and the 1-bit output are added.

export const HEAD = `#version 300 es
precision highp float;
uniform vec3 iResolution; uniform float iTime; uniform sampler2D iChannel0;
uniform vec4 uBand; uniform float uSize; uniform int uPalette; uniform int uSkin; uniform int uFloor; uniform int uEffect; uniform float uTravel; uniform float uRotation; uniform int uMono; uniform vec3 uFg; uniform vec3 uBg;
out vec4 outColor;
float bayer4(vec2 p){ ivec2 q = ivec2(mod(p,4.)); int i = q.x + q.y*4;
  int m[16] = int[16](0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5); return (float(m[i])+.5)/16.; }
`;
export const TAIL = `
void main(){ vec4 c; vec2 fc = gl_FragCoord.xy;
if (uEffect == 1) {
  float bs = max(2., floor(iResolution.y/90.)); fc = (floor(fc/bs)+.5)*bs;
}
  mainImage(c, fc);
  c.rgb = max(c.rgb, 0.);
if (uEffect == 2) {
  float th = bayer4(gl_FragCoord.xy);
  c.rgb = step(vec3(th), c.rgb);
}
  if (uMono == 1) { float l = dot(clamp(c.rgb,0.,1.), vec3(.299,.587,.114)); c.rgb = l > bayer4(gl_FragCoord.xy) ? uFg : uBg; }
  outColor = vec4(c.rgb, 1.);
}`;

// ---------- shared object library (standard geometric shapes, iq / hg_sdf) ----------
const NOISE3 = `
lowp vec4 permute(in lowp vec4 x){return mod(x*x*34.+x,289.);}
lowp float snoise(in mediump vec3 v){
  const lowp vec2 C = vec2(0.16666666666,0.33333333333);
  const lowp vec4 D = vec4(0,.5,1,2);
  lowp vec3 i  = floor(C.y*(v.x+v.y+v.z) + v);
  lowp vec3 x0 = C.x*(i.x+i.y+i.z) + (v - i);
  lowp vec3 g = step(x0.yzx, x0);
  lowp vec3 l = (1. - g).zxy;
  lowp vec3 i1 = min( g, l );
  lowp vec3 i2 = max( g, l );
  lowp vec3 x1 = x0 - i1 + C.x;
  lowp vec3 x2 = x0 - i2 + C.y;
  lowp vec3 x3 = x0 - D.yyy;
  i = mod(i,289.);
  lowp vec4 p = permute( permute( permute(
	  i.z + vec4(0., i1.z, i2.z, 1.))
	+ i.y + vec4(0., i1.y, i2.y, 1.))
	+ i.x + vec4(0., i1.x, i2.x, 1.));
  lowp vec3 ns = .142857142857 * D.wyz - D.xzx;
  lowp vec4 j = -49. * floor(p * ns.z * ns.z) + p;
  lowp vec4 x_ = floor(j * ns.z);
  lowp vec4 x = x_ * ns.x + ns.yyyy;
  lowp vec4 y = floor(j - 7. * x_ ) * ns.x + ns.yyyy;
  lowp vec4 h = 1. - abs(x) - abs(y);
  lowp vec4 b0 = vec4( x.xy, y.xy );
  lowp vec4 b1 = vec4( x.zw, y.zw );
  lowp vec4 sh = -step(h, vec4(0));
  lowp vec4 a0 = b0.xzyw + (floor(b0)*2.+ 1.).xzyw*sh.xxyy;
  lowp vec4 a1 = b1.xzyw + (floor(b1)*2.+ 1.).xzyw*sh.zzww;
  lowp vec3 p0 = vec3(a0.xy,h.x);
  lowp vec3 p1 = vec3(a0.zw,h.y);
  lowp vec3 p2 = vec3(a1.xy,h.z);
  lowp vec3 p3 = vec3(a1.zw,h.w);
  lowp vec4 norm = inversesqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  lowp vec4 m = max(.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.);
  return .5 + 12. * dot( m * m * m, vec4( dot(p0,x0), dot(p1,x1),dot(p2,x2), dot(p3,x3) ) );
}`;

const OBJ = `${NOISE3}
float sdBox(vec3 p, vec3 b){ vec3 q = abs(p)-b; return length(max(q,0.)) + min(max(q.x,max(q.y,q.z)),0.); }
float sdTorus(vec3 p, vec2 t){ vec2 q = vec2(length(p.xz)-t.x, p.y); return length(q)-t.y; }
float sdPyramid(vec3 p, float h){
  float m2 = h*h + 0.25;
  p.xz = abs(p.xz); p.xz = (p.z>p.x) ? p.zx : p.xz; p.xz -= 0.5;
  vec3 q = vec3(p.z, h*p.y - 0.5*p.x, h*p.x + 0.5*p.y);
  float s = max(-q.x,0.0);
  float t = clamp((q.y-0.5*p.z)/(m2+0.25), 0.0, 1.0);
  float a = m2*(q.x+s)*(q.x+s) + q.y*q.y;
  float b = m2*(q.x+0.5*t)*(q.x+0.5*t) + (q.y-m2*t)*(q.y-m2*t);
  float d2 = min(q.y,-q.x*m2-q.y*0.5) > 0.0 ? 0.0 : min(a,b);
  return sqrt((d2+q.z*q.z)/m2) * sign(max(q.z,-p.y));
}
mat2 r2(float a){ float s=sin(a), c=cos(a); return mat2(c,-s,s,c); }
// Unit-size primitive; MATTER is the Dark matter sphere (noise-displaced, wavy) at unit radius.
float objUnit(vec3 p){
#if OBJ == 1
  return length(p) - 1.;
#elif OBJ == 2
  return sdBox(p, vec3(.72)) - .03;
#elif OBJ == 3
  return sdPyramid(p/1.7 + vec3(0., .45, 0.), 1.)*1.7;
#elif OBJ == 4
  return sdTorus(p, vec2(.78, .3));
#elif OBJ == 5
  vec3 pos = p*30.;
  vec3 q = pos + snoise(pos/10.+iTime*.5);
  q.x += sin(pos.y*0.5+iTime*.4);
  return (length(q) - 30.) / 30. * .7;
#else
  return 1e5;
#endif
}
// Motion: FLOAT slow hover/turn, JUMP the original bob (sin(iTime*2.)*0.3), SPIN steady rotation.
vec3 objCentre(){
#if MOTION == 0
  return vec3(0., .18*sin(iTime*.6), 0.);
#elif MOTION == 1
  return vec3(0., -sin(iTime*2.)*0.3, 0.);
#else
  return vec3(0.);
#endif
}
vec3 gAt = vec3(0.); float gSize = 1.;
float objScale(){ return gSize * uSize * (1. + uBand.x*.045 + uBand.z*.025); }
vec3 objXf(vec3 p){
  p -= gAt + objCentre()*gSize;
#if MOTION == 0
  p.xz *= r2(uRotation*.25); p.xy *= r2(.35*sin(uRotation*.2));
#elif MOTION == 1
  p.xz *= r2(uRotation*.5 + uBand.y*.035);
#else
  p.xz *= r2(uRotation*1.1); p.yz *= r2(uRotation*.7);
#endif
  return p/objScale();
}
float objSdf(vec3 p){
#if OBJ == 0
  return 1e5;
#else
  vec3 q = objXf(p);
  q += .018*(uBand.x + uBand.z*.6)*sin(q.yzx*3. + uRotation);
  return objUnit(q)*objScale();
#endif
}
mat3 camY(float x){ float sx = sin(x), cx = cos(x); return mat3(cx, 0., sx, 0., 1., 0., -sx, 0., cx); }
// Camera travel shared by every world: STILL, DRIFT (Infinite place glide), ORBIT (Jumping shape circle),
// DIVE (Cloud diving weave). DRIFT/DIVE carry the object along; ORBIT circles it.
void travel(inout vec3 ro, inout vec3 rd, float spd){
  vec3 at = gAt;
#if CAM == 1
  vec3 off = vec3(0., 0., spd*uTravel); ro += off; gAt += off;
#elif CAM == 2
  mat3 R = camY((uTravel-10.)*.8); vec3 c = vec3(at.x, ro.y, at.z); ro = c + (ro-c)*R; rd = rd*R;
#elif CAM == 3
  float t = uTravel*.5, k = max(.5, length(at-ro))*.35;
  vec3 off = vec3(sin(t)*k*2., sin(t*.5)*k*.12, spd*uTravel); ro += off; gAt += off;
  rd = rd*camY(cos(t)*.22); rd.xy *= r2(-cos(t)*.12);
#endif
}
SKIN_SRC
// Triplanar patterns retain lighting; floor and object skins are independent.
vec3 surfacePattern(vec2 st, vec3 base, int selected){
  if (selected == 0) return base;
  vec2 fc = (st*.5+.5)*iResolution.y + vec2((iResolution.x-iResolution.y)*.5, 0.);
  vec3 col; float v; surfaceForm(selected-1, col, v, fc);
  vec3 c = palette(v, col, st);
  if (uPalette == 6) c = lum(c) > bayer4(gl_FragCoord.xy) ? uFg : uBg;
  return c*(.25 + .95*lum(base)) + max(base-.8, 0.);
}
vec3 floorSkin(vec3 p, vec3 base){ return surfacePattern(p.xz*.4, base, uFloor); }
vec3 skin(vec3 p, vec3 base){
  if (uSkin == 0) return base;
  vec3 q = objXf(p); vec2 e = vec2(.004, 0.);
  vec3 nl = abs(vec3(objUnit(q+e.xyy)-objUnit(q-e.xyy), objUnit(q+e.yxy)-objUnit(q-e.yxy), objUnit(q+e.yyx)-objUnit(q-e.yyx)));
  vec2 st = nl.x > nl.y && nl.x > nl.z ? q.zy : nl.y > nl.z ? q.xz : q.xy;
  return surfacePattern(st, base, uSkin);
}
bool objHit(vec3 p, float d){ return OBJ != 0 && objSdf(p) <= d + .01; }`;

// ---------- FLOOR: the "Jumping shape" space (hatched shading, sky, orbit camera) ----------
const FLOOR = `${OBJ}
float dune(vec2 p){ return .10*sin(p.x*.65+p.y*.3) + .065*sin(p.y*.9-p.x*.22); }
float map(vec3 p){ return min(objSdf(p), (p.y+.95-dune(p.xz))*.75); }
vec3 skyDune(vec3 rd){ return mix(vec3(.8,.9,1.), vec3(.5,.6,1.), pow(abs(rd.y),.5)); }
void mainImage(out vec4 fragColor, in vec2 fc){
  vec2 uv = (fc*2.-iResolution.xy)/iResolution.y;
  vec3 ro = vec3(0.,.25,-4.5), rd = normalize(vec3(uv.x, uv.y-.15, 2.2));
  gAt = vec3(0., .18, 0.); gSize = .85; travel(ro,rd,1.5);
  float t = 0.; bool hit = false;
  for(int i=0;i<100;i++){ float d=map(ro+rd*t); if(d<.003){hit=true;break;} t+=max(d,.002); if(t>40.)break; }
  vec3 col=skyDune(rd);
  if(hit){
    vec3 p=ro+rd*t; vec2 e=vec2(.004,0.);
    vec3 n=normalize(vec3(map(p+e.xyy)-map(p-e.xyy),map(p+e.yxy)-map(p-e.yxy),map(p+e.yyx)-map(p-e.yyx)));
    vec3 L=normalize(vec3(-.6,.8,-.5)); float dif=max(dot(n,L),0.);
    vec3 base=vec3(.72,.53,.32)*(.3+.7*dif);
    bool ob=objHit(p,p.y+.95-dune(p.xz));
    if(ob){base=vec3(.8,.65,.42)*(.22+.78*dif)+vec3(1.,.8,.5)*pow(max(dot(reflect(rd,n),L),0.),32.);base=skin(p,base);}
    else {float ripple=.97+.03*sin(p.x*18.+p.z*4.);base=floorSkin(p,base*ripple);}
    col=mix(base,skyDune(rd),1.-exp(-t*.065));
  }
  fragColor=vec4(col,1.);
}`;

// ---------- SKY: the "Ambient" space (clouds above, flat floor, misty horizon) ----------
const SKY = `${OBJ}
#define APPROXIMATE_NORMAL
#define CLOUD_SPREAD 0.002
#define CLOUD_STEPS 6.0
#define CLOUD_STRETCH 0.0045
#define CLOUD_BIAS -0.1
#define PERLIN 0.05
float hash( float n ) { return fract(sin(n)*43758.5453123); }
float noise( in vec2 x )
{
    vec2 p = floor(x);
    vec2 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    float n = p.x + p.y*157.0;
    return mix(mix( hash(n+  0.0), hash(n+  1.0),f.x),
                   mix( hash(n+157.0), hash(n+158.0),f.x),f.y);
}
const mat2 brownian_transform = mat2(0.8, 0.6, -0.6, 0.8);
float brownian(in vec2 x)
{
    float o = noise(x);
    x *= 2.0; x *= brownian_transform; o += noise(x) * 0.5;
    x *= 2.0; x *= brownian_transform; o += noise(x) * 0.25;
    x *= 2.0; x *= brownian_transform; o += noise(x) * 0.125;
    return o / 1.875;
}
float Perlin(vec2 p)
{
    float perlin = noise(p) * 0.5;
    perlin += noise(p * 2.0) * 0.25;
    perlin += noise(p * 4.0) * 0.125;
    perlin += noise(p * 8.0) * 0.0625;
    return perlin;
}
void Rotate(inout vec2 p, float a)
{
    float sa = sin(a);
    float ca = cos(a);
    p *= mat2(ca, -sa, sa, ca);
}
vec3 gRo = vec3(0.);
float Clouds(vec3 dir, out float dist)
{
    const float sky_height = 90.0;
    dist = -sky_height / dir.y;
    vec3 clouds_intersection = dir * dist + vec3(gRo.x, 0., gRo.z)*8.;
    float tw = 0.0;
    float clouds = 0.0;
    const float s = 1.0 / CLOUD_STEPS;
    for(float i = 0.0 ; i < 1.0 ; i += s)
    {
    	clouds += brownian(clouds_intersection.xz * (CLOUD_STRETCH + CLOUD_SPREAD * i)) * (1.0 - i);
        tw += 1.0 - i;
    }
    clouds /= tw;
    float perlin = Perlin(clouds_intersection.xz * 0.1);
    clouds = clouds - perlin * PERLIN;
    clouds = max(0.0, pow(clouds - 0.2, 2.0) * 6.0 + CLOUD_BIAS);
    return clouds;
}
vec3 Ray(vec2 uv)
{
    vec3 dir = normalize(vec3(uv, 2.5));
    return dir;
}
vec3 Sky(vec3 dir)
{
    vec3 sun_direction = normalize(vec3(-1.0, -0.4, -1.0));
    vec3 cl = vec3(0.4, 0.6, 0.8);
    cl = mix(vec3(0.8, 0.9, 1.0), cl, pow(max(dir.y, 0.), 0.45));
    float sun = pow(max(0.0, dot(dir, -sun_direction)), 600.0);
    cl = mix(cl, vec3(2.5, 1.8, 0.6), sun);
    float p;
    float clouds = Clouds(dir, p);
    float dt = 0.025;
    vec3 right = cross(vec3(0.0, 1.0, 0.0), dir);
    vec3 up = cross(right, dir);
    float clouds_right = Clouds(normalize(dir + right * dt), p);
    float clouds_above = Clouds(normalize(dir - up * dt), p);
    vec2 n = vec2(clouds_right - clouds, clouds - clouds_above) * 2.0;
    vec3 normal = normalize(n.x * right + n.y * up + dir);
    float o = dot(normal, sun_direction) * 0.6 + 0.3;
    o = mix(1.0, o, clamp(clouds * 0.125, 0.0, 1.0));
    cl = mix(cl, vec3(o, o, o), clamp(clouds, 0.0, 1.0));
    return cl;
}
// Clouds drift slowly overhead so the endless sky breathes like the reference.
vec3 SkyAt(vec3 dir){ return Sky(dir); }
vec3 groundCol(vec3 p){ float grain=.96+.04*sin(p.x*5.+sin(p.z*3.)); return floorSkin(p, vec3(.4,.3,.1)*grain); }
float omap(vec3 p){ return objSdf(p); }
void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
	vec2 uv = fragCoord.xy / iResolution.xy * 2.0 - 1.0;
    uv.x *= iResolution.x / iResolution.y;
    vec3 dir = Ray(uv), ro = vec3(0.);
    gAt = vec3(0., -.95, 7.); gSize = 1.;
    travel(ro, dir, 3.); gRo = ro;
    vec3 sun_direction = normalize(vec3(-1.0, -0.4, -1.0));
    vec3 cl = dir.y > 0. ? SkyAt(dir) : groundCol(ro+dir*(-1.95-ro.y)/min(dir.y,-.001));
#if OBJ != 0
    float t = 0.;
    for (int i = 0; i < 80; i++) { float d = omap(ro+dir*t); if (d < .002 || t > 20.) break; t += d; }
    if (t < 20.) {
      vec3 p = ro+dir*t; vec2 e = vec2(.002, 0.);
      vec3 n = normalize(vec3(omap(p+e.xyy)-omap(p-e.xyy), omap(p+e.yxy)-omap(p-e.yxy), omap(p+e.yyx)-omap(p-e.yyx)));
      vec3 r = reflect(dir, n);
      vec3 env = r.y > 0. ? SkyAt(r) : groundCol(p+r*(-1.95-p.y)/min(r.y,-.001));
      float dif = clamp(dot(n, -sun_direction), 0., 1.);
      cl = skin(p, env * (0.45 + 0.55*dif));
    }
#endif
    cl = mix(cl, vec3(0.8, 0.9, 1.0), pow(1.0 - abs(dir.y), 30.0));
	fragColor = vec4(cl, 1.0);
}`;

// ---------- ENDLESS: "Infinite place" (terrain, pipes, forward drift, misty horizon) ----------
const ENDLESS = `${OBJ}
void pR(inout vec2 p, float a)
{
    float sa = sin(a), ca = cos(a);
        p *= mat2(ca, sa, -sa, ca);
}
float grid(vec3 p, float r, float r2)
{
    float s = 2.0;
    vec3 c = floor(p * s + 0.5);
    p = (fract(p * s + 0.5) - 0.5) / s;
    float rand = texture(iChannel0, c.xz * 0.011).x;
    return length(p) - (sin(iTime) * r + r + rand * r2) / s;
}
float fOpPipe(float a, float b, float r)
{
    return length(vec2(a, b)) - r;
}
float perlin2(vec2 p)
{
    float n = texture(iChannel0, p).x;
    n += texture(iChannel0, p * 2.0).x * 0.5;
    n += texture(iChannel0, p * 4.0).x * 0.25;
    return n / 1.9375;
}
float map(vec3 p, out float m)
{
    float terrain = p.y - 0.5 + perlin2(p.xz * 0.002) * 1.5 + perlin2(p.xz * 0.05) * 0.05;
    float tubes = objSdf(p);
    m = 1.0;
    if(tubes < terrain)
	    m = 0.0;
    return min(terrain, tubes);
}
float map(vec3 p)
{
    float m;
    return map(p, m);
}
vec3 normal(vec3 p, float s)
{
    vec2 e = vec2(0.005, 0.0);
    return normalize(vec3(map(p + e.xyy), map(p + e.yxy), map(p + e.yyx)) - s);
}
void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
	vec2 uv = (fragCoord.xy * 2.0 - iResolution.xy) / iResolution.y;
    float m, s, td = 0.1;
    vec3 is, c, n, o = vec3(0.0, 0.25, 0.), d = vec3(0.0, 0.0, 1.0);
    pR(d.xz, uv.x * 0.3);
    pR(d.yz, uv.y * 0.3 - 0.06);
    gAt = vec3(0., .45, 5.); gSize = .45;
    travel(o, d, 4.);
    for(int i = 0 ; i < 200 ; ++i)
    {
        is = o + d * td;
        s = map(is, m) * 0.5;
        td += s;
        if(s<=0.0||td>25.0)
            break;
    }
    n = normal(is, s);
    vec3 surf = (m == 1.0 ? vec3(0.1, 0.05, 0.05) + vec3(0.1, 0.3, 0.0) * pow(n.y * 0.5 + 0.5, 12.0) : vec3(0.0)) * (n.y * 0.5 + 0.5)
        + (m == 1.0 ? 0.1 : 1.0) * pow(max(0.0, reflect(d, n).y), 22.0)
        + (m == 1.0 ? 0.5 : 0.4)  * vec3(0.1, 0.4, 0.45) * pow(clamp(1.0 + dot(d, n), 0.0, 1.0), 6.0);
    if (m == 0.0) surf = skin(is, max(surf, vec3(.12)));
    else surf = floorSkin(is, surf);
	fragColor = vec4(mix(surf, mix(vec3(1.0), vec3(0.2, 0.4, 0.7), pow(abs(d.y), 0.25))
            , min(1.0, td / 25.0))
        ,1.0);
}`;

// ---------- CLOUDS: "Cloud diving" (lighter march: 300-unit steps to 80000 with early exit, same colours) ----------
const CLOUDS = `${OBJ}
vec3 skytop = vec3(0.05, 0.2, 0.5);
vec3 light = normalize(vec3(0.1, 0.25, 0.9));
vec2 cloudrange = vec2(0.0, 10000.0);
mat3 m = mat3(0.00, 1.60, 1.20, -1.60, 0.72, -0.96, -1.20, -0.96, 1.28);
float hash(float n) { return fract(cos(n) * 114514.1919); }
float noise(in vec3 x)
{
    vec3 p = floor(x);
    vec3 f = smoothstep(0.0, 1.0, fract(x));
    float n = p.x + p.y * 10.0 + p.z * 100.0;
    return mix(
        mix(mix(hash(n + 0.0), hash(n + 1.0), f.x),
            mix(hash(n + 10.0), hash(n + 11.0), f.x), f.y),
        mix(mix(hash(n + 100.0), hash(n + 101.0), f.x),
            mix(hash(n + 110.0), hash(n + 111.0), f.x), f.y), f.z);
}
float fbm(vec3 p)
{
    float f = 0.5000 * noise(p);
    p = m * p;
    f += 0.2500 * noise(p);
    p = m * p;
    f += 0.1666 * noise(p);
    p = m * p;
    f += 0.0834 * noise(p);
    return f;
}
vec3 camera(float time)
{
    return vec3(5000.0 * sin(1.0 * time), 5000. + 1500. * sin(0.5 * time), 6000.0 * time);
}
void mainImage(out vec4 fragColor, in vec2 fragCoord)
{
    vec2 uv = 2. * fragCoord.xy / iResolution.xy - 1.0;
    uv.x *= iResolution.x / iResolution.y;
    float time = (uTravel + 13.5 + 44.) * 1.0;
#if CAM == 0
    vec3 campos = camera(57.5), camtar = camera(57.9);
#elif CAM == 1
    vec3 campos = vec3(0., 5000., 6000.*time), camtar = campos + vec3(0., 0., 1.);
#elif CAM == 2
    vec3 campos = vec3(0., 5000., 0.), camtar = campos + vec3(sin(uTravel*.25), 0., cos(uTravel*.25));
#else
    vec3 campos = camera(time);
    vec3 camtar = camera(time + 0.4);
#endif
    vec3 front = normalize(camtar - campos);
    vec3 right = normalize(cross(front, vec3(0.0, 1.0, 0.0)));
    vec3 up = normalize(cross(right, front));
    vec3 fragAt = normalize(uv.x * right + uv.y * up + front);
    vec4 sum = vec4(0, 0, 0, 0);
    for (float depth = 0.0; depth < 80000.0; depth += 300.0)
    {
        vec3 ray = campos + fragAt * depth;
        if (cloudrange.x < ray.y && ray.y < cloudrange.y)
        {
            float alpha = smoothstep(0.5, 1.0, fbm(ray * 0.00025));
            vec3 localcolor = mix(vec3(1.1, 1.05, 1.0), vec3(0.3, 0.3, 0.2), alpha);
            alpha = (1.0 - sum.a) * alpha;
            sum += vec4(localcolor * alpha, alpha);
            if (sum.a > .99) break;
        }
    }
    float alpha = smoothstep(0.7, 1.0, sum.a);
    sum.rgb /= sum.a + 0.0001;
    float sundot = clamp(dot(fragAt, light), 0.0, 1.0);
    vec3 col = 0.8 * (skytop);
    col += 0.47 * vec3(1.6, 1.4, 1.0) * pow(sundot, 350.0);
    col += 0.4 * vec3(0.8, 0.9, 1.0) * pow(sundot, 2.0);
    sum.rgb -= 0.6 * vec3(0.8, 0.75, 0.7) * pow(sundot, 13.0) * alpha;
    sum.rgb += 0.2 * vec3(1.3, 1.2, 1.0) * pow(sundot, 5.0) * (1.0 - alpha);
    col = mix(col, sum.rgb, sum.a);
#if OBJ != 0
    // The shape rides with the camera through the clouds, lit by the same sun and cloud colours.
    gAt = vec3(0., 0., 4.5); gSize = 1.;
    vec3 ro = vec3(0.), rd = normalize(vec3(uv, 1.)); float ot = 0.;
    for (int i = 0; i < 72; i++) { float d = objSdf(ro+rd*ot); if (d < .002 || ot > 12.) break; ot += d; }
    if (ot < 12.) {
      vec3 p = ro+rd*ot; vec2 e = vec2(.002, 0.);
      vec3 n = normalize(vec3(objSdf(p+e.xyy)-objSdf(p-e.xyy), objSdf(p+e.yxy)-objSdf(p-e.yxy), objSdf(p+e.yyx)-objSdf(p-e.yyx)));
      vec3 L = normalize(vec3(.3, .6, -.7));
      float dif = clamp(dot(n, L), 0., 1.), rim = pow(clamp(1. + dot(rd, n), 0., 1.), 3.);
      vec3 oc = mix(vec3(0.3, 0.3, 0.2), vec3(1.1, 1.05, 1.0), dif*.8 + .2) + 0.47*vec3(1.6, 1.4, 1.0)*pow(clamp(dot(reflect(rd, n), L), 0., 1.), 40.) + rim*0.8*skytop;
      oc = skin(p, oc);
      col = mix(col, oc, 1. - .35*sum.a);
    }
#endif
    fragColor = vec4(col, 1.0);
}`;

// ---------- OCEAN: open water under the Ambient sky (rolling swells, misty horizon, sun glint) ----------
const OCEAN = `${OBJ}
float wave(vec2 p){
  float h = 0., a = .18; vec2 d = vec2(1., .3); mat2 R = mat2(.8, .6, -.6, .8);
  for (int i = 0; i < 5; i++) { h += a*sin(dot(p, d)*1.1 + iTime*(1.2 - float(i)*.12)); d = R*d*1.7; a *= .45; }
  return h;
}
vec3 skyCol(vec3 dir){
  vec3 sun = normalize(vec3(-.4, .08, 1.));
  vec3 cl = mix(vec3(1., .48, .24), vec3(.25, .17, .38), pow(max(dir.y, 0.), .45));
  return mix(cl, vec3(2.5, 1.8, 0.6), pow(max(0.0, dot(dir, sun)), 600.0));
}
void mainImage(out vec4 fragColor, in vec2 fragCoord){
  vec2 uv = (fragCoord.xy*2. - iResolution.xy)/iResolution.y;
  vec3 ro = vec3(0., 1.2, 0.), rd = normalize(vec3(uv.x, uv.y - .25, 2.2));
  gAt = vec3(0., .75, 6.); gSize = .8;
  travel(ro, rd, 3.);
  vec3 sun = normalize(vec3(-.4, .08, 1.));
  vec3 col = skyCol(rd);
  float t = .1; bool water = false, obj = false;
  for (int i = 0; i < 110; i++) {
    vec3 p = ro + rd*t; float dw = (p.y - wave(p.xz))*.6, dob = objSdf(p);
    float d = min(dw, dob);
    if (d < .002*t) { water = dw < dob; obj = !water; break; }
    t += d; if (t > 60.) break;
  }
  vec3 p = ro + rd*t;
  if (water) {
    vec2 e = vec2(.02, 0.);
    vec3 n = normalize(vec3(wave(p.xz-e.xy) - wave(p.xz+e.xy), 2.*e.x, wave(p.xz-e.yx) - wave(p.xz+e.yx)));
    vec3 r = reflect(rd, n);
    float fr = .04 + .96*pow(1. - max(dot(-rd, n), 0.), 5.);
    vec3 refl = skyCol(r);
    if (OBJ != 0) { float ot = .05; for (int i = 0; i < 40; i++) { float d = objSdf(p + r*ot); if (d < .004) { refl = vec3(0.4, 0.3, 0.1); break; } ot += d; if (ot > 12.) break; } }
    col = floorSkin(p, mix(vec3(.12,.07,.19), refl, fr));
  } else if (obj) {
    vec2 e = vec2(.002, 0.);
    vec3 n = normalize(vec3(objSdf(p+e.xyy)-objSdf(p-e.xyy), objSdf(p+e.yxy)-objSdf(p-e.yxy), objSdf(p+e.yyx)-objSdf(p-e.yyx)));
    vec3 env = skyCol(reflect(rd, n));
    col = skin(p, env*(.45 + .55*clamp(dot(n, sun), 0., 1.)));
  }
  if (water || obj) col = mix(col, vec3(1.,.55,.33), clamp(t/60., 0., 1.));
  col = mix(col, vec3(1.,.55,.33), pow(1.0 - abs(rd.y), 40.0));
  fragColor = vec4(col, 1.0);
}`;

export const SPACE_SOURCES = [FLOOR, SKY, ENDLESS, CLOUDS, OCEAN];

// ---------- PLASMA family: each form verbatim, with its own palette as ORIG ----------
const PAL = `
#define PI acos(-1.)
float lum(vec3 c){ return dot(clamp(c,0.,1.), vec3(.299,.587,.114)); }
// Palettes from the supplied shaders, driven by one 0..1 value.
vec3 palette(float v, vec3 orig, vec2 st){
  if(uPalette == 1){
  return 0.7 + 0.3*cos(v*6.2831853+vec3(0,2.1,4.2));
} else if(uPalette == 2){
  float w = v*2.-1.; return vec3(sin(PI*w), sin(PI*w+2.0*PI/(3.0+sin(iTime))), cos(PI*w+4.0*PI/(4.0+sin(iTime))))*0.5+0.5;
} else if(uPalette == 3){
  float x = v*6.-3.; return vec3(sin(x*PI*0.16), sin(x*PI*0.33), sin(x*PI*0.66));
} else if(uPalette == 4){
  float a = sign(sin(v*25.)), b = sign(sin(v*17.+1.)); return max(vec3(1,0,0)*a, vec3(0,1,0)) + max(vec3(1,0,0)*b, vec3(0,1,0)) - vec3(0,1,0);
} else if(uPalette == 5){
  vec3 c = vec3(v)*vec3(1.,0.1,0.), c1 = vec3(1.-v)*vec3(0.,0.1,1.); return mix(c1, c + .8, c);
} else {
  if(uPalette == 7) return vec3(mod(floor(st.x*6.)+floor(st.y*6.),2.));
  return .5 + .5*cos(v*6.2831853+vec3(0.,2.,4.));
}
}`;

const P_CLASSIC = `void form(out vec3 col, out float v, in vec2 fragCoord){
    vec2 p = 6.0*fragCoord/iResolution.xy;
    float f = sin(p.x + sin(2.0*p.y + iTime)) + sin(length(p)+iTime) + 0.5*sin(p.x*2.5+iTime);
    f += uBand.x*.35;
    col = 0.7 + 0.3*cos(f+vec3(0,2.1,4.2));
    v = fract(f/6.2831853);
}`;
const P_RGB = `void form(out vec3 col, out float v, in vec2 fragCoord){
    vec2 uv = fragCoord/iResolution.xy;
    float w1 = sin(10.0*uv.x+iTime);
    float w2 = sin(10.0*(uv.x*sin(iTime/2.0)+uv.y*sin(iTime/3.0))+iTime);
    vec2 c = vec2(uv.x+sin(iTime*0.5), uv.y+cos(iTime*0.33));
    float w3 = sin(sqrt(100.0*(c.x*c.x+c.y*c.y)+1.0)+iTime);
	float w = (w1+w2+w3)/2.0 + uBand.x*.25;
    col = vec3(sin(PI*w), sin(PI*w+2.0*PI/(3.0+sin(iTime))), cos(PI*w+4.0*PI/(4.0+sin(iTime))))*0.5 + 0.5;
    v = clamp(w/3.*.5+.5, 0., 1.);
}`;
const P_BIDOU = `const float scale = 10.0;
float time;
float v1(in vec2 uv) { return sin(uv.x * scale + time); }
float v2(in vec2 uv) { return sin(scale * (uv.x * sin(time / 2.0) + uv.y * cos(time / 3.0)) + time); }
float v3(in vec2 uv) {
    float cx = uv.x + 0.5 * sin(time / 5.0);
    float cy = uv.y + 0.5 * cos(time / 3.0);
    return sin(sqrt(128.0 * (cx * cx + cy * cy) + 1.0) + time);
}
float vv(in vec2 uv) { return v1(uv) + v2(uv) + v3(uv); }
void form(out vec3 col, out float v, in vec2 f){
    time = iTime;
	vec2 uv = (f.xy / iResolution.xy) - vec2(0.5);
    uv.x *= iResolution.x / iResolution.y;
    float x = vv(uv) + uBand.x*.4;
    vec4 c = vec4(0.0);
    c.r += sin(x * PI * 0.16);
    c.g += sin(x * PI * 0.33);
    c.b += sin(x * PI * 0.66);
    // Dither is an explicit output effect, not part of this form.
    col = c.rgb; v = clamp(x/6.+.5, 0., 1.);
}`;
const P_DEMO = `const vec2 vp = vec2(320.0, 200.0);
void form(out vec3 col, out float v, in vec2 fragCoord){
	float t = iTime * 10.0;
	vec2 uv = fragCoord.xy / iResolution.xy;
    vec2 p0 = (uv - 0.5) * vp;
    vec2 hvp = vp * 0.5;
	vec2 p1d = vec2(cos( t / 98.0),  sin( t / 178.0)) * hvp - p0;
	vec2 p2d = vec2(sin(-t / 124.0), cos(-t / 104.0)) * hvp - p0;
	vec2 p3d = vec2(cos(-t / 165.0), cos( t / 45.0))  * hvp - p0;
    float sum = 0.5 + 0.5 * (
		cos(length(p1d) / 30.0) +
		cos(length(p2d) / 20.0) +
		sin(length(p3d) / 25.0) * sin(p3d.x / 20.0) * sin(p3d.y / 15.0)) + uBand.x*.15;
    v = fract(sum);
    col = 0.7 + 0.3*cos(v*6.2831853+vec3(0,2.1,4.2));
}`;
const P_INTERF = `void form(out vec3 col, out float v, in vec2 fc){
    vec2 fragCoord = fc * (800. / iResolution.x);
	vec2 origin = vec2(sin(iTime*1.),+cos(iTime*1.));
    vec2 origin2 = vec2(sin(iTime*1.5),+cos(iTime*2.));
    float k = 0.2 * (1. - uBand.x*.08);
	float f = sign(sin(distance(fragCoord.xy, origin * 150.0  + vec2(400.0,230.0))*k));
    float f2 = sign(sin(distance(fragCoord.xy, origin2 * 150.0  + vec2(400.0,230.0))*k));
	vec3 m = max( vec3(1,0,0) * f, vec3(0,1,0));
    vec3 n = max( vec3(1,0,0) * f2, vec3(0,1,0));
	col = m + n;
    v = (f*.5+.5)*.5 + (f2*.5+.5)*.5;
}`;
const P_TUNNEL = `float map(float v, float v_min, float v_max, float out1, float out2)
{
    if ( v_max - v_min == 0. ) return out2;
    return (clamp(v,v_min,v_max) - v_min) / (v_max - v_min) * (out2-out1)+out1;
}
void form(out vec3 col, out float v, in vec2 fragCoord){
    float ar = iResolution.y / iResolution.x;
    vec2  rolling = vec2(sin(iTime), cos(iTime));
    vec2 uv = vec2( map(fragCoord.x,0., iResolution.x,-1.,1.),  map(fragCoord.y,0., iResolution.y,-ar,ar)    ) + rolling*0.25;
    float z = 1.5 / max(length(uv),0.0001);
    float angle = map( atan(uv.y,uv.x), -PI, PI, 0., 1. );
    float zmax =  map(rolling.x,-1.,1.,0.02,0.15);
    float fade = map(z,0.,15.,1.,0.) ;
    vec3 color =   vec3(    (texture(iChannel0, vec2( angle    +rolling.y*0.04, z * zmax + iTime*0.2)).r ))   *  vec3(1.,0.1,0.);
    vec3 color1 =  vec3(    (texture(iChannel0, vec2( angle+0.1+rolling.y*0.04, z * zmax + iTime*0.01)).b ))  *  vec3(0.,0.1,1.);
    col = (mix(color1 , color + .8, color  )) * fade * fade * (1. + uBand.x*.15);
    v = clamp(lum(col), 0., 1.);
}`;
export const FORM_SOURCES = [P_CLASSIC, P_RGB, P_BIDOU, P_DEMO, P_INTERF, P_TUNNEL];
export const SKIN_PAL = PAL;
export const SURFACE_FORMS = FORM_SOURCES.map((f, i) => f.replace(/\bform\(/g, `form${i}(`)).join("\n") + `
void surfaceForm(int selected, out vec3 col, out float v, vec2 fc){
  if(selected==0) form0(col,v,fc);
  else if(selected==1) form1(col,v,fc);
  else if(selected==2) form2(col,v,fc);
  else if(selected==3) form3(col,v,fc);
  else if(selected==4) form4(col,v,fc);
  else form5(col,v,fc);
}`;
export const PLASMA_SOURCES = FORM_SOURCES.map(f => `${PAL}
${f}
void mainImage(out vec4 c, in vec2 f){ vec3 col; float v; form(col, v, f); c = vec4(palette(v, col, f/iResolution.y), 1.); }`);
