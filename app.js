/* Soesman Bouw — interactieve demo. Alles in code getekend; geluid via Web Audio API. */
(()=>{
'use strict';
const $=(s,c=document)=>c.querySelector(s), $$=(s,c=document)=>[...c.querySelectorAll(s)];
const NS='http://www.w3.org/2000/svg';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), lerp=(a,b,t)=>a+(b-a)*t;
const ease=t=>1-Math.pow(1-t,3), easeIO=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
const isTouch=matchMedia('(hover:none)').matches;
let seed=11; const rnd=()=>{seed=(seed*16807)%2147483647;return (seed-1)/2147483646};

/* ---------- 1. Oak textures (canvas, procedural) ---------- */
function oak(w,h,horizontal){
  const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');
  if(horizontal){g.translate(w,0);g.rotate(Math.PI/2);[w,h]=[h,w];}
  const gr=g.createLinearGradient(0,0,w,0);
  gr.addColorStop(0,'#9c6a3a');gr.addColorStop(.3,'#b4824c');gr.addColorStop(.55,'#946033');gr.addColorStop(.8,'#ad7b46');gr.addColorStop(1,'#9c6a3a');
  g.fillStyle=gr;g.fillRect(0,0,w,h);
  for(let i=0;i<260;i++){
    const x0=rnd()*w, amp=2+rnd()*9, f=.004+rnd()*.012, ph=rnd()*6.28, dark=rnd()<.7;
    g.beginPath();
    for(let y=-10;y<=h+10;y+=6){const x=x0+Math.sin(y*f+ph)*amp+Math.sin(y*f*3.1+ph)*amp*.25; y<0?g.moveTo(x,y):g.lineTo(x,y);}
    g.strokeStyle=dark?`rgba(${70+rnd()*30|0},${40+rnd()*20|0},${15},${.05+rnd()*.16})`:`rgba(255,225,170,${.04+rnd()*.08})`;
    g.lineWidth=.4+rnd()*1.8;g.stroke();
  }
  for(let i=0;i<70;i++){ // medullary rays (oak "vlam")
    const x=rnd()*w,y=rnd()*h; g.fillStyle=`rgba(255,230,185,${.05+rnd()*.08})`;
    g.beginPath();g.ellipse(x,y,1+rnd()*2.5,6+rnd()*22,0,0,6.28);g.fill();
  }
  return c.toDataURL('image/jpeg',.86);
}
const oakV=oak(600,600,false), oakH=oak(1200,400,true);
document.documentElement.style.setProperty('--oakimg',`url(${oakV})`);

/* ---------- 2. Sound engine ---------- */
const S={ctx:null,on:localStorage.getItem('sb-sound')!=='off',m:null,nb:null,sc:null,
  init(){ if(this.ctx){ if(this.ctx.state==='suspended')this.ctx.resume(); return;}
    const AC=window.AudioContext||window.webkitAudioContext; if(!AC)return;
    const c=this.ctx=new AC(); this.m=c.createGain(); this.m.gain.value=this.on?.85:0; this.m.connect(c.destination);
    const b=this.nb=c.createBuffer(1,c.sampleRate*2,c.sampleRate), d=b.getChannelData(0); for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
  },
  ok(){return this.ctx&&this.on},
  env(g,t,a,p,d){g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(p,t+a);g.gain.exponentialRampToValueAtTime(.0001,t+a+d);},
  noise(){const s=this.ctx.createBufferSource();s.buffer=this.nb;s.loop=true;return s},
  chain(src,nodes,t,a,p,d){const c=this.ctx,g=c.createGain();let n=src;for(const x of nodes){n.connect(x);n=x}n.connect(g);g.connect(this.m);this.env(g,t,a,p,d);src.start(t,src.buffer?Math.random()*1.5:0);src.stop(t+a+d+.05);return g},
  filt(type,f,q=1){const x=this.ctx.createBiquadFilter();x.type=type;x.frequency.value=f;x.Q.value=q;return x},
  osc(type,f){const o=this.ctx.createOscillator();o.type=type;o.frequency.value=f;return o},
  tick(v=.035,t0=0){if(!this.ok())return;const t=this.ctx.currentTime+t0;this.chain(this.noise(),[this.filt('highpass',4500)],t,.001,v,.03)},
  click(){if(!this.ok())return;const t=this.ctx.currentTime,o=this.osc('sine',1900);o.frequency.exponentialRampToValueAtTime(800,t+.06);this.chain(o,[],t,.002,.07,.07);this.tick(.05)},
  tock(v=.18){if(!this.ok())return;const t=this.ctx.currentTime,o=this.osc('triangle',520);o.frequency.exponentialRampToValueAtTime(190,t+.1);this.chain(o,[this.filt('lowpass',1800)],t,.002,v,.14);this.chain(this.noise(),[this.filt('bandpass',1200,2)],t,.001,v*.5,.04)},
  thunk(v=.22,t0=0){if(!this.ok())return;const t=this.ctx.currentTime+t0,o=this.osc('sine',150);o.frequency.exponentialRampToValueAtTime(55,t+.16);this.chain(o,[],t,.003,v,.2);this.chain(this.noise(),[this.filt('lowpass',800)],t,.002,v*.45,.09)},
  tile(t0=0){if(!this.ok())return;const t=this.ctx.currentTime+t0,f=2200+Math.random()*900;this.chain(this.osc('sine',f),[],t,.001,.035,.09);this.chain(this.osc('sine',f*1.51),[],t,.001,.015,.05);this.tick(.02,t0)},
  whoosh(d=.5,f0=300,f1=1800,v=.07){if(!this.ok())return;const t=this.ctx.currentTime,bp=this.filt('bandpass',f0,1.1);bp.frequency.exponentialRampToValueAtTime(f1,t+d);this.chain(this.noise(),[bp],t,d*.45,v,d*.55)},
  unfold(){if(!this.ok())return;this.whoosh(.7,500,3200,.11);for(let i=0;i<7;i++)this.tick(.03+Math.random()*.04,Math.random()*.7)},
  slide(){if(!this.ok())return;const t=this.ctx.currentTime,lp=this.filt('lowpass',400,.7);lp.frequency.linearRampToValueAtTime(1000,t+.45);this.chain(this.noise(),[lp],t,.08,.12,.4);this.thunk(.12,.46)},
  creak(){if(!this.ok())return;const t=this.ctx.currentTime,o=this.osc('sawtooth',70),l=this.osc('sine',17),lg=this.ctx.createGain();lg.gain.value=7;l.connect(lg);lg.connect(o.frequency);o.frequency.linearRampToValueAtTime(115,t+.5);o.frequency.linearRampToValueAtTime(88,t+1);l.start(t);l.stop(t+1.2);this.chain(o,[this.filt('bandpass',700,3)],t,.25,.05,.85)},
  chime(){if(!this.ok())return;const t=this.ctx.currentTime;[660,990,1320,1760].forEach((f,i)=>this.chain(this.osc('sine',f),[],t+i*.07,.01,.06/(i+1),1.8))},
  scratch(level){ if(!this.ctx)return; if(!this.sc){const n=this.noise(),bp=this.filt('bandpass',2900,.9),hp=this.filt('highpass',900),g=this.ctx.createGain();g.gain.value=0;n.connect(bp);bp.connect(hp);hp.connect(g);g.connect(this.m);n.start();this.sc=g}
    this.sc.gain.setTargetAtTime(this.on?level:0,this.ctx.currentTime,.03)},
  toggle(){this.on=!this.on;localStorage.setItem('sb-sound',this.on?'on':'off');if(this.m)this.m.gain.setTargetAtTime(this.on?.85:0,this.ctx.currentTime,.05);ui()}
};
const sb=$('#snd');function ui(){sb.classList.toggle('on',S.on);$('#sndtxt').textContent=S.on?'Geluid':'Stil'}ui();
sb.addEventListener('click',e=>{S.init();S.toggle();S.click()});
['pointerdown','keydown','touchstart'].forEach(ev=>addEventListener(ev,()=>S.init(),{passive:true}));
document.addEventListener('click',e=>{const el=e.target.closest('[data-snd]');if(el&&el!==sb){const k=el.dataset.snd;S[k]&&S[k]()}});
$$('nav ul a,.chip,.btn').forEach(a=>a.addEventListener('mouseenter',()=>S.tick(.018)));

/* ---------- 3. Loader, cursor, nav, ruler, reveal ---------- */
addEventListener('load',()=>setTimeout(()=>{$('#loader').classList.add('done');document.body.classList.add('loaded');$$('.split').forEach(s=>s.classList.add('in'))},900));
setTimeout(()=>{$('#loader').classList.add('done');document.body.classList.add('loaded');$$('.split').forEach(s=>s.classList.add('in'))},3500);
$$('.split').forEach(el=>{const t=el.textContent;el.textContent='';let i=0;t.split(' ').forEach((w,wi,arr)=>{const wd=document.createElement('span');wd.style.whiteSpace='nowrap';wd.style.display='inline-block';[...w].forEach(ch=>{const s=document.createElement('span');s.className='ch';s.textContent=ch;s.style.transitionDelay=(.9+(i++)*.035)+'s';wd.appendChild(s)});el.appendChild(wd);if(wi<arr.length-1)el.appendChild(document.createTextNode(' '))})});

const ring=$('#ring'),dot=$('#dot'),rtxt=$('#ringtxt');let mx=innerWidth/2,my=innerHeight/2,rx=mx,ry=my;
if(!isTouch){document.body.classList.add('has-cursor');
  addEventListener('pointermove',e=>{mx=e.clientX;my=e.clientY;dot.style.transform=`translate(${mx}px,${my}px)`});
  (function loop(){rx=lerp(rx,mx,.18);ry=lerp(ry,my,.18);ring.style.transform=`translate(${rx}px,${ry}px)`;requestAnimationFrame(loop)})();
  document.addEventListener('pointerover',e=>{const c=e.target.closest('[data-cur]');const h=e.target.closest('a,button,.card,.chip,.drawer,.wallx,.miter,.cab,input,textarea,.drop');
    ring.classList.toggle('big',!!c);ring.classList.toggle('hov',!c&&!!h);if(c)rtxt.textContent=c.dataset.cur});
}
$$('.mag').forEach(b=>{b.addEventListener('pointermove',e=>{const r=b.getBoundingClientRect();b.style.transform=`translate(${(e.clientX-r.left-r.width/2)*.25}px,${(e.clientY-r.top-r.height/2)*.35}px)`});b.addEventListener('pointerleave',()=>b.style.transform='')});

const nav=$('#nav'),rbar=$('#rbar'),rmm=$('#rmm');
function onScroll(){const y=scrollY,max=document.documentElement.scrollHeight-innerHeight,p=y/max;nav.classList.toggle('solid',y>60);
  rbar.style.width=(p*100)+'%';rmm.style.left=clamp(p*100,3,97)+'%';rmm.textContent=Math.round(y*.2646).toLocaleString('nl-NL')+' mm';
  const hp=$('#heroph');if(y<innerHeight*1.2)hp.style.translate=`${hx}px ${y*.25+hy}px`;
  const sp=$('#slotph'),r=sp.parentNode.getBoundingClientRect();if(r.top<innerHeight&&r.bottom>0)sp.style.transform=`translateY(${(r.top/innerHeight)*-60}px)`;
  bricksScroll();volScroll();}
addEventListener('scroll',onScroll,{passive:true});
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{threshold:.15});
$$('.rv,.mask').forEach(el=>io.observe(el));
$$('h2.rv,h3.rv').forEach(h=>$$('.mask>span',h).forEach((s,i)=>s.style.transitionDelay=(i*.12)+'s'));

