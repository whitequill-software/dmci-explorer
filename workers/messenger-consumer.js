import {chatReady,runTurn} from '../server/chat/engine.js';
import {messengerSessionId,sendMessenger} from '../server/chat/messenger.js';
import {cachedEvent,markDelivered,purgeExpired} from '../server/chat/store.js';

export async function consumeMessage(message,env,fetcher=fetch,now=Date.now()) {
  if (!chatReady(env) || env.MESSENGER_CHAT_ENABLED!=='true' || !env.META_PAGE_ACCESS_TOKEN || !env.CHAT_IP_SALT) throw new Error('Messenger consumer is disabled or missing configuration');
  const event = message.body;
  if (typeof event?.psid!=='string' || !/^\d{1,30}$/.test(event.psid) || !Number.isFinite(event.timestamp) || event.timestamp>now+300000 || now-event.timestamp>=86400000) { message.ack(); return; }
  const sessionId = await messengerSessionId(event.psid,env);
  const prior = await cachedEvent(env.CHAT_DB,sessionId,event.eventId,now);
  if (!prior?.delivered) {
    const reply = prior?.response || await runTurn(env,{...event,sessionId,channel:'messenger'},fetcher,now);
    // A human's Page reply pauses the AI silently; don't answer the human's own message.
    if (event.action!=='echo' && !reply.silent) await sendMessenger(env,event.psid,reply,fetcher);
    await markDelivered(env.CHAT_DB,sessionId,event.eventId);
  }
  message.ack();
}
export default {
  async queue(batch,env) {
    for (const message of [...batch.messages].sort((a,b)=>(a.body.timestamp||0)-(b.body.timestamp||0))) {
      try { await consumeMessage(message,env); }
      catch (error) {
        // Log only operational status, never message bodies, identities or upstream errors.
        console.warn('dmci_messenger_retry', {status:Number(error.status)||502, attempt:message.attempts||1});
        message.retry({delaySeconds:30});
      }
    }
  },
  async scheduled(controller,env) { await purgeExpired(env.CHAT_DB); },
};
