import test from 'node:test';
import assert from 'node:assert/strict';
import {handleInquiry, saveContact} from '../functions/api/inquiries.js';
import {CONSENT_VERSION, CONSENT_TEXT, sendInquiry} from '../src/inquiry.js';

const env = {HUBSPOT_ACCESS_TOKEN:'test-only-token', TURNSTILE_SECRET_KEY:'test-only-secret', INQUIRIES_ENABLED:'true', APPROVED_CONSENT_VERSION:CONSENT_VERSION};
const valid = {name:'Cath Olivar', phone:'0917 123 4567', email:'CATH@example.com', project:'Erin Heights', bedroom:'2BR', message:'A viewing please', consent:true, consentVersion:CONSENT_VERSION, website:'', turnstileToken:'test-token'};
const response = (body, status=200) => new Response(JSON.stringify(body), {status});
function request(body=valid, init={}) {
  return new Request('https://preview.example/api/inquiries', {method:'POST', headers:{Origin:'https://preview.example','Content-Type':'application/json'}, body:JSON.stringify(body), ...init});
}
function mockSequence(sequence) {
  const calls=[];
  const fetcher=async (url, options) => {
    calls.push({url, ...options, data: options?.body && JSON.parse(options.body)});
    assert.ok(sequence.length, 'Unexpected network call');
    const item=sequence.shift();
    if (item instanceof Error) throw item;
    return response(item[0], item[1]);
  };
  return {calls, fetcher};
}
const verified = [{success:true, hostname:'preview.example', action:'inquiry'}];