/* hero mouse parallax + spotlight */
let hx=0,hy=0;const himg=$('#heroimg');
himg.addEventListener('pointermove',e=>{const r=himg.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;himg.style.setProperty('--mx',x*100+'%');himg.style.setProperty('--my',y*100+'%');hx=(x-.5)*-24;hy=(y-.5)*-16;onScroll()});

/* marquee */
const svcs=['Verbouwing & renovatie','Metselwerk','Interieur op maat','Tegelwerk','Stucwerk','Wandafwerking','Houtverbindingen'];
$('#marq').innerHTML=[...svcs,...svcs].map(s=>`<span>${s}</span><b>✦</b>`).join('');

/* helper: svg path w/ draw */
function mk(tag,attrs,parent){const e=document.createElementNS(NS,tag);for(const k in attrs)e.setAttribute(k,attrs[k]);parent&&parent.appendChild(e);return e}
function drawIn(paths,dur=1.2,stagger=.12,delay=0){paths.forEach((p,i)=>{const L=p.getTotalLength();p.style.transition='none';p.style.strokeDasharray=L;p.style.strokeDashoffset=L;p.getBoundingClientRect();p.style.transition=`stroke-dashoffset ${dur}s cubic-bezier(.22,.8,.18,1) ${delay+i*stagger}s`;p.style.strokeDashoffset=0})}

