import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {validateDraftRequest,validateDraftResponse} from '../src-worker/scar-email.js';
const browser=readFileSync('web/static/js/scar-wizard.js','utf8');
const app=readFileSync('web/static/js/app.js','utf8');
const html=readFileSync('web/templates/index.html','utf8');
const worker=readFileSync('src-worker/index.js','utf8');

test('Small intake requires only name and a reason, with optional address',()=>{
 const base={representative_name:'Example Representative',representative_office:'MP',sender_name:'Sample Citizen',reason:'I would like to ask about a delayed federal application.',language:'en'};
 assert.equal(validateDraftRequest(base).ok,true);
 assert.equal(validateDraftRequest({...base,sender_address:'22 Example Street, Laval'}).ok,true);
 assert.equal(validateDraftRequest({...base,language:'es'}).ok,false);
 assert.equal(validateDraftRequest({...base,sender_name:''}).code,'missing_details');
 assert.equal(validateDraftRequest({...base,reason:''}).code,'missing_details');
 assert.equal(validateDraftRequest({...base,reason:'x'.repeat(801)}).ok,false);
 assert.equal(validateDraftRequest({...base,sender_name:'bad\nname'}).ok,false);
});
test('Generated draft stays validated before being shown',()=>{
 assert.equal(validateDraftResponse({subject:'',body:'a'.repeat(150)},'en'),null);
 assert.equal(validateDraftResponse({subject:'Request for assistance',body:'a'.repeat(150)},'fr').language,'fr');
 assert.equal(validateDraftResponse({subject:'Request for assistance',body:'My SIN 123-456-789 is private '.repeat(8)},'en'),null);
});
test('Six complete translations for two-step guided intake',()=>{
 const sandbox={window:{}};
 runInNewContext(browser,sandbox);
 for(const lang of ['en','fr','es','pt','zh','tl']){
  const messages=sandbox.window.InfoCivicScar.labels[lang];
  assert.equal(messages.length,26,lang);
  assert.ok(messages.every(s=>typeof s==='string'&&s.trim().length>0),lang);
 }
});
test('Draft starts in English, French conversion is optional and follows the first draft',()=>{
 assert.match(browser,/generateDraft\('en'\)/);
 assert.match(browser,/generatedLanguage==='en'\?'fr':'en'/);
 assert.match(browser,/switchLanguage\.classList\.remove\('hidden'\)/);
 assert.match(browser,/switchLanguage\.addEventListener/);
 assert.doesNotMatch(browser,/option\.selected=value===suggested/);
});
test('Two-stage form and direct template stay available',()=>{
 assert.match(browser,/showStage\(2\)/);
 assert.match(browser,/showStage\(1\)/);
 assert.match(browser,/skip\.addEventListener\('click'/);
 assert.match(browser,/editor\.classList\.add\('hidden'\)/);
 assert.match(browser,/editor\.classList\.remove\('hidden'\)/);
 assert.match(browser,/sender_address/);
 assert.match(browser,/sender_name/);
 assert.match(browser,/reason/);
 assert.doesNotMatch(browser,/immigration.status/i);
});
test('The AI service is protected and sends no email',()=>{
 assert.match(worker,/if\(path==="\/api\/generate-email"\)return emailDraft\(request,env\)/);
 assert.match(worker,/EMAIL_USER_LIMIT/);
 assert.match(worker,/EMAIL_GLOBAL_LIMIT/);
 assert.match(browser,/fetch\('\/api\/generate-email'/);
 assert.doesNotMatch(browser,/sendEmail\(/);
 assert.ok(html.indexOf('/static/js/scar-wizard.js')<html.indexOf('/static/js/app.js'));
 assert.match(app,/window.InfoCivicScar\?\.mount/);
});
