// Freguês: deixa o painel instalável como app e mostra os avisos de pedido novo.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
// sem cache próprio: o painel sempre busca a versão mais nova
self.addEventListener("fetch", () => {});
// tocar no aviso abre (ou traz para frente) a tela de pedidos
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((ws) => {
      for (const w of ws) if ("focus" in w) return w.focus();
      return self.clients.openWindow("/#pedidos");
    }),
  );
});