/* ---------- 4. TEKENTAFEL ---------- */
const stage=$('#stage'),board=$('#board'),plan=$('#plan');
const PL=[
 ['w','M80 60 H720 V440 H80 Z'],['w','M360 60 V250'],['w','M360 310 V440'],['w','M80 260 H250'],['w','M300 260 H360'],['w','M560 60 V200'],['w','M560 250 V300 H720'],
 ['t','M150 54 H290 M150 66 H290'],['t','M714 110 V190 M726 110 V190'],['t','M74 320 V400 M86 320 V400'],['t','M440 434 H520 M440 446 H520'],
 ['t','M300 260 V310 A50 50 0 0 1 250 260'],['t','M360 250 H420 A60 60 0 0 1 360 310'],['t','M600 440 V380 A60 60 0 0 1 660 440'],['t','M560 200 H610 A50 50 0 0 1 560 250'],
 ['t','M92 72 H348 M92 100 H348 M92 72 V100'],['t','M170 160 h120 v44 h-120 Z'],
 ['t','M400 330 H540 V420 H400 Z M420 330 V420 M440 330 V420 M460 330 V420 M480 330 V420 M500 330 V420 M520 330 V420'],
 ['t','M120 300 h150 v70 h-150 Z M130 380 h60 v30 h-60 Z'],['t','M600 90 h90 v80 h-90 Z M600 110 h90'],
 ['d','M80 480 H720 M80 472 V488 M720 472 V488 M360 474 V486'],['d','M40 60 V440 M32 60 H48 M32 440 H48 M34 260 H46'],
];
const rooms=[[80,60,280,200,'Keuken',220,230],[80,260,280,180,'Woonkamer',220,425],[360,60,200,250,'Eetkamer',460,150],[560,60,160,140,'Berging',640,190],[360,310,360,130,'Hal',640,370]];
rooms.forEach(r=>{mk('rect',{class:'room',x:r[0],y:r[1],width:r[2],height:r[3]},plan)});
const segs=PL.map(([c,d])=>{const p=mk('path',{class:'ln '+c,d},plan);const L=p.getTotalLength();p.style.strokeDasharray=L;p.style.strokeDashoffset=L;return{p,L}});
rooms.forEach(r=>{const t=mk('text',{x:r[5],y:r[6],'text-anchor':'middle'},plan);t.textContent=r[4]});
let acc=0;segs.forEach(s=>{s.s=acc;acc+=s.L});const TOT=acc;
const pen=mk('g',{},plan);pen.innerHTML='<g transform="rotate(-38)"><polygon points="0,0 16,-6 16,6" fill="#e8d2a8"/><polygon points="0,0 6,-2.2 6,2.2" fill="#333"/><rect x="16" y="-6" width="140" height="12" fill="#d9a441"/><rect x="16" y="-1" width="140" height="2" fill="rgba(0,0,0,.15)"/><rect x="156" y="-6.5" width="10" height="13" fill="#c9c9c9"/><rect x="166" y="-6.5" width="12" height="13" rx="3" fill="#c67a6a"/></g>';
pen.style.opacity=0;pen.style.transition='opacity .4s';pen.style.filter='drop-shadow(-6px 10px 4px rgba(0,0,0,.25))';
let drawn=0,drawing=false,auto=false,uncovered=false,done=false,opened=false,last=0,lastPt=null;
function setStep(i){$$('#tsteps span').forEach((s,j)=>s.classList.toggle('on',j<=i))}
function uncover(){if(uncovered)return;uncovered=true;stage.classList.add('uncover');S.unfold();setTimeout(()=>{drawing=true;if(!raf)raf=requestAnimationFrame(tdraw)},650)}
let raf=0;
function tdraw(t){raf=0;const dt=Math.min(.05,(t-(last||t))/1000);last=t;
  if((drawing||auto)&&!done){drawn+=dt*TOT/(auto?2.2:4.8);pen.style.opacity=1;
    let cur=segs[segs.length-1],pt;
    for(const s of segs){const v=clamp(drawn-s.s,0,s.L);s.p.style.strokeDashoffset=s.L-v;if(drawn>=s.s&&drawn<s.s+s.L)cur=s}
    pt=cur.p.getPointAtLength(clamp(drawn-cur.s,0,cur.L));const wob=Math.sin(t/60)*1.5;
    pen.setAttribute('transform',`translate(${pt.x+wob},${pt.y})`);
    const sp=lastPt?Math.hypot(pt.x-lastPt.x,pt.y-lastPt.y):0;lastPt=pt;S.scratch(clamp(sp*.012,0,.12)*(.7+Math.random()*.6));
    if(drawn>=TOT)finish();
  }else{S.scratch(0);last=0}
  if((drawing||auto)&&!done)raf=requestAnimationFrame(tdraw)}
function finish(){done=true;S.scratch(0);pen.style.opacity=0;plan.classList.add('filled');stage.classList.add('drawn');stage.dataset.cur='Open';setStep(1);$('#thint').textContent='Klik om de tekentafel open te klappen';S.tock(.2);setTimeout(()=>S.thunk(.15),180)}
function openTable(){if(opened)return;opened=true;stage.classList.add('open');stage.dataset.cur='Kies';setStep(2);$('#thint').textContent='Trek een la open — elk vak heeft een eigen blad';S.unfold();setTimeout(()=>S.slide(),700);
  $$('.drawer').forEach((d,i)=>setTimeout(()=>S.tick(.04),900+i*70))}
stage.dataset.cur='Teken';
board.addEventListener('pointerenter',()=>{if(!uncovered)uncover();else if(!done){drawing=true;if(!raf)raf=requestAnimationFrame(tdraw)}});
board.addEventListener('pointerleave',()=>{if(!auto){drawing=false;S.scratch(0);pen.style.opacity=0}});
board.addEventListener('click',()=>{if(!uncovered){auto=true;uncover();return}if(!done){auto=true;if(!raf)raf=requestAnimationFrame(tdraw);return}openTable()});
$('#openbtn').addEventListener('click',e=>{e.stopPropagation();openTable()});
if(isTouch){board.addEventListener('touchstart',()=>{auto=true},{passive:true})}

