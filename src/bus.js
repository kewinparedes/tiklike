// bus.js — reparte eventos en tiempo real a todos los overlays conectados por WebSocket.
const clients = new Set();

export function addClient(socket) {
  clients.add(socket);
}

export function removeClient(socket) {
  clients.delete(socket);
}

export function clientCount() {
  return clients.size;
}

export function broadcast(obj) {
  const msg = JSON.stringify(obj);
  for (const socket of clients) {
    // readyState 1 === OPEN
    if (socket.readyState === 1) {
      try {
        socket.send(msg);
      } catch {
        clients.delete(socket);
      }
    }
  }
}
