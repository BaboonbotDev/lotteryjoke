const CACHE='chan-ja-sue-huay-thuk-nguat-v1.5.1';
const ASSETS=['./','index.html','styles.css','app.js','manifest.webmanifest','data/lottery.json','data/model.json','assets/hero.webp','assets/splash.webp','assets/icon-192.png','assets/icon-512.png','assets/siamsee-stage.webp','assets/tamarind-stage.webp'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=='GET'||url.pathname.includes('/api/')||request.headers.has('range'))return;
  event.respondWith(fetch(request).then(response=>{
    if(response.ok&&response.status===200&&response.type!=='opaque'){
      const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(request,copy)).catch(()=>{});
    }
    return response;
  }).catch(async()=>{
    const cached=await caches.match(request);
    if(cached)return cached;
    if(request.mode==='navigate')return caches.match('index.html');
    throw new Error('offline and not cached');
  }));
});
