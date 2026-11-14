// Monitor de erros: o que quebrar no navegador de alguém (painel, loja, admin) é registrado
// no banco para o administrador ver em Configurações > Erros. Sem dado pessoal: só a mensagem, a tela e o navegador.
import { supabase, SLUG } from "../data/dados";

const enviados = new Set<string>();
let contagem = 0;

export function registrarErro(e: unknown, origem = "navegador", pilha?: string) {
  try {
    if (!supabase) return;
    const msg = (e instanceof Error ? e.message : String(e ?? "")).slice(0, 500);
    if (!msg || /ResizeObserver loop|Script error\.?$|AbortError|Load failed$|Failed to fetch$/i.test(msg)) return;
    const chave = origem + msg;
    if (enviados.has(chave) || contagem >= 10) return; // no máximo 10 por visita, sem repetir
    enviados.add(chave);
    contagem++;
    const rota = (location.hash.replace("#", "") || "inicio").slice(0, 40);
    supabase
      .rpc("registrar_erro", {
        p_origem: origem,
        p_mensagem: msg,
        p_pilha: (pilha ?? (e instanceof Error ? e.stack : "") ?? "").slice(0, 2000),
        p_rota: rota,
        p_loja: SLUG || null,
        p_navegador: navigator.userAgent.slice(0, 200),
        p_versao: import.meta.env.VITE_VERSAO ?? "",
      })
      .then(
        () => {},
        () => {},
      );
  } catch {
    /* o monitor nunca derruba a tela */
  }
}

export function iniciarMonitor() {
  window.addEventListener("error", (ev) => registrarErro(ev.error ?? ev.message, "navegador"));
  window.addEventListener("unhandledrejection", (ev) => registrarErro(ev.reason, "promessa"));
}
