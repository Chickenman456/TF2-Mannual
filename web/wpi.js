/* The war paint window (CTFItemInspectionPanel), from Chickenman's TF2 UI redesign prototype ("Working Version").
   The war paints, their operations and every pattern texture are read from the linked TF2 files (proto_defs.vpd, the VPKs);
   the weapon models come from store3d.js (window.ZW). */
// ============ WAR PAINTS: CTFItemInspectionPanel ============
// resource/ui/econ/inspectionpanel.res rendered by mod/vgui.js; behaviour from tf/vgui/tf_item_inspection_panel.cpp
// (opened the way charinfo_loadout_subpanel.cpp's "paintkit_preview" command does: a random paintkit-able weapon,
// no fixed item / no fixed paintkit = every paintkit listed). Skins are composited live from the game's
// scripts/protodefs/proto_defs.vpd paintkit operation trees (econ_paintkit.cpp GetItemPaintKitDefinitionKV)
// with the stdshaders/compositor_ps2x.fxc math, on the game's own pattern + weapon mask textures.
(function(){
let VG=null;const YRES=v=>VG.YRES(v);
const SND=n=>window.ZSND&&ZSND(n);
let D=null,ROOT=null,HOST=null,ST=null,VIEW=null;
const WNAME={scattergun:'Scattergun',pistol:'Pistol',grenadelauncher:'Grenade Launcher',rocketlauncher:'Rocket Launcher',shotgun:'Shotgun',flamethrower:'Flame Thrower',minigun:'Minigun',sniperrifle:'Sniper Rifle',smg:'SMG',medigun:'Medi Gun',stickybomb_launcher:'Stickybomb Launcher',revolver:'Revolver',knife:'Knife',wrench:'Wrench',soda_popper:'Soda Popper',blackbox:'Black Box'};
const WEAR=['','#TFUI_InvTooltip_FactoryNew','#TFUI_InvTooltip_MinimalWear','#TFUI_InvTooltip_FieldTested','#TFUI_InvTooltip_WellWorn','#TFUI_InvTooltip_BattleScared'];
// ---------------- the war paint data, read from the game's own files (the Mann-ual) ----------------
// scripts/protodefs/proto_defs.vpd holds the paintkit definitions as protobuf messages (tf_proto_def_messages.proto), in blocks of
// [type u32][count u32] then count x [size u32][message]; the paint names are in resource/tf_proto_obj_defs_english.txt.
// They're turned into the shape the compositor reads: P paintkits (name, variables, operation, per weapon [item def, variables], team
// textures), I paintkit item definitions (per wear [operation, variables]), O operations (variables, node tree), W the weapons shown.
const W16={scattergun:'c_scattergun',pistol:'c_pistol',grenadelauncher:'c_grenadelauncher',rocketlauncher:'c_rocketlauncher',shotgun:'c_shotgun',flamethrower:'c_flamethrower',minigun:'c_minigun',sniperrifle:'c_sniperrifle',smg:'c_smg',medigun:'c_medigun',stickybomb_launcher:'c_stickybomb_launcher',revolver:'c_revolver',knife:'c_knife',wrench:'c_wrench',soda_popper:'c_soda_popper',blackbox:'c_blackbox'};
// CMsgPaintKit_Definition's per-weapon fields, from field 6 on
const PKW=['paintkit_tool','flamethrower','grenadelauncher','knife','medigun','minigun','pistol','revolver','rocketlauncher','scattergun','shotgun','smg','sniperrifle','stickybomb_launcher','ubersaw','wrench','amputator','atom_launcher','back_scratcher','battleaxe','bazaar_sniper','blackbox','claidheamohmor','crusaders_crossbow','degreaser','demo_cannon','demo_sultan_sword','detonator','gatling_gun','holymackerel','jag','lochnload','powerjack','quadball','reserve_shooter','riding_crop','russian_riot','scimitar','scorch_shot','shortstop','soda_popper','tele_shotgun','tomislav','trenchgun','winger_pistol'];
function pbf(b){const out=[];let o=0;const vi=()=>{let r=0,s=0,c;do{c=b[o++];r+=(c&127)*2**s;s+=7}while(c>=128);return r};
 while(o<b.length){const k=vi(),f=Math.floor(k/8),w=k&7;let v;if(w==0)v=vi();else if(w==2){const l=vi();v=b.subarray(o,o+l);o+=l}else if(w==5){v=b.subarray(o,o+4);o+=4}else if(w==1){v=b.subarray(o,o+8);o+=8}else throw new Error('proto_defs: wire type '+w);out.push([f,w,v])}return out}
const pget=(F,n)=>F.filter(x=>x[0]==n).map(x=>x[2]),pone=(F,n,d)=>{let r=d;for(const x of F)if(x[0]==n)r=x[2];return r};
const UTF8=new TextDecoder(),pstr=v=>v&&v.length?UTF8.decode(v):'';
// CMsgVarField: its value (string, float, ints, bool), else a reference to the variable it names
function pval(F){for(const [f,,x] of F){if(f==9)return pstr(x);if(f==2)return String(new DataView(x.buffer,x.byteOffset,4).getFloat32(0,true));if(f>=4&&f<=8)return String(x)}return null}
// in a variable list a field's value wins; in an operation node the variable it names wins (its value is only the default)
function pfield(b){const F=pbf(b),x=pval(F);if(x!=null)return x;const v=pone(F,1);return v&&v.length?'$'+pstr(v):''}
function nfield(b){const F=pbf(b),v=pone(F,1);if(v&&v.length)return '$'+pstr(v);const x=pval(F);return x!=null?x:''}
const pvars=L=>L.map(v=>[pstr(pone(pbf(v),1)),pfield(v)]);
function phead(b){const F=pbf(b);return{id:pone(F,1),pre:!!pone(F,5,0),vars:pget(F,6).map(v=>{const V=pbf(v);return[pstr(pone(V,1)),pstr(pone(V,3)),pone(V,2,1)]})}}
const TSN=['texture','texture_red','texture_blue','adjust_black','adjust_offset','adjust_gamma','rotation','translate_u','translate_v','scale_uv','flip_u','flip_v'],CSN=['adjust_black','adjust_offset','adjust_gamma','rotation','translate_u','translate_v','scale_uv','flip_u','flip_v'];
function pnode(b){const F=pbf(b),t=pone(F,2);if(t)return['@',pone(pbf(t),1)];
 const [f,,v]=pbf(pone(F,1))[0],S=pbf(v),o={};
 if(f==1){for(const [g,,x] of S)o[TSN[g-1]]=nfield(x);return['T',o]}
 if(f>=2&&f<=4){for(const [g,,x] of S)if(g<=9)o[CSN[g-1]]=nfield(x);return[{2:'add',3:'lerp',4:'multiply'}[f],o,pget(S,11).map(pnode)]}
 if(f==5)return['sel',nfield(pone(S,1)),pget(S,2).map(nfield)];
 if(f==6){const st=[];for(const [g,,x] of S){if(g==1){const s={};for(const [h,,y] of pbf(x))s[['base','weight','spec'][h-1]]=nfield(y);st.push(s)}else if(g>=2&&g<=7)o[['dest_tl','dest_tr','dest_bl','adjust_black','adjust_offset','adjust_gamma'][g-2]]=nfield(x)}return['stk',o,st,pget(S,9).map(pnode)]}
 throw new Error('proto_defs: stage '+f)}
function buildPD(buf,locBytes){const b=buf instanceof Uint8Array?buf:new Uint8Array(buf),dv=new DataView(b.buffer,b.byteOffset,b.byteLength),B={};let o=0;
 while(o<b.length){const t=dv.getUint32(o,true),n=dv.getUint32(o+4,true);o+=8;const L=B[t]=[];for(let i=0;i<n;i++){const s=dv.getUint32(o,true);L.push(b.subarray(o+4,o+4+s));o+=4+s}}
 let txt='';if(locBytes){const u=locBytes instanceof Uint8Array?locBytes:new Uint8Array(locBytes);txt=new TextDecoder(u[0]==0xFF&&u[1]==0xFE?'utf-16le':'utf-8').decode(u)}
 const LOC={};for(const m of txt.matchAll(/"([^"\n]+)"\s+"([^"\n]*)"/g))LOC[m[1]]=m[2];
 const O={},I={},P={};
 for(const m of B[7]||[]){const F=pbf(m),h=phead(pone(F,1));O[h.id]={v:h.vars,n:pget(F,2).map(pnode)}}
 for(const m of B[8]||[]){const F=pbf(m),h=phead(pone(F,1));I[h.id]={idx:pone(F,2),v:h.vars,d:pget(F,4).map(x=>{const X=pbf(x),ot=pone(X,1);return[ot?pone(pbf(ot),1):null,pvars(pget(X,2))]})}}
 for(const m of B[9]||[]){const F=pbf(m),h=phead(pone(F,1));if(h.pre)continue;const n=LOC[pstr(pone(F,2))];if(!n)continue;const it={};
  const old=[];for(const [f,,v] of F){if(f===5){old.push(v);continue}const k=f>=6?PKW[f-6]:null;if(!k||!W16[k]||it[k])continue;const X=pbf(v),dt=pone(X,5);it[k]=[pone(pbf(pone(X,1)),1),dt?pvars(pget(pbf(dt),4)):[]]}
  // the collection paintkits (Gun Mettle and later: Night Owl, Blue Mew...) list their weapons in "item" (field 5), each by its
  // paintkit item definition, whose item_definition_index names the weapon; resolved after all of them are read (below)
  if(!Object.keys(it).length&&!old.length)continue;const op=pone(F,3);P[h.id]={n,v:h.vars,op:op?pone(pbf(op),1):null,it,team:pone(F,4,0),old}}
 // their paintkit item definition is the decorated weapon itself (item_definition_index 15000 = the Night Owl Sniper Rifle):
 // the weapon is the one whose model it uses (c_sniperrifle)
 {const byIdx={},byMdl={};for(const k in P)for(const wk in P[k].it){const t=I[P[k].it[wk][0]];if(t&&t.idx!=null)byIdx[t.idx]=wk}for(const wk in W16)byMdl[W16[wk]]=wk;
  const wkOf=idx=>{if(byIdx[idx])return byIdx[idx];const Z=window.ZLIVE,e=Z&&Z.entry&&Z.entry('#'+idx);const mp=e&&e.r&&(e.r.model_player||e.r.model_world);const b=mp?String(mp).replace(/\\/g,'/').split('/').pop().replace(/\.mdl$/i,'').toLowerCase():null;return b&&byMdl[b]||null};
  for(const k in P){const pk=P[k];for(const v of pk.old){const X=pbf(v),tid=pone(pbf(pone(X,1)),1),dt=pone(X,5),t=I[tid];const wk=t&&wkOf(t.idx);if(wk&&!pk.it[wk])pk.it[wk]=[tid,dt?pvars(pget(pbf(dt),4)):[]]}
   delete pk.old;if(!Object.keys(pk.it).length)delete P[k]}}
 return{P,I,O,W:W16,T:{}}}
window.ZWPD={build:buildPD};
let LOADP=null;
const load=()=>D?Promise.resolve(D):(LOADP||(LOADP=(async()=>{const Z=window.ZLIVE;if(!Z||!Z.ready)throw new Error('nolink');
 const [b,l]=await Promise.all([Z._read('scripts/protodefs/proto_defs.vpd'),Z._read('resource/tf_proto_obj_defs_english.txt')]);if(!b)throw new Error('nofile');D=buildPD(b,l);return D})().catch(e=>{LOADP=null;throw e})));

// ---------------- paintkit KV (econ_paintkit.cpp CPaintKitDefinition::GetItemPaintKitDefinitionKV) ----------------
function resolve(pkid,wk,wear){const pk=D.P[pkid],[tid,dv]=pk.it[wk],it=D.I[tid];let op=pk.op,base=pk.v;
 const wd=it.d[Math.max(0,Math.min(wear-1,it.d.length-1))];if(wd&&wd[0]!=null){op=wd[0];base=D.O[op].v}
 const V={};base.forEach(([n,v,c])=>V[n]=[v,c]);const up=(n,v)=>{const e=V[n];if(e&&e[1]&&e[0]!==v)e[0]=v};
 dv.forEach(([n,v])=>up(n,v));it.v.forEach(([n,v])=>up(n,v));if(wd)wd[1].forEach(([n,v])=>up(n,v));
 const out={};for(const k in V)out[k]=V[k][0];return{op,V:out}}
function hasTeam(pkid){const pk=D.P[pkid];if(pk.team)return true;const wk=Object.keys(pk.it)[0];const {op}=resolve(pkid,wk,1);let t=false;const w=n=>{if(t)return;if(n[0]=='@')D.O[n[1]].n.forEach(w);else if(n[0]=='T'){if(n[1].texture_blue)t=true}else if(n[0]=='stk')n[3].forEach(w);else if(n[0]!='sel')n[2].forEach(w)};D.O[op].n.forEach(w);return t}

// ---------------- CUniformRandomStream (vstdlib/random.cpp, Numerical Recipes ran1) ----------------
function RNG(seed){const NTAB=32,IA=16807,IM=2147483647,IQ=127773,IR=2836,NDIV=1+Math.floor((IM-1)/NTAB),AM=1/IM,RNMX=1-1.2e-7;let idum=seed<0?seed:-seed,iy=0;const iv=new Array(NTAB).fill(0);
 const gen=()=>{let j,k;if(idum<=0||!iy){if(-idum<1)idum=1;else idum=-idum;for(j=NTAB+7;j>=0;j--){k=Math.floor(idum/IQ);idum=IA*(idum-k*IQ)-IR*k;if(idum<0)idum+=IM;if(j<NTAB)iv[j]=idum}iy=iv[0]}
  k=Math.floor(idum/IQ);idum=IA*(idum-k*IQ)-IR*k;if(idum<0)idum+=IM;j=Math.floor(iy/NDIV);if(j>=NTAB||j<0)j=((j%NTAB)+NTAB)%NTAB;iy=iv[j];iv[j]=idum;return iy};
 return{f:(lo,hi)=>{let fl=AM*gen();if(fl>RNMX)fl=RNMX;return fl*(hi-lo)+lo}}}

// ---------------- textures (game VTFs -> webp, packed) ----------------
const TEX={};
const tkey=t=>String(t||'').toLowerCase().replace(/\\/g,'/').replace(/\.(tga|vtf|psd)$/,'');
// the game's own VTFs (materials/<path>.vtf), read out of the linked TF2 files; the weapon-group masks stay at full size and unfiltered
function tex(path,raw){const k=tkey(path)+(raw?'#raw':'');if(TEX[k])return TEX[k];
 return TEX[k]=(async()=>{const b=await window.ZLIVE._read('materials/'+tkey(path)+'.vtf');if(!b)return null;const V=window.ZLIVE._vtf(b,raw?4096:2048);if(!V)return null;
  const t=new THREE.DataTexture(new Uint8Array(V.px),V.w,V.h,THREE.RGBAFormat);t.flipY=false;t.wrapS=t.wrapT=THREE.RepeatWrapping;
  if(raw){t.minFilter=t.magFilter=THREE.NearestFilter;t.generateMipmaps=false}else{t.encoding=THREE.sRGBEncoding;t.anisotropy=8;t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true}
  t.needsUpdate=true;return t})().catch(()=>null)}

// ---------------- compositor (compositor_ps2x.fxc) ----------------
const CVS=`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`;
const CFS=`precision highp float;varying vec2 vUv;uniform sampler2D t0,t1,t2,t3;uniform mat3 m0,m1,m2,m3;uniform vec3 a0,a1,a2,a3;uniform int n,mode;uniform float sel[16];
uniform vec2 sTL,sTR,sBL;uniform float hasSpec;
vec3 l2s(vec3 c){return mix(12.92*c,1.055*pow(max(c,vec3(0.)),vec3(1./2.4))-.055,step(vec3(.0031308),c));}
vec3 s2l(vec3 c){return mix(c/12.92,pow((c+.055)/1.055,vec3(2.4)),step(vec3(.04045),c));}
vec4 adj(vec4 c,vec3 a){if(a.x==0.&&a.y==1.&&a.z==1.)return c;c=vec4(l2s(c.rgb),c.a);float dd=a.y-a.x;if(abs(dd)<1e-5)dd=1e-5;vec4 p=clamp((c-a.x)/dd,0.,1.);p=pow(p,vec4(a.z));return clamp(vec4(s2l(p.rgb),p.a),0.,1.);}
vec4 S(sampler2D t,mat3 m,vec3 a){return adj(texture2D(t,(m*vec3(vUv,1.)).xy),a);}
void main(){
 if(mode==3){float g=floor(texture2D(t0,vUv).x*255./16.+.5);bool any=false;for(int i=0;i<16;i++){if(sel[i]!=0.&&floor(sel[i]+.5)==g)any=true;}gl_FragColor=any?vec4(1.):vec4(0.);return;}
 if(mode==6){vec4 c0=S(t0,m0,a0);vec2 e1=sTR-sTL,e2=sBL-sTL,d=vUv-sTL;float det=e1.x*e2.y-e1.y*e2.x;vec2 st=vec2(d.x*e2.y-d.y*e2.x,e1.x*d.y-e1.y*d.x)/det;
  vec4 c1=vec4(0.);float sp=1.;if(all(greaterThanEqual(st,vec2(0.)))&&all(lessThanEqual(st,vec2(1.)))){c1=adj(texture2D(t1,st),a1);if(hasSpec>.5)sp=texture2D(t2,st).r;}
  gl_FragColor=vec4((1.-c1.a)*c0.rgb+c1.a*c1.rgb,(1.-c1.a)*c0.a+c1.a*sp);return;}
 vec4 c0=n>0?S(t0,m0,a0):vec4(0.),c1=n>1?S(t1,m1,a1):vec4(0.),c2=n>2?S(t2,m2,a2):vec4(0.),c3=n>3?S(t3,m3,a3):vec4(0.);
 if(mode==0){vec4 r=c0;if(n>1)r*=c1;if(n>2)r*=c2;if(n>3)r*=c3;gl_FragColor=r;}
 else if(mode==1){gl_FragColor=c0+c1+c2+c3;}
 else if(mode==2){gl_FragColor=n==3?mix(c0,c1,c2.xxxx):vec4(1.,0.,0.,1.);}
 else gl_FragColor=c0;}`;
let CQ=null;
function cq(){if(CQ)return CQ;const u={t0:{value:null},t1:{value:null},t2:{value:null},t3:{value:null},m0:{value:new THREE.Matrix3()},m1:{value:new THREE.Matrix3()},m2:{value:new THREE.Matrix3()},m3:{value:new THREE.Matrix3()},
 a0:{value:new THREE.Vector3(0,1,1)},a1:{value:new THREE.Vector3(0,1,1)},a2:{value:new THREE.Vector3(0,1,1)},a3:{value:new THREE.Vector3(0,1,1)},n:{value:0},mode:{value:0},sel:{value:new Array(16).fill(0)},sTL:{value:new THREE.Vector2()},sTR:{value:new THREE.Vector2()},sBL:{value:new THREE.Vector2()},hasSpec:{value:0}};
 const m=new THREE.ShaderMaterial({uniforms:u,vertexShader:CVS,fragmentShader:CFS,depthTest:false,depthWrite:false});const sc=new THREE.Scene();sc.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),m));
 return CQ={u,sc,cam:new THREE.Camera(),white:mk1([255,255,255,255]),black:mk1([0,0,0,0])}}
