/* Privacy-first analytics. Nothing is sent to analytics until a visitor opts in. */
(function(){
 'use strict';
 const KEY='infocivic-analytics-consent',ID='G-12Q5H9M7GX';
 const read=()=>{try{return localStorage.getItem(KEY)==='yes';}catch{return false;}};
 let enabled=read(),loaded=false;
 window.dataLayer=window.dataLayer||[];
 window.gtag=function(){if(enabled)window.dataLayer.push(arguments);};
 function load(){
   if(!enabled||loaded)return;
   loaded=true;
   const script=document.createElement('script');
   script.async=true;script.src='https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(ID);
   document.head.appendChild(script);
   window.gtag('js',new Date());
   // Exclude postal-code query strings from page locations sent to analytics.
   window.gtag('config',ID,{page_location:location.origin+location.pathname,
     anonymize_ip:true,allow_google_signals:false,allow_ad_personalization_signals:false});
 }
 if(enabled)load();
 function setEnabled(next){
   try{localStorage.setItem(KEY,next?'yes':'no');}catch{return false;}
   // Reload to fully remove an already loaded analytics script on withdrawal.
   location.reload();return true;
 }
 window.InfoCivicAnalytics={isEnabled:()=>enabled,setEnabled};
})();