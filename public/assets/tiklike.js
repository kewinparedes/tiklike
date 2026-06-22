// tiklike.js — cliente WebSocket compartido con reconexión automática.
window.TikLike = (function () {
  function connect(onMessage, onOpen) {
    let ws;
    let retry = 0;
    function open() {
      const proto = location.protocol === 'https:' ? 'wss' : 'ws';
      ws = new WebSocket(`${proto}://${location.host}/ws`);
      ws.onopen = () => {
        retry = 0;
        if (onOpen) onOpen();
      };
      ws.onmessage = (e) => {
        let msg;
        try { msg = JSON.parse(e.data); } catch { return; }
        onMessage(msg);
      };
      ws.onclose = () => {
        retry = Math.min(retry + 1, 10);
        setTimeout(open, 500 * retry);
      };
      ws.onerror = () => { try { ws.close(); } catch {} };
    }
    open();
    return { get socket() { return ws; } };
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  return { connect, escapeHtml };
})();