function mk1(c){const t=new THREE.DataTexture(new Uint8Array(c),1,1);t.needsUpdate=true;return t}
async function composite(r,pkid,wk,wear,team,seed,size){const {op,V}=resolve(pkid,wk,wear);const rng=RNG(seed);const Q=cq();const rts=[];
 const val=s=>{let g=0;while(typeof s=='string'&&s[0]=='$'&&g++<8)s=V[s.slice(1)]!=null?V[s.slice(1)]:'';return s==null?'':String(s)};
 const range=s=>{const a=val(s).trim().split(/\s+/).map(Number).filter(x=>!isNaN(x));if(!a.length)return null;return a.length>1?rng.f(a[0],a[1]):a[0]};
 // CTextureCompositor ParseRangeThenDivideBy<255> / ParseInverseRangeFromKV / ParseRangeFromKV
 const params=f=>{const o={};const b=f.adjust_black!=null?range(f.adjust_black):null,w=f.adjust_offset!=null?range(f.adjust_offset):null,g=f.adjust_gamma!=null?range(f.adjust_gamma):null;
  // adjust_offset is the white point's distance from adjust_black (photoshop levels: in-black, in-black+offset)
  {const bb=b==null?0:b,ww=w==null?255-bb:w;o.a=new THREE.Vector3(bb/255,(bb+ww)/255,g==null||g==0?1:1/g)}
  const rot=f.rotation!=null?range(f.rotation):0,tu=f.translate_u!=null?range(f.translate_u):0,tv=f.translate_v!=null?range(f.translate_v):0,sc=f.scale_uv!=null?range(f.scale_uv):1;
  const fu=f.flip_u!=null&&/^(1|true)$/i.test(val(f.flip_u)),fv=f.flip_v!=null&&/^(1|true)$/i.test(val(f.flip_v));
  const m=new THREE.Matrix3(),c=Math.cos((rot||0)*Math.PI/180),s=Math.sin((rot||0)*Math.PI/180),k=sc||1;
  // uv' = R(rot) * (uv * scale) + translate, flips mirror the result
  m.set(c*k*(fu?-1:1),-s*k*(fu?-1:1),(tu||0),s*k*(fv?-1:1),c*k*(fv?-1:1),(tv||0),0,0,1);o.m=m;o.ident=!rot&&!tu&&!tv&&k==1&&!fu&&!fv;return o};
 const newRT=()=>{const t=new THREE.WebGLRenderTarget(size,size,{type:THREE.HalfFloatType,depthBuffer:false,wrapS:THREE.RepeatWrapping,wrapT:THREE.RepeatWrapping,minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter});rts.push(t);return t};
 const pass=(mode,ins,extra)=>{const u=Q.u;u.mode.value=mode;u.n.value=ins.length;for(let i=0;i<4;i++){const s=ins[i];u['t'+i].value=s?s.t:Q.white;u['m'+i].value=s?s.m:new THREE.Matrix3();u['a'+i].value=s?s.a:new THREE.Vector3(0,1,1)}if(extra)extra(u);
  const rt=newRT();r.setRenderTarget(rt);r.render(Q.sc,Q.cam);r.setRenderTarget(null);return rt.texture};
 async function ev(n){
  if(n[0]=='@'){const ns=D.O[n[1]].n;return ev(ns[0])}
  if(n[0]=='T'){const f=n[1];let tp=f.texture;if(team=='BLU'&&f.texture_blue)tp=f.texture_blue;else if(f.texture_red&&(!f.texture||team=='RED'))tp=f.texture_red;const p=params(f);
   const t=await tex(val(tp));return{t:t||Q.white,m:p.m,a:p.a}}
  if(n[0]=='sel'){const g=await tex(val(n[1]),true);const sv=new Array(16).fill(0);n[2].forEach((s,i)=>{if(i<16){const v=+val(s)||0;sv[i]=v/16}});
   const t=pass(3,[{t:g||Q.black,m:new THREE.Matrix3(),a:new THREE.Vector3(0,1,1)}],u=>{u.sel.value=sv});return{t,m:new THREE.Matrix3(),a:new THREE.Vector3(0,1,1)}}
  if(n[0]=='stk'){const p=params(n[1]);const base=await ev(n[3][0]);let tot=0;const ws=n[2].map(s=>{const w=+val(s.weight||'1')||1;tot+=w;return w});let pick=rng.f(0,tot),si=0;for(;si<ws.length-1;si++){if(pick<ws[si])break;pick-=ws[si]}
   const s=n[2][si]||{};const bp=val(s.base);const st=await tex(bp);let sp=s.spec?await tex(val(s.spec)):await tex(bp.replace(/(\.[a-z]+)?$/i,'_spec'));
   const v2=s=>{const a=val(s).split(/\s+/).map(Number);return new THREE.Vector2(a[0]||0,a[1]||0)};
   const t=pass(6,[base,{t:st||Q.black,m:new THREE.Matrix3(),a:new THREE.Vector3(0,1,1)},{t:sp||Q.white,m:new THREE.Matrix3(),a:new THREE.Vector3(0,1,1)}],u=>{u.sTL.value=v2(n[1].dest_tl||'0 0');u.sTR.value=v2(n[1].dest_tr||'1 0');u.sBL.value=v2(n[1].dest_bl||'0 1');u.hasSpec.value=sp?1:0});
   return{t,m:p.m,a:p.a}}
  // combine_add / combine_lerp / combine_multiply
  const p=params(n[1]);const kids=[];for(const c of n[2])kids.push(await ev(c));const mode={add:1,lerp:2,multiply:0}[n[0]];
  let t;if(mode==2||kids.length<=4)t=pass(mode,kids.slice(0,mode==2?3:4));else{let acc=kids.slice(0,4);t=pass(mode,acc);for(let i=4;i<kids.length;i+=3){t=pass(mode,[{t,m:new THREE.Matrix3(),a:new THREE.Vector3(0,1,1)},...kids.slice(i,i+3)])}}
  return{t,m:p.m,a:p.a}}
 const root=await ev(D.O[op].n[0]);const fin=pass(9,[root]);const keep=rts.find(x=>x.texture===fin);rts.forEach(x=>{if(x!==keep)x.dispose()});return keep}

