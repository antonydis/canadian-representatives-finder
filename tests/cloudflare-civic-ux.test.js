import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync('web/templates/index.html','utf8');
const js=readFileSync('web/static/js/app.js','utf8');
test('Civic guidance includes four accessible progressive stages',()=>{
 for(const id of ['civic-progress','civic-understanding-title','civic-original-details','civic-edit-question','civic-agency-title','triage-agency-link-container','civic-postal-title','civic-contact-stage'])assert.ok(html.includes('id="'+id+'"'),id);
 assert.ok(html.includes('aria-current="step"'));
 assert.ok(html.includes('aria-live="polite"'));
});
test('Original question remains editable and is never printed with innerHTML',()=>{
 assert.match(js,/function editCivicQuestion/);
 assert.match(js,/civic-original-question'\)\.textContent/);
 assert.match(js,/civic-understanding-summary'\)\.textContent/);
});
test('Email action is prominent and only offered when an email exists',()=>{
 assert.match(js,/showEmailTemplate && rep\.email/);
 assert.match(js,/civic-compose-btn/);
});
test('Official URL is derived from the verified agency field, not model prose',()=>{
 assert.match(js,/aiData\.agency/);
 assert.match(js,/agencyLink\.href=agency\.url/);
});

test('Direct postal search has accessible three-stage layout and composer',()=>{
 for(const id of ['find-journey','find-location-code','find-change-postal','find-representatives-title','find-composer','triage-composer'])assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(js,/function updateFindJourney/);
 assert.match(js,/function openInlineComposer/);
 assert.match(js,/function closeInlineComposer/);
 assert.match(js,/if\(source==='main'\)updateFindJourney\(2,displayCode\)/);
});
test('Agency name itself opens only the allowlisted official URL',()=>{
 assert.match(js,/agencyLink\.href=agency\.url/);
 assert.match(js,/agencyLink\.target='_blank'/);
 assert.match(js,/services\.append\(agencyLink\)/);
 assert.doesNotMatch(js,/officialContainer\.append\(link\)/);
});
test('Mail is editable, reviewed, and sent only through user mail application',()=>{
 assert.match(js,/subject\.input\.addEventListener\('input',updateLink\)/);
 assert.match(js,/message\.input\.addEventListener\('input',updateLink\)/);
 assert.match(js,/mail\.href=url/);
 assert.match(js,/mailto:/);
});

test('Contact entry asks about suitability before collecting personal information',()=>{
 assert.match(js,/function buildContactDecisionGate/);
 assert.match(js,/box\.insertBefore\(gate,form\)/);
 assert.match(js,/form\.classList\.add\('hidden'\)/);
 assert.match(js,/\/api\/classify-situation/);
 assert.match(js,/closeInlineComposer\(context\)/);
 for(const language of ['en','fr','es','pt','zh','tl'])assert.ok(js.includes(language+':['),language);
});
test('Representative cards record their government level for matching',()=>{
 assert.match(js,/card\.dataset\.level=level/);
 assert.match(js,/level===rep\.level/);
});

test('Guided contact offers verified phone details and avoids repeat triage gate',()=>{
 assert.match(js,/data\.contact\?\.phone/);
 assert.match(js,/civic-phone-help/);
 assert.match(js,/context==='triage' && activeTriageSituation/);
 assert.match(js,/postal_code:currentPostalCode/);
});
test('Default email avoids home-address and telephone placeholders',()=>{
 const start=js.indexOf('function buildEmailTemplate(');
 const end=js.indexOf('function fallbackCopy(',start);
 const template=js.slice(start,end);
 assert.ok(start>=0&&end>start);
 assert.doesNotMatch(template,/\[Your Address\]|\[Votre adresse\]|\[Your Email \/ Phone\]/);
 assert.match(template,/appropriate next step/);
 assert.match(template,/currentPostalCode/);
});

test('Mobile composer header has two-column layout and accessible action below',()=>{
 const css=readFileSync('web/static/css/style.css','utf8');
 assert.match(css,/\.civic-compose-heading\s*\{\s*display:grid/);
 assert.match(css,/@media\(max-width:720px\)/);
 assert.match(css,/\.civic-compose-heading>\.civic-edit-btn\s*\{\s*grid-column:2/);
 assert.match(css,/font-size:16px/);
 assert.match(css,/overflow-wrap:anywhere/);
 assert.match(html,/viewport-fit=cover/);
});

test('Small-screen layout protects titles and contact details',()=>{
 const css=readFileSync('web/static/css/style.css','utf8');
 assert.match(css,/@media\(max-width:640px\)/);
 assert.match(css,/@media\(max-width:360px\)/);
 assert.match(css,/\.civic-compose-heading>\.civic-edit-btn\s*\{\s*grid-column:1\/-1/);
 assert.match(css,/\.contact-item a\{overflow-wrap:anywhere/);
 assert.match(css,/\.tab-btn\{min-width:0;margin:0/);
 assert.match(css,/min-height:44px/);
 assert.match(css,/prefers-reduced-motion:reduce/);
});

test('Direct service recommendation is embedded in both orientation flows',()=>{
 assert.match(js,/function buildDirectServiceCard\(contact,agency\)/);
 assert.match(js,/result\.append\(buildDirectServiceCard\(data\.contact,data\.agency\)\)/);
 assert.match(js,/officialContainer\.append\(direct\)/);
 assert.match(js,/aiData\?\.contact/);
 assert.match(js,/directServiceText\(5\)/);
 assert.match(js,/phone\.href='tel:'/);
 assert.match(js,/site\.target='_blank'/);
 assert.match(js,/section\.append\(title,intro,choices,detail\)/);
});
test('Direct contact rendering never executes user supplied HTML',()=>{
 const block=js.slice(js.indexOf('function buildDirectServiceCard'),js.indexOf('function buildContactDecisionGate'));
 assert.doesNotMatch(block,/innerHTML/);
 assert.match(block,/textContent=contact\.phone/);
});
