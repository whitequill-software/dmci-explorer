import {CHAT_CONSENT_VERSION} from '../../../src/chat-consent.js';
import {chatReady,runTurn} from '../../../server/chat/engine.js';
import {ChatError,json,readText,parseJson,digest} from '../../../server/chat/http.js';
import {DAY,takeQuota} from '../../../server/chat/store.js';

export async function handleChat(request,env,fetcher=fetch) {
  if (request.method!=='POST') return json(405,{ok:false,message:'Use POST.'},{Allow:'POST'});
  const url = new URL(request.url);
  if (request.headers.get('origin')!==url.origin || request.headers.get('sec-fetch-site')==='cross-site') return json(403,{ok:false,message:'Open chat from this website.'});
  if (request.headers.get('content-type')?.split(';')[0].trim()!=='application/json') return json(415,{ok:false,message:'JSON is required.'});
  if (!chatReady(env) || env.WEBSITE_CHAT_ENABLED!=='true' || !env.TURNSTILE_SECRET_KEY || !env.CHAT_IP_SALT) return json(503,{ok:false,message:'Website AI chat is not enabled yet. Please use Messenger.'});
  try {
    const body = parseJson(await readText(request));
    if (!body || typeof body!=='object' || Array.isArray(body) || !['message','consent','confirm','human'].includes(body.action) || typeof body.requestId!=='string' || !/^[a-f0-9-]{36}$/i.test(body.requestId) || typeof body.message!=='string' || body.message.length>2000 || typeof body.turnstileToken!=='string' || !body.turnstileToken || body.turnstileToken.length>2048 || body.website!=='') throw new ChatError(400,'Check your chat message and security check.');
    if (body.action==='consent' && (body.consent!==true || body.consentVersion!==CHAT_CONSENT_VERSION)) throw new ChatError(400,'Please review and explicitly accept the chat consent.');
    const now = Date.now();
    const ip = request.headers.get('CF-Connecting-IP') || 'local';
    const ipHash = await digest(env.CHAT_IP_SALT+ip);
    await takeQuota(env.CHAT_DB,`ip:${ipHash}:${Math.floor(now/3600000)}`,30,now+DAY);
    const verifiedResponse = await fetcher('https://challenges.cloudflare.com/turnstile/v0/siteverify',{
      method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({secret:env.TURNSTILE_SECRET_KEY,response:body.turnstileToken,remoteip:ip==='local'?undefined:ip}),signal:AbortSignal.timeout(7000),redirect:'error',
    });
    if (!verifiedResponse.ok) throw new ChatError(502,'Security check unavailable. Please retry.');
    const verified = await verifiedResponse.json();
    if (verified.success!==true || verified.hostname!==url.hostname || verified.action!=='chat') throw new ChatError(400,'Security check expired or failed. Please complete it again.');
    const secure = url.protocol==='https:';
    const cookieName = secure?'__Host-dmci-chat':'dmci-chat-local';
    const cookie = (request.headers.get('cookie') || '').split(';').map(s=>s.trim()).find(s=>s.startsWith(cookieName+'='))?.slice(cookieName.length+1);
    const id = cookie && /^[a-f0-9-]{36}$/i.test(cookie) ? cookie : crypto.randomUUID();
    const result = await runTurn(env,{sessionId:`website:${id}`,eventId:body.requestId,channel:'website',action:body.action,text:body.message,consentVersion:body.consentVersion,reviewToken:body.reviewToken},fetcher,now);
    return json(200,{ok:true,...result},{'Set-Cookie':`${cookieName}=${id}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400${secure?'; Secure':''}`});
  } catch (error) {
    return json(error instanceof ChatError?error.status:502,{ok:false,message:error instanceof ChatError?error.message:'We could not confirm that message was processed. Please retry or contact us on Messenger.'});
  }
}
export const onRequest = ({request,env})=>handleChat(request,env);
