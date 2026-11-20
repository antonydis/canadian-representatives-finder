import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {validateDraftRequest,validateDraftResponse} from '../src-worker/scar-email.js';
const browser=readFileSync('web/static/js/scar-wizard.js','utf8');
const app=readFileSync('web/static/js/app.js','utf8');
const html=readFileSync('web/templates/index.html','utf8');
const worker=readFileSync('src-worker/index.js','utf8');

test('Small intake requires only name and reason, and reuses postal code',()=>{
 const base={representative_name:'Example Representative',representative_office:'MP',sender_name:'Sample Citizen',reason:'I would like to ask about a delayed federal application.',language:'en'};
 assert.equal(validateDraftRequest(base).ok,true);
 assert.equal(validateDraftRequest({...base,postal_code:'H7R 4X5'}).ok,true);
 assert.equal(validateDraftRequest({...base,postal_code:'BAD 123'}).ok,false);
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
 assert.doesNotMatch(browser,/sender_address/);
 assert.doesNotMatch(browser,/sender-address/);
 assert.match(browser,/postal_code:postalCode/);
 assert.match(browser,/scar-postal-info/);
 assert.match(browser,/sender_name/);
 assert.doesNotMatch(browser,/passport_status/i);
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

test('Generated draft uses concise subject, greeting and citizen signature',()=>{
 const raw={subject:'Request for assistance about missed waste collection causing considerable problems throughout the neighbourhood and streets',body:'The city has not collected the garbage for two weeks. Could your office please tell me what steps can be taken to fix the schedule?'};
 const result=validateDraftResponse(raw,'en','Alice Example','Sample Citizen','H7R 4X5');
 assert.ok(result.subject.length<=72);
 assert.match(result.body,/^Dear Alice Example,/);
 assert.match(result.body,/Sincerely,/);
 assert.match(result.body,/Sample Citizen/);
 assert.match(result.body,/H7R 4X5/);
 const french=validateDraftResponse({...raw,subject:'Demande d’aide concernant la collecte des déchets'},'fr','Alice Example','Citoyen Exemple','H7R 4X5');
 assert.match(french.body,/^Bonjour Alice Example,/);
 assert.match(french.body,/Cordialement,/);
});
test('Six language strings omit the provider name from visible intake',()=>{
 assert.doesNotMatch(browser,/OpenAI/);
});

test('All six website languages explicitly request a full name',()=>{
 const sandbox={window:{}};
 runInNewContext(browser,sandbox);
 const expected={en:'full name',fr:'nom complet',es:'nombre completo',pt:'nome completo',zh:'全名',tl:'Buong pangalan'};
 for(const [language,label] of Object.entries(expected)){
   assert.match(sandbox.window.InfoCivicScar.labels[language][4],new RegExp(label,'i'),language);
 }
 assert.match(browser,/autocomplete='name'/);
 assert.match(browser,/lastData=\{sender_name:name\.input\.value\.trim\(\)/);
});
