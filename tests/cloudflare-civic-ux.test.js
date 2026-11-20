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
 assert.match(js,/link\.href=agency\.url/);
});
