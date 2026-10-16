import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from '../server.mjs';
test('preview delivers UI and assets while paid APIs and private source stay inaccessible',async()=>{const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));try{const base='http://127.0.0.1:'+server.address().port;for(const path of ['/','/app.mjs','/styles.css','/assets/icon.svg']){const r=await fetch(base+path);assert.equal(r.status,200,path)}assert.equal((await (await fetch(base+'/api/google/status')).json()).configured,false);assert.equal((await fetch(base+'/api/google/places',{method:'POST'})).status,503);assert.equal((await fetch(base+'/lib/google.mjs')).status,404)}finally{await new Promise(r=>server.close(r))}})
