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
