/* Infocivic analytics choice. Optional analytics is OFF until explicitly allowed. */
(()=>{
 'use strict';
 const STORAGE_KEY='infocivic-analytics-choice';
 const GA_ID='G-12Q5H9M7GX';
 const langs=['en','fr','es','pt','zh','tl'];
 const messages={
  en:['Help us improve Infocivic?','Optional analytics show which pages and features are useful. No analytics are loaded unless you agree. You can change your choice in Privacy.','Not now','Allow analytics','Privacy'],
  fr:['Nous aider à améliorer Infocivic ?','Les statistiques facultatives montrent les pages et les fonctions utiles. Aucun outil d’analyse n’est chargé sans votre accord. Modifiez votre choix dans Confidentialité.','Pas maintenant','Autoriser les statistiques','Confidentialité'],
  es:['¿Nos ayudas a mejorar Infocivic?','Las estadísticas opcionales muestran qué páginas y funciones se utilizan. No se activan sin tu permiso. Puedes cambiarlo en Privacidad.','Ahora no','Permitir estadísticas','Privacidad'],
  pt:['Ajude a melhorar o Infocivic?','As estatísticas opcionais mostram quais páginas e funções são úteis. Elas não são ativadas sem sua permissão. Altere a escolha em Privacidade.','Agora não','Permitir estatísticas','Privacidade'],
  zh:['帮助改进 Infocivic？','可选的使用统计帮助我们了解哪些功能有用。只有在您同意后才会启用，您可以在隐私页面修改选择。','暂不允许','允许统计','隐私'],
  tl:['Tumulong na mapabuti ang Infocivic?','Opsyonal ang analytics upang malaman kung anong mga pahina at tampok ang kapaki-pakinabang. Hindi ito i-aactivate nang walang pahintulot. Maaari mo itong baguhin sa Privacy.','Hindi muna','Payagan ang analytics','Privacy']
 };
 let choice='unset';
 try{const saved=localStorage.getItem(STORAGE_KEY);if(saved==='yes'||saved==='no')choice=saved;}catch{}
 window.dataLayer=[];
 // Existing first-party app events continue to work but are discarded without consent.
 window.gtag=function(){if(choice==='yes')window.dataLayer.push(arguments);};
 function language(){
  let saved=null;
  try{saved=localStorage.getItem('canrep-lang');}catch{}
  const v=(saved||document.documentElement.lang||navigator.language||'en').slice(0,2).toLowerCase();
  return langs.includes(v)?v:'en';
 }
 function forgetCookies(){
  document.cookie.split(';').map(s=>s.trim().split('=')[0]).filter(name=>/^_ga(?:_|$)|^_gid$/.test(name)).forEach(name=>{
   const domain=location.hostname;
   for(const suffix of ['', '; domain='+domain, '; domain=.'+domain.replace(/^[^.]+\./,'')]){
    document.cookie=name+'=; Max-Age=0; path=/; SameSite=Lax'+suffix;
   }
  });
 }
 function loadAnalytics(){
  if(document.querySelector('script[data-infocivic-analytics]'))return;
  window.gtag('js',new Date());
  window.gtag('config',GA_ID,{anonymize_ip:true});
  const script=document.createElement('script');
  script.async=true;script.dataset.infocivicAnalytics='true';
  script.src='https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(GA_ID);
  document.head.append(script);
 }
 function setChoice(next){
  const old=choice;choice=next;
  try{localStorage.setItem(STORAGE_KEY,next);}catch{}
  document.getElementById('privacy-analytics-choice')?.remove();
  if(next==='yes')loadAnalytics();
  if(next==='no'){forgetCookies();if(old==='yes')location.reload();}
  document.dispatchEvent(new CustomEvent('infocivic-analytics-choice',{detail:{allowed:next==='yes'}}));
 }
 function showChoice(){
  if(document.getElementById('privacy-analytics-choice'))return;
  const L=messages[language()]||messages.en;
  const box=document.createElement('aside');box.id='privacy-analytics-choice';box.className='privacy-choice-banner';
  box.setAttribute('aria-label',L[0]);
  const words=document.createElement('div');words.className='privacy-choice-words';
  const heading=document.createElement('strong');heading.textContent=L[0];
  const desc=document.createElement('p');desc.textContent=L[1];words.append(heading,desc);
  const buttons=document.createElement('div');buttons.className='privacy-choice-actions';
  const reject=document.createElement('button');reject.type='button';reject.className='privacy-choice-button';
  reject.textContent=L[2];reject.addEventListener('click',()=>setChoice('no'));
  const allow=document.createElement('button');allow.type='button';allow.className='privacy-choice-button';
  allow.textContent=L[3];allow.addEventListener('click',()=>setChoice('yes'));
  const link=document.createElement('a');link.href='/privacy';link.textContent=L[4];
  buttons.append(reject,allow,link);box.append(words,buttons);document.body.append(box);
 }
 window.InfoCivicPrivacy={analyticsAllowed:()=>choice==='yes',manage:showChoice,getChoice:()=>choice};
 if(choice==='yes')loadAnalytics();
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{if(choice==='unset')showChoice();});
 else if(choice==='unset')showChoice();
})();
