// Progressive SCAR wizard for InfoCivic. No external dependencies.
(function(){
"use strict";
const labels={
en:["Personalize your email","Answer a few optional questions to organize a clearer request using SCAR (Situation, Challenge, Action, Result).","Situation: What happened?","Challenge: Why does this matter?","Action: What have you already tried?","Result: What would you like the representative to do?","Email language","Generate personalized draft","Use ready-made template","Write answers in any language. The final email is written in the selected official language.","Do not enter SIN, passport numbers, health records or other sensitive information.","Generating your draft…","Draft ready. Review all facts before sending.","The draft could not be generated. Please use the ready-made template.","Describe the situation or result you want.","English","French","Your answers are used only to generate this draft. No email is sent automatically."],
fr:["Personnaliser votre courriel","Répondez à quelques questions facultatives pour structurer votre demande selon SCAR (Situation, Défi, Actions, Résultat).","Situation : Que s'est-il passé ?","Défi : Pourquoi est-ce important ?","Actions : Qu'avez-vous déjà essayé ?","Résultat : Que souhaitez-vous que l'élu fasse ?","Langue du courriel","Créer un brouillon personnalisé","Utiliser le modèle prêt à envoyer","Répondez dans votre langue. Le courriel sera rédigé dans la langue officielle choisie.","N'inscrivez pas de NAS, numéro de passeport, dossier médical ou données sensibles.","Préparation du brouillon…","Brouillon prêt. Vérifiez les faits avant l'envoi.","Impossible de générer le brouillon. Utilisez le modèle proposé.","Décrivez la situation ou le résultat souhaité.","Anglais","Français","Ces réponses ne servent qu'à générer le brouillon. Aucun courriel n'est envoyé automatiquement."],
es:["Personaliza tu correo","Responde unas preguntas opcionales para organizar un mensaje claro con SCAR (Situación, Desafío, Acciones, Resultado).","Situación: ¿Qué ocurrió?","Desafío: ¿Por qué te afecta?","Acciones: ¿Qué has intentado?","Resultado: ¿Qué le pides al representante?","Idioma del correo","Generar correo personalizado","Usar plantilla predeterminada","Responde en cualquier idioma. El correo final estará en el idioma oficial que elijas.","No incluyas SIN/NAS, pasaporte, historial médico ni otros datos sensibles.","Preparando tu correo…","Borrador listo. Comprueba todos los datos antes de enviarlo.","No pudimos generar el correo. Usa la plantilla predeterminada.","Describe tu situación o el resultado que buscas.","Inglés","Francés","Las respuestas solo se usan para generar el borrador. Ningún correo se envía automáticamente."],
pt:["Personalize seu e-mail","Responda algumas perguntas opcionais para organizar uma mensagem com SCAR (Situação, Desafio, Ações, Resultado).","Situação: O que aconteceu?","Desafio: Por que isso importa?","Ações: O que já tentou?","Resultado: O que deseja do representante?","Idioma do e-mail","Gerar e-mail personalizado","Usar modelo pronto","Responda em qualquer idioma. O e-mail será redigido no idioma oficial escolhido.","Não inclua número de seguro social, passaporte, detalhes médicos ou dados sensíveis.","Preparando seu e-mail…","Rascunho pronto. Verifique os fatos antes de enviar.","Não foi possível gerar o e-mail. Use o modelo pronto.","Descreva a situação ou o resultado desejado.","Inglês","Francês","As respostas servem apenas para gerar o rascunho. Nenhum e-mail é enviado automaticamente."],
zh:["个性化邮件","回答几个可选问题，我们将根据 SCAR（情况、困难、行动、结果）整理邮件。","情况：发生了什么？","困难：对您有什么影响？","行动：您已经尝试了什么？","结果：您希望代表做什么？","邮件语言","生成个性化邮件","使用现成模板","可使用任何语言回答。邮件将按所选官方语言撰写。","请勿输入社会保险号码、护照号码、医疗记录或其他敏感信息。","正在生成草稿…","草稿已生成，请核对事实后发送。","无法生成草稿，请使用现成模板。","请描述问题或希望得到的结果。","英语","法语","答案仅用于生成草稿，系统不会自动发送邮件。"],
tl:["I-personalize ang email","Sagutin ang opsyonal na tanong para mabuo ang SCAR (Sitwasyon, Hamon, Aksyon, Resulta) na mensahe.","Sitwasyon: Ano ang nangyari?","Hamon: Bakit mahalaga ito?","Aksyon: Ano na ang sinubukan mo?","Resulta: Ano ang gusto mong gawin ng kinatawan?","Wika ng email","Gumawa ng personalized na email","Gamitin ang handang template","Maaari kang sumagot sa anumang wika. Ang email ay isusulat sa napiling opisyal na wika.","Huwag ilagay ang SIN, passport number, medikal na detalye o sensitibong impormasyon.","Ginagawa ang draft…","Handa ang draft. Suriin ang mga detalye bago ipadala.","Hindi magawa ang draft. Gamitin ang handang template.","Ilarawan ang sitwasyon o hinihiling na resulta.","Ingles","Pranses","Ginagamit lang ang mga sagot upang gumawa ng draft. Walang email na awtomatikong ipinapadala."]
};
function elem(tag,cls,txt){const e=document.createElement(tag);if(cls)e.className=cls;if(txt!==undefined)e.textContent=txt;return e;}
function mount({box,editor,rep,context,template,subjectInput,messageInput,updateLink,postal,uiLanguage,priorIssue}){
 const L=labels[uiLanguage]||labels.en;
 const wizard=elem('section','scar-wizard');
 const title=elem('h3',null,L[0]);wizard.append(title,elem('p','scar-wizard-intro',L[1]));
 const form=elem('form','scar-wizard-fields');
 const fields={};
 ['situation','challenge','action','result'].forEach((key,i)=>{
   const wrapper=elem('div','civic-compose-field');
   const label=elem('label',null,L[i+2]);
   const input=elem('textarea');input.rows=2;input.maxLength=550;
   input.id=context+'-scar-'+key;label.htmlFor=input.id;
   if(key==='situation'&&priorIssue)input.value=priorIssue.slice(0,550);
   fields[key]=input;wrapper.append(label,input);form.append(wrapper);
 });
 const languageRow=elem('div','scar-language-field');
 const languageLabel=elem('label',null,L[6]);const select=elem('select');
 select.id=context+'-scar-language';languageLabel.htmlFor=select.id;
 const suggested=/^[GHJ]/.test(String(postal||'').toUpperCase())?'fr':'en';
 for(const [value,text] of [['en',L[15]],['fr',L[16]]]){
  const option=elem('option',null,text);
  option.value=value;option.selected=value===suggested;select.append(option);
 }
 languageRow.append(languageLabel,select);
 form.append(languageRow,elem('p','scar-hint',L[9]),elem('p','scar-privacy',L[10]));
 const actions=elem('div','civic-compose-actions');
 const generate=elem('button','civic-compose-btn',L[7]);generate.type='submit';
 const skip=elem('button','civic-secondary-action',L[8]);skip.type='button';
 actions.append(generate,skip);form.append(actions);
 const status=elem('p','scar-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');form.append(status);
 const setTemplate=()=>{subjectInput.value=template.subject;messageInput.value=template.body;updateLink();status.textContent='';editor.scrollIntoView({behavior:'smooth',block:'nearest'});};
 skip.addEventListener('click',setTemplate);
 form.addEventListener('submit',async e=>{
  e.preventDefault();
  const body=Object.fromEntries(Object.entries(fields).map(([key,input])=>[key,input.value.trim()]));
  body.context=String(priorIssue||'').slice(0,550);
  if(!body.situation&&!body.result&&!body.context){status.textContent=L[14];fields.situation.focus();return;}
  body.language=select.value;
  body.representative_name=rep.name;
  body.representative_office=rep.elected_office||'';
  generate.disabled=true;status.textContent=L[11];
  try{
   const response=await fetch('/api/generate-email',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
   const result=await response.json();
   if(!response.ok||!result.success)throw Error(result.error||'service_error');
   subjectInput.value=result.subject;messageInput.value=result.body;updateLink();
   status.textContent=L[12];editor.scrollIntoView({behavior:'smooth',block:'start'});
  }catch{status.textContent=L[13];}
  finally{generate.disabled=false;}
 });
 wizard.append(form,elem('p','scar-privacy',L[17]));
 box.insertBefore(wizard,editor);
}
window.InfoCivicScar={mount,labels};
})();