// ---------------- ModelInspectionPanel (CTFModelInspectionPanel / CBaseModelPanel) ----------------
async function mkView(host){await ZW.init();const r=new THREE.WebGLRenderer({antialias:true,alpha:true});r.setPixelRatio(Math.min(2,devicePixelRatio));r.outputEncoding=THREE.sRGBEncoding;
 const sc=new THREE.Scene(),cam=new THREE.PerspectiveCamera(30,1,.5,4000);const v={r,sc,cam,yaw:40,pitch:0,spin:1,spinT:0,manip:0,lastManip:0,cur:null,key:null,maps:[],host};
 // drag to rotate (allow_rot / allow_pitch, max_pitch 30); auto spin pauses while manipulated, resumes after 2s (OnThink)
 v.zoom=1;v.px=0;v.py=0;let dr=null;r.domElement.style.pointerEvents='none';r.domElement.style.position='absolute';
 // input is caught at window level (the canvas covers the page and ignores the mouse; panels are rebuilt on every visit) and only counts
 // when it lands on the inspection page outside its controls (v.ok, set by open()). Left drag rotates; right / middle / shift drag pans
 // once zoomed; the wheel zooms toward the cursor; double click resets
 const ok=e=>v.r.domElement.isConnected&&v.ok&&v.ok(e.target);const rh=()=>v.host.getBoundingClientRect();
 v.setZoom=(z,mx=0,my=0)=>{z=Math.max(.2,Math.min(1,z));const h=rh().height,k0=v.span?v.span()/h:0;v.zoom=z;const k1=v.span?v.span()/h:0;v.px+=mx*(k0-k1);v.py-=my*(k0-k1);if(z>=1){v.px=0;v.py=0}v.clampPan&&v.clampPan();v.fit&&v.fit();v.onZoom&&v.onZoom(z)};
 // the footer Zoom button: ease between fit and a close-up (smoothstep, like the loadout's ToggleZoom)
 v.toggleZoom=()=>{const z0=v.zoom,z1=z0<.99?1:.42,p0=[v.px,v.py];let k=0;cancelAnimationFrame(v._za);const st=()=>{k=Math.min(1,k+.07);const e=k*k*(3-2*k);v.px=p0[0]*(1-e);v.py=p0[1]*(1-e);v.setZoom(z0+(z1-z0)*e);if(k<1)v._za=requestAnimationFrame(st)};st()};
 addEventListener('contextmenu',e=>{if(ok(e))e.preventDefault()});
 addEventListener('pointerdown',e=>{if(!ok(e))return;const pan=e.button!==0||e.shiftKey;dr={x:e.clientX,y:e.clientY,yaw:v.yaw,p:v.pitch,pan,px:v.px,py:v.py};if(!pan)v.manip=1;e.preventDefault()});
 addEventListener('pointermove',e=>{if(!dr)return;if(dr.pan){const k=v.span?v.span()/rh().height:0;v.px=dr.px-(e.clientX-dr.x)*k;v.py=dr.py+(e.clientY-dr.y)*k;v.clampPan&&v.clampPan();v.fit&&v.fit();return}
  v.yaw=dr.yaw+(e.clientX-dr.x)*.5;v.pitch=Math.max(-30,Math.min(30,dr.p+(e.clientY-dr.y)*.3))});
 addEventListener('wheel',e=>{if(!ok(e))return;e.preventDefault();e.stopPropagation();cancelAnimationFrame(v._za);const b=rh();v.setZoom(v.zoom*Math.pow(1.0015,e.deltaY),e.clientX-b.left-b.width/2,e.clientY-b.top-b.height/2)},{passive:false,capture:true});
 addEventListener('dblclick',e=>{if(!ok(e))return;cancelAnimationFrame(v._za);v.px=0;v.py=0;v.setZoom(1)});
 const up=()=>{if(!dr)return;dr=null;v.manip=0;v.lastManip=performance.now()};addEventListener('pointerup',up);addEventListener('pointercancel',up);
 let last=performance.now();const loop=()=>{if(!r.domElement.isConnected){v.dead=1;return}requestAnimationFrame(loop);
  // weapon still streaming in (model or its textures): hide it and turn the TF logo in its place
  {const ld=!!v.key&&(!v.cur||!!(window.ZTEXP&&ZTEXP(v.cur)));if(ld!==v._ld){v._ld=ld;r.domElement.style.transition='opacity .25s';r.domElement.style.opacity=ld?'0':''}if(window.ZLSP)ZLSP(r.domElement,ld)}
  const t=performance.now(),dt=Math.min(.1,(t-last)/1000);last=t;
  // spin_vel: 0 instantly while manipulating, back to 1 over 2s (INTERPOLATOR_BIAS .75) once released
  if(v.manip){v.spin=0;v.spinT=0}else if(v.lastManip&&t-v.lastManip>2000){v.spinT=Math.min(1,v.spinT+dt/2);const b=.75,x=v.spinT;v.spin=Math.pow(x,Math.log(b)/Math.log(.5));if(v.spinT>=1)v.lastManip=0}
  v.yaw+=30*v.spin*dt;if(v.cur){v.cur.rotation.set(0,0,0);v.cur.rotateOnWorldAxis(new THREE.Vector3(1,0,0),(7+v.pitch)*Math.PI/180);v.cur.rotateOnWorldAxis(new THREE.Vector3(0,1,0),v.yaw*Math.PI/180)}
  r.render(sc,cam)};v.loop=()=>{last=performance.now();v.dead=0;loop()};host.appendChild(r.domElement);loop();return v}
