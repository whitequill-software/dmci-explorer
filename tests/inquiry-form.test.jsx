import React from 'react';
import {test, expect, vi, beforeEach, afterEach} from 'vitest';
import {render, screen, fireEvent, waitFor, cleanup} from '@testing-library/react';
vi.mock('react-dom/client',()=>({createRoot:()=>({render:()=>{}})}));
vi.mock('../src/Turnstile',()=>({Turnstile:({onToken})=><button type="button" onClick={()=>onToken('verified-token')}>Verify security</button>}));
import {App} from '../src/main.jsx';
beforeEach(()=>{
  vi.stubGlobal('IntersectionObserver',class {observe(){} disconnect(){}});
  HTMLDialogElement.prototype.close=vi.fn();
  HTMLDialogElement.prototype.showModal=vi.fn();
});
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
function fill(){
  fireEvent.change(screen.getByLabelText(/Full name/),{target:{value:'Cath Olivar'}});
  fireEvent.change(screen.getByLabelText(/Contact number/),{target:{value:'09171234567'}});
  fireEvent.click(screen.getByLabelText(/I consent to DMCI Explorer/));
  fireEvent.click(screen.getByText('Verify security'));
}
test('floor and budget use the existing form and submit the stated range verbatim',async()=>{
  let sent;
  vi.stubGlobal('fetch',vi.fn(async(url,options)=>{sent=JSON.parse(options.body);return new Response(JSON.stringify({ok:true}))}));
  render(<App/>);fill();
  fireEvent.change(screen.getByLabelText('Floor preference (optional)'),{target:{value:'High floor'}});
  fireEvent.change(screen.getByLabelText(/Budget \(optional\)/),{target:{value:'PHP 6–8 million total'}});
  fireEvent.click(screen.getByRole('button',{name:'Send Inquiry'}));
  await screen.findByText(/Thank you. Your inquiry has been received/);
  expect(sent.floor).toBe('High floor');expect(sent.budget).toBe('PHP 6–8 million total');
});
test('loading blocks repeat submission; confirmed success resets the draft and consent',async()=>{
  let resolve;
  const fetcher=vi.fn(()=>new Promise(r=>{resolve=r}));vi.stubGlobal('fetch',fetcher);
  render(<App/>);fill();fireEvent.click(screen.getByRole('button',{name:'Send Inquiry'}));
  expect(screen.getByRole('button',{name:'Sending…'}).disabled).toBe(true);
  expect(screen.getByLabelText(/Full name/).closest('fieldset').disabled).toBe(true);
  fireEvent.submit(screen.getByLabelText(/Full name/).closest('form'));
  expect(fetcher).toHaveBeenCalledTimes(1);
  resolve(new Response(JSON.stringify({ok:true})));
  await screen.findByText(/Thank you. Your inquiry has been received/);
  expect(screen.getByLabelText(/Full name/).value).toBe('');
  expect(screen.getByLabelText(/I consent to DMCI Explorer/).checked).toBe(false);
  expect(screen.getByRole('button',{name:'Send Inquiry'}).disabled).toBe(true);
});
test.each(['server','network','html'])('failure keeps draft and consent, reports failure, and requires a new security token: %s',async(kind)=>{
  vi.stubGlobal('fetch',vi.fn(async()=>{
    if(kind==='network')throw new TypeError('Failed to fetch');
    return kind==='html'?new Response('<html/>'):new Response(JSON.stringify({ok:false,message:'Inquiry delivery is unavailable.'}),{status:503});
  }));
  render(<App/>);fill();fireEvent.click(screen.getByRole('button',{name:'Send Inquiry'}));
  await waitFor(()=>expect(screen.queryByText('Sending your inquiry…')).toBeNull());
  expect(screen.getByLabelText(/Full name/).value).toBe('Cath Olivar');
  expect(screen.getByLabelText(/I consent to DMCI Explorer/).checked).toBe(true);
  expect(screen.getByRole('button',{name:'Send Inquiry'}).disabled).toBe(true);
  expect(screen.queryByText(/Thank you. Your inquiry has been received/)).toBeNull();
});