/* drawers + sheets */
const SH=[
 {k:'01 · Verbouwing & renovatie',h:'Indeling en looproutes.',p:['Een verbouwing begint bij het dagelijks gebruik. Waar komt u binnen met boodschappen? Welke deur staat steeds in de weg? Op de plattegrond leggen we de bestaande situatie naast de gewenste indeling.','Ook de volgorde van het werk komt op tafel. Bespreek welke ruimtes bereikbaar moeten blijven, waar materialen binnenkomen en welke keuzes vóór de start vast moeten liggen.'],id:'s-verbouwing',
  d:()=>['M40 40 H360 V260 H40 Z','M200 40 V130','M200 180 V260','M40 150 H130','M170 150 H200','M200 130 A50 50 0 0 1 250 180',['g','M300 262 C 300 200, 250 160, 120 100'],['g','M110 92 L120 100 L108 106']]},
 {k:'02 · Metselwerk',h:'Steen en voeg.',p:['Bij een nieuwe muur of een plaatselijk herstel bepalen steenformaat, metselverband en voeg samen het aanzicht. Vooral naast bestaand werk valt het op als een horizontale voeg nét op een andere hoogte loopt.','Een proefvlak maakt de keuze tastbaar. Bekijk steen en voeg buiten in daglicht en let ook op de aansluiting rond een hoek, kozijn of dorpel.'],id:'s-metselwerk',
  d:()=>{const a=[];for(let r=0;r<8;r++){const y=40+r*28;a.push(`M30 ${y} H370`);for(let x=30+(r%2?28:0);x<370;x+=56)a.push(`M${x} ${y} V${y+28}`)}a.push('M30 264 H370');a.push(['g','M30 152 H370']);return a}},
 {k:'03 · Interieur op maat',h:'Kastindeling.',p:['Hoeveel ruimte vraagt wat u wilt opbergen? Bespreek de vakverdeling, de diepte en de manier waarop de kast aansluit op vloer en plafond.','Denk ook aan wat achter de deuren verdwijnt. Een stopcontact, leiding of scheve hoek bepaalt soms precies waar een kastvak eindigt.'],id:'s-interieur',
  d:()=>['M20 30 H380','M60 30 V270 H340 V30','M153 30 V270','M246 30 V270','M60 100 H153 M60 170 H153 M153 130 H246 M246 90 H340 M246 160 H340 M246 220 H340','M60 250 H340',['g','M270 200 h16 v16 h-16 Z'],['g','M330 30 V270']]},
 {k:'04 · Tegelwerk',h:'Verdeling en snijlijnen.',p:['Een rustig tegelvlak begint met de verdeling. Vanuit de zichtlijn bij de deur bekijken we waar de voegen lopen en hoe breed de laatste rij langs de wand wordt. Zo zijn de snijstukken vooraf in beeld.','Bij een nis, buitenhoek of overgang naar een houten vloer komen meerdere lijnen samen. Leg tegel, voegkleur en randafwerking naast elkaar om te zien hoe dat detail uitpakt.'],id:'s-tegelwerk',
  d:()=>{const a=['M40 30 H360 V270 H40 Z'];for(let x=70;x<360;x+=60)a.push(`M${x} 30 V270`);for(let y=30;y<270;y+=60)a.push(`M40 ${y} H360`);a.push(['g','M200 290 V10']);a.push(['g','M40 280 H70 M40 276 V284 M70 276 V284']);return a}},
 {k:'05 · Stucwerk',h:'Ondergrond en afwerking.',p:['Langs een raam laat strijklicht iedere overgang zien. Daarom begint het gesprek bij de ondergrond en de gewenste uitstraling. Wilt u een glad wandvlak of juist een fijne structuur waarin het licht zachter valt?','Ook de randen maken verschil. Bespreek vooraf hoe het stucwerk eindigt bij de plint, een kozijn of een houten paneel. Een materiaalstaal helpt om kleur en structuur in de ruimte te beoordelen.'],id:'s-stucwerk',
  d:()=>['M30 30 H370 V270 H30 Z','M30 60 H70 V220 H30','M30 250 H370',['g','M70 80 L360 120'],['g','M70 120 L360 170'],['g','M70 160 L360 220'],['g','M70 200 L300 250']]},
 {k:'06 · Wandafwerking',h:'Deur in de wand.',p:['Een vlakke deur begint bij de verdeling van de wand. Bekijk samen hoe de naden, de houtnerf en de doorgang op elkaar aansluiten.','Door het patroon vooraf over wand en deur te verdelen, blijft de doorgang onderdeel van het grotere vlak. Bekijk het resultaat ook eens vanaf de andere kant van de ruimte.'],id:'s-wandafwerking',
  d:()=>{const a=['M30 30 H370 V270 H30 Z'];for(let x=72;x<370;x+=42.5)a.push(`M${x} 30 V270`);a.push(['g','M157 50 H242 V270 M157 50 V270']);a.push(['g','M157 270 A85 85 0 0 1 242 185']);return a}},
 {k:'07 · Houtverbindingen',h:'Verstek in eiken.',p:['Op een buitenhoek komen twee zaagvlakken samen. Kies waar de nerf doorloopt en hoe scherp of zacht de afgewerkte rand mag aanvoelen.','Bij het uitzoeken van het hout kunt u twee delen naast elkaar houden. Dan ziet u direct of de kleur en de richting van de nerf bij de hoek passen.'],id:'s-houtverbindingen',
  d:()=>['M40 230 H260 L320 170 V30','M40 190 H220 L280 130 V30','M40 230 V190 M320 30 H280',['g','M220 190 L260 230'],['g','M60 205 H230 L295 140 V40'],['g','M60 215 H240 L305 150 V40']]},
];
const dw=$('#drawers');
SH.forEach((s,i)=>{const b=document.createElement('button');b.className='drawer';b.innerHTML=`<span class="no">${['i','ii','iii','iv','v','vi','vii'][i]}</span><span class="handle"></span><span class="lbl">${s.k.split('· ')[1]}</span>`;
  b.addEventListener('mouseenter',()=>S.tick(.03));b.addEventListener('click',e=>{e.stopPropagation();showSheet(i)});dw.appendChild(b)});
const sheet=$('#sheet');let cur=-1;
function showSheet(i){cur=(i+SH.length)%SH.length;const s=SH[cur];$$('.drawer').forEach((d,j)=>d.classList.toggle('act',j===cur));
  S.slide();setTimeout(()=>S.unfold(),250);
  $('#sk').textContent=s.k;$('#sh').textContent=s.h;$('#sp').innerHTML=s.p.map(t=>`<p>${t}</p>`).join('');$('#sa').href='#'+s.id;
  const sv=$('#sheetsvg');sv.innerHTML='';const ps=s.d().map(d=>Array.isArray(d)?mk('path',{class:'ln g',d:d[1],'stroke-dasharray':'6 4'},sv):mk('path',{class:'ln',d},sv));
  sheet.classList.remove('show');void sheet.offsetWidth;sheet.classList.add('show');
  setTimeout(()=>{drawIn(ps.filter(p=>!p.classList.contains('g')),1.1,.09,.2);ps.filter(p=>p.classList.contains('g')).forEach((p,k)=>{p.style.opacity=0;p.style.transition='opacity .8s '+(1+k*.2)+'s';requestAnimationFrame(()=>p.style.opacity=1)})},50);
  let n=0;const iv=setInterval(()=>{S.scratch(.06+Math.random()*.05);if(++n>18){clearInterval(iv);S.scratch(0)}},70);
}
$('#sx').addEventListener('click',e=>{e.stopPropagation();sheet.classList.remove('show');$$('.drawer').forEach(d=>d.classList.remove('act'));S.whoosh(.35,1500,400,.06)});
$('#snext').addEventListener('click',e=>{e.stopPropagation();showSheet(cur+1)});$('#sprev').addEventListener('click',e=>{e.stopPropagation();showSheet(cur-1)});
$('#sa').addEventListener('click',()=>{sheet.classList.remove('show')});

/* ---------- 5. Verbouwing plan ---------- */
const p2=$('#plan2svg');
p2.innerHTML=`<rect class="rm" x="40" y="40" width="210" height="210"/><rect class="rm" x="250" y="40" width="150" height="260"/><rect class="rm" x="400" y="40" width="160" height="140"/><rect class="rm" x="40" y="250" width="210" height="150"/><rect class="rm" x="400" y="180" width="160" height="220"/>
<path class="wall" d="M110 400 H40 V40 H560 V400 H170"/>
<path class="wall old" id="w1" d="M250 40 V250"/><path class="wall old" id="w2" d="M40 250 H200"/>
<path class="wall" d="M250 300 V400"/><path class="wall" d="M400 180 H560"/><path class="wall" d="M400 40 V130"/>
<path class="wall" id="wn" d="M330 40 V150" style="opacity:0"/>
<path class="door" d="M200 250 H250 M200 250 A50 50 0 0 0 250 300"/><path class="door" d="M400 130 V180 M400 130 A50 50 0 0 1 450 180"/><path class="door" d="M110 400 V350 A50 50 0 0 1 160 400"/>
<path class="route" id="route" d="M140 395 V320 C140 290 190 280 225 278 S 330 280 360 230 S 420 160 480 110"/>
<text x="140" y="430" text-anchor="middle" class="tag">Entree</text>
<text id="lk" x="480" y="100" text-anchor="middle">Keuken</text><text id="lw" x="145" y="150" text-anchor="middle">Woonkamer</text>
<text x="480" y="300" text-anchor="middle">Eetkamer</text><text x="325" y="350" text-anchor="middle" class="tag">Berging</text>`;
function plan2(v){const g=v==='gew';const w1=$('#w1'),w2=$('#w2'),wn=$('#wn'),r=$('#route');
  [w1,w2].forEach(w=>{const L=w.getTotalLength();w.style.strokeDasharray=L;w.style.strokeDashoffset=g?L:0});
  wn.style.opacity=g?1:0;if(g)drawIn([wn],1,0,.5);
  r.setAttribute('d',g?'M140 395 V200 C140 150 150 120 180 110':'M140 395 V320 C140 290 190 280 225 278 S 330 280 360 230 S 420 160 480 110');
  const lk=$('#lk'),lw=$('#lw');if(g){lk.setAttribute('x',190);lk.setAttribute('y',100);lw.setAttribute('x',480);lw.setAttribute('y',110)}else{lk.setAttribute('x',480);lk.setAttribute('y',100);lw.setAttribute('x',145);lw.setAttribute('y',150)}
  $('#plan2note').textContent=g?'Gewenst: directe route entree → keuken':'Bestaand: route via twee deuren';S.whoosh(.5,300,1400,.06);setTimeout(()=>S.tock(.12),500)}
