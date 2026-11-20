import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizePostal,isPostalCode,boundaryAmbiguity} from '../src-worker/quality.js';
const rep = r => ({level:r.level,district:r.district});
test('normalizes valid postal code including whitespace',()=>{
  assert.equal(normalizePostal(' h2x  1y4 '),'H2X1Y4');
  assert.equal(isPostalCode('H2X1Y4'),true);
  assert.equal(isPostalCode('D2X1Y4'),false);
  assert.equal(isPostalCode('H2X1Y'),false);
});
test('flags electoral district crosswalk mismatch',()=>{
  const raw={representatives_centroid:[{level:'federal',district:'Riding A'}],
    representatives_concordance:[{level:'federal',district:'Riding B'}]};
  assert.deepEqual(boundaryAmbiguity(raw,rep),['federal']);
});
test('flags multiple districts for the same jurisdiction',()=>{
  const raw={representatives_centroid:[],
    representatives_concordance:[{level:'provincial',district:'A'},{level:'provincial',district:'B'}]};
  assert.deepEqual(boundaryAmbiguity(raw,rep),['provincial']);
});
test('does not flag identical district',()=>{
  const raw={representatives_centroid:[{level:'federal',district:'A'}],
    representatives_concordance:[{level:'federal',district:'A'}]};
  assert.deepEqual(boundaryAmbiguity(raw,rep),[]);
});
