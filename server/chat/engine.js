import {CHAT_CONSENT_TEXT, CHAT_CONSENT_VERSION} from '../../src/chat-consent.js';
import {validateInquiry} from '../../src/data.js';
import {saveContact} from '../../functions/api/inquiries.js';
import {ChatError, digest} from './http.js';
import {DAY,takeQuota,openSession,cachedEvent,finishSession,releaseSession} from './store.js';
import {extractInquiry} from './model.js';

export function chatReady(env) {
  return env.CHAT_ENABLED==='true' && env.APPROVED_CHAT_CONSENT_VERSION===CHAT_CONSENT_VERSION && !!env.CHAT_DB && !!env.OPENAI_API_KEY;
}
const labels = {name:'Name',phone:'Phone',email:'Email',project:'Project',bedroom:'Bedrooms',floor:'Floor preference',budget:'Budget'};
export function summary(fields) { return Object.entries(labels).map(([key,label])=>`${label}: ${fields[key] || 'Not provided'}`).join('\n'); }
export function canSave(fields) {
  return !!fields.name && fields.name.length>=2 && (!!fields.email || (!!fields.phone && !validateInquiry({name:fields.name,phone:fields.phone,consent:true}).phone));
}
function question(fields,language) {
  const questions = language==='fil' ? {
    name:'Ano po ang pangalan ninyo?', contact:'Anong phone number o email ang maaari naming gamitin para makontak kayo?',
    project:'May gusto na po ba kayong DMCI project?',bedroom:'2BR o 3BR po ba ang hanap ninyo?',floor:'Mas gusto po ba ninyo ang low floor o high floor?',budget:'Magkano po ang budget ninyo? Pakisabi kung total price o buwanang bayad, at anong currency.',
  } : {name:'What name should we use?',contact:'What phone number or email can DMCI Explorer use to respond?',project:'Do you have a preferred DMCI project?',bedroom:'Are you looking for 2BR or 3BR?',floor:'Would you prefer a low floor or a high floor?',budget:'What is your budget? Please include the currency and whether it is a total price or monthly payment.'};
  if (!fields.name) return questions.name;
  if (!fields.phone && !fields.email) return questions.contact;
  for (const key of ['project','bedroom','floor','budget']) if (!fields[key]) return questions[key];
  return language==='fil' ? 'Tama po ba ang mga detalye sa ibaba?' : 'Are the details below correct?';
}
export async function runTurn(env, input, fetcher = fetch, now = Date.now()) {
  if (!chatReady(env)) throw new ChatError(503, 'AI chat is not enabled yet. Please contact DMCI Explorer on Messenger.');
  const {sessionId,eventId,channel,text='',action='message'} = input;
  if (!['website','messenger'].includes(channel) || typeof sessionId!=='string' || !/^[a-z]+:[a-zA-Z0-9-]{16,100}$/.test(sessionId) || typeof eventId!=='string' || !eventId || eventId.length>250 || typeof text!=='string' || text.length>2000 || !['message','consent','confirm','human','echo'].includes(action)) throw new ChatError(400,'Invalid chat message.');
  const cached = await cachedEvent(env.CHAT_DB,sessionId,eventId,now);
  if (cached) return cached.response;
  const {lease,state} = await openSession(env.CHAT_DB,sessionId,now);
  try {
    const again = await cachedEvent(env.CHAT_DB,sessionId,eventId,now);
    if (again) return again.response;
    let reply;
    state.fields ||= {}; state.messages ||= []; state.calls ||= 0;
    if (action==='echo' || action==='human' || /^(stop|human|talk to (a )?(human|person|agent)|tao|kausap na tao)$/i.test(text.trim()) || /\b(delete my data|withdraw (my )?consent|stop processing|do not contact me)\b/i.test(text)) {
      state.paused=true;
      reply={text:channel==='website'?'AI replies are paused. Open Messenger to contact DMCI Explorer directly.':'AI replies are paused. Please wait for a human reply in this Messenger conversation.',paused:true};
    } else if (state.paused) {
      reply={text:'AI replies are paused for this conversation.',paused:true,silent:true};
    } else if (!state.consentAt || state.consentVersion!==CHAT_CONSENT_VERSION) {
      if (action==='consent' && input.consentVersion===CHAT_CONSENT_VERSION) {
        state.consentAt=new Date(now).toISOString(); state.consentVersion=CHAT_CONSENT_VERSION;
        reply={text:'Thanks. I’m DMCI Explorer’s AI inquiry assistant. I can collect your preferences; availability and prices need human confirmation. What name should we use?'};
      } else reply={text:`I’m DMCI Explorer’s AI inquiry assistant. Before we start:\n\n${CHAT_CONSENT_TEXT}\n\nChoose “I agree” to continue or “Human” to stop AI replies.`,needsConsent:true};
    } else if (action==='confirm') {
      if (!canSave(state.fields) || !state.reviewToken || (channel==='website' && input.reviewToken!==state.reviewToken)) throw new ChatError(409,'Please review the latest inquiry summary before saving.');
      if (!env.HUBSPOT_ACCESS_TOKEN || env.INQUIRIES_ENABLED!=='true') throw new ChatError(503,'CRM delivery is unavailable. Your details have not been confirmed as saved.');
      await saveContact(env,fetcher,{name:state.fields.name,phone:state.fields.phone||'',email:state.fields.email||'',project:state.fields.project||'',bedroom:state.fields.bedroom||'',floor:state.fields.floor||'',budget:state.fields.budget||'',message:summary(state.fields)},
        {onlyKnown:true,source:channel==='website'?'DMCI Explorer website chat':'DMCI Explorer Facebook Messenger',consentText:CHAT_CONSENT_TEXT,consentVersion:CHAT_CONSENT_VERSION,consentAt:state.consentAt});
      state.reviewToken=null;
      reply={text:'Your confirmed inquiry details were saved in HubSpot for DMCI Explorer to respond. This does not subscribe you to marketing.',saved:true};
    } else if (action==='message' && text.trim()) {
      if (input.timestamp && input.timestamp < (state.lastInputAt || 0)) {
        reply={text:'A newer message was already processed. Please restate any details you still want to change.'};
      } else {
        if (state.calls>=20) throw new ChatError(429,'This conversation has reached its AI limit. Please contact DMCI Explorer directly.');
        const dailyLimit = Math.min(10000,Math.max(1,Number(env.CHAT_DAILY_AI_CALL_LIMIT)||100));
        await takeQuota(env.CHAT_DB,`ai:${new Date(now).toISOString().slice(0,10)}`,dailyLimit,now+2*DAY);
        const result = await extractInquiry(env,state.messages,text,fetcher);
        state.calls++; state.lastInputAt=input.timestamp||now;
        if (result.intent==='human') {
          state.paused=true; reply={text:'AI replies are paused. Please contact DMCI Explorer directly on Messenger.',paused:true};
        } else {
          Object.assign(state.fields,result.fields);
          const prefix={projects:'You can ask about Erin Heights, The Oriana, The Calinea, One Delta Terraces, or The Cameron. Official specifications and availability need confirmation.',pricing:'I do not have verified prices, payment computations or live inventory. DMCI Explorer must confirm these for you.',viewing:'I can include a viewing request in your inquiry, but cannot book an appointment or confirm a time.',other:'I can help collect your home preferences for DMCI Explorer.'}[result.intent] || '';
          state.reviewToken=canSave(state.fields)?await digest(JSON.stringify(state.fields)+crypto.randomUUID()):null;
          reply={text:[prefix,question(state.fields,result.language),canSave(state.fields)?`Please review:\n${summary(state.fields)}\n\n${channel==='messenger'?'Reply SAVE to confirm these details for HubSpot, or tell me what to change.':'Use “Confirm and save” below, or tell me what to change.'}`:''].filter(Boolean).join('\n\n'),
            ...(state.reviewToken?{reviewToken:state.reviewToken,fields:state.fields}:{})};
        }
        state.messages=[...state.messages,{role:'user',text},{role:'assistant',text:reply.text}].slice(-10);
        while (state.messages.reduce((n,m)=>n+m.text.length,0)>10000) state.messages.shift();
      }
    } else throw new ChatError(400,'Please enter a message.');
    await finishSession(env.CHAT_DB,sessionId,lease,state,eventId,reply,now);
    return reply;
  } finally { await releaseSession(env.CHAT_DB,sessionId,lease); }
}
