import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const catalog=JSON.parse(readFileSync(new URL('../data/public-services/approved-contacts.json', import.meta.url),'utf8'));
const inventory=readFileSync(new URL('../data/public-services/inventory-organizations.csv',import.meta.url),'utf8');
const routes=readFileSync(new URL('../data/public-services/candidate-service-routes.csv',import.meta.url),'utf8');

test('curated contacts have unique valid IDs and official HTTPS URLs',()=>{
 assert.equal(catalog.services.length,19);
 const ids=new Set();
 for(const service of catalog.services){
  assert.equal(service.status,'approved');
  assert.ok(!ids.has(service.id),'duplicate service: '+service.id);ids.add(service.id);
  assert.ok(['federal','provincial','municipal'].includes(service.level));
  assert.ok(['canada','quebec'].includes(service.region));
  assert.ok(new URL(service.official_url).protocol==='https:');
  assert.match(service.verified_at,/^\\d{4}-\\d{2}-\\d{2}$/);
  assert.ok(service.topics.length>4);
 }
});

test('research inventory is explicitly non-actionable',()=>{
 const lines=inventory.trim().split(/\\r?\\n/);
 assert.equal(lines.length,421);
 assert.equal(lines[0],'id,nivel,tipo,nombre_oficial,ambito,tematica,enlace_fuente,estado_validacion,canal_recomendado,url_tramite,ultima_revision');
 assert.ok(!inventory.includes(',approved,'));
});

test('candidate municipal service routes remain separate from approved contacts',()=>{
 const lines=routes.trim().split(/\\r?\\n/);
 assert.equal(lines.length,7);
 assert.ok(lines[0].includes('url_oficial'));
 assert.ok(!catalog.services.some(s=>s.region==='montreal'));
});