$$('#plan2 .chip').forEach(c=>c.addEventListener('click',()=>{$$('#plan2 .chip').forEach(x=>x.classList.toggle('on',x===c));plan2(c.dataset.v)}));
$('#plan2svg').addEventListener('click',()=>{const n=$$('#plan2 .chip').find(c=>!c.classList.contains('on'));n.click()});
plan2('best');

/* ---------- 6. Metselwerk ---------- */
const bsvg=$('#bricksvg'),ROWS=14,CH=30,BW=600;let bond='half',aligned=false,built=-1;
const cols=['#6b3b2a','#7a4430','#5e3326','#83503a','#4f2c22','#8c5a40','#734032'];
function rowBricks(r){const out=[];const H=40,St=84,V=4;let x,pattern;
  if(bond==='half'){x=r%2?-44:0;while(x<BW){out.push([x,St]);x+=St+V}}
  else if(bond==='kruis'){if(r%2){x=-22;while(x<BW){out.push([x,H]);x+=H+V}}else{x=(r%4===0)?0:-44;while(x<BW){out.push([x,St]);x+=St+V}}}
  else{x=r%2?-(St+V)/2-11:0;let s=true;while(x<BW){const w=s?St:H;out.push([x,w]);x+=w+V;s=!s}}
  return out}
function buildBricks(){seed=31;bsvg.innerHTML=`<defs><clipPath id="cO"><rect x="0" y="0" width="240" height="420"/></clipPath><clipPath id="cN"><rect x="240" y="0" width="360" height="420"/></clipPath></defs><rect width="600" height="420" fill="#17110c"/>`;
  const gO=mk('g',{'clip-path':'url(#cO)'},bsvg),gN=mk('g',{'clip-path':'url(#cN)'},bsvg),gNi=mk('g',{id:'bnew',style:'transition:transform .9s cubic-bezier(.3,1.4,.5,1)'},gN);
  for(let i=0;i<ROWS;i++){const y=420-(i+1)*CH;
    [gO,gNi].forEach((G,k)=>{const c=mk('g',{class:'crs off','data-r':i},G);mk('rect',{x:0,y:y,width:600,height:CH,fill:k?'#cfc3ad':'#b9ac95'},c);
      rowBricks(i).forEach(([x,w])=>{const col=cols[(rnd()*cols.length)|0];mk('rect',{x:x,y:y+2,width:w,height:CH-4,rx:1.5,fill:col,style:`filter:brightness(${k?1.12+rnd()*.15:.85+rnd()*.25})`},c)});
      c.querySelectorAll('rect').forEach((rc,j)=>rc.style.transitionDelay=(j*.018)+'s')})}
  mk('line',{x1:240,y1:0,x2:240,y2:420,stroke:'rgba(230,201,143,.7)','stroke-dasharray':'4 6'},bsvg);
  mk('rect',{x:70,y:398,width:100,height:16,fill:'rgba(18,14,10,.75)'},bsvg);mk('rect',{x:250,y:398,width:70,height:16,fill:'rgba(18,14,10,.75)'},bsvg);const t1=mk('text',{x:120,y:410,'text-anchor':'middle',fill:'#e6c98f','font-size':11,'letter-spacing':2,'font-family':'Jost'},bsvg);t1.textContent='BESTAAND';
  const t2=mk('text',{x:285,y:410,'text-anchor':'middle',fill:'#e6c98f','font-size':11,'letter-spacing':2,'font-family':'Jost'},bsvg);t2.textContent='NIEUW';
  mk('line',{class:'lev',id:'blev',x1:0,x2:600,y1:420-6*CH,y2:420-6*CH},bsvg);
  setAlign();const b=built;built=-1;showCourses(Math.max(0,b),true)}
function setAlign(){const g=$('#bnew');if(g)g.style.transform=aligned?'translateY(0)':'translateY(-6px)';const l=$('#blev');if(l)l.style.opacity=aligned?.25:1;
  $('#bricknote').textContent=aligned?'Voeg loopt door op één hoogte':'Let op: de nieuwe voeg loopt 6 mm hoger'}
function showCourses(n,quiet){if(n===built)return;const up=n>built;$$('#bricksvg .crs').forEach(c=>c.classList.toggle('off',+c.dataset.r>=n));if(up&&!quiet)for(let i=0;i<Math.min(n-built,3);i++)S.thunk(.09,i*.08);built=n}
function bricksScroll(){const el=$('#brick');if(!el)return;const r=el.getBoundingClientRect();const p=clamp((innerHeight*.95-r.top)/(r.height+innerHeight*.35),0,1);showCourses(Math.round(p*ROWS))}
$$('#brick .chip').forEach(c=>c.addEventListener('click',()=>{if(c.dataset.b==='lev'){aligned=!aligned;c.classList.toggle('on',aligned);setAlign();S.tock();return}
  $$('#brick .chip[data-b]:not([data-b=lev])').forEach(x=>x.classList.toggle('on',x===c));bond=c.dataset.b;const n=built;buildBricks();built=0;$$('#bricksvg .crs').forEach(c=>c.classList.add('off'));
  let i=0;const iv=setInterval(()=>{showCourses(++i);if(i>=n)clearInterval(iv)},110)}));
buildBricks();

/* ---------- 7. Interieur op maat ---------- */
const cab=$('#cab'),unit=$('#unit');let ncol=3,svcOn=false;
function buildCab(){unit.style.gridTemplateColumns=`repeat(${ncol},1fr)`;unit.innerHTML='';
  for(let i=0;i<ncol;i++){const c=document.createElement('div');c.className='col';const sh=3+(i%2);let h='';for(let k=0;k<sh;k++)h+='<div class="shelf"></div>';
    h+=`<div class="item">${'<i style="height:'+(50+rnd()*50)+'%"></i>'.repeat(4)}</div><div class="door"></div>`;
    if(i===1)h+='<div class="sock" style="left:40%;top:18%"></div>';if(i===ncol-1)h+='<div class="pipe" style="right:10%"></div>';c.innerHTML=h;unit.appendChild(c)}
  $('#cabdim').textContent=ncol+' vakken'}
