import { useEffect } from "react";
import { SLUG, supabase } from "./dados";
import { crescer, persistir, type Botao, type PaginaLinks } from "./crescer";

/** Endereço público da página de links desta loja. */
export const linkBio = () => `${location.origin}/?r=${encodeURIComponent(SLUG)}#bio`;

/** Converte o destino guardado no botão no endereço de verdade. "#loja" = loja; "form:<id>" = formulário. */
/** Botões antigos guardavam "/loja" e "/f/reserva"; converte para o formato atual. */
export function normalizarUrl(url: string, tipo?: string) {
  if (url === "/loja" || url === "/cardapio") return tipo === "cardapio" ? "#cardapio" : "#loja";
  if (url.startsWith("/f/")) return "form:";
  return url;
}

export function destino(url: string) {
  url = normalizarUrl(url);
  const base = `${location.origin}/?r=${encodeURIComponent(SLUG)}`;
  if (url === "form:") return `${base}&o=bio#loja`;
  if (url === "#loja" || url === "#cardapio") return `${base}&o=bio#loja`;
  if (url.startsWith("form:")) return `${base}&f=${url.slice(5)}#pesquisa`;
  if (url.startsWith("#")) return `${base}${url}`;
  if (url.startsWith("/")) return `${location.origin}${url}`;
  if (url && !/^https?:\/\//.test(url) && !url.startsWith("mailto:")) return "https://" + url;
  return url;
}

type Linha = { endereco: string; titulo: string; bio: string | null; tema: PaginaLinks["tema"]; botoes: Omit<Botao, "cliques">[] };

const enderecoDe = (slug: string) => {
  const e = slug.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 32);
  return e.length >= 3 ? e : `loja-${e}`;
};

/** Painel da loja real: carrega a página de links, os toques e as vendas, e grava cada mudança. */
export function useLinksPainel(lojaId: string | undefined, ativo: boolean, lojaNome: string, lojaBairro: string) {
  useEffect(() => {
    if (!supabase || !lojaId || !ativo) return;
    const sb = supabase;
    let vivo = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let endereco = "";
    crescer.carregarLinks({ endereco: "", titulo: lojaNome, bio: "", tema: "brasa", botoes: [], visitas: 0, pedidos: 0, receita: 0, cliquesDia: Array(30).fill(0) });

    (async () => {
      let { data: pg } = await sb.from("link_pages").select("endereco,titulo,bio,tema,botoes").eq("store_id", lojaId).maybeSingle();
      if (!pg) {
        const { data: fs } = await sb.from("forms").select("id,nome").eq("store_id", lojaId).eq("estado", "no ar");
        const form = (t: RegExp) => (fs as { id: string; nome: string }[] | null)?.find((f) => t.test(f.nome))?.id;
        const reserva = form(/reserva/i);
        const clube = form(/clube|cadastro/i);
        const botoes: Omit<Botao, "cliques">[] = [
          { id: "pedir", tipo: "pedir", rotulo: "Fazer pedido", url: "#loja", ativo: true, destaque: true },
          { id: "cardapio", tipo: "cardapio", rotulo: "Ver o cardápio", url: "#cardapio", ativo: true },
          { id: "whatsapp", tipo: "whatsapp", rotulo: "Falar no WhatsApp", url: "https://wa.me/55", ativo: false },
          ...(reserva ? [{ id: "reserva", tipo: "reserva" as const, rotulo: "Reservar mesa", url: `form:${reserva}`, ativo: true }] : []),
          ...(clube ? [{ id: "clube", tipo: "clube" as const, rotulo: "Entrar no clube", url: `form:${clube}`, ativo: true }] : []),
          { id: "maps", tipo: "maps", rotulo: "Como chegar", url: `https://www.google.com/maps/search/${encodeURIComponent(`${lojaNome} ${lojaBairro}`)}`, ativo: true },
        ];
        const novo = { store_id: lojaId, endereco: enderecoDe(SLUG), titulo: lojaNome, bio: `${lojaNome} · peça direto aqui, sem taxa de aplicativo.`, tema: "brasa", botoes };
        let { data, error } = await sb.from("link_pages").insert(novo).select("endereco,titulo,bio,tema,botoes").single();
        if (error) ({ data } = await sb.from("link_pages").insert({ ...novo, endereco: `${novo.endereco}-${Math.random().toString(36).slice(2, 6)}` }).select("endereco,titulo,bio,tema,botoes").single());
        pg = data;
      }
      if (!pg || !vivo) return;
      const p = pg as Linha;
      endereco = p.endereco;
      const [{ data: rz }, { data: vd }, { data: fsAr }] = await Promise.all([
        sb.rpc("links_resumo", { p_store: lojaId }),
        sb.rpc("links_vendas", { p_store: lojaId }),
        sb.from("forms").select("id,nome").eq("store_id", lojaId).eq("estado", "no ar"),
      ]);
      const formsNoAr = (fsAr as { id: string; nome: string }[] | null) ?? [];
      if (!vivo) return;
      const r = (rz ?? {}) as { visitas?: number; por_botao?: Record<string, number>; por_dia?: number[] };
      const v = (vd ?? {}) as { pedidos?: number; receita?: number };
      const pagina: PaginaLinks = {
        endereco: p.endereco,
        titulo: p.titulo,
        bio: p.bio ?? "",
        tema: p.tema,
        botoes: (p.botoes ?? []).map((b) => {
          let url = normalizarUrl(b.url, b.tipo);
          if (url === "form:") {
            const alvo = formsNoAr.find((f) => (b.tipo === "reserva" ? /reserva/i : /clube|cadastro/i).test(f.nome));
            url = alvo ? `form:${alvo.id}` : "form:";
          }
          return { ...b, url, cliques: Number(r.por_botao?.[b.id] ?? 0) };
        }),
        visitas: Number(r.visitas ?? 0),
        pedidos: Number(v.pedidos ?? 0),
        receita: Number(v.receita ?? 0),
        cliquesDia: (r.por_dia ?? []).map(Number).length ? (r.por_dia ?? []).map(Number) : Array(30).fill(0),
      };
      crescer.carregarLinks(pagina);
      // grava já os botões convertidos do formato antigo
      if (pagina.botoes.some((b, i) => b.url !== p.botoes[i]?.url))
        sb.from("link_pages").update({ botoes: pagina.botoes.map(({ cliques: _c, ...b }) => b) }).eq("store_id", lojaId).then(() => {});
    })();

    persistir.links = (p) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (!endereco) return;
        sb.from("link_pages")
          .update({ titulo: p.titulo || lojaNome, bio: p.bio, tema: p.tema, botoes: p.botoes.map(({ cliques: _c, ...b }) => b) })
          .eq("store_id", lojaId)
          .then(() => {});
      }, 600);
    };
    return () => {
      vivo = false;
      persistir.links = undefined;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lojaId, ativo]);
}