// the canvas covers the whole page (W x H, panel at ox,oy inside it) so a zoomed weapon isn't cut at the panel edge; the camera is still
// framed for the panel (setViewOffset with the panel as the 'full' view and the page as an off-centre sub-window of it)
function sizeView(v,w,h,ox=0,oy=0,W=w,H=h){const c=v.r.domElement;v.r.setSize(W,H,false);c.style.width=W+'px';c.style.height=H+'px';c.style.left=-ox+'px';c.style.top=-oy+'px';
 c.style.maskImage=c.style.webkitMaskImage=`linear-gradient(180deg,transparent,#000 14px)`;
 v.cam.aspect=w/h;v.cam.setViewOffset(w,h,-ox,-oy,W,H);v.cam.updateProjectionMatrix();if(v.fit)v.fit()}
async function showWeapon(v,key){if(v.key===key)return v.cur;v.key=key;if(v.cur){v.sc.remove(v.cur);v.cur=null}
 let src,man;try{[src,man]=await Promise.all([ZW.wload(key),ZW.wman()])}catch(e){return null}if(v.key!==key)return null;
 const o=new THREE.Group(),inner=new THREE.Group();v.maps=[];
 src.forEach(s=>{const MI=(man[key]||{})[s.material.name]||{};const P=MI.red||{};const stock=P.map?ZW.tex('models/'+P.map,true):null;
  const m=ZW.mat(P,stock);const n=new THREE.Mesh(s.geometry,m);n.frustumCulled=false;inner.add(n);v.maps.push({m,stock})});
 inner.updateMatrixWorld(true);const bb=new THREE.Box3().setFromObject(inner),sz=bb.getSize(new THREE.Vector3()),cen=bb.getCenter(new THREE.Vector3());inner.position.sub(cen);
 // lay the weapon on its side like the inspect panel: longest axis across the screen, thinnest towards the camera
 const ax=['x','y','z'].sort((a,b)=>sz[a]-sz[b]);const D3={x:new THREE.Vector3(1,0,0),y:new THREE.Vector3(0,1,0),z:new THREE.Vector3(0,0,1)};const q=new THREE.Quaternion().setFromUnitVectors(D3[ax[0]],new THREE.Vector3(0,0,1));const tmp=D3[ax[2]].clone().applyQuaternion(q).normalize();const q2=new THREE.Quaternion().setFromUnitVectors(tmp,new THREE.Vector3(1,0,0));
 const hold=new THREE.Group();hold.add(inner);hold.quaternion.copy(q2.multiply(q));o.add(hold);v.sc.add(o);v.cur=o;
 const L=sz[ax[2]];v.zoom=1;v.px=0;v.py=0;const T=Math.tan(v.cam.fov*Math.PI/360);
 v.span=()=>2*T*L*.8/Math.min(1,v.cam.aspect)*v.zoom;// world height visible at the weapon's depth
 v.clampPan=()=>{const m=L*.5*(1-v.zoom);v.px=Math.max(-m,Math.min(m,v.px));v.py=Math.max(-m,Math.min(m,v.py))};
 v.fit=()=>{const d=L*.8/T/Math.min(1,v.cam.aspect)*v.zoom;v.cam.position.set(v.px,v.py,d);v.cam.lookAt(v.px,v.py,0)};v.fit();return o}
