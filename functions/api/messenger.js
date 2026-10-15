import {json,readText,parseJson} from '../../server/chat/http.js';
import {chatReady} from '../../server/chat/engine.js';
import {verifyMetaSignature,messengerEvents} from '../../server/chat/messenger.js';

export async function handleMessenger(request,env) {
  const url = new URL(request.url);
  if (request.method==='GET') {
    if (env.META_VERIFY_TOKEN && url.searchParams.get('hub.mode')==='subscribe' && url.searchParams.get('hub.verify_token')===env.META_VERIFY_TOKEN && url.searchParams.get('hub.challenge')) {
      return new Response(url.searchParams.get('hub.challenge'),{headers:{'Content-Type':'text/plain','Cache-Control':'no-store'}});
    }
    return json(403,{ok:false});
  }
  if (request.method!=='POST') return json(405,{ok:false},{Allow:'GET, POST'});
  if (!chatReady(env) || env.MESSENGER_CHAT_ENABLED!=='true' || !env.CHAT_QUEUE || !env.META_APP_SECRET || !env.META_PAGE_ID || !env.META_APP_ID || !env.CHAT_IP_SALT) return json(503,{ok:false});
  try {
    const raw = await readText(request,262144);
    if (!await verifyMetaSignature(raw,request.headers.get('X-Hub-Signature-256'),env.META_APP_SECRET)) return json(403,{ok:false});
    const events = messengerEvents(parseJson(raw),env.META_PAGE_ID,env.META_APP_ID);
    // Durable queue acceptance precedes the 200 response. No long-running AI work in a webhook.
    for (let i=0;i<events.length;i+=100) await env.CHAT_QUEUE.sendBatch(events.slice(i,i+100).map(body=>({body})));
    return json(200,{ok:true});
  } catch (error) { return json(error.status || 503,{ok:false}); }
}
export const onRequest = ({request,env})=>handleMessenger(request,env);
