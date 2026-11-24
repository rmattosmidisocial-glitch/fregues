// Pixel da Meta na loja online: só liga quando o restaurante colou o ID do Pixel em Configurações.
// A compra usa o ID do pedido como event_id; o servidor manda o mesmo ID pela API de Conversões
// e a Meta junta os dois (conta uma compra só).

type Fbq = ((...a: unknown[]) => void) & { callMethod?: (...a: unknown[]) => void; queue?: unknown[]; loaded?: boolean; version?: string; push?: unknown };
declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
  }
}

const CHAVE = "fregues-meta";
const JANELA = 7 * 24 * 3600e3; // a Meta conta o clique por até 7 dias

/** Guarda de onde o cliente chegou (clique no anúncio e campanha), para o pedido levar essa origem. */
export function guardarOrigem() {
  try {
    const q = new URLSearchParams(window.location.search);
    const fbclid = q.get("fbclid");
    const utm_source = q.get("utm_source");
    if (!fbclid && !utm_source) return;
    const dados = { fbclid: fbclid ?? undefined, fbc: fbclid ? `fb.1.${Date.now()}.${fbclid}` : undefined, utm_source: utm_source ?? undefined, utm_medium: q.get("utm_medium") ?? undefined, utm_campaign: q.get("utm_campaign") ?? undefined, quando: Date.now() };
    localStorage.setItem(CHAVE, JSON.stringify(dados));
  } catch {
    /* sem armazenamento */
  }
}

function origemGuardada(): Record<string, string | number | undefined> {
  try {
    const g = JSON.parse(localStorage.getItem(CHAVE) || "null");
    if (g && Date.now() - g.quando < JANELA) return g;
  } catch {
    /* nada guardado */
  }
  return {};
}

const cookie = (n: string) =>
  document.cookie
    .split("; ")
    .find((c) => c.startsWith(n + "="))
    ?.split("=")[1];

/** O que vai para o servidor junto com o pedido (para a API de Conversões e a etiqueta "Veio da Meta"). */
export function rastreioDoPedido() {
  const g = origemGuardada();
  return { fbp: cookie("_fbp"), fbc: cookie("_fbc") || (g.fbc as string | undefined), fbclid: g.fbclid, utm_source: g.utm_source, utm_medium: g.utm_medium, utm_campaign: g.utm_campaign, url: window.location.href };
}
export const temOrigem = () => Object.keys(origemGuardada()).length > 0;

let iniciado = "";
/** Carrega o Pixel uma vez e conta a visita. */
export function iniciarPixel(id: string | null | undefined) {
  if (!id || !/^[0-9]{6,20}$/.test(id) || iniciado === id) return;
  iniciado = id;
  if (!window.fbq) {
    const f: Fbq = function (...a: unknown[]) {
      if (f.callMethod) f.callMethod(...a);
      else f.queue!.push(a);
    } as Fbq;
    f.push = f;
    f.loaded = true;
    f.version = "2.0";
    f.queue = [];
    window.fbq = f;
    window._fbq = f;
    const s = document.createElement("script");
    s.async = true;
    s.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(s);
  }
  window.fbq("init", id);
  window.fbq("track", "PageView");
}

/** Manda um evento padrão do Pixel (só se o Pixel estiver ligado). */
export function eventoMeta(nome: "ViewContent" | "AddToCart" | "InitiateCheckout" | "Purchase", dados: Record<string, unknown>, eventId?: string) {
  if (!iniciado || !window.fbq) return;
  window.fbq("track", nome, { currency: "BRL", ...dados }, eventId ? { eventID: eventId } : undefined);
}
