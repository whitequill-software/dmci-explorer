import React from 'react';
import {test,expect,vi,afterEach} from 'vitest';
import {render,screen,cleanup,waitFor,act} from '@testing-library/react';
import {Turnstile} from '../src/Turnstile.jsx';
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
test('widget action, expiration, reset and cleanup invalidate consumed tokens',async()=>{
  let options;
  const api={render:vi.fn((container,config)=>{options=config;return 'widget-id'}),remove:vi.fn()};
  vi.stubGlobal('turnstile',api);
  const onToken=vi.fn();
  const view=render(<Turnstile onToken={onToken} resetKey={0} siteKey="public-test-key"/>);
  await waitFor(()=>expect(api.render).toHaveBeenCalledTimes(1));
  expect(options.action).toBe('inquiry');
  act(()=>options.callback('token'));expect(onToken).toHaveBeenLastCalledWith('token');
  act(()=>options['expired-callback']());expect(onToken).toHaveBeenLastCalledWith('');
  view.rerender(<Turnstile onToken={onToken} resetKey={1} siteKey="public-test-key"/>);
  await waitFor(()=>expect(api.render).toHaveBeenCalledTimes(2));
  expect(api.remove).toHaveBeenCalledWith('widget-id');
  act(()=>options['error-callback']());
  expect(screen.getByText(/Security check unavailable/)).toBeTruthy();
  view.unmount();expect(api.remove).toHaveBeenCalledTimes(2);
});
test('missing site key fails visibly',()=>{
  render(<Turnstile onToken={()=>{}} resetKey={0} siteKey=""/>);
  expect(screen.getByText(/Security check unavailable/)).toBeTruthy();
});
