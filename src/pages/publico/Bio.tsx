import { useEffect, useState } from "react";
import { SLUG, supabase } from "../../data/dados";
import { destino } from "../../data/links";
import { ArrowLeft, BookOpen, CalendarDays, Gift, Link2, MapPin, MessageCircle, ShoppingBag, Star } from "lucide-react";
import { crescer, useCrescer, type Botao, type PaginaLinks, type TipoBotao } from "../../data/crescer";
import { Brasinha } from "../../components/Logo";
import { FOTOS } from "../../components/Foto";
import { LOJA } from "../../data/mock";

export const ICONE_BOTAO: Record<TipoBotao, React.ReactNode> = {
  pedir: <ShoppingBag className="h-5 w-5" />,
  cardapio: <BookOpen className="h-5 w-5" />,
  whatsapp: <MessageCircle className="h-5 w-5" />,
  instagram: <Link2 className="h-5 w-5" />,
  reserva: <CalendarDays className="h-5 w-5" />,
  clube: <Gift className="h-5 w-5" />,
  avaliar: <Star className="h-5 w-5" />,
  maps: <MapPin className="h-5 w-5" />,
  outro: <Link2 className="h-5 w-5" />,
};

export const TEMAS: Record<PaginaLinks["tema"], { fundo: string; texto: string; botao: string; destaque: string; sub: string }> = {
  brasa: { fundo: "#2B211D", texto: "#FFF6EB", botao: "bg-[#3A2E27] text-[#FFF6EB]", destaque: "bg-[#F45B26] text-[#2B211D]", sub: "#c9b8a6" },
  noite: { fundo: "#0f1a1a", texto: "#eafaf6", botao: "bg-[#1b2c2b] text-[#eafaf6]", destaque: "bg-[#49c27e] text-[#0f1a1a]", sub: "#9fbcb5" },
  papel: { fundo: "#FFF6EB", texto: "#2B211D", botao: "bg-white text-[#2B211D] border border-[#e3d3bf]", destaque: "bg-[#2B211D] text-[#FFF6EB]", sub: "#8f7b6c" },
};

/** Clique em um botão: conta e leva ao destino. Destinos internos abrem a loja ou o formulário certo. */
export function abrirBotao(b: Botao) {
  crescer.clique(b.id);
  if (b.tipo === "reserva") crescer.abrirPublico("fo2");
  if (b.tipo === "clube") crescer.abrirPublico("fo3");
  if (b.url.startsWith("#")) window.location.hash = b.url.slice(1);
  else if (b.url.startsWith("form:")) window.location.hash = "pesquisa";
}

export function PaginaBio({ p, preview = false, nota, avaliacoes, aoTocar }: { p: PaginaLinks; preview?: boolean; nota?: number; avaliacoes?: number; aoTocar?: (b: Botao) => void }) {
  const n = nota ?? LOJA.nota;
  const av = avaliacoes ?? LOJA.avaliacoes;
  const t = TEMAS[p.tema];
  return (
    <div style={{ background: t.fundo, color: t.texto }} className={preview ? "h-full overflow-y-auto" : "min-h-screen"}>
      <div className="mx-auto max-w-[440px] px-5 pb-10">
        <div className="relative -mx-5 h-40 overflow-hidden">
          <img src={FOTOS.grelha} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${t.fundo}, transparent)` }} />
        </div>
        <div className="-mt-10 text-center">
          <span className="relative mx-auto grid h-20 w-20 place-items-center rounded-full border-4 bg-[#F45B26]" style={{ borderColor: t.fundo }}>
            <span className="font-display text-[26px] font-extrabold text-[#FFF6EB]">{p.titulo.split(" ").map((w) => w[0]).slice(0, 2).join("")}</span>
          </span>
          <h1 className="mt-3 font-display text-[28px] font-extrabold tracking-[-0.015em]">{p.titulo}</h1>
          <p className="mx-auto mt-1 max-w-[320px] text-[14px] leading-relaxed" style={{ color: t.sub }}>
            {p.bio}
          </p>
          {av > 0 && <p className="mt-2 flex items-center justify-center gap-1 text-[13px]" style={{ color: t.sub }}>
            <Star className="h-4 w-4 fill-mostarda text-mostarda" /> {String(n).replace(".", ",")} · {av.toLocaleString("pt-BR")} avaliações
          </p>}
        </div>
        <ul className="mt-6 space-y-3">
          {p.botoes
            .filter((b) => b.ativo)
            .map((b) => (
              <li key={b.id}>
                <button onClick={() => !preview && (aoTocar ? aoTocar(b) : abrirBotao(b))} className={`flex w-full items-center gap-3 rounded-2xl px-5 py-4 text-left text-[16px] font-semibold transition hover:scale-[1.015] ${b.destaque ? t.destaque : t.botao}`}>
                  {ICONE_BOTAO[b.tipo]}
                  <span className="flex-1">{b.rotulo}</span>
                </button>
              </li>
            ))}
        </ul>
        <p className="mt-8 flex items-center justify-center gap-1.5 text-[12px]" style={{ color: t.sub }}>
          Feito com <Brasinha className="h-4 w-4" /> freguês
        </p>
      </div>
    </div>
  );
}

export function Bio() {
  const local = useCrescer((s) => s.links);
  const real = !!supabase;
  const [pg, setPg] = useState<{ p: PaginaLinks; nota: number; avaliacoes: number } | null | "erro">(null);

  useEffect(() => {
    if (!real) return;
    (async () => {
      const { data: s } = await supabase!.from("stores").select("id,nome,nota,avaliacoes").eq("slug", SLUG).maybeSingle();
      if (!s) return setPg("erro");
      const { data: l } = await supabase!.from("link_pages").select("endereco,titulo,bio,tema,botoes").eq("store_id", s.id).maybeSingle();
      if (!l) return setPg("erro");
      const p = { ...(l as Omit<PaginaLinks, "visitas" | "pedidos" | "receita" | "cliquesDia" | "botoes"> & { botoes: Botao[] }), visitas: 0, pedidos: 0, receita: 0, cliquesDia: [] } as PaginaLinks;
      setPg({ p, nota: Number(s.nota ?? 0), avaliacoes: Number(s.avaliacoes ?? 0) });
      try {
        if (!sessionStorage.getItem("fregues-visita-bio")) {
          sessionStorage.setItem("fregues-visita-bio", "1");
          supabase!.rpc("registrar_clique", { p_endereco: p.endereco, p_botao: null }).then(() => {});
        }
      } catch {
        /* sem sessionStorage */
      }
    })();
  }, [real]);

  if (real) {
    if (pg === "erro") return <div className="grid min-h-screen place-items-center bg-[#2B211D] p-6 text-center text-[#FFF6EB]">Página não encontrada.</div>;
    if (!pg) return <div className="min-h-screen bg-[#2B211D]" />;
    return (
      <PaginaBio
        p={pg.p}
        nota={pg.nota}
        avaliacoes={pg.avaliacoes}
        aoTocar={(b) => {
          supabase!.rpc("registrar_clique", { p_endereco: pg.p.endereco, p_botao: b.id }).then(() => {});
          setTimeout(() => (window.location.href = destino(b.url)), 120);
        }}
      />
    );
  }
  const p = local;
  return (
    <div>
      <a href="#links" className="fixed left-3 top-3 z-10 flex items-center gap-1 rounded-full bg-carvao/80 px-3 py-1.5 text-[12px] text-areia backdrop-blur hover:text-papel">
        <ArrowLeft className="h-3.5 w-3.5" /> Painel do dono
      </a>
      <PaginaBio p={p} />
    </div>
  );
}
