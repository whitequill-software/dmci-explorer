import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {runTurn} from '../server/chat/engine.js';
import {validateExtraction,FIELD_LIMITS} from '../server/chat/model.js';
import {CHAT_CONSENT_VERSION} from '../src/chat-consent.js';
import {takeQuota,purgeExpired,DAY} from '../server/chat/store.js';
import {handleChat} from '../functions/api/chat/index.js';
import {handleMessenger} from '../functions/api/messenger.js';
import {verifyMetaSignature,messengerEvents,CONSENT_PAYLOAD} from '../server/chat/messenger.js';
import {consumeMessage} from '../workers/messenger-consumer.js';

function database() {
  const db=new DatabaseSync(':memory:');db.exec(readFileSync(new URL('../migrations/0001_chat.sql',import.meta.url),'utf8'));
  function statement(sql,args=[]) {
    return {bind:(...values)=>statement(sql,values),
      first:async()=>db.prepare(sql).get(...args)||null,
      run:async()=>({meta:{changes:Number(db.prepare(sql).run(...args).changes)}})};
  }
  return {prepare:statement,batch:async statements=>{
    db.exec('BEGIN');try{const results=[];for(const s of statements)results.push(await s.run());db.exec('COMMIT');return results}
    catch(e){db.exec('ROLLBACK');throw e}
  },raw:db};
}
const now=Date.now();
const sid='website:11111111-1111-4111-8111-111111111111';
const config=()=>({CHAT_DB:database(),CHAT_ENABLED:'true',WEBSITE_CHAT_ENABLED:'true',MESSENGER_CHAT_ENABLED:'true',APPROVED_CHAT_CONSENT_VERSION:CHAT_CONSENT_VERSION,OPENAI_API_KEY:'fake-ai-key',HUBSPOT_ACCESS_TOKEN:'fake-crm-key',INQUIRIES_ENABLED:'true',TURNSTILE_SECRET_KEY:'fake-turnstile-key',CHAT_IP_SALT:'fake-salt',META_PAGE_ID:'123',META_APP_ID:'456',META_PAGE_ACCESS_TOKEN:'fake-page-key',META_APP_SECRET:'fake-app-secret',META_VERIFY_TOKEN:'fake-verification-token',META_GRAPH_VERSION:'v24.0'});
const input=(eventId,extra={})=>({sessionId:sid,eventId,channel:'website',action:'message',text:'Hi',...extra});
const response=(body,status=200)=>new Response(JSON.stringify(body),{status});
const never=async()=>assert.fail('Unexpected network call');
const fields=(items={})=>({...Object.fromEntries(Object.keys(FIELD_LIMITS).map(k=>[k,null])),...Object.fromEntries(Object.entries(items).map(([k,value])=>[k,{value,evidence:value}]))});
const model=(f={},intent='collect')=>({status:'completed',output:[{type:'message',role:'assistant',content:[{type:'output_text',text:JSON.stringify({fields:fields(f),intent,language:'en'})}]}]});
const consent=env=>runTurn(env,input('consent',{action:'consent',consentVersion:CHAT_CONSENT_VERSION,text:''}),never,now);