buildCab();
cab.addEventListener('mouseenter',()=>{if(!svcOn){cab.classList.add('open');S.creak()}});
cab.addEventListener('mouseleave',()=>{if(!svcOn){cab.classList.remove('open');setTimeout(()=>S.tock(.12),700)}});
cab.addEventListener('click',()=>{if(isTouch){cab.classList.toggle('open');S.creak()}});
$$('#cab').forEach(()=>{});
$$('.chip[data-c]').forEach(c=>c.addEventListener('click',()=>{if(c.dataset.c==='svc'){svcOn=!svcOn;c.classList.toggle('on',svcOn);cab.classList.toggle('svc-on',svcOn);cab.classList.toggle('open',svcOn);S.creak();return}
  $$('.chip[data-c]:not([data-c=svc])').forEach(x=>x.classList.toggle('on',x===c));ncol=+c.dataset.c;cab.classList.remove('open');S.tock();setTimeout(()=>{buildCab();if(svcOn)cab.classList.add('open')},150)}));

/* ---------- 8. Tegelwerk ---------- */
const tsvg=$('#tilesvg');let tmode='wand',tsz=60,voeg=0;const voegs=['#6f6a63','#bdb6aa','#3a342e'];
const RW=340,RH=260,SC=1.55,X0=36.5,Y0=8;
function buildTiles(){tsvg.innerHTML=`<defs><pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#cfc6b6"/><line x1="0" y1="0" x2="0" y2="6" stroke="#b9ae9a" stroke-width="2"/></pattern><clipPath id="room"><rect x="${X0}" y="${Y0}" width="${RW*SC}" height="${RH*SC}"/></clipPath></defs>
  <rect x="${X0}" y="${Y0}" width="${RW*SC}" height="${RH*SC}" fill="${voegs[voeg]}"/>`;
  const g=mk('g',{'clip-path':'url(#room)'},tsvg);const t=tsz,v=.4;
  let sx=tmode==='wand'?0:(RW/2-t/2)-Math.ceil((RW/2-t/2)/t)*t;
  const door=[X0+RW/2*SC,Y0+RH*SC];seed=5;const tiles=[];let cutW=null;
  for(let y=RH;y>-t;y-=t){for(let x=sx;x<RW;x+=t){const x1=Math.max(0,x),x2=Math.min(RW,x+t),y1=Math.max(0,y-t),y2=Math.min(RH,y);if(x2-x1<=0||y2-y1<=0)continue;
    const cut=(x2-x1)<t-.01||(y2-y1)<t-.01;if((x2-x1)<t-.01&&x2===RW)cutW=x2-x1;
    const px=X0+x1*SC+v,py=Y0+y1*SC+v,pw=(x2-x1)*SC-2*v,ph=(y2-y1)*SC-2*v;
    const sh=200+rnd()*22|0;const r=mk('rect',{class:'tl off',x:px,y:py,width:pw,height:ph,fill:cut?'url(#hatch)':`rgb(${sh+12},${sh+5},${sh-8})`},g);
    const dist=Math.hypot(px+pw/2-door[0],py+ph/2-door[1]);r.style.transitionDelay=(dist/520)+'s';tiles.push(r);
    if(cut){if((x2-x1)<t-.01)mk('line',{class:'cut',x1:x1===0?px+.5:px+pw-.5,x2:x1===0?px+.5:px+pw-.5,y1:py,y2:py+ph},g);if((y2-y1)<t-.01)mk('line',{class:'cut',x1:px,x2:px+pw,y1:py+.5,y2:py+.5},g)}}}
  mk('rect',{x:X0,y:Y0,width:RW*SC,height:RH*SC,fill:'none',stroke:'#e6c98f','stroke-width':1},tsvg);
  mk('path',{d:`M${door[0]-45} ${Y0+RH*SC} h90`,stroke:'#120e0a','stroke-width':6},tsvg);
  mk('path',{d:`M${door[0]} ${Y0+RH*SC+12} V${Y0-8}`,stroke:'#e6c98f','stroke-width':1,'stroke-dasharray':'3 5',opacity:tmode==='zicht'?1:.25},tsvg);
  const lab=mk('text',{x:door[0],y:Y0+RH*SC+13,'text-anchor':'middle',fill:'#e6c98f','font-size':10,'letter-spacing':2,'font-family':'Jost'},tsvg);lab.textContent='DEUR · ZICHTLIJN';
  requestAnimationFrame(()=>requestAnimationFrame(()=>tiles.forEach(r=>r.classList.remove('off'))));
  for(let i=0;i<10;i++)S.tile(i*.07+Math.random()*.03);
  const lw=tmode==='wand'?(cutW?cutW.toFixed(0):t):((RW-Math.floor((RW-0)/t)*t)/2);
  $('#tilenote').textContent=tmode==='wand'?`Laatste rij langs de wand: ${lw} cm`:`Gelijke snijstukken links en rechts: ${(sx+t>0?(sx+t):t).toFixed(0)} cm`;
}
$$('#tiles .chip').forEach(c=>c.addEventListener('click',()=>{if(c.dataset.t==='voeg'){voeg=(voeg+1)%voegs.length;tsvg.querySelector('rect[fill^="#"]').setAttribute('fill',voegs[voeg]);S.tile();return}
  $$('#tiles .chip[data-t]:not([data-t=voeg])').forEach(x=>x.classList.toggle('on',x===c));tmode=c.dataset.t;buildTiles()}));
$('#tsize').addEventListener('input',e=>{tsz=+e.target.value;$('#tsizev').textContent=tsz+' cm';buildTiles()});
new IntersectionObserver((es,o)=>{if(es[0].isIntersecting){buildTiles();o.disconnect()}},{threshold:.4}).observe($('#tiles'));buildTiles();

/* ---------- 9. Stucwerk raking light ---------- */
const pl=$('#plaster'),ppt=$('#ppt'),pturb=$('#pturb'),plight=$('#plight'),lamp=$('#lamp');let pHover=false,pTarget={x:40,y:160},pPos={x:40,y:160},pVis=false;
const pModes={glad:['0.006',2,.7],fijn:['0.07',3,1.6],kalk:['0.012 0.02',5,2.2]};
pl.addEventListener('pointermove',e=>{const r=pl.getBoundingClientRect();pHover=true;pTarget={x:(e.clientX-r.left)/r.width*800,y:(e.clientY-r.top)/r.height*500};lamp.style.left=(e.clientX-r.left)+'px';lamp.style.top=(e.clientY-r.top)+'px';lamp.style.opacity=1});
pl.addEventListener('pointerleave',()=>{pHover=false;lamp.style.opacity=0});
new IntersectionObserver(es=>{pVis=es[0].isIntersecting},{}).observe(pl);
(function pl_loop(t){if(pVis){if(!pHover){pTarget={x:60+Math.sin(t/2400)*40,y:250+Math.sin(t/1700)*170}}
  pPos.x=lerp(pPos.x,pTarget.x,.12);pPos.y=lerp(pPos.y,pTarget.y,.12);ppt.setAttribute('x',pPos.x.toFixed(1));ppt.setAttribute('y',pPos.y.toFixed(1));ppt.setAttribute('z',pHover?55:35)}
  requestAnimationFrame(pl_loop)})(0);
$$('#plaster .chip').forEach(c=>c.addEventListener('click',e=>{e.stopPropagation();$$('#plaster .chip').forEach(x=>x.classList.toggle('on',x===c));const m=pModes[c.dataset.p];pturb.setAttribute('baseFrequency',m[0]);pturb.setAttribute('numOctaves',m[1]);plight.setAttribute('surfaceScale',m[2]);S.whoosh(.7,250,900,.09)}));

