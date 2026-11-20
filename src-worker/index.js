import translations from "./translations.generated.json";
import overridesA from "../data/overrides.json";
import overridesB from "../data/mtl_borough_overrides.json";
import {normalizePostal, isPostalCode, boundaryAmbiguity} from "./quality.js";
import {policyInput, classifyWithOpenAI, VALID_LANGS, officialContactFor, resolveAgencyContact} from "./civic-ai.js";
import {validateDraftRequest,generateScarDraft} from "./scar-email.js";

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
function applyOverrides(reps,postal,city=""){
 let list=[...reps];const prefix=postal.slice(0,3);
 const norm=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/^ville de /,"").trim();
 const cityMatches = item => Boolean(norm(city)) && (norm(item.district_name)===norm(city) || norm(item.district_name)===norm("Ville de "+city));
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
    else if(cityMatches(raw)&&!list.some(r=>repKey(r)===repKey(next)))list.push(next);
   }else if(action==="replace"){
    const i=list.findIndex(r=>r.level===next.level&&r.elected_office===next.elected_office&&
      norm(r.district)===norm(next.district));
    if(i>=0)list[i]=next;
   }else if(action==="inject" && cityMatches(raw)&&!list.some(r=>repKey(r)===repKey(next)))list.push(next);
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
  const candidateReps=applyOverrides(reps,postal,raw.city);
  const issues=[];
  if(disagreement.length)issues.push("postal_boundary_ambiguity");
  if(!candidateReps.length)issues.push("no_representative_data");
  issues.push("official_verification_required");
  return respond({
    success:true,postal_code:postal,municipality:typeof raw.city==="string"?raw.city.slice(0,120):"",representatives:candidateReps,
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
 return {success:true,jurisdiction,requires_clarification:jurisdiction===null,service:null,agency:null,agency_id:null,explanation:explanation[lang]||explanation.en,situation_en:text.slice(0,100),situation_fr:text.slice(0,100),classification_method:"rules"};
}
async function classify(request,env){
 const data=await body(request);
 const postal=valid(normalize(data.postal_code))?normalize(data.postal_code):"";
 const municipality=String(data.municipality||"").slice(0,120);
 const lang=VALID_LANGS.includes(data.lang)?data.lang:"en";
 const checked=policyInput(data.text);
 if(!checked.ok)return fail(checked.code,checked.code==="out_of_scope"?422:400);
 // Never allow a paid OpenAI call without working abuse limits.
 if(!env.OPENAI_API_KEY){const f=fallback(checked.text,lang);return respond({...f,contact:f.jurisdiction?officialContactFor(f.jurisdiction,null,postal,municipality):null});}
 if(!env.AI_USER_LIMIT||!env.AI_GLOBAL_LIMIT)return fail("ai_protection_unavailable",503);
 const ip=request.headers.get("CF-Connecting-IP")||"unknown";
 try{
  const [userLimit,globalLimit]=await Promise.all([
    env.AI_USER_LIMIT.limit({key:ip}),
    env.AI_GLOBAL_LIMIT.limit({key:"all_civic_requests"})
  ]);
  if(!userLimit.success||!globalLimit.success)return fail("rate_limit",429);
 }catch{return fail("ai_protection_unavailable",503);}
 try{
  const result=await classifyWithOpenAI(checked.text,lang,env,postal,municipality);
  if(result)return respond(result);
  const f=fallback(checked.text,lang);
  return respond({...f,contact:f.jurisdiction?officialContactFor(f.jurisdiction,null,postal,municipality):null,classification_method:"rules"});
 }catch{const f=fallback(checked.text,lang);return respond({...f,contact:f.jurisdiction?officialContactFor(f.jurisdiction,null,postal):null,classification_method:"rules"});}
}
async function resolveCivicContact(request){
 const data=await body(request);
 const postal=normalize(data.postal_code);
 if(!valid(postal))return fail("invalid_postal_code",400);
 const level=String(data.jurisdiction||"");
 const id=String(data.agency_id||"");
 const municipality=String(data.municipality||"").slice(0,120);
 const resolved=resolveAgencyContact(level,id,postal,municipality);
 return respond({success:true,...resolved,municipality_confirmed:resolved.contact?.name?.startsWith("Ville de ")||false});
}
async function emailDraft(request,env){
 const data=await body(request);
 const v=validateDraftRequest(data);
 if(!v.ok)return fail(v.code,400);
 if(!env.OPENAI_API_KEY)return fail("ai_not_configured",503);
 // Separate strict paid-endpoint limits, fail closed if not configured.
 if(!env.EMAIL_USER_LIMIT||!env.EMAIL_GLOBAL_LIMIT)return fail("email_protection_unavailable",503);
 const ip=request.headers.get("CF-Connecting-IP")||"unknown";
 try{
  const [personal,global]=await Promise.all([
    env.EMAIL_USER_LIMIT.limit({key:ip}),
    env.EMAIL_GLOBAL_LIMIT.limit({key:"all_civic_email_drafts"})
  ]);
  if(!personal.success||!global.success)return fail("rate_limit",429);
 }catch{return fail("email_protection_unavailable",503);}
 try{
   const result=await generateScarDraft(data,env);
   if(result.error)return fail(result.error,result.status||400);
   return respond(result);
 }catch{return fail("email_generation_unavailable",503);}
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
 if(path==="/api/health")return respond({status:"ok",platform:"cloudflare",ai_configured:!!(env.OPENAI_API_KEY&&env.AI_USER_LIMIT&&env.AI_GLOBAL_LIMIT),email_configured:!!(env.OPENAI_API_KEY&&env.EMAIL_USER_LIMIT&&env.EMAIL_GLOBAL_LIMIT),storage_configured:!!env.DB});
 if(path==="/api/translations"&&request.method==="GET")return respond(translations);
 if(path==="/api/councillor")return fail("not_implemented",501);
 if(path.startsWith("/api/")){
  if(request.method!=="POST")return fail("method_not_allowed",405);
  if(path==="/api/search")return search(request);
  if(path==="/api/classify-situation")return classify(request,env);
  if(path==="/api/resolve-civic-contact")return resolveCivicContact(request);
  if(path==="/api/generate-email")return emailDraft(request,env);
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
