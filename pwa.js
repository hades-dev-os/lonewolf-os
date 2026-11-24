// LONEWOLF OS: install button, offline/online status, service worker
{
  const net = document.getElementById('netTxt');
  const dot = document.getElementById('sync');
  const ver = document.getElementById('verTxt');

  function showNet() {
    const on = navigator.onLine;
    net.textContent = on ? 'online' : 'offline mode';
    dot.classList.toggle('on', on);
    dot.title = on ? 'Online' : 'Offline: everything you added still works';
  }
  addEventListener('online', showNet);
  addEventListener('offline', showNet);
  showNet();

  // Install button (Chrome / Edge / Android)
  let deferred = null;
  const btn = document.getElementById('installBtn');
  addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; btn.hidden = false; });
  btn.addEventListener('click', async () => {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice;
    deferred = null; btn.hidden = true;
  });
  addEventListener('appinstalled', () => { btn.hidden = true; });

  // Service worker = offline engine
  if ('serviceWorker' in navigator) {
    let reloaded = false;
    const hadController = !!navigator.serviceWorker.controller; // only reload for UPDATES, not first install
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloaded || !hadController) return; reloaded = true; location.reload();
    });
    navigator.serviceWorker.register('sw.js').then(reg => {
      const ask = sw => { const ch = new MessageChannel(); ch.port1.onmessage = m => { ver.textContent = 'v' + m.data; }; sw.postMessage('version', [ch.port2]); };
      navigator.serviceWorker.ready.then(r => r.active && ask(r.active));
      setInterval(() => reg.update(), 60 * 60 * 1000); // check for updates hourly
    }).catch(() => { ver.textContent = 'offline engine unavailable'; });
  }
}