/* ---------- 10. Deur in de wand ---------- */
const wx=$('#wallx'),wp=$('#wpanels'),wd=$('#wdoor');const NB=12,D0=5,D1=8;
function buildWall(){const W=wx.clientWidth,H=wx.clientHeight,bw=W/NB;wp.innerHTML='';wd.innerHTML='';const bg=`var(--oakimg)`;
  const piece=(par,l,t,w,h,ox,oy)=>{const d=document.createElement('div');d.className='pn';Object.assign(d.style,{position:'absolute',left:l+'px',top:t+'px',width:w+'px',height:h+'px',background:`${bg} ${-ox}px ${-oy}px/${W}px ${H}px`});par.appendChild(d)};
  for(let i=0;i<NB;i++){const l=i*bw;if(i>=D0&&i<D1){piece(wp,l,0,bw,H*.08,l,0);piece(wp,l,H*.94,bw,H*.06,l,H*.94)}else piece(wp,l,0,bw,H,l,0)}
  const dl=D0*bw,dt=H*.08,dh=H*.86;Object.assign(wd.style,{left:dl+'px',width:(D1-D0)*bw+'px',top:dt+'px',height:dh+'px',bottom:'auto'});
  for(let i=D0;i<D1;i++)piece(wd,(i-D0)*bw,0,bw,dh,i*bw,dt);
  $$('.behind,.light',wx).forEach(e=>Object.assign(e.style,{left:dl+'px',width:(D1-D0)*bw+'px',top:dt+'px',height:dh+'px',bottom:'auto'}))}
buildWall();addEventListener('resize',()=>{buildWall();setCont()});
wx.dataset.cur='Open';
wx.addEventListener('click',()=>{const o=wx.classList.toggle('open');wx.dataset.cur=o?'Sluit':'Open';if(o){S.tock(.15);setTimeout(()=>S.creak(),120)}else{S.creak();setTimeout(()=>S.thunk(.2),1100)}$('#wnote').textContent=o?'De doorgang — onderdeel van het grotere vlak':'Vind de deur — klik op de wand'});

/* ---------- 11. Verstek ---------- */
const mt=$('#miter');$$('.miter .f').forEach(f=>f.style.backgroundImage=`url(${oakH})`);
function setCont(){const f1=$('.miter .f1');mt.style.setProperty('--cont',-f1.offsetWidth+'px')}setCont();
let mtT;mt.addEventListener('mouseenter',()=>{S.whoosh(.6,200,700,.05);clearTimeout(mtT);mtT=setTimeout(()=>{S.tock(.2);$('#miterlbl').textContent='De nerf loopt de hoek om'},900)});
mt.addEventListener('mouseleave',()=>{clearTimeout(mtT);$('#miterlbl').textContent='Beweeg erover — de delen sluiten aan'});
mt.addEventListener('click',()=>{if(isTouch){const o=mt.classList.toggle('on');if(o)setTimeout(()=>S.tock(.2),900)}});
const vp=$('#vphoto'),gl=$('#glass');gl.style.backgroundImage='url(assets/verstek.jpg)';
vp.addEventListener('pointermove',e=>{const r=vp.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;gl.style.left=x+'px';gl.style.top=y+'px';gl.style.backgroundSize=`${r.width*2.6}px ${r.height*2.6}px`;gl.style.backgroundPosition=`${-(x*2.6-110)}px ${-(y*2.6-110)}px`});

/* ---------- 12. Ruimte accordion + meetlint ---------- */
const accEl=$('#acc'),cards=$$('#acc .card'),ms=$('#measure');
cards.forEach(c=>{const on=()=>{if(c.classList.contains('on'))return;cards.forEach(x=>x.classList.toggle('on',x===c));S.whoosh(.45,300,1200,.05)};c.addEventListener(isTouch?'click':'mouseenter',on)});
accEl.addEventListener('pointermove',e=>{const r=accEl.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;
  $('.h',ms).style.top=y+'px';$('.v',ms).style.left=x+'px';const bx=$('#mx'),by=$('#my');
  bx.style.left=(x+8)+'px';bx.style.top='6px';bx.textContent='↔ '+Math.round(x/r.width*4800).toLocaleString('nl-NL')+' mm';
  by.style.top=(y+8)+'px';by.style.left='6px';by.textContent='↕ '+Math.round((1-y/r.height)*2700).toLocaleString('nl-NL')+' mm'});

