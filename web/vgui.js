/* VGUI runtime, from Chickenman's TF2 UI redesign prototype ("Working Version"): renders the game's .res layouts as-is.
   Used here for the war paint window (resource/ui/econ/inspectionpanel.res). Data: ctk/vgui.json. */
// A small re-implementation of Source's vgui2 layout rules so .res files from the game can be rendered as-is.
// Coordinates follow vgui_controls/Panel.cpp (ComputeWide/ComputeTall/ComputePos) with proportional scaling
// YRES(v) = v * screenTall / 480. Screen is the 1920x1080 stage.
(function(){
const SW=1920,SH=1080,K=SH/480;
const VG=window.VG={K,SW,SH,data:null};
const YRES=v=>v*K;VG.YRES=YRES;
let SCH={c:{},f:{},b:{}},LOC={},IMG={};
VG.load=async function(url){const d=await (await fetch(url)).json();VG.data=d;SCH=d.scheme;LOC=d.loc;IMG=d.img;return d};
VG.ready=()=>VG._p||(VG._p=Promise.all([VG.load('ctk/vgui.json'),document.fonts&&document.fonts.load('12px OCRA').catch(()=>0)]).then(r=>r[0]));
// ---- colors / strings ----
const named=n=>SCH.c[String(n).toLowerCase()];
function rgba(v){if(v==null)return null;let s=String(v).trim();if(!/^[\d\s.]+$/.test(s)){const c=named(s);if(!c)return null;s=c}
 const a=s.split(/\s+/).map(Number);return a.length<3?null:a.length==3?[a[0],a[1],a[2],255]:a}
VG.rgba=rgba;
const css=c=>c?`rgba(${c[0]},${c[1]},${c[2]},${(c[3]/255).toFixed(3)})`:'transparent';VG.css=css;
VG.brighten=(c,n)=>[Math.min(255,c[0]+n),Math.min(255,c[1]+n),Math.min(255,c[2]+n),c[3]];
function loc(t){if(t==null)return'';t=String(t);if(t[0]=='#'){const v=LOC[t.slice(1).toLowerCase()];return v==null?t:String(v).replace(/\\n/g,'\n').replace(/\\"/g,'"')}return t}
VG.loc=loc;
// ConstructString: %s1..%s9
VG.fmt=(s,...a)=>String(s).replace(/%s(\d)/g,(m,i)=>a[i-1]!=null?a[i-1]:'');
// ---- fonts ----
const FFAM={'tf2 build':'TF2Build','tf2 secondary':'TF2Secondary','tf2':'TF2Secondary','ocr a extended':'OCRA','ocra':'OCRA','tf2 professor':'TF2Prof','verdana':'Verdana,Tahoma,sans-serif','tahoma':'Tahoma,Verdana,sans-serif','tf2 logo':'TF2Logo'};
// vgui font "tall" is the full cell height (ascent+descent); most of these faces put ~1.15em in a cell
const CELL={'OCRA':1.25,'TF2Build':1.055,'TF2Secondary':1.119,'TF2Prof':.768,'TF2Logo':.843,'Verdana,Tahoma,sans-serif':1.215,'Tahoma,Verdana,sans-serif':1.207};
function font(name){const f=SCH.f[String(name||'').toLowerCase()];if(!f)return null;const fam=FFAM[String(f.name).toLowerCase()]||f.name;const tall=Math.floor(+f.tall*K);
 const tl=f.yres?+f.tall:tall;return{fam,px:tl/(CELL[fam]||1.15),tall:tl,weight:+f.weight>=600?700:400,blur:+f.blur||0,shadow:+f.dropshadow||0,outline:+f.outline||0,add:+f.additive||0}}
VG.font=font;
// ---- images ----
const IMGBASE='ctk/v/';
const imgKey=n=>String(n||'').replace(/\\/g,'/').toLowerCase();
VG.sound=f=>{const n=String(f).replace(/\\/g,'/').split('/').pop().replace(/\.wav$/i,'').toLowerCase();window.ZSND&&ZSND(n)};
VG.imgUrl=n=>{const k=imgKey(n);if(!IMG[k])return null;const du=VG.data&&VG.data.imgdata&&VG.data.imgdata[k];return du||IMGBASE+k.replace(/^\.\.\//,'_/')+'.webp'};
VG.imgMeta=n=>IMG[imgKey(n)];
// ---- panel tree ----
let UID=0;
function P(def,parent,root){
 const p=def.p||{};this.def=def;this.p=p;this.name=def.n||p.fieldname||'';this.parent=parent;this.root=root||this;this.kids=[];this.vars={};this.id=++UID;
 const ct=String(p.controlname||'').toLowerCase();this.type=ct||(parent?'editablepanel':'editablepanel');
 this.st={armed:false,depressed:false,selected:false,enabled:p.enabled!=='0'};
 this.vis=p.visible!=='0';this.alpha=p.alpha!=null?+p.alpha:255;this.o={};// overrides set by code: x,y,w,h,img,text,fg,bg,border,drawcolor
 this.el=document.createElement(this.isButton()?'button':'div');this.el.className='vg vg-'+(this.type||'panel');this.el.dataset.vg=this.name;if(this.isButton())this.el.type='button';
 this.el._vg=this;
 (def.c||[]).forEach(c=>this.kids.push(new P(c,this,this.root)));
 this.kids.forEach(k=>this.el.appendChild(k.el));
 if(this.isButton()){
  this.el.addEventListener('pointerenter',()=>{if(this.st.enabled){this.st.armed=true;if(this.p.sound_armed&&window.VG.sound)VG.sound(this.p.sound_armed);this.paint();this.root.fire&&this.root.fire('armed',this)}});
  this.el.addEventListener('pointerleave',()=>{if(!(this.p.stay_armed_on_click=='1'&&this.st.selected)){this.st.armed=false;this.st.depressed=false;this.paint();this.root.fire&&this.root.fire('disarmed',this)}});
  this.el.addEventListener('pointerdown',e=>{if(!this.st.enabled)return;this.st.depressed=true;this.paint();if(this.p.button_activation_type=='1')this.activate(e)});
  this.el.addEventListener('pointerup',e=>{if(!this.st.enabled)return;const was=this.st.depressed;this.st.depressed=false;this.paint();if(was&&this.p.button_activation_type!='1')this.activate(e)});
  this.el.addEventListener('click',e=>e.stopPropagation());
 }
}
P.prototype.isButton=function(){const t=this.type;return /button/.test(t)&&t!='imagebutton_hidden'};
P.prototype.isLabel=function(){return /label|button/.test(this.type)};
P.prototype.isImage=function(){return /imagepanel|itemmodelpanel/.test(this.type)||this.o.url!==undefined};
P.prototype.activate=function(e){const c=this.p.command;if(this.p.stay_armed_on_click=='1'){this.st.selected=true}const snd=this.p.sound_released||this.p.sound_depressed;if(snd&&window.VG.sound)VG.sound(snd);
 let n=this;while(n){if(n.onCommand&&n.onCommand(c,this,e)!==false)return;n=n.parent}};
P.prototype.find=function(name,deep=true){name=String(name).toLowerCase();for(const k of this.kids){if(k.name.toLowerCase()==name)return k}if(deep)for(const k of this.kids){const r=k.find(name,true);if(r)return r}return null};
P.prototype.findAll=function(name){const out=[];name=name.toLowerCase();const w=n=>{n.kids.forEach(k=>{if(k.name.toLowerCase()==name)out.push(k);w(k)})};w(this);return out};
P.prototype.add=function(def){const k=new P(def,this,this.root);this.kids.push(k);this.el.appendChild(k.el);return k};
P.prototype.remove=function(){if(this.parent){this.parent.kids=this.parent.kids.filter(k=>k!==this)}this.el.remove()};
P.prototype.setVar=function(k,v){this.vars[k.toLowerCase()]=v;return this};
P.prototype.getVar=function(k){k=k.toLowerCase();let n=this;while(n){if(k in n.vars)return n.vars[k];n=n.parent}return null};
P.prototype.ctl=function(name,vis){const c=this.find(name);if(c)c.vis=!!vis;return c};
P.prototype.text=function(){let t=this.o.text!=null?this.o.text:(this.p.labeltext!=null?this.p.labeltext:this.p.labeltext);t=loc(t);t=String(t).replace(/&(&)|&(?=\S)/g,'$1');return String(t).replace(/%([a-z0-9_]+)%/gi,(m,k)=>{const v=this.getVar(k);return v==null?'':loc(v)})};
// ---- layout ----
function num(s){const m=String(s).match(/^[+-]?\d*\.?\d+/);return m?parseFloat(m[0]):0}
function inum(s){const m=String(s).match(/^[+-]?\d+/);return m?parseInt(m[0]):0}
function cWide(n,pw,ph,other){const ws=n.p.wide;let w=n.w||0;if(ws==null)return w;let s=String(ws);const c=s[0].toLowerCase();
 if(c=='f'){return pw-YRES(inum(s.slice(1)))}
 if(c=='o'){if(other)return 0;const t=cTall(n,pw,ph,true);return t*num(s.slice(1))}
 if(c=='p'){return (pw-YRES(inum(s.slice(1))))*num(s.slice(1))}
 if(c=='s'){return (n.w||0)*num(s.slice(1))}
 return YRES(inum(s))}
function cTall(n,pw,ph,other){const ts=n.p.tall;let h=n.h||0;if(ts==null)return h;let s=String(ts);const c=s[0].toLowerCase();
 if(c=='f'){return ph-YRES(inum(s.slice(1)))}
 if(c=='o'){if(other)return 0;const w=cWide(n,pw,ph,true);return w*num(s.slice(1))}
 if(c=='p'){return (ph-YRES(inum(s.slice(1))))*num(s.slice(1))}
 if(c=='s'){return (n.h||0)*num(s.slice(1))}
 return YRES(inum(s))}
function cPos(str,size,psize){if(str==null)return null;let s=String(str);let pos=0,op=1,first=true;
 while(s.length){let right=false,center=false,self=false,par=false;
  if(/^[rR]/.test(s)){right=true;s=s.slice(1)}else if(/^[cC]/.test(s)){center=true;s=s.slice(1)}
  if(/^[sS]/.test(s)){self=true;s=s.slice(1)}else if(/^[pP]/.test(s)){par=true;s=s.slice(1)}
  const m=s.match(/^[+-]?\d*\.?\d*/);const tk=m?m[0]:'';const fl=parseFloat(tk)||0;const iv=parseInt(tk)||0;s=s.slice(tk.length);
  let d=self?size*fl:par?psize*fl:YRES(iv);
  let v=right?psize-d:center?psize/2+d:d;
  pos=first?v:pos+op*v;first=false;
  if(s[0]=='+'){op=1;s=s.slice(1)}else if(s[0]=='-'){op=-1;s=s.slice(1)}else break}
 return pos}
const PINS={pin_topleft:[0,0],pin_topright:[1,0],pin_bottomleft:[0,1],pin_bottomright:[1,1],pin_center_top:[.5,0],pin_center_right:[1,.5],pin_center_bottom:[.5,1],pin_center_left:[0,.5],pin_center:[.5,.5]};
P.prototype.layout=function(){
 const par=this.parent;const pw=par?par.w:SW,ph=par?par.h:SH;
 const ptp=this.p.proportionaltoparent=='1';
 const aw=ptp||!par?pw:SW,ah=ptp||!par?ph:SH;
 if(this.o.w==null)this.w=Math.max(0,cWide(this,aw,ah));else this.w=this.o.w;
 if(this.o.h==null)this.h=Math.max(0,cTall(this,aw,ah));else this.h=this.o.h;
 if(this.o.w==null&&/^o/i.test(this.p.wide||''))this.w=cWide(this,aw,ah);
 const x=cPos(this.p.xpos,this.w,aw),y=cPos(this.p.ypos,this.h,ah);
 this.x=this.o.x!=null?this.o.x:(x==null?(this.x||0):x);this.y=this.o.y!=null?this.o.y:(y==null?(this.y||0):y);
 if(this.beforeKids)this.beforeKids();
 this.kids.forEach(k=>k.layout());
 // pin_to_sibling (Panel::PinToSibling): own xpos/ypos become offsets from the sibling corner
 this.kids.forEach(k=>{const sib=k.o.pin||k.p.pin_to_sibling;if(!sib)return;const s=this.find(sib,false);if(!s)return;
  const a=PINS[String(k.o.pinMy||k.p.pin_corner_to_sibling||'pin_topleft').toLowerCase()]||[0,0],b=PINS[String(k.o.pinSib||k.p.pin_to_sibling_corner||'pin_topleft').toLowerCase()]||[0,0];
  const ox=k.o.x!=null?0:YRES(inum(k.p.xpos||0)),oy=k.o.y!=null?0:YRES(inum(k.p.ypos||0));
  k.x=s.x+b[0]*s.w-a[0]*k.w+ox;k.y=s.y+b[1]*s.h-a[1]*k.h+oy;k.kids.forEach(q=>q.layout())});
 if(this.afterLayout)this.afterLayout();
};
// ---- paint ----
function borderCss(name){const b=SCH.b[String(name||'').toLowerCase()];if(!b)return null;
 if(b.bordertype=='scalable_image'){const u=VG.imgUrl(b.image);if(!u)return null;const m=VG.imgMeta(b.image)||{w:256,h:256};
  const src=+b.src_corner_width||8,dw=YRES(+b.draw_corner_width||4);
  return{img:u,slice:Math.round(src*(m.w>1024?1024/m.w:1)),w:dw,bg:b.backgroundtype=='2'}}
 const side=k=>{const l=b[k];if(!l||!l.length)return null;return rgba(l[0].color)};
 return{lines:{l:side('left'),r:side('right'),t:side('top'),b:side('bottom')}}}
VG.borderCss=borderCss;
const NIMG={};const nimg=u=>NIMG[u]||(NIMG[u]=new Promise(ok=>{const im=new Image();im.onload=()=>ok(im);im.onerror=()=>ok(null);im.src=u}));
function nine(cv,bc,w,h){if(w<=0||h<=0)return;const key=bc.img+'|'+w+'|'+h+'|'+bc.w+'|'+bc.slice+'|'+bc.bg;if(cv._k===key)return;cv._k=key;cv.width=w;cv.height=h;cv.style.width=w+'px';cv.style.height=h+'px';
 nimg(bc.img).then(im=>{if(!im||cv._k!==key)return;const g=cv.getContext('2d');g.clearRect(0,0,w,h);g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';
  const k=im.naturalWidth/((VG.imgMeta&&0)||im.naturalWidth),S=bc.slice,iw=im.naturalWidth,ih=im.naturalHeight,s=Math.min(S,iw/2,ih/2),d=Math.max(1,Math.min(Math.round(bc.w),Math.floor(w/2),Math.floor(h/2)));
  const sx=[0,s,iw-s,iw],sy=[0,s,ih-s,ih],dx=[0,d,w-d,w],dy=[0,d,h-d,h];
  for(let r=0;r<3;r++)for(let c=0;c<3;c++){if(r==1&&c==1&&!bc.bg)continue;const sw=sx[c+1]-sx[c],sh=sy[r+1]-sy[r],dw=dx[c+1]-dx[c],dh=dy[r+1]-dy[r];if(sw>0&&sh>0&&dw>0&&dh>0)g.drawImage(im,sx[c],sy[r],sw,sh,dx[c],dy[r],dw,dh)}})}
P.prototype.fg=function(){const p=this.p,s=this.st;if(this.o.fg)return this.o.fg;
 if(this.isButton()){if(!s.enabled&&p.disabledfgcolor2_override)return rgba(p.disabledfgcolor2_override);
  if(s.depressed&&p.depressedfgcolor_override)return rgba(p.depressedfgcolor_override);
  if((s.armed||s.selected)&&p.armedfgcolor_override)return rgba(p.armedfgcolor_override);
  if(p.defaultfgcolor_override)return rgba(p.defaultfgcolor_override)}
 return rgba(p.fgcolor_override||p.fgcolor)||(this.isButton()?rgba('TanLight'):rgba('TanLight'))};
P.prototype.bg=function(){const p=this.p,s=this.st;if(this.o.bg)return this.o.bg;
 if(this.isButton()){if(p.paintbackground=='0')return null;if(!s.enabled&&p.disabledbgcolor_override)return rgba(p.disabledbgcolor_override);
  if(s.depressed&&p.depressedbgcolor_override)return rgba(p.depressedbgcolor_override);
  if((s.armed||s.selected)&&p.armedbgcolor_override)return rgba(p.armedbgcolor_override);
  if(p.defaultbgcolor_override)return rgba(p.defaultbgcolor_override);if(this.root.btnDef&&!p.border_default&&!/image|check|radio/.test(this.type)){return rgba(!s.enabled?'TanDarker':(s.armed||s.depressed||s.selected)?'TFOrange':'TanDark')||rgba(s.armed?'210 125 33 255':'117 107 94 255')}return null}
 if(p.paintbackground=='0')return null;return rgba(p.bgcolor_override)};
P.prototype.paint=function(){const e=this.el,st=e.style,p=this.p;
 st.left=this.x+'px';st.top=this.y+'px';st.width=this.w+'px';st.height=this.h+'px';
 st.zIndex=this.o.z!=null?this.o.z:(p.zpos!=null?inum(p.zpos):0);
 st.display=this.vis?'':'none';st.opacity=(this.alpha/255).toFixed(3);
 st.pointerEvents=p.mouseinputenabled=='0'?'none':'';
 const bg=this.bg();st.backgroundColor=bg?css(bg):'';
 const bs=this.st,sb=this.isButton()?((!bs.enabled&&p.border_disabled)||(bs.depressed&&(p.border_depressed||p.border_armed))||((bs.armed||bs.selected)&&p.border_armed)||p.border_default):null;const bn=this.o.border!==undefined?this.o.border:(sb||p.border);const bc=bn&&p.paintborder!='0'?borderCss(bn):null;
 // borders live on their own layer so children keep vgui's border-less coordinate space
 if(bc&&(bc.img||bc.lines)){
  // ScalableImageBorder: drawn as a real 9-slice onto a canvas at the panel's exact pixel size (CSS border-image leaves hairline seams between slices)
  const want=bc.img?'CANVAS':'I';if(this._b&&this._b.tagName!==want){this._b.remove();this._b=null}
  if(!this._b){this._b=document.createElement(want=='CANVAS'?'canvas':'i');this._b.className='vgb';e.insertBefore(this._b,e.firstChild)}const b=this._b.style;
  if(bc.img){nine(this._b,bc,Math.round(this.w),Math.round(this.h))}
  else{const L=bc.lines;b.borderImage='';b.borderWidth='0';b.boxShadow=[L.l&&`inset 1px 0 ${css(L.l)}`,L.r&&`inset -1px 0 ${css(L.r)}`,L.t&&`inset 0 1px ${css(L.t)}`,L.b&&`inset 0 -1px ${css(L.b)}`].filter(Boolean).join(',')}}
 else if(this._b){this._b.remove();this._b=null}
 if(this.type=='ctflogopanel')this.paintLogo();
 if(this.isImage())this.paintImage();
 if(this.isLabel())this.paintText();
 if(this.isButton()){e.disabled=!this.st.enabled;
  // CExImageButton swaps its SubImage per state
  const sub=this.find('SubImage',false);if(sub){const s=this.st;const im=(!s.enabled&&p.image_disabled)||(s.selected&&p.image_selected)||((s.armed||s.depressed)&&p.image_armed)||p.image_default;if(im)sub.o.img=im;
   const dc=(s.armed||s.selected)&&p.image_armedcolor?p.image_armedcolor:(p.image_drawcolor||null);if(dc)sub.o.drawcolor=rgba(dc);if(sub.painted)sub.paintImage()}}
 this.painted=true;
 this.kids.forEach(k=>k.paint());
 if(this.afterPaint)this.afterPaint()};
P.prototype.paintImage=function(){const e=this.el,st=e.style,p=this.p;if(this.o.url!==undefined){st.backgroundImage=this.o.url?`url("${this.o.url}")`:'';st.backgroundSize='contain';st.backgroundPosition='center';st.backgroundRepeat='no-repeat';st.backgroundOrigin='content-box';st.backgroundClip='content-box';
  if(p.model_wide&&+p.model_wide>0){const mx=YRES(+p.model_xpos||0),my=YRES(+p.model_ypos||0),mw=YRES(+p.model_wide),mh=YRES(+p.model_tall||p.model_wide);st.padding=`${my}px ${Math.max(0,this.w-mx-mw)}px ${Math.max(0,this.h-my-mh)}px ${mx}px`}else st.padding='';return}
 const name=this.o.img||p.image;const u=name?VG.imgUrl(name):null;
 const rot=+(p.rotation||0);st.transform=rot==3?'scaleY(-1)':rot==1?'rotate(90deg)':rot==2?'rotate(-90deg)':'';
 const dc=this.o.drawcolor||rgba(p.drawcolor_override||p.drawcolor)||[255,255,255,255];
 const tile=p.tileimage=='1';const sc=p.scaleimage=='1'||tile;
 if(!u){st.backgroundImage='';st.webkitMaskImage=st.maskImage='';return}
 const white=dc[0]==255&&dc[1]==255&&dc[2]==255;
 const size=tile?'auto':sc?'100% 100%':'auto';
 const m=VG.imgMeta(name)||{};
 const tsz=tile?`${m.w}px ${m.h}px`:size;
 if(white){st.backgroundImage=`url(${u})`;st.backgroundSize=tsz;st.backgroundRepeat=tile?'repeat':'no-repeat';st.webkitMaskImage=st.maskImage='';if(dc[3]<255)st.opacity=((this.alpha/255)*(dc[3]/255)).toFixed(3)}
 else{// vgui DrawSetColor modulates the texture: tint the image by its own luminance via multiply over a coloured layer, keep alpha via mask
  st.backgroundImage=`linear-gradient(${css([dc[0],dc[1],dc[2],255])},${css([dc[0],dc[1],dc[2],255])}),url(${u})`;st.backgroundBlendMode='multiply';st.backgroundSize=`${tsz},${tsz}`;st.backgroundRepeat=tile?'repeat':'no-repeat';
  st.webkitMaskImage=st.maskImage=`url(${u})`;st.webkitMaskSize=st.maskSize=tsz;st.webkitMaskRepeat=st.maskRepeat=tile?'repeat':'no-repeat';if(dc[3]<255)st.opacity=((this.alpha/255)*(dc[3]/255)).toFixed(3)}};
const ALIGN={'north-west':['flex-start','flex-start','left'],'north':['center','flex-start','center'],'north-east':['flex-end','flex-start','right'],'west':['flex-start','center','left'],'center':['center','center','center'],'east':['flex-end','center','right'],'south-west':['flex-start','flex-end','left'],'south':['center','flex-end','center'],'south-east':['flex-end','flex-end','right']};
P.prototype.paintText=function(){const e=this.el,p=this.p;let t=this.text();
 if(this.isButton()&&!t&&!p.font){if(this._tx)this._tx.textContent='';return}
 if(!this._sp){this._sp=document.createElement('span');this._sp.className='vgt';this._tx=document.createElement('span');this._tx.className='vgtt';this._sp.appendChild(this._tx);e.insertBefore(this._sp,e.firstChild)}
 const sp=this._sp;let f=font(this.o.font||p.font)||font('Default');
 // CAutoFittingLabel: keep the first font (own, then the "fonts" list in order) whose text fits the label width
 if(this.type=='cautofittinglabel'&&p.fonts&&t&&this.w>0){const cands=[this.o.font||p.font,...Object.keys(p.fonts).sort((a,b)=>a-b).map(k=>p.fonts[k])];const cv=VG._mc||(VG._mc=document.createElement('canvas').getContext('2d'));
  for(const fn of cands){const ff=font(fn);if(!ff)continue;cv.font=`${ff.weight} ${ff.px}px ${ff.fam}`;if(cv.measureText(String(t)).width<=this.w-2){f=ff;break}f=ff}}
 const al=ALIGN[String(p.textalignment||(this.isButton()?'center':'west')).toLowerCase()]||ALIGN.west;
 const wrap=p.wrap=='1'||p.centerwrap=='1';
 // Label::ApplySettings: insets are raw pixels unless use_proportional_insets; Label::Paint ignores the x inset for centred text
 const pi=p.use_proportional_insets=='1',ix=al[0]=='center'?0:(pi?YRES(+(p.textinsetx||0)):+(p.textinsetx||0)),iy=pi?YRES(+(p.textinsety||0)):+(p.textinsety||0);
 const s=sp.style;s.justifyContent=al[0];s.alignItems=wrap?al[1]:al[1];s.textAlign=p.centerwrap=='1'?'center':al[2];
 s.padding=`${Math.max(0,iy)}px ${al[0]=='flex-end'?ix:0}px 0 ${al[0]!='flex-end'?ix:0}px`;if(iy<0)s.marginTop=iy+'px';else s.marginTop='';
 s.whiteSpace=wrap?'pre-wrap':'pre';this._tx.style.maxWidth=wrap?'100%':'none';
 if(f){s.fontFamily=f.fam;s.fontSize=f.px.toFixed(2)+'px';s.lineHeight=wrap?'1.12':(f.tall.toFixed(1)+'px');s.fontWeight=f.weight;s.filter=f.blur?`blur(${f.blur*K*.5}px)`:'';s.textShadow=f.shadow?`${K}px ${K}px 0 #000`:f.outline?'0 0 1px #000,0 0 1px #000':''}
 const c=this.fg();s.color=css(c);
 if(this._tx.textContent!==t)this._tx.textContent=t;
 // "fonts" list: step down to the first font that fits (CExLabel auto font fitting)
 if(p.fonts&&!wrap&&this.w>0){const list=Object.keys(p.fonts).sort().map(k=>p.fonts[k].font);for(const fn of list){const ff=font(fn);if(!ff)continue;s.fontFamily=ff.fam;s.fontSize=ff.px.toFixed(2)+'px';s.lineHeight=ff.tall.toFixed(1)+'px';if(this._tx.offsetWidth<=this.w+1)break}}};
P.prototype.contentSize=function(){if(!this._tx)return[0,0];const ix=this.p.use_proportional_insets=='1'?YRES(+(this.p.textinsetx||0)):+(this.p.textinsetx||0);return[this._tx.offsetWidth+ix,this._tx.offsetHeight]};

// CTFLogoPanel (tf_controls.cpp): four quarter-ring segments of the TF logo, radius in YRES units, spinning at "velocity" deg/s,
// DrawFilledColoredCircleSegment: angle 0 = up, clockwise; outer edges trimmed 6 deg, inner edges 6/0.35 deg; natural tilt 6.7 deg
P.prototype.paintLogo=function(){if(!this._lc){const c=document.createElement('canvas');c.className='vglogo';c.style.cssText='position:absolute;left:0;top:0;pointer-events:none';this.el.appendChild(c);this._lc=c;this._ang=0;this._t=performance.now();
  const loop=()=>{if(!c.isConnected){this._lc=null;return}const now=performance.now(),dt=(now-this._t)/1000;this._t=now;const vel=this.o.velocity!=null?this.o.velocity:+(this.p.velocity||0);this._ang=(this._ang+dt*vel)%360;this.drawLogo();requestAnimationFrame(loop)};requestAnimationFrame(loop)}
 const c=this._lc,w=Math.round(this.w),h=Math.round(this.h);if(c.width!==w||c.height!==h){c.width=w;c.height=h;c.style.width=w+'px';c.style.height=h+'px'}this.drawLogo()};
P.prototype.drawLogo=function(){const c=this._lc;if(!c)return;const g=c.getContext('2d');g.clearRect(0,0,c.width,c.height);
 const R=YRES(this.o.radius!=null?this.o.radius:+(this.p.radius||5)),r=R*.35,cx=c.width/2,cy=c.height/2,col=this.fg();g.fillStyle=css(col);
 const mo=6,mi=6/.35,rad=a=>(a-90)*Math.PI/180;
 for(let k=0;k<4;k++){const a0=6.7+this._ang+k*90,a1=a0+90;g.beginPath();g.arc(cx,cy,R,rad(a0+mo),rad(a1-mo),false);g.arc(cx,cy,r,rad(a1-mi),rad(a0+mi),true);g.closePath();g.fill()}};
VG.build=function(def,hints){def=JSON.parse(JSON.stringify(def));if(hints){const w=d=>{const h=hints[d.n];if(h&&!d.p.controlname)d.p.controlname=h;(d.c||[]).forEach(w)};w(def)}return new P(def,null,null)};
VG.clone=d=>JSON.parse(JSON.stringify(d));
VG.P=P;
})();
