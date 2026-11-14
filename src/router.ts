import { useEffect, useState } from "react";

export const ROTAS = ["inicio", "painel", "pedidos", "caixa", "salao", "atendimento", "mapa", "fregueses", "automacoes", "formularios", "links", "cardapio", "loja", "bio", "pesquisa", "admin", "mesa", "config", "termos", "privacidade", "redefinir"] as const;
export type Rota = (typeof ROTAS)[number];

function ler(): Rota {
  const h = window.location.hash.replace("#", "");
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
