import React,{useEffect,useRef,useState} from 'react';
import {MessageCircle,Send,X} from 'lucide-react';
import {Turnstile} from './Turnstile';
import {CHAT_CONSENT_TEXT,CHAT_CONSENT_VERSION} from './chat-consent.js';
import {channels} from './config.js';

export function InquiryChat({enabled=import.meta.env.VITE_CHAT_ENABLED==='true'}) {
  const [open,setOpen]=useState(false),[ready,setReady]=useState(false),[checked,setChecked]=useState(false),[consented,setConsented]=useState(false);
  const [messages,setMessages]=useState([]),[draft,setDraft]=useState(''),[sending,setSending]=useState(false),[error,setError]=useState('');
  const [token,setToken]=useState(''),[reset,setReset]=useState(0),[review,setReview]=useState(null),[paused,setPaused]=useState(false);
  const inFlight=useRef(false),retry=useRef(null),panel=useRef(null),launcher=useRef(null);
  useEffect(()=>{
    if (!enabled) return;
    let active=true;
    fetch('/api/chat/status').then(r=>r.ok?r.json():null).then(r=>{if(active)setReady(r?.enabled===true)}).catch(()=>{});
    return()=>{active=false};
  },[enabled]);
  useEffect(()=>{if(open)panel.current?.focus();},[open]);
  if (!enabled) return null;
  function close(){setOpen(false);requestAnimationFrame(()=>launcher.current?.focus());}
  async function send(action) {
    if(inFlight.current||!token||!ready||paused)return;
    const message=action==='message'?draft.trim():'';
    if(action==='message'&&!message)return;
    if(action==='consent'&&!checked)return;
    const signature=JSON.stringify({action,message,reviewToken:review?.reviewToken});
    const requestId=retry.current?.signature===signature?retry.current.requestId:crypto.randomUUID();
    retry.current={signature,requestId};inFlight.current=true;setSending(true);setError('');
    try {
      const response=await fetch('/api/chat',{
        method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',
        body:JSON.stringify({requestId,action,message,consent:action==='consent'&&checked,consentVersion:CHAT_CONSENT_VERSION,turnstileToken:token,website:'',reviewToken:review?.reviewToken}),signal:AbortSignal.timeout(60000),
      });
      let result;try{result=await response.json()}catch{throw new Error('We could not confirm your message was processed. Please retry.')}
      if(!response.ok||result.ok!==true)throw new Error(result.message||'Chat is unavailable. Please retry.');
      retry.current=null;
      setMessages(v=>[...v,...(message?[{role:'user',text:message}]:[]),{role:'assistant',text:result.text}].slice(-30));
      if(action==='consent'&&!result.needsConsent)setConsented(true);
      if(message)setDraft('');
      setReview(result.reviewToken?result:null);setPaused(result.paused===true);
      if(result.needsConsent){setConsented(false);setChecked(false)}
    } catch(e) {setError(e.name==='TimeoutError'||e instanceof TypeError?'We could not confirm processing. Your draft is still here. Complete a new security check and retry.':e.message)}
    finally{inFlight.current=false;setSending(false);setToken('');setReset(v=>v+1)}
  }
  return <div className="dmci-chat">
    <button ref={launcher} className="button primary chat-launcher" onClick={()=>setOpen(v=>!v)} aria-expanded={open} aria-controls="dmci-chat-panel"><MessageCircle size={18}/>Ask DMCI Explorer</button>
    {open&&<section id="dmci-chat-panel" className="chat-panel card" ref={panel} tabIndex={-1} aria-label="DMCI Explorer AI inquiry assistant" onKeyDown={e=>{if(e.key==='Escape')close()}}>
      <div className="chat-heading"><strong>DMCI Explorer · AI assistant</strong><button onClick={close} aria-label="Close AI chat"><X size={18}/></button></div>
      <p className="chat-disclosure">I can collect your home preferences. Prices, availability and viewing times need human confirmation.</p>
      {!ready?<p role="status">AI chat is not enabled yet. Please use Messenger.</p>:<>
        <div className="chat-messages" role="log" aria-label="Inquiry conversation" aria-live="polite">{messages.map((m,i)=><p key={i} className={'chat-message '+m.role}>{m.text}</p>)}</div>
        {!consented&&!paused&&<label className="chat-consent"><input type="checkbox" checked={checked} disabled={sending} onChange={e=>setChecked(e.target.checked)}/><span>{CHAT_CONSENT_TEXT}</span></label>}
        {error&&<p className="error" role="alert">{error}</p>}
        {!paused&&<Turnstile onToken={setToken} resetKey={reset} action="chat"/>}
        {!consented&&!paused?<button className="button primary" disabled={!checked||!token||sending} onClick={()=>send('consent')}>{sending?'Starting…':'I agree — start chat'}</button>:!paused&&<form aria-busy={sending} onSubmit={e=>{e.preventDefault();send('message')}}>
          <label htmlFor="chat-message">Your message<textarea id="chat-message" value={draft} onChange={e=>{setDraft(e.target.value);retry.current=null}} maxLength={2000} rows={3} disabled={sending} placeholder="Tell me what you’re looking for…"/></label>
          <button className="button primary" type="submit" disabled={sending||!token||!draft.trim()}><Send size={16}/>{sending?'Sending…':'Send'}</button>
          {review&&<button type="button" className="button secondary" disabled={sending||!token} onClick={()=>send('confirm')}>Confirm and save</button>}
        </form>}
        {sending&&<p role="status">Processing your message…</p>}
        {!paused&&<button className="text-link" disabled={sending||!token} onClick={()=>send('human')}>Stop AI replies</button>}
        {paused&&<p role="status">AI replies are paused.</p>}
      </>}
      <a className="text-link" href={channels.messenger} target="_blank" rel="noopener noreferrer">Contact DMCI Explorer on Messenger ↗</a>
    </section>}
  </div>;
}