function applySkin(v,rt){v.maps.forEach(({m,stock})=>{m.map=rt?rt.texture:stock;m.needsUpdate=true})}

// ---------------- vgui controls the .res needs (ComboBox, Slider, TextEntry, CNavigationPanel) ----------------
function combo(p,onPick){p.items=[];p.row=0;p.st.enabled=p.p.enabled!=='0';const fg=VG.rgba(p.p.fgcolor_override)||VG.rgba('TanLight');
 const box=document.createElement('div');box.className='vgcombo';p.el.appendChild(box);const tx=document.createElement('span');tx.className='vgctx';box.appendChild(tx);const ar=document.createElement('i');ar.className='vgcar';box.appendChild(ar);
 p.setRows=(items,row)=>{p.items=items;p.row=row||0;p.sync()};
 p.sync=()=>{const f=VG.font(p.p.font)||VG.font('Default');tx.style.fontFamily=f.fam;tx.style.fontSize=f.px+'px';tx.style.color=VG.css(p.st.enabled?fg:VG.rgba(p.p.disabledfgcolor_override)||fg);tx.textContent=p.items[p.row]?VG.loc(p.items[p.row].t):'';box.classList.toggle('off',!p.st.enabled)};
 p.afterPaint=()=>p.sync();
 p.el.addEventListener('pointerdown',e=>{if(!p.st.enabled)return;e.stopPropagation();openMenu(p,onPick)});return p}
