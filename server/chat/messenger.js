import {CHAT_CONSENT_VERSION} from '../../src/chat-consent.js';
import {ChatError,digest} from './http.js';
export const CONSENT_PAYLOAD = 'DMCI_AGREE_'+CHAT_CONSENT_VERSION;
export async function verifyMetaSignature(raw,signature,secret) {
  if (!secret || !/^sha256=[a-f0-9]{64}$/i.test(signature || '')) return false;
  const key = await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);
  const bytes = Uint8Array.from(signature.slice(7).match(/../g),hex=>parseInt(hex,16));
  return crypto.subtle.verify('HMAC',key,bytes,new TextEncoder().encode(raw));
}
export function messengerEvents(body,pageId,appId,now=Date.now()) {
  if (body?.object!=='page' || !Array.isArray(body.entry)) throw new ChatError(400,'Invalid Messenger event.');
  const events=[];
  for (const entry of body.entry) {
    if (entry.id!==pageId) continue;
    for (const event of entry.messaging || []) {
      const echo = event.message?.is_echo===true;
      if (echo && String(event.message.app_id)===appId) continue;
      const psid = echo?event.recipient?.id:event.sender?.id;
      if (!/^\d{1,30}$/.test(psid || '') || psid===pageId) continue;
      if ((echo?event.sender?.id:event.recipient?.id)!==pageId || !Number.isFinite(event.timestamp) || event.timestamp>now+300000 || now-event.timestamp>=86400000) continue;
      const eventId = event.message?.mid || event.postback?.mid;
      if (typeof eventId!=='string' || !eventId || eventId.length>250) continue;
      const text = event.message?.text || '';
      const payload = event.message?.quick_reply?.payload || event.postback?.payload;
      let action = echo?'echo':payload===CONSENT_PAYLOAD?'consent':payload==='DMCI_HUMAN'?'human':/^SAVE$/i.test(text.trim())?'confirm':'message';
      if (action==='message' && (!text.trim() || text.length>2000)) continue;
      events.push({eventId,psid,text:echo?'':text.slice(0,2000),action,timestamp:event.timestamp,consentVersion:action==='consent'?CHAT_CONSENT_VERSION:undefined});
    }
  }
  return events;
}
export const messengerSessionId = async (psid,env)=>'messenger:'+await digest(env.CHAT_IP_SALT+env.META_PAGE_ID+':'+psid);
export async function sendMessenger(env,psid,reply,fetcher=fetch) {
  if (!/^v\d+\.\d+$/.test(env.META_GRAPH_VERSION || '')) throw new ChatError(503,'Configure the Meta Graph API version.');
  const quickReplies = reply.needsConsent ? [
    {content_type:'text',title:'I agree',payload:CONSENT_PAYLOAD},
    {content_type:'text',title:'Human',payload:'DMCI_HUMAN'},
  ] : reply.paused ? undefined : [{content_type:'text',title:'Human',payload:'DMCI_HUMAN'}];
  const response = await fetcher(`https://graph.facebook.com/${env.META_GRAPH_VERSION}/${env.META_PAGE_ID}/messages`,{
    method:'POST',headers:{Authorization:`Bearer ${env.META_PAGE_ACCESS_TOKEN}`,'Content-Type':'application/json'},
    body:JSON.stringify({recipient:{id:psid},messaging_type:'RESPONSE',message:{text:reply.text.slice(0,1950),...(quickReplies?{quick_replies:quickReplies}:{})}}),signal:AbortSignal.timeout(7000),redirect:'error',
  });
  if (!response.ok) throw new ChatError(502,'Messenger delivery was not confirmed.');
  const result = await response.json(); if (!result.message_id) throw new ChatError(502,'Messenger delivery was not confirmed.');
}