test('creates normalized contact only after verification and stores exact consent evidence', async () => {
  const {calls,fetcher}=mockSequence([verified,[{},404],[{id:'123'}]]);
  const result=await handleInquiry(request(),env,fetcher);
  assert.equal(result.status,200);
  assert.deepEqual(await result.json(),{ok:true,message:'Your inquiry was received.'});
  assert.equal(result.headers.get('cache-control'),'no-store');
  assert.match(calls[1].url,/\/crm\/objects\/2026-09\/contacts\/cath%40example.com\?idProperty=email$/);
  const values=calls[2].data.properties;
  assert.equal(values.phone,'+639171234567');
  assert.equal(values.email,'cath@example.com');
  assert.equal(values.dmci_consent_text,CONSENT_TEXT);
  assert.equal(values.dmci_consent_version,CONSENT_VERSION);
  assert.equal(values.dmci_consent,'true');
  assert.ok(!Number.isNaN(Date.parse(values.dmci_consent_at)));
  assert.equal(values.dmci_message,valid.message);
  assert.equal(calls[2].headers.Authorization,'Bearer test-only-token');
});
test('rejects malformed, oversized, non-string, invalid choices and non-explicit consent before networking', async () => {
  for(const patch of [{consent:false},{consent:'true'},{consentVersion:'old'},{email:'bad@'},{name:{}},{phone:3},{project:'invented'},{bedroom:'5BR'},{message:'x'.repeat(3001)},{turnstileToken:''},{website:'bot'}]) {
    const {fetcher,calls}=mockSequence([]);
    assert.equal((await handleInquiry(request({...valid,...patch}),env,fetcher)).status,400);
    assert.equal(calls.length,0);
  }
  for(const body of ['{', 'x'.repeat(16385)]) {
    const result=await handleInquiry(request(valid,{body}),env,async()=>assert.fail());
    assert.equal(result.status,body==='{'?400:413);
  }
});
test('method, origin, content type and activation gate fail closed', async () => {
  for(const [req,config,status] of [
    [request(valid,{method:'GET',body:undefined}),env,405],
    [request(valid,{headers:{Origin:'https://evil.example','Content-Type':'application/json'}}),env,403],
    [request(valid,{headers:{'Content-Type':'application/json'}}),env,403],
    [request(valid,{headers:{Origin:'https://preview.example','Content-Type':'text/plain'}}),env,415],
    [request(),{},503],[request(),{...env,APPROVED_CONSENT_VERSION:'old'},503],
  ]) assert.equal((await handleInquiry(req,config,async()=>assert.fail())).status,status);
});
test('Turnstile failures, hostname/action mismatches and verification outages never reach CRM', async () => {
  for(const result of [[{success:false}],[{success:true,hostname:'evil.example',action:'inquiry'}],[{success:true,hostname:'preview.example',action:'login'}],[{},500]]) {
    const {fetcher,calls}=mockSequence([result]);
    assert.notEqual((await handleInquiry(request(),env,fetcher)).status,200);
    assert.equal(calls.length,1);
  }
});
test('updates existing email contact and recovers concurrent email creation conflict', async () => {
  for(const sequence of [[[{id:'123'}],[{id:'123'}]], [[{},404],[{},409],[{id:'123'}],[{id:'123'}]]]) {
    const {calls,fetcher}=mockSequence(sequence);
    await saveContact(env,fetcher,valid);
    assert.equal(calls.at(-1).method,'PATCH');
    assert.match(calls.at(-1).url,/\/123$/);
  }
});
test('phone-only inquiries use unique identity, find older contacts and recover a create race', async () => {
  const body={...valid,email:''};
  for(const sequence of [
    [[{},404],[{total:0,results:[]}],[{id:'7'}]],
    [[{},404],[{total:1,results:[{id:'7'}]}],[{id:'7'}]],
    [[{},404],[{total:0,results:[]}],[{},409],[{id:'7'}],[{id:'7'}]],
  ]) {
    const {calls,fetcher}=mockSequence(sequence);
    await saveContact(env,fetcher,body);
    assert.match(calls[0].url,/idProperty=dmci_phone_identity/);
    assert.equal(calls.at(-1).data.properties.dmci_phone_identity,'+639171234567');
    assert.equal('email' in calls.at(-1).data.properties,false);
  }
  const {fetcher,calls}=mockSequence([[{},404],[{total:2,results:[{id:'1'},{id:'2'}]}]]);
  await assert.rejects(saveContact(env,fetcher,body));
  assert.equal(calls.length,2);
});
test('upstream auth, rate limits, malformed responses, server errors and timeouts never report success or leak details', async () => {
  for(const upstream of [[{secret:'private-details'},401],[{},403],[{},429],[{},500],[{}],new DOMException('token-secret','TimeoutError')]) {
    const {fetcher}=mockSequence([verified,[{},404],upstream]);
    const result=await handleInquiry(request(),env,fetcher);
    assert.equal(result.status,upstream[1]===429?503:502);
    const body=await result.text();
    assert.doesNotMatch(body,/private-details|token-secret|test-only-token|CATH/);
    assert.match(body,/"ok":false/);
  }
});
test('browser submits same-origin JSON and treats non-confirmation as failure', async () => {
  let submitted;
  await sendInquiry(valid,'token',async (url,options)=>{submitted={url,options};return response({ok:true});});
  assert.equal(submitted.url,'/api/inquiries');
  assert.equal(JSON.parse(submitted.options.body).consentVersion,CONSENT_VERSION);
  for(const result of [response({ok:false,message:'Unavailable'},503),response({}),new Response('<html/>')]) {
    await assert.rejects(sendInquiry(valid,'token',async()=>result));
  }
});

test('optional floor and budget are validated and mapped without clearing omitted preferences', async () => {
  const first=mockSequence([verified,[{},404],[{id:'123'}]]);
  assert.equal((await handleInquiry(request({...valid,floor:'High floor',budget:'PHP 6–8 million total'}),env,first.fetcher)).status,200);
  assert.equal(first.calls.at(-1).data.properties.dmci_floor,'High floor');
  assert.equal(first.calls.at(-1).data.properties.dmci_budget,'PHP 6–8 million total');
  const blank=mockSequence([verified,[{id:'123'}],[{id:'123'}]]);
  assert.equal((await handleInquiry(request(valid),env,blank.fetcher)).status,200);
  assert.equal('dmci_floor' in blank.calls.at(-1).data.properties,false);
  assert.equal('dmci_budget' in blank.calls.at(-1).data.properties,false);
  for(const patch of [{floor:'Penthouse'},{budget:'x'.repeat(201)},{budget:12345}]) {
    assert.equal((await handleInquiry(request({...valid,...patch}),env,async()=>assert.fail())).status,400);
  }
});
