// LONEWOLF OS: install button, offline/online status, service worker
{
  const net = document.getElementById('netTxt');
  const dot = document.getElementById('sync');
  const ver = document.getElementById('verTxt');

  function showNet() {
    const on = navigator.onLine;
    let last = 0; try { last = +localStorage.getItem('lw-lastsync') || 0; } catch (e) {}
    const t = last ? ' · synced ' + new Date(last).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    net.textContent = (on ? 'online' : 'offline mode') + t;
    dot.classList.toggle('on', on);
    dot.title = on ? 'Online' : 'Offline: everything you added still works';
  }
  addEventListener('online', showNet);
  addEventListener('offline', showNet);
  addEventListener('lw-synced', showNet);
  showNet();

  // Install button (Chrome / Edge / Android)
  const installed = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  let deferred = null;
  const btn = document.getElementById('installBtn');
  addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; if (!installed) btn.hidden = false; });
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
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(reg => {
      const ask = sw => { const ch = new MessageChannel(); ch.port1.onmessage = m => { ver.textContent = 'v' + m.data; }; sw.postMessage('version', [ch.port2]); };
      navigator.serviceWorker.ready.then(r => r.active && ask(r.active));
      setInterval(() => reg.update(), 60 * 60 * 1000); // check for updates hourly
    }).catch(() => { ver.textContent = 'offline engine unavailable'; });
  }
}

// Make sure hidden buttons really stay hidden (CSS was overriding it)
document.head.insertAdjacentHTML('beforeend', '<style>[hidden]{display:none!important}</style>');