function openMenu(p,onPick){closeMenu();SND('buttonclick');const m=document.createElement('div');m.className='vgcmenu';const r=p.el.getBoundingClientRect(),hr=HOST.getBoundingClientRect(),k=hr.width/1920;
 const f=VG.font(p.p.font)||VG.font('Default');const lines=Math.min(p.items.length,10);const lh=Math.round(p.h);
 const below=(r.bottom-hr.top)/k,above=(r.top-hr.top)/k;const mh=lh*lines;const top=below+mh>1030?above-mh:below;m.style.cssText=`left:${(r.left-hr.left)/k}px;top:${top}px;width:${p.w}px;max-height:${lh*lines}px;font:${f.px}px ${f.fam}`;
 p.items.forEach((it,i)=>{const b=document.createElement('div');b.className='vgcmi'+(i==p.row?' on':'');b.style.height=lh+'px';b.style.lineHeight=lh+'px';b.style.paddingLeft=YRES(6/2.25*1)+'px';b.textContent=VG.loc(it.t);
  b.addEventListener('pointerenter',()=>{m.querySelectorAll('.vgcmi.on').forEach(x=>x.classList.remove('on'));b.classList.add('on')});
  b.addEventListener('click',e=>{e.stopPropagation();closeMenu();if(i!==p.row){p.row=i;p.sync();onPick(it,i)}});m.appendChild(b)});
 HOST.appendChild(m);const on=m.querySelector('.on');if(on)m.scrollTop=on.offsetTop-lh*2;
 setTimeout(()=>document.addEventListener('pointerdown',MENUX=e=>{if(!m.contains(e.target))closeMenu()},true))}
let MENUX=null;function closeMenu(){HOST&&HOST.querySelectorAll('.vgcmenu').forEach(x=>x.remove());if(MENUX){document.removeEventListener('pointerdown',MENUX,true);MENUX=null}}
// vgui::Slider: track + tick marks + nob, lefttext/righttext under the ticks (Slider.TrackColor/NobColor/TextColor from ClientScheme)
function slider(p,onMove){const p0=p.p,min=+p0.rangemin||0,max=+p0.rangemax||100,ticks=+p0.numticks||0;p.val=max;p.st.enabled=true;
 const cv=document.createElement('div');cv.className='vgsl';p.el.appendChild(cv);
 const draw=()=>{const w=p.w,h=p.h,nw=YRES(4),th=YRES(4)/2,ty=h*.25,x0=nw/2,x1=w-nw/2;const f=VG.font('DefaultVerySmall')||VG.font('Default');const on=p.st.enabled;const tc=on?'rgba(127,140,127,1)':'rgba(117,117,117,1)';
  let s=`<i style="left:${x0}px;top:${ty}px;width:${x1-x0}px;height:${YRES(2)}px;background:rgb(31,31,31);box-shadow:inset 0 1px rgba(0,0,0,.6)"></i>`;
  for(let i=0;i<=ticks;i++){const x=x0+(x1-x0)*i/Math.max(1,ticks);s+=`<i style="left:${Math.round(x)}px;top:${ty+YRES(5)}px;width:1px;height:${YRES(3)}px;background:${tc}"></i>`}
  const nx=x0+(x1-x0)*(p.val-min)/(max-min);s+=`<i class="nob" style="left:${nx-nw/2}px;top:${ty-YRES(4)}px;width:${nw}px;height:${YRES(10)}px;background:rgb(108,108,108);box-shadow:inset 1px 1px rgba(255,255,255,.25),inset -1px -1px rgba(0,0,0,.6)"></i>`;
  const lab=(t,al)=>`<span style="${al}:0;top:${ty+YRES(9)}px;font:${f.px}px ${f.fam};color:${tc}">${VG.loc(t)}</span>`;s+=lab(p0.lefttext,'left')+lab(p0.righttext,'right');cv.innerHTML=s};
 p.afterPaint=draw;p.set=v=>{p.val=Math.max(min,Math.min(max,v));draw()};
 let drag=false;const at=e=>{const r=p.el.getBoundingClientRect(),k=r.width/p.w;const nw=YRES(4);const x=(e.clientX-r.left)/k;const t=(x-nw/2)/(p.w-nw);return Math.round(min+Math.max(0,Math.min(1,t))*(max-min))};
 p.el.addEventListener('pointerdown',e=>{if(!p.st.enabled)return;drag=true;p.el.setPointerCapture(e.pointerId);const v=at(e);if(v!==p.val){p.set(v);onMove(v)}});
 p.el.addEventListener('pointermove',e=>{if(!drag)return;const v=at(e);if(v!==p.val){p.set(v);onMove(v)}});p.el.addEventListener('pointerup',()=>drag=false);return p}
function textEntry(p,onChange){const i=document.createElement('input');i.className='vgte';i.inputMode=p.p.numericinputonly=='1'?'numeric':'text';i.maxLength=+p.p.maxchars>0?+p.p.maxchars:524288;p.el.appendChild(i);p.input=i;
 p.afterPaint=()=>{const f=VG.font(p.p.font)||VG.font('Default');i.style.fontFamily=f.fam;i.style.fontSize=f.px+'px';i.style.color='rgb(178,178,178)';i.disabled=!p.st.enabled;i.style.paddingLeft=YRES(2)+'px'};
 i.addEventListener('input',()=>{if(p.p.numericinputonly=='1'){const c=i.value.replace(/[^0-9]/g,'');if(c!==i.value)i.value=c}onChange(i.value)});
 i.addEventListener('keydown',e=>e.stopPropagation());return p}

