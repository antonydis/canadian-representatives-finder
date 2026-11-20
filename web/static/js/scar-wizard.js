// InfoCivic's progressive, low-friction representative email assistant.
(function(){
'use strict';
const catalogs={
 en:['Prepare an email in a few steps','We can draft a clear email you can review and send to your representative.','1 of 2 · Your details','2 of 2 · Why you are writing','Your name','Your address (optional)','Include your street address only if you want to show you live in this constituency.','Why do you want to contact your representative?','Describe the issue in your own words. No special format needed.','Continue','Back','Generate email','Use a ready-made template instead','Creating your email…','Your email is ready. Review it before sending.','We couldn’t generate the email. The ready-made template is still available.','Please enter your name.','Please describe why you are contacting the representative.','See the French version','See the English version','Creating the French version…','Creating the English version…','You can answer in any language. The email is generated in English first.','Please avoid sharing your SIN, passport number, medical records or other sensitive information.','Your details are sent to OpenAI only when you choose to generate the draft. Nothing is sent to the representative automatically.','Change your answers'],
 fr:['Préparer un courriel en quelques étapes','Nous pouvons rédiger un courriel clair à vérifier et à envoyer à votre élu.','1 sur 2 · Vos coordonnées','2 sur 2 · Objet du message','Votre nom','Votre adresse (facultative)','Indiquez votre adresse seulement si vous souhaitez confirmer que vous résidez dans la circonscription.','Pourquoi souhaitez-vous contacter votre élu ?','Expliquez la situation avec vos propres mots. Aucun format particulier.','Continuer','Retour','Créer le courriel','Utiliser le modèle prêt à envoyer','Création du courriel…','Votre courriel est prêt. Vérifiez-le avant l’envoi.','Impossible de générer le courriel. Le modèle reste disponible.','Indiquez votre nom.','Expliquez pourquoi vous contactez cet élu.','Voir la version française','Voir la version anglaise','Création de la version française…','Création de la version anglaise…','Répondez dans n’importe quelle langue. Le premier courriel sera en anglais.','N’indiquez pas de NAS, numéro de passeport, dossier médical ou autres données sensibles.','Vos réponses sont transmises à OpenAI seulement si vous demandez le brouillon. Aucun courriel n’est envoyé automatiquement.','Modifier vos réponses'],
 es:['Prepara un correo en pocos pasos','Podemos redactar un correo claro para que lo revises y envíes a tu representante.','1 de 2 · Tus datos','2 de 2 · Motivo del contacto','Tu nombre','Tu dirección (opcional)','Incluye tu dirección solo si quieres demostrar que resides en la circunscripción.','¿Por qué quieres contactar a tu representante?','Explica la situación con tus propias palabras, sin un formato especial.','Continuar','Volver','Generar correo','Usar una plantilla sin responder','Preparando tu correo…','Tu correo está listo. Revísalo antes de enviarlo.','No pudimos generar el correo. Puedes usar la plantilla.','Introduce tu nombre.','Cuéntanos por qué quieres contactar al representante.','Ver versión en francés','Ver versión en inglés','Preparando la versión francesa…','Preparando la versión inglesa…','Responde en cualquier idioma. El primer correo se redactará en inglés.','Evita incluir SIN/NAS, pasaporte, expedientes médicos u otros datos sensibles.','Solo enviamos tus respuestas a OpenAI cuando decides generar el borrador. Nada se envía automáticamente al representante.','Editar tus respuestas'],
 pt:['Prepare um e-mail em poucos passos','Podemos redigir um e-mail claro para você revisar e enviar ao seu representante.','1 de 2 · Seus dados','2 de 2 · Motivo do contato','Seu nome','Seu endereço (opcional)','Inclua seu endereço somente se desejar demonstrar que reside na circunscrição.','Por que deseja contatar o representante?','Descreva a situação com suas próprias palavras. Sem formato especial.','Continuar','Voltar','Gerar e-mail','Usar modelo pronto','Preparando o e-mail…','Seu e-mail está pronto. Revise antes de enviar.','Não foi possível gerar. O modelo pronto continua disponível.','Digite seu nome.','Explique por que deseja contatar o representante.','Ver versão em francês','Ver versão em inglês','Preparando a versão francesa…','Preparando a versão inglesa…','Responda em qualquer idioma. O primeiro e-mail será em inglês.','Evite SIN, passaporte, prontuário médico ou outras informações sensíveis.','Suas respostas são enviadas à OpenAI somente ao gerar o rascunho. Nenhum e-mail é enviado automaticamente.','Editar suas respostas'],
 zh:['简单几步准备邮件','我们可以帮您起草清晰的邮件，供您核对后发送给民选代表。','第 1 步，共 2 步 · 您的信息','第 2 步，共 2 步 · 联系原因','您的姓名','您的地址（选填）','只有当您想表明自己住在该选区时才需填写街道地址。','您为什么要联系代表？','请用自己的话说明情况，不必遵循特定格式。','继续','返回','生成邮件','直接使用现成模板','正在生成邮件…','邮件已准备好，请核对后发送。','无法生成邮件，仍可使用现成模板。','请输入您的姓名。','请说明联系代表的原因。','查看法语版本','查看英语版本','正在生成法语版本…','正在生成英语版本…','您可以使用任何语言回答。邮件首先以英语生成。','请勿输入社会保险号码、护照号码、医疗记录或其他敏感信息。','只有在您选择生成草稿时才会将答案发送给 OpenAI。不会自动发送给代表。','修改答案'],
 tl:['Maghanda ng email sa ilang hakbang','Tutulungan ka naming gumawa ng malinaw na email na maaari mong suriin at ipadala sa kinatawan.','Hakbang 1 sa 2 · Iyong detalye','Hakbang 2 sa 2 · Dahilan ng pakikipag-ugnayan','Iyong pangalan','Iyong address (opsyonal)','Ilagay lamang ang address kung nais mong patunayang residente ka ng distrito.','Bakit mo gustong makipag-ugnayan sa kinatawan?','Ilarawan ang sitwasyon sa sarili mong salita. Walang kailangang espesyal na format.','Magpatuloy','Bumalik','Gumawa ng email','Gamitin ang handang template','Ginagawa ang email…','Handa na ang email. Suriin bago ipadala.','Hindi magawa ang email. Maaari pa ring gamitin ang handang template.','Ilagay ang iyong pangalan.','Ipaliwanag kung bakit mo gustong kontakin ang kinatawan.','Tingnan sa Pranses','Tingnan sa Ingles','Ginagawa ang bersyong Pranses…','Ginagawa ang bersyong Ingles…','Maaari kang sumagot sa anumang wika. Ang unang email ay sa Ingles.','Huwag isama ang SIN, passport number, medical records o iba pang sensitibong datos.','Ipapadala lamang sa OpenAI ang mga sagot kapag pinili mong gumawa ng draft. Walang awtomatikong ipapadalang email.','Baguhin ang mga sagot']
};
const active=[];
function node(tag,cls,txt){const e=document.createElement(tag);if(cls)e.className=cls;if(txt!==undefined)e.textContent=txt;return e;}
function mount({box,editor,rep,context,template,subjectInput,messageInput,updateLink,uiLanguage,priorIssue}){
 let L=catalogs[uiLanguage]||catalogs.en,step=1,lastData=null,generatedLanguage=null;
 const wizard=node('section','scar-wizard scar-simple');
 const heading=node('h3','',L[0]),intro=node('p','scar-wizard-intro',L[1]);
 wizard.append(heading,intro);
 const stage1=node('div','scar-step');
 const counter1=node('p','scar-step-counter',L[2]);stage1.append(counter1);
 const makeField=(parent,tag,id,labelIndex,maxLength)=>{
   const wrap=node('div','civic-compose-field');
   const label=node('label','',L[labelIndex]);
   const input=node(tag);input.id=context+'-'+id;label.htmlFor=input.id;
   input.maxLength=maxLength;
   if(tag==='textarea')input.rows=4;
   wrap.append(label,input);parent.append(wrap);
   return {label,input};
 };
 const name=makeField(stage1,'input','sender-name',4,110);
 name.input.autocomplete='name';
 const address=makeField(stage1,'input','sender-address',5,180);
 address.input.autocomplete='street-address';
 const addressHelp=node('p','scar-hint',L[6]);stage1.append(addressHelp);
 const continueButton=node('button','civic-compose-btn',L[9]);continueButton.type='button';
 stage1.append(continueButton);
 const stage2=node('div','scar-step hidden');
 const counter2=node('p','scar-step-counter',L[3]);stage2.append(counter2);
 const reason=makeField(stage2,'textarea','reason',7,800);
 reason.input.value=(priorIssue||'').slice(0,800);
 const reasonHint=node('p','scar-hint',L[8]);stage2.append(reasonHint);
 const stageActions=node('div','civic-compose-actions');
 const back=node('button','civic-secondary-action',L[10]);back.type='button';
 const generate=node('button','civic-compose-btn',L[11]);generate.type='button';
 stageActions.append(back,generate);stage2.append(stageActions);
 const status=node('p','scar-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const privacy=node('p','scar-privacy',L[24]);
 const caution=node('p','scar-privacy',L[23]);
 const skip=node('button','scar-skip',L[12]);skip.type='button';
 const switchLanguage=node('button','civic-secondary-action hidden',L[18]);switchLanguage.type='button';
 const edit=node('button','scar-edit hidden',L[25]);edit.type='button';
 wizard.append(stage1,stage2,status,caution,privacy,skip,switchLanguage,edit);
 // Keep the original template available but do not display both flows at once.
 editor.classList.add('hidden');
 function showStage(n){step=n;stage1.classList.toggle('hidden',n!==1);stage2.classList.toggle('hidden',n!==2);(n===1?counter1:counter2).scrollIntoView({behavior:'smooth',block:'nearest'});}
 function showEditor(){stage1.classList.add('hidden');stage2.classList.add('hidden');editor.classList.remove('hidden');skip.classList.add('hidden');edit.classList.remove('hidden');editor.scrollIntoView({behavior:'smooth',block:'nearest'});}
 continueButton.addEventListener('click',()=>{if(!name.input.value.trim()){status.textContent=L[16];name.input.focus();return;}status.textContent='';showStage(2);reason.input.focus({preventScroll:true});});
 back.addEventListener('click',()=>{status.textContent='';showStage(1);});
 edit.addEventListener('click',()=>{editor.classList.add('hidden');edit.classList.add('hidden');skip.classList.remove('hidden');switchLanguage.classList.add('hidden');status.textContent='';showStage(1);});
 skip.addEventListener('click',()=>{subjectInput.value=template.subject;messageInput.value=template.body;updateLink();generatedLanguage=null;switchLanguage.classList.add('hidden');status.textContent='';showEditor();});
 async function generateDraft(language){
   const data=lastData;
   if(!data)return;
   const isInitial=language==='en'&&generatedLanguage===null;
   generate.disabled=true;switchLanguage.disabled=true;
   status.textContent=isInitial?L[13]:(language==='fr'?L[20]:L[21]);
   try{
     const response=await fetch('/api/generate-email',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...data,language})});
     const result=await response.json();
     if(!response.ok||!result.success)throw Error(result.error||'unavailable');
     subjectInput.value=result.subject;messageInput.value=result.body;updateLink();generatedLanguage=language;
     switchLanguage.textContent=language==='en'?L[18]:L[19];
     switchLanguage.classList.remove('hidden');
     status.textContent=L[14];showEditor();
   }catch{status.textContent=L[15];if(generatedLanguage===null)skip.classList.remove('hidden');}
   finally{generate.disabled=false;switchLanguage.disabled=false;}
 }
 generate.addEventListener('click',()=>{
   if(!reason.input.value.trim()){status.textContent=L[17];reason.input.focus();return;}
   lastData={sender_name:name.input.value.trim(),sender_address:address.input.value.trim(),reason:reason.input.value.trim(),context:String(priorIssue||'').slice(0,550),representative_name:rep.name,representative_office:rep.elected_office||''};
   generateDraft('en');
 });
 switchLanguage.addEventListener('click',()=>generateDraft(generatedLanguage==='en'?'fr':'en'));
 const relabel=lang=>{
   L=catalogs[lang]||catalogs.en;
   heading.textContent=L[0];intro.textContent=L[1];counter1.textContent=L[2];counter2.textContent=L[3];
   name.label.textContent=L[4];address.label.textContent=L[5];addressHelp.textContent=L[6];reason.label.textContent=L[7];reasonHint.textContent=L[8];
   continueButton.textContent=L[9];back.textContent=L[10];generate.textContent=L[11];skip.textContent=L[12];privacy.textContent=L[24];caution.textContent=L[23];
   edit.textContent=L[25];switchLanguage.textContent=generatedLanguage==='fr'?L[19]:L[18];
 };
 active.push({wizard,relabel});
 box.insertBefore(wizard,editor);
}
window.InfoCivicScar={mount,labels:catalogs,setLanguage(lang){
 for(let i=active.length-1;i>=0;i--){if(!active[i].wizard.isConnected)active.splice(i,1);else active[i].relabel(lang);}
}};
})();
