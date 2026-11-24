import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {validateDraftRequest} from '../src-worker/scar-email.js';
import {obviousCivicIssue} from '../src-worker/civic-ai.js';

const src=readFileSync('web/static/js/scar-wizard.js','utf8');
class Field {
 constructor(tag){
  this.tagName=tag;this.children=[];this.listeners={};this.value='';this.textContent='';
  this.style={};this.maxLength=9999;this.scrollHeight=400;this.isConnected=true;
  this.classes=new Set();
  this.classList={add:(...xs)=>xs.forEach(x=>this.classes.add(x)),
    remove:(...xs)=>xs.forEach(x=>this.classes.delete(x)),
    contains:x=>this.classes.has(x),
    toggle:(x,active)=>active?this.classes.add(x):this.classes.delete(x)};
 }
 append(...nodes){this.children.push(...nodes);}
 insertBefore(value,ref){const i=this.children.indexOf(ref);this.children.splice(i<0?this.children.length:i,0,value);}
 setAttribute(){}
 addEventListener(event,fn){(this.listeners[event]??=[]).push(fn);}
 dispatchEvent(event){for(const fn of this.listeners[event.type]||[])fn(event);return true;}
 click(){this.dispatchEvent({type:'click'});}
 focus(){}
 scrollIntoView(){}
}
const walk=(root,tag)=>[...(root.tagName===tag?[root]:[]),...root.children.flatMap(item=>walk(item,tag))];
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function makeWizard({language='es',postal='H7R 4X5',office='MP',response='ok'}={}){
 const calls=[],doc={createElement:tag=>new Field(tag)};
 const fetch=async(url,options)=>{
  const data=JSON.parse(options.body);calls.push({url,data});
  if(response==='error')return {ok:false,json:async()=>({success:false,error:'email_generation_unavailable'})};
  return {ok:true,json:async()=>({success:true,subject:'Missed garbage pickup',
   body:'Dear Elected Representative,\n\nThe trash has not been collected as scheduled. Please advise the correct office to contact.\n\nSincerely,\nSample Citizen'})};
 };
 const window={};
 runInNewContext(src,{document:doc,window,fetch,Event:class{constructor(type){this.type=type}}});
 const box=new Field('section'),editor=new Field('form');box.append(editor);
 const subjectInput=new Field('input'),messageInput=new Field('textarea');
 let updates=0;
 window.InfoCivicScar.mount({box,editor,rep:{name:'Sample MP',elected_office:office,email:'mp@example.ca'},
  postal,context:'main',uiLanguage:language,template:{to:'mp@example.ca',subject:'Ready-made subject',body:'Ready-made body'},
  subjectInput,messageInput,updateLink:()=>updates++});
 return {wizard:box.children[0],editor,subjectInput,messageInput,calls,updates:()=>updates};
}
test('iPhone case: Spanish reason reaches personalized email without losing the postal code',async()=>{
 const t=makeWizard();
 const input=walk(t.wizard,'input')[0],reason=walk(t.wizard,'textarea')[0];
 const buttons=walk(t.wizard,'button');
 input.value='María García';buttons[0].click();
 reason.value='Por la basura que no la recogen desde hace dos semanas, aunque debería pasar cada semana';
 buttons.find(b=>b.textContent==='Generar correo').click();
 await settle();
 assert.equal(t.calls.length,1);
 assert.equal(t.calls[0].data.reason,reason.value);
 assert.equal(t.calls[0].data.sender_name,'María García');
 assert.equal(t.calls[0].data.postal_code,'H7R 4X5');
 assert.equal(t.calls[0].data.language,'en');
 assert.equal(t.subjectInput.value,'Missed garbage pickup');
 assert.equal(t.editor.classList.contains('hidden'),false);
});
test('Form requires a name and a reason, without deleting either answer',()=>{
 const t=makeWizard();const input=walk(t.wizard,'input')[0],reason=walk(t.wizard,'textarea')[0];
 const buttons=walk(t.wizard,'button');buttons[0].click();
 assert.match(t.wizard.children.find(x=>x.className==='scar-status').textContent,/nombre/);
 input.value='Alicia Ruiz';buttons[0].click();
 const generate=buttons.find(x=>x.textContent==='Generar correo');generate.click();
 assert.match(t.wizard.children.find(x=>x.className==='scar-status').textContent,/Cuéntanos/);
 assert.equal(t.calls.length,0);reason.value='Ayuda con mi solicitud';assert.equal(reason.value,'Ayuda con mi solicitud');
});
test('Failure offers a ready-made, editable template instead of blocking the citizen',async()=>{
 const t=makeWizard({response:'error'});const input=walk(t.wizard,'input')[0],reason=walk(t.wizard,'textarea')[0];
 const buttons=walk(t.wizard,'button');input.value='Sample Citizen';buttons[0].click();
 reason.value='La basura nunca fue recogida';buttons.find(x=>x.textContent==='Generar correo').click();
 await settle();
 const fallback=buttons.find(x=>x.textContent.includes('plantilla'));
 assert.equal(fallback.classList.contains('hidden'),false);
 fallback.click();assert.equal(t.subjectInput.value,'Ready-made subject');
 assert.equal(t.messageInput.value,'Ready-made body');
 assert.equal(t.editor.classList.contains('hidden'),false);
});
test('Representative with no office label can still generate a civic email',async()=>{
 const t=makeWizard({office:''});const input=walk(t.wizard,'input')[0],reason=walk(t.wizard,'textarea')[0];
 const buttons=walk(t.wizard,'button');input.value='Sample Citizen';buttons[0].click();
 reason.value='I need help with a federal program';buttons.find(x=>x.textContent==='Generar correo').click();
 await settle();
 assert.equal(t.calls[0].data.representative_office,'Elected representative');
 assert.equal(validateDraftRequest({...t.calls[0].data,language:'en'}).ok,true);
});
test('Same level should not cause an interruption; missed waste collection is municipal',()=>{
 const input='Por la basura que no la recogen hace rato y se supone que pasa cada semana';
 const route=obviousCivicIssue(input,'es','H7R 4X5','Laval');
 assert.equal(route.requires_clarification,false);
 assert.equal(route.jurisdiction,'municipal');
 assert.equal(route.contact?.phone,'311');
 assert.equal(route.jurisdiction==='federal',false);
});