// ---------------- panel ----------------
function build(){const def={n:'InspectionPanel',p:{xpos:'cs-0.5',ypos:'0',zpos:'2000',wide:'f0',tall:'f100',visible:'1',proportionaltoparent:'1'},c:VG.clone(D.vg.c)};
 const r=VG.build(def);
 // CItemModelPanel "ItemName": name_only, text_forcesize 4 (ItemFontNameLarger), text_ypos 15, centered
 const nm=r.find('ItemName');const nl=nm.add({n:'namelabel',p:{controlname:'CExLabel',xpos:'0',ypos:'15',wide:'f0',tall:'30',font:'ItemFontNameLarger',textalignment:'north',mouseinputenabled:'0'},c:[]});nm.type='editablepanel';
 // ModelInspectionPanel: 3D view
 const mp=r.find('ModelInspectionPanel');mp.el.classList.add('vgmodel');
 // CNavigationPanel (team): ButtonSettings + Buttons, laid out horizontally (display_vertically 0, align west)
 const nav=r.find('TeamNavPanel');const bs=nav.p.buttonsettings||{},btns=nav.p.buttons||{};const bw=+(bs.wide||19);
 Object.keys(btns).forEach((k,i)=>{const b=btns[k];const sub=bs.subimage||{};const bd={n:'TeamBtn'+i,p:{...bs,...b,controlname:'CExImageButton',command:'team_'+i,xpos:String(10+i*(bw+2)),ypos:'3'},c:[{n:'SubImage',p:{...sub,...(b.subimage||{}),controlname:'ImagePanel',scaleimage:'1'},c:[]}]};delete bd.p.subimage;const bb=nav.add(bd);bb.team=i==0?'RED':'BLU'});
 const pc=r.find('PaintkitPreviewContainer');pc.vis=true;// !m_bFixedItem || !m_bFixedPaintkit
 combo(pc.find('ComboBoxValidPaintkits'),it=>{SND('buttonclickrelease');ST.pk=it.d;update()});
 combo(pc.find('ComboBoxValidItems'),it=>{SND('buttonclickrelease');ST.wk=it.d;update()});
 slider(pc.find('WearSlider'),v=>{ST.wear=6-v;update()});
 textEntry(pc.find('SeedTextEntry'),v=>{ST.seed=v;update()});
 r.onCommand=c=>{if(c=='random_seed'){const s=(BigInt(Math.floor(Math.random()*0x7fffffff))|(BigInt(Math.floor(Math.random()*0x7fffffff))<<32n)).toString();pc.find('SeedTextEntry').input.value=s;ST.seed=s;update();return}
  if(c=='market'){// The Mann-ual: the Steam Community Market listings for what's previewed
  const q=ST.pk?`${pkName(ST.pk)} ${WNAME[ST.wk]} (${VG.loc(WEAR[ST.wear])})`:WNAME[ST.wk];window.open('https://steamcommunity.com/market/search?appid=440&q='+encodeURIComponent(q),'_blank','noopener');return}if(/^team_/.test(c)){ST.team=c=='team_0'?'RED':'BLU';navSel();update();return}return false};
 return r}
const toast2=t=>{try{(window.APP&&APP.toast||window.toast||(()=>{}))('Steam Community Market isn’t part of this prototype')}catch(e){}};
function navSel(){const nav=ROOT.find('TeamNavPanel');nav.kids.forEach(b=>{if(!b.team)return;b.st.selected=b.team==ST.team;const p=b.p;p._dc=p._dc||p.image_drawcolor;p.image_drawcolor=b.st.selected?p.image_selectedcolor:p._dc;b.paint()})}
function layout(){const hr=HOST.getBoundingClientRect();ROOT.layout();ROOT.paint();const mp=ROOT.find('ModelInspectionPanel');if(VIEW){let ox=0,oy=0,e=mp.el;const top=ROOT._ip.el;while(e&&e!==top){ox+=e.offsetLeft;oy+=e.offsetTop;e=e.offsetParent}
  // the canvas also reaches up over the Items tab bar (MERCS ... WARPAINTS), which fades out while zoomed, so a close-up isn't cut where the bar used to be
  let ext=0;{const hd=document.getElementById('top'),sb=document.getElementById('subtabs');const tr=top.getBoundingClientRect(),k=top.offsetHeight/(tr.height||1);const lim=hd&&hd.getClientRects().length?hd.getBoundingClientRect().bottom:(sb&&sb.getClientRects().length?sb.getBoundingClientRect().top:tr.top);ext=Math.max(0,Math.round((tr.top-lim)*k))}// reach up to the main nav bar
  if(ext){let e=mp.el.parentElement;while(e&&e!==HOST.parentElement){e.style.overflow='visible';e=e.parentElement}}
  sizeView(VIEW,Math.round(mp.w),Math.round(mp.h),ox,oy+ext,top.offsetWidth,top.offsetHeight+ext)}}
const pkName=id=>D.P[id].n;
const BGK=k=>/^(BGImage|ItemName)$/.test(k.name);// passive art: drags / wheel over them reach the 3D view
// RepopulatePaintKitsForItem (all-paintkits mode) / RepopulateItemsForPaintkit
function repop(){const pc=ROOT.find('PaintkitPreviewContainer');const cp=pc.find('ComboBoxValidPaintkits'),ci=pc.find('ComboBoxValidItems');
 if(!ST.pkRows){const ids=Object.keys(D.P).sort((a,b)=>pkName(a).toLowerCase()<pkName(b).toLowerCase()?-1:pkName(a).toLowerCase()>pkName(b).toLowerCase()?1:0);ST.pkRows=[{t:'#Store_ItemDesc_Slot_None',d:null},...ids.map(i=>({t:pkName(i),d:i}))]}
 cp.setRows(ST.pkRows,Math.max(0,ST.pkRows.findIndex(r=>r.d===ST.pk)));
 const ws=ST.pk?Object.keys(D.P[ST.pk].it):[ST.wk];if(!ws.includes(ST.wk))ST.wk=ws[0];
 const rows=ws.map(w=>({t:WNAME[w]||w,d:w})).sort((a,b)=>a.t.localeCompare(b.t));ci.setRows(rows,rows.findIndex(r=>r.d===ST.wk));ci.st.enabled=rows.length>1;ci.sync()}
let GEN=0;
async function update(){const pc=ROOT.find('PaintkitPreviewContainer');repop();const on=!!ST.pk;
 ['WearSlider','SeedTextEntry','NewSeedButton','MarketButton'].forEach(n=>{const c=pc.find(n);c.st.enabled=on;c.paint()});
 const sl=pc.find('WearSlider');sl.set(6-ST.wear);
 ROOT.ctl('TeamNavPanel',on&&hasTeam(ST.pk));if(!(on&&hasTeam(ST.pk)))ST.team='RED';
 const nl=ROOT.find('namelabel');const base=WNAME[ST.wk];nl.o.text=on?`${pkName(ST.pk)} ${base} (${VG.loc(WEAR[ST.wear])})`:base;nl.o.fg=VG.rgba('QualityColorUnique')||[255,215,0,255];
 layout();
 const g=++GEN;await showWeapon(VIEW,D.W[ST.wk]);if(g!==GEN)return;
 if(!on){applySkin(VIEW,null);return}
 const seed=seedInt(ST.seed);const size=1024;const rt=await composite(VIEW.r,ST.pk,ST.wk,ST.wear,ST.team,seed,size).catch(e=>{console.warn('composite',e);return null});
 if(g!==GEN){rt&&rt.dispose();return}if(VIEW.rt)VIEW.rt.dispose();VIEW.rt=rt;applySkin(VIEW,rt)}
