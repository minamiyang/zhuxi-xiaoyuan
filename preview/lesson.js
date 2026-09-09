export const paragraphs = [
'乡下人家总爱在屋前搭一瓜架，或种南瓜，或种丝瓜，让那些瓜藤攀上棚架，爬上屋檐。当花儿落了的时候，藤上便结出了青的、红的瓜，它们一个个挂在房前，衬着那长长的藤，绿绿的叶。青、红的瓜，碧绿的藤和叶，构成了一道别有风趣的装饰，比那高楼门前蹲着一对石狮子或是竖着两根大旗杆，可爱多了。',
'有些人家，还在门前的场地上种几株花，芍药，凤仙，鸡冠花，大丽菊，它们依着时令，顺序开放，朴素中带着几分华丽，显出一派独特的农家风光。还有些人家，在屋后种几十枝竹，绿的叶，青的竿，投下一片浓浓的绿荫。',
'几场春雨过后，到那里走走，你常常会看见许多鲜嫩的笋，成群地从土里探出头来。',
'鸡，乡下人家照例总要养几只的。从他们的房前屋后走过，你肯定会瞧见一只母鸡，率领一群小鸡，在竹林中觅食；或是瞧见耸着尾巴的雄鸡，在场地上大踏步地走来走去。',
'他们的屋后倘若有一条小河，那么在石桥旁边，在绿树荫下，你会见到一群鸭子游戏水中，不时地把头扎到水下去觅食。即使附近的石头上有妇女在捣衣，它们也从不吃惊。',
'若是在夏天的傍晚出去散步，你常常会瞧见乡下人家吃晚饭的情景。他们把桌椅饭菜搬到门前，天高地阔地吃起来。天边的红霞，向晚的微风，头上飞过的归巢的鸟儿，都是他们的好友。它们和乡下人家一起，绘成了一幅自然、和谐的田园风景画。',
'秋天到了，纺织娘寄住在他们屋前的瓜架上。月明人静的夜里，它们便唱起歌来：“织，织，织，织啊！织，织，织，织啊！” 那歌声真好听，赛过催眠曲，让那些辛苦一天的人们，甜甜蜜蜜地进入梦乡。',
'乡下人家，不论什么时候，不论什么季节，都有一道独特、迷人的风景。'
];
const shot=(p,t,zoom)=>({p,t,zoom});
const garden=shot([-10,6.5,10],[-3.5,1.85,1.4],2.3);
const shots=[garden,shot([-3,4.8,10],[.3,.8,3.55],2.9),shot([-10,4.2,5],[-5.15,.85,.7],3.2),shot([-4.5,4.6,8],[-1.15,.9,2.8],2.75),shot([8.5,6.8,8],[3.35,1,.2],2.35),shot([-.4,4.7,8],[.4,1.25,.95],2.45),shot([-10,7,10],[-2.8,2,1],2.1),shot([-13.8,12.4,15],[0,1.95,0],1)];
const bamboo=shot([-10,7,-8],[-2,3,-3.9],2.05);
const titles=['瓜藤攀檐','花开竹影','春笋探头','鸡群觅食','溪边戏水','门前晚饭','月夜入梦','迷人的风景'];
const hours=[[8,8.7],[8.7,9.5],[9.5,10.5],[10.5,12],[12,15],[16.5,18.4],[20.3,21.5],[21.5,32]];
const chunks=s=>s.match(/[^。！？；]+[。！？；]?[”」]?/gu)||[s];
const length=s=>[...s.replace(/[\p{P}\p{Z}\s]/gu,'')].length;
export const lessons=paragraphs.map((text,i)=>{let at=3;const sentences=chunks(text).map(text=>{const duration=length(text)/3.1+1.25;const s={text,start:at,duration};at+=duration;return s;});return {text,title:titles[i],sentences,duration:at+2,shot:shots[i],hours:hours[i]};});
export function createLesson({onChange,onToggle}){
 let index=0,elapsed=0,playing=false,speed=1,ended=false;
 const $=id=>document.getElementById(id),text=$('lesson-text');let lastIndex=-1,lastSentence=-2;
 function sample(){const l=lessons[index],progress=Math.min(1,elapsed/l.duration),sentence=Math.max(0,l.sentences.findLastIndex(s=>elapsed>=s.start));let selected=l.shot;
 if(index===1&&elapsed>=l.sentences[1].start)selected=bamboo;
 return {index,elapsed,playing,speed,ended,progress,sentence,title:l.title,shot:selected,hour:l.hours[0]+(l.hours[1]-l.hours[0])*progress,duration:l.duration};}
 function draw(){const s=sample(),l=lessons[index];if(lastIndex!==index){text.replaceChildren(...l.sentences.map(c=>{const span=document.createElement('span');span.textContent=c.text;return span;}));$('lesson-title').textContent=l.title;$('lesson-count').textContent=String(index+1).padStart(2,'0')+' / 08';text.scrollTop=0;lastIndex=index;lastSentence=-2;document.querySelectorAll('[data-paragraph]').forEach((b,i)=>{b.classList.toggle('active',i===index);b.setAttribute('aria-current',i===index?'step':'false');});}
 if(lastSentence!==s.sentence){[...text.children].forEach((span,i)=>span.classList.toggle('current',i===s.sentence));const active=text.children[s.sentence];if(active){const delta=active.getBoundingClientRect().top-text.getBoundingClientRect().top;if(delta<0||delta>text.clientHeight*.52)text.scrollTo({top:text.scrollTop+delta-24,behavior:'smooth'});}lastSentence=s.sentence;}
 $('lesson-progress').value=s.progress;$('lesson-pause').textContent=ended?'再读一遍':playing?'暂停朗读':'继续朗读';$('lesson-pause').setAttribute('aria-pressed',String(!playing));$('lesson-prev').disabled=index===0;$('lesson-next').disabled=index===7;$('reading-status').textContent=ended?'全文读完了':playing?'配乐朗读 · 跟随文字，慢慢读':'已暂停 · 按自己的节奏读';}
 function notify(){draw();onChange?.(sample());}
 function jump(i){index=Math.max(0,Math.min(7,i));elapsed=0;ended=false;notify();}
 function toggle(value=!playing){if(ended&&value){index=0;elapsed=0;ended=false;}playing=value;notify();onToggle?.(playing);}
 for(let i=0;i<8;i++){const b=document.createElement('button');b.dataset.paragraph=i;b.textContent=String(i+1);b.setAttribute('aria-label',`第${i+1}段 · ${titles[i]}`);b.onclick=()=>jump(i);$('paragraphs').append(b);}
 $('lesson-prev').onclick=()=>jump(index-1);$('lesson-next').onclick=()=>jump(index+1);$('lesson-pause').onclick=()=>toggle();$('lesson-speed').onchange=e=>{speed=Number(e.target.value);notify();};
 return {sample,jump,toggle,draw,start(){if(ended){index=0;elapsed=0;ended=false;}playing=true;notify();},tick(dt){if(playing){elapsed+=dt*speed;while(elapsed>=lessons[index].duration){if(index===7){elapsed=lessons[index].duration;playing=false;ended=true;onToggle?.(false);break;}elapsed-=lessons[index].duration;index++;}}draw();return sample();},seek(i,seconds=0){index=Math.max(0,Math.min(7,i));elapsed=Math.max(0,Math.min(lessons[index].duration,seconds));ended=false;notify();},get state(){return sample();},lessons};
}
