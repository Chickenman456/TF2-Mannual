/* The Mann-ual: the Mann Co. Store item preview's 3D merc.
   Ported from Chickenman's TF2 UI redesign prototype ("Working Version"): its loadout merc engine (class models with their
   baked animations, the TF2 skin and EyeRefract shaders after the Source SDK 2013, model-panel lighting, bonemerge, bodygroups,
   team skins, paint, material proxies), its facial animation + jiggle bones, and its live-install reader, which reads cosmetics,
   weapons, styles and taunts straight from your own TF2 files. Class models, textures and face data live in models/. */
// ---- 3D mercs on the loadout screen: TF2 models + textures + animations converted from the decompiled SMDs (all 9 classes) ----
(function(){const lib=u=>new Promise((ok,no)=>{const s=document.createElement('script');s.src=u;s.onload=ok;s.onerror=no;document.head.appendChild(s)});
 const KEY={Scout:'scout',Soldier:'soldier',Pyro:'pyro',Demoman:'demo',Heavy:'heavy',Engineer:'engineer',Medic:'medic',Sniper:'sniper',Spy:'spy'};
 // owned taunt items -> animation clips baked into the class models (Circuit Breaker: Heavy only, from layer_taunt_the_circuit_breaker.smd)
 const TK=[['conga','taunt_conga'],['kazotsky','taunt_russian'],['schadenfreude','taunt_laugh'],['square dance','taunt_dosido_dance'],['rock, paper','taunt_rps_rock_win'],['circuit','taunt_circuit_breaker'],['scaredy','taunt_scaredycat']];
 // taunt clips each class model really contains (checked against the baked .glb animations)
 const ZCLIPS=window.ZCLIPS={"demoman":["taunt_conga","taunt_russian","taunt_laugh","taunt_dosido_dance","taunt_rps_rock_win","taunt_scaredycat"],"engineer":["taunt_conga","taunt_russian","taunt_laugh","taunt_dosido_dance","taunt_rps_rock_win","taunt_scaredycat"],"heavy":["taunt_conga","taunt_russian","taunt_laugh","taunt_dosido_dance","taunt_rps_rock_win","taunt_scaredycat","taunt_circuit_breaker"],"medic":["taunt_conga","taunt_russian","taunt_laugh","taunt_dosido_dance","taunt_rps_rock_win","taunt_scaredycat"],"pyro":["taunt_conga","taunt_russian","taunt_laugh","taunt_dosido_dance","taunt_rps_rock_win","taunt_scaredycat"],"scout":["taunt_conga","taunt_russian","taunt_laugh","taunt_dosido_dance","taunt_rps_rock_win","taunt_scaredycat"],"sniper":["taunt_conga","taunt_russian","taunt_laugh","taunt_dosido_dance","taunt_rps_rock_win","taunt_scaredycat"],"soldier":["taunt_conga","taunt_russian","taunt_laugh","taunt_dosido_dance","taunt_rps_rock_win","taunt_scaredycat"],"spy":["taunt_conga","taunt_russian","taunt_laugh","taunt_dosido_dance","taunt_rps_rock_win","taunt_scaredycat"]};
 const clipFor=n=>{const n0=n;n=String(n||'').toLowerCase().replace(/&#39;|\u2019/g,"'");const k=TK.find(t=>n.includes(t[0]));if(k)return k[1];return (n0&&window.ZLIVE&&ZLIVE.ready&&ZLIVE.hasTaunt(n0,curC||'Scout'))?'live:'+n0:undefined};
 let V=null,boot=null;const M={},loading={};let curC=null;
const ZMAX=1.8,headAt=c=>{const m=M[c];if(!m||!m.o)return null;let h=null;m.o.traverse(x=>{if(!h&&x.isBone&&x.name==='bip_head')h=x});if(!h)return null;m.o.updateMatrixWorld(true);return h.getWorldPosition(new THREE.Vector3())};
 // TF2 player shader, ported from the Source SDK 2013 "skin" pixel shader (VertexLitGeneric + $phong) — skin_ps20b.fxc / common_vertexlitgeneric_dx9.h:
 //  diffuse  = ambientCube(N) + sum( 2 * lightwarp[ saturate(N.L*.5+.5) ] * lightColor )          (half-lambert through $lightwarptexture)
 //  specular = sum( pow(saturate(R.L), exp) * saturate(N.L) * lightColor ) * phongMask * fresnelRanges * $phongboost
 //  rim      = max(spec, sum(pow(R.L, $rimlightexponent)*N.L*color) * rimMask*fresnel4) + ambientCube(V) * $rimlightboost * saturate(rimMask*fresnel4*N.up)
 //  exp = 1 + 149 * exponentTex.r, specTint = mix(1, albedo, exponentTex.g), phong mask = normal.a, rim mask = exponentTex.a ; $phongfresnelranges "[.3 1 8]"
 const VS=`#include <common>
#include <skinning_pars_vertex>
varying vec2 vUv;varying vec3 vViewPosition;varying vec3 vNormalV;varying vec3 vWPos;
void main(){vUv=uv;
#include <beginnormal_vertex>
#include <skinbase_vertex>
#include <skinnormal_vertex>
#include <defaultnormal_vertex>
#include <begin_vertex>
#include <skinning_vertex>
#include <project_vertex>
vViewPosition=-mvPosition.xyz;vNormalV=normalize(transformedNormal);vWPos=(modelMatrix*vec4(transformed,1.)).xyz;}`;
 const FS=`uniform mat3 uvXf;uniform float frames,frame,siOn,hasSiMask,siFresOn,envOn,aTest;uniform vec3 rimTint;uniform vec3 siTint,c2,envTint;uniform vec4 siFres;uniform sampler2D siMask;uniform samplerCube envMap;uniform float envMask;uniform float envSkin,envFres,envCon,envSat,hasEnvMask,aRef,useBA,opac;uniform sampler2D envMaskMap;
uniform sampler2D map,normalMap,expMap,warp;uniform vec2 normalScale;uniform vec3 tint;uniform float tintA,tintOver;uniform float hlOn;uniform float hasNormal,hasExp,expFactor,cExp,maskMode,albTint,rimMaskOn,boost,rimBoost,rimExp,rimOn,specOn;uniform vec3 amb[6],lDir[2],lCol[2],fres;
varying vec2 vUv;varying vec3 vViewPosition;varying vec3 vNormalV;varying vec3 vWPos;
#include <common>
vec3 ambCube(vec3 n){vec3 n2=n*n;return n2.x*(n.x>=0.?amb[0]:amb[1])+n2.y*(n.y>=0.?amb[2]:amb[3])+n2.z*(n.z>=0.?amb[4]:amb[5]);}
vec3 perturb(vec3 eye_pos,vec3 N,vec3 mapN){vec3 q0=dFdx(eye_pos);vec3 q1=dFdy(eye_pos);vec2 st0=dFdx(vUv);vec2 st1=dFdy(vUv);vec3 q1p=cross(q1,N),q0p=cross(N,q0);vec3 T=q1p*st0.x+q0p*st1.x;vec3 B=q1p*st0.y+q0p*st1.y;float det=max(dot(T,T),dot(B,B));if(det<1e-20)return N;float sc=inversesqrt(det);vec3 r=T*(mapN.x*sc)+B*(mapN.y*sc)+N*mapN.z;float l=length(r);return l>1e-5?r/l:N;}
void main(){vec2 tUv=(uvXf*vec3(vUv,1.)).xy;vec2 bUv=frames>1.5?vec2(tUv.x,(fract(tUv.y)+frame)/frames):tUv;// $basetexturetransform + AnimatedTexture frame strip
 vec4 base=texture2D(map,bUv);if(aTest>.5&&base.a<aRef)discard;vec3 albedo=base.rgb;if(tintA>.5){vec3 tc=albedo*tint;tc=mix(tc,tint,tintOver);albedo=mix(albedo,tc,base.a);}albedo*=c2;
 vec3 nV=length(vNormalV)>1e-6?normalize(vNormalV):vec3(0.,0.,1.);if(!gl_FrontFacing)nV=-nV;vec4 nt=texture2D(normalMap,vUv);
 if(hasNormal>.5){vec3 mN=nt.xyz*2.-1.;mN.xy*=normalScale;nV=perturb(-vViewPosition,nV,mN);}
 vec3 N=normalize((vec4(nV,0.)*viewMatrix).xyz);vec3 V=normalize(cameraPosition-vWPos);
 // SpecExponentSampler is TEXTURE_WHITE when the vmt has no $phongexponenttexture
 vec4 ex=hasExp>.5?texture2D(expMap,tUv):vec4(1.);
 float sExp=clamp(expFactor>0.?1.+expFactor*ex.r:(cExp>0.?cExp:1.+149.*ex.r),1.,255.);
 float mask=maskMode<.5?nt.a:(maskMode<1.5?base.a:1.);           // normal.a | $basemapalphaphongmask | flat
 float rimMask=rimMaskOn>.5?ex.a:1.;vec3 tint=albTint>.5?mix(vec3(1.),albedo,ex.g):vec3(1.);
 float f=clamp(1.-dot(N,V),0.,1.);float f2=f*f-.5;float fR=fres.y+(f2>=0.?fres.z:fres.x)*f2;float f4=f*f*f*f;
 vec3 R=2.*N*dot(N,V)-V;vec3 diff=ambCube(N),spec=vec3(0.),rim=vec3(0.);
 for(int i=0;i<2;i++){vec3 L=normalize(lDir[i]);float NL=dot(N,L);float hl=hlOn>.5?clamp(NL*.5+.5,0.,1.):clamp(NL,0.,1.);diff+=2.*texture2D(warp,vec2(hl,.5)).rgb*lCol[i];
  float LR=clamp(dot(R,L),1e-6,1.);float nl=clamp(NL,0.,1.);spec+=pow(LR,sExp)*nl*lCol[i];rim+=pow(LR,rimExp)*nl*lCol[i];}
 spec*=mask*fR*boost*specOn;
 if(rimOn>.5){float rm=rimMask*f4;rim*=rm*rimTint;spec=max(spec,rim);spec+=ambCube(V)*rimBoost*clamp(rm*N.y,0.,1.)*rimTint;}// rimTint: white in the game; tinted for the Voodoo souls' green rim
 vec3 dc=albedo*diff;
 // $selfillum: lerp(diffuse, $selfillumtint*albedo, mask) with the mask from $selfillummask (else base alpha); $selfIllumFresnel scales it by
 // pow(N.V, exp)*scale+bias with the brightness from $selfIllumFresnelMinMaxExp (vertexlitgeneric_dx9_helper.cpp)
 if(siOn>.5){vec3 sm=hasSiMask>.5?texture2D(siMask,tUv).rgb:vec3(base.a);float fz=1.,br=1.;if(siFresOn>.5){fz=clamp(pow(clamp(dot(N,V),0.,1.),siFres.z)*siFres.x+siFres.y,0.,1.);br=siFres.w;}dc=mix(dc,siTint*albedo*br,sm*fz);}
 vec3 col=spec*tint+dc;if(envOn>.5){vec3 ec=textureCube(envMap,vec3(-R.x,R.y,R.z)).rgb;
  // skin_ps20b: mask = base alpha (or the normal alpha), scaled by $envmapfresnel; vertexlit_and_unlit_generic: normal alpha | 1-base alpha | 1, times $envmapmask, contrast + saturation
  if(envSkin>.5){float em=envMask>1.5?nt.a:base.a;col+=mix(1.,fR,envFres)*em*ec*envTint;}
  else{float em=envMask>2.5?1.-base.a:envMask>1.5?nt.a:envMask>.5?base.a:1.;vec3 emk=hasEnvMask>.5?texture2D(envMaskMap,tUv).rgb:vec3(1.);vec3 e=ec*em*emk*envTint;e=mix(e,e*e,envCon);float g=dot(e,vec3(.299,.587,.114));e=mix(vec3(g),e,envSat);col+=e;}}if(any(isnan(col)))col=albedo*diff;gl_FragColor=vec4(max(col,vec3(0.)),1.);
#include <encodings_fragment>
}`;
 // the game's model-panel lighting (CPotteryWheelPanel::CreateDefaultLights, used by CTFPlayerModelPanel / CBaseModelPanel): a flat
 // ambient cube of 0.4 on all six sides and one white directional light pointing straight down (direction 0 0 -1, Source Z-up),
 // fed to studiorender as-is (linear). Second slot is unused (black).
 let LIGHT=null;const mkLight=()=>LIGHT||(LIGHT={amb:[0,0,0,0,0,0].map(()=>new THREE.Color(.4,.4,.4)),dir:[new THREE.Vector3(0,1,0),new THREE.Vector3(0,-1,0)],col:[new THREE.Color(1,1,1),new THREE.Color(0,0,0)]});
 // optional "Model Viewer" lighting (Settings > Graphics > Character Lighting): the model-viewer look - a dimmer flat ambient (0.3) and one
 // white key light that comes from the viewer, raised a little above the eye line, and follows the camera as you orbit
 let LMODE=(()=>{try{return localStorage.getItem('zlight')=='loadout'?'loadout':'viewer'}catch(e){return 'viewer'}})();// Model Viewer is the default
 window.ZLIGHT=m=>{LMODE=m=='viewer'?'viewer':'loadout';try{localStorage.setItem('zlight',LMODE)}catch(e){}if(!LIGHT)return;const a=LMODE=='viewer'?.3:.4;LIGHT.amb.forEach(c=>c.setRGB(a,a,a));if(LMODE!='viewer')LIGHT.dir[0].set(0,1,0)};
 const lightTick=(cam,tgt)=>{if(!LIGHT)return;if(LMODE!='viewer'){if(LIGHT.amb[0].r!==.4)window.ZLIGHT('loadout');return}if(LIGHT.amb[0].r!==.3)LIGHT.amb.forEach(c=>c.setRGB(.3,.3,.3));LIGHT.dir[0].copy(cam.position).sub(tgt).normalize();LIGHT.dir[0].y+=.45;LIGHT.dir[0].normalize()};
 const BLANK=()=>{const t=new THREE.DataTexture(new Uint8Array([128,128,255,255]),1,1);t.needsUpdate=true;return t};
 // material parameters read straight out of TF2's .vmt files (tf2_misc VPK): models/player/*/<class>_red.vmt, *_head_red.vmt, weapons' c_models vmts
 const VMT={body:{exp:20,boost:.3,fres:[.3,1,8],rimExp:4,rimBoost:2,mask:0},head:{exp:20,boost:.3,fres:[.3,1,8],rimExp:4,rimBoost:2,mask:2},pack:{exp:20,boost:.3,fres:[.3,1,8],rimExp:4,rimBoost:2,mask:2},
  pyro_body:{exp:15,boost:1,fres:[2,1,5],rimExp:4,rimBoost:2,mask:0},demo_head:{exp:10,boost:.3,fres:[.1,1,8],rimExp:4,rimBoost:2,mask:2},
  lens:{exp:40,boost:1.2,fres:[.5,1,2],rim:0,mask:2,translucent:1},eyes:{exp:60,boost:.6,fres:[1,1,1],rim:0,mask:2,warp:'eye'},
  w_c_flamethrower:{expFactor:75,albTint:1,rimMask:1,boost:5,fres:[.3,.5,3],rimExp:2,rimBoost:2.5,mask:1,warp:'softened_weapon'},
  w_slapping_glove:{exp:80,boost:.3,fres:[1,5,10],rimExp:4,rimBoost:1,mask:1,warp:'engineer_hands'}};
 // $lightwarptexture is bound without sRGB read in skin_dx9_helper.cpp / eye_refract_helper.cpp (sampler 2 / 4 never get EnableSRGBRead),
 // so the shader uses the raw texel values: no gamma decode here
 const WARPS={};window.ZWARPSET=(n,t)=>{WARPS[n]=t};const getWarp=n=>WARPS[n]||(WARPS[n]=(()=>{const t=new THREE.TextureLoader().load('models/'+n+'_lightwarp.png');t.minFilter=t.magFilter=THREE.LinearFilter;t.generateMipmaps=false;t.encoding=THREE.LinearEncoding;t.wrapS=t.wrapT=THREE.ClampToEdgeWrapping;return t})());
 // $selfIllumFresnelMinMaxExp -> (scale, bias, exp, brightness) as vertexlitgeneric_dx9_helper.cpp packs it
 const FRES=v=>{const mn=v[0],mx=v[1],ex=v[2];const b=mx!=0?mn/mx:0;return new THREE.Vector4(1-b,b,ex,mx)};
 // material proxies (Source materialsystem proxies the cosmetic .vmts use): Sine, LinearRamp, TextureTransform, AnimatedTexture
 const PROX=(()=>{let L=[];const vec=x=>Array.isArray(x)?x.slice():[x];
  return {add(mat,P,u){L.push({mat,P,u});if(L.length>160)L=L.slice(-120)},
   tick(t){for(const e of L){const P=e.P,u=e.u,X=P.xf||{};const vars={'$center':vec(X.center||[.5,.5]),'$scale':vec(X.scale||[1]),'$angle':[X.angle||0],'$translate':vec(X.translate||[0,0]),'$selfillumtint':vec(P.siTint||[1,1,1]),'$selfillumfresnelminmaxexp':vec(P.siFres||[0,1,1])};
    const set=(r,val)=>{const m=r.match(/^(\$[a-z0-9_]+)(?:\[(\d)\])?$/);if(!m)return;const k=m[1];if(!vars[k])vars[k]=[val];if(m[2]!=null)vars[k][+m[2]]=val;else vars[k]=vars[k].map(()=>val)};
    for(const p of P.prox){if(p.t=='sine')set(p.r,p.min+(p.max-p.min)*(Math.sin(2*Math.PI*(t-p.o)/p.p)*.5+.5));
     else if(p.t=='ramp')set(p.r,p.rate*t+p.init);
     else if(p.t=='anim')u.frames.value=p.n,u.frame.value=Math.floor(t*p.fps)%p.n;
     else if(p.t=='xf'){const c=vars[p.c]||[.5,.5],sc=vars[p.s]||[1],a=((vars[p.a]||[0])[0])*Math.PI/180,tr=vars[p.tr]||[0,0];const sx=sc[0],sy=sc.length>1?sc[1]:sc[0];const cs=Math.cos(a),sn=Math.sin(a);
      // uv' = T(center+translate) * Rz(angle) * S(scale) * T(-center)  (CTextureTransformProxy)
      const M=new THREE.Matrix3().set(1,0,-c[0],0,1,-c[1],0,0,1).premultiply(new THREE.Matrix3().set(sx,0,0,0,sy,0,0,0,1)).premultiply(new THREE.Matrix3().set(cs,-sn,0,sn,cs,0,0,0,1)).premultiply(new THREE.Matrix3().set(1,0,c[0]+(tr[0]||0),0,1,c[1]+(tr.length>1?tr[1]:tr[0]||0),0,0,1));u.uvXf.value.copy(M)}}
    const st=vars['$selfillumtint'];u.siTint.value.set(st[0],st.length>1?st[1]:st[0],st.length>2?st[2]:st[0]);if(P.siFres)u.siFres.value.copy(FRES(vars['$selfillumfresnelminmaxexp']))}}}})();
 window.ZPROX=PROX;
 function tf2(m,warp,o){mkLight();o=o||{};const nm=m.name;const P=o.P||VMT[o.key]||VMT[nm]||VMT.body;const fr=P.fres;
  const u={map:{value:m.map},normalMap:{value:(o.normal===false?null:(o.normal||m.normalMap))||BLANK()},hasNormal:{value:(o.normal===false?null:(o.normal||m.normalMap))?1:0},normalScale:{value:new THREE.Vector2(1,1)},
   expMap:{value:o.exp||BLANK()},hasExp:{value:o.exp?1:0},expFactor:{value:P.expFactor||0},cExp:{value:P.exp||0},maskMode:{value:P.mask??0},albTint:{value:P.albTint||0},rimMaskOn:{value:P.rimMask||0},
   boost:{value:P.boost??1},rimBoost:{value:P.rimBoost??1},rimExp:{value:P.rimExp??4},rimOn:{value:P.rim===0?0:1},hlOn:{value:P.phong===0&&!P.halfL?0:1},specOn:{value:(P.spec===0||P.phong===0)?0:1},fres:{value:fr?new THREE.Vector3((fr[1]-fr[0])*2,fr[1],(fr[2]-fr[1])*2):new THREE.Vector3(1,.5,1)},
   warp:{value:P.warp?getWarp(P.warp):warp},tint:{value:new THREE.Color(...(o.tint||P.tintBase||[1,1,1])).convertSRGBToLinear()},
   uvXf:{value:new THREE.Matrix3()},frames:{value:1},frame:{value:0},siOn:{value:P.si?1:0},siTint:{value:new THREE.Vector3(...(P.siTint||[1,1,1]))},siMask:{value:P.siMask?(P.siMask.isTexture?P.siMask:texLoad('models/'+P.siMask)):BLANK()},hasSiMask:{value:P.siMask?1:0},
   siFresOn:{value:P.siFres?1:0},siFres:{value:FRES(P.siFres||[0,1,1])},envOn:{value:P.env?1:0},envTint:{value:new THREE.Vector3(...(P.env||[0,0,0]))},envMap:{value:P.env?(P.envCube||ECUBE()):null},envMask:{value:P.envMask||0},envSkin:{value:P.envSkin?1:0},envFres:{value:P.envFres||0},envCon:{value:P.envCon||0},envSat:{value:P.envSat??1},hasEnvMask:{value:P.envMaskTex?1:0},envMaskMap:{value:P.envMaskTex||BLANK()},
   aRef:{value:P.aRef||.5},useBA:{value:P.useBA==null?1:P.useBA},opac:{value:P.opac??1},
   aTest:{value:P.aTest?1:0},rimTint:{value:new THREE.Vector3(...(P.rimTint||[1,1,1]))},c2:{value:new THREE.Color(...((P.itemTint&&!P.tintA&&(o.tint||P.tintBase))||P.c2||[1,1,1])).convertSRGBToLinear()},tintA:{value:P.tintA?1:0},tintOver:{value:P.tintOver||0},amb:{value:LIGHT.amb},lDir:{value:LIGHT.dir},lCol:{value:LIGHT.col}};
  const t=new THREE.ShaderMaterial({name:nm,uniforms:u,vertexShader:VS,fragmentShader:FS,side:THREE.FrontSide,transparent:!!(P.translucent||P.additive),depthWrite:!(P.translucent||P.additive),blending:(P.translucent||P.additive)?THREE.CustomBlending:THREE.NormalBlending});
  if(P.translucent||P.additive){t.premultipliedAlpha=true;t.blendEquation=t.blendEquationAlpha=THREE.AddEquation;t.blendSrc=THREE.OneFactor;t.blendDst=P.additive?THREE.OneFactor:THREE.OneMinusSrcAlphaFactor;t.blendSrcAlpha=P.additive?THREE.ZeroFactor:THREE.OneFactor;t.blendDstAlpha=P.additive?THREE.OneFactor:THREE.OneMinusSrcAlphaFactor;
   t.fragmentShader=FS.replace('gl_FragColor=vec4(max(col,vec3(0.)),1.);','float zA=clamp(opac*(useBA>.5?base.a:1.),0.,1.);gl_FragColor=vec4(max(col,vec3(0.)),zA);').replace('#include <encodings_fragment>\n}','#include <encodings_fragment>\ngl_FragColor.rgb*=zA;'+(P.additive?'gl_FragColor.a=0.;':'')+'\n}')}
  if(P.nocull)t.side=THREE.DoubleSide;t.extensions.derivatives=true;
  Object.defineProperty(t,'map',{get:()=>u.map.value,set:v=>{u.map.value=v}});if(P.prox)PROX.add(t,P,u);return t}

 // TF2 "EyeRefract" eyes, after the Source SDK 2013 eye_refract shaders + CStudioRender::R_StudioEyeballPosition:
 //  the iris is projected (not UV mapped) onto the eyeball from its origin along the look direction: uv = 0.5 + dot(P - org, irisU|irisV),
 //  the eyeball-sphere maps ($AmbientOcclTexture "eye-extra", $CorneaTexture "eye-cornea") use the same frame scaled to the eyeball radius,
 //  lit with half-lambert through eye_lightwarp, cornea gets a glossy highlight + "eye-reflection-cubemap-" reflection masked by the cornea bulge.
 const EVS=`#include <common>
#include <skinning_pars_vertex>
varying vec3 vWPos;void main(){
#include <skinbase_vertex>
#include <begin_vertex>
#include <skinning_vertex>
#include <project_vertex>
vWPos=(modelMatrix*vec4(transformed,1.)).xyz;}`;
 // eye_refract_ps2x.fxc (Source SDK 2013), ps_2_b path, TF2 eyeball vmt values: $AmbientOcclColor [1 1 1] (so the AO map has no effect),
 //  $Dilation .5 (no pupil scaling), $Glossiness 1, $ParallaxStrength .25, $CorneaBumpStrength 1, $RaytraceSphere 0, $halflambert 1 + eye_lightwarp.
 //  Iris projection from R_StudioEyeballPosition: projU = left*-iris_scale (w = .5 - dot(org,projU.xyz)), projV = up*-iris_scale.
 const EFS=`uniform sampler2D iris,ao,cornea,warp;uniform samplerCube env;uniform vec3 org,eU,eV,eF,amb[6],lDir[2],lCol[2];uniform float iS,sS;varying vec3 vWPos;
vec3 ambCube(vec3 n){vec3 n2=n*n;return n2.x*(n.x>=0.?amb[0]:amb[1])+n2.y*(n.y>=0.?amb[2]:amb[3])+n2.z*(n.z>=0.?amb[4]:amb[5]);}
void main(){vec3 d=vWPos-org;vec3 lft=normalize(eU),up=normalize(eV);
 vec3 N=normalize(d);vec3 T=normalize(cross(up,N));vec3 B=normalize(cross(N,T));
 vec3 vv=normalize(vWPos-cameraPosition);vec3 tv=normalize(vec3(dot(vv,T),dot(vv,B),dot(vv,N)));
 vec2 cUv=vec2(.5-dot(d,eU)*iS,.5-dot(d,eV)*iS);vec2 sUv=cUv*.5+.25;
 vec4 cs=texture2D(cornea,cUv);float off=cs.b;
 vec2 par=(tv.xy*off*.25)/(1.-tv.z);par.x=-par.x;
 vec2 iUv=sUv-par;float noise=texture2D(iris,sUv+par*.5).a;
 vec3 ctn=vec3((cs.rg-.5)+noise*.1,1.);ctn=normalize(ctn);vec3 cN=normalize(ctn.x*T+ctn.y*B+ctn.z*N);
 vec3 bent=normalize(-dot(N,lft)*.5*lft+N);vec3 vl=ambCube(bent);
 float avgA=dot((amb[0]+amb[1]+amb[2]+amb[3]+amb[4]+amb[5])/6.,vec3(.333));
 vec3 itn=vec3(ctn.xy*-2.5,ctn.z);vec3 il=vec3(0.);vec3 R=reflect(vv,cN);vec3 sp=vec3(0.);
 for(int i=0;i<2;i++){vec3 L=normalize(lDir[i]);float hl=clamp(dot(N,L)*.5+.5,0.,1.);vl+=2.*texture2D(warp,vec2(hl,.5)).rgb*lCol[i];
  vec3 tl=vec3(dot(L,T),dot(L,B),dot(L,N));vec3 tm=-tl;tm.xy*=-.5;tm.z=max(tm.z,.5);tm=normalize(tm);
  float fac=pow(abs(dot(itn,tm)),6.)*.5;float cone=pow(1.-clamp((-tl.z-.25)/.75,0.,1.),4.);il+=fac*cs.a*cone*lCol[i];
  sp+=pow(clamp(dot(R,L),0.,1.),128.)*lCol[i];}
 il+=clamp(dot(itn,-tv),0.,1.)*avgA*cs.a*.5;
 vec3 refl=textureCube(env,vec3(-R.x,R.y,R.z)).rgb;
 vec3 ic=texture2D(iris,iUv).rgb+noise*.1;// iris is an sRGB read (linear), cornea noise from its alpha is added in linear space
 vec3 col=ic*(vl+il)+refl*vl+sp;
 gl_FragColor=vec4(col,1.);
#include <encodings_fragment>
}`;
 // alpha channels here carry data (phong masks in normal.a / base.a, cornea masks), not coverage: an <img> upload lets the browser premultiply and
 // throw away RGB wherever alpha is 0 (that is what wrecked Medic/Spy normal maps and the grenade launcher), so decode to an ImageBitmap with premultiplyAlpha:'none'
 // a material is ready once every texture it samples has its image; loading textures keep a mesh hidden so nothing shows with blank maps
 const texPend=root=>{let p=false;const chk=v=>{if(!p&&v&&v.isTexture&&!v.isCubeTexture&&!v.image&&!(v.userData&&v.userData.zbad))p=true};
  const mat=x=>{if(!x)return;for(const k in x)chk(x[k]);if(x.uniforms)for(const k in x.uniforms){const u=x.uniforms[k];chk(u&&u.value)}};
  (Array.isArray(root)?root:[root]).forEach(r=>r&&r.traverse(n=>{if(n.isMesh)(Array.isArray(n.material)?n.material:[n.material]).forEach(mat)}));return p};
 const texWait=(root,ms)=>new Promise(ok=>{const t0=performance.now();const f=()=>{if(!texPend(root)||performance.now()-t0>ms)ok();else setTimeout(f,40)};f()});
 window.ZTEXP=texPend;
 // the Voodoo-soul textures ship packed in one file (models/zpk.pak.wasm, offsets below) to keep the artifact's file count down
 const ZPKI={"models/demo_body_zombie.webp":[0,57494],"models/demo_body_zombie_blu.webp":[57496,52580],"models/demo_head_zombie.webp":[110076,11826],"models/engineer_body_zombie.webp":[121904,53112],"models/engineer_body_zombie_blu.webp":[175016,53834],"models/engineer_head_zombie.webp":[228852,12538],"models/heavy_body_zombie.webp":[241392,44694],"models/heavy_body_zombie_blu.webp":[286088,44410],"models/heavy_head_zombie.webp":[330500,11624],"models/medic_body_zombie.webp":[342124,35748],"models/medic_body_zombie_blu.webp":[377872,37284],"models/medic_head_zombie.webp":[415156,45114],"models/pyro_body_zombie.webp":[460272,42964],"models/pyro_body_zombie_blu.webp":[503236,42002],"models/sniper_body_zombie.webp":[545240,42728],"models/sniper_body_zombie_blu.webp":[587968,42416],"models/sniper_head_zombie.webp":[630384,13428],"models/soldier_body_zombie.webp":[643812,47690],"models/soldier_body_zombie_blu.webp":[691504,47302],"models/soldier_head_zombie.webp":[738808,12812],"models/spy_body_zombie.webp":[751620,27968],"models/spy_body_zombie_blu.webp":[779588,25200],"models/spy_head_zombie.webp":[804788,8854],"models/spy_head_zombie_blu.webp":[813644,10006],"models/w/all_guts.webp":[823652,24658],"models/w/hwn_heavy_hat.webp":[848312,39118],"models/w/scout_skeleton.webp":[887432,32714]};let ZPKB=null;const zpk=()=>ZPKB||(ZPKB=fetch('models/zpk.pak.wasm').then(r=>{if(!r.ok)throw 0;return r.arrayBuffer()}));
 const rawTex=u=>{const t=new THREE.Texture();t.flipY=false;t.premultiplyAlpha=false;if(ZPKI[u]){const e=ZPKI[u];zpk().then(b=>createImageBitmap(new Blob([new Uint8Array(b,e[0],e[1])],{type:'image/webp'}),{premultiplyAlpha:'none',colorSpaceConversion:'none',imageOrientation:'none'})).then(bm=>{t.image=bm;t.needsUpdate=true}).catch(()=>{t.userData.zbad=1});return t}const fb=()=>new THREE.TextureLoader().load(u,x=>{t.image=x.image;t.needsUpdate=true},undefined,()=>{t.userData.zbad=1});
  if(window.createImageBitmap&&window.fetch)fetch(u).then(r=>r.blob()).then(b=>createImageBitmap(b,{premultiplyAlpha:'none',colorSpaceConversion:'none',imageOrientation:'none'})).then(bm=>{t.image=bm;t.needsUpdate=true}).catch(fb);else fb();return t};
 const ETX={};const eTex=(n,srgb)=>ETX[n]||(ETX[n]=(()=>{const t=rawTex('models/'+n);if(srgb)t.encoding=THREE.sRGBEncoding;t.wrapS=t.wrapT=THREE.ClampToEdgeWrapping;return t})());
 let ECB=null;const ECUBE=()=>ECB||(ECB=(()=>{const t=new THREE.CubeTextureLoader().load([0,1,4,5,3,2].map(i=>'models/eye_env'+i+'.png'));t.encoding=THREE.sRGBEncoding;return t})());
 function eyeMat(m,root){mkLight();const E=m.userData.eye;const u={iris:{value:eTex('eye_iris_'+(E.irisTex||'blue')+'.webp',true)},ao:{value:eTex('eye_ao.png')},cornea:{value:eTex('eye_cornea.png')},env:{value:ECUBE()},warp:{value:getWarp('eye')},
   org:{value:new THREE.Vector3()},eU:{value:new THREE.Vector3()},eV:{value:new THREE.Vector3()},eF:{value:new THREE.Vector3()},iS:{value:E.iris},sS:{value:.43/E.radius},amb:{value:LIGHT.amb},lDir:{value:LIGHT.dir},lCol:{value:LIGHT.col}};
  const t=new THREE.ShaderMaterial({name:m.name,uniforms:u,vertexShader:EVS,fragmentShader:EFS});
  let bone=null;root.traverse(n=>{if(n.isBone&&n.name==E.bone)bone=n});
  const tc=new THREE.Vector3(),qa=new THREE.Quaternion(),QI=new THREE.Quaternion(),MAXA=.42;const o0=new THREE.Vector3(...E.org),up0=new THREE.Vector3(...E.up),f0=new THREE.Vector3(...E.fwd),up=new THREE.Vector3(),f=new THREE.Vector3(),l=new THREE.Vector3(),q=new THREE.Quaternion(),sc=new THREE.Vector3(),ps=new THREE.Vector3();
  // R_StudioEyeballPosition: forward = look dir (straight out of the head), left = forward x up, up = left x forward, then shift by zoffset (the eyes' slight outward angle)
  const tick=()=>{if(!bone)return;bone.matrixWorld.decompose(ps,q,sc);u.org.value.copy(o0).applyMatrix4(bone.matrixWorld);up.copy(up0).applyQuaternion(q).normalize();f.copy(f0).applyQuaternion(q).normalize();
   // eyeball proxy: the eyes look at the viewer (Source sets the eye target to the camera for model panels), limited to a natural range around the head's forward
   if(V&&V.cam){tc.copy(V.cam.position).sub(u.org.value).normalize();qa.setFromUnitVectors(f,tc);const ang=2*Math.acos(Math.min(1,Math.abs(qa.w)));if(ang>MAXA)qa.slerp(QI,1-MAXA/ang);f.applyQuaternion(qa).normalize()}
   l.crossVectors(f,up).normalize();f.addScaledVector(l,E.zoff).normalize();l.crossVectors(f,up).normalize();up.crossVectors(l,f).normalize();const k=1/sc.x;u.eU.value.copy(l).multiplyScalar(k);u.eV.value.copy(up).multiplyScalar(k);u.eF.value.copy(f)};
  return {mat:t,tick}}
 const texLoad=(u,srgb)=>{const t=rawTex(u);if(srgb)t.encoding=THREE.sRGBEncoding;t.wrapS=t.wrapT=THREE.RepeatWrapping;return t};
 // some stand_ poses ship as a single held frame (the game layers its idle noise on top) - add a gentle breathing layer so the merc never freezes
 const _q=()=>new THREE.Quaternion(),_e=new (function(){})();function breathe(m,t){const b=m.BR,w=Math.sin(t*2*Math.PI/3.2),w2=Math.sin(t*2*Math.PI/3.2-.6);const rot=(n,x,y,z)=>{const o=b[n];if(!o)return;const u=o.userData;if(u.brSet&&u.brSet.equals(o.quaternion))o.quaternion.copy(u.brBase);else (u.brBase||(u.brBase=new THREE.Quaternion())).copy(o.quaternion);const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(x,y,z));o.quaternion.multiply(q);(u.brSet||(u.brSet=new THREE.Quaternion())).copy(o.quaternion)};
  rot('bip_spine_2',0,0,w*.012);rot('bip_spine_3',0,0,w2*.01);rot('bip_neck',0,w*.01,-w2*.008);rot('bip_head',0,-w*.012,0);rot('bip_clavicle_l',0,0,w2*.008);rot('bip_clavicle_r',0,0,-w2*.008)}
 window.ZLINR=window.ZLINR||(()=>{const S=new WeakMap();
  // every shader's output clamped to 0..1 as the engine's 8-bit framebuffer stores it (a float target would keep negative / >1 light)
  let patched=false;
  return (r,sc,cam)=>{if(!patched){patched=true;if(!/zclamp/.test(THREE.ShaderChunk.encodings_fragment))THREE.ShaderChunk.encodings_fragment+='\ngl_FragColor=clamp(gl_FragColor,0.,1.);// zclamp'}
   let o=S.get(r);const sz=r.getDrawingBufferSize(new THREE.Vector2());
   if(!o){const rt=new THREE.WebGLRenderTarget(sz.x,sz.y,{type:THREE.HalfFloatType,samples:r.capabilities.isWebGL2?4:0,stencilBuffer:true}/* depth24+stencil: a plain target's 16-bit depth z-fights */);rt.texture.encoding=THREE.LinearEncoding;
    const mat=new THREE.ShaderMaterial({uniforms:{t:{value:rt.texture}},depthTest:false,depthWrite:false,blending:THREE.NoBlending,
     vertexShader:'varying vec2 vU;void main(){vU=uv;gl_Position=vec4(position.xy,0.,1.);}',
     fragmentShader:'uniform sampler2D t;varying vec2 vU;vec3 enc(vec3 c){c=clamp(c,0.,1.);return mix(c*12.92,1.055*pow(c,vec3(1./2.4))-.055,step(.0031308,c));}void main(){vec4 c=texture2D(t,vU);float a=clamp(c.a,0.,1.);gl_FragColor=a>.002?vec4(enc(c.rgb/a)*a,a):vec4(enc(c.rgb),0.);}'});
    const qs=new THREE.Scene();const q=new THREE.Mesh(new THREE.PlaneGeometry(2,2),mat);q.frustumCulled=false;qs.add(q);o={rt,qs,qc:new THREE.Camera()};S.set(r,o)}
   if(o.rt.width!==sz.x||o.rt.height!==sz.y)o.rt.setSize(sz.x,sz.y);
   r.setRenderTarget(o.rt);r.clear();r.render(sc,cam);r.setRenderTarget(null);r.render(o.qs,o.qc)}})();
 async function init(){if(V)return V;if(boot)return boot;boot=(async()=>{
  if(!window.THREE)await lib('vendor/three.min.js');
  if(!THREE.GLTFLoader)await lib('vendor/GLTFLoader.js');
  if(!THREE.OrbitControls)await lib('vendor/OrbitControls.js');
  const W=620,H=830,r=new THREE.WebGLRenderer({antialias:true,alpha:true});r.setPixelRatio(Math.min(2,devicePixelRatio));r.setSize(W,H);r.outputEncoding=THREE.sRGBEncoding;
  const sc=new THREE.Scene(),cam=new THREE.PerspectiveCamera(26,W/H,1,5000);sc.add(new THREE.HemisphereLight(0xd8d2cc,0x4a3f38,.62));const d=new THREE.DirectionalLight(0xfff4e6,1.25);d.position.set(70,110,150);sc.add(d);
  // faint contact/drop shadow on an invisible floor (shadow-only material), cast by the key light
  r.shadowMap.enabled=true;r.shadowMap.type=THREE.VSMShadowMap;const sl=new THREE.DirectionalLight(0xffffff,0);sl.position.set(45,230,70);sc.add(sl);sl.castShadow=true;sl.shadow.mapSize.set(1024,1024);Object.assign(sl.shadow.camera,{left:-80,right:80,top:80,bottom:-80,near:50,far:500});sl.shadow.radius=12;sl.shadow.blurSamples=20;sl.shadow.bias=-.0008;
  {const fl=new THREE.Mesh(new THREE.PlaneGeometry(600,600),new THREE.ShadowMaterial({opacity:.22}));fl.rotation.x=-Math.PI/2;fl.position.y=0;fl.receiveShadow=true;sc.add(fl)}
const d2=new THREE.DirectionalLight(0xbfd2ff,.35);d2.position.set(-120,60,-90);sc.add(d2);
  const warp=getWarp('pyro');
  const fit=42/Math.tan(cam.fov*Math.PI/360)*1.22;cam.position.set(0,43,fit);
  const ctl=new THREE.OrbitControls(cam,r.domElement);ctl.target.set(0,43,0);ctl.enablePan=true;ctl.screenSpacePanning=true;ctl.mouseButtons={LEFT:THREE.MOUSE.ROTATE,MIDDLE:THREE.MOUSE.DOLLY,RIGHT:THREE.MOUSE.PAN};ctl.minDistance=fit*.3;ctl.maxDistance=fit*1.6;r.domElement.addEventListener('contextmenu',e=>e.preventDefault());
  // right-drag pans the merc around; keep the target near the body so it can't be lost off-screen
  ctl.addEventListener('change',()=>{const t=ctl.target;const cx=Math.max(-45,Math.min(45,t.x)),cy=Math.max(5,Math.min(85,t.y)),cz=Math.max(-45,Math.min(45,t.z));if(cx!==t.x||cy!==t.y||cz!==t.z){const d=new THREE.Vector3(cx-t.x,cy-t.y,cz-t.z);t.add(d);cam.position.add(d)}});ctl.minPolarAngle=Math.PI*.38;ctl.maxPolarAngle=Math.PI*.6;ctl.enableDamping=true;ctl.update();
  // loading spinner: the TF logo turning in the middle of the merc view while the model and its items stream in (sits beside the canvas, wherever it is mounted)
  const ZLSP=window.ZLSP=(cv,on)=>{let sp=cv._zsp;if(!sp){sp=cv._zsp=document.createElement('i');sp.className='zldspin';sp.setAttribute('aria-label','Loading')}const par=cv.parentNode;if(on&&par&&sp.parentNode!==par)par.insertBefore(sp,cv.nextSibling);const d=on?'block':'none';if(sp.style.display!==d)sp.style.display=d};
  const clk=new THREE.Clock();let run=false;const loop=()=>{if(!r.domElement.isConnected){run=false;return}requestAnimationFrame(loop);const dt=Math.min(clk.getDelta(),.1);const t=performance.now()/1000;pilotTick(t);const m=curC&&M[curC];if(m)m.seen=performance.now();lightTick(cam,ctl.target);
   if(m&&m.o.visible){if(!m._rdy){const now=performance.now();m._t0=m._t0||now;const fk=curC!='Pyro';if(((!fk||m.face||m._nof)&&m._cdone&&m._wdone&&!m.cpend&&!m.wpend&&!texPend(m.o))||now-m._t0>8000)m._rdy=1}const op=m._rdy?'':'0';if(!r.domElement.style.transition)r.domElement.style.transition='opacity .3s';if(r.domElement.style.opacity!==op)r.domElement.style.opacity=op}
   if(m){const p=m.wpend>0||m.cpend>0;if(p&&!m._lp)m._lp=performance.now();else if(!p)m._lp=0}
   ZLSP(r.domElement,!!curC&&(!m||(m.o.visible&&((!m._rdy&&performance.now()-(m._t0||0)>150)||(m._lp&&performance.now()-m._lp>150)))));if(m&&m.o.visible){if(((m._shf=(m._shf||0)+1)%30)==1)m.o.traverse(n=>{if(n.isMesh&&!n.castShadow)n.castShadow=true});{const a=m.act,L=a&&!a.paused&&a.isRunning()&&a.getClip().zloop;if(L&&a.time+dt*a.timeScale>=L.to)a.time-=L.to-L.from}m.mx.update(dt);if(m._tprop&&m._tprop.pa)propTick(m);invisTick(m);if(m.STATIC&&m.STATIC[m.cn])breathe(m,t);
     if(typeof ianimTick=='function')ianimTick(m,t);
     // player_poseparam layers (the Hot Hand's open slapping hand), on the sequences that autolayer them
     if(m._pl&&/^(stand|run)_MELEE_ALLCLASS$/i.test(m.cn||'')){if(!m._plb){m._plb={};m.o.traverse(n=>{if(n.isBone&&!n.userData.zx)m._plb[n.name]=n})}for(const bn in m._pl){const B=m._plb[bn];if(!B)continue;const v=m._pl[bn];B.quaternion.set(v[0][0],v[0][1],v[0][2],v[0][3]);B.position.set(v[1][0],v[1][1],v[1][2])}}if(m.wmesh){const bare=m.st0.idle==='stand_MELEE_ZOMBIE';if(bare)m.wmesh.forEach(x=>x.visible=false);else if(m._bare)m.wmesh.forEach(x=>x.visible=!/^taunt/.test(m.cn||''));m._bare=bare}if(window.ZFACE)ZFACE.tick(m,dt);m.o.updateMatrixWorld(true);if(window.ZJIG&&ZJIG.tick(m,t))m.o.updateMatrixWorld(true);PROX.tick(t);if(m.eyes)m.eyes.forEach(e=>e())}if(m&&window.ZTFX)ZTFX(m,curC);if(window.ZCIG)ZCIG.tick(m,curC,m&&m.o.visible&&m._rdy&&!(m.zskin&&!m.zsolid)?dt:0,sc);if(window.ZGSMOKE)ZGSMOKE.tick(m&&m.o.visible&&m._rdy?dt:0,sc);if(window.ZHALO)ZHALO.tick(m&&m.o.visible&&m._rdy?dt:0,sc);if(window.ZAURA)ZAURA.tick(m,m&&m.o.visible&&m._rdy?dt:0,sc);if(window.ZPFX)ZPFX.tick(m&&m.o.visible?dt:0,sc,cam);if(window.ZBOLT)ZBOLT.tick(m,dt,sc,cam,r.domElement);ctl.update();ZLINR(r,sc,cam)};
  const ZZ={Scout:20,Sniper:25,Soldier:20,Demoman:22,Medic:30,Heavy:30,Pyro:22,Spy:27,Engineer:20};
  V={r,sc,cam,ctl,fit,warp,storeApply:c=>{const f=V.storeZf!=null?V.storeZf:(V.storeZoom?1:0),f1=Math.min(f,1),g=Math.max(0,f-1)/(ZMAX-1),b=V.storeFS?[221,42]:[190,36];let y=b[1]+f1*(ZZ[c]||20),d=b[0]-f1*100;
   // past the store's close-up the wheel keeps going, in to the merc's head (where hats and their effects sit)
   let x=0,z=0;if(g>0){const h=headAt(c);if(h){y+=(h.y+5-y)*g;x=h.x*g;z=h.z*g}d+=(26-d)*g}
   // plus wherever the view was dragged or zoomed toward the mouse (kept on the merc)
   const P=V.storePan||(V.storePan={x:0,y:0}),bx=x,by=y;x=Math.max(-55,Math.min(55,x+P.x));y=Math.max(0,Math.min(100,y+P.y));P.x=x-bx;P.y=y-by;ctl.target.set(x,y,z);cam.position.set(x,y,z+d);if(V.storeCam&&V.storeCam.md==null)V.storeCam.md=ctl.minDistance;ctl.minDistance=0;ctl.update()},
   zoom:()=>{if(V.storeCam){V.storeZoom=!V.storeZoom;V.storeApply((window.ZPREV&&ZPREV.cls)||curC);return}const z=V.zoomed=!V.zoomed;const t0=ctl.target.clone(),p0=cam.position.clone(),t1=new THREE.Vector3(0,z?58:43,0),dir=p0.clone().sub(t0).normalize(),p1=t1.clone().add(dir.multiplyScalar(z?fit*.48:fit));let k=0;const tok=V._zt=(V._zt||0)+1;const st=()=>{if(V._zt!==tok)return;k=Math.min(1,k+.08);const e=k*k*(3-2*k);ctl.target.lerpVectors(t0,t1,e);cam.position.lerpVectors(p0,p1,e);ctl.update();if(k<1)requestAnimationFrame(st)};st()},go:()=>{if(!run){run=true;clk.getDelta();loop()}}};return V})();return boot}
 function load(c){if(M[c])return Promise.resolve(M[c]);if(loading[c])return loading[c];const k=KEY[c];
  return loading[c]=new Promise((ok,no)=>(window.ZFACE&&ZFACE.preload(c),new THREE.GLTFLoader()).load('models/'+k+'.glb.wasm',g=>{const o=g.scene;o.visible=false;const nrm=texLoad('models/'+k+'_nrm.webp');const cache=new Map(),eyes=[];o.traverse(n=>{if(n.isMesh){n.frustumCulled=false;n.castShadow=true;const m=n.material;if(m.userData&&m.userData.eye){if(!cache.has(m)){const e=eyeMat(m,o);eyes.push(e.tick);cache.set(m,e.mat)}n.material=cache.get(m);return}if(!cache.has(m)){const nm=m.name;if(nm=='lens')m.map=texLoad('models/sniper_lens.webp',true);cache.set(m,tf2(m,V.warp,nm=='body'?{normal:nrm,key:k=='pyro'?'pyro_body':'body'}:nm=='head'?{normal:false,key:k=='demo'?'demo_head':'head'}:{}))}n.material=cache.get(m)}});V.sc.add(o);
   const mx=new THREE.AnimationMixer(o),A={};g.animations.forEach(a=>A[a.name]=mx.clipAction(a));let cur=null;
   const play=(n,once)=>{const a=A[n];const mm0=M[c];if(mm0)mm0._lwant=n;
     if(!a&&/^live:/.test(n)&&window.ZLIVE&&ZLIVE.ready){const bs=new Set();o.traverse(x=>{if(x.isBone)bs.add(x.name)});
      ZLIVE.taunt(n.slice(5),c,bs).then(async r=>{if(!r){if(window.toast)toast('Couldn\u2019t load that taunt from your install');return}A[n]=mx.clipAction(r.clip);if(M[c]){M[c]._ltp=M[c]._ltp||{};M[c]._ltp[n]=r.prop;M[c]._ltps=M[c]._ltps||{};M[c]._ltps[n]=r.pseq}if(window.ZFACE)await ZFACE.addLive(c,n,r.sc,r.urls);if(M[c]&&M[c]._lwant===n)play(n,once)}).catch(e=>console.warn('[ZLIVE] taunt',e));return true}
     if(!a)return false;a.reset();a.setLoop(once?THREE.LoopOnce:THREE.LoopRepeat);a.clampWhenFinished=!!once;if(cur&&cur!==a)a.crossFadeFrom(cur,.25,false);a.paused=false;a.play();cur=a;if(M[c]){M[c].cn=n;M[c].act=a}const tn=/^(taunt|live:)/.test(n);if(M[c]&&tn&&window.ZFACE)ZFACE.start(c,M[c],n,a);
     {const mm=M[c];const fs=tn&&/^live:/.test(n)&&window.ZLIVE&&ZLIVE.ready&&ZLIVE.tauntSlot?ZLIVE.tauntSlot(n.slice(5)):null;
      if(mm&&fs){let W={};try{const S=LOX.ls(c);W=S.P[S.pre].w||{}}catch(e){}if(!mm._tslot0&&mm._wbase)mm._tslot0={slot:mm._wbase.slot,name:W[mm._wbase.slot]||null};mm._tforce=1;
       if(!mm._wbase||mm._wbase.slot!==fs)setWeapon(c,fs,W[fs]||null)}
      else if(mm&&!tn&&mm._tslot0){const b0=mm._tslot0;mm._tslot0=null;mm._tforce=0;setWeapon(c,b0.slot,b0.name)}
      const hw=tn&&!fs&&!(mm&&mm._keepW);if(mm){(mm.wmesh||[]).forEach(x=>x.visible=!hw);(mm.wextra||[]).forEach(x=>x.visible=!hw);mm._wmOff=hw;wmBG(mm);
      // custom_taunt_prop_per_class: bonemerged for the taunt's length
      if(mm._tprop){const r=mm._tprop;mm._tprop=null;r.meshes.forEach(x=>x.parent&&x.parent.remove(x));r.extra.forEach(b=>b.parent&&b.parent.remove(b))}
      const pp=/^live:/.test(n)&&mm._ltp&&mm._ltp[n];const ps=pp&&mm._ltps&&mm._ltps[n];
      // a prop with a scene of its own stands at the merc's feet and plays its sequence in step with the taunt; otherwise it rides prop_bone
      if(pp)Promise.all([bonemerge(mm,c,(ps?'livepropx:':'liveprop:')+pp,null),ps?ZLIVE.propClip(pp,ps.seq).catch(()=>null):null]).then(([r,pc])=>{if(!r)return;if(mm.cn!==n){r.meshes.forEach(x=>x.parent&&x.parent.remove(x));r.extra.forEach(b=>b.parent&&b.parent.remove(b));return}
       if(pc&&r.holder){const px=new THREE.AnimationMixer(r.holder);const pa=px.clipAction(pc);pa.play();r.pmx=px;r.pa=pa;r.poff=ps.off||0;r.ploop=ps.loop;propTick(mm)}mm._tprop=r})}}return true};
   const st0={idle:'stand_PRIMARY'};mx.addEventListener('finished',()=>play(st0.idle));
   // team skins: RED maps ship with the model, BLU maps (models/<class>_<part>_blu.jpg) load on demand
   const mats=[...new Set([...cache.values()].filter(m=>m.name=='body'||m.name=='pack'))];
   const red=new Map(mats.map(m=>[m,m.map])),blu=new Map();
   // "player skin override" (Voodoo-Cursed Souls): the class model switches to its zombie skin family (scout.mdl skins 4/5:
   // scout_red|blue_zombie_alphatest body with $alphatest, scout_head_zombie, eyeball_zombie = glowing eyeball_invun) while the soul is worn
   const heads=[...new Set([...cache.values()].filter(m=>m.name=='head'))],headMap=new Map(heads.map(m=>[m,m.map]));
   const eyeMs=[];o.traverse(n=>{if(n.isMesh&&n.material&&n.material.uniforms&&n.material.uniforms.iris)eyeMs.push(n)});
   const skin=()=>{const t=ZTEAM(c);const z=!!(M[c]&&M[c].zskin)&&ZOMB[k];
    mats.forEach(m=>{const U=m.uniforms;if(!U.__z0)U.__z0=[U.boost.value,U.rimExp.value,U.rimBoost.value];
     if(z&&m.name=='body'){const x=ztex(t=='BLU'?z.blu:z.red);if(m.map!==x){m.map=x;m.needsUpdate=true}U.aTest.value=M[c].zsolid?0:1;U.boost.value=0;U.rimExp.value=15;U.rimBoost.value=.25;U.rimTint.value.set(...ZRIM);return}
     U.aTest.value=0;[U.boost.value,U.rimExp.value,U.rimBoost.value]=U.__z0;U.rimTint.value.set(1,1,1);
     if(t=='BLU'){if(!blu.has(m)){blu.set(m,null);new THREE.TextureLoader().load('models/'+k+'_'+m.name+'_blu.jpg',x=>{x.flipY=false;x.encoding=THREE.sRGBEncoding;blu.set(m,x);skin()})}const x=blu.get(m);if(x){m.map=x;m.needsUpdate=true}}else if(m.map!==red.get(m)){m.map=red.get(m);m.needsUpdate=true}});
    heads.forEach(m=>{const zh=z&&z.head?(t=='BLU'&&z.headBlu?z.headBlu:z.head):null;
     // the Spy's mask is team coloured (spy_head_blue): its BLU map loads on demand like the bodies'
     let hb=null;if(!zh&&t=='BLU'&&k=='spy'){if(!blu.has(m)){blu.set(m,null);new THREE.TextureLoader().load('models/spy_head_blu.jpg',x=>{x.flipY=false;x.encoding=THREE.sRGBEncoding;blu.set(m,x);skin()})}hb=blu.get(m)}
     const x=zh?ztex(zh):(hb||headMap.get(m));if(m.map!==x){m.map=x;m.needsUpdate=true}const U=m.uniforms;U.aTest.value=zh&&z.headAT&&!M[c].zsolid?1:0;if(!U.__z0)U.__z0=[U.rimExp.value,U.rimBoost.value];[U.rimExp.value,U.rimBoost.value]=z?[15,.25]:U.__z0;U.rimTint.value.set(...(z?ZRIM:[1,1,1]))});
    eyeMs.forEach(n=>{if(!n.userData.eyeMat)n.userData.eyeMat=n.material;n.material=z?ZEYE():n.userData.eyeMat;n.visible=!(z&&k=='spy'&&!M[c].zsolid)})};
   const STATIC={};g.animations.forEach(a=>STATIC[a.name]=a.tracks.every(t=>t.times.length<=2));const BR={};o.traverse(n=>{if(n.isBone&&/^bip_(spine_[123]|neck|head|upperArm_[LR]|clavicle_[LR])$/i.test(n.name))BR[n.name.toLowerCase()]=n});const BG={};o.traverse(n=>{if(/^bg_/.test(n.name))BG[n.name.slice(3)]=n});ok(M[c]={o,mx,play,skin,st0,A,STATIC,BR,eyes,BG})},undefined,e=>{delete loading[c];no(e)}))}
 // weapons: stock world models ripped from the game's VPKs (MDL+VVD+VTX -> glb), bonemerged onto the player's skeleton by bone name ($bonemerge),
 // materials rebuilt from their .vmt (phong / exponent maps / lightwarp / rim) and the pyro pilot light's UnlitTwoTexture + Sine/TextureScroll proxies
 // the zombie skins' own .vmt (<class>_red_zombie_alphatest, <class>_head_zombie): $phongboost 0 on the body (.3 on the head),
 // $phongexponent 20, and a faint white rim: $rimlightexponent 15, $rimlightboost .25
 const ZRIM=[1,1,1];
 // zombie skin families per class (<class>.mdl skins 4/5; spy 22/23): <class>_red|blue_zombie_alphatest body, <class>_head_zombie (sniper's
 // and spy's heads are alpha-tested too, spy's has a red and a blue version; pyro has no separate head)
 const ZOMB={scout:{red:'scout_body_zombie.webp',blu:'scout_body_zombie_blu.webp',head:'scout_head_zombie.webp'}};
 ['soldier','pyro','demo','heavy','engineer','medic','sniper','spy'].forEach(k=>{ZOMB[k]={red:k+'_body_zombie.webp',blu:k+'_body_zombie_blu.webp',head:k=='pyro'?null:k+'_head_zombie.webp',headBlu:k=='spy'?'spy_head_zombie_blu.webp':null,headAT:k=='sniper'||k=='spy'}});
 const ZTX={};const ztex=u=>ZTX[u]||(ZTX[u]=texLoad('models/'+u,true));
 // eyeball_zombie: eyeball_invun base with the same texture added back as self-illum detail ($detailblendmode 5) -> a flat yellow glow
 let ZEYEM=null;const ZEYE=()=>ZEYEM||(ZEYEM=new THREE.MeshBasicMaterial({map:ztex('eyeball_invun.webp')}));
 const STOCK={Scout:{primary:'c_scattergun',secondary:'c_pistol',melee:'c_bat'},Soldier:{primary:'c_rocketlauncher',secondary:'c_shotgun',melee:'c_shovel'},Pyro:{primary:'c_flamethrower',secondary:'c_shotgun',melee:'c_fireaxe_pyro'},
  Demoman:{primary:'c_grenadelauncher',secondary:'c_stickybomb_launcher',melee:'c_bottle'},Heavy:{primary:'c_minigun',secondary:'c_shotgun',melee:null},Engineer:{primary:'c_shotgun',secondary:'c_pistol',melee:'c_wrench',pda:'c_builder'},
  Medic:{primary:'c_syringegun',secondary:'c_medigun',melee:'c_bonesaw'},Sniper:{primary:'c_sniperrifle',secondary:'c_smg',melee:'c_machete'},Spy:{secondary:'c_revolver',melee:'c_knife',building:'c_sapper'}};
 const BYNAME={'scattergun':'c_scattergun','pistol':'c_pistol','bat':'c_bat','rocket launcher':'c_rocketlauncher','shotgun':'c_shotgun','shovel':'c_shovel','flame thrower':'c_flamethrower','fire axe':'c_fireaxe_pyro','grenade launcher':'c_grenadelauncher','stickybomb launcher':'c_stickybomb_launcher','bottle':'c_bottle','minigun':'c_minigun','fists':null,'wrench':'c_wrench','construction pda':'c_builder','destruction pda':'c_pda_engineer','syringe gun':'c_syringegun','medi gun':'c_medigun','bonesaw':'c_bonesaw','sniper rifle':'c_sniperrifle','smg':'c_smg','kukri':'c_machete','revolver':'c_revolver','knife':'c_knife','sapper':'c_sapper','disguise kit':'w_cigarette_case','bonk! atomic punch':'c_energy_drink','fancy spellbook':'hwn_spellbook_complete',"baby face's blaster":'c_pep_scattergun','candy cane':'c_candy_cane','the candy cane':'c_candy_cane','force-a-nature':'c_double_barrel','the force-a-nature':'c_double_barrel','soda popper':'c_soda_popper','the soda popper':'c_soda_popper',
  'black box':'c_blackbox',"crusader's crossbow":'c_crusaders_crossbow','prinny machete':'c_prinny_knife','razorback':'knife_shield','bootlegger':'pegleg',"chargin' targe":'c_targe'};
 // weapon-slot items that are worn, not held (tf_wearable / tf_wearable_demoshield / tf_wearable_razorback, anim_slot FORCE_NOT_USED):
 // they bonemerge like cosmetics (hiding items_game player_bodygroups) and the merc holds the next real weapon in the loadout
 const WEARW={knife_shield:[],pegleg:['shoes'],c_targe:[]};
 // ACT_MP_STAND_<anim_slot>: demo's launchers swap anim slots in items_game, the Force-A-Nature / Soda Popper are "anim_slot" "item2", spy's sapper uses its own stance
 // Zombie Infection (zi_ maps): a cursed merc holding his stock melee stands in the infected model's own Stand_MELEE (models/player/<class>_infected.mdl)
 const zIdle=m=>{const b=m._wbase;if(!b)return m.st0.idle;return (m.zskin&&b.slot=='melee'&&(b.stock!=null?b.stock:(b.bk||b.key)==(STOCK[b.c]||{}).melee)&&m.A.stand_MELEE_ZOMBIE)?'stand_MELEE_ZOMBIE':b.anim};
 const ANIM=(c,slot,key)=>key=='c_energy_drink'?'stand_ITEM1':key=='c_prinny_knife'?'stand_MELEE_ALLCLASS':(key=='c_double_barrel'||key=='c_soda_popper')?'stand_ITEM2':key=='hwn_spellbook_complete'?'stand_MELEE_ALLCLASS':c=='Demoman'&&slot=='primary'?'stand_SECONDARY':c=='Demoman'&&slot=='secondary'?'stand_PRIMARY':slot=='building'?(c=='Spy'?'stand_SAPPER':'stand_BUILDING'):slot=='pda'?'stand_PDA':('stand_'+slot.toUpperCase());
 let WMAN=null;const wman=()=>WMAN||(WMAN=fetch('models/w/weapons.json').then(r=>r.json()));
 const WL={};function wload(f){return WL[f]||(WL[f]=new Promise((ok,no)=>new THREE.GLTFLoader().load('models/w/'+f+'.glb.wasm',g=>{let sm=null;g.scene.traverse(n=>{if(n.isSkinnedMesh&&!sm)sm=n});const all=[];g.scene.traverse(n=>{if(n.isSkinnedMesh)all.push(n)});ok(all)},undefined,no)))}
 const PILOT=[];const pilotMat=P=>{const PT=x=>x&&x.isTexture?x:x?texLoad('models/'+x,true):BLANK();const u={map:{value:PT(P.map)},map2:{value:P.map2?PT(P.map2):PT(P.map)},t0:{value:new THREE.Vector2()},t2:{value:new THREE.Vector2()}};
  const m=new THREE.ShaderMaterial({uniforms:u,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,vertexShader:VS.replace('vViewPosition=-mvPosition.xyz;','vViewPosition=-mvPosition.xyz;'),fragmentShader:`uniform sampler2D map,map2;uniform vec2 t0,t2;varying vec2 vUv;varying vec3 vViewPosition;varying vec3 vNormalV;varying vec3 vWPos;
#include <common>
void main(){gl_FragColor=vec4(texture2D(map,vUv+t0).rgb*texture2D(map2,vUv+t2).rgb,0.);
}`});m.extensions.derivatives=true;m.blending=THREE.CustomBlending;m.blendSrc=THREE.OneFactor;m.blendDst=THREE.OneFactor;m.blendSrcAlpha=THREE.ZeroFactor;m.blendDstAlpha=THREE.OneFactor;PILOT.push(u);return m};
 // proxies: Sine ($pilot: period .1, ±.02; $pilot2: period 7, ±.005) -> TextureTransform on $basetexture; TextureScroll rate 3 @ 87° on $texture2
 const pilotTick=t=>{const p=Math.sin(t*2*Math.PI/.1)*.02,p2=Math.sin(t*2*Math.PI/7)*-.005,a=87*Math.PI/180;PILOT.forEach(u=>{u.t0.value.set(p2,p);u.t2.value.set((Math.cos(a)*3*t)%1,(Math.sin(a)*3*t)%1)})};
 window.ZW={init:()=>init(),wload:f=>wload(f),wman:()=>wman(),warp:n=>getWarp(n),tex:(u,s)=>texLoad(u,s),mat:(P,map)=>tf2({name:'weapon',map},getWarp(P.warp||'weapon'),{P,exp:P.expTex?texLoad('models/'+P.expTex):null,normal:P.bump?texLoad('models/'+P.bump):false})};
 function wmat(P,tint){if(P.shader=='unlittwotexture')return pilotMat(P);const TX=(u,s)=>u&&u.isTexture?u:texLoad('models/'+u,s);return tf2({name:'weapon',map:P.map?TX(P.map,true):BLANK()},V.warp,{P:{...P,warp:P.warp},exp:P.expTex?TX(P.expTex):null,normal:P.bump?TX(P.bump):false,tint})}
 async function setWeapon(c,slot,name){const m=M[c];if(!m||!slot||slot=='pda2')return;if(slot=='action')return;
  let nk=wkey(name);
  setCosmetics(c);// worn weapon-slot items live with the cosmetics
  const lworn=n=>!!(n&&!wkey(n)&&window.ZLIVE&&ZLIVE.ready&&ZLIVE.wornWep(n,c));
  if((nk&&WEARW[BYNAME[nk]])||lworn(name)){const order=['primary','secondary','melee'].filter(x=>x!==slot);let P=null;try{const S=LOX.ls(c);P=S.P[S.pre].w}catch(e){}
   const prev=window.ZPREV&&ZPREV.cls==c;slot=null;name=null;nk=null;
   for(const s2 of order){const n2=prev?null:(P&&P[s2]);const k2=n2?wkey(n2):null;if((k2&&WEARW[BYNAME[k2]])||lworn(n2))continue;const st=(STOCK[c]||{})[s2];if(!k2&&!st&&s2!='melee')continue;slot=s2;name=n2;nk=k2;break}
   if(!slot)slot='melee'}
  let key=nk?BYNAME[nk]:(STOCK[c]||{})[slot];
  const isStock=!name||(!!nk&&BYNAME[nk]===(STOCK[c]||{})[slot]);const bkey=(nk||!name)?key:null;const lname=name||(()=>{try{return LOX.stockFor(c,slot)}catch(e){return null}})();
  if(lname&&window.ZLIVE&&ZLIVE.ready&&ZLIVE.hasWep(lname,c))key='live:'+c+':'+((window.ZSTYLE&&ZSTYLE.get(lname))||0)+':'+lname;
  let an0=ANIM(c,slot,bkey||key);if(/^live:/.test(key)){const as=ZLIVE.animSlot(lname,c);if(as&&m.A['stand_'+as])an0='stand_'+as;
   // an anim_slot the page doesn't bake (the Bison's SECONDARY2...): the stand_ sequence straight from the class's animation .mdls
   else if(as){const nm='stand_'+as,bs=new Set();m.o.traverse(x=>{if(x.isBone)bs.add(x.name)});ZLIVE.seq(c,nm,bs).then(cl=>{if(!cl)return;if(!m.A[nm]){m.A[nm]=m.mx.clipAction(cl);m.STATIC[nm]=cl.tracks.every(t=>t.times.length<=2)}
     if(m._wbase&&m._wbase.key===key){m._wbase.anim=nm;const a=zIdle(m);if(m.st0.idle!==a&&!/^(taunt|live:)/.test(m.cn||'')){m.st0.idle=a;m.play(a)}}}).catch(e=>console.warn('[ZLIVE] anim',nm,e))}}
  m._wbase={slot,key,bk:bkey,stock:isStock,anim:an0,c};const anim=zIdle(m);
  if(m.st0.idle!==anim){m.st0.idle=anim;if(!m._tforce)m.play(anim)}
  const fest=/(^|\s)festivized\s/i.test(String(name||''))&&FEST[key];const wk=key+(fest?'#fest':'');
  if(m.wname===wk)return;m.wname=wk;
  const wdrop=()=>{if(m.wmesh){m.wmesh.forEach(x=>x.parent&&x.parent.remove(x));(m.wextra||[]).forEach(b=>b.parent&&b.parent.remove(b));m.wmesh=null}};
  if(!key){wdrop();m._wmHide=null;wmBG(m);m._wdone=1;return}let src,man,fsrc=null;try{[src,man]=/^live:/.test(key)?await ZLIVE.load(key):await Promise.all([wload(key),wman()]);if(fest)fsrc=await wload(fest).catch(()=>null)}catch(e){if(/^live:/.test(key))console.warn('[ZLIVE]',key,e);if(/^live:/.test(key)&&bkey){try{[src,man]=await Promise.all([wload(bkey),wman()]);key=bkey}catch(e2){m._wdone=1;return}}else{m._wdone=1;return}}if(m.wname!==wk)return;
  const pb={};m.o.traverse(n=>{if(n.isBone&&!n.userData.zx)pb[n.name]=n});const extra=[];const team=ZTEAM(c);const bm={};
  const pbl={};for(const k in pb)pbl[k.toLowerCase()]=pb[k];const mk=b=>{if(bm[b.name])return bm[b.name];const pm=pb[b.name]||pbl[b.name.toLowerCase()];if(pm&&!/^c_weapon|^vm_/.test(b.name))return bm[b.name]=pm;const nb=new THREE.Bone();nb.name=b.name;nb.userData.zx=1;nb.position.copy(b.position);nb.quaternion.copy(b.quaternion);const par=b.parent&&b.parent.isBone?mk(b.parent):(pb.weapon_bone||m.o);par.add(nb);extra.push(nb);return bm[b.name]=nb};
  // festivized: the item's attached_models_festive model (strings of lights) bonemerged onto the weapon's own bones
  const meshes=[...src.map(s=>[s,key]),...(fsrc||[]).map(s=>[s,fest])].map(([s,key])=>{const wm=s.clone();const bones=s.skeleton.bones.map(mk);const MI=(man[key]||{})[s.material.name]||{};wm.userData.srcMat=s.material.name;const P=(team=='BLU'&&MI.blu)?MI.blu:MI.red;wm.material=P?wmat(P):s.material;wm.userData.mi=MI;wm.userData.zteam=s.userData.zteam;if(wm.userData.zteam&&wm.material)wm.material.visible=wm.userData.zteam==team;wm.frustumCulled=false;m.o.add(wm);wm.bind(new THREE.Skeleton(bones,s.skeleton.boneInverses),new THREE.Matrix4());return wm});
  if(window.ZJIG&&/^live:/.test(key)&&(man[key]||{})._jig)ZJIG.add(m,bm,man[key]._jig);
  meshes.forEach(x=>x.visible=false);m.wpend=(m.wpend||0)+1;await texWait(meshes,6000);m.wpend--;
  if(m.wname!==wk){meshes.forEach(x=>x.parent&&x.parent.remove(x));extra.forEach(b=>b.parent&&b.parent.remove(b));return}
  var wh=null;if(/^live:/.test(key)&&ZLIVE.wmHide){try{wh=await ZLIVE.wmHide(lname,c)}catch(e){}}if(m.wname!==wk){meshes.forEach(x=>x.parent&&x.parent.remove(x));extra.forEach(b=>b.parent&&b.parent.remove(b));return}
  wdrop();m.wmesh=meshes;m.wextra=extra;m.wteam=team;m._wdone=1;m._keepW=!!(wh&&wh.part=='righthand');const tn=(/^taunt/.test(m.cn||'')||(/^live:/.test(m.cn||'')&&!m._tforce))&&!m._keepW;m._wmOff=tn;meshes.forEach(x=>x.visible=!tn);m._wmHide=wh&&wh.part||null;wmBG(m);
  m._pl=null;if(/^live:/.test(key)&&ZLIVE.poseLayers)ZLIVE.poseLayers(lname,c).then(r=>{if(m.wname===wk)m._pl=r}).catch(()=>{})}

 // cosmetics: the installed ones are bonemerged exactly like weapons (models/workshop/player/items/... ripped from the VPKs) and hide the
 // player bodygroups items_game lists under visuals.player_bodygroups; anything not installed simply doesn't appear on the merc
 const FEST={c_bottle:'c_bottle_festivizer',c_grenadelauncher:'c_grenadelauncher_festivizer',c_stickybomb_launcher:'c_stickybomb_launcher_festivizer'};
 const COSM={'fancy spellbook':'hwn_spellbook_complete',"pyro's beanie":'pyro_hat',"pyro's overalls":'sum26_pyros_overalls','fast food':'sum21_fast_food','meal dealer':'sum21_meal_dealer','fried batter':'sum21_fried_batter','carry-van':'hwn2023_carry_van','dapper noel':k=>'dec24_dapper_noel_'+k,'poolside polo':'sum20_poolside_polo',"doc's holiday":'hawaiian_shirt','balloonicorn':'pet_balloonicorn','fancy dress uniform':'fdu','sweet smissmas sweater':'dec16_smissmas_sweater','hawaiian hangover':'sum22_hawaiian_hangover','warmth preserver':'sbox2014_warmth_preserver','fat friar':'sum25_fat_friar','voodoo-cursed scout soul':'scout_zombie','voodoo-cursed soldier soul':'soldier_zombie','voodoo-cursed pyro soul':'pyro_zombie','voodoo-cursed demoman soul':'demo_zombie','voodoo-cursed heavy soul':'heavy_zombie','voodoo-cursed engineer soul':'engineer_zombie','voodoo-cursed medic soul':'medic_zombie','voodoo-cursed sniper soul':'sniper_zombie','voodoo-cursed spy soul':'spy_zombie','hunk of monk':'sum25_hunk','dogfighter':'xms2013_dogfighter_jacket','outback intellectual':'xms_sniper_sweater_vest','escapist':'fall2013_escapist','misfortune fedora':k=>'hwn2020_misfortune_fedora_'+k};
 const COSBG={'fat friar':['bullets'],"pyro's overalls":['grenades'],'meal dealer':['dogtags'],'fried batter':['hat','headphones'],'dapper noel':['hat','headphones'],'poolside polo':['dogtags'],'sweet smissmas sweater':['grenades'],'misfortune fedora':['hat','headphones']};
 const cnorm=n=>String(n||'').toLowerCase().replace(/^(self-made|strange|unique|vintage|genuine|unusual|haunted|collector's|decorated|festive|the) /g,'').replace(/^(self-made|strange|unusual|haunted|the) /g,'').trim();
 // wm_bodygroup_override (C_TFWeaponBase: pOwner->SetBodygroup while it's the active weapon): the Short Circuit blanks the Engineer's
 // rightarm, the Gunslinger's robot arm included, and only while it's out
 function wmBG(m){if(!m)return;const h=m._wmOff?null:m._wmHide;if(m.BG)for(const k in m.BG)m.BG[k].visible=!((m._cbg&&m._cbg.has(k))||k===h);
  if(h=='rightarm')(m.cmesh||[]).forEach(r=>r.meshes.forEach(x=>{if(/^live_arm/.test(x.name))x.visible=false}));else (m.cmesh||[]).forEach(r=>r.meshes.forEach(x=>{if(/^live_arm/.test(x.name))x.visible=true}))}
 // wearable animation players: per frame, the item's own sequence on its own (non-merged) bones
 const IANIM=[];let iq=null,iq2=null;
 function ianimTick(m,t){if(!iq){iq=new THREE.Quaternion();iq2=new THREE.Quaternion()}for(let i=IANIM.length-1;i>=0;i--){const E=IANIM[i];const any=Object.values(E.B)[0];if(!any||!any.parent){IANIM.splice(i,1);continue}if(E.m!==m)continue;
   const tn=/^(taunt|live:)/.test(m.cn||'');const A=tn?(E.ia.taunt||E.ia.idle):(E.ia.idle||E.ia.taunt);// an item whose only motion is its taunt one (the Orchestrina's music box) shows it in the preview too
   if(A!==E.cur){E.cur=A;E.t0=t}
   if(!A){for(const n in E.B){E.B[n].quaternion.copy(E.rest[n][0]);E.B[n].position.copy(E.rest[n][1])}continue}
   const f=((t-E.t0)*A.fps)%A.nf,f0=Math.floor(f),f1=(f0+1)%A.nf,u=f-f0;
   for(const n in A.b){const B=E.B[n];if(!B)continue;const[Q,P]=A.b[n];iq.fromArray(Q,f0*4);iq2.fromArray(Q,f1*4);B.quaternion.copy(iq).slerp(iq2,u);B.position.set(P[f0*3]+(P[f1*3]-P[f0*3])*u,P[f0*3+1]+(P[f1*3+1]-P[f0*3+1])*u,P[f0*3+2]+(P[f1*3+2]-P[f0*3+2])*u)}}}
 async function bonemerge(m,c,key,tint){let src,man;try{[src,man]=/^livepropx:/.test(key)?await ZLIVE.propOwn(key.slice(10)):/^liveprop:/.test(key)?await ZLIVE.prop(key.slice(9)):/^livexw:/.test(key)?await ZLIVE.loadXW(key):/^live:/.test(key)?await ZLIVE.load(key):await Promise.all([wload(key),wman()])}catch(e){if(/^live(xw)?:/.test(key))console.warn('[ZLIVE]',key,e);return null}
  const pb={};m.o.traverse(n=>{if(n.isBone&&!n.userData.zx)pb[n.name]=n});const extra=[];const team=ZTEAM(c);const bm={};
  const pbl={};for(const k in pb)pbl[k.toLowerCase()]=pb[k];const held=!!(man[key]||{})._held,own=!!(man[key]||{})._own;
  // own: a taunt prop entity - none of its bones merge; its root sits beside the merc's skeleton root, animated on its own (holder)
  let holder=null;if(own){const pr=Object.values(pb).find(b=>!b.parent||!b.parent.isBone);holder=new THREE.Group();holder.name='zprop';((pr&&pr.parent)||m.o).add(holder);extra.push(holder)}
  const mk=b=>{if(bm[b.name])return bm[b.name];const pm=(held||own)?null:(pb[b.name]||pbl[b.name.toLowerCase()]);if(pm)return bm[b.name]=pm;const nb=new THREE.Bone();nb.name=b.name;nb.userData.zx=1;nb.position.copy(b.position);nb.quaternion.copy(b.quaternion);{const br=((man[key]||{})._brot||{})[b.name];if(br)nb.quaternion.multiply(new THREE.Quaternion(...br))}const par=b.parent&&b.parent.isBone?mk(b.parent):(holder||(held&&pb.bip_hand_L)||pb.bip_head||m.o);par.add(nb);extra.push(nb);return bm[b.name]=nb};
  // festivized: the item's attached_models_festive model (strings of lights) bonemerged onto the weapon's own bones
  const meshes=src.map(s=>{const wm=s.clone();const bones=s.skeleton.bones.map(mk);const MI=(man[key]||{})[s.material.name]||{};wm.userData.srcMat=s.material.name;const P=(team=='BLU'&&MI.blu)?MI.blu:MI.red;wm.material=P?wmat(P,P.itemTint&&tint?tint:null):s.material;if(P&&P.itemTint&&tint&&tint.spell!=null&&window.ZSPELL)ZSPELL.reg(wm,tint.spell,team);wm.frustumCulled=false;m.o.add(wm);wm.bind(new THREE.Skeleton(bones,s.skeleton.boneInverses),new THREE.Matrix4());return wm});
  if(window.ZJIG&&(man[key]||{})._jig)ZJIG.add(m,bm,man[key]._jig);
  {const ia=(man[key]||{})._ianim;if(ia){const B={},rest={};for(const n of new Set([...Object.keys((ia.idle||{}).b||{}),...Object.keys((ia.taunt||{}).b||{})])){const x=bm[n];if(x&&x.userData.zx){B[n]=x;rest[n]=[x.quaternion.clone(),x.position.clone()]}}if(Object.keys(B).length)IANIM.push({m,ia,B,rest})}}
  const att={};{const s0=src[0];const AT=(s0&&s0.userData.att)||[];for(const a of AT){const sb=a.bone&&s0.skeleton.bones.find(b=>b.name===a.bone);if(!sb)continue;const par=mk(sb);const o=new THREE.Object3D();o.name='att_'+a.name;const M=a.m;
    new THREE.Matrix4().set(M[0],M[1],M[2],M[3],M[4],M[5],M[6],M[7],M[8],M[9],M[10],M[11],0,0,0,1).decompose(o.position,o.quaternion,o.scale);par.add(o);extra.push(o);att[a.name]=o}}
  if(/^live:/.test(key)&&window.ZGSMOKE&&ZLIVE.particle){const pf=ZLIVE.particle(key.split(':').slice(3).join(':'));if(pf&&pf.system==ZGSMOKE.SYS&&att[pf.attachment])ZGSMOKE.add(att[pf.attachment],m);if(pf&&window.ZHALO&&pf.system==ZHALO.SYS&&att[pf.attachment])ZHALO.add(att[pf.attachment],m)}
  // the item's root bone on the merc (an unusual effect with no attachment follows it: PATTACH_ROOTBONE_FOLLOW)
  let root=null;{const s0=src[0];const rb=s0&&s0.skeleton&&s0.skeleton.bones.find(b=>!b.parent||!b.parent.isBone);if(rb)root=bm[rb.name]||null}
  // a team change re-skins it in place (the taunt props, which aren't redressed with the cosmetics)
  const retint=t=>meshes.forEach(wm=>{const MI=(man[key]||{})[wm.userData.srcMat];if(!MI)return;const P=(t=='BLU'&&MI.blu)?MI.blu:MI.red;if(P)wm.material=wmat(P,null)});
  return {meshes,extra,att,root,holder,retint}}
  // a taunt that makes the player invisible hides the merc and everything worn (the taunt prop stays)
  function invisTick(m){const a=m.act,IV=a&&/^live:/.test(m.cn||'')&&a.getClip().zinvis;const hid=!!(IV&&IV.some(w=>w.v>=1&&a.time>=w.s&&a.time<w.e));if(hid===!!m._inv)return;m._inv=hid;
   const keep=new Set((m._tprop&&m._tprop.meshes)||[]);m.o.traverse(n=>{if(!n.isMesh||keep.has(n))return;if(hid){n.userData._iv=n.visible;n.visible=false}else if('_iv' in n.userData){n.visible=n.userData._iv;delete n.userData._iv}})}
  // the taunt prop's own sequence follows the merc's taunt clock (pause, replay and the hold loop included)
  function propTick(m){const r=m._tprop||null;const R=r&&r.pa?r:null;if(!R||!m.act)return;const pc=R.pa.getClip();let t=m.act.time-R.poff;const L=R.ploop;
  if(L&&t>L.to)t=L.from+((t-L.from)%(L.to-L.from));R.pa.time=Math.max(0,Math.min(pc.duration,t));R.pmx.update(0);
   // the prop entity goes when its scene ends (the Yeti leaves; the merc carries on)
   const on=!!L||t<=pc.duration+.05;if(R._on!==on){R._on=on;R.meshes.forEach(x=>x.visible=on)}}
 async function setCosmetics(c){const m=M[c];if(!m)return;let names=[];try{const S=LOX.ls(c);names=(S.P[S.pre].c||[]).slice(0,4).filter(Boolean)}catch(e){}if(window.ZPREV&&ZPREV.cls==c)names=(ZPREV.cos||[]).slice();
  {let W=[];try{const S=LOX.ls(c);W=Object.values(S.P[S.pre].w||{})}catch(e){}if(window.ZPREV&&ZPREV.cls==c)W=ZPREV.wname?[ZPREV.wname]:[];
   W.forEach(n=>{const k=n&&wkey(n);if(k&&WEARW[BYNAME[k]])names.push('#w:'+BYNAME[k]);else if(!k&&n&&window.ZLIVE&&ZLIVE.ready&&ZLIVE.hasXW(n,c))names.push('#x:'+n)})}
  const team=ZTEAM(c);const sig=names.map(n=>n+'@'+(paintName(n)||'')+'~'+(window.ZSTYLE?ZSTYLE.get(n)+'$'+ZSTYLE.spell(n):0)).join('|')+'#'+team+(window.ZLIVE&&ZLIVE.ready?'+L':'');if(m.csig===sig)return;m.csig=sig;const tok=m.ctok=(m.ctok||0)+1;
  const drop=r=>{if(r){r.meshes.forEach(x=>x.parent&&x.parent.remove(x));r.extra.forEach(b=>b.parent&&b.parent.remove(b))}};
  m.cpend=(m.cpend||0)+1;
  const jobs=names.map(n=>{if(/^(?:(?:Strange|Unusual|Haunted|Vintage|Genuine|Collector's) )?Voodoo-Cursed .+ Soul$/i.test(String(n))&&window.ZSTYLE&&ZSTYLE.get(n)==99)return Promise.resolve({r:null,bg:[],key:'soulskin_zombie',zo:true});
   if(n.startsWith('#x:')){const wn=n.slice(3),key='livexw:'+c+':'+((window.ZSTYLE&&ZSTYLE.get(wn))||0)+':'+wn;
    return bonemerge(m,c,key,null).then(async r=>{if(r){r.meshes.forEach(x=>x.visible=false);await texWait(r.meshes,6000)}return{r,bg:ZLIVE.bg(wn,c,(window.ZSTYLE&&ZSTYLE.get(wn))||0),key}}).catch(()=>null)}
   const wk=n.startsWith('#w:')?n.slice(3):null;const k=wk?null:cnorm(n);let e=wk||COSM[k],lbg=null;
   // not shipped with the page: read it from the player's own TF2 install when one is connected (Settings > Graphics > Game Files)
   const sty=(!wk&&window.ZSTYLE)?ZSTYLE.get(n):0;if(!wk&&window.ZLIVE&&ZLIVE.ready&&ZLIVE.has(n,c)){e='live:'+c+':'+sty+':'+n;lbg=ZLIVE.bg(n,c,sty)}
   if(!e)return null;let key=typeof e=='function'?e(KEY[c]):e,bg=wk?WEARW[wk]:(lbg||COSBG[k]||[]);
   const zo=/^live:/.test(key)&&ZLIVE.skinOverride(n);const bk=!wk&&COSM[k]?(typeof COSM[k]=='function'?COSM[k](KEY[c]):COSM[k]):null,bbg=COSBG[k]||[];
   return bonemerge(m,c,key,paintOf(n,team)).then(r=>(!r&&bk&&bk!==key)?bonemerge(m,c,bk,paintOf(n,team)).then(r2=>{if(r2){key=bk;bg=bbg}return r2}):r).then(async r=>{if(r){r.meshes.forEach(x=>x.visible=false);await texWait(r.meshes,6000)}return{r,bg,key,zo}}).catch(()=>null)});
  const res=await Promise.all(jobs);m.cpend--;m._cdone=1;
  if(m.ctok!==tok){res.forEach(j=>j&&drop(j.r));return}
  (m.cmesh||[]).forEach(drop);m.cmesh=[];Object.values(m.BG||{}).forEach(n=>n.visible=true);
  res.forEach(j=>{if(!j)return;(j.bg||[]).forEach(b=>{if(m.BG&&m.BG[b])m.BG[b].visible=false});if(j.r){j.r.meshes.forEach(x=>x.visible=true);m.cmesh.push(j.r);if(window.ZFACE)ZFACE.attach(c,m,j.key,j.r.meshes)}});
  m._cbg=new Set(res.flatMap(j=>(j&&j.bg)||[]));wmBG(m);
  // the bundled soul meshes take the zombie body's .vmt values; souls read from the install already carry their own
  res.forEach(j=>{if(!j||!j.r||!(j.zo||(/_zombie$/.test(j.key)&&!/^live/.test(j.key))))return;j.r.meshes.forEach(x=>{const U=x.material&&x.material.uniforms;if(!U)return;
   if(U.boost)U.boost.value=0;if(U.rimExp)U.rimExp.value=15;if(U.rimBoost)U.rimBoost.value=.25;if(U.rimTint)U.rimTint.value.set(...ZRIM)})});
  {const zs=res.some(j=>j&&(/_zombie$/.test(j.key)||j.zo));const zsol=res.some(j=>j&&j.key=='soulskin_zombie');if(!!m.zsolid!==zsol){m.zsolid=zsol;if(!!m.zskin===zs)m.skin()}if(!!m.zskin!==zs){const strike=zs&&m._rdy&&m.o.visible&&curC===c&&window.ZBOLT;m.zskin=zs;m.skin();m._zeyes=null;
    const a=zIdle(m),busy=/^taunt/.test(m.cn||'');if(m.st0.idle!==a){m.st0.idle=a;if(!busy&&!strike)m.play(a)}
    // CTFPlayer_SpawnEffect (infection/functions.nut): Halloween.spell_lightning_cast + _impact and zombie_spawn_parent, then the infected Spawn_Infected rise
    if(strike){ZBOLT.strike(m);if(!busy&&m.A.zombie_spawn)m.play('zombie_spawn',true)}}}}
 window.ZCOS=setCosmetics;
 // taunt props + particle events, straight from the game: items_game custom_taunt_prop_per_class (bonemerged onto the player's prop_bone*),
 // the taunt sequence's AE_WPN_UNHIDE / AE_WPN_HIDE cycles for when the prop is shown, and its AE_CL_CREATE_PARTICLE_EFFECT events
 // (models/workshop/player/animations/heavy_workshop_animations.mdl, sequence taunt_the_circuit_breaker)
 const TFX={taunt_circuit_breaker:{cls:'Heavy',prop:'taunt_the_circuit_breaker',show:[0.0275,0.9725],fx:[[0.3791,'taunt_circuitbreaker_parent','prop_bone_2']]}};
 const dropProp=m=>{const T=m.tp;if(!T)return;m.tp=null;if(T.r){T.r.meshes.forEach(x=>x.parent&&x.parent.remove(x));T.r.extra.forEach(b=>b.parent&&b.parent.remove(b))}if(window.ZPFX)ZPFX.clear()};
 window.ZTFX=(m,c)=>{const d=TFX[m.cn];if(m.tp&&m.tp.clip!==m.cn)dropProp(m);if(!d||d.cls!==c)return;const a=m.A[m.cn];if(!a)return;
  const cyc=a.time/a.getClip().duration,run=a.isRunning();
  if(!m.tp){const T=m.tp={clip:m.cn,r:null,fired:new Set(),last:cyc};if(window.ZPFX)d.fx.forEach(f=>ZPFX.preload(f[1]));
   bonemerge(m,c,d.prop,null).then(r=>{if(m.tp!==T){if(r){r.meshes.forEach(x=>x.parent&&x.parent.remove(x));r.extra.forEach(b=>b.parent&&b.parent.remove(b))}return}T.r=r;if(r)r.meshes.forEach(x=>x.visible=false)})}
  const T=m.tp;if(cyc<T.last-.2){T.fired.clear();if(window.ZPFX)ZPFX.clear()}T.last=cyc;
  const vis=run&&cyc>=d.show[0]&&cyc<=d.show[1];if(T.r)T.r.meshes.forEach(x=>x.visible=vis);
  // team skin follows the player's skin family (RED = family 0, BLU = family 1), re-applied whenever the team toggles
  const team=ZTEAM(c);if(T.r&&T.team!==team){T.team=team;wman().then(man=>{if(m.tp!==T)return;const W=man[d.prop]||{};T.r.meshes.forEach(x=>{const MI=W[x.userData.srcMat]||{};const P=team=='BLU'&&MI.blu?MI.blu:MI.red;if(P)x.material=wmat(P)})})}
  if(run&&window.ZPFX)d.fx.forEach((f,i)=>{if(cyc>=f[0]&&!T.fired.has(i)){T.fired.add(i);let b=null;m.o.traverse(n=>{if(!b&&n.isBone&&n.name==f[2])b=n});const v=new THREE.Vector3();ZPFX.spawn(f[1],()=>(b?b.getWorldPosition(v):v.set(0,40,0)))}})};
 // what this prototype can actually put on a merc: weapons with ripped models, installed cosmetics, taunts with baked animations
 function wnorm(n){let s=String(n||'').toLowerCase().replace(/\s*\((factory new|minimal wear|field-tested|well-worn|battle scarred)\)/,'');let o;do{o=s;s=s.replace(/^(self-made|strange|unique|vintage|genuine|festive|festivized|australium|botkiller|unusual|haunted|collector's|decorated|specialized killstreak|professional killstreak|killstreak) /,'')}while(s!==o);return s.trim()}
 // backpack names -> the weapon they are: qualities, festivized and killstreak prefixes stripped, then an exact item name
 const weq=x=>String(x||'').toLowerCase().replace(/^the /,'');
 // decorated (war-painted) weapons don't resolve: their paint can't be shown, so they aren't offered at all
 const wbase=window.ZWBASE=n=>{const W=(typeof SDKD!='undefined'&&SDKD.WEAP)||[];const s=weq(wnorm(n));return W.find(x=>weq(x.n)==s)||null};
 const wkey=n=>{const w=wbase(n),k=w?weq(w.n):weq(wnorm(n));return (k in BYNAME)?k:(('the '+k) in BYNAME)?'the '+k:null};
 window.ZAVAIL={w:n=>/^soda popper$/i.test(String(n||''))||!!wkey(n)||!!(window.ZLIVE&&ZLIVE.ready&&ZLIVE.hasWep(n,curC)),c:(n,cl)=>!!COSM[cnorm(n)]||!!(window.ZLIVE&&ZLIVE.ready&&ZLIVE.has(n,cl||curC)),t:(n,c)=>{const k=clipFor(n);if(!k||/^live:/.test(k))return !!(window.ZLIVE&&ZLIVE.ready&&ZLIVE.hasTaunt(n,c||st.merc));const L=ZCLIPS[String(c||st.merc||'').toLowerCase()];return !L||L.includes(k)},a:n=>/fancy spellbook/i.test(String(n||''))};
 // paint can colours (items_game "set_item_tint_rgb" / "set_item_tint_rgb_2" for team paints)
 const PAINTS={"Indubitably Green":"729E42","Zepheniah's Greed":"424F3B","Noble Hatter's Violet":"51384A","Color No. 216-190-216":"D8BED8","A Deep Commitment to Purple":"7D4071","Mann Co. Orange":"CF7336","Muskelmannbraun":"A57545","Peculiarly Drab Tincture":"C5AF91","Radigan Conagher Brown":"694D3A","Ye Olde Rustic Colour":"7C6C57","Australium Gold":"E7B53B","Aged Moustache Grey":"7E7E7E","An Extraordinary Abundance of Tinge":"E6E6E6","A Distinctive Lack of Hue":"141414","Pink as Hell":"FF69B4","A Color Similar to Slate":"2F4F4F","Drably Olive":"808000","The Bitter Taste of Defeat and Lime":"32CD32","The Color of a Gentlemann's Business Pants":"F0E68C","Dark Salmon Injustice":"E9967A","After Eight":"2D2D24","Operator's Overalls":["483838","384248"],"Waterlogged Lab Coat":["A89A8C","839FA3"],"Balaclavas Are Forever":["3B1F23","18233D"],"An Air of Debonair":["654740","28394D"],"The Value of Teamwork":["803020","256D8D"],"Cream Spirit":["C36C2D","B88035"],"A Mann's Mint":"BCDDB3","Team Spirit":["B8383B","5885A2"]};window.ZPAINTS=PAINTS;
 const bpItem=n=>{try{const B=window.BPX&&BPX.BP;return B&&B.s.find(x=>x&&x.n===n)}catch(e){return null}};
 const paintName=n=>{const P=window.ZPREV;if(P&&(P.cos||[]).includes(n))return P.paint||'';return (window.ZSTYLE&&ZSTYLE.paint(n))||''};
 const paintOf=(n,team)=>{const sp=window.ZSTYLE&&window.ZSPELL?ZSTYLE.spell(n):null;if(sp!=null)return ZSPELL.tint(sp,team);const pn=paintName(n);let h=pn&&(PAINTS[pn]||(window.ZPHEX&&ZPHEX[pn]&&ZPHEX[pn].replace('#','')));if(!h)return null;if(Array.isArray(h))h=h[team=='BLU'?1:0];const v=parseInt(String(h).replace('#',''),16);return[(v>>16&255)/255,(v>>8&255)/255,(v&255)/255]};
 // re-skin the weapon when the team toggles (RED/BLU skin families from the mdl)
 function weaponTeam(c){const m=M[c];if(!m||!m.wmesh)return;const team=ZTEAM(c);if(m.wteam===team)return;m.wteam=team;m.wmesh.forEach(wm=>{const MI=wm.userData.mi||{};if(MI.blu)wm.material=wmat(team=='BLU'?MI.blu:MI.red);if(wm.userData.zteam&&wm.material)wm.material.visible=wm.userData.zteam==team})}
 const slotEl=li=>document.querySelector(`.zls[data-lk=w][data-li="${li}"]`);
 const firstSlot=c=>c=='Spy'?'secondary':'primary';
 // the class comes from the figure element itself (aria-label), never from a possibly-stale global
 const clsOf=f=>{const a=f.getAttribute('aria-label');return KEY[a]?a:st.merc};
 async function show(f){const c=clsOf(f);if(!KEY[c])return;try{await init()}catch(e){return}
  if(f.dataset.m3d===c&&f.querySelector('canvas'))return;f.dataset.m3d=c;
  // hide whatever was on screen before so the previous merc never lingers while the new one streams in
  if(curC!==c){Object.values(M).forEach(x=>x.o.visible=false)}
  f.appendChild(V.r.domElement);{const w=f.clientWidth||620,h=f.clientHeight||830,sz=V.r.getSize(new THREE.Vector2());if(sz.x!==w||sz.y!==h){V.r.setSize(w,h);V.cam.aspect=w/h;V.cam.updateProjectionMatrix();}if(f.classList.contains('zfs'))V.cam.setViewOffset(w,h,-Math.round(w*.17),0,w,h);else V.cam.clearViewOffset();}V.go();
  // the store's CTFPlayerModelPanel (storepreviewitempanel.res): fov 40, model at origin (190,0,-36) from the camera; ToggleZoom moves it
  // (-100,0,-ClassZoomZ[class]) closer (tf_playermodelpanel.cpp). The loadout camera is put back when the merc returns to its own panel.
  if(f.classList.contains('zspfig')){if(!V.storeCam)V.storeCam={fov:V.cam.fov,pos:V.cam.position.clone(),tgt:V.ctl.target.clone(),zoomed:V.zoomed};V.storeZoom=false;V.storeZf=0;V._zfT=0;V.storePan={x:0,y:0};V.cam.fov=40;V.cam.updateProjectionMatrix();V.storeApply(c);
   // the store's CTFPlayerModelPanel: no orbit; dragging with the left button turns the merc about his own vertical axis and the
   // < > buttons turn him while held. Added here: wheel zoom toward the mouse and dragging the view with the right or middle button
   V.ctl.enabled=false;if(!V._spin){V._spin=1;const el=V.r.domElement;let lx=null,ly=null,pid=null,pan=false;
    // left button turns the merc (as in the store); right or middle button drags the view around him
    const cls=()=>(window.ZPREV&&ZPREV.cls)||curC,dist=()=>V.cam.position.distanceTo(V.ctl.target),half=()=>Math.tan(V.cam.fov*Math.PI/360)*dist();
    el.addEventListener('contextmenu',e=>{if(V.storeCam)e.preventDefault()});
    el.addEventListener('pointerdown',e=>{if(!V.storeCam||e.button>2)return;pan=e.button!==0;lx=e.clientX;ly=e.clientY;pid=e.pointerId;if(pan)e.preventDefault();try{el.setPointerCapture(pid)}catch(x){}});
    el.addEventListener('pointermove',e=>{if(lx==null||e.pointerId!==pid)return;
     if(pan){const k=2*half()/(el.clientHeight||1),P=V.storePan;P.x-=(e.clientX-lx)*k;P.y+=(e.clientY-ly)*k;V.storeApply(cls())}
     else{const m=curC&&M[curC];if(m&&m.o)m.o.rotation.y+=(e.clientX-lx)*.01}lx=e.clientX;ly=e.clientY});
    ['pointerup','pointercancel','lostpointercapture'].forEach(t=>el.addEventListener(t,()=>{lx=null;pid=null}));
    // the mouse wheel zooms from the store's full-body framing in to the head, toward wherever the mouse is (easing toward where
    // the wheel left it); zooming back out drifts the view back to the middle
    el.addEventListener('wheel',e=>{if(!V.storeCam)return;e.preventDefault();const r=el.getBoundingClientRect();V._zc=[((e.clientX-r.left)/r.width)*2-1,1-((e.clientY-r.top)/r.height)*2];
     V._zfT=Math.max(0,Math.min(ZMAX,(V._zfT!=null?V._zfT:V.storeZf||0)-e.deltaY*(e.deltaMode?.05:.0015)));
     if(V._zfa)return;V._zfa=1;const st=()=>{const t=V._zfT,c0=V.storeZf||0,n=Math.abs(t-c0)<.002?t:c0+(t-c0)*.25,P=V.storePan,[cx,cy]=V._zc,asp=V.cam.aspect;
      if(n>c0){const h0=half(),wx=V.ctl.target.x+cx*h0*asp,wy=V.ctl.target.y+cy*h0;V.storeZf=n;V.storeApply(cls());const h1=half();P.x+=wx-(V.ctl.target.x+cx*h1*asp);P.y+=wy-(V.ctl.target.y+cy*h1);V.storeApply(cls())}
      else{const k=c0>0?n/c0:0;P.x*=k;P.y*=k;V.storeZf=n;V.storeApply(cls())}
      if(n!==t)requestAnimationFrame(st);else V._zfa=0};st()},{passive:false})}}
  else if(V.storeCam){const S=V.storeCam;V.storeCam=null;if(S.md!=null)V.ctl.minDistance=S.md;V.ctl.enabled=true;V.cam.fov=S.fov;V.cam.updateProjectionMatrix();V.cam.position.copy(S.pos);V.ctl.target.copy(S.tgt);V.zoomed=S.zoomed;V.ctl.update()}
  let m;try{m=await load(c)}catch(e){delete f.dataset.m3d;return}if(!f.isConnected||clsOf(f)!==c)return;
  const was=curC;Object.entries(M).forEach(([k,x])=>x.o.visible=k===c);curC=c;m.skin();if(was!==c||!m.started||performance.now()-(m.seen||0)>1500){m.started=1;const fs=firstSlot(c),el=slotEl(fs);m.wname=undefined;m.st0.idle=null;(window.ZPREV&&ZPREV.cls==c)?setWeapon(c,ZPREV.wslot||fs,ZPREV.wname):setWeapon(c,fs,el&&el.dataset.tipn)}m.csig=null;setCosmetics(c)}
 const IDLE={};const idleClip=c=>IDLE[c]||(IDLE[c]=fetch('models/idle/'+KEY[c]+'.json').then(r=>r.json()).then(d=>{const T=Array.from({length:d.n},(_,i)=>i/d.fps);const tr=[];
  d.tr.forEach(t=>{const nm=THREE.PropertyBinding.sanitizeNodeName(t.b);tr.push(new THREE.QuaternionKeyframeTrack(nm+'.quaternion',t.q.length==4?[0]:T,t.q));tr.push(new THREE.VectorKeyframeTrack(nm+'.position',t.p.length==3?[0]:T,t.p))});
  return new THREE.AnimationClip('selectionMenu_Idle',-1,tr)}));
 window.ZTEAM=c=>(window.ZSELT&&ZSELT.c==c&&ZSELT.t)||(window.ZPREV&&ZPREV.cls==c&&ZPREV.team)||(window.LOX&&LOX.ls(c).team)||'RED';
 window.ZREDRESS=c=>{const m=M[c];if(!m)return;if(m._tprop&&m._tprop.retint)m._tprop.retint(ZTEAM(c));m.csig=null;m.wteam=null;m.skin&&m.skin();weaponTeam(c);setCosmetics(c);if(window.ZPREV&&ZPREV.cls==c)setWeapon(c,ZPREV.wslot||firstSlot(c),ZPREV.wname)};
 window.Z3D={M,load,clipFor,setWeapon:(...a)=>setWeapon(...a),get V(){return V}};
 // catalog hooks: mount the merc in an element, re-dress it, zoom and turn it (the store preview's controls)
 // the store preview's taunt controls: replay from the start (with its sounds), pause / resume, and whether it is still going
const TCTL={replay:(c,clip)=>{const m=M[c];const n=clip||m&&m.cn;if(m&&n&&m.play){if(window.ZFACE)ZFACE.stop(m);m.play(n,true)}},
 pause:(c,p)=>{const m=M[c],a=m&&m.act;if(!a)return;a.paused=!!p;if(window.ZFACE)ZFACE.pause(m,!!p)},
 state:c=>{const m=M[c],a=m&&m.act;if(!a||!/^(taunt|live:)/.test(m.cn||''))return 'none';if(a.paused)return 'paused';return a.isRunning()?'playing':'done'}};
window.Store3D={show:f=>show(f),init:()=>init(),taunt:TCTL,get V(){return V},M,redress:c=>window.ZREDRESS(c),zoom:()=>{if(V)V.zoom()},turn:(c,d)=>{const m=M[c];if(m&&m.o)m.o.rotation.y+=d},paints:PAINTS,clipFor,
  // the loadout slot a class holds this bundled stock weapon in (the Shotgun: Soldier's secondary, Engineer's primary), or null
  stockSlot:(c,n)=>{const k=wkey(n);if(!k)return null;const key=BYNAME[k],S=STOCK[c]||{};for(const s in S)if(S[s]===key)return s;return null}};
})();
// ============ facial animation + voice for taunt previews ============
// Mirrors CTFPlayerModelPanel (tf_playermodelpanel.cpp), which runs the taunt's choreo scene in the loadout model panel:
//  SetupFlexWeights: decay every controller x0.95 per think, flexanimation tracks (C_BaseFlex::AddFlexAnimation),
//  rescale to controller range, expression events (AddFlexSetting: g = g*(1-s) + w*s, s = clamp(intensity*influence)),
//  then visemes from the speaking wave's phonemes (AddVisemesForSentence/AddViseme/ComputeBlendedSetting, phonemefilter .08),
//  then CStudioHdr::RunFlexRules -> flex descriptor weights -> mstudioflex vertex deltas (RampFlexWeight, stereo side byte).
//  SPEAK events emit the wave on CHAN_VOICE at the event start. Data: models/face/<class>.bin.wasm (from the .mdl/.vvd + .vfe files),
//  models/face/scenes.json (scenes.image BVCDs, game_sounds_vo_phonemes.txt), snd/t/*.mp3 (tf2_sound_vo_english / tf2_sound_misc).
(function(){
const PACK={};let SCN=null;
const scenes=()=>SCN||(SCN=fetch('models/face/scenes.json').then(r=>r.json()).catch(()=>({})));
const a4=n=>(n+3)&~3;
const BUF={};const buf=k=>BUF[k]||(BUF[k]=fetch('models/face/'+k+'.bin.wasm').then(r=>{if(!r.ok)throw 0;return r.arrayBuffer()}).catch(()=>null));
// a flex pack starts at byte o0 of an ArrayBuffer: u32 header length, JSON header, then the delta blob (offsets relative to the blob)
function parsePack(buf,o0){const hl=new DataView(buf).getUint32(o0,true);const h=JSON.parse(new TextDecoder().decode(new Uint8Array(buf,o0+4,hl)));const B=o0+4+hl;
 h.prims.forEach(p=>p.flexes.forEach(f=>{let o=B+f.o;f.idx=new Uint16Array(buf,o,f.n);o+=a4(2*f.n);f.dp=new Int16Array(buf,o,3*f.n);o+=a4(6*f.n);f.dn=new Int8Array(buf,o,3*f.n);f.side=new Uint8Array(buf,o+3*f.n,f.n)}));
 h.nc=h.ctl.length;h.cname={};h.ctl.forEach((c,i)=>h.cname[c[0].toLowerCase()]=i);return h}
function pack(k){return PACK[k]||(PACK[k]=buf(k).then(b=>parsePack(b,0)).catch(()=>null))}

// ---- curves (choreoevent.cpp / interpolatortypes.cpp) ----
function catmullNX(p1,p2,p3,p4,t){ // Catmull_Rom_Spline_NormalizeX on (x,y) pairs, returns y
 const dt=p3[0]-p2[0];let y1=p1[1],y4=p4[1];
 if(dt!==0){if(p1[0]!==p2[0])y1=p2[1]+(p1[1]-p2[1])*(dt/(p2[0]-p1[0]));if(p4[0]!==p3[0])y4=p3[1]+(p4[1]-p3[1])*(dt/(p4[0]-p3[0]))}
 const t2=t*t,t3=t2*t;return .5*((-y1+3*p2[1]-3*p3[1]+y4)*t3+(2*y1-5*p2[1]+4*p3[1]-y4)*t2+(-y1+p3[1])*t+2*p2[1])}
function interp(type,pre,a,b,nx,f){switch(type){
 case 2:f=Math.sin(Math.PI*f*.5);return a[1]+(b[1]-a[1])*f;
 case 3:f=1-Math.sin(Math.PI*f*.5+.5*Math.PI);return a[1]+(b[1]-a[1])*f;
 case 4:f=f*f*(3-2*f);return a[1]+(b[1]-a[1])*f;
 case 6:return a[1]+(b[1]-a[1])*f;
 default:return catmullNX(pre,a,b,nx,f)}}
// samples [[time,value,curvetype?]]; zl/zr edge values; dur = event duration; ramp=true -> CCurveData (clamped neighbours keep x)
function curve(S,time,dur,zl,zr,ramp){const n=S.length;if(!n)return ramp?1:zl;
 const at=i=>i<0?[0,zl,0,1]:i>=n?[dur,zr,0,1]:[S[i][0],S[i][1],S[i][2]||0,0];
 let i;if(time<=0)i=-1;else if(time>=dur)i=n-1;else{i=n-1;for(let k=-1;k<n;k++){if(time>=at(k)[0]&&time<=at(k+1)[0]){i=k;break}}if(!ramp&&i+1<n&&time===at(i+1)[0])i++}
 const s=at(i),e=at(i+1),pre=at(Math.max(-1,i-1)).slice(),nx=at(Math.min(i+2,n)).slice();
 if(ramp){if(pre[3])pre[0]=s[0];if(nx[3])nx[0]=e[0]}
 const dt=e[0]-s[0];const f=Math.min(1,Math.max(0,dt>0?(time-s[0])/dt:0));
 const early=s[2]&255,later=(e[2]>>8)&255;let y;
 if(early==14){y=s[1]}else if(later==14){y=e[1]}
 else if(early==later)y=interp(later,pre,s,e,nx,f);else{const y1=interp(early,pre,s,e,nx,f),y2=interp(later,pre,s,e,nx,f);y=y1+(y2-y1)*f}
 return Math.min(1,Math.max(0,y))}
const evIntensity=(ev,st,sc)=>{const g=sc.ramp&&sc.ramp.length?curve(sc.ramp,st,sc.dur,0,0,true):1;return g*curve(ev.ramp||[],st-ev.s,ev.e-ev.s,0,0,true)};
function trackVal(tr,ev,st,type){const dz=tr.max!==tr.min?(0-tr.min)/(tr.max-tr.min):0;const z=type?.5:dz;let v;
 if(st<ev.s)v=z;else if(st>ev.e)v=z;else{const S=type?tr.s1:tr.s0;v=S&&S.length?curve(S,st-ev.s,ev.e-ev.s,z,z,false):z}
 if(type==0&&tr.min!==tr.max)v=v*(tr.max-tr.min)+tr.min;return v}
function trackIntensity(tr,ev,st,side){const mag=trackVal(tr,ev,st,0);let sc=1;if(tr.c){const bal=trackVal(tr,ev,st,1);if(side==0&&bal>.5)sc=(1-bal)/.5;else if(side==1&&bal<.5)sc=bal/.5}return mag*sc}

// ---- per-model face rig ----
function rig(m,h,roots){const R={h,fw:Float32Array.from(h.ctl,c=>c[2]!==c[1]?Math.min(1,Math.max(0,-c[1]/(c[2]-c[1]))):0),g:new Float32Array(h.nc),W:new Float32Array(h.desc.length),prims:[],live:true};
 h.prims.forEach(p=>{let mesh=null;(roots||[m.o]).forEach(r=>r.traverse(n=>{if(!mesh&&n.isMesh&&n.material&&(n.userData.srcMat||n.material.name)==p.mat&&n.geometry.attributes.position.count==p.nv)mesh=n}));if(!mesh||!p.flexes.length)return;
  const G=mesh.geometry;const fa=a=>{if(!(a.array instanceof Float32Array)||a.normalized){const f=new Float32Array(a.count*3);for(let i=0;i<a.count;i++){f[3*i]=a.getX(i);f[3*i+1]=a.getY(i);f[3*i+2]=a.getZ(i)}return new THREE.BufferAttribute(f,3)}return a};
  const P=fa(G.attributes.position),N=fa(G.attributes.normal);G.setAttribute('position',P);G.setAttribute('normal',N);P.setUsage(THREE.DynamicDrawUsage);N.setUsage(THREE.DynamicDrawUsage);
  const fl=[];p.flexes.forEach(f=>{if(f.d>=0)fl.push(f)});
  if(!G.userData.zbase){const base=new Float32Array(P.array);p.flexes.forEach(f=>{if(f.d<0){for(let j=0;j<f.n;j++){const v=f.idx[j];for(let c=0;c<3;c++)base[3*v+c]+=f.dp[3*j+c]/4096}}});G.userData.zbase=[base,new Float32Array(N.array)]}
  const [base,baseN]=G.userData.zbase;
  P.array.set(base);P.needsUpdate=true;
  const touched=new Set();fl.forEach(f=>f.idx.forEach(v=>touched.add(v)));
  R.prims.push({P,N,base,baseN,fl,touched:Uint32Array.from(touched),dirty:false})});
 return R}
const ramp=(t,w)=>w<=t[0]||w>=t[3]?0:w<t[1]?(w-t[0])/(t[1]-t[0]):w>t[2]?(t[3]-w)/(t[3]-t[2]):1;
function rules(R){const h=R.h,g=R.g,W=R.W,ctl=h.ctl;W.fill(0);const st=new Float32Array(32);
 const rm=(v,a,b,c,d)=>{const t=a===b?(v>=b?1:0):Math.min(1,Math.max(0,(v-a)/(b-a)));return c+(d-c)*t};
 for(const [flex,ops] of h.rules){let k=0;for(const [op,v] of ops){switch(op){
  case 1:st[k++]=v;break;case 2:st[k++]=g[v];break;case 3:st[k++]=W[v];break;
  case 4:st[k-2]+=st[k-1];k--;break;case 5:st[k-2]-=st[k-1];k--;break;case 6:st[k-2]*=st[k-1];k--;break;
  case 7:st[k-2]=st[k-1]>.0001?st[k-2]/st[k-1]:0;k--;break;case 8:st[k-1]=-st[k-1];break;
  case 13:st[k-2]=Math.max(st[k-2],st[k-1]);k--;break;case 14:st[k-2]=Math.min(st[k-2],st[k-1]);k--;break;
  case 15:st[k++]=rm(g[v],-1,0,1,0);break;case 16:st[k++]=rm(g[v],0,1,0,1);break;
  case 18:{const km=k-v;for(let i=km+1;i<k;i++)st[km]*=st[i];k=k-v+1;break}
  case 19:{const km=k-v;let dv=st[km];for(let i=km+1;i<k;i++)dv*=st[i];st[km-1]*=1-dv;k-=v;break}
  case 20:case 21:{const cv=ctl[v],cl=ctl[st[k-1]|0];const lidV=rm(g[v],cv[1],cv[2],0,1),lid=rm(g[st[k-1]|0],cl[1],cl[2],0,1);const ei=st[k-3]|0;let ud=0;if(ei>=0){const ce=ctl[ei];ud=rm(g[ei],ce[1],ce[2],-1,1)}
   st[k-3]=op==20?(ud>0?(1-ud)*(1-lidV)*lid:(1-lidV)*lid):(ud<0?(1+ud)*lidV*lid:lidV*lid);k-=2;break}}}
  W[flex]=st[0]}}
function deform(R){const W=R.W;let any=false;for(let i=0;i<W.length;i++)if(Math.abs(W[i])>1e-4){any=true;break}
 for(const p of R.prims){if(!any&&!p.dirty)continue;const pa=p.P.array,na=p.N.array;pa.set(p.base);na.set(p.baseN);
  if(any)for(const f of p.fl){const w1=ramp(f.t,W[f.d]),w2=f.p>=0?ramp(f.t,W[f.p]):w1;if(Math.abs(w1)<.001&&Math.abs(w2)<.001)continue;
   const n=f.n,I=f.idx,D=f.dp,DN=f.dn,S=f.side;for(let j=0;j<n;j++){const b=S[j]/255,s=f.p>=0?w2*b+w1*(1-b):w1;if(s===0)continue;const v=3*I[j],q=3*j,sp=s/4096,sn=s/127;
    pa[v]+=D[q]*sp;pa[v+1]+=D[q+1]*sp;pa[v+2]+=D[q+2]*sp;na[v]+=DN[q]*sn;na[v+1]+=DN[q+1]*sn;na[v+2]+=DN[q+2]*sn}}
  if(any)for(const v of p.touched){const o=3*v,l=Math.hypot(na[o],na[o+1],na[o+2])||1;na[o]/=l;na[o+1]/=l;na[o+2]/=l}
  p.P.needsUpdate=p.N.needsUpdate=true;p.dirty=any}}

// ---- visemes ----
function blend(has,ei){const a=[0,0,0];// [normal, weak, strong]
 if(ei>.6){if(has[2]){const fr=(1-ei)/.4;a[0]=fr*1.2;a[2]=1-fr}else a[0]=2*Math.min(ei,.6)}
 else if(ei<.4){if(has[1]){const fr=(.4-ei)/.4;a[0]=(1-fr)*.8;a[1]=fr}else a[0]=2*Math.max(ei,.4)}
 else a[0]=2*ei;return a}
function emph(em,t,len){if(!em||!em.length)return .5;const S=em.map(x=>[x[0],x[1],0]);return curve(S,t,len,.5,.5,false)}
function visemes(R,v,t){const h=R.h,g=R.g,V=h.vfe,P=v.ph;const dt0=.08,len=P.length?P[P.length-1][2]:0;if(t>=len+2)return;const ei=emph(v.em,t,len);
 for(let k=0;k<P.length;k++){const ph=P[k];let dt=dt0;
  if(t>ph[1]&&t<ph[2]&&k<P.length-1){const nx=P[k+1];dt=Math.max(dt,Math.min((nx[1]===ph[2]?nx[2]:nx[1])-t,ph[2]-ph[1]))}
  let t1=(ph[1]-t)/dt,t2=(ph[2]-t)/dt;if(!(t1<1&&t2>0))continue;t2=Math.min(t2,1);t1=Math.max(t1,0);const scale=t2-t1;
  const code=String(ph[0]),sets=[V.ph&&V.ph[code],V.phw&&V.phw[code],V.phs&&V.phs[code]];if(!sets[0])continue;
  const am=blend([1,!!sets[1],!!sets[2]],ei);for(let c=0;c<3;c++){if(!sets[c]||!am[c])continue;for(const [j,w] of sets[c])g[j]+=am[c]*scale*w}}}

// ---- scene playback ----
// taunt sounds ship packed into per-class banks (appended to models/face/<class|common>.bin.wasm, offsets in scenes.json) and are cut into blob URLs on demand
const BANK={},URL_={};const bank=b=>BANK[b]||(BANK[b]=buf(b));
async function prep(k,SND){if(URL_[k])return;const e=SND&&SND[k];if(!e)return;const buf=await bank(e[0]);if(!buf)return;URL_[k]=URL.createObjectURL(new Blob([new Uint8Array(buf,e[1],e[2])],{type:'audio/mpeg'}))}
function audio(k){const a=new Audio(URL_[k]||'');a.preload='auto';return a}
// the page's Settings > Sound volume (0 when its sounds are switched off)
const zv=()=>{try{return window.ZVOL?Math.max(0,Math.min(1,+ZVOL()||0)):1}catch(e){return 1}};
const LIVE=new Set();let TOK=0;
function killAll(){TOK++;[...LIVE].forEach(R=>stopScene(R,false))}
function stopScene(R,fade){const S=R.scene;if(!S)return;R.scene=null;LIVE.delete(R);S.voices.forEach(x=>{try{x.a.pause()}catch(e){}});if(S.music){const a=S.music,v0=a.volume;if(!fade){a.pause();return}const t0=performance.now();const st=()=>{const k=(performance.now()-t0)/600;if(k>=1){a.pause();return}a.volume=v0*(1-k);requestAnimationFrame(st)};st()}}
async function start(c,m,clip,action){killAll();const tok=TOK;const k=c=='Demoman'?'demo':String(c).toLowerCase();
 const [h,J]=await Promise.all([pack(k),scenes()]);const S=J.scn||{};if(!m.face&&h)m.face=rig(m,h);const R=m.face||(m._face=m._face||{fw:null,prims:[]});
 if(tok!==TOK)return;stopScene(R,false);const sc=S[k]&&S[k][clip];if(!sc||m.cn!==clip)return;
 const seqs=sc.ev.filter(e=>e.t=='seq');const dur=action.getClip().duration;
 let seq=seqs.find(e=>(e.n||'').toLowerCase()==clip)||seqs[0];let off=0,scale=1;if(seq){off=seq.s;const sd=seq.e-seq.s;if(Math.abs(sd-dur)/dur>.04&&!(seqs.length>1&&seq.n.toLowerCase()==clip))scale=sd/dur}
 const need=[];sc.ev.forEach(e=>{if(e.t=='speak')e.w.forEach(w=>need.push(w.k))});if(sc.mu)need.push(sc.mu.k);await Promise.all(need.map(x=>prep(x,J.snd)));if(tok!==TOK||m.cn!==clip||!action.isRunning())return;
 const end=Math.max(...sc.ev.map(e=>e.e));
 const Sx={clip,sc:Object.assign({dur:end},sc),action,off,scale,started:new Set(),voices:[],music:null};
 if(sc.mu){const a=audio(sc.mu.k);a.volume=Math.min(1,sc.mu.v*.42)*zv();a.loop=true;a.play().catch(()=>{});Sx.music=a}
 R.scene=Sx;LIVE.add(R);R.live=true}
function tick(m,dt){if(!m._pre){m._pre=1;const c=Object.keys(Z3D.M).find(x=>Z3D.M[x]===m);if(c){ZFACE.preload(c);const k=c=='Demoman'?'demo':c.toLowerCase();if(k!='pyro')pack(k).then(h=>{if(h&&!m.face)m.face=rig(m,h);else if(!h)m._nof=1})}}const R=m.face||m._face;if(!R)return;const S=R.scene;
 if(S){const a=S.action;if(m.cn!==S.clip)stopScene(R,false);else if(!a.isRunning()&&!a.paused)stopScene(R,true)}
 const sc=R.scene;let st=0;if(sc){st=sc.off+sc.action.time*sc.scale;
  // a held taunt's loop jumped back: what starts inside the loop plays again
  if(sc.lst!=null&&st<sc.lst-.05)[...sc.started].forEach(i=>{if(sc.sc.ev[i].s>=st)sc.started.delete(i)});sc.lst=st;
  sc.sc.ev.forEach((e,i)=>{if(e.t!='speak'||sc.started.has(i)||st<e.s)return;sc.started.add(i);if(st>e.e)return;const w=e.w[(Math.random()*e.w.length)|0];const a=audio(w.k);a.volume=Math.min(1,(e.v||1)*.75)*zv();
   // Voices From Below (halloween_voice_modulation, C_TFPlayer::ClientAdjustVOPitch): pitch *= 0.8 - Source pitch is playback rate,
   // so the line plays slower and deeper; on here while a Voodoo-Cursed Soul is worn. Lip sync follows the audio clock, so it stays matched.
   const vfb=!!m.zskin;if(vfb){a.preservesPitch=false;a.mozPreservesPitch=false;a.webkitPreservesPitch=false;a.playbackRate=.8}
   const past=st-e.s;if(past>.05)a.currentTime=past*(vfb?.8:1);a.play().catch(()=>{});sc.voices.push({a,v:w,t0:performance.now()/1000-past})})}
 if(!R.h)return;const h=R.h,fw=R.fw,g=R.g,ctl=h.ctl;
 const dec=Math.pow(.95,dt*60);let act=!!sc;for(let i=0;i<fw.length;i++){const c=ctl[i],r=c[2]!==c[1]?fw[i]*(c[2]-c[1])+c[1]:fw[i],v=r*dec;fw[i]=c[2]!==c[1]?Math.min(1,Math.max(0,(v-c[1])/(c[2]-c[1]))):v;if(Math.abs(v)>1e-4)act=true}
 if(!act&&!R.live)return;
 const norm=(i,v)=>{const c=ctl[i];return c[2]!==c[1]?Math.min(1,Math.max(0,(v-c[1])/(c[2]-c[1]))):v},unnorm=i=>{const c=ctl[i];return c[2]!==c[1]?fw[i]*(c[2]-c[1])+c[1]:fw[i]};
 if(sc)for(const e of sc.sc.ev){if(e.t!='flex'||st<e.s||st>e.e)continue;const w=evIntensity(e,st,sc.sc);
  for(const tr of e.tr){if(tr.c){[['right_',0],['left_',1]].forEach(([pre,side])=>{const ci=h.cname[(pre+tr.n).toLowerCase()];if(ci==null)return;fw[ci]=norm(ci,unnorm(ci)*(1-w)+trackIntensity(tr,e,st,side)*w)})}
   else{const ci=h.cname[tr.n.toLowerCase()];if(ci==null)continue;fw[ci]=norm(ci,unnorm(ci)*(1-w)+trackIntensity(tr,e,st,0)*w)}}}
 for(let i=0;i<g.length;i++)g[i]=unnorm(i);
 if(sc)for(const e of sc.sc.ev){if(e.t!='expr'||st<e.s||st>e.e)continue;const set=h.vfe[e.file]&&h.vfe[e.file][e.name.toLowerCase()];if(!set)continue;const sca=evIntensity(e,st,sc.sc);
  for(const [j,w,inf] of set){const s=Math.min(1,Math.max(0,sca*inf));g[j]=g[j]*(1-s)+w*s}}
 if(sc)sc.voices=sc.voices.filter(x=>{const a=x.a;const t=a.paused&&a.currentTime===0?performance.now()/1000-x.t0:a.currentTime;if(a.ended)return false;visemes(R,x.v,t);return true});
 rules(R);deform(R);
 for(const it of m.faceItems||[]){const ig=it.R.g;for(let i=0;i<ig.length;i++){const j=it.map[i];ig[i]=j>=0?g[j]:0}rules(it.R);deform(it.R)}
 R.live=act}
// cosmetics with their own flexes (e.g. Dapper Noel): pack appended to the class file, located via scenes.json "items"
async function attach(c,m,key,meshes){if(/^live:/.test(key)){const ih=window.ZLIVE&&ZLIVE.flexPack(key);if(!ih)return;const k=c=='Demoman'?'demo':String(c).toLowerCase();const h=await pack(k);if(!meshes.every(x=>x.parent))return;const R=rig(m,ih,meshes);if(!R.prims.length)return;
  const map=new Int16Array(ih.nc).fill(-1);if(h)ih.ctl.forEach((cc,i)=>{const j=h.cname[cc[0].toLowerCase()];if(j!=null)map[i]=j});if(!m.face&&h)m.face=rig(m,h);m.faceItems=(m.faceItems||[]).filter(x=>x.meshes.every(y=>y.parent));m.faceItems.push({R,map,meshes});if(m.face)m.face.live=true;return}
 const k=c=='Demoman'?'demo':String(c).toLowerCase();key=key.replace(/_(scout|soldier|pyro|demo|heavy|engineer|medic|sniper|spy)$/,'');const J=await scenes();const e=J.items&&J.items[k]&&J.items[k][key];if(!e)return;
 const [b,h]=await Promise.all([buf(k),pack(k)]);if(!b||!meshes.every(x=>x.parent))return;const ih=parsePack(b,e[0]);const R=rig(m,ih,meshes);if(!R.prims.length)return;
 const map=new Int16Array(ih.nc).fill(-1);if(h)ih.ctl.forEach((cc,i)=>{const j=h.cname[cc[0].toLowerCase()];if(j!=null)map[i]=j});
 if(!m.face&&h)m.face=rig(m,h);m.faceItems=(m.faceItems||[]).filter(x=>x.meshes.every(y=>y.parent));m.faceItems.push({R,map,meshes});if(m.face)m.face.live=true}
// pausing a taunt holds its voices and music where they are
function pauseScene(m,p){const R=m&&(m.face||m._face);const S=R&&R.scene;if(!S)return;const A=[...S.voices.map(x=>x.a),S.music].filter(Boolean);A.forEach(a=>{try{if(p)a.pause();else if(!a.ended)a.play().catch(()=>{})}catch(e){}})}
window.ZFACE={pause:pauseScene,addLive:async(c,clip,sc,urls)=>{const J=await scenes();const k=c=='Demoman'?'demo':String(c).toLowerCase();J.scn=J.scn||{};(J.scn[k]||(J.scn[k]={}))[clip]=sc;Object.assign(URL_,urls||{})},sfx:(k,v)=>scenes().then(J=>prep(k,J.snd)).then(()=>{const a=audio(k);a.volume=(v==null?1:v)*zv();a.play().catch(()=>{})}),start,tick,killAll,attach,stop:m=>{const R=m&&(m.face||m._face);if(R)stopScene(R,false)},preload:c=>{const k=c=='Demoman'?'demo':String(c).toLowerCase();if(k!='pyro')pack(k);scenes();bank(k);bank('common')}};
})();

// ============ jiggle bones ============
// Port of CJiggleBones::BuildJiggleTransformations (src/public/jigglebones.cpp, Michael Booth / Turtle Rock): per jiggle bone a tip
// point (bone base + length along the bone's forward/Z axis) is driven by springs toward the animated goal, with gravity (tipMass),
// yaw/pitch/angle/length constraints, an optional spring on the base position and the "boing" squash-and-stretch. Parameters come
// from the cosmetic's .mdl ($jigglebone -> mstudiojigglebone_t), stored in models/w/weapons.json under <item>._jig.
// Source's world is Z-up; this scene is Y-up, so gravity acts along -Y.
(function(){
const F={FLEX:1,RIGID:2,YAW:4,PITCH:8,ANGLE:0x10,LENGTH:0x20,BASE:0x40,BOING:0x80};
const V=()=>new THREE.Vector3();
const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
function init(d,t,base,tip){d.last=t;d.basePos=base.clone();d.baseLast=base.clone();d.baseVel=V();d.baseAcc=V();d.tipPos=tip.clone();d.tipVel=V();d.tipAcc=V();
 d.lastBoing=base.clone();d.boingDir=new THREE.Vector3(0,1,0);d.boingVelDir=V();d.boingSpeed=0;d.boingTime=0}
let _i=null,_b=null;
// builds the bone's world matrix; returns null when the goal (animated) matrix should be used unchanged
function step(J,t){const p=J.p,d=J.d,goal=J.bone.matrixWorld,e=goal.elements;
 const base=new THREE.Vector3(e[12],e[13],e[14]),L=new THREE.Vector3(e[0],e[1],e[2]).normalize(),U=new THREE.Vector3(e[4],e[5],e[6]).normalize(),Fw=new THREE.Vector3(e[8],e[9],e[10]).normalize();
 const tip=base.clone().addScaledVector(Fw,p.length);
 if(!d.init){d.init=1;init(d,t,base,tip);d.useGoal=0;d.useJig=16}
 if(t-d.last>.5)init(d,t,base,tip);
 let dt=t-d.last;const maxDt=dt<.001;let useGoal=false;if(dt>1/20)dt=1/30;// long frames: clamp the step (keeps the sim stable) instead of freezing on the goal pose
 if(useGoal)d.useGoal=32;else if(d.useGoal>0){useGoal=true;d.useGoal--}else d.useJig=32;
 if(d.useJig>0){d.useJig--;d.useGoal=0;useGoal=false}
 if(maxDt)dt=.001;else if(useGoal)return null;
 d.last=t;
 let out=null;
 if(p.flags&(F.FLEX|F.RIGID)){
  d.tipAcc.y-=p.tipMass;
  if(p.flags&F.FLEX){const err=tip.clone().sub(d.tipPos);const lx=dot(L,err),ly=dot(U,err),lz=dot(Fw,err);const vx=dot(L,d.tipVel),vy=dot(U,d.tipVel);
   const ya=p.yawStiffness*lx-p.yawDamping*vx,pa=p.pitchStiffness*ly-p.pitchDamping*vy;
   if(p.flags&F.LENGTH)d.tipAcc.addScaledVector(L,ya).addScaledVector(U,pa);
   else{const vz=dot(Fw,d.tipVel);const aa=p.alongStiffness*lz-p.alongDamping*vz;d.tipAcc.addScaledVector(L,ya).addScaledVector(U,pa).addScaledVector(Fw,aa)}}
  d.tipVel.addScaledVector(d.tipAcc,dt);d.tipPos.addScaledVector(d.tipVel,dt);d.tipAcc.set(0,0,0);
  if(p.flags&(F.YAW|F.PITCH)){let al=d.tipPos.clone().sub(base);
   if(p.flags&F.YAW){const ye=Math.atan2(dot(L,al),dot(Fw,al));let lim=null;if(ye<p.minYaw)lim=p.minYaw;else if(ye>p.maxYaw)lim=p.maxYaw;
    if(lim!=null){const s=Math.sin(lim),c=Math.cos(lim);// goal * yaw rotation about the bone's up axis
     const lL=L.clone().multiplyScalar(c).addScaledVector(Fw,-s),lF=L.clone().multiplyScalar(s).addScaledVector(Fw,c);
     d.tipPos.copy(base).addScaledVector(U,dot(U,al)).addScaledVector(lF,dot(lF,al));d.tipVel.set(0,0,0);al=d.tipPos.clone().sub(base)}}
   if(p.flags&F.PITCH){const pe=Math.atan2(dot(U,al),dot(Fw,al));let lim=null;if(pe<p.minPitch)lim=p.minPitch;else if(pe>p.maxPitch)lim=p.maxPitch;
    if(lim!=null){const s=Math.sin(lim),c=Math.cos(lim);const lF=U.clone().multiplyScalar(s).addScaledVector(Fw,c);
     d.tipPos.copy(base).addScaledVector(L,dot(L,al)).addScaledVector(lF,dot(lF,al));d.tipVel.set(0,0,0)}}}
  let fw=d.tipPos.clone().sub(base).normalize();
  if(p.flags&F.ANGLE){const dd=dot(fw,Fw);let ang=Math.acos(Math.max(-1,Math.min(1,dd)));if(dd<0)ang=2*Math.PI-ang;
   if(ang>p.angleLimit){const mb=p.length*Math.sin(p.angleLimit);const del=tip.clone().sub(d.tipPos).normalize();d.tipPos.copy(tip).addScaledVector(del,-mb);fw=d.tipPos.clone().sub(base).normalize()}}
  if(p.flags&F.LENGTH){d.tipPos.copy(base).addScaledVector(fw,p.length);d.tipVel.addScaledVector(fw,-dot(d.tipVel,fw))}
  const left=new THREE.Vector3().crossVectors(U,fw).normalize(),up=new THREE.Vector3().crossVectors(fw,left);
  out=new THREE.Matrix4().makeBasis(left,up,fw).setPosition(base)}
 if(p.flags&F.BASE){d.baseAcc.y-=p.baseMass;const err=base.clone().sub(d.basePos);d.baseAcc.addScaledVector(err,p.baseStiffness).addScaledVector(d.baseVel,-p.baseDamping);
  d.baseVel.addScaledVector(d.baseAcc,dt);d.basePos.addScaledVector(d.baseVel,dt);d.baseAcc.set(0,0,0);
  const e2=d.basePos.clone().sub(base);let lx=dot(L,e2),ly=dot(U,e2),lz=dot(Fw,e2);const vx=dot(L,d.baseVel),vy=dot(U,d.baseVel),vz=dot(Fw,d.baseVel);
  if(lx<p.baseMinLeft||lx>p.baseMaxLeft){lx=Math.max(p.baseMinLeft,Math.min(p.baseMaxLeft,lx));d.baseAcc.addScaledVector(U,-p.baseLeftFriction*vy).addScaledVector(Fw,-p.baseLeftFriction*vz)}
  if(ly<p.baseMinUp||ly>p.baseMaxUp){ly=Math.max(p.baseMinUp,Math.min(p.baseMaxUp,ly));d.baseAcc.addScaledVector(L,-p.baseUpFriction*vx).addScaledVector(Fw,-p.baseUpFriction*vz)}
  if(lz<p.baseMinForward||lz>p.baseMaxForward){lz=Math.max(p.baseMinForward,Math.min(p.baseMaxForward,lz));d.baseAcc.addScaledVector(L,-p.baseForwardFriction*vx).addScaledVector(U,-p.baseForwardFriction*vy)}
  d.basePos.copy(base).addScaledVector(L,lx).addScaledVector(U,ly).addScaledVector(Fw,lz);d.baseVel.copy(d.basePos).sub(d.baseLast).divideScalar(dt);d.baseLast.copy(d.basePos);
  if(!out)out=goal.clone();out.setPosition(d.basePos)}
 else if(p.flags&F.BOING){const vel=base.clone().sub(d.lastBoing);d.lastBoing.copy(base);let sp=vel.length();if(sp<1e-5){vel.set(0,1,0);sp=0}else{vel.divideScalar(sp);sp/=dt}
  d.boingTime+=dt;if((sp>5||d.boingSpeed>5)&&d.boingTime>.5){if(Math.abs(d.boingSpeed-sp)>p.boingImpactSpeed||dot(vel,d.boingVelDir)<p.boingImpactAngle){d.boingTime=0;d.boingDir.copy(vel).negate()}}
  d.boingVelDir.copy(vel);d.boingSpeed=sp;let damp=1-p.boingDampingRate*d.boingTime;
  if(damp>=.01){damp*=damp;damp*=damp;const flex=p.boingAmplitude*Math.cos(p.boingFrequency*d.boingTime)*damp;const sq=1+flex,st=1-flex;
   const bd=d.boingDir,side=(Math.abs(bd.x)<.9?new THREE.Vector3().crossVectors(bd,new THREE.Vector3(1,0,0)):new THREE.Vector3().crossVectors(bd,new THREE.Vector3(0,1,0))).normalize(),oth=new THREE.Vector3().crossVectors(bd,side);
   const to=new THREE.Matrix4().makeBasis(side,oth,bd).transpose(),S=new THREE.Matrix4().makeScale(sq,sq,st),from=to.clone().transpose();
   out=new THREE.Matrix4().makeBasis(L,U,Fw).multiply(to.multiply(S).multiply(from)).setPosition(base)}}
 return out}
function tick(m,t){const L=m.jig;if(!L||!L.length)return;let any=false;if(!_i){_i=new THREE.Matrix4();_b=new THREE.Matrix4()}
 for(const J of L){if(!J.bone.parent)continue;J.bone.position.copy(J.rest[0]);J.bone.quaternion.copy(J.rest[1]);J.bone.scale.copy(J.rest[2]);J.bone.updateMatrixWorld(true);// goal = the bone's own (unjiggled) pose under its animated parent
  const M=step(J,t);if(!M)continue;any=true;
  _i.copy(J.bone.parent.matrixWorld).invert();_b.multiplyMatrices(_i,M);_b.decompose(J.bone.position,J.bone.quaternion,J.bone.scale);J.bone.updateMatrixWorld(true)}
 return any}
// bones: the cosmetic's bones by name (bonemerge creates new THREE.Bones for the ones the player skeleton doesn't have)
function add(m,bones,P){if(!P)return;m.jig=(m.jig||[]).filter(J=>J.bone.parent&&J.bone.parent.parent);for(const [n,p] of Object.entries(P)){const b=bones[n];if(b)m.jig.push({bone:b,p,d:{},rest:[b.position.clone(),b.quaternion.clone(),b.scale.clone()]})}}
window.ZJIG={add,tick};
})();


// Portions follow getgrenade/tf2-workbench (GPL-3.0): item classification, duplicate-weapon filtering, extra/attached models, icon decoding.
// ---- Live TF2 install (Settings > Graphics > Game Files): reads cosmetics straight out of the player's own tf/ folder, no downloads.
// The browser is handed the folder (File System Access API where the page may use it, a folder <input> everywhere else); the VPKs are
// never copied - each file is a byte range sliced out of the archive on demand. Formats follow the public Source SDK 2013 headers:
// VPK v2 directory trees, KeyValues text (items_game.txt, tf_english.txt, .vmt), studiohdr_t v48 + VVD + VTX (dx90), VTF 7.x.
(function(){
const ST={on:false,ready:false,src:null,vpk:{},items:null,byName:null,prefabs:null,loc:null,cache:{},icons:{},iconPend:{},flex:{},err:null,ncos:0};
const say=(t,ms)=>{try{if(window.toast)return toast(t);if(window.SDKX&&SDKX.toast)return SDKX.toast(t)}catch(e){}let d=document.getElementById('zlivet');if(!d){d=document.createElement('div');d.id='zlivet';d.style.cssText='position:fixed;left:50%;bottom:64px;transform:translateX(-50%);z-index:9999;background:#2b2725;color:#f5e5c1;border:2px solid #776b5f;border-radius:6px;padding:10px 18px;font:16px TF2Build,TF2,sans-serif;letter-spacing:.5px;pointer-events:none;transition:opacity .3s';document.body.appendChild(d)}d.textContent=t;d.style.opacity=1;clearTimeout(d._t);d._t=setTimeout(()=>d.style.opacity=0,ms||3500)};
const CLS={Scout:'scout',Soldier:'soldier',Pyro:'pyro',Demoman:'demoman',Heavy:'heavy',Engineer:'engineer',Medic:'medic',Sniper:'sniper',Spy:'spy'};
const SHORT={scout:'scout',soldier:'soldier',pyro:'pyro',demoman:'demo',heavy:'heavy',engineer:'engineer',medic:'medic',sniper:'sniper',spy:'spy'};
const RAW={scout:'scout',soldier:'soldier',pyro:'pyro',demoman:'demoman',heavy:'heavyweapons',engineer:'engineer',medic:'medic',sniper:'sniper',spy:'spy'};

// ---------- file sources ----------
// a source maps a top-level tf/ file name (tf2_misc_dir.vpk, tf2_misc_012.vpk ...) to a Blob
// h: the tf folder; h2: Team Fortress 2/hl2 when the page was given it (hl2_*.vpk come from there)
function dirSource(h,h2){const F={};return{kind:'dir',handle:h,async get(n){if(n in F)return F[n];const d=/^hl2_/i.test(n)?h2:h;if(!d)return F[n]=null;try{F[n]=await (await d.getFileHandle(n)).getFile()}catch(e){F[n]=null}return F[n]}}}
function listSource(files){const F={},R={};for(const f of files){const p=(f.webkitRelativePath||f.name).replace(/\\/g,'/').split('/');const nm=p[p.length-1];
  // .vpk files sitting directly in a tf/ folder (or at the top of whatever was picked); everything else by its path below tf/
  // (hl2_*.vpk sit in the hl2 folder next to tf, when the whole Team Fortress 2 folder was picked)
  const up=(p[p.length-2]||'').toLowerCase();if(p.length<=2||up=='tf'||(up=='hl2'&&/^hl2_/i.test(nm)))if(!(nm in F)||up=='tf'||up=='hl2')F[nm]=f;
  const ti=p.map(x=>x.toLowerCase()).lastIndexOf('tf');const rel=(ti>=0?p.slice(ti+1):p.slice(1)).join('/').toLowerCase();if(rel)R[rel]=f}
 return{kind:'list',async get(n){return F[n]||null},async path(p){return R[p]||null},has:n=>n in F}}

// ---------- VPK ----------
async function openVpk(src,base){const f=await src.get(base+'_dir.vpk');if(!f)return null;const b=new Uint8Array(await f.arrayBuffer());const dv=new DataView(b.buffer);
 const sig=dv.getUint32(0,true),ver=dv.getUint32(4,true),tsz=dv.getUint32(8,true);if(sig!==0x55aa1234)throw new Error(base+': not a VPK');const hdr=ver==1?12:28;
 let o=hdr;const E=new Map();const cs=()=>{let e=o;while(b[e])e++;let s='';for(let i=o;i<e;i++)s+=String.fromCharCode(b[i]);o=e+1;return s};
 for(;;){const ext=cs();if(!ext)break;for(;;){const d=cs();if(!d)break;for(;;){const n=cs();if(!n)break;
  const pre=dv.getUint16(o+4,true),ai=dv.getUint16(o+6,true),off=dv.getUint32(o+8,true),len=dv.getUint32(o+12,true);o+=18;const po=o;o+=pre;
  E.set(((d.trim()&&d!==' '?d+'/':'')+n+'.'+ext).toLowerCase(),{pre,po,ai,off,len})}}}
 const data=hdr+tsz;const A={};const arc=i=>A[i]||(A[i]=src.get(base+'_'+String(i).padStart(3,'0')+'.vpk'));
 return{base,E,async read(p){const e=E.get(p.toLowerCase().replace(/\\/g,'/'));if(!e)return null;const out=new Uint8Array(e.pre+e.len);out.set(b.subarray(e.po,e.po+e.pre),0);
  if(e.len){if(e.ai===0x7fff)out.set(b.subarray(data+e.off,data+e.off+e.len),e.pre);else{const af=await arc(e.ai);if(!af)throw new Error('missing '+base+'_'+e.ai+'.vpk');out.set(new Uint8Array(await af.slice(e.off,e.off+e.len).arrayBuffer()),e.pre)}}
  return out},has:p=>E.has(p.toLowerCase().replace(/\\/g,'/'))}}
async function read(p){p=p.toLowerCase().replace(/\\/g,'/').replace(/\/+/g,'/');for(const k of VPKS){const v=ST.vpk[k];if(v&&v.has(p))return v.read(p)}
 if(ST.src&&ST.src.kind=='dir'){// loose files under tf/ (custom content is skipped; this is only for files Valve ships loose)
  try{let h=ST.src.handle;const parts=p.split('/');for(let i=0;i<parts.length-1;i++)h=await h.getDirectoryHandle(parts[i]);const f=await (await h.getFileHandle(parts[parts.length-1])).getFile();return new Uint8Array(await f.arrayBuffer())}catch(e){}}
 if(ST.src&&ST.src.path){const f=await ST.src.path(p);if(f)return new Uint8Array(await f.arrayBuffer())}
 return null}
const has=p=>{p=p.toLowerCase().replace(/\\/g,'/').replace(/\/+/g,'/');return VPKS.some(k=>ST.vpk[k]&&ST.vpk[k].has(p))};

// TF2's own archives first, then the Half-Life 2 content it also mounts (shared particle materials)
const VPKS=['tf2_misc','tf2_textures','tf2_sound_misc','tf2_sound_vo_english','hl2_misc','hl2_textures'];
// ---------- KeyValues ----------
// keys are lower-cased; [$CONDITIONAL] tags are skipped; no escape sequences (Source text KV leaves backslashes alone, .vmt paths use them)
function KV(t,esc,multi){let i=0;const n=t.length;
 const tok=()=>{for(;;){while(i<n&&t.charCodeAt(i)<=32)i++;if(t.charCodeAt(i)===47&&t.charCodeAt(i+1)===47){while(i<n&&t.charCodeAt(i)!==10)i++;continue}break}
  if(i>=n)return null;const c=t[i];if(c==='{'||c==='}'){i++;return c}
  if(c==='"'){const s=++i;if(esc){let v='';while(i<n&&t[i]!=='"'){if(t[i]==='\\'&&i+1<n){const d=t[i+1];v+=d==='n'?'\n':d==='t'?'\t':d;i+=2;continue}v+=t[i++]}i++;return{s:v}}while(i<n&&t[i]!=='"')i++;const v=t.slice(s,i);i++;return{s:v}}
  const s=i;while(i<n&&t.charCodeAt(i)>32&&t[i]!=='{'&&t[i]!=='}'&&t[i]!=='"')i++;return{s:t.slice(s,i)}};
 const cond=v=>!!(v&&v.s!=null&&/^\[!?\$/.test(v.s)&&v.s.slice(-1)===']');
 const block=()=>{const o={};for(;;){let k=tok();if(k===null||k==='}')return o;if(k==='{'){block();continue}
  let v=tok();while(cond(v))v=tok();if(v===null)return o;
  const key=k.s.toLowerCase();let val;if(v==='{')val=block();else if(v==='}'){return o}else val=v.s;
  // a trailing [$WIN32]-style tag after a value
  {const s0=i;const p=tok();if(!cond(p))i=s0}
  if(!(key in o))o[key]=val;else if(typeof o[key]=='object'&&typeof val=='object'&&!Array.isArray(o[key]))Object.assign(o[key],val);else if(multi&&typeof val=='string')o[key]=[].concat(o[key],val)}};
 return block()}
const td=new TextDecoder('latin1');
function text(u8){if(u8[0]===0xff&&u8[1]===0xfe)return new TextDecoder('utf-16le').decode(u8.subarray(2));if(u8[0]===0xef&&u8[1]===0xbb)return new TextDecoder('utf-8').decode(u8.subarray(3));try{return new TextDecoder('utf-8',{fatal:true}).decode(u8)}catch(e){return td.decode(u8)}}

// ---------- items_game ----------
// MergeDefinitionPrefab / RecursiveInheritKeyValues (econ_item_schema.cpp): blocks merge recursively, scalars replace. The prefab list is
// applied back to front ("adjectives over the noun": the first prefab named wins), then the item's own keys override everything.
// (items.rs in getgrenade/tf2-workbench applies them front to back; the game's order is used here.)
function over(dst,src){for(const k in src){if(k=='_r')continue;const v=src[k];if(v&&typeof v=='object'){if(dst[k]&&typeof dst[k]=='object')over(dst[k],v);else dst[k]=over({},v)}else dst[k]=v}return dst}
function resolve(it,d){if(it._r)return it._r;const out={};if(d<8&&it.prefab)for(const p of String(it.prefab).split(/\s+/).filter(Boolean).reverse()){const P=ST.prefabs[p.toLowerCase()];if(P)over(out,resolve(P,d+1))}
 const own={};for(const k in it)if(k!='prefab'&&k!='_r')own[k]=it[k];over(out,own);if(it.prefab)out._prefabs=String(it.prefab).toLowerCase().split(/\s+/).filter(Boolean);it._r=out;return out}
const norm=n=>String(n||'').toLowerCase().replace(/&#39;|\u2019/g,"'").replace(/^(the|a) /,'').replace(/\s+/g,' ').trim();
const MEDAL=/TournamentMedal|CommunityMedal/i;
// what a schema entry is, the way the loadout treats it (CTFItemDefinition item_class / item_slot)
const regsOf=r=>{const out=[];if(r.equip_region&&typeof r.equip_region=='string')out.push(r.equip_region.toLowerCase());if(r.equip_regions&&typeof r.equip_regions=='object')Object.keys(r.equip_regions).forEach(k=>out.push(k.toLowerCase()));return out};
const hasModel=r=>!!((r.model_player&&String(r.model_player).trim())||(r.model_player_per_class&&typeof r.model_player_per_class=='object'&&Object.keys(r.model_player_per_class).length));
const robotOnly=r=>/^mvm /i.test(String(r.name||''))||/^tw_[a-z]+bot_/i.test(String(r.name||''))||/models\/bots\//i.test(JSON.stringify(r.model_player||r.model_player_per_class||'').replace(/\\\\/g,'/'));
function kindOf(r){const cl=String(r.item_class||'').toLowerCase(),sl=String(r.item_slot||'').toLowerCase();
 if(MEDAL.test(String(r.item_type_name||''))||regsOf(r).includes('medal'))return 'medal';
 if(sl=='taunt'||(r.taunt&&!/^(primary|secondary|melee|pda|pda2|building)$/.test(sl)))return 'taunt';
 if(/^tf_wearable/.test(cl)&&!/_vm/.test(cl)&&(sl=='head'||sl=='misc')&&hasModel(r))return robotOnly(r)?'other':'cos';
 if(sl=='action')return 'action';
 if(/^(primary|secondary|melee|pda|pda2|building)$/.test(sl)&&/^(tf_weapon|saxxy|tf_wearable)/.test(cl))return 'wep';
 return 'other'}
const locs=t=>{if(!t)return null;const v=ST.loc[String(t).replace(/^#/,'').toLowerCase()];return v&&!/^#/.test(v)?v:null};
async function index(){const ig=await read('scripts/items/items_game.txt');if(!ig)throw new Error('items_game.txt not found (tf/scripts/items)');
 const R=KV(text(ig));const root=R.items_game||R;const all=[];ST.prefabs={};for(const k in (root.prefabs||{}))ST.prefabs[k.toLowerCase()]=root.prefabs[k];
 let L={};try{const le=await read('resource/tf_english.txt');if(le){const T=KV(text(le),true);const lang=T.lang||T;L=(lang.tokens)||{}}}catch(e){}
 ST.loc=L;const by=new Map();const items=root.items||{};let nc=0;
 for(const id in items){const it=items[id];if(!it||typeof it!='object'||id=='default')continue;const r=resolve(it,0);const k=kindOf(r);const dn=locs(r.item_name)||r.name;
  const e={id,r,k,dn};if(k=='cos')nc++;all.push(e)}
 const drop=dupWeapons(all.filter(e=>e.k=='wep'));ST.drop=drop;
 for(const e of all){const k=e.k;for(const nm of [e.dn,e.r.name]){if(!nm)continue;const key=norm(nm);const o=by.get(key);
   if(!o||(o.k=='other'&&k!='other')||(o.k=='medal'&&k!='medal')||(drop.has(o.id)&&!drop.has(e.id)&&o.k==k))by.set(key,e)}}
 ST.conf={};const EC=root.equip_conflicts||{};for(const k in EC)if(EC[k]&&typeof EC[k]=='object')ST.conf[k.toLowerCase()]=Object.keys(EC[k]).map(x=>x.toLowerCase());
 ST.byName=by;ST.items=items;ST.ncos=nc;ST.byId=new Map(all.map(e=>[String(e.id),e]));
 ST.pfx={};const walk=o=>{for(const k in o){const v=o[k];if(!v||typeof v!='object')continue;if(/^\d+$/.test(k)&&v.system)ST.pfx[k]={system:String(v.system),attachment:v.attachment?String(v.attachment).toLowerCase():null,root:String(v.attach_to_rootbone||'0')=='1'};else walk(v)}};walk(root.attribute_controlled_attached_particles||{})}
function particle(n){const e=entry(n);if(!e||!ST.pfx)return null;const a=e.r.attributes||{};for(const k in a){const x=a[k];if(x&&x.attribute_class=='set_attached_particle_static'){const P=ST.pfx[String(parseInt(x.value))];if(P)return Object.assign({id:+x.value},P)}}return null}
// items.rs drop_duplicate_weapons: a `normal` template (TF_WEAPON_BAT next to Upgradeable TF_WEAPON_BAT) goes when a non-normal entry has the same
// model, covers every class it is for, in the same slot; paint-kit skin entries go when a non-skin entry has the same model, icon and slot
function dupWeapons(W){const q=w=>String(w.r.item_quality||'unique').toLowerCase(),cls=w=>Object.keys(w.r.used_by_classes||{}).map(c=>c.toLowerCase());
 const slotFor=(w,c)=>{const v=(w.r.used_by_classes||{})[c];return v&&String(v).trim()!=='1'&&String(v).trim()?String(v).trim().toLowerCase():String(w.r.item_slot||'')};
 const mk=w=>String(w.r.model_player||'').replace(/\\/g,'/')+'|'+JSON.stringify(w.r.model_player_per_class||{});
 const skin=w=>(w.r._prefabs||[]).some(p=>p.startsWith('paintkit_weapon'));const G=new Map();for(const w of W){const k=mk(w);if(!G.has(k))G.set(k,[]);G.get(k).push(w)}
 const out=new Set();for(const L of G.values()){if(L.length<2)continue;for(const w of L){const wc=cls(w);
   const cov=L.some(v=>v.id!==w.id&&q(v)!=='normal'&&(()=>{const vc=cls(v);return wc.every(c=>!vc.length||vc.includes(c))&&wc.every(c=>slotFor(v,c)==slotFor(w,c))})());
   const cp=skin(w)&&L.some(v=>!skin(v)&&v.id!==w.id&&v.r.image_inventory==w.r.image_inventory&&v.r.item_slot==w.r.item_slot&&(()=>{const vc=cls(v);return wc.every(c=>!vc.length||vc.includes(c))})());
   if((q(w)=='normal'&&cov)||cp)out.add(w.id)}}
 return out}
const QPRE=/^(strange|unusual|vintage|genuine|haunted|collector's|self-made|decorated|festive|festivized|australium|killstreak|specialized killstreak|professional killstreak|botkiller|silver|gold|rust|blood|carbonado|diamond) /i;
function entry(n){if(!ST.byName)return null;{const m=/^#(\d+)$/.exec(String(n));if(m)return ST.byId.get(m[1])||null}let k=norm(n),e=ST.byName.get(k);let x=String(n);for(let i=0;!e&&i<4&&QPRE.test(x);i++){x=x.replace(QPRE,'');e=ST.byName.get(norm(x))}return e||null}
const clsKey=cl=>CLS[cl]||String(cl).toLowerCase();
const usedBy=(r,c)=>{const ub=r.used_by_classes;if(!ub||!Object.keys(ub).length)return '1';return ub[c]||(c=='demoman'&&ub.demo)||(c=='heavy'&&ub.heavyweapons)||null};
const styleOf=(e,si)=>{const S=e&&e.r.visuals&&e.r.visuals.styles;if(+si>=KSTREAK)si=0;return S?(S[String(si||0)]||null):null};
function mdlFor(e,cl,si,team){const r=e.r,c=clsKey(cl);if(!usedBy(r,c))return null;const cand=[];if(+si===PYROLAND&&pvModel(e))cand.push(pvModel(e));
 const pcAdd=pc=>{if(!pc)return;if(pc[c])cand.push(pc[c]);if(c=='demoman'&&pc.demo)cand.push(pc.demo);if(c=='heavy'&&pc.heavyweapons)cand.push(pc.heavyweapons);if(pc.basename)[SHORT[c],RAW[c],c].forEach(s=>cand.push(pc.basename.replace(/%s/g,s)))};
 const st=styleOf(e,si);if(st){pcAdd(team=='BLU'?st.model_player_per_class_blue:st.model_player_per_class_red);pcAdd(st.model_player_per_class);if(st.model_player)cand.push(st.model_player)}
 // CTFWeaponBase::GetWorldModel: a weapon's model_world is what third person shows (the Hot Hand's w_slapping_glove; its c_ model is the viewmodel rig)
 if(e.k=='wep'&&r.model_world&&typeof r.model_world=='string')cand.push(r.model_world);
 pcAdd(r.model_player_per_class);if(r.model_player)cand.push(r.model_player);
 // an action item with no worn model of its own shows its extra_wearable (the Secret Diary and Halloween Spellbook's books)
 if(e.k=='action'&&!cand.length){const x=xwOf(e);if(x)cand.push(x)}
 for(const p of cand)if(has(p))return p;return null}
// CEconItemView::GetSkin: the style's per-team (or single) skin, then visuals "skin", then the team's own family
function skinFor(e,si,team,nfam){const st=styleOf(e,si);const pick=v=>v==null?null:Math.min(+v,nfam-1);
 if(st){const t=team=='BLU'?st.skin_blu:st.skin_red;if(t!=null)return pick(t);if(st.skin!=null)return pick(st.skin)}
 {const vt=team=='BLU'?e.r.visuals_blu:e.r.visuals_red;if(vt&&vt.skin!=null)return pick(vt.skin)}
 const v=e.r.visuals;if(v&&v.skin!=null)return pick(v.skin);return team=='BLU'&&nfam>1?1:0}
// items that look different in Pyroland (model_vision_filtered: the Jingle Belt, A Whiff of the Old Brimstone and the Captain's
// Cocktails turn into baby bottles) get a "Pyroland" style that shows that model
const PYROLAND=100;
// a tf_wearable_levelable_item (the Grandmaster) shows its "level" bodygroup by the wearer's killstreak (CTFWearableLevelableItem);
// each submodel of that bodygroup is offered as a style KSTREAK+n, named from the submodel (chess_scout_bg_rook_red -> Rook)
const KSTREAK=200;const levelable=e=>!!e&&String(e.r.item_class||'')=='tf_wearable_levelable_item';ST.lvl={};
function lvlNames(e){const id=e.id;if(id in ST.lvl)return ST.lvl[id];ST.lvl[id]=null;
 (async()=>{let p=null;for(const c of ['scout','soldier','pyro','demoman','heavy','engineer','medic','sniper','spy']){p=mdlFor(e,c,0,'RED');if(p)break}
  let L=[];const b=p&&await read(p);if(b){const M=new DataView(b.buffer,b.byteOffset,b.byteLength),I=o=>M.getInt32(o,true);const nbp=I(232),bpi=I(236);
   for(let bp=0;bp<nbp;bp++){const o=bpi+bp*16;if(cstr(b,o+I(o)).toLowerCase()!='level')continue;const nm=I(o+4),mi=I(o+12);
    for(let j=0;j<nm;j++){const sn=cstr(b,o+mi+j*148).toLowerCase();const m=/_bg_([a-z]+)/.exec(sn);const w=m?m[1]:('Level '+(j+1));L.push({i:KSTREAK+j,name:w[0].toUpperCase()+w.slice(1)})}}}
  ST.lvl[id]=L;if(window.ZSTYLETABS)ZSTYLETABS()})().catch(()=>{ST.lvl[id]=[]});return null}
const styleLabel=n=>{const e=entry(n);if(levelable(e))return 'Killstreak';if(e&&pvModel(e))return 'Pyroland';return 'Style'};
function styles(n){const e=entry(n);if(levelable(e)){const L=lvlNames(e);return L&&L.length>1?L:[]}const S=e&&e.r.visuals&&e.r.visuals.styles;
 let L=S?Object.keys(S).filter(k=>/^\d+$/.test(k)&&String(S[k].selectable)!=='0').sort((a,b)=>a-b).map(k=>({i:+k,name:locs(S[k].name)||('Style '+(+k+1))})):[];
 if(e&&pvModel(e)){if(L.length<2)L=[{i:0,name:'Normal'}];L.push({i:PYROLAND,name:'Pyroland'})}return L.length>1?L:[]}
const pvModel=e=>{const v=e.r.model_vision_filtered;return v&&typeof v=='string'&&v.trim()?v.replace(/\\/g,'/'):null};
function paintable(n){const e=entry(n);const v=e&&e.r.capabilities&&e.r.capabilities.paintable;return v!=null&&String(v).trim()!=='0'}
function regions(n){const e=entry(n);return e?regsOf(e.r):[]}
// item facts the loadout UI filters / colours by
function classes(n){const e=entry(n);if(!e)return null;const ub=Object.keys(e.r.used_by_classes||{}).map(c=>c.toLowerCase());if(ub.length)return ub;if(e.k=='taunt'){const pc=(e.r.taunt||{}).custom_taunt_scene_per_class;if(pc)return Object.keys(pc)}return ['scout','soldier','pyro','demoman','heavy','engineer','medic','sniper','spy']}
function holiday(n){const e=entry(n);const h=e&&e.r.holiday_restriction;return h?String(h).toLowerCase():null}
function quality(n){const e=entry(n);return e?String(e.r.item_quality||'unique').toLowerCase():null}
function attrClass(r,c){for(const b of ['attributes','static_attrs']){const B=r[b];if(!B||typeof B!='object')continue;for(const k in B){const v=B[k];if(v&&typeof v=='object'&&String(v.attribute_class||'').toLowerCase()==c&&String(v.value==null?'1':v.value).trim()!=='0')return true}}return false}
function skinOverride(n){const e=entry(n);return !!(e&&attrClass(e.r,'player_skin_override'))}
// worn weapon-slot items (Razorback, Gunboats, Booties, shields...): drawn on the body, never in the hand
function wornWep(n,cl){if(!ST.ready)return false;const e=entry(n);return !!(e&&e.k=='wep'&&((/^tf_wearable/.test(String(e.r.item_class||'').toLowerCase())&&(!cl||mdlFor(e,cl)))||passiveXW(e,cl)))}
// a weapon-slot item with no model of its own that is only ever seen as its extra_wearable (the B.A.S.E. Jumper's pack): worn on the back, the merc holds another weapon
function passiveXW(e,cl){return !!(e&&e.k=='wep'&&!e.r.model_player&&!e.r.model_player_per_class&&!e.r.model_world&&xwOf(e)&&(!cl||usedBy(e.r,clsKey(cl)))&&!armOnly(e,cl))}
const xwOf=e=>{const x=e&&e.r.extra_wearable;return x&&typeof x=='string'&&x.trim()&&has(x.replace(/\\/g,'/'))?x.replace(/\\/g,'/'):null};
function hasXW(n,cl){if(!ST.ready)return false;const e=entry(n);return !!(e&&e.k=='wep'&&(xwOf(e)||wornWep(n,cl)||armOnly(e,cl)))}
function tauntSlot(n){const e=entry(n);const a=e&&e.r.attributes;if(!a)return null;for(const k in a){const x=a[k];if(x&&x.attribute_class=='taunt_force_weapon_slot')return String(x.value).toLowerCase()}return null}
// visuals.player_poseparam (the Hot Hand: r_hand_grip 15, r_arm 3): the class's hidden pose sequences driven by those parameters
// (pyro_animations.mdl r_handposes / r_armposes, autolayered at full weight on stand_ / run_MELEE_ALLCLASS) give the hand and arm their grip;
// returned as bone -> local [quaternion, position] for the bones in each sequence's weightlist
const PLYR={};async function poseLayers(n,cl){const e=entry(n);const pp=e&&e.r.visuals&&e.r.visuals.player_poseparam;if(!pp||typeof pp!='object')return null;const c=clsKey(cl);const key=c+'|'+norm(n);
 if(PLYR[key])return PLYR[key];return PLYR[key]=(async()=>{const out={};
  for(const p of await animMdls(c)){const b=await mdlBuf(p);if(!b)continue;const dv=new DataView(b.buffer,b.byteOffset,b.byteLength);const I=o=>dv.getInt32(o,true),F=o=>dv.getFloat32(o,true);
   const npp=I(300),ppi=I(304);const PN=[];for(let k=0;k<npp;k++){const o=ppi+k*20;PN.push([cstr(b,o+I(o)).toLowerCase(),F(o+8),F(o+12)])}
   const nb=I(156),bi=I(160);const BN=[];for(let i=0;i<nb;i++){const o=bi+i*216;BN.push(cstr(b,o+I(o)))}
   const ns=I(188),si=I(192);
   for(const pn in pp){const want=+pp[pn];const pi=PN.findIndex(x=>x[0]==pn.toLowerCase());if(pi<0)continue;
    for(let i=0;i<ns;i++){const o=si+i*212;const g0=I(o+68);if(g0<2||I(o+76)!==pi)continue;const a=F(o+84),en=F(o+92);const t=en!==a?(want-a)/(en-a):0;const cell=Math.max(0,Math.min(g0-1,Math.round(t*(g0-1))));
     const ai=dv.getInt16(o+I(o+60)+cell*2,true);const A=decodeAnim(b,ai);if(A.flags&4)continue;const f=A.frame(0);if(!f)continue;const wl=o+I(o+156);
     for(let j=0;j<nb;j++){if(F(wl+j*4)>0&&A.bones[j]&&A.bones[j].parent>=0)out[BN[j]]=[f.Q[j],f.P[j]]}break}}
   if(Object.keys(out).length)break}
  return Object.keys(out).length?out:null})()}
async function wmHide(n,cl){const e=entry(n);if(e&&/^tf_weapon_slap$/i.test(String(e.r.item_class||''))&&clsKey(cl)=='pyro')return{part:'righthand',st:1};const wo=wmOv(e);if(!wo)return null;const L=await pbNames(clsKey(cl));return L&&L[wo.i]?{part:L[wo.i],st:wo.st}:null}
// visuals wm_bodygroup_override / _state_override: set on the OWNER's model (CEconEntity / CTFPlayerModelPanel: pOwner->SetBodygroup) —
// the Short Circuit puts the Engineer's rightarm bodygroup (index 2) in state 2, the empty one
function wmOv(e){const V=e&&e.r.visuals;if(!V||V.wm_bodygroup_override==null||V.wm_bodygroup_state_override==null)return null;const i=+V.wm_bodygroup_override,st=+V.wm_bodygroup_state_override;return i>-1&&st>-1?{i,st}:null}
ST.pbn={};async function pbNames(c){if(ST.pbn[c])return ST.pbn[c];const b=await read('models/player/'+SHORT[c]+'.mdl');if(!b)return ST.pbn[c]=[];const M=new DataView(b.buffer,b.byteOffset,b.byteLength),I=o=>M.getInt32(o,true);
 const nbp=I(232),bpi=I(236),L=[];for(let i=0;i<nbp;i++){const o=bpi+i*16;L.push(cstr(b,o+I(o)).toLowerCase())}return ST.pbn[c]=L}
// a weapon that is a bodygroup of the class model itself (the Gunslinger: player_bodygroups rightarm 1 on engineer.mdl), no model of its own
function armOnly(e,cl){if(!e||e.k!='wep'||(cl&&!usedBy(e.r,clsKey(cl))))return null;if(e.r.model_player||e.r.model_player_per_class)return null;const pb=(e.r.visuals||{}).player_bodygroups;if(!pb||typeof pb!='object')return null;
 const o={};for(const k in pb)if(+pb[k]>0)o[k.toLowerCase()]=+pb[k];return Object.keys(o).length?o:null}
// ---------- VTF ----------
const BPP={0:4,1:4,2:3,3:3,4:2,5:1,6:2,8:1,9:3,10:3,11:4,12:4,16:4,17:2,18:2,19:2,21:2,22:2,23:4,24:8,25:8};
function mipBytes(fmt,w,h){if(fmt==13||fmt==20)return Math.max(1,(w+3)>>2)*Math.max(1,(h+3)>>2)*8;if(fmt==14||fmt==15)return Math.max(1,(w+3)>>2)*Math.max(1,(h+3)>>2)*16;return w*h*(BPP[fmt]||4)}
function c565(c,o,a){a[o]=((c>>11)&31)*255/31|0;a[o+1]=((c>>5)&63)*255/63|0;a[o+2]=(c&31)*255/31|0}
function dxt(src,o0,w,h,fmt){const out=new Uint8Array(w*h*4);const bw=Math.max(1,(w+3)>>2),bh=Math.max(1,(h+3)>>2);const bs=fmt==13||fmt==20?8:16;const C=new Uint8Array(16),A=new Uint8Array(16);let o=o0;
 for(let by=0;by<bh;by++)for(let bx=0;bx<bw;bx++){let ca=o;
  if(fmt==15){const a0=src[o],a1=src[o+1];const al=[a0,a1];if(a0>a1)for(let k=1;k<7;k++)al.push(((7-k)*a0+k*a1)/7|0);else{for(let k=1;k<5;k++)al.push(((5-k)*a0+k*a1)/5|0);al.push(0,255)}
   let bits=0,nb=0,p=o+2;for(let k=0;k<16;k++){if(nb<3){bits|=src[p++]<<nb;nb+=8}A[k]=al[bits&7];bits>>=3;nb-=3}ca=o+8}
  else if(fmt==14){for(let k=0;k<16;k++){const v=(src[o+(k>>1)]>>((k&1)*4))&15;A[k]=v*17}ca=o+8}
  const c0=src[ca]|src[ca+1]<<8,c1=src[ca+2]|src[ca+3]<<8;c565(c0,0,C);c565(c1,4,C);C[3]=C[7]=255;
  if(c0>c1||fmt!=13&&fmt!=20){for(let j=0;j<3;j++){C[8+j]=(2*C[j]+C[4+j])/3|0;C[12+j]=(C[j]+2*C[4+j])/3|0}C[11]=C[15]=255}
  else{for(let j=0;j<3;j++){C[8+j]=(C[j]+C[4+j])>>1;C[12+j]=0}C[11]=255;C[15]=0}
  const idx=src[ca+4]|src[ca+5]<<8|src[ca+6]<<16|src[ca+7]<<24;
  for(let k=0;k<16;k++){const x=bx*4+(k&3),y=by*4+(k>>2);if(x>=w||y>=h)continue;const ci=(idx>>>(2*k))&3,d=(y*w+x)*4;out[d]=C[ci*4];out[d+1]=C[ci*4+1];out[d+2]=C[ci*4+2];out[d+3]=fmt==13||fmt==20?C[ci*4+3]:A[k]}
  o+=bs}return out}
function vtf(b,maxDim,face,frame){const dv=new DataView(b.buffer,b.byteOffset,b.byteLength);if(dv.getUint32(0,true)!==0x00465456)throw new Error('not a VTF');
 const v1=dv.getUint32(8,true),hs=dv.getUint32(12,true),W=dv.getUint16(16,true),H=dv.getUint16(18,true),flags=dv.getUint32(20,true),frames=dv.getUint16(24,true)||1;
 const fmt=dv.getInt32(52,true),mips=b[56],lfmt=dv.getInt32(57,true),lw=b[61],lh=b[62];const depth=v1>=2?(dv.getUint16(63,true)||1):1;const faces=(flags&0x4000)?(v1<5?7:6):1;
 let off=hs+(lfmt>=0&&lw?mipBytes(lfmt,lw,lh):0);
 if(v1>=3){const nr=dv.getUint32(68,true);for(let i=0;i<nr;i++){const tag=b[80+i*8]|b[81+i*8]<<8|b[82+i*8]<<16;if(tag===0x30)off=dv.getUint32(84+i*8,true)}}
 let L=0;while(L<mips-1&&Math.max(W>>L,H>>L)>(maxDim||1024))L++;
 // mips are stored smallest first; each holds frames x faces x slices
 let o=off;for(let m=mips-1;m>L;m--)o+=mipBytes(fmt,Math.max(1,W>>m),Math.max(1,H>>m))*frames*faces*depth;
 const w=Math.max(1,W>>L),h=Math.max(1,H>>L);if(face)o+=face*mipBytes(fmt,w,h);if(frame)o+=frame*faces*depth*mipBytes(fmt,w,h);let px;
 if(fmt==13||fmt==14||fmt==15||fmt==20)px=dxt(b,o,w,h,fmt);
 else{px=new Uint8Array(w*h*4);const n=w*h;const s=b;
  for(let i=0,p=o;i<n;i++){const d=i*4;switch(fmt){
   case 0:px[d]=s[p];px[d+1]=s[p+1];px[d+2]=s[p+2];px[d+3]=s[p+3];p+=4;break;
   case 1:px[d]=s[p+3];px[d+1]=s[p+2];px[d+2]=s[p+1];px[d+3]=s[p];p+=4;break;
   case 2:case 9:px[d]=s[p];px[d+1]=s[p+1];px[d+2]=s[p+2];px[d+3]=255;p+=3;break;
   case 3:case 10:px[d]=s[p+2];px[d+1]=s[p+1];px[d+2]=s[p];px[d+3]=255;p+=3;break;
   case 11:px[d]=s[p+1];px[d+1]=s[p+2];px[d+2]=s[p+3];px[d+3]=s[p];p+=4;break;
   case 12:px[d]=s[p+2];px[d+1]=s[p+1];px[d+2]=s[p];px[d+3]=s[p+3];p+=4;break;
   case 16:px[d]=s[p+2];px[d+1]=s[p+1];px[d+2]=s[p];px[d+3]=255;p+=4;break;
   case 5:px[d]=px[d+1]=px[d+2]=s[p];px[d+3]=255;p+=1;break;
   case 6:px[d]=px[d+1]=px[d+2]=s[p];px[d+3]=s[p+1];p+=2;break;
   case 8:px[d]=px[d+1]=px[d+2]=0;px[d+3]=s[p];p+=1;break;
   case 22:px[d]=s[p];px[d+1]=s[p+1];px[d+2]=255;px[d+3]=255;p+=2;break;
   case 23:px[d]=s[p];px[d+1]=s[p+1];px[d+2]=s[p+2];px[d+3]=s[p+3];p+=4;break;
   case 4:case 17:{const c=s[p]|s[p+1]<<8;c565(c,d,px);if(fmt==17){const t=px[d];px[d]=px[d+2];px[d+2]=t}px[d+3]=255;p+=2;break}
   case 19:{const c=s[p]|s[p+1]<<8;px[d+2]=(c&15)*17;px[d+1]=((c>>4)&15)*17;px[d]=((c>>8)&15)*17;px[d+3]=((c>>12)&15)*17;p+=2;break}
   case 21:case 18:{const c=s[p]|s[p+1]<<8;px[d+2]=(c&31)*255/31|0;px[d+1]=((c>>5)&31)*255/31|0;px[d]=((c>>10)&31)*255/31|0;px[d+3]=fmt==21?(c>>15)*255:255;p+=2;break}
   case 24:{const h=k=>{const x=s[p+k]|s[p+k+1]<<8;const e=(x>>10)&31,m=x&1023;const v=e===0?m/16777216:(1+m/1024)*Math.pow(2,e-15);return Math.min(255,Math.max(0,v)*255+.5)|0};px[d]=h(0);px[d+1]=h(2);px[d+2]=h(4);px[d+3]=255;p+=8;break}
   default:throw new Error('VTF format '+fmt)}}}
 return{w,h,px,flags,faces,frames}}
async function tex(path,srgb,maxDim){if(!path)return null;let p=String(path).replace(/\\/g,'/').replace(/\.vtf$/i,'').toLowerCase();const key=p+'|'+(srgb?1:0);if(ST.cache[key])return ST.cache[key];
 return ST.cache[key]=(async()=>{const b=await read('materials/'+p+'.vtf');if(!b)return null;const T=vtf(b,maxDim);
  const t=new THREE.DataTexture(T.px,T.w,T.h,THREE.RGBAFormat);t.flipY=false;t.generateMipmaps=true;t.minFilter=THREE.LinearMipmapLinearFilter;t.magFilter=THREE.LinearFilter;
  t.wrapS=(T.flags&4)?THREE.ClampToEdgeWrapping:THREE.RepeatWrapping;t.wrapT=(T.flags&8)?THREE.ClampToEdgeWrapping:THREE.RepeatWrapping;t.anisotropy=8;if(srgb)t.encoding=THREE.sRGBEncoding;t.needsUpdate=true;t.userData.vtf=p;t.userData.alpha=!!(T.flags&0x3000);return t})()}
// AnimatedTexture: every frame of the VTF stacked top to bottom in one texture (the shader picks the frame: (fract(v)+frame)/frames)
async function texStrip(path,srgb,maxDim){if(!path)return null;let p=String(path).replace(/\\/g,'/').replace(/\.vtf$/i,'').toLowerCase();const key=p+'|strip|'+(srgb?1:0);if(ST.cache[key])return ST.cache[key];
 return ST.cache[key]=(async()=>{const b=await read('materials/'+p+'.vtf');if(!b)return null;const T0=vtf(b,maxDim||512);const n=Math.min(T0.frames||1,32);if(n<2)return null;
  const px=new Uint8Array(T0.w*T0.h*4*n);px.set(T0.px.subarray(0,T0.w*T0.h*4),0);for(let f=1;f<n;f++){const T=vtf(b,maxDim||512,0,f);px.set(T.px.subarray(0,T0.w*T0.h*4),f*T0.w*T0.h*4)}
  const t=new THREE.DataTexture(px,T0.w,T0.h*n,THREE.RGBAFormat);t.flipY=false;t.generateMipmaps=false;t.minFilter=t.magFilter=THREE.LinearFilter;t.wrapS=THREE.RepeatWrapping;t.wrapT=THREE.ClampToEdgeWrapping;if(srgb)t.encoding=THREE.sRGBEncoding;t.needsUpdate=true;
  t.userData.frames=n;t.userData.alpha=!!(T0.flags&0x3000);return t})()}
// material proxies the loadout shader runs (index.html PROX): Sine, LinearRamp, TextureTransform, TextureScroll, AnimatedTexture on $basetexture
function proxies(k,P){const X=k.proxies;if(!X||typeof X!='object')return;const out=[];const L=[];for(const n in X){const v=X[n];if(Array.isArray(v))v.forEach(x=>L.push([n,x]));else L.push([n,v])}
 for(const [n,q] of L){if(!q||typeof q!='object')continue;const rv=String(q.resultvar||'').toLowerCase();
  if(n=='sine'&&rv)out.push({t:'sine',r:rv,p:num(q.sineperiod,1)||1,min:num(q.sinemin,0),max:num(q.sinemax,1),o:num(q.timeoffset,0)});
  else if(n=='linearramp'&&rv)out.push({t:'ramp',r:rv,rate:num(q.rate,1),init:num(q.initialvalue,0)});
  else if(n=='texturetransform'&&(!rv||rv=='$basetexturetransform'))out.push({t:'xf',c:String(q.centervar||'$center').toLowerCase(),s:String(q.scalevar||'$scale').toLowerCase(),a:String(q.rotatevar||'$angle').toLowerCase(),tr:String(q.translatevar||'$translate').toLowerCase()});
  else if(n=='texturescroll'&&(!q.texturescrollvar||String(q.texturescrollvar).toLowerCase()=='$basetexturetransform')){const r=num(q.texturescrollrate,1),a=num(q.texturescrollangle,0)*Math.PI/180;
   out.push({t:'ramp',r:'$zscroll[0]',rate:r*Math.cos(a),init:0},{t:'ramp',r:'$zscroll[1]',rate:r*Math.sin(a),init:0},{t:'xf',c:'$center',s:'$scale',a:'$angle',tr:'$zscroll'})}
  else if(n=='animatedtexture'&&String(q.animatedtexturevar||'').toLowerCase()=='$basetexture'&&P._frames>1)out.push({t:'anim',n:P._frames,fps:num(q.animatedtextureframerate,15)})}
 // a static $basetexturetransform is a TextureTransform that never changes
 if(P.xf&&!out.some(x=>x.t=='xf'))out.push({t:'xf',c:'$center',s:'$scale',a:'$angle',tr:'$translate'});
 if(out.length)P.prox=out}
function xform(v){if(!v)return null;const s=String(v).toLowerCase();const g=(k,n)=>{const m=s.match(new RegExp(k+'\\s+([-\\d.e]+)'+(n>1?'\\s+([-\\d.e]+)':'')));return m?(n>1?[+m[1],+m[2]]:[+m[1]]):null};
 const X={center:g('center',2)||[.5,.5],scale:g('scale',2)||[1,1],angle:(g('rotate',1)||[0])[0],translate:g('translate',2)||[0,0]};
 return (X.scale[0]==1&&X.scale[1]==1&&!X.angle&&!X.translate[0]&&!X.translate[1])?null:X}

// ---------- VMT -> the loadout shader's material params (same keys models/w/weapons.json uses) ----------
async function vmt(path,d){let b=await read(path);if(!b)return null;let R=KV(text(b));const sh=Object.keys(R)[0];let M=R[sh]||{};
 if(sh=='patch'&&d<4){const inc=M.include;const base=inc?await vmt(String(inc).replace(/\\/g,'/'),d+1):null;const out=base?{shader:base.shader,kv:Object.assign({},base.kv)}:{shader:'vertexlitgeneric',kv:{}};
  for(const k in (M.insert||{}))out.kv[k]=M.insert[k];for(const k in (M.replace||{}))out.kv[k]=M.replace[k];return out}
 for(const c of Object.keys(M))if(/^>=?dx9/.test(c)&&M[c]&&typeof M[c]=='object'){for(const k2 in M[c])if(!(k2 in M)||true)M[k2]=M[c][k2]}
 return{shader:sh,kv:M}}
const num=(v,d)=>{if(v==null)return d;const x=parseFloat(String(v).replace(/[\[\]{}"]/g,''));return isNaN(x)?d:x};
const vec=(v,d)=>{if(v==null)return d;const s=String(v),b=s.includes('{');const a=s.replace(/[\[\]{}"]/g,' ').trim().split(/\s+/).map(Number);if(a.some(isNaN))return d;return b?a.map(x=>x/255):a};
// a vmt flag ($phong, $rimlight...) is an int in the material system: "$phong" ".5" reads as 0 (off), as in game
const flag=v=>Math.trunc(num(v,0))!==0?1:0;
const KNOWNWARP=new Set(['pyro','weapon','robot','jarate','mirv','softened_weapon','engineer_hands']);
async function params(M){const k=M.kv,sh=M.shader;const P={shader:sh};const T=[];
 const bt=k.$basetexture;const anim=k.proxies&&typeof k.proxies=='object'&&[].concat(k.proxies.animatedtexture||[]).some(q=>q&&String(q.animatedtexturevar||'').toLowerCase()=='$basetexture');
 P.map=bt&&anim?await texStrip(bt,true).catch(()=>null):null;if(P.map)P._frames=P.map.userData.frames;if(!P.map)P.map=bt?await tex(bt,true):null;
 // UnlitTwoTexture (the flamethrower pilot light): $basetexture x $texture2, additive
 if(String(sh).toLowerCase()=='unlittwotexture'&&k.$texture2)P.map2=await tex(k.$texture2,true).catch(()=>null);
 const phong=flag(k.$phong);P.phong=phong;const et=k.$phongexponenttexture;P.expTex=et?await tex(et,false):null;P.exp=P.expTex?0:num(k.$phongexponent,5);
 P.albTint=num(k.$phongalbedotint,0);P.rimMask=num(k.$rimmask,0);P.boost=num(k.$phongboost,1);P.fres=vec(k.$phongfresnelranges,[0,.5,1]);
 P.rim=phong?flag(k.$rimlight):0;P.halfL=flag(k.$halflambert);P.rimExp=num(k.$rimlightexponent,4);P.rimBoost=num(k.$rimlightboost,1);P.mask=flag(k.$basemapalphaphongmask);
 const bm=k.$bumpmap;P.bump=bm?await tex(bm,false):null;
 P.tintA=flag(k.$blendtintbybasealpha);P.tintOver=num(k.$blendtintcoloroverbase,0);if(k.$colortint_base)P.tintBase=vec(k.$colortint_base,null);
 if(k.proxies&&Object.keys(k.proxies).some(x=>x=='itemtintcolor'))P.itemTint=1;
 if(flag(k.$translucent))P.translucent=1;if(flag(k.$additive))P.additive=1;if(flag(k.$alphatest))P.aTest=1;
 if(k.$color2&&!P.itemTint&&!/"resultvar":"\$color2"/i.test(JSON.stringify(k.proxies||{}))){const c=vec(k.$color2,null);if(c&&c.length>=3&&(c[0]!=1||c[1]!=1||c[2]!=1))P.c2=c.slice(0,3)}
 // $selfillum (the mask: $selfillummask, else base alpha; cleared like InitSkin_DX9 when the base has no alpha and neither the mask nor the fresnel is set)
 if(num(k.$selfillum,0)){const fr=num(k.$selfillumfresnel,0);const mk=k.$selfillummask?await tex(k.$selfillummask,false).catch(()=>null):null;
  if(mk||fr||(P.map&&P.map.userData.alpha)){P.si=1;P.siTint=vec(k.$selfillumtint,[1,1,1]);if(mk)P.siMask=mk;if(fr)P.siFres=vec(k.$selfillumfresnelminmaxexp,[0,1,1])}}
 {const X=xform(k.$basetexturetransform);if(X)P.xf=X}
 proxies(k,P);
 const lw=k.$lightwarptexture;if(lw){const n=String(lw).replace(/\\/g,'/').split('/').pop().toLowerCase().replace(/_lightwarp$/,'');
  if(KNOWNWARP.has(n))P.warp=n;else{const t=await tex(lw,false,256);if(t&&window.ZWARPSET){t.generateMipmaps=false;t.minFilter=t.magFilter=THREE.LinearFilter;t.wrapS=t.wrapT=THREE.ClampToEdgeWrapping;ZWARPSET('live_'+n,t);P.warp='live_'+n}else P.warp='weapon'}}
 else P.warp='weapon';
 // $envmap (+ $envmaptint, masks): the cubemap read from the install, like the game samples it for these props
 // WantsSkinShader: phong with a lightwarp, a base-alpha phong mask or a bump map is drawn by the skin shader (its envmap mask is the base
 // alpha unless $normalmapalphaenvmapmask); everything else by vertexlit_and_unlit_generic ($envmapmask texture, 1 - base alpha for
 // $basealphaenvmapmask, contrast / saturation). env_cubemap has no level here: the 2fort cubemap, as tf2-workbench uses.
 const em=k.$envmap;if(em){const skin=phong&&(!!k.$lightwarptexture||!!num(k.$basemapalphaphongmask,0)||!!bm);P.env=vec(k.$envmaptint,[1,1,1]);P.envSkin=skin?1:0;
  const nma=num(k.$normalmapalphaenvmapmask,0),bae=num(k.$basealphaenvmapmask,0)||num(k.$basemapalphaenvmapmask,0);
  P.envMask=skin?(nma?2:1):(nma?2:bae?3:0);P.envFres=num(k.$envmapfresnel,0);P.envCon=num(k.$envmapcontrast,0);P.envSat=num(k.$envmapsaturation,1);
  if(!skin&&k.$envmapmask)P.envMaskTex=await tex(k.$envmapmask,false).catch(()=>null);
  P.envCube=String(em).toLowerCase()=='env_cubemap'?await defCube():await cube(em)}
 // CBaseShader::TextureIsTranslucent: base alpha is opacity only on $translucent / $alphatest, not when it is a selfillum / envmap / tint mask
 P.useBA=(P.translucent||P.aTest)&&!P.si&&!num(k.$basealphaenvmapmask,0)&&!num(k.$opaquetexture,0)&&!(P.tintA&&!P.si)?1:0;P.opac=num(k.$alpha,1);
 if(P.aTest)P.aRef=num(k.$alphatestreference,.7)||.7;if(num(k.$nocull,0))P.nocull=1;
 return P}
async function defCube(){if(ST.cache.defcube)return ST.cache.defcube;return ST.cache.defcube=(async()=>{try{const r=await fetch('models/env_2fort.vtf.wasm');if(!r.ok)throw 0;const b=new Uint8Array(await r.arrayBuffer());return cubeOf(b)}catch(e){return cube('hlmv/cubemap')}})()}
function cubeOf(b){const F=[0,1,4,5,3,2].map(f=>{const T=vtf(b,256,f);const t=new THREE.DataTexture(T.px,T.w,T.h,THREE.RGBAFormat);t.flipY=false;t.needsUpdate=true;return t});
 const c=new THREE.CubeTexture(F);c.format=THREE.RGBAFormat;c.encoding=THREE.sRGBEncoding;c.generateMipmaps=false;c.minFilter=THREE.LinearFilter;c.needsUpdate=true;return c}
async function cube(path){let p=String(path).replace(/\\/g,'/').replace(/\.vtf$/i,'').toLowerCase();const key='cube|'+p;if(ST.cache[key])return ST.cache[key];
 return ST.cache[key]=(async()=>{let b=null;try{b=await read('materials/'+p+'.vtf')}catch(e){}if(!b)return null;
  const F=[0,1,4,5,3,2].map(f=>{const T=vtf(b,256,f);const t=new THREE.DataTexture(T.px,T.w,T.h,THREE.RGBAFormat);t.flipY=false;t.needsUpdate=true;return t});
  const c=new THREE.CubeTexture(F);c.format=THREE.RGBAFormat;c.encoding=THREE.sRGBEncoding;c.generateMipmaps=false;c.minFilter=THREE.LinearFilter;c.needsUpdate=true;return c})()}

// ---------- MDL / VVD / VTX -> THREE.SkinnedMesh per material slot (+ $jigglebone params and mesh flexes) ----------
function cstr(b,o){let e=o;while(b[e])e++;return td.decode(b.subarray(o,e))}
const JIGK=['length','tipMass','yawStiffness','yawDamping','pitchStiffness','pitchDamping','alongStiffness','alongDamping','angleLimit','minYaw','maxYaw','yawFriction','yawBounce','minPitch','maxPitch','pitchFriction','pitchBounce','baseMass','baseStiffness','baseDamping','baseMinLeft','baseMaxLeft','baseLeftFriction','baseMinUp','baseMaxUp','baseUpFriction','baseMinForward','baseMaxForward','baseForwardFriction','boingImpactSpeed','boingImpactAngle','boingDampingRate','boingFrequency','boingAmplitude'];
async function model(path,pre,opt){pre=pre||'m';const base=path.replace(/\.mdl$/i,'');const [mdl,vvd,vtx]=await Promise.all([read(base+'.mdl'),read(base+'.vvd'),read(base+'.dx90.vtx')]);
 if(!mdl||!vvd||!vtx)throw new Error('model files missing: '+base);
 const M=new DataView(mdl.buffer,mdl.byteOffset,mdl.byteLength),VV=new DataView(vvd.buffer,vvd.byteOffset,vvd.byteLength),X=new DataView(vtx.buffer,vtx.byteOffset,vtx.byteLength);const I=o=>M.getInt32(o,true),Fl=o=>M.getFloat32(o,true);
 const f16=h=>{const s=h>>15,e=(h>>10)&31,m=h&1023;const v=e===0?m*Math.pow(2,-24):e===31?(m?NaN:Infinity):(1+m/1024)*Math.pow(2,e-15);return s?-v:v};
 const nb=I(156),bi=I(160);const bones=[];const jig={};
 for(let i=0;i<nb;i++){const o=bi+i*216;const name=cstr(mdl,o+I(o));bones.push({name,parent:I(o+4),pos:[Fl(o+32),Fl(o+36),Fl(o+40)],q:[Fl(o+44),Fl(o+48),Fl(o+52),Fl(o+56)]});
  // STUDIO_PROC_JIGGLE: mstudiojigglebone_t (flags + 34 floats)
  if(I(o+164)===5&&I(o+168)){const j=o+I(o+168);const P={flags:I(j)};JIGK.forEach((k,x)=>P[k]=Fl(j+4+4*x));jig[name]=P}}
 const ntex=I(204),ti=I(208);const texn=[];for(let k=0;k<ntex;k++){const o=ti+k*64;texn.push(cstr(mdl,o+I(o)))}
 const ncd=I(212),cdi=I(216);const cds=[];for(let k=0;k<ncd;k++)cds.push(cstr(mdl,I(cdi+k*4)));
 const nsr=I(220),nsf=I(224),si=I(228);const skins=[];for(let f=0;f<nsf;f++){const r=[];for(let s=0;s<nsr;s++)r.push(M.getInt16(si+(f*nsr+s)*2,true));skins.push(r)}
 const nbp=I(232),bpi=I(236);
 const nlv0=VV.getInt32(16,true),nfix=VV.getInt32(48,true),fixs=VV.getInt32(52,true),vds=VV.getInt32(56,true);let map=null;
 if(nfix){map=[];for(let k=0;k<nfix;k++){const lod=VV.getInt32(fixs+12*k,true),s=VV.getInt32(fixs+12*k+4,true),n=VV.getInt32(fixs+12*k+8,true);if(lod>=0)for(let j=0;j<n;j++)map.push(s+j)}}
 const vidx=i=>map?map[i]:i;
 const vbpo=X.getInt32(32,true);const prims={},flexRaw={};
 for(let bp=0;bp<nbp;bp++){const mbo=bpi+bp*16;const nmod=I(mbo+4),modi=I(mbo+12);const xbo=vbpo+bp*8;const xmo=X.getInt32(xbo+4,true);
  const bpn=cstr(mdl,mbo+I(mbo)).toLowerCase();let sel=0;if(opt&&opt.only){if(!(bpn in opt.only))continue;sel=+opt.only[bpn]}else if(opt&&opt.bg){const v=opt.bg[bp]!=null?opt.bg[bp]:opt.bg[bpn];if(v!=null)sel=+v}
  for(let mi=sel;mi<Math.min(sel+1,nmod);mi++){// the chosen (default 0) bodygroup state
   const mo=mbo+modi+mi*148;const nmesh=I(mo+72),meshi=I(mo+76),vertidx=I(mo+84);const xmod=xbo+xmo+mi*8;const lo=X.getInt32(xmod+4,true);const xl=xmod+lo;const mso=X.getInt32(xl+4,true);
   for(let me=0;me<nmesh;me++){const meo=mo+meshi+me*116;const mat=I(meo),voff=I(meo+12);const xm=xl+mso+me*9;const nsg=X.getInt32(xm,true),sgo=X.getInt32(xm+4,true);const base_=vertidx/48+voff;
    for(let g=0;g<nsg;g++){const xg=xm+sgo+g*25;const vo=X.getInt32(xg+4,true),ni=X.getInt32(xg+8,true),io=X.getInt32(xg+12,true);const L=prims[mat]||(prims[mat]=[]);
     for(let k=0;k<ni;k++){const vi=X.getUint16(xg+io+k*2,true);L.push(base_+X.getUint16(xg+vo+vi*9+4,true))}}
    // mesh flexes (mstudioflex_t -> mstudiovertanim_t / _wrinkle_t)
    const nfl=I(meo+16),fli=I(meo+20);for(let f=0;f<nfl;f++){const fo=meo+fli+f*60;const n=I(fo+20),vi=fo+I(fo+24),typ=mdl[fo+32],st=typ==1?18:16;const V=[];
     for(let k=0;k<n;k++){const a=vi+k*st;V.push([base_+M.getUint16(a,true),mdl[a+3],f16(M.getUint16(a+4,true)),f16(M.getUint16(a+6,true)),f16(M.getUint16(a+8,true)),f16(M.getUint16(a+10,true)),f16(M.getUint16(a+12,true)),f16(M.getUint16(a+14,true))])}
     (flexRaw[mat]||(flexRaw[mat]=[])).push({d:I(fo),p:I(fo+28),t:[Fl(fo+4),Fl(fo+8),Fl(fo+12),Fl(fo+16)],V})}}}}
 const C=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),-Math.PI/2);const root=new THREE.Group();root.name='wroot';
 const B=bones.map(b=>{const n=new THREE.Bone();n.name=b.name;n.position.set(...b.pos);n.quaternion.set(...b.q);if(b.parent<0){n.position.applyQuaternion(C);n.quaternion.premultiply(C)}return n});
 bones.forEach((b,i)=>(b.parent<0?root:B[b.parent]).add(B[i]));root.updateMatrixWorld(true);const inv=B.map(n=>n.matrixWorld.clone().invert());
 // the model's own sequence 0 (frame 0) poses the bones that aren't merged onto the player's: C_BaseAnimating runs it on a bonemerged
 // model too, so the Short Circuit's arm_attach_R turns the gauntlet onto the forearm (its "ref" differs from the rest pose); binds stay the rest pose
 try{if(I(188)>0&&I(180)>0){const o=I(192);const ai=M.getInt16(o+I(o+60),true);const A=decodeAnim(mdl,ai);if(!(A.flags&4)){const f=A.frame(0);if(f)bones.forEach((b,i)=>{if(b.parent<0||!f.P[i]||!f.Q[i])return;B[i].position.set(...f.P[i]);B[i].quaternion.set(...f.Q[i])})}}}catch(e){}
 root.updateMatrixWorld(true);
 const att=[];{const na=I(240),ai=I(244);for(let k=0;k<na;k++){const o=ai+k*92;const lb=I(o+8);const mm=[];for(let q=0;q<12;q++)mm.push(Fl(o+12+4*q));att.push({name:cstr(mdl,o+I(o)).toLowerCase(),bone:bones[lb]?bones[lb].name:null,m:mm})}}
 const out=[];const slots=Object.keys(prims).map(Number).sort((a,b)=>a-b);const fprims=[];
 for(const s of slots){const tri=prims[s];const used=new Map();const P=[],N=[],U=[],J=[],W=[];
  const add=v=>{let k=used.get(v);if(k!=null)return k;k=used.size;used.set(v,k);const o=vds+vidx(v)*48;
   const w=[VV.getFloat32(o,true),VV.getFloat32(o+4,true),VV.getFloat32(o+8,true)],bn=[vvd[o+12],vvd[o+13],vvd[o+14]],nbn=vvd[o+15];
   const x=VV.getFloat32(o+16,true),y=VV.getFloat32(o+20,true),z=VV.getFloat32(o+24,true),nx=VV.getFloat32(o+28,true),ny=VV.getFloat32(o+32,true),nz=VV.getFloat32(o+36,true);
   P.push(x,z,-y);N.push(nx,nz,-ny);U.push(VV.getFloat32(o+40,true),VV.getFloat32(o+44,true));let ws=0;for(let j=0;j<4;j++){const on=j<nbn&&j<3;J.push(on?bn[j]:0);W.push(on?w[j]:0);ws+=on?w[j]:0}
   if(ws>0)for(let j=W.length-4;j<W.length;j++)W[j]/=ws;else W[W.length-4]=1;return k};
  const idx=[];for(let t=0;t<tri.length;t+=3){const a=add(tri[t]),b=add(tri[t+1]),c=add(tri[t+2]);idx.push(c,b,a)}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(N,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(U,2));
  g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(J,4));g.setAttribute('skinWeight',new THREE.Float32BufferAttribute(W,4));g.setIndex(used.size>65535?new THREE.Uint32BufferAttribute(idx,1):new THREE.Uint16BufferAttribute(idx,1));g.computeBoundingSphere();
  const mat=new THREE.MeshBasicMaterial();mat.name=pre+s;const sm=new THREE.SkinnedMesh(g,mat);sm.name='live_'+pre+s;root.add(sm);sm.bind(new THREE.Skeleton(B,inv),new THREE.Matrix4());sm.userData.att=att;out.push(sm);
  // flexes in the same shape ZFACE's packs use (dp x4096, dn x127, Y-up), indexed into this slot's geometry
  if(flexRaw[s]){const fl=[];for(const F of flexRaw[s]){const L=F.V.filter(v=>used.has(vidx(v[0])));if(!L.length)continue;const n=L.length;
    const f={d:F.d,p:(F.p>0&&F.p!==F.d)?F.p:-1,t:F.t,n,idx:new Uint32Array(n),dp:new Float32Array(3*n),dn:new Float32Array(3*n),side:new Uint8Array(n)};
    L.forEach((v,j)=>{f.idx[j]=used.get(vidx(v[0]));f.side[j]=v[1];f.dp[3*j]=v[2]*4096;f.dp[3*j+1]=v[4]*4096;f.dp[3*j+2]=-v[3]*4096;f.dn[3*j]=v[5]*127;f.dn[3*j+1]=v[7]*127;f.dn[3*j+2]=-v[6]*127});fl.push(f)}
   if(fl.length)fprims.push({mesh:'',mat:pre+s,nv:used.size,flexes:fl})}}
 let flex=null;if(fprims.length){const nfd=I(260),fdi=I(264),nfc=I(268),fci=I(272),nfr=I(276),fri=I(280);
  const desc=[];for(let k=0;k<nfd;k++){const o=fdi+k*4;desc.push(cstr(mdl,o+I(o)))}
  const ctl=[];for(let k=0;k<nfc;k++){const o=fci+k*20;ctl.push([cstr(mdl,o+I(o+4)),Fl(o+12),Fl(o+16)])}
  const rules=[];for(let k=0;k<nfr;k++){const o=fri+k*12;const no=I(o+4),op0=o+I(o+8);const ops=[];for(let q=0;q<no;q++){const x=op0+q*8,op=I(x);ops.push([op,op===1?Fl(x+4):I(x+4)])}rules.push([I(o),ops])}
  flex={ctl,desc,rules,prims:fprims,vfe:{},nc:ctl.length,cname:{}};ctl.forEach((c,i)=>flex.cname[c[0].toLowerCase()]=i)}
 const seqs=[];{const ns=I(188),si=I(192);for(let i=0;i<ns;i++){const o=si+i*212;seqs.push({name:cstr(mdl,o+I(o+4)).toLowerCase(),act:cstr(mdl,o+I(o+8)).toUpperCase(),ai:M.getInt16(o+I(o+60),true)})}}
 return{meshes:out,texn,cds,skins,slots,jig:Object.keys(jig).length?jig:null,flex,seqs,mdl}}
// a sequence's frames for the non-root bones that move, as bone -> [quaternions, positions] (local, per frame)
// pose: a held pose (a one-frame idle such as retract_idle) keeps every bone it places, moving or not
function seqFrames(mdl,ai,pose,ani,name){try{let A=decodeAnim(mdl,ai,ani);
  // an empty placeholder sequence moves through its autolayer
  // a single-frame or empty placeholder sequence moves through its autolayer (the Hat of Undeniable Wealth and Respect: "ref" + "blink")
  if((A.flags&0x24||A.nf<2)&&name){const L=layerAnims(mdl,name).map(x=>decodeAnim(mdl,x,ani)).find(x=>!(x.flags&0x24)&&x.nf>1);if(L)A=L}
  if(A.flags&4||A.nf<(pose?1:2))return null;const F=[];for(let f=0;f<A.nf;f++){const x=A.frame(f);if(!x)return null;F.push(x)}
  const b={};A.bones.forEach((B,i)=>{if(B.parent<0)return;let mv=false;for(let f=1;f<F.length&&!mv;f++){const q0=F[0].Q[i],q=F[f].Q[i],p0=F[0].P[i],p=F[f].P[i];if(Math.abs(q0[0]*q[0]+q0[1]*q[1]+q0[2]*q[2]+q0[3]*q[3])<.99999||Math.hypot(p[0]-p0[0],p[1]-p0[1],p[2]-p0[2])>1e-3)mv=true}
   if(!mv&&!pose)return;const Q=new Float32Array(F.length*4),P=new Float32Array(F.length*3);F.forEach((fr,f)=>{Q.set(fr.Q[i],f*4);P.set(fr.P[i],f*3)});b[B.name]=[Q,P]});
  return Object.keys(b).length?{fps:A.fps||30,nf:A.nf,b}:null}catch(e){return null}}
async function findVmt(name,cds){const n=String(name).replace(/\\/g,'/').toLowerCase();const C=(cds.length?cds:['']).map(c=>String(c).replace(/\\/g,'/').toLowerCase());
 for(const c of C){const p=('materials/'+(c&&!c.endsWith('/')?c+'/':c)+n+'.vmt').replace(/\/+/g,'/');if(has(p))return p}
 const p='materials/'+n+'.vmt';return has(p)?p:null}
// model + its RED/BLU materials, as [meshes, manifest] the way models/w/*.glb + weapons.json are used
async function assemble(key,p,e,si,pre,opt){pre=pre||'m';const md=await model(p,pre,opt);const man={};const nf=md.skins.length||1;const rs=skinFor(e,si,'RED',nf),bs=skinFor(e,si,'BLU',nf);
 // visuals "material_override" (the Golden Wrench's gold_wrench.vmt): every material of the item's own model is drawn with that one
 const mo=pre=='m'&&e&&e.r?((styleOf(e,si)||{}).material_override||(e.r.visuals||{}).material_override):null;const mov=mo&&typeof mo=='string'?findVmt(mo.replace(/\.vmt$/i,''),[]):null;
 const pr=async t=>{try{const v=(mov&&await mov)||await findVmt(md.texn[t]||'',md.cds);if(!v)return null;const M=await vmt(v,0);return M?await params(M):null}catch(err){console.warn('[ZLIVE] material',md.texn[t],err);return null}};
 for(const s of md.slots){const r=md.skins[rs]?md.skins[rs][s]:s,b=md.skins[bs]?md.skins[bs][s]:r;const red=await pr(r),blu=b===r?red:await pr(b);man[pre+s]={red,blu:blu||red}}
 if(md.jig)man._jig=md.jig;if(pre=='m')ST.flex[key]=md.flex;
 if(pre=='m'&&e&&e.k=='action'&&xwOf(e)&&String(p).toLowerCase()===xwOf(e).toLowerCase())man._held=1;   // a spellbook: held in the hand
 // visuals.playback_activity: on_spawn / start_taunting activities (the Orchestrina: ACT_IDLE "stopped", ACT_RUN "started"); otherwise sequence 0
 // a worn weapon's own pack (the B.A.S.E. Jumper's c_paratrooper_pack) sits closed: its retract_idle sequence, as when the chute is put away
 if(((pre=='m'&&e&&(e.k=='cos'||e.k=='action'||e.k=='medal'))||(pre=='xw'&&e&&passiveXW(e)))&&md.seqs&&md.seqs.length){const pa=(e.r.visuals&&e.r.visuals.playback_activity)||{};const by=a=>a&&md.seqs.find(q=>q.act==String(a).toUpperCase());
  const idle=by(pa.on_spawn)||(pre=='xw'&&md.seqs.find(q=>/^retract_idle$/i.test(q.name||'')))||md.seqs[0],tn=by(pa.start_taunting);const ani=await aniOf(md.mdl);const ia={idle:seqFrames(md.mdl,idle.ai,pre=='xw',ani,idle.name),taunt:tn?seqFrames(md.mdl,tn.ai,false,ani,tn.name):null};if(ia.idle||ia.taunt)man._ianim=ia}
 return[md.meshes,{[key]:man}]}

// ---------- public ----------
// keys: live:<Class>:<style>:<item name>
const parseKey=key=>{const [,cl,si,...rest]=key.split(':');return{cl,si:+si||0,name:rest.join(':')}};
async function load(key){if(ST.cache[key])return ST.cache[key];
 return ST.cache[key]=(async()=>{const {cl,si,name}=parseKey(key);const e=entry(name);if(!e)throw new Error('not in items_game: '+name);
  // an arm that replaces the owner's (the Short Circuit: wm_bodygroup_override) is worn with the cosmetics (loadXW), not held
  if(String(e.r.attach_to_hands_vm_only||'0')==='1')return[[],{[key]:{}}];
  const p=mdlFor(e,cl,si);if(!p){if(armOnly(e,cl))return[[],{[key]:{}}];throw new Error('no model for '+cl+': '+name)}
  const A=await assemble(key,p,e,si,'m',si>=KSTREAK?{bg:{level:si-KSTREAK}}:undefined);
  // visuals.attached_models for both teams, visuals_red / visuals_blu ones per team (the Kritzkrieg's overhealer, the 2011 festive weapons' parts)
  const ams=b=>{const am=b&&b.attached_models,o=[];if(am&&typeof am=='object')for(const k in am){const mp=am[k]&&am[k].model&&String(am[k].model).replace(/\\/g,'/').toLowerCase();if(mp&&has(mp))o.push(mp)}return o};
  const both=ams(e.r.visuals),red=ams(e.r.visuals_red),blu=ams(e.r.visuals_blu);const L=[...both.map(p=>[p,null])];
  for(const p of red)if(!both.includes(p))L.push([p,blu.includes(p)?null:'RED']);for(const p of blu)if(!both.includes(p)&&!red.includes(p))L.push([p,'BLU']);
  {const xw=xwOf(e);if(xw&&await xwOnWeapon(xw))L.push([xw,null])}
  let j=0;for(const [mp,tm] of L){try{const X=await assemble(key,mp,e,si,'am'+(j++));if(tm)X[0].forEach(x=>x.userData.zteam=tm);A[0]=A[0].concat(X[0]);Object.assign(A[1][key],X[1][key])}catch(err){console.warn('[ZLIVE] attached_model',mp,err)}}
  // a cosmetic's wm_bodygroup_override in a state with a mesh of its own (the Purity Fist: Heavy's hands bodygroup in state 2,
  // the left hand made for the augmented arm): that submodel of the class model, worn with the item
  {const wo=wmOv(e),c=clsKey(cl);if(wo&&wo.st>0){const BN=await pbNames(c);const part=BN&&BN[wo.i];if(part){try{const X=await assemble(key,'models/player/'+SHORT[c]+'.mdl',e,si,'bg',{only:{[part]:wo.st}});A[0]=A[0].concat(X[0]);Object.assign(A[1][key],X[1][key])}catch(err){console.warn('[ZLIVE] bodygroup',part,err)}}}}
  return A})()}
// livexw:<Class>:<style>:<name> — what a weapon puts on the body: its extra_wearable (the Buff Banner's backpack), and the item itself for worn weapons
async function loadXW(key){if(ST.cache[key])return ST.cache[key];
 return ST.cache[key]=(async()=>{const {cl,si,name}=parseKey(key);const e=entry(name);if(!e)throw new Error('not in items_game: '+name);const A=[[],{[key]:{}}];
  const add=async(p,pre)=>{const X=await assemble(key,p,e,si,pre);A[0]=A[0].concat(X[0]);Object.assign(A[1][key],X[1][key]);if(X[1][key]._jig)A[1][key]._jig=Object.assign(A[1][key]._jig||{},X[1][key]._jig)};
  if(wornWep(name,cl)){const p=mdlFor(e,cl,si);if(p)await add(p,'m')}
  {const c=clsKey(cl);const ao=Object.assign({},armOnly(e,cl)||{});
   // the class model's own bodygroup submodel in that state (rightarm 1 = the Gunslinger's robot arm; state 2 is empty)
   if(Object.keys(ao).length){const X=await assemble(key,'models/player/'+SHORT[c]+'.mdl',e,si,'arm',{only:ao});A[0]=A[0].concat(X[0]);Object.assign(A[1][key],X[1][key])}}
  const xw=xwOf(e);if(xw&&!(await xwOnWeapon(xw)))try{await add(xw,'xw')}catch(err){console.warn('[ZLIVE] extra_wearable',xw,err)}
  return A})()}
// an extra_wearable built on the weapon's own skeleton (the Botkillers' fobs ride weapon_bone / vm_weapon_bone) belongs to the weapon: it's
// loaded with it (load) and goes when it's put away, where the Buff Banner's backpack (bip_spine_3) stays on the body
async function xwOnWeapon(p){const k='xwb|'+p;if(ST.cache[k]!=null)return ST.cache[k];let r=false;try{const b=await read(p.replace(/\.mdl$/i,'')+'.mdl');if(b){const M=new DataView(b.buffer,b.byteOffset,b.byteLength);const nb=M.getInt32(156,true),bi=M.getInt32(160,true);
  for(let i=0;i<nb;i++){const o=bi+i*216;if(M.getInt32(o+4,true)<0){const nm=cstr(b,o+M.getInt32(o,true)).toLowerCase();if(/^weapon_bone/.test(nm)||/^(c_weapon|vm_)/.test(nm))r=true;break}}}}catch(e){}return ST.cache[k]=r}
function bg(n,cl,si){const e=entry(n);if(!e)return[];const v=e.r.visuals||{};const out=new Set(Object.keys(v.player_bodygroups||{}).filter(k=>String(v.player_bodygroups[k])!=='0'));
 const st=styleOf(e,si);if(st&&st.additional_hidden_bodygroups)Object.keys(st.additional_hidden_bodygroups).forEach(k=>out.add(k));
 // a cosmetic's wm_bodygroup_override (the Purity Fist: Heavy's bodygroup 1, the right hand, in its empty state 2): the bodygroup
 // is named by its index in the class model, read once from the install; the merc is dressed again when the names arrive
 const wo=wmOv(e);if(wo&&wo.st>0&&cl){const c=clsKey(cl);const L=ST.pbn[c];if(L){if(L[wo.i])out.add(L[wo.i])}
  else pbNames(c).then(()=>{const M3=(window.Z3D&&Z3D.M)||{};const C=Object.keys(M3).find(x=>clsKey(x)===c);if(C&&M3[C]){M3[C].csig=null;if(window.ZREDRESS)ZREDRESS(C)}}).catch(()=>{})}
 return[...out]}
function hasItem(n,cl){if(!ST.ready)return false;const e=entry(n);if(!e||(e.k!='cos'&&e.k!='action'&&!(e.k=='medal'&&hasModel(e.r))))return false;if(!cl)return true;return !!mdlFor(e,cl)}
function hasWep(n,cl){if(!ST.ready)return false;const e=entry(n);if(!e||e.k!='wep')return false;return !cl||!!mdlFor(e,cl)||!!armOnly(e,cl)||passiveXW(e,cl)}
function wepSlot(n,cl){const e=entry(n);if(!e)return null;const u=usedBy(e.r,clsKey(cl));return u&&u!=='1'?String(u).toLowerCase():String(e.r.item_slot||'').toLowerCase()}
function animSlot(n,cl){const e=entry(n);if(!e)return null;let a=e.r.anim_slot;if(a&&typeof a=='object')a=a[clsKey(cl)];return a?String(a).toUpperCase():null}
function flexPack(key){return ST.flex[key]||null}
// backpack icons for anything in the schema, decoded only when an item scrolls into view
const iconPath=(e,si)=>{const st=styleOf(e,si);return (st&&st.image_inventory)||e.r.image_inventory};
// like the game's item panels: the icon's .vmt (image_inventory[_large]) names its $basetexture; at most 6 decode at once
let IRUN=0;const IQ=[];const islot=async f=>{if(IRUN>=6)await new Promise(r=>IQ.push(r));IRUN++;try{return await f()}finally{IRUN--;const n=IQ.shift();if(n)n()}};
async function iconTex(ip){for(const v of [ip+'_large',ip]){try{const m=await read('materials/'+v+'.vmt');if(m){const R=KV(text(m));const M=R[Object.keys(R)[0]]||{};const bt=M.$basetexture;if(bt){const b=await read('materials/'+String(bt).replace(/\\/g,'/').replace(/\.vtf$/i,'')+'.vtf');if(b)return b}}}catch(e){}
  try{const b=await read('materials/'+v+'.vtf');if(b)return b}catch(e){}}return null}
function iconLoad(n){const k=norm(n);if(k in ST.icons)return Promise.resolve(ST.icons[k]);if(ST.iconPend[k])return ST.iconPend[k];const e=entry(n);const ip=e&&iconPath(e,0);if(!ip){ST.icons[k]=null;return Promise.resolve(null)}
 return ST.iconPend[k]=islot(async()=>{try{const b=await iconTex(ip);if(!b)throw 0;const T=vtf(b,512);
   const cv=document.createElement('canvas');cv.width=T.w;cv.height=T.h;cv.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(T.px.buffer,T.px.byteOffset,T.w*T.h*4),T.w,T.h),0,0);ST.icons[k]=cv.toDataURL('image/webp',.9)+'#zlic'}catch(err){ST.icons[k]=null}
  return ST.icons[k]})}
function icon(n){if(!ST.ready)return null;return ST.icons[norm(n)]||null}
function hasIcon(n){if(!ST.ready)return false;const k=norm(n);if(k in ST.icons)return !!ST.icons[k];const e=entry(n);return !!(e&&e.r.image_inventory)}
// placeholder the page's own <img> markup can carry: the TF logo, spinning, until the real icon is decoded (see lazy)
const PH='ui/tflogo.webp#zli=';
// an icon the install doesn't have: a plain question mark
const QIC='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><text x="12" y="19" text-anchor="middle" font-size="20" font-family="TF2Build,Arial Black,sans-serif" font-weight="700" fill="#a69d88">?</text></svg>');
function iconPH(n){if(!ST.ready||!n)return null;const k=norm(n);if(ST.icons[k])return ST.icons[k];if(k in ST.icons)return null;return hasIcon(n)?PH+encodeURIComponent(n):null}
let IO=null,MO=null;
function watch(el){if(el._zli)return;el._zli=1;IO.observe(el)}
function scan(root){if(!IO)return;(root||document).querySelectorAll('img[src*="#zli="]').forEach(watch)}
function lazy(root){if(!ST.ready||!window.IntersectionObserver)return;
 if(!IO){IO=new IntersectionObserver(es=>es.forEach(e=>{if(!e.isIntersecting)return;const el=e.target;IO.unobserve(el);const s=el.getAttribute('src')||'';const i=s.indexOf('#zli=');if(i<0)return;const n=decodeURIComponent(s.slice(i+5));
   iconLoad(n).then(u=>{if(!el.isConnected)return;if(u)el.src=u;else{el.setAttribute('data-zlinone','');el.src=QIC+'#zli='+encodeURIComponent(n)}})}),{rootMargin:'300px'});
  MO=new MutationObserver(ms=>{for(const m of ms)for(const nd of m.addedNodes){if(nd.nodeType!==1)continue;if(nd.tagName==='IMG'&&(nd.getAttribute('src')||'').includes('#zli='))watch(nd);else if(nd.querySelector)scan(nd)}});
  MO.observe(document.body,{childList:true,subtree:true})}
 scan(root)}
// everything in the install a class can put in a loadout slot (medals and tools never), by display name
function list(cl,kind,slot){if(!ST.ready)return[];const c=clsKey(cl);const out=new Set();
 for(const [k,e] of ST.byName){if(norm(e.dn)!==k||e.k!==kind||(ST.drop&&ST.drop.has(e.id)))continue;const r=e.r;const u=usedBy(r,c);if(!u)continue;
  if(kind=='wep'){const sl=u!=='1'?String(u).toLowerCase():String(r.item_slot||'').toLowerCase();if(slot&&sl!==slot)continue;if(!mdlFor(e,cl)&&!armOnly(e,cl))continue}
  else if(kind=='cos'||kind=='action'){if(!mdlFor(e,cl))continue}
  else if(kind=='taunt'){if(!tauntScene(e,c))continue}
  out.add(e.dn)}
 return[...out]}
function redraw(){try{if(document.getElementById('lo')&&window.LOX&&LOX.loDraw)LOX.loDraw()}catch(e){}}
function refreshMercs(){try{if(window.Z3D){Object.entries(Z3D.M).forEach(([c,m])=>{m.csig=null;m.wname=undefined;if(m.o.visible&&window.ZCOS)ZCOS(c)})}}catch(e){}redraw()}


// ---------- taunts: items_game taunt block -> scenes/scenes.image (VSIF, LZMA bvcd) -> sequence in the class's animation .mdls ----------
function tauntScene(e,c){const t=e.r.taunt;if(!t)return null;const pc=t.custom_taunt_scene_per_class;return (pc&&(pc[c]||(c=='demoman'&&pc.demo)||(c=='heavy'&&pc.heavyweapons)))||null}
function hasTaunt(n,cl){if(!ST.ready)return false;const e=entry(n);return !!(e&&e.k=='taunt'&&usedBy(e.r,clsKey(cl))&&tauntScene(e,clsKey(cl)))}
const CRCT=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
const crc32=s=>{let c=0xFFFFFFFF;for(let i=0;i<s.length;i++)c=CRCT[(c^s.charCodeAt(i))&255]^(c>>>8);return (c^0xFFFFFFFF)>>>0};
// LZMA1 decoder (after Igor Pavlov's public-domain LzmaSpec)
function lzma(src,o0,props,outSize){let d=props[0];const lc=d%9;d=(d/9)|0;const lp=d%5,pb=(d/5)|0;const out=new Uint8Array(outSize);let op=0,ip=o0;
 let range=0xFFFFFFFF,code=0;ip++;for(let i=0;i<4;i++)code=((code<<8)|src[ip++])>>>0;
 const nrm=()=>{if(range<16777216){range=(range<<8)>>>0;code=((code<<8)|src[ip++])>>>0}};
 const bit=(p,i)=>{const v=p[i];const b=(range>>>11)*v;if(code<b){p[i]=v+((2048-v)>>5);range=b>>>0;nrm();return 0}p[i]=v-(v>>5);code=(code-b)>>>0;range=(range-b)>>>0;nrm();return 1};
 const P=n=>new Uint16Array(n).fill(1024);const tree=(p,o,n)=>{let m=1;for(let i=0;i<n;i++)m=(m<<1)+bit(p,o+m);return m-(1<<n)};
 const rtree=(p,o,n)=>{let m=1,s=0;for(let i=0;i<n;i++){const b=bit(p,o+m);m=(m<<1)+b;s|=b<<i}return s};
 const direct=n=>{let r=0;while(n--){range=range>>>1;code=(code-range)>>>0;const t=(code>>>31)?-1:0;code=(code+(range&t))>>>0;nrm();r=(r*2)+(t+1)}return r};
 const lenDec=()=>({ch:P(2),low:P(16*8),mid:P(16*8),high:P(256)});const dl=(L,ps)=>bit(L.ch,0)===0?tree(L.low,ps*8,3):bit(L.ch,1)===0?8+tree(L.mid,ps*8,3):16+tree(L.high,0,8);
 const lit=P(0x300<<(lc+lp)),isM=P(192),isR=P(12),g0=P(12),g1=P(12),g2=P(12),r0l=P(192),slot=P(256),posd=P(115),align=P(16),LD=lenDec(),RD=lenDec();
 let st=0,r0=0,r1=0,r2=0,r3=0;const pm=(1<<pb)-1,lm=(1<<lp)-1;
 while(op<outSize){const ps=op&pm;
  if(bit(isM,(st<<4)+ps)===0){const prev=op?out[op-1]:0;const base=0x300*(((op&lm)<<lc)+(prev>>(8-lc)));let sym=1;
   if(st>=7){let mb=out[op-r0-1];do{const m=(mb>>7)&1;mb<<=1;const b=bit(lit,base+((1+m)<<8)+sym);sym=(sym<<1)|b;if(m!==b)break}while(sym<0x100)}
   while(sym<0x100)sym=(sym<<1)|bit(lit,base+sym);out[op++]=sym-0x100;st=st<4?0:st<10?st-3:st-6;continue}
  let len;
  if(bit(isR,st)){if(bit(g0,st)===0){if(bit(r0l,(st<<4)+ps)===0){st=st<7?9:11;out[op]=out[op-r0-1];op++;continue}}
   else{let dist;if(bit(g1,st)===0)dist=r1;else{if(bit(g2,st)===0)dist=r2;else{dist=r3;r3=r2}r2=r1}r1=r0;r0=dist}
   len=dl(RD,ps);st=st<7?8:11}
  else{r3=r2;r2=r1;r1=r0;len=dl(LD,ps);st=st<7?7:10;const ls=Math.min(len,3);const sl=tree(slot,ls*64,6);
   if(sl<4)r0=sl;else{const nd=(sl>>1)-1;let dist=(2|(sl&1))*Math.pow(2,nd);if(sl<14)dist+=rtree(posd,dist-sl,nd);else{dist+=direct(nd-4)*16;dist+=rtree(align,0,4)}r0=dist}
   if(r0===0xFFFFFFFF)break}
  len+=2;for(let i=0;i<len&&op<outSize;i++){out[op]=out[op-r0-1];op++}}
 return out}
let SCN=null;
async function sceneImage(){if(SCN)return SCN;return SCN=(async()=>{const b=await read('scenes/scenes.image');if(!b)return null;const dv=new DataView(b.buffer,b.byteOffset,b.byteLength);
 const ns=dv.getInt32(8,true),nstr=dv.getInt32(12,true),eo=dv.getInt32(16,true);const str=[];for(let i=0;i<nstr;i++)str.push(cstr(b,dv.getInt32(20+i*4,true)));
 // SceneImageEntry_t: crcFilename, nDataOffset, nDataLength, nSceneSummaryOffset (16 bytes in the version 2 image TF2 ships)
 const ver=dv.getInt32(4,true),es=ver>=3?20:16;const E=new Map();for(let i=0;i<ns;i++){const o=eo+i*es;E.set(dv.getUint32(o,true),[dv.getInt32(o+4,true),dv.getInt32(o+8,true)])}return{b,str,E}})()}
const ETYPE=['unspecified','section','expression','lookat','moveto','speak','gesture','sequence','face','firetrigger','flexanimation','subscene','loop','interrupt','stoppoint','permitresponses','generic','camera','script'];
function bvcd(u8,str){const dv=new DataView(u8.buffer,u8.byteOffset,u8.byteLength);let o=0;const c=()=>u8[o++],h=()=>{const v=dv.getInt16(o,true);o+=2;return v},H=()=>{const v=dv.getUint16(o,true);o+=2;return v},f=()=>{const v=dv.getFloat32(o,true);o+=4;return v},i32=()=>{const v=dv.getInt32(o,true);o+=4;return v};
 const sym=()=>{const k=h();return k>=0&&k<str.length?str[k]:null};const curve=()=>{const n=c();const r=[];for(let k=0;k<n;k++)r.push([f(),c()/255]);return r};
 const ev=()=>{const e={type:ETYPE[c()],name:sym(),s:f(),e:f(),p1:sym(),p2:sym(),p3:sym()};e.ramp=curve();e.flags=c();f();
  for(let k=c();k>0;k--){sym();c()}for(let k=c();k>0;k--){sym();c()}for(let t=0;t<2;t++)for(let k=c();k>0;k--){sym();H()}
  if(e.type=='gesture')f();if(c()){sym();sym()}
  const nt=c();const tr=[];for(let k=0;k<nt;k++){const t={n:sym(),fl:c(),min:f(),max:f()};// flex samples: time, value (byte), curve type (ushort)
  t.s0=[];for(let q=H();q>0;q--){t.s0.push([f(),c()/255]);o+=2}t.s1=[];if(t.fl&2)for(let q=H();q>0;q--){t.s1.push([f(),c()/255]);o+=2}tr.push(t)}if(tr.length)e.tr=tr;
  if(e.type=='loop')c();if(e.type=='speak'){c();sym();c()}return e};
 if(u8[0]!==98||u8[1]!==118)throw new Error('not bvcd');o=4;c();i32();const evs=[];for(let k=c();k>0;k--)evs.push(ev());
 for(let a=c();a>0;a--){sym();for(let ch=c();ch>0;ch--){sym();for(let k=c();k>0;k--)evs.push(ev());c()}c()}return evs}
async function scene(path){const S=await sceneImage();if(!S)return null;const key=crc32(String(path).toLowerCase().replace(/\//g,'\\'));const e=S.E.get(key);if(!e)return null;
 let d=S.b.subarray(e[0],e[0]+e[1]);if(d[0]===76&&d[1]===90&&d[2]===77&&d[3]===65){const dv=new DataView(d.buffer,d.byteOffset,d.byteLength);d=lzma(d,17,d.subarray(12,17),dv.getUint32(4,true))}return bvcd(d,S.str)}
// soundscripts (scripts/game_sounds_manifest.txt) -> wave files in the sound VPKs
let SNDS=null;
async function soundscripts(){if(SNDS)return SNDS;return SNDS=(async()=>{const out={};const mf=await read('scripts/game_sounds_manifest.txt');const files=[];
 if(mf){const t=text(mf);const re=/"(?:precache_file|preload_file|declare_file)"\s+"([^"]+)"/gi;let m;while((m=re.exec(t)))files.push(m[1])}
 for(const f of files){try{const b=await read(f);if(!b)continue;const R=KV(text(b),false,true);for(const k in R)if(!(k in out))out[k]=R[k]}catch(e){}}return out})()}
const sndPath=w=>'sound/'+String(w).replace(/\\/g,'/').replace(/^[*#@<>^)}$!?(]+/,'');
async function waves(name){const S=await soundscripts();const e=S[String(name).toLowerCase()];if(!e)return[];let W=[];const add=v=>W=W.concat(v);
 if(e.wave)add(e.wave);if(e.rndwave&&e.rndwave.wave)add(e.rndwave.wave);return W.filter(Boolean)}
const AUD={};
async function audioURL(w){const p=sndPath(w);if(p in AUD)return AUD[p];return AUD[p]=(async()=>{let b=null;try{b=await read(p)}catch(e){}if(!b)return null;return URL.createObjectURL(new Blob([b],{type:/\.mp3$/i.test(p)?'audio/mpeg':'audio/wav'}))})()}
// skeletal animation (studiohdr_t v48 local anims, RLE anim values, Quaternion48/64, Vector48) -> THREE.AnimationClip
const MDLS={};
async function mdlBuf(p){p=p.toLowerCase();if(p in MDLS)return MDLS[p];return MDLS[p]=read(p)}
async function animMdls(c){const short=SHORT[c];const list=['models/workshop/player/animations/'+short+'_workshop_animations.mdl'];
 const main=await mdlBuf('models/player/'+short+'.mdl');if(main){const dv=new DataView(main.buffer,main.byteOffset,main.byteLength);const n=dv.getInt32(336,true),ix=dv.getInt32(340,true);
  for(let k=0;k<n;k++){const o=ix+k*8;list.push(cstr(main,o+dv.getInt32(o+4,true)))}list.push('models/player/'+short+'.mdl')}
 return [...new Set(list.map(x=>x.replace(/\\/g,'/').toLowerCase()))]}
function seqAnim(b,o){const dv=new DataView(b.buffer,b.byteOffset,b.byteLength);
  // blended sequences (aim matrices) hold groupsize[0] x groupsize[1] animations: take the one at pose parameter 0, the neutral pose
  const g0=Math.max(1,dv.getInt32(o+68,true)),g1=Math.max(1,dv.getInt32(o+72,true));const cell=(g,k)=>{if(g<2)return 0;const a=dv.getFloat32(o+84+k*4,true),e=dv.getFloat32(o+92+k*4,true);const t=e!==a?(0-a)/(e-a):.5;return Math.max(0,Math.min(g-1,Math.round(t*(g-1))))};
  const j=cell(g0,0)+cell(g1,1)*g0;return dv.getInt16(o+dv.getInt32(o+60,true)+j*2,true)}
function findSeqO(b,name){const dv=new DataView(b.buffer,b.byteOffset,b.byteLength);const ns=dv.getInt32(188,true),si=dv.getInt32(192,true);name=name.toLowerCase();
 for(let i=0;i<ns;i++){const o=si+i*212;if(cstr(b,o+dv.getInt32(o+4,true)).toLowerCase()===name)return o}return -1}
function findSeq(b,name){const o=findSeqO(b,name);return o<0?-1:seqAnim(b,o)}
// a sequence whose own animation is an empty placeholder plays its motion through its autolayers (mstudioseqdesc_t numautolayers 148,
// autolayerindex 152 -> mstudioautolayer_t {short iSequence, short iPose, int flags, float start, peak, tail, end}): their animations
function layerAnims(b,name){const o=findSeqO(b,name);if(o<0)return[];const dv=new DataView(b.buffer,b.byteOffset,b.byteLength);const n=dv.getInt32(o+148,true),li=dv.getInt32(o+152,true),si=dv.getInt32(192,true),ns=dv.getInt32(188,true),out=[];
 for(let k=0;k<n&&k<16;k++){const q=dv.getInt16(o+li+k*24,true);if(q>=0&&q<ns)out.push(seqAnim(b,si+q*212))}return out}
// the sequence's animation events (mstudioseqdesc_t numevents/eventindex -> mstudioevent_t: cycle, event, type, options[64], szeventindex)
function seqEvents(b,name){const dv=new DataView(b.buffer,b.byteOffset,b.byteLength);const ns=dv.getInt32(188,true),si=dv.getInt32(192,true);name=name.toLowerCase();
 for(let i=0;i<ns;i++){const o=si+i*212;if(cstr(b,o+dv.getInt32(o+4,true)).toLowerCase()!==name)continue;const n=dv.getInt32(o+24,true),ei=dv.getInt32(o+28,true),out=[];
  for(let k=0;k<n;k++){const e=o+ei+k*80;out.push({cycle:dv.getFloat32(e,true),ev:dv.getInt32(e+4,true),type:dv.getInt32(e+8,true),opt:cstr(b,e+12),name:cstr(b,e+dv.getInt32(e+76,true))})}return out}return[]}
// sound events: SCRIPT_EVENT_SOUND (1004), SCRIPT_EVENT_SOUND_VOICE (1008), CL_EVENT_SOUND (5004), or the new-style AE_CL_PLAYSOUND / AE_SV_PLAYSOUND
const sndEvent=x=>x.opt&&([1004,1008,5004].includes(x.ev)||/^AE_(CL|SV)_PLAYSOUND$/i.test(x.name));
function aq(x,y,z){const sr=Math.sin(x*.5),cr=Math.cos(x*.5),sp=Math.sin(y*.5),cp=Math.cos(y*.5),sy=Math.sin(z*.5),cy=Math.cos(z*.5);const a=sr*cp,b=cr*sp,cc=cr*cp,d=sr*sp;return[a*cy-b*sy,b*cy+a*sy,cc*sy-d*cy,cc*cy+d*sy]}
// ani: the model's .ani file, when its animations sit in external anim blocks (most newer taunts): studiohdr szanimblocknameindex (348),
// animblockindex (356) -> mstudioanimblock_t {datastart, dataend}; the animation is at datastart + animindex in that file
function decodeAnim(b,ai,ani){const aniDV=ani?new DataView(ani.buffer,ani.byteOffset,ani.byteLength):null;const dv=new DataView(b.buffer,b.byteOffset,b.byteLength);const I=o=>dv.getInt32(o,true),F=o=>dv.getFloat32(o,true);
 const nb=I(156),bi=I(160);const bones=[];for(let i=0;i<nb;i++){const o=bi+i*216;bones.push({name:cstr(b,o+I(o)),parent:I(o+4),pos:[F(o+32),F(o+36),F(o+40)],q:[F(o+44),F(o+48),F(o+52),F(o+56)],rot:[F(o+60),F(o+64),F(o+68)],ps:[F(o+72),F(o+76),F(o+80)],rs:[F(o+84),F(o+88),F(o+92)]})}
 const ao=I(184)+ai*100;const fps=F(ao+8)||30,flags=I(ao+12),nf=I(ao+16),ablk=I(ao+52),aidx=I(ao+56),seci=I(ao+80),secf=I(ao+84);const delta=!!(flags&4);
 const f16=h=>{const s=h>>15,e=(h>>10)&31,m=h&1023;const v=e===0?m*Math.pow(2,-24):(1+m/1024)*Math.pow(2,e-15);return s?-v:v};
 const val=(bb,dd,p,k)=>{for(;;){const valid=bb[p],total=bb[p+1];if(total>k)break;k-=total;p+=(valid+1)*2;if(bb[p+1]===0)return 0}const valid=bb[p];return dd.getInt16(p+(valid>k?k+1:valid)*2,true)};
 const frame=f=>{let blk,idx,fr=f;if(secf){let sec;if(nf>secf&&f===nf-1){fr=0;sec=Math.floor(nf/secf)+1}else{sec=Math.floor(f/secf);fr=f-sec*secf}blk=I(ao+seci+sec*8);idx=I(ao+seci+sec*8+4)}else{blk=ablk;idx=aidx}
  let bb=b,dd=dv,p=ao+idx;if(blk!==0){if(!ani)return null;bb=ani;dd=aniDV;p=I(I(356)+blk*8)+idx;if(p<0||p>=ani.length)return null}const P=new Array(nb),Q=new Array(nb);
  for(;;){const bone=bb[p],fl=bb[p+1],nx=dd.getInt16(p+2,true);if(bone===255)break;const B=bones[bone];let q=p+4;
   if(fl&2){const x=dd.getUint16(q,true),y=dd.getUint16(q+2,true),zw=dd.getUint16(q+4,true);const X=(x-32768)/32768,Y=(y-32768)/32768,Z=((zw&0x7fff)-16384)/16384;const W=Math.sqrt(Math.max(0,1-X*X-Y*Y-Z*Z));Q[bone]=[X,Y,Z,zw>>15?-W:W];q+=6}
   else if(fl&0x20){const lo=dd.getUint32(q,true),hi=dd.getUint32(q+4,true);const x=lo&0x1fffff,y=((lo>>>21)|((hi&0x3ff)<<11))&0x1fffff,z=(hi>>>10)&0x1fffff,wn=hi>>>31;
    const X=(x-1048576)/1048576.5,Y=(y-1048576)/1048576.5,Z=(z-1048576)/1048576.5;const W=Math.sqrt(Math.max(0,1-X*X-Y*Y-Z*Z));Q[bone]=[X,Y,Z,wn?-W:W];q+=8}
   else if(fl&8){const e=[0,0,0];for(let j=0;j<3;j++){const off=dd.getInt16(q+j*2,true);e[j]=(off?val(bb,dd,q+off,fr)*B.rs[j]:0)+(delta?0:B.rot[j])}Q[bone]=aq(...e);q+=6}
   if(fl&1){P[bone]=[f16(dd.getUint16(q,true)),f16(dd.getUint16(q+2,true)),f16(dd.getUint16(q+4,true))];q+=6}
   else if(fl&4){const v=[0,0,0];for(let j=0;j<3;j++){const off=dd.getInt16(q+j*2,true);v[j]=(off?val(bb,dd,q+off,fr)*B.ps[j]:0)+(delta?0:B.pos[j])}P[bone]=v}
   if(nx===0)break;p+=nx}
  for(let i=0;i<nb;i++){if(!P[i])P[i]=delta?[0,0,0]:bones[i].pos;if(!Q[i])Q[i]=delta?[0,0,0,1]:bones[i].q}return{P,Q}};
 return{bones,fps,nf,flags,frame}}
async function aniOf(b){const dv=new DataView(b.buffer,b.byteOffset,b.byteLength);if(dv.getInt32(352,true)<=0)return null;const nm=cstr(b,dv.getInt32(348,true));if(!nm)return null;try{return await mdlBuf(nm.replace(/\\/g,'/'))}catch(e){return null}}
async function seqClip(c,names,clipName,boneSet){for(const p of await animMdls(c)){const b=await mdlBuf(p);if(!b)continue;
  for(const n of names){const r=await clipOf(b,n,clipName,boneSet);if(r)return r}}
 return null}
// one sequence of a model as a THREE clip on its bone names (root bones turned into the merc's frame, as the player's own are)
async function clipOf(b,n,clipName,boneSet){{const ai=findSeq(b,n);if(ai<0)return null;const ani=await aniOf(b);let A=decodeAnim(b,ai,ani);
   // a delta / all-zeros placeholder: the motion lives in its layer (an autolayer, or a "layer_" sequence tried next)
   if(A.flags&0x24){const L=layerAnims(b,n).map(x=>decodeAnim(b,x,ani)).find(x=>!(x.flags&0x24));if(!L)return null;A=L}
   const F=[];for(let f=0;f<A.nf;f++){const x=A.frame(f);if(!x){F.length=0;break}F.push(x)}if(!F.length)return null;
   const C=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),-Math.PI/2).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),-Math.PI/2));
   const times=new Float32Array(F.map((_,i)=>i/A.fps));const tracks=[];const q=new THREE.Quaternion(),v=new THREE.Vector3();
   A.bones.forEach((B,bi)=>{if(boneSet&&!boneSet.has(B.name))return;const QV=new Float32Array(F.length*4),PV=new Float32Array(F.length*3);let prev=null;
    F.forEach((fr,i)=>{q.set(...fr.Q[bi]);v.set(...fr.P[bi]);if(B.parent<0){q.premultiply(C);v.applyQuaternion(C)}if(prev&&prev.dot(q)<0){q.x=-q.x;q.y=-q.y;q.z=-q.z;q.w=-q.w}prev=(prev||new THREE.Quaternion()).copy(q);QV.set([q.x,q.y,q.z,q.w],i*4);PV.set([v.x,v.y,v.z],i*3)});
    tracks.push(new THREE.QuaternionKeyframeTrack(B.name+'.quaternion',times,QV),new THREE.VectorKeyframeTrack(B.name+'.position',times,PV))});
   return{clip:new THREE.AnimationClip(clipName,(F.length-1)/A.fps,tracks),seq:n,events:seqEvents(b,n)}}}
const TAUNT={};
async function taunt(n,cl,boneSet){const c=clsKey(cl);const key=c+'|'+norm(n);if(TAUNT[key])return TAUNT[key];return TAUNT[key]=(async()=>{const e=entry(n);if(!e||e.k!='taunt')return null;
 const sp=tauntScene(e,c);if(!sp)return null;let evs=null;try{evs=await scene(sp)}catch(err){console.warn('[ZLIVE] scene',sp,err)}
 const clipName='live:'+e.dn;const base=sp.replace(/\\/g,'/').split('/').pop().replace(/\.vcd$/i,'');
 const seqEv=(evs||[]).find(x=>x.type=='sequence');const sname=seqEv?seqEv.p1||seqEv.name:null;
 const cand=[...(sname?['layer_'+sname,sname]:[]),'layer_'+base+'_'+SHORT[c],base+'_'+SHORT[c],'layer_'+base,base];
 const A=await seqClip(c,[...new Set(cand)],clipName,boneSet);if(!A)return null;
 const dur=A.clip.duration;const ev=[{t:'seq',s:seqEv?seqEv.s:0,e:seqEv&&seqEv.e>0?seqEv.e:dur,n:clipName}];const urls={};
 for(const x of (evs||[])){if(x.type=='speak'&&x.p1){const W=/\.(wav|mp3)$/i.test(x.p1)?[x.p1]:await waves(x.p1);const w=[];for(const f of W){const u=await audioURL(f);if(u){const k='live_'+sndPath(f);urls[k]=u;w.push({k,ph:[],em:[]})}}
   if(w.length)ev.push({t:'speak',s:x.s,e:x.e>x.s?x.e:x.s+8,v:1,w})}
  else if(x.type=='expression'&&x.p2)ev.push({t:'expr',s:x.s,e:x.e,file:String(x.p1||'').replace(/\\/g,'/').split('/').pop(),name:x.p2,ramp:x.ramp});
  else if(x.type=='flexanimation'&&x.tr)ev.push({t:'flex',s:x.s,e:x.e,ramp:x.ramp,tr:x.tr.map(t=>({n:t.n,c:!!(t.fl&2),min:t.min,max:t.max,s0:t.s0,s1:t.s1}))})}
 // the sounds the taunt's animation fires itself (most taunts' music and effects), at their point in the sequence
 const soundOf=async name=>{const W=/\.(wav|mp3)$/i.test(name)?[name]:await waves(name);const w=[];for(const f of W){const u=await audioURL(f);if(u){const k='live_'+sndPath(f);urls[k]=u;w.push({k,ph:[],em:[]})}}return w};
 const s0=seqEv?seqEv.s:0,sd=seqEv&&seqEv.e>seqEv.s?seqEv.e-seqEv.s:dur;
// the scene's own sequence carries the events even when its motion came from a layer sequence
 let SE=A.events||[];if(sname&&A.seq&&A.seq.toLowerCase()!==sname.toLowerCase()){for(const p of await animMdls(c)){const b=await mdlBuf(p);if(!b)continue;const E=seqEvents(b,sname);if(E.length){SE=E.concat(SE);break}}}
 // AE_TAUNT_ADD_ATTRIBUTE "taunt_attr_player_invis_percent <amount> <seconds>" (Yeti Smash: the merc goes invisible while the yeti plays)
 {const inv=[];for(const x of SE){if(!/AE_TAUNT_ADD_ATTRIBUTE/.test(x.name||''))continue;const q=/taunt_attr_player_invis_percent\s+([\d.]+)\s+([\d.]+)/i.exec(x.opt||'');if(q&&+q[1]>0){const s=Math.max(0,Math.min(1,x.cycle))*A.clip.duration;inv.push({s,e:s+(+q[2]),v:+q[1]})}}if(inv.length)A.clip.zinvis=inv}
 for(const x of SE.filter(sndEvent)){const w=await soundOf(x.opt);if(w.length){const s=s0+Math.max(0,Math.min(1,x.cycle))*sd;ev.push({t:'speak',s,e:s+8,v:1,w})}}
 // items_game: "taunt success sound" (once, after "taunt success sound offset") and "taunt success sound loop" (music while it runs)
 const ta=k=>{for(const bk of ['attributes','static_attrs']){const B=e.r[bk];if(!B||typeof B!='object')continue;for(const n in B){const v=B[n];const cls=String(v&&typeof v=='object'?v.attribute_class||'':'').toLowerCase();if(n.toLowerCase()==k||cls==k.replace(/ /g,'_'))return v&&typeof v=='object'?v.value:v}}return null};
 let mu=null;{const one=ta('taunt success sound'),loop=ta('taunt success sound loop'),off=+ta('taunt success sound offset')||0;
  if(one){const w=await soundOf(String(one));if(w.length)ev.push({t:'speak',s:off,e:off+8,v:1,w})}
  if(loop){const w=await soundOf(String(loop));if(w.length)mu={k:w[0].k,v:1}}}
 // taunt attacks whose sound the game code plays itself (CTFPlayer::DoTauntAttack)
 {const TA={TAUNTATK_ALLCLASS_GUITAR_RIFF:'Taunt.GuitarRiff',TAUNTATK_MEDIC_HEROIC_TAUNT:'Taunt.MedicHeroic'};const an=String(ta('taunt attack name')||'').toUpperCase();
  if(TA[an]){const w=await soundOf(TA[an]);const at=+ta('taunt attack time')||0;if(w.length)ev.push({t:'speak',s:at,e:at+8,v:1,w})}}
 const pc=o=>o&&typeof o=='object'?(o[c]||(c=='demoman'&&o.demo)||null):null;
 const pp0=pc(e.r.taunt.custom_taunt_prop_per_class);const pp=pp0&&has(pp0)?pp0:null;
 // a "loop" event (the hold taunts: the Boiling Point) sends the scene back to its target time for as long as the taunt is held
 const loopOf=E=>{const L=(E||[]).find(x=>x.type=='loop'&&+x.p1>=0&&x.s>+x.p1);return L?{from:+L.p1,to:L.s}:null};
 const loop=loopOf(evs);if(loop)A.clip.zloop={from:loop.from-s0,to:loop.to-s0};
 // custom_taunt_prop_scene_per_class: the prop is its own entity at the player's feet (CTFTauntProp) running its own scene - its
 // sequence and sounds - instead of riding the player's bones
 let pseq=null;{const psp=pp&&pc(e.r.taunt.custom_taunt_prop_scene_per_class);if(psp){let pe=null;try{pe=await scene(psp)}catch(err){console.warn('[ZLIVE] prop scene',psp,err)}
  const sq=(pe||[]).find(x=>x.type=='sequence');if(sq){const pl=loopOf(pe);pseq={seq:sq.p1||sq.name,off:sq.s,loop:pl}}
  for(const x of (pe||[])){if(x.type=='speak'&&x.p1){const w=await soundOf(x.p1);if(w.length)ev.push({t:'speak',s:x.s,e:x.e>x.s?x.e:x.s+8,v:1,w})}}}}
 return{clip:A.clip,sc:mu?{ev,mu}:{ev},urls,prop:pp,pseq}})()}
// the prop's own sequence as a clip (bones named as in the prop model)
async function propClip(path,seqName){const k='pclip|'+path+'|'+seqName;if(ST.cache[k])return ST.cache[k];return ST.cache[k]=(async()=>{const b=await mdlBuf(path);if(!b)return null;const r=await clipOf(b,seqName,'prop:'+seqName,null);return r&&r.clip})()}
async function propOwn(path){const key='livepropx:'+path;if(ST.cache[key])return ST.cache[key];return ST.cache[key]=assemble(key,path,{r:{}},0).then(A=>{A[1][key]._own=1;return A})}
const SEQ={};
async function seq(cl,name,boneSet){const c=clsKey(cl);const k=c+'|'+name.toLowerCase();if(SEQ[k])return SEQ[k];return SEQ[k]=seqClip(c,[name],name,boneSet).then(r=>r&&r.clip)}
async function prop(path){const key='liveprop:'+path;if(ST.cache[key])return ST.cache[key];return ST.cache[key]=assemble(key,path,{r:{}},0)}
async function connect(src){ST.src=src;ST.ready=false;ST.on=true;ST.cache={};ST.icons={};ST.iconPend={};say('Reading your TF2 install\u2026',60000);
 try{const [m,t]=await Promise.all([openVpk(src,'tf2_misc'),openVpk(src,'tf2_textures')]);if(!m)throw new Error('tf2_misc_dir.vpk not found \u2014 pick your Team Fortress 2/tf folder');
  const [sm,sv,hm,ht]=await Promise.all([openVpk(src,'tf2_sound_misc').catch(()=>null),openVpk(src,'tf2_sound_vo_english').catch(()=>null),openVpk(src,'hl2_misc').catch(()=>null),openVpk(src,'hl2_textures').catch(()=>null)]);ST.vpk={tf2_misc:m,tf2_textures:t,tf2_sound_misc:sm,tf2_sound_vo_english:sv,hl2_misc:hm,hl2_textures:ht};await index();ST.ready=true;dispatchEvent(new Event('zlive'));say('TF2 install synced \u2014 '+ST.ncos.toLocaleString()+' cosmetics, '+ST.byName.size.toLocaleString()+' item names',5000);refreshMercs();
  try{localStorage.setItem('zlive','1')}catch(e){}return true}
 catch(e){ST.on=false;dispatchEvent(new Event('zlive'));ST.err=String(e.message||e);say('Couldn\u2019t read TF2 install: '+ST.err,7000);console.warn('[ZLIVE]',e);return false}}
// remembered folder (File System Access handles survive in IndexedDB; the browser still asks again for permission after a reload)
const idb=(mode,fn)=>new Promise((ok,no)=>{const r=indexedDB.open('zlive',1);r.onupgradeneeded=()=>r.result.createObjectStore('h');r.onerror=()=>no(r.error);r.onsuccess=()=>{const tx=r.result.transaction('h',mode);const s=tx.objectStore('h');const q=fn(s);tx.oncomplete=()=>ok(q&&q.result);tx.onerror=()=>no(tx.error)}});
async function tfDir(h){try{await h.getFileHandle('tf2_misc_dir.vpk');return h}catch(e){}try{const t=await h.getDirectoryHandle('tf');await t.getFileHandle('tf2_misc_dir.vpk');return t}catch(e){}return h}
function pickList(){return new Promise(ok=>{const i=document.createElement('input');i.type='file';i.webkitdirectory=true;i.multiple=true;i.style.display='none';document.body.appendChild(i);
 i.onchange=()=>{const f=[...i.files].filter(x=>/\.vpk$/i.test(x.name)||/(^|\/)(scripts\/items\/items_game\.txt|resource\/tf_english\.txt)$/i.test(x.webkitRelativePath||''));i.remove();ok(f.length?f:null)};i.addEventListener('cancel',()=>{i.remove();ok(null)});i.click()})}
async function pick(){// must run inside the click that asked for it
 if(window.showDirectoryPicker){try{const h=await tfDir(await showDirectoryPicker({id:'tf2',mode:'read'}));try{await idb('readwrite',s=>s.put(h,'dir'))}catch(e){}return connect(dirSource(h))}
  catch(e){if(e&&e.name=='AbortError')return false}}// blocked (cross-origin frame) -> folder input
 say('Select your Team Fortress 2/tf folder \u2014 the browser only reads the .vpk files you allow',6000);const f=await pickList();if(!f)return false;return connect(listSource(f))}
async function resume(){// after a reload: reuse the remembered folder if the browser still allows it, otherwise wait for a click
 try{if(localStorage.getItem('zlive')!=='1')return}catch(e){return}let h=null;try{h=await idb('readonly',s=>s.get('dir'))}catch(e){}if(!h||!h.queryPermission)return;
 if(await h.queryPermission({mode:'read'})==='granted'){connect(dirSource(h));return}
 const once=async()=>{removeEventListener('pointerdown',once,true);try{if(await h.requestPermission({mode:'read'})==='granted')connect(dirSource(h))}catch(e){}};addEventListener('pointerdown',once,true)}
function off(){ST.on=false;ST.ready=false;ST.drop=null;ST.src=null;ST.vpk={};ST.cache={};ST.icons={};ST.iconPend={};try{localStorage.setItem('zlive','0')}catch(e){}dispatchEvent(new Event('zlive'));say('TF2 install unsynced',3000);refreshMercs()}
window.ZLIVE={get on(){return ST.on},get ready(){return ST.ready},pick,connect,off,load,loadXW,styleLabel,propClip,propOwn,hasXW,wornWep,wmHide,tauntSlot,poseLayers,particle,spriteTex:async p=>{const v=await vmt('materials/'+String(p).replace(/\\/g,'/').replace(/\.vmt$/i,'')+'.vmt',0).catch(()=>null);const bt=v&&v.kv&&v.kv.$basetexture;return bt?await tex(bt,true).catch(()=>null):null},classes,holiday,quality,skinOverride,conflicts:()=>ST.conf||{},has:hasItem,hasWep,wepSlot,animSlot,bg,icon,iconLoad,hasIcon,iconPH,lazy,list,styles,paintable,regions,flexPack,taunt,hasTaunt,prop,seq,entry,get count(){return ST.ncos},dirSource,listSource,_st:ST,_read:read,_scene:p=>scene(p),_anims:c=>animMdls(clsKey(c)),_seqEvents:(b,n)=>seqEvents(b,n),_vtf:vtf,_anim:decodeAnim,_vmt:vmt,_tex:tex};
})();
// Halloween paint spells (Die Job, Chromatic Corruption, Putrescent Pigmentation, Spectral Spectrum, Sinister Staining): the paint
// tint animated through each spell's colour ramp (RED and BLU ramps differ for Spectral Spectrum), from Chickenman's TF2 UI redesign prototype
window.ZSPELL=(()=>{const T=[[5328971,5328971,5328971,5328971,5328971,5328971,5328971,5328971,5328971,5328971,5395018,5591625,5723465,5855050,5921095,6052679,6315591,6447429,6513222,6710852,7039299,7170884,7433793,7631425,7894336,8222784,8354622,8618045,8815420,9078333,9406779,9604411,9802040,10064952,10328376,10459959,10722870,11051318,11314483,11511859,11709490,11841074,12103729,12301360,12498479,12630063,12761901,12959022,13090604,13156651,13288236,13485099,13616683,13682474,13748010,13813801,13945386,13945386,14011433,14011433,14011433,13945386,13945386,13879594,13814314,13813801,13748010,13682474,13616681,13616683,13550890,13550890,13354027,13288234,13288236,13222443,13222443,13156651,13156651,13025322,13025324,12959531,12893740,12893740,12893740,12762413,12696621,12696621,12630828,12630574,12630574,12499760,12433713,12433713,12367922,12302642,12302387,12236596,12236598,12171575,12105528,12039736,11908409,11974204,11908413,11842880,11842880,11842880,11908421,11776837,11645765,11579973,11579975,11514182,11448137,11382344,11316298,11184712,11053387,11053387,10921802,10855755,10724941,10659150,10658896,10527311,10527057,10395986,10330195,10264147,10264147,10264149,10263895,10198104,10132313,10198106,10132058,10263133,10263133,10328928,10394721,10394723,10328675,10394981,10460263,10526056,10329190,10394983,10329188,10394723,10328928,10328926,10526042,10526040,10394452,10459985,10394446,10460235,10525511,10525763,10657089,10657341,10723131,10854456,10920502,11183156,11380273,11512111,11906350,12038190,12301100,12629804,12827436,13221676,13419306,13616170,13813803,13945386,14077226,13879593,13813801,13616170,13485099,13221674,12893227,12630057,12301098,12103723,11775018,11511594,11117353,10853929,10459431,10130984,9868327,9670182,9472807,9275686,9013027,8815396,8618019,8420385,8289569,8223006,8026399,7894813,7763484,7829020,7763738,7894810,7960857,8158234,8552475,8684059,8881690,9079324,9210908,9407772,9605405,9671198,9736989,9736989,9736991,9605918,9473565,9341979,9078809,8684059,8355096,7763224,7434010,6973206,6447895,6118679,5723416,5394715,5131549,5000483,5000234,4999981,5000242,4999990,4868407,4671291,4539707,4539709,4605502,4671041,4868420,5000006,5065799,5131592,5197385,5263178,5328971,5263178],[5720667,5720667,5786460,5720667,5786460,5786460,5851996,5851741,6048606,6048606,6114145,6114145,6245474,6311013,6311013,6441829,6507624,6573417,6704491,6704491,6704493,6901359,6901359,7097970,7097970,7163252,7229045,7294840,7425656,7491449,7622523,7688062,7819137,7950209,8147077,8277894,8409226,8540301,8540303,8671376,8737171,8737171,8867985,8671376,8671374,8540301,8475019,8475273,8278408,8147334,8082309,7885441,7819902,7754366,7754621,7558012,7492217,7426937,7361142,7164533,7164531,7164529,7033456,6967663,6902382,6836587,6771564,6771564,6639978,6574185,6640232,6508903,6443110,6574439,6443110,6442599,6442599,6573415,6508392,6573417,6507624,6572905,6572905,6572907,6638187,6703212,6768494,6834289,6965105,6964850,7030132,7029621,7226486,7160439,7225720,7356538,7421820,7421820,7487102,7617920,7617921,7748226,7814021,7879303,7944328,7944330,8074635,8271500,8271246,8336527,8336529,8598420,8532629,8597911,8794521,8859803,8859803,8990878,9121440,9120928,9317793,9317539,9382823,9448103,9513898,9644714,9709995,9840813,9840815,9906095,9971890,9971378,10102194,10167989,10233269,10364085,10364087,10363833,10429369,10429114,10560186,10625725,10625468,10691007,10691007,10756543,10756289,10756289,10756289,10756289,10691007,10625214,10625468,10559932,10560186,10429114,10363576,10298040,10232501,10101429,10101683,9970608,9970608,9773998,9773998,9642923,9511848,9511848,9381030,9381030,9249956,9053345,8987806,8922270,8856731,8725656,8594839,8463510,8397971,8201360,8070287,8070285,7939211,7807625,7676805,7545732,7479937,7283582,7152508,7086972,6890361,6759029,6627700,6496882,6366064,6300269,6169194,6103399,5840997,5775716,5513312,5448030,5251162,5054551,5054806,4857684,4661073,4595534,4398666,4267337,4136776,4070981,4005186,3874111,3677502,3480634,3414840,3283767,3152951,3152949,3153203,3153203,3153460,3153460,3219253,3285046,3350839,3416632,3482425,3614011,3811133,3942465,4008260,4336455,4533321,4664908,4730701,4993362,5124948,5256536,5650013,5781599,6044003,6175589,6306920,6504042,6701167,6898035,7029621,7292279,7489404,7686526,7752064,8014722,8080261,8277127],[12703514,12703514,12703514,12703516,12703516,12703514,12572700,12506907,12506907,12506652,12506907,12506907,12506652,12506652,12506907,12506652,12506652,12506652,12506654,12506654,12440861,12441374,12441374,12375581,12375581,12375583,12375583,12375583,12375583,12309536,12309536,12309536,12309536,12309537,12112928,12243744,12243744,12177697,12046881,12046881,11981090,11915299,11915299,11915044,11915044,11849253,11783206,11783206,11717415,11717417,11651624,11585576,11519785,11519787,11453994,11388460,11387948,11256621,11190830,11190832,11124785,11058993,11058995,10992948,10992950,10861364,10795572,10729527,10729527,10663736,10597690,10466106,10466106,10465852,10400062,10334015,10202431,10202433,10136640,10136385,10004801,10004803,10004549,9938243,10004037,9938244,9938246,9872199,9937478,9937224,9871431,9871433,9871433,9805640,9870921,9805128,9805128,9805128,9805128,9805128,9739337,9804360,9804360,9804360,9804360,9804360,9869640,9869640,9803847,9803847,9803847,9803847,9738054,9803334,9737541,9672261,9672261,9672261,9606468,9606470,9606470,9540677,9475397,9475397,9409604,9409604,9212739,9212741,9212741,9146948,9081668,9081668,8950596,8950596,9015875,9015875,9081668,9081668,9081664,8950850,8950848,8885568,8819775,8951359,8950846,9016894,9016892,9016892,9016890,9147962,9016376,9147958,9082165,9213494,9081907,9147698,9147698,9278768,9212975,9212973,9212716,9278508,9212713,9212456,9343272,9212454,9343524,9343011,9277218,9408034,9342241,9407523,9341730,9341730,9341219,9275426,9406242,9339938,9339938,9339171,9273380,9272613,9272613,9141030,9206310,9140519,9140265,9205290,9138985,9138985,9138987,9073453,9007662,9007150,9007150,9137968,9072945,8941618,9138484,9007413,9138999,9204788,9270581,9205556,9271604,9272115,9469490,9404210,9536049,9536817,9603119,9734960,9866542,9801772,9999147,9999913,10197288,10263848,10264613,10462244,10462754,10463776,10661152,10792988,10859547,10991642,11057688,11190040,11256086,11388435,11520274,11521042,11652625,11784463,11784974,11916813,11916813,11982604,12048397,12114188,12179981,12246028,12246028,12311308,12311308,12311308,12311308,12377101,12377101,12377101,12377101,12377101,12377101,12377101,12377101,12377101],[11548953,11614745,11746074,11877659,12008987,12140572,12337693,12469278,12666655,12863776,13060897,13258274,13455395,13652772,13849893,14047014,14244391,14375976,14573097,14704681,14836010,14967595,15033387,15164716,15164972,15230508,15230508,15230508,15164716,15033387,14967595,14836010,14638889,14507304,14310183,14112806,13915685,13718308,13455651,13258274,13060897,12863776,12666399,12469278,12272157,12075036,11943451,11811866,11680538,11614745,11548953,11548953,11548953,11614745,11680538,11746330,11877659,12009244,12206364,12403485,12600862,12797983,12995360,13192482,13389859,13652772,13849893,14047270,14244391,14441512,14638889,14770474,14901802,15033387,15099179,15164972,15230508,15230508,15098924,14835755,14572586,14177832,13783078,13322789,12862755,12468001,12139295,11811101,11614491,11548954,11549209,11747351,12011542,12407317,12869139,13396754,13924369,14451983,14979598,15506957,15902989,16298508,16562443,16759819,16760075,16562188,16166669,15704590,15110927,14451217,13791507,13132053,12538390,12011032,11681049,11548953,11614745,11812888,12142615,12538646,13066005,13593875,14187538,14780944,15308815,15836430,16232204,16561932,16694283,16760075,16561932,16100621,15506958,14846992,14121490,13395732,12670486,12142359,11746585,11548953,11614745,11812632,12076824,12472343,12934165,13395988,13923859,14517265,15044880,15506702,15968269,16298508,16562187,16759819,16760075,16627979,16298508,15902733,15375374,14781967,14188560,13594897,13066771,12539156,12077334,11747351,11549209,11548954,11680028,11876637,12139295,12533793,12928291,13323045,13783335,14178088,14572586,14836011,15098924,15230508,15230508,15164972,15099179,15033387,14901802,14770474,14638889,14441768,14244391,14047270,13849893,13652772,13455395,13192482,12995360,12797983,12600862,12403485,12206364,12074780,11877659,11746330,11680538,11614745,11548953,11548953,11548953,11614745,11680538,11811866,11943451,12075036,12272157,12403742,12600863,12863776,13060897,13258274,13455395,13718308,13915685,14112806,14310183,14507304,14638889,14836010,14967339,15033387,15164716,15230508,15230508,15230508,15164972,15164716,15033387,14967595,14836010,14704681,14573097,14375976,14244391,14047014,13849893,13652772,13455395,13258274,13060897,12863776,12666655,12469278,12337693,12140572,12008987,11877659,11746074,11614745],[7439904,7571489,7703329,7900706,8032547,8295716,8493349,8756518,9019943,9283369,9546794,9810219,10073644,10402606,10666031,10929200,11192625,11390259,11653428,11851061,12048437,12180278,12312119,12443703,12509496,12575288,12575288,12509496,12443703,12312119,12180278,11982901,11785268,11522099,11258674,10995249,10731823,10468398,10139181,9810219,9546794,9217576,8954151,8690726,8427557,8229924,7966755,7834914,7637537,7571488,7440160,7439904,7439904,7505696,7637281,7769121,7900962,8098339,8361508,8624933,8888359,9151784,9415209,9744171,10073388,10336814,10666031,10929456,11192882,11456051,11719476,11982645,12114486,12311863,12443447,12509496,12575288,12575288,12509496,12443703,12311863,12180278,11982645,11785012,11521843,11258674,10995249,10731823,10402862,10139181,9810219,9546794,9283368,8954151,8690982,8427557,8229924,8032291,7834914,7703073,7571489,7505696,7439904,7439904,7505696,7571745,7703329,7900706,8098083,8295716,8559141,8822310,9085736,9349161,9678378,9941804,10270765,10534447,10863408,11126833,11390258,11653428,11851061,12048694,12246070,12377911,12509240,12575288,12575288,12575288,12509240,12377911,12246070,12048694,11851061,11653428,11390258,11126833,10863408,10534447,10270765,9941804,9678378,9349161,9085736,8822310,8559141,8295716,8098083,7900706,7703329,7571745,7505696,7439904,7439904,7505696,7571489,7703073,7834914,8032291,8229924,8427557,8690982,8954151,9283368,9546794,9810219,10139181,10402862,10731823,10995249,11258674,11521843,11785012,11982645,12180278,12311863,12443703,12509496,12575288,12575288,12509496,12443447,12311863,12180022,11982645,11719476,11521843,11258418,10929456,10666031,10336814,10073388,9744427,9480745,9151784,8888359,8624933,8361508,8163875,7900962,7769121,7637281,7505696,7439904,7439904,7440160,7571488,7637537,7834914,7966755,8164132,8427557,8690726,8954151,9217576,9546538,9810219,10139181,10402606,10731823,10995249,11258674,11521843,11785268,11982645,12180278,12312119,12443703,12509496,12575288,12575288,12509496,12443703,12312119,12180278,12048437,11851061,11653428,11390259,11192625,10929200,10666031,10402606,10073644,9810219,9546794,9283369,9019943,8756518,8493349,8295716,8032547,7900706,7703329,7571489],[9094364,9160156,9291485,9357278,9488607,9685472,9816801,10013922,10145251,10342372,10539237,10736358,10933479,11130345,11327466,11458795,11655916,11852781,11984366,12115695,12247024,12378352,12444145,12509681,12575474,12641010,12641010,12575474,12509681,12444145,12312816,12181487,12049902,11853037,11655916,11458795,11261930,11064808,10802151,10605030,10407908,10211043,10013922,9816801,9619936,9488607,9357022,9225693,9160156,9094364,9094364,9094364,9159900,9225693,9357022,9553886,9751008,9948129,10210786,10473444,10736102,11064551,11392745,11655659,11983853,12312303,12640496,12903410,13166068,13494262,13691383,13954040,14150905,14282490,14413819,14545148,14545148,14545148,14545148,14413819,14282490,14151162,13954040,13756919,13494262,13231604,12968947,12706289,12377839,12115181,11786732,11458538,11195880,10867430,10604773,10342115,10079458,9816800,9619679,9422814,9291485,9160156,9094364,9094364,9094364,9094364,9160157,9291485,9422814,9554143,9685472,9882593,10079458,10276579,10473701,10736358,10933479,11130345,11327466,11590123,11787245,11918574,12115695,12247024,12378352,12509681,12575218,12641010,12641010,12641010,12575218,12509681,12378352,12247024,12115695,11918574,11787245,11590123,11327466,11130345,10933479,10736358,10473701,10276579,10079458,9882593,9685472,9554143,9422814,9291485,9160157,9094364,9094364,9094364,9094364,9160156,9291485,9422814,9619679,9816800,10079458,10342115,10604773,10867430,11195880,11458538,11786732,12115181,12377839,12706289,12968947,13231604,13494262,13756919,13954040,14151162,14282490,14413819,14545148,14545148,14545148,14545148,14413819,14282490,14150905,13954040,13691383,13494262,13231604,12903410,12640497,12312303,11983853,11721195,11392745,11064551,10801638,10473444,10210786,9948129,9751008,9553887,9357022,9225693,9159900,9094364,9094364,9094364,9160156,9225693,9357022,9488351,9619935,9816801,10013922,10210787,10407908,10605030,10802151,11064808,11261674,11458795,11655916,11853037,12049902,12181231,12312560,12443889,12575217,12641010,12641010,12641010,12575474,12575217,12509681,12378352,12247024,12115695,11984366,11852781,11655916,11524331,11327466,11130345,10933479,10736358,10539237,10342372,10145251,10013922,9816801,9685472,9554143,9422814,9291485,9160156]];const T0=[T[0],T[1],T[2],T[3],T[4]],T1=[T[0],T[1],T[2],T[5],T[4]];
 const NAMES=['Die Job','Chromatic Corruption','Putrescent Pigmentation','Spectral Spectrum','Sinister Staining'];
 const rgb=(i,team,t)=>{const D=(team=='BLU'?T1:T0)[i];if(!D)return null;const f=t*22,a=Math.floor(f)%256,b=(a+1)%256,d=f-Math.floor(f);const c0=D[a],c1=D[b];
  const ch=s=>((c0>>s&255)*(1-d)+(c1>>s&255)*d)/255;return[ch(16),ch(8),ch(0)]};
 const hex=v=>'#'+(v&0xffffff).toString(16).padStart(6,'0');
 const css=(i,team)=>{const D=(team=='BLU'?T1:T0)[i];if(!D)return'none';const st=[];for(let k=0;k<=64;k++)st.push(hex(D[(k*4)%256])+' '+(k/64*100).toFixed(2)+'%');return'linear-gradient(90deg,'+st.join(',')+')'};
 const L=new Set();let raf=0;const t0=performance.now();
 const tick=()=>{raf=0;const t=(performance.now()-t0)/1000;for(const o of L){if(!o.m.parent){L.delete(o);continue}const c=rgb(o.i,o.team,t);const tu=o.u.tintA&&o.u.tintA.value<.5?o.u.c2:o.u.tint;if(c&&tu)tu.value.setRGB(c[0],c[1],c[2]).convertSRGBToLinear()}if(L.size)raf=requestAnimationFrame(tick)};
 const reg=(mesh,i,team)=>{const u=mesh.material&&mesh.material.uniforms;if(!u)return;L.add({m:mesh,u,i,team});if(!raf)raf=requestAnimationFrame(tick)};
 const tint=(i,team)=>{const c=rgb(i,team,0);if(!c)return null;c.spell=i;return c};
 return{NAMES,rgb,css,reg,tint}})();
