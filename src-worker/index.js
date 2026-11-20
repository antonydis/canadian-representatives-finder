import translations from "./translations.generated.json";
import overridesA from "../data/overrides.json";
import overridesB from "../data/mtl_borough_overrides.json";
import {normalizePostal, isPostalCode, boundaryAmbiguity} from "./quality.js";

const headers={"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff"};
const respond=(payload,status=200)=>new Response(JSON.stringify(payload),{status,headers});
const fail=(error,status=400)=>respond({success:false,error},status);
const normalize=normalizePostal;
const valid=isPostalCode;
const body=async request=>{try{if(Number(request.headers.get("content-length")||0)>12000)return {};return await request.json();}catch{return {};}};
function level(raw) {
 const office=String(raw.elected_office||"").toLowerCase(),set=String(raw.representative_set_name||"").toLowerCase();
 if(["mp","senator","member of parliament"].includes(office)||set.includes("house of commons"))return "federal";
 if(["mna","mla","mpp","mha","mnl","député","depute"].includes(office)||set.includes("assemblée nationale")||set.includes("legislative assembly"))return "provincial";
 return "municipal";
}
function mapRep(raw) {return {name:raw.name||"",elected_office:raw.elected_office||"",level:raw.level||level(raw),party:raw.party_name||null,district:raw.district_name||"",email:raw.email||null,phone:raw.phone||raw.offices?.find(o=>o.tel)?.tel||null,url:raw.url||raw.personal_url||null,photo_url:raw.photo_url||null};}
const repKey=r=>String(r.name).toLowerCase()+"|"+String(r.elected_office).toLowerCase();
function applyOverrides(reps,postal){
 let list=[...reps];const prefix=postal.slice(0,3);
 for(const rule of [...overridesA.overrides,...overridesB.overrides]){
  if(!rule.postal_prefixes?.includes(prefix))continue;
  const items=rule.representative?[rule.representative]:rule.representatives||[];
  for(const raw of items){
   const next=mapRep(raw),action=rule.action||"inject";
   if(action==="enrich_by_district"){
    // Postal prefixes can cover multiple council districts; enrich only exact matches.
    const i=list.findIndex(r=>r.level==="municipal"&&r.district.toLowerCase()===next.district.toLowerCase());
    if(i>=0)list[i]=next;
   }else if(action==="replace_or_inject"){
    const i=list.findIndex(r=>repKey(r)===repKey(next)||r.level==="municipal"&&/plante/i.test(r.name)&&/maire|mayor/i.test(next.elected_office));
    if(i>=0)list.splice(i,1,next);
    else if(!list.some(r=>repKey(r)===repKey(next)))list.push(next);
   }else if(action==="replace"){
    const i=list.findIndex(r=>r.level===next.level&&r.elected_office===next.elected_office);
    if(i>=0)list[i]=next;
   }else if(!list.some(r=>repKey(r)===repKey(next)))list.push(next);
  }
 }
 return [...new Map(list.map(r=>[repKey(r),r])).values()];
}
async function search(request){
 const postal=normalize((await body(request)).postal_code);
 if(!valid(postal))return fail("invalid_postal_code");
 try{
  const res=await fetch("https://represent.opennorth.ca/postcodes/"+postal+"/",{headers:{accept:"application/json"},signal:AbortSignal.timeout(10000)});
  if(res.status===429||res.status===503)return fail("rate_limit",429);
  if(!res.ok)return fail("api_error",502);
  const raw=await res.json();
  const centroid=raw.representatives_centroid||[];
  const concordance=raw.representatives_concordance||[];
  const all=[...centroid,...concordance];
  const reps=[...new Map(all.map(x=>[String(x.name)+"|"+String(x.elected_office),mapRep(x)])).values()];
  // A postal code may cover several electoral boundaries. Never silently
  // represent a geographic match as an officially verified identity.
  const disagreement=boundaryAmbiguity(raw,mapRep);
  const candidateReps=applyOverrides(reps,postal);
  const issues=[];
  if(disagreement.length)issues.push("postal_boundary_ambiguity");
  if(!candidateReps.length)issues.push("no_representative_data");
  issues.push("official_verification_required");
  return respond({
    success:true,postal_code:postal,representatives:candidateReps,
    ambiguity_levels:disagreement, warnings:issues,
    data_source:"OpenNorth + InfoCivic manual overrides",
    data_freshness:"unverified", verified:false,
    verification_links:{
      federal:"https://www.ourcommons.ca/Members/en",
      federal_district:"https://www.elections.ca/Scripts/VIS/FindED?L=e&PAGEID=20&QID=-1",
      quebec_provincial:"https://www.assnat.qc.ca/fr/deputes/index.html"
    }
  });
 }catch{return fail("api_error",502);}
}
function fallback(text,lang){
 const federal=/immigra|visa|passport|citizen|refugee|border|ircc|federal|pasaporte/i.test(text);
 const provincial=/hospital|doctor|health|school|teacher|education|tenant|rent|santé|école|loyer|salud|escuela|provincial/i.test(text);
 const municipal=/pothole|garbage|trash|road|sidewalk|snow|streetlight|zoning|recycling|nid.de.poule|ordure|déchet|trottoir|neige|calle|basura|municipal/i.test(text);
 const matches=[federal&&"federal",provincial&&"provincial",municipal&&"municipal"].filter(Boolean);
 const jurisdiction=matches.length===1?matches[0]:null;
 const explanation={en:"Suggested level; please confirm with the official service.",fr:"Niveau suggéré; veuillez confirmer auprès du service officiel.",es:"Nivel sugerido; confirma con el servicio oficial.",pt:"Nível sugerido; confirme com o serviço oficial.",zh:"建议联系该级政府，请向官方核实。",tl:"Iminungkahing antas; kumpirmahin sa opisyal na serbisyo."};
 return {success:true,jurisdiction,requires_clarification:jurisdiction===null,service:jurisdiction==="municipal"?"311":null,explanation:explanation[lang]||explanation.en,situation_en:text.slice(0,100),situation_fr:text.slice(0,100),classification_method:"rules"};
}
async function classify(request,env){
 const data=await body(request),text=String(data.text||"").trim(),lang=["en","fr","es","pt","zh","tl"].includes(data.lang)?data.lang:"en";
 if(text.length<10||text.length>500)return fail(text?"invalid_length":"empty_text");
 if(!env.ANTHROPIC_API_KEY)return respond(fallback(text,lang));
 try{
  const prompt="Classify Canadian civic issues. Return ONLY valid JSON with keys jurisdiction (federal, provincial or municipal), service (311,811,211 or null), explanation (max 20 words in "+lang+"), situation_en, situation_fr (each max 8 words). Choose one level. Do not invent elected representatives.";
  const response=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"content-type":"application/json","x-api-key":env.ANTHROPIC_API_KEY,"anthropic-version":"2023-06-01"},body:JSON.stringify({model:env.ANTHROPIC_MODEL||"claude-haiku-4-5-20251001",max_tokens:256,system:prompt,messages:[{role:"user",content:text}]})});
  if(!response.ok)throw Error("model error");
  const data=await response.json(),parsed=JSON.parse(String(data.content?.[0]?.text||"").trim());
  if(!["federal","provincial","municipal"].includes(parsed.jurisdiction))throw Error("invalid result");
  return respond({success:true,jurisdiction:parsed.jurisdiction,service:["311","811","211"].includes(parsed.service)?parsed.service:null,explanation:String(parsed.explanation||"").slice(0,300),situation_en:String(parsed.situation_en||"").slice(0,100),situation_fr:String(parsed.situation_fr||"").slice(0,100),classification_method:"ai"});
 }catch{return respond(fallback(text,lang));}
}
async function feedback(request,env){
 if(!env.DB)return fail("storage_not_configured",503);
 const data=await body(request),type=String(data.type||""),message=String(data.message||"").trim(),email=String(data.email||"").trim();
 if(!["wrong_rep","outdated_info","suggestion"].includes(type)||message.length<5||message.length>500)return fail("invalid_feedback");
 if(email&&(email.length>200||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))return fail("invalid_email");
 try{await env.DB.prepare("INSERT INTO feedback (type,message,email,rep_name,postal_code) VALUES (?,?,?,?,?)").bind(type,message,email||null,String(data.rep_name||"").slice(0,200)||null,normalize(data.postal_code)||null).run();return respond({success:true});}
 catch{return fail("server_error",500);}
}
async function subscribe(request,env){
 if(!env.DB)return fail("storage_not_configured",503);
 const data=await body(request),name=String(data.name||"").trim(),postal=normalize(data.postal_code),phone=String(data.phone||"").replace(/[ \-().]/g,"");
 if(name.length<2||name.length>80)return fail("invalid_name");
 if(!valid(postal))return fail("invalid_postal");
 if(!/^\+?1?\d{10,11}$/.test(phone))return fail("invalid_phone");
 if(data.consent!==true)return fail("consent_required");
 const normalized="+1"+phone.replace(/^\+?1/,"");
 try{await env.DB.prepare("INSERT INTO laval_subscribers (name,postal_code,phone,consent_at) VALUES (?,?,?,?)").bind(name,postal,normalized,new Date().toISOString()).run();return respond({success:true});}
 catch(e){return fail(String(e).includes("UNIQUE")?"already_subscribed":"server_error",String(e).includes("UNIQUE")?409:500);}
}
export default {async fetch(request,env){
 const url=new URL(request.url),path=url.pathname;
 if(path==="/api/health")return respond({status:"ok",platform:"cloudflare",ai_configured:!!env.ANTHROPIC_API_KEY,storage_configured:!!env.DB});
 if(path==="/api/translations"&&request.method==="GET")return respond(translations);
 if(path==="/api/councillor")return fail("not_implemented",501);
 if(path.startsWith("/api/")){
  if(request.method!=="POST")return fail("method_not_allowed",405);
  if(path==="/api/search")return search(request);
  if(path==="/api/classify-situation")return classify(request,env);
  if(path==="/api/feedback")return feedback(request,env);
  if(path==="/api/laval/subscribe")return subscribe(request,env);
  return fail("not_found",404);
 }
 if(["/reps","/triage","/laval"].includes(path)){
  const rewritten=new URL(request.url);rewritten.pathname=path==="/laval"?"/laval.html":"/index.html";
  return env.ASSETS.fetch(new Request(rewritten,request));
 }
 return env.ASSETS.fetch(request);
}};
