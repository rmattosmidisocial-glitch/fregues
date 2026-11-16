import { useEffect, useState } from "react";

export const ROTAS = ["inicio", "painel", "pedidos", "caixa", "salao", "atendimento", "mapa", "fregueses", "automacoes", "formularios", "links", "cardapio", "loja", "bio", "pesquisa", "admin", "mesa", "config", "termos", "privacidade", "redefinir", "relatorios"] as const;
export type Rota = (typeof ROTAS)[number];

// Endereço curto da loja (fregues.app/to-brocado ou to-brocado.dominio) sem # abre direto a loja do cliente
const enderecoDeLoja = (() => {
  try {
    const dom = ((import.meta.env.VITE_DOMINIO as string | undefined) || "").toLowerCase();
    const h = window.location.hostname.toLowerCase();
    const sub = dom && h.endsWith("." + dom) && !/^(www|app|painel|admin|api)\./.test(h);
    const seg = window.location.pathname.split("/")[1] || "";
    return !!sub || /^[a-z0-9-]{3,60}$/.test(seg);
  } catch {
    return false;
  }
})();

function ler(): Rota {
  const h = window.location.hash.replace("#", "");
  if (!h && enderecoDeLoja) return "loja";
  return (ROTAS as readonly string[]).includes(h) ? (h as Rota) : "inicio";
}

export function useRota() {
  const [rota, setRota] = useState<Rota>(ler);
  useEffect(() => {
    const on = () => {
      setRota(ler());
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return rota;
}

export const ir = (r: Rota) => {
  window.location.hash = r === "inicio" ? "" : r;
};
