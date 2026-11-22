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
 assert.match(js,/contact\?\.phone/);
 assert.match(js,/direct-service-card/);
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
 assert.match(block,/textContent=directServiceText\(2\)\+': '\+contact\.phone/);
});

test('Municipality is loaded from postcode API and refines direct services without new AI calls',()=>{
 const worker=readFileSync('src-worker/index.js','utf8');
 assert.match(worker,/municipality:typeof raw\.city/);
 assert.match(worker,/\/api\/resolve-civic-contact/);
 assert.match(js,/currentMunicipality=typeof data\.municipality/);
 assert.match(js,/updateTriageLocalContact\(displayCode,currentMunicipality,activeTriageRouting\)/);
 assert.match(js,/function updateTriageLocalContact/);
 assert.match(js,/activeTriageRouting=\{level:activeTriageLevel/);
});

test('Mismatch check happens after draft exists and preserves user choice',()=>{
 const wizard=readFileSync('web/static/js/scar-wizard.js','utf8');
 assert.match(wizard,/onDraftReady/);
 assert.match(wizard,/if\(isInitial && typeof onDraftReady/);
 assert.match(js,/function maybeReviewDraftRecipient/);
 assert.match(js,/currentComposition\?\.rep!==rep/);
 assert.match(js,/level===rep\.level/);
 assert.match(js,/classification\.requires_clarification/);
 assert.match(js,/recipient-review-dialog/);
 assert.match(js,/setAttribute\('aria-modal','true'\)/);
 assert.match(js,/keep\.addEventListener\('click',dismiss\)/);
 assert.match(js,/if\(e\.key==='Escape'\)/);
});
test('Switching to local representative regenerates an addressed draft',()=>{
 const wizard=readFileSync('web/static/js/scar-wizard.js','utf8');
 assert.match(wizard,/switchRepresentative:async\(target\)/);
 assert.match(wizard,/representative_name:target\.name,representative_office:target\.elected_office/);
 assert.match(wizard,/selectedRep=target;lastData=nextData/);
 assert.match(wizard,/typeof onRecipientChanged==='function'/);
 assert.match(js,/template\.to=target\.email/);
 assert.match(js,/address\.textContent=target\.email/);
 assert.match(js,/latestRepresentatives\.filter\(r=>r\.level===level&&r\.email/);
 assert.match(js,/if\(options\.length\)/);
 assert.match(js,/if\(classification\.contact\|\|classification\.agency\?\.url\)/);
});
test('No automatic send and no invented agency email',()=>{
 const wizard=readFileSync('web/static/js/scar-wizard.js','utf8');
 assert.doesNotMatch(wizard,/sendEmail\(/);
 assert.match(js,/mailto:/);
 assert.doesNotMatch(js,/target\.email\s*=\s*classification\.agency/);
});

test('Jurisdiction alert is exceptional and needs a practical alternative',()=>{
 assert.match(js,/level===rep\.level\)return/);
 assert.match(js,/classification\.classification_method==='rules'\)return/);
 assert.match(js,/!options\.length&&!classification\.contact\?\.phone/);
 assert.match(js,/classification\.out_of_scope/);
 assert.match(js,/document\.body\.style\.overflow='hidden'/);
 assert.match(js,/document\.body\.style\.overflow=previousScrollLock/);
});
test('Representative switch receives the actual recipient UI, not variables out of scope',()=>{
 const start=js.indexOf('function buildContactDecisionGate(');
 const end=js.indexOf('const RECIPIENT_REVIEW_TEXT=',start);
 const gate=js.slice(start,end);
 assert.match(gate,/onRecipientChanged\}\);/);
 assert.doesNotMatch(gate,/address\.textContent=target\.email/);
 const composer=js.slice(js.indexOf('function openInlineComposer('),js.indexOf('async function init('));
 assert.match(composer,/onRecipientChanged:target=>\{/);
 assert.match(composer,/address\.textContent=target\.email/);
 assert.match(composer,/subtitle\.textContent=findText\(6\)/);
 assert.match(composer,/template\.to=target\.email/);
});
test('Mobile email editor resizes and clipboard uses actual newlines',()=>{
 assert.match(js,/function openInlineComposer/);
 assert.match(js,/const fitMessage=\(\)=>/);
 assert.match(js,/field\.scrollHeight/);
 assert.match(js,/Math\.round\(window\.innerHeight\*0\.52\)/);
 const composer=js.slice(js.indexOf('function openInlineComposer('),js.indexOf('async function init('));
 assert.match(composer,/const content='To: '\+template\.to\+'\\n'/);
 assert.doesNotMatch(composer,/const content='To: '\+template\.to\+'\\\\n'/);
});
