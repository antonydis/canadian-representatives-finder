import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {obviousCivicIssue,officialContactFor,resolveAgencyContact,policyInput} from '../src-worker/civic-ai.js';

const wizardSource=readFileSync('web/static/js/scar-wizard.js','utf8');
const appSource=readFileSync('web/static/js/app.js','utf8');
const html=readFileSync('web/templates/index.html','utf8');

class Node{
 constructor(tag){this.tagName=tag.toLowerCase();this.children=[];this.attrs={};this.events={};this.className='';this.value='';this.textContent='';this.style={};this.parent=null;this.isConnected=true;}
 get classList(){
  return {
   contains:k=>this.className.split(/\s+/).includes(k),
   add:(...k)=>{this.className=[...new Set([...this.className.split(/\s+/).filter(Boolean),...k])].join(' ');},
   remove:(...k)=>{this.className=this.className.split(/\s+/).filter(x=>x&&!k.includes(x)).join(' ');},
   toggle:(k,force)=>{const has=this.className.split(/\s+/).includes(k);const want=force===undefined?!has:force;this.classList[want?'add':'remove'](k);return want;}
  };
 }
 append(...items){for(const x of items){if(!x)continue;x.parent=this;this.children.push(x);} }
 insertBefore(node,before){const i=this.children.indexOf(before);node.parent=this;if(i<0)this.children.push(node);else this.children.splice(i,0,node);}
 setAttribute(k,v){this.attrs[k]=String(v);}
 addEventListener(k,fn){(this.events[k]??=[]).push(fn);}
 dispatchEvent(e){for(const fn of this.events[e.type]||[])fn(e);return true;}
 click(){this.dispatchEvent({type:'click'});}
 focus(){this.focused=true;}
 scrollIntoView(){}
}
const walk=(root,fn)=>{if(fn(root))return root;for(const child of root.children||[]){const hit=walk(child,fn);if(hit)return hit;}return null;};
function setup({mockFailure=false, priorIssue='', language='es'}={}){
 let fetchCalls=0;
 const document={createElement:tag=>new Node(tag)};
 const window={};
 const fetch=async()=>{fetchCalls++;return {ok:!mockFailure,json:async()=>mockFailure?{success:false,error:'unavailable'}:{success:true,subject:'Missed garbage pickup',body:'Dear Representative,\n\nMy garbage has not been collected. Could you direct me to municipal services?\n\nSincerely,\nCitizen Example'}};};
 runInNewContext(wizardSource,{document,window,fetch,Event:class Event{constructor(type){this.type=type;}}});
 const box=new Node('section'),editor=new Node('form'),subjectInput=new Node('input'),messageInput=new Node('textarea');
 box.append(editor);
 const rep={name:'Example Representative',elected_office:'MP',email:'example@parl.gc.ca'};
 let updates=0;
 window.InfoCivicScar.mount({box,editor,rep,context:'main',postal:'H7R 4X5',template:{subject:'Request for assistance',body:'Template'},
  subjectInput,messageInput,updateLink:()=>updates++,uiLanguage:language,priorIssue});
 const wizard=box.children[0];
 return {wizard,editor,subjectInput,messageInput,get fetchCalls(){return fetchCalls;},get updates(){return updates;},get:(tag,matching)=>walk(wizard,n=>n.tagName===tag&&matching(n))};
}
const afterNetwork=()=>new Promise(resolve=>setImmediate(resolve));

test('iPhone flow: a citizen can type a real issue and generate editable email',async()=>{
 const s=setup();const input=s.get('input',x=>x.id==='main-sender-name');
 assert.ok(input,'full name field');input.value='Example Citizen';
 s.get('button',x=>x.textContent==='Continuar').click();
 const reason=s.get('textarea',x=>x.id==='main-reason');
 assert.ok(reason,'reason field');assert.ok(!reason.parent.parent.classList.contains('hidden'));
 reason.value='Por la basura que no la recogen hace rato y se supone que pasa cada semana';
 reason.dispatchEvent({type:'input'});
 assert.equal(reason.value.includes('basura'),true);
 s.get('button',x=>x.textContent==='Generar correo').click();await afterNetwork();
 assert.equal(s.fetchCalls,1);assert.equal(s.editor.classList.contains('hidden'),false);
 assert.equal(s.subjectInput.value,'Missed garbage pickup');
 assert.match(s.messageInput.value,/Dear Representative/);
 assert.ok(s.updates>=1);
});
test('iPhone: blank name is stopped; back button keeps typed reason',()=>{
 const s=setup();const next=s.get('button',x=>x.textContent==='Continuar');
 next.click();assert.ok(s.get('p',x=>x.textContent.includes('Introduce tu nombre')));
 const input=s.get('input',x=>x.id==='main-sender-name');input.value='Citizen Example';next.click();
 const reason=s.get('textarea',x=>x.id==='main-reason');reason.value='Problems with weekly garbage pickup';
 s.get('button',x=>x.textContent==='Volver').click();next.click();
 assert.equal(reason.value,'Problems with weekly garbage pickup');
});
test('iPhone: failure leaves citizen text and a ready-made alternative',async()=>{
 const s=setup({mockFailure:true});s.get('input',x=>x.id==='main-sender-name').value='Citizen Example';
 s.get('button',x=>x.textContent==='Continuar').click();
 const reason=s.get('textarea',x=>x.id==='main-reason');reason.value='My municipal garbage has not been collected';
 s.get('button',x=>x.textContent==='Generar correo').click();await afterNetwork();
 assert.equal(reason.value,'My municipal garbage has not been collected');
 s.get('button',x=>x.textContent==='Usar una plantilla sin responder').click();
 assert.equal(s.editor.classList.contains('hidden'),false);
 assert.equal(s.subjectInput.value,'Request for assistance');
});
test('Municipal use case: missed garbage collection in Laval is actionable',()=>{
 const c=obviousCivicIssue('Por la basura que no la recogen hace rato y se supone que pasa cada semana','es','H7R 4X5','Laval');
 assert.equal(c.jurisdiction,'municipal');assert.equal(c.requires_clarification,false);
 assert.equal(c.contact.phone,'311');
});
test('Federal use case: immigration follows an official service, not a municipal hotline',()=>{
 const c=resolveAgencyContact('federal','ircc','H7R 4X5','Laval');
 assert.ok(c.agency?.name.includes('IRCC'));assert.equal(c.contact?.phone,'1-888-242-2100');
});
test('Provincial use case: Québec housing help and out-of-province limits',()=>{
 const qc=resolveAgencyContact('provincial','qc_housing','H7R 4X5','Laval');
 assert.ok(qc.agency?.name.includes('logement'));
 assert.equal(resolveAgencyContact('provincial','qc_housing','M5V 2T6','Toronto').agency,null);
});
test('Unknown jurisdiction does not manufacture a number or block a user',()=>{
 assert.equal(officialContactFor('municipal',null,'H7R 4X5','Toronto'),null);
 assert.equal(policyInput('I need to contact an office about a complicated situation').ok,true);
 assert.match(appSource,/level===rep\.level\)return/);
 assert.match(appSource,/!options\.length&&!classification\.contact\?\.phone/);
});
test('Input lengths and mobile presentation are consistent',()=>{
 assert.match(html,/maxlength="500"/);
 assert.match(appSource,/charCounter\.textContent = `\$\{len\} \/ 500`/);
 assert.match(wizardSource,/makeField\(stage2,'textarea','reason',7,800\)/);
 assert.doesNotMatch(wizardSource,/showStage\(2\);reason\.input\.focus/);
});