test('no model/CRM access before explicit versioned consent; disabled chat fails closed',async()=>{
  const env=config();
  assert.equal((await runTurn(env,input('a'),never,now)).needsConsent,true);
  assert.equal((await runTurn(env,input('b',{action:'consent',consentVersion:'old'}),never,now)).needsConsent,true);
  await consent(env);
  await assert.rejects(runTurn({...env,CHAT_ENABLED:'false'},input('c'),never,now),e=>e.status===503);
});
test('extracts current-message facts, confirms exact summary before saving, keeps consent time/source, and deduplicates confirmations',async()=>{
  const env=config();await consent(env);
  const facts={name:'Cath Olivar',email:'cath@example.com',floor:'High floor',budget:'PHP 6–8 million total'};
  const text=Object.values(facts).join(', ');
  let calls=0;
  const fetcher=async(url,options)=>{
    calls++;
    if(url.includes('openai')) {
      const body=JSON.parse(options.body);assert.equal(body.store,false);assert.equal(body.text.format.strict,true);
      assert.equal(body.max_output_tokens,1200);assert.equal(body.model,'gpt-5.4-mini');
      return response(model(facts));
    }
    if(options.method==='GET')return response({},404);
    const values=JSON.parse(options.body).properties;
    assert.equal(values.dmci_floor,'High floor');assert.equal(values.dmci_budget,facts.budget);
    assert.equal(values.dmci_consent_version,CHAT_CONSENT_VERSION);
    assert.equal(values.dmci_consent_at,new Date(now).toISOString());
    assert.equal(values.dmci_source,'DMCI Explorer website chat');
    assert.equal('dmci_project' in values,false);assert.equal('phone' in values,false);
    return response({id:'7'});
  };
  const result=await runTurn(env,input('message',{text}),fetcher,now+1);
  assert.ok(result.reviewToken);assert.equal(calls,1,'Collection alone must not write CRM');
  await assert.rejects(runTurn(env,input('bad-confirm',{action:'confirm',reviewToken:'old'}),never,now+2),e=>e.status===409);
  const confirmed=input('confirmed',{action:'confirm',reviewToken:result.reviewToken});
  assert.equal((await runTurn(env,confirmed,fetcher,now+3)).saved,true);
  const callCount=calls;assert.equal((await runTurn(env,confirmed,never,now+4)).saved,true);assert.equal(calls,callCount);
});
test('missing evidence, unknown enums, invalid phones and extra keys cannot write facts',()=>{
  for(const malformed of [
    {fields:{...fields(),budget:{value:'PHP 8 million',evidence:'not said'}}},
    {fields:fields({floor:'Penthouse'})}, {fields:fields({phone:'12345678901234567890'})},
    {fields:{...fields(),contactId:{value:'1',evidence:'1'}}}, {admin:true,fields:fields()},
  ]) assert.throws(()=>validateExtraction({intent:'collect',language:'en',...malformed},'Penthouse 12345678901234567890 1'));
});
test('global quota and per-conversation limits block before AI calls',async()=>{
  const env=config();await consent(env);env.CHAT_DAILY_AI_CALL_LIMIT='1';
  await runTurn(env,input('one'),async()=>response(model()),now+1);
  await assert.rejects(runTurn(env,input('two'),never,now+2),e=>e.status===429);
  await takeQuota(env.CHAT_DB,'test',1,now+DAY);
  await assert.rejects(takeQuota(env.CHAT_DB,'test',1,now+DAY),e=>e.status===429);
  const state=JSON.parse(env.CHAT_DB.raw.prepare('SELECT state FROM chat_sessions WHERE id=?').get(sid).state);state.calls=20;
  env.CHAT_DB.raw.prepare('UPDATE chat_sessions SET state=? WHERE id=?').run(JSON.stringify(state),sid);
  await assert.rejects(runTurn(env,input('twenty'),never,now+3),e=>e.status===429);
});
test('failed/refused/incomplete model calls keep previous state, release lease, and cannot report saved',async()=>{
  const env=config();await consent(env);
  for(const result of [response({},401),response({status:'incomplete',output:[]}),response({status:'completed',output:[{type:'message',role:'assistant',content:[{type:'refusal'}]}]})]) {
    await assert.rejects(runTurn(env,input(crypto.randomUUID()),async()=>result,now+1));
    const row=env.CHAT_DB.raw.prepare('SELECT lease_until,state FROM chat_sessions WHERE id=?').get(sid);
    assert.equal(row.lease_until,0);assert.deepEqual(JSON.parse(row.state).fields,{});
  }
});
test('CRM failure never produces a saved receipt and leaves the review retryable',async()=>{
  const env=config();await consent(env);
  const facts={name:'Cath',email:'cath@example.com'};
  const review=await runTurn(env,input('details',{text:'Cath cath@example.com'}),async()=>response(model(facts)),now+1);
  await assert.rejects(runTurn(env,input('save',{action:'confirm',reviewToken:review.reviewToken}),async()=>response({},401),now+2));
  const state=JSON.parse(env.CHAT_DB.raw.prepare('SELECT state FROM chat_sessions WHERE id=?').get(sid).state);
  assert.equal(state.reviewToken,review.reviewToken);
  assert.equal(env.CHAT_DB.raw.prepare('SELECT COUNT(*) AS n FROM chat_events WHERE event_id=?').get('save').n,0);
});
test('human handoff pauses later AI calls; separate sessions remain isolated; expired context is purged',async()=>{
  const env=config();await consent(env);
  assert.equal((await runTurn(env,input('human',{action:'human'}),never,now+1)).paused,true);
  const later=await runTurn(env,input('later'),never,now+2);assert.equal(later.silent,true);
  const other=await runTurn(env,input('other',{sessionId:'website:22222222-2222-4222-8222-222222222222'}),never,now+3);
  assert.equal(other.needsConsent,true);
  await purgeExpired(env.CHAT_DB,now+2*DAY);
  assert.equal(env.CHAT_DB.raw.prepare('SELECT COUNT(*) AS n FROM chat_sessions').get().n,0);
  assert.equal(env.CHAT_DB.raw.prepare('SELECT COUNT(*) AS n FROM chat_events').get().n,0);
});
test('concurrent messages cannot overwrite a session being processed',async()=>{
  const env=config();await consent(env);
  let release,started;const ready=new Promise(r=>{started=r});
  const pending=runTurn(env,input('first'),async()=>{started();await new Promise(r=>{release=r});return response(model())},now+1);
  await ready;
  await assert.rejects(runTurn(env,input('second'),never,now+2),e=>e.status===409);
  release();await pending;
});
test('website endpoint enforces origin, versioned checkbox consent and hostname/action verification',async()=>{
  const env=config();const body={requestId:crypto.randomUUID(),action:'consent',message:'',consent:true,consentVersion:CHAT_CONSENT_VERSION,website:'',turnstileToken:'fake'};
  const req=(patch={},headers={})=>new Request('https://preview.example/api/chat',{method:'POST',headers:{Origin:'https://preview.example','Content-Type':'application/json',...headers},body:JSON.stringify({...body,...patch})});
  assert.equal((await handleChat(req({}, {Origin:'https://evil.example'}),env,never)).status,403);
  assert.equal((await handleChat(req({consent:false}),env,never)).status,400);
  assert.equal((await handleChat(req({website:'spam'}),env,never)).status,400);
  const bad=await handleChat(req(),env,async()=>response({success:true,hostname:'preview.example',action:'inquiry'}));assert.equal(bad.status,400);
  const good=await handleChat(req(),env,async()=>response({success:true,hostname:'preview.example',action:'chat'}));
  assert.equal(good.status,200);assert.match(good.headers.get('Set-Cookie'),/__Host-dmci-chat=.*HttpOnly; SameSite=Strict; Max-Age=86400; Secure/);
  assert.equal(good.headers.get('cache-control'),'no-store');
});
async function signature(raw,secret) {
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  return 'sha256='+Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(raw))),b=>b.toString(16).padStart(2,'0')).join('');
}
const metaBody=(extra={})=>({object:'page',entry:[{id:'123',messaging:[{sender:{id:'789'},recipient:{id:'123'},timestamp:now,message:{mid:'m_1',text:'Hi'},...extra}]}]});
test('Messenger HMAC verifies raw body; wrong page, own echoes and old events are filtered',async()=>{
  const raw=JSON.stringify(metaBody());const sig=await signature(raw,'secret');
  assert.equal(await verifyMetaSignature(raw,sig,'secret'),true);
  assert.equal(await verifyMetaSignature(raw+' ',sig,'secret'),false);
  assert.equal(await verifyMetaSignature(raw,'sha256=wrong','secret'),false);
  assert.equal(messengerEvents(metaBody(),'other','456',now).length,0);
  assert.equal(messengerEvents(metaBody({timestamp:now-DAY}),'123','456',now).length,0);
  assert.equal(messengerEvents(metaBody({sender:{id:'123'},recipient:{id:'789'},message:{mid:'echo',is_echo:true,app_id:456,text:'bot'}}),'123','456',now).length,0);
  assert.equal(messengerEvents(metaBody({sender:{id:'123'},recipient:{id:'789'},message:{mid:'echo',is_echo:true,text:'human'}}),'123','456',now)[0].action,'echo');
  assert.equal(messengerEvents(metaBody({message:{mid:'agree',text:'I agree',quick_reply:{payload:CONSENT_PAYLOAD}}}),'123','456',now)[0].action,'consent');
});
test('webhook verification challenge and durable enqueue precede acknowledgment',async()=>{
  const env=config();
  assert.equal(await (await handleMessenger(new Request('https://preview.example/api/messenger?hub.mode=subscribe&hub.verify_token=fake-verification-token&hub.challenge=challenge'),env)).text(),'challenge');
  let jobs=[];env.CHAT_QUEUE={sendBatch:async batch=>{jobs.push(...batch)}};
  const raw=JSON.stringify(metaBody());
  const req=async(sig)=>new Request('https://preview.example/api/messenger',{method:'POST',headers:{'X-Hub-Signature-256':sig},body:raw});
  assert.equal((await handleMessenger(await req('bad'),env)).status,403);assert.equal(jobs.length,0);
  const sig=await signature(raw,env.META_APP_SECRET);
  assert.equal((await handleMessenger(await req(sig),env)).status,200);assert.equal(jobs.length,1);
  env.CHAT_QUEUE.sendBatch=async()=>{throw new Error('Queue unavailable')};
  assert.equal((await handleMessenger(await req(sig),env)).status,503);
});
test('queue retries reuse response, acknowledged events do not resend, and human echoes pause silently',async()=>{
  const env=config();const body={psid:'789',eventId:'m_1',action:'message',text:'Hi',timestamp:now};
  let acks=0,sends=0;
  const item={body,ack:()=>{acks++}};
  const send=async(url,options)=>{sends++;assert.match(url,/graph.facebook.com/);assert.equal(JSON.parse(options.body).messaging_type,'RESPONSE');return response({message_id:'reply-1'})};
  await consumeMessage(item,env,send,now);await consumeMessage(item,env,never,now);
  assert.equal(acks,2);assert.equal(sends,1);
  await consumeMessage({body:{...body,eventId:'echo',action:'echo'},ack:()=>{}},env,never,now+1);
  await consumeMessage({body:{...body,eventId:'after-echo'},ack:()=>{}},env,never,now+2);
});
