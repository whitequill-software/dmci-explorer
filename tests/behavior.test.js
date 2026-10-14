import test from 'node:test';
import assert from 'node:assert/strict';
import {filterProperties,validateInquiry,articles,properties} from '../src/data.js';
import {trustedFacebookUrl} from '../src/config.js';
test('only the five supplied projects appear; unsupported layouts never imply inventory',()=>{
 assert.equal(filterProperties('All locations','All layouts').length,5);
 assert.equal(filterProperties('Quezon City','All layouts').length,3);
 assert.deepEqual(filterProperties('All locations','2BR'),[]);
 assert.deepEqual(filterProperties('Quezon City','3BR'),[]);
 assert.deepEqual(filterProperties('Unknown city','All layouts'),[]);
 assert.deepEqual(filterProperties('Location pending','All layouts').map(p=>p.name),['One Delta Terraces','The Cameron']);
 assert.equal(properties.filter(p=>!p.location).length,2);
});
test('inquiry requires a real-looking name, phone and explicit consent',()=>{
 assert.deepEqual(Object.keys(validateInquiry({})).sort(),['consent','name','phone']);
 assert.deepEqual(validateInquiry({name:'Cath Olivar',phone:'+63 917 123 4567',email:'cath@example.com',consent:true}),{});
 assert.ok(validateInquiry({name:'  ',phone:'abcdef1234567890',consent:false}).phone);
 assert.ok(validateInquiry({name:'Cath',phone:'09171234567',email:'bad@',consent:true}).email);
 assert.deepEqual(validateInquiry({name:'Cath',phone:'09171234567',email:'',consent:true}),{});
});
test('article navigation identifiers are unique',()=>assert.equal(new Set(articles.map(a=>a.slug)).size,3));
test('contact configuration accepts only HTTPS Facebook or Messenger destinations',()=>{
 assert.equal(trustedFacebookUrl('https://m.me/dmciexplorer','fallback'),'https://m.me/dmciexplorer');
 for(const url of ['javascript:alert(1)','https://facebook.com.evil.example/dmci','http://m.me/dmci','https://user:password@facebook.com/dmci'])assert.equal(trustedFacebookUrl(url,'fallback'),'fallback');
});