function seedInt(s){try{const b=BigInt(String(s||'0').replace(/\D/g,'')||'0');const lo=Number(b&0xffffffffn),hi=Number((b>>32n)&0xffffffffn);return((lo^hi)|0)||0}catch(e){return 0}}
// The Mann-ual: the paint, weapon and wear of an item name ("<paint> War Paint", or a decorated weapon "<paint> <weapon> (<wear>)")
function parse(name){let n=String(name).toLowerCase().replace(/^((strange|unusual|festivized|professional killstreak|specialized killstreak|killstreak)\s+)+/,''),pk=null,pl=0;
 for(const k in D.P){const pn=D.P[k].n.toLowerCase();if(n.startsWith(pn+' ')&&pn.length>pl){pk=k;pl=pn.length}}
 const W=['factory new','minimal wear','field-tested','well-worn','battle scarred'],wm=n.match(/\((factory new|minimal wear|field-tested|well-worn|battle scarred)\)/),rest=pk?n.slice(pl+1).replace(/\s*\(.*\)$/,'').trim():'';
 let wk=Object.keys(WNAME).find(k=>WNAME[k].toLowerCase()===rest)||null;if(pk&&wk&&!D.P[pk].it[wk])wk=null;
 return{pk,wk,wear:wm?W.indexOf(wm[1])+1:0}}
async function open(host,pre){VG=window.VG;await Promise.all([VG.ready(),load()]);const vg=VG.data.res.inspectionpanel;D.vg=vg;
 // The Mann-ual: opened on the war paint (and weapon) that was clicked
 if(pre&&pre.name){const m=parse(pre.name);window.ZWPI.found=!!m.pk;pre={pk:m.pk,seed:'0'};if(m.wk)pre.wk=m.wk;if(m.wear)pre.wear=m.wear}
 if(pre){ST=Object.assign(ST||{wear:1,team:'RED',seed:'0'},pre);if(ST.pk&&!D.P[ST.pk])ST.pk=null;const ws=ST.pk?Object.keys(D.P[ST.pk].it):Object.keys(D.W);if(!ws.includes(ST.wk))ST.wk=ws[Math.random()*ws.length|0]}
 if(!host.isConnected)return;host.innerHTML='<div class="vgroot vgwp" id="wproot"></div>';HOST=host.querySelector('#wproot');
 if(!ST){const ks=Object.keys(D.W);ST={wk:ks[Math.random()*ks.length|0],pk:null,wear:1,team:'RED',seed:'0'}}
 ROOT=VG.build({n:'charinfo',p:{xpos:'0',ypos:'0',wide:'f0',tall:'f0'},c:[]});ROOT.o.y=178;ROOT.o.h=1030-178;ROOT.o.w=1920;ROOT.o.x=0;
 const ip=build();ip.root.btnDef=1;/* plain vgui Buttons get the scheme's Button colours (TanDark, TFOrange armed): the Randomize seed button */ip.o.x=0;ip.o.y=0;ip.o.w=1920;ip.o.h=1030-178;ROOT.kids.push(ip);ip.parent=ROOT;ROOT.el.appendChild(ip.el);ROOT.onCommand=null;HOST.appendChild(ROOT.el);
 const realRoot=ip;ROOT._ip=ip;
 // The Mann-ual: no card behind the weapon (the panel's BGImage), just the weapon over the window
 {const bg=ip.find('BGImage');if(bg&&bg.el){bg.el.style.setProperty('display','none','important');bg.el.style.setProperty('visibility','hidden','important')}}
 const mp=ip.find('ModelInspectionPanel');if(VIEW){mp.el.appendChild(VIEW.r.domElement);if(VIEW.dead)VIEW.loop()}else VIEW=await mkView(mp.el);
 // UI fade: past ~0.75 zoom the page's panels (title, card, team buttons, paintkit controls) fade out, gone by ~0.45 (and stop taking clicks)
 VIEW.host=mp.el;mp.el.style.overflow='visible';const ui=ip.kids.filter(k=>k!==mp&&k.el);
 VIEW.ok=t=>{if(!ip.el.isConnected||!ip.el.contains(t)||t.closest('.vgcmenu'))return false;if(mp.el.contains(t))return true;return !ui.some(k=>k.el.contains(t)&&k.el.style.pointerEvents!=='none'&&!BGK(k))};
 VIEW.onZoom=z=>{const a=Math.max(0,Math.min(1,(z-.45)/.3));[...ui.map(k=>k.el),document.getElementById('subtabs')].forEach(el=>{if(!el)return;el.style.opacity=a;el.style.transition='opacity .12s';el.style.pointerEvents=a<.05?'none':''})};
 VIEW.px=0;VIEW.py=0;VIEW.zoom=1;VIEW.onZoom(1);
 if(!window.__wpSubReset){window.__wpSubReset=1;const rs=()=>{const el=document.getElementById('subtabs');if(el){el.style.opacity='';el.style.pointerEvents=''}};
  document.addEventListener('click',e=>{if(e.target.closest&&e.target.closest('button.nav,[data-act=back]'))rs()},true);document.addEventListener('keydown',e=>{if(e.key=='Escape')rs()},true)}
 ip.find('SeedTextEntry').input.value=ST.seed;navSel();await update()}
// footer Zoom button (shown on this page too, stage.css) toggles the inspection close-up
document.addEventListener('click',e=>{if(e.target.closest&&e.target.closest('[data-act=z3dzoom]')&&VIEW&&HOST&&HOST.isConnected&&VIEW.r.domElement.isConnected)VIEW.toggleZoom()});
window.addEventListener('keydown',e=>{if(e.key=='Escape'&&HOST&&HOST.querySelector('.vgcmenu')){e.stopImmediatePropagation();e.preventDefault();closeMenu()}},true);
window.ZWPI={ip:()=>ROOT&&ROOT._ip,open,match:async n=>{await load();return parse(n)},dbg:async(pk,wk,wear,team,seed,size=512,node)=>{const r=VIEW.r;const rt=await composite(r,pk,wk,wear||1,team||'RED',seed||0,size);const o=new THREE.WebGLRenderTarget(size,size);const m=new THREE.ShaderMaterial({uniforms:{t:{value:rt.texture}},vertexShader:CVS,fragmentShader:'varying vec2 vUv;uniform sampler2D t;vec3 l2s(vec3 c){return mix(12.92*c,1.055*pow(max(c,vec3(0.)),vec3(1./2.4))-.055,step(vec3(.0031308),c));}void main(){vec4 c=texture2D(t,vUv);gl_FragColor=vec4(l2s(c.rgb),1.);}'});const sc=new THREE.Scene();sc.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),m));r.setRenderTarget(o);r.render(sc,new THREE.Camera());const px=new Uint8Array(size*size*4);r.readRenderTargetPixels(o,0,0,size,size,px);r.setRenderTarget(null);const c=document.createElement('canvas');c.width=c.height=size;const id=c.getContext('2d').createImageData(size,size);id.data.set(px);c.getContext('2d').putImageData(id,0,0);return c.toDataURL()},set:o=>{Object.assign(ST,o);return update()},composite:(...a)=>composite(...a),resolve:(...a)=>resolve(...a),get D(){return D},get ST(){return ST},get VIEW(){return VIEW}};
})();
