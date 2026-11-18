const CACHE="social-m20-v4";
self.addEventListener("install",()=>{self.skipWaiting();});
self.addEventListener("activate",(e)=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(n=>n!==CACHE).map(n=>caches.delete(n)))).then(()=>self.clients.claim()));});
// rede primeiro (sempre pega a versão nova após deploy); cache só como fallback offline
self.addEventListener("fetch",(e)=>{
  const r=e.request;
  if(r.method!=="GET"||r.url.includes("/api/")||!r.url.startsWith(self.location.origin))return;
  e.respondWith(fetch(r).then(res=>{const c=res.clone();caches.open(CACHE).then(ca=>ca.put(r,c));return res;}).catch(()=>caches.match(r).then(m=>m||caches.match("/index.html"))));
});
