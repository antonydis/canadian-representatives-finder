import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizePostal,isPostalCode,boundaryAmbiguity,preferredRepresentatives} from '../src-worker/quality.js';
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

const identity = r => r;
test('selects the centroid representative when a postal code spans two federal ridings',()=>{
  const raw={
    representatives_centroid:[{name:'Centroid MP',level:'federal',elected_office:'MP',district:'A'}],
    representatives_concordance:[{name:'Other MP',level:'federal',elected_office:'MP',district:'B'}]
  };
  assert.deepEqual(preferredRepresentatives(raw,identity).map(x=>x.name),['Centroid MP']);
  assert.deepEqual(boundaryAmbiguity(raw,identity),['federal']);
});
test('uses the concordance when no centroid representative exists',()=>{
  const raw={representatives_centroid:[],representatives_concordance:[
    {name:'First MNA',level:'provincial',elected_office:'MNA',district:'A'},
    {name:'Second MNA',level:'provincial',elected_office:'MNA',district:'B'}
  ]};
  assert.deepEqual(preferredRepresentatives(raw,identity).map(x=>x.name),['First MNA']);
});
test('keeps distinct municipal offices but chooses one councillor per role',()=>{
  const raw={representatives_centroid:[
    {name:'City Mayor',level:'municipal',elected_office:'Mayor'},
    {name:'Ward Councillor',level:'municipal',elected_office:'City Councillor'},
    {name:'Borough Councillor',level:'municipal',elected_office:'Borough Councillor'}
  ],representatives_concordance:[
    {name:'Adjacent Ward Councillor',level:'municipal',elected_office:'City Councillor'},
    {name:'Adjacent Borough Councillor',level:'municipal',elected_office:'Borough Councillor'}
  ]};
  assert.deepEqual(preferredRepresentatives(raw,identity).map(x=>x.name),
    ['City Mayor','Ward Councillor','Borough Councillor']);
});
test('discards records without a named representative',()=>{
  assert.deepEqual(preferredRepresentatives({
    representatives_centroid:[{name:'',level:'federal',elected_office:'MP'}],
    representatives_concordance:[{name:'Available MP',level:'federal',elected_office:'MP'}]
  },identity).map(x=>x.name),['Available MP']);
});
