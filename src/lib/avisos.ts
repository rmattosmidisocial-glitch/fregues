// App instalável e avisos de pedido novo (notificação do celular/computador).

let instalar: (Event & { prompt: () => Promise<void> }) | null = null;
let ouvintes: (() => void)[] = [];
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    instalar = e as typeof instalar;
    ouvintes.forEach((f) => f());
  });
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined);
}

export const podeInstalar = () => !!instalar;
export const jaInstalado = () => typeof window !== "undefined" && (window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true);
export const quandoPuderInstalar = (f: () => void) => {
  ouvintes.push(f);
  return () => {
    ouvintes = ouvintes.filter((x) => x !== f);
  };
};
export async function instalarApp() {
  if (!instalar) return false;
  await instalar.prompt();
  instalar = null;
  return true;
}

export const avisosSuportados = () => typeof window !== "undefined" && "Notification" in window;
export const avisosLigados = () => avisosSuportados() && Notification.permission === "granted";
export async function pedirAvisos() {
  if (!avisosSuportados()) return "nao_suporta" as const;
  const r = await Notification.requestPermission();
  return r;
}

/** Mostra o aviso do sistema (funciona com a tela de Pedidos aberta, mesmo em outra aba ou minimizada). */
export async function avisar(titulo: string, corpo: string) {
  if (!avisosLigados()) return;
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) await reg.showNotification(titulo, { body: corpo, icon: "/icones/icone-192.png", badge: "/icones/icone-192.png", tag: "pedido-" + Date.now() });
    else new Notification(titulo, { body: corpo, icon: "/icones/icone-192.png" });
  } catch {
    /* sem aviso */
  }
}
