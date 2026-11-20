import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateDraftRequest,validateDraftResponse,determineSuggestedOfficialLanguage} from '../src-worker/scar-email.js';
const browser=readFileSync('web/static/js/scar-wizard.js','utf8');
const app=readFileSync('web/static/js/app.js','utf8');
const html=readFileSync('web/templates/index.html','utf8');
const worker=readFileSync('src-worker/index.js','utf8');

test('Only explicit complete civic draft requests may call provider',()=>{
 const base={representative_name:'Example Representative',representative_office:'MP',language:'fr',situation:'La route est bloquée depuis lundi',result:'Je demande une inspection'};
 assert.equal(validateDraftRequest(base).ok,true);
 assert.equal(validateDraftRequest({...base,language:'es'}).ok,false);
 assert.equal(validateDraftRequest({...base,situation:'x'.repeat(551)}).ok,false);
 assert.equal(validateDraftRequest({...base,representative_name:''}).ok,false);
 assert.equal(validateDraftRequest({...base,representative_name:'bad\nname'}).ok,false);
 assert.equal(validateDraftRequest({language:'en',representative_name:'MP',representative_office:'MP'}).ok,false);
});
test('A generated draft must pass server-side validation',()=>{
 assert.equal(validateDraftResponse({subject:'',body:'a'.repeat(150)},'en'),null);
 assert.equal(validateDraftResponse({subject:'A civic request',body:'a'.repeat(150)},'fr').language,'fr');
 assert.equal(validateDraftResponse({subject:'A civic request',body:'My SIN 123-456-789 is private '.repeat(8)},'en'),null);
});
test('Language is a recommendation only; federal users may choose either official language',()=>{
 assert.equal(determineSuggestedOfficialLanguage('H7R 4X5','federal'),'fr');
 assert.equal(determineSuggestedOfficialLanguage('M5V 1A1','federal'),'en');
});
test('All six website languages show all SCAR guidance',()=>{
 for(const lang of ['en','fr','es','pt','zh','tl'])assert.ok(browser.includes(lang+':['),lang);
 for(const part of ['Situation','Challenge','Action','Result'])assert.ok(readFileSync('src-worker/scar-email.js','utf8').includes(part),part);
 assert.match(browser,/option.selected=value===suggested/);
 assert.match(browser,/select.value/);
});
test('A separate protected POST endpoint generates drafts without auto sending',()=>{
 assert.match(worker,/if\(path==="\/api\/generate-email"\)return emailDraft\(request,env\)/);
 assert.match(worker,/EMAIL_USER_LIMIT/);
 assert.match(worker,/EMAIL_GLOBAL_LIMIT/);
 assert.match(browser,/fetch\('\/api\/generate-email'/);
 assert.doesNotMatch(browser,/sendEmail\(/);
});
test('The SCAR assistant is present on both postal and triage workflows',()=>{
 assert.ok(html.indexOf('/static/js/scar-wizard.js')<html.indexOf('/static/js/app.js'));
 assert.match(app,/window.InfoCivicScar\?\.mount/);
 assert.doesNotMatch(app,/showLavalBanner\(resultsId, rawCode\)/);
});
