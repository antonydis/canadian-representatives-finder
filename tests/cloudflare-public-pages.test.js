import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const read=path=>readFileSync(path,'utf8');
const main=read('web/templates/index.html'),laval=read('web/templates/laval.html');
const about=read('web/templates/about.html'),privacy=read('web/templates/privacy.html');
const pages=read('web/static/js/info-pages.js'),consent=read('web/static/js/privacy-consent.js');
const worker=read('src-worker/index.js'),build=read('scripts/build-cloudflare.mjs');
test('About and Privacy are published on direct paths, not replaced by homepage',()=>{
 for(const page of ['about','privacy']){
  assert.match(worker,new RegExp('"/'+page+'":"/'+page+'.html"'));
  assert.match(build,new RegExp('"'+page+'/index.html"'));
  assert.match(build,new RegExp('templates/'+page+'.html'));
  assert.match(main,new RegExp('href="/'+page+'"'));
  assert.match(laval,new RegExp('href="/'+page+'"'));
 }
 assert.ok(existsSync('web/static/css/info-pages.css'));
});
test('Public pages explain independence, email control, privacy, and credit data sources',()=>{
 assert.match(about,/not operated by|not operated|not a government|not an official government|not affiliated/i);
 assert.match(about,/OpenNorth/);
 assert.match(about,/represent.opennorth.ca/);
 assert.match(about,/review|relire|revisar/i);
 assert.match(privacy,/contact@infocivic.ca/);
 assert.match(privacy,/OpenAI/);
 assert.match(privacy,/Cloudflare/);
 assert.match(privacy,/Google Analytics/);
 assert.match(privacy,/access|rectification|corrección/i);
 assert.doesNotMatch(privacy,/(?:sk-[A-Za-z0-9]{20,}|Bearer\s+[A-Za-z0-9]{20,})/);
});
test('All supported languages work on public pages, which always fall back to English',()=>{
 for(const code of ['en','fr','es','pt','zh','tl']){
  assert.match(pages,new RegExp('(?:^|\\n) '+code+':\\{'));
 }
 assert.match(pages,/render\(lang\(\)\)/);
 assert.match(pages,/site.+/i);
});
test('Optional analytics cannot load before an active opt-in',()=>{
 for(const html of [main,laval,about,privacy]){
  assert.match(html,/privacy-consent\.js/);
  assert.doesNotMatch(html,/src="https:\/\/www\.googletagmanager\.com\/gtag\/js/);
 }
 assert.match(consent,/if\(choice==='yes'\)loadAnalytics\(\)/);
 assert.match(consent,/if\(next==='yes'\)loadAnalytics\(\)/);
 assert.match(consent,/if\(next==='no'\)/);
 assert.match(consent,/analyticsAllowed:\(\)=>choice==='yes'/);
});
test('Brand reflects InfoCivic Canada without promoting a third party in the footer',()=>{
 assert.match(main,/InfoCivic Canada/);
 assert.doesNotMatch(main,/<span>Data provided by/);
 assert.match(about,/OpenNorth/);
});