/* ---------- 13. Van vlak naar volume ---------- */
const vol=$('#vol'),vs=26,ox=350,oy=330;
const P=(x,y,z)=>[ox+(x-y)*.866*vs,oy+(x+y)*.5*vs-z*vs];
const pts=a=>a.map(p=>P(...p).map(n=>n.toFixed(1)).join(',')).join(' ');
let lastPhase=-1;
function renderVol(p){const f=clamp(p/.3,0,1),w=clamp((p-.3)/.33,0,1),e=clamp((p-.66)/.24,0,1),dm=clamp((p-.88)/.1,0,1);const X=10,Y=8,HW=6.2*ease(w);
  let h='';
  // floor outline draws
  const fl=[[0,0,0],[X,0,0],[X,Y,0],[0,Y,0]];const per=2*(X+Y),dl=f*per;
  h+=`<polygon points="${pts(fl)}" fill="rgba(185,138,85,${.85*ease(clamp((f-.5)*2,0,1))})" stroke="none"/>`;
  for(let i=1;i<Y*2;i++){const k=i/2;if(k/Y<ease(clamp((f-.4)/.6,0,1)))h+=`<line x1="${P(0,k,0)[0]}" y1="${P(0,k,0)[1]}" x2="${P(X,k,0)[0]}" y2="${P(X,k,0)[1]}" stroke="rgba(90,58,28,.45)" stroke-width="1"/>`}
  const outline=`M${P(0,0,0)} L${P(X,0,0)} L${P(X,Y,0)} L${P(0,Y,0)} Z`;
  h+=`<path d="${outline}" fill="none" stroke="#e6c98f" stroke-width="1.5" stroke-dasharray="${per*vs*1.2}" stroke-dashoffset="${(1-f)*per*vs*1.2}"/>`;
  if(w>0){ // back walls rising
    h+=`<polygon points="${pts([[0,0,0],[X,0,0],[X,0,HW],[0,0,HW]])}" fill="#e9dfcc" stroke="#c9a46a" stroke-width="1"/>`;
    h+=`<polygon points="${pts([[0,0,0],[0,Y,0],[0,Y,HW],[0,0,HW]])}" fill="#d4c7b0" stroke="#c9a46a" stroke-width="1"/>`;
    if(HW>4.5)h+=`<polygon points="${pts([[0,2.2,1.4],[0,5.6,1.4],[0,5.6,Math.min(HW-.6,5.2)],[0,2.2,Math.min(HW-.6,5.2)]])}" fill="#9fb7c4" opacity="${clamp((HW-4.5)/1.5,0,1)}" stroke="#8a6a3a"/>`;
    // oak panel strip on back wall
    if(HW>2)for(let i=0;i<6;i++){const x0=5.8+i*.7;h+=`<polygon points="${pts([[x0,0,0],[x0+.7,0,0],[x0+.7,0,HW],[x0,0,HW]])}" fill="${i%2?'#b98a55':'#a9773f'}" opacity="${clamp((HW-2)/2,0,1)}" stroke="rgba(60,35,15,.4)"/>`}
  }
  if(e>0){ // element drops
    const z=(1-easeOB(e))*9,x1=2.6,x2=6.4,y1=2.6,y2=4.4,hh=2.8;
    h+=`<ellipse cx="${P((x1+x2)/2,(y1+y2)/2,0)[0]}" cy="${P((x1+x2)/2,(y1+y2)/2,0)[1]}" rx="${80*e}" ry="${30*e}" fill="rgba(0,0,0,${.35*e})"/>`;
    h+=`<polygon points="${pts([[x1,y2,z],[x2,y2,z],[x2,y2,z+hh],[x1,y2,z+hh]])}" fill="#a06d3a" stroke="#5a3a1c" stroke-width=".8"/>`;
    h+=`<polygon points="${pts([[x2,y1,z],[x2,y2,z],[x2,y2,z+hh],[x2,y1,z+hh]])}" fill="#7d5229" stroke="#5a3a1c" stroke-width=".8"/>`;
    h+=`<polygon points="${pts([[x1,y1,z+hh],[x2,y1,z+hh],[x2,y2,z+hh],[x1,y2,z+hh]])}" fill="#c99a62" stroke="#5a3a1c" stroke-width=".8"/>`;
    for(let i=1;i<4;i++){const xx=x1+i*(x2-x1)/4;h+=`<line x1="${P(xx,y2,z+.2)[0]}" y1="${P(xx,y2,z+.2)[1]}" x2="${P(xx,y2,z+hh-.2)[0]}" y2="${P(xx,y2,z+hh-.2)[1]}" stroke="rgba(50,30,12,.5)"/>`}
  }
  if(dm>0){const a=P(0,Y+1,0),b=P(X,Y+1,0),c=P(X+1,0,0),d=P(X+1,Y,0),g=P(X+1,0,HW);
    h+=`<g opacity="${dm}" stroke="#e6c98f" fill="#e6c98f" font-family="Jost" font-size="11" letter-spacing="2"><line x1="${a}" x2="${b}" style="" /><path d="M${a} L${b} M${c} L${d} M${c} L${g}" stroke-width="1" fill="none"/>
      <text x="${(a[0]+b[0])/2-40}" y="${(a[1]+b[1])/2+24}" stroke="none">VLOER</text><text x="${(c[0]+d[0])/2+14}" y="${(c[1]+d[1])/2+18}" stroke="none">WAND</text><text x="${g[0]+10}" y="${(c[1]+g[1])/2}" stroke="none">HOOGTE</text></g>`}
  vol.innerHTML=h.replace(/x1="([\d.]+),([\d.]+)" x2="([\d.]+),([\d.]+)"/g,'x1="$1" y1="$2" x2="$3" y2="$4"');
  const ph=$$('#phase div');[f,w,e].forEach((v,i)=>{ph[i].style.setProperty('--p',v);ph[i].classList.toggle('on',v>0&&v<=1&&(i===2?v>0:([f,w,e][i+1]===0||v===1)))});
  $('#sketch').classList.toggle('in',p>.9);
  const phase=e>=1?3:e>0?2:w>0?1:f>0?0:-1;if(phase>lastPhase){if(phase===1)S.whoosh(.6,200,900,.06);if(phase===2)S.whoosh(.5,800,300,.05);if(phase===3)S.thunk(.3);}lastPhase=phase;
}
function easeOB(t){const n=7.5625,d=2.75;if(t<1/d)return n*t*t;if(t<2/d)return n*(t-=1.5/d)*t+.75;if(t<2.5/d)return n*(t-=2.25/d)*t+.9375;return n*(t-=2.625/d)*t+.984375}
function volScroll(){const s=$('#volume'),r=s.getBoundingClientRect();const p=clamp(-r.top/(r.height-innerHeight),0,1);renderVol(p)}

/* ---------- 14. Aanvraagformulier ---------- */
const fsteps=$$('.fstep'),prog=$$('.prog span'),fnext=$('#fnext'),fback=$('#fback');let fs=0;
const opts1=svcs, opts2=['Via de voordeur','Via tuin / achterom','Via de trap','Houten vloer beschermen','Natuursteen beschermen','Bestaande kozijnen'];
[[opts1,'#fchips'],[opts2,'#fchips2']].forEach(([o,s])=>$(s).innerHTML=o.map(t=>`<button type="button" class="chip">${t}</button>`).join(''));
$$('#form .chips .chip').forEach(c=>c.addEventListener('click',()=>{c.classList.toggle('on');S.tick(.05);S.tock(.08)}));
const hp=$$('#house .ln');hp.forEach(p=>{const L=p.getTotalLength();p.style.strokeDasharray=L;p.style.strokeDashoffset=L;const gh=p.cloneNode();gh.style.cssText='stroke-dashoffset:0;opacity:.12;transition:none';p.parentNode.insertBefore(gh,p)});
function goStep(n){fs=clamp(n,0,3);fsteps.forEach((s,i)=>{s.classList.toggle('on',i===fs);s.classList.toggle('past',i<fs)});prog.forEach((p,i)=>p.classList.toggle('on',i<=fs));
  hp.forEach((p,i)=>p.style.strokeDashoffset=i<fs?0:p.getTotalLength());fback.style.visibility=fs>0&&fs<3?'visible':'hidden';
  fnext.innerHTML=fs===2?'Leg op tafel ✓':fs===3?'Opnieuw':'Volgende →';
  if(fs===3){S.chime();const sel=s=>$$(s+' .chip.on').map(c=>c.textContent).join(', ')||'—';
    $('#summary').innerHTML=`<div><b>Werk</b>${sel('#fchips')}</div><div><b>Toelichting</b>${($('#f1').value||'—').replace(/</g,'&lt;')}</div><div><b>Toegang</b>${sel('#fchips2')}</div><div><b>Start / gebruik</b>${$('#f3').value||'—'} / ${$('#f4').value||'—'}</div><div><b>Bestanden</b>${$$('#thumbs img').length} lokaal</div>`}else S.whoosh(.45,400,1600,.06)}
fnext.addEventListener('click',()=>{if(fs===3){$('#form').reset();$$('#form .chip.on').forEach(c=>c.classList.remove('on'));$('#thumbs').innerHTML='';goStep(0)}else goStep(fs+1)});
fback.addEventListener('click',()=>goStep(fs-1));goStep(0);
const drop=$('#drop'),file=$('#file');drop.addEventListener('click',()=>file.click());
['dragenter','dragover'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.add('over')}));
['dragleave','drop'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.remove('over')}));
const addFiles=fl=>[...fl].filter(f=>f.type.startsWith('image/')).slice(0,8).forEach((f,i)=>{const im=new Image();im.src=URL.createObjectURL(f);$('#thumbs').appendChild(im);S.tile(i*.08)});
drop.addEventListener('drop',e=>addFiles(e.dataTransfer.files));file.addEventListener('change',()=>addFiles(file.files));

/* ---------- 15. Waterpas ---------- */
const bub=$('#bubble');let tilt=0;
addEventListener('pointermove',e=>{tilt=(e.clientX/innerWidth-.5)*2;bub.style.transform=`translateX(${tilt*70}px)`});
addEventListener('deviceorientation',e=>{if(e.gamma!=null)bub.style.transform=`translateX(${clamp(e.gamma/30,-1,1)*70}px)`});

onScroll();
})();
