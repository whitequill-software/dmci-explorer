import React from 'react';
import {test,expect,vi,afterEach} from 'vitest';
import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
vi.mock('../src/Turnstile',()=>({Turnstile:({onToken,action})=><button onClick={()=>onToken('verified-chat-token')}>Verify {action}</button>}));
import {InquiryChat} from '../src/InquiryChat.jsx';
afterEach(()=>{cleanup();vi.unstubAllGlobals()});
const response=body=>new Response(JSON.stringify(body));
async function start(){
  render(<InquiryChat enabled/>);fireEvent.click(screen.getByRole('button',{name:'Ask DMCI Explorer'}));
  const checkbox=await screen.findByRole('checkbox');fireEvent.click(checkbox);
  fireEvent.click(screen.getByText('Verify chat'));fireEvent.click(screen.getByRole('button',{name:'I agree — start chat'}));
  await screen.findByLabelText('Your message');
}
test('website chat is hidden by default and disabled status has an honest Messenger fallback',async()=>{
  const fetcher=vi.fn(async()=>response({enabled:false}));vi.stubGlobal('fetch',fetcher);
  const view=render(<InquiryChat enabled={false}/>);expect(fetcher).not.toHaveBeenCalled();
  view.rerender(<InquiryChat enabled/>);fireEvent.click(screen.getByText('Ask DMCI Explorer'));
  expect(screen.getByText(/AI chat is not enabled yet/)).toBeTruthy();
});
test('requires unchecked consent; message failures retain draft and confirmed save receipt comes from server',async()=>{
  const calls=[];let failed=true;
  vi.stubGlobal('fetch',vi.fn(async(url,options)=>{
    if(url.endsWith('/status'))return response({enabled:true});
    const body=JSON.parse(options.body);calls.push(body);
    if(body.action==='consent')return response({ok:true,text:'What name should we use?'});
    if(body.action==='confirm')return response({ok:true,text:'Saved in HubSpot.',saved:true});
    if(failed)throw new TypeError('Offline');
    return response({ok:true,text:'Please review: High floor, PHP 6 million total',reviewToken:'current-summary',fields:{floor:'High floor'}});
  }));
  await start();expect(calls[0].consent).toBe(true);
  fireEvent.change(screen.getByLabelText('Your message'),{target:{value:'High floor, PHP 6 million total'}});
  fireEvent.click(screen.getByText('Verify chat'));fireEvent.click(screen.getByRole('button',{name:'Send'}));
  await screen.findByRole('alert');expect(screen.getByLabelText('Your message').value).toBe('High floor, PHP 6 million total');
  const requestId=calls[1].requestId;failed=false;
  fireEvent.click(screen.getByText('Verify chat'));fireEvent.click(screen.getByRole('button',{name:'Send'}));
  await screen.findByRole('button',{name:'Confirm and save'});expect(calls[2].requestId).toBe(requestId);
  fireEvent.click(screen.getByText('Verify chat'));fireEvent.click(screen.getByText('Confirm and save'));
  await screen.findByText('Saved in HubSpot.');expect(calls[3].reviewToken).toBe('current-summary');
  expect(screen.queryByText('Confirm and save')).toBeNull();
});
