import { useState } from "react";
import { ArrowDown, ArrowUp, Copy, ExternalLink, Plus, Trash2 } from "lucide-react";
import { crescer, useCrescer, type Botao, type PaginaLinks, type TipoBotao } from "../../data/crescer";
import { ICONE_BOTAO, PaginaBio } from "../publico/Bio";
import { brl } from "../../data/mock";
import { useToast } from "../../components/ui";

const TIPOS: { id: TipoBotao; rotulo: string; url: string }[] = [
  { id: "pedir", rotulo: "Fazer pedido", url: "#loja" },
  { id: "cardapio", rotulo: "Ver o cardápio", url: "#loja" },
  { id: "whatsapp", rotulo: "Falar no WhatsApp", url: "https://wa.me/" },
  { id: "reserva", rotulo: "Reservar mesa", url: "#pesquisa" },
  { id: "clube", rotulo: "Entrar no clube", url: "#pesquisa" },
  { id: "avaliar", rotulo: "Avaliar no Google", url: "https://" },
  { id: "maps", rotulo: "Como chegar", url: "https://maps.google.com" },
  { id: "outro", rotulo: "Outro link", url: "https://" },
];

export function Links() {
  const p = useCrescer((s) => s.links);
  const [novo, setNovo] = useState(false);
  const { show, Toast } = useToast();
  const set = (f: (x: PaginaLinks) => PaginaLinks) => crescer.setLinks(f);
  const setB = (id: string, q: Partial<Botao>) => set((x) => ({ ...x, botoes: x.botoes.map((b) => (b.id === id ? { ...b, ...q } : b)) }));
  const mover = (i: number, d: number) =>
    set((x) => {
      const bs = [...x.botoes];
      const j = i + d;
      if (j < 0 || j >= bs.length) return x;
      [bs[i], bs[j]] = [bs[j], bs[i]];
      return { ...x, botoes: bs };
    });
  const cliques = p.botoes.reduce((s, b) => s + b.cliques, 0);
  const maxB = Math.max(1, ...p.botoes.map((b) => b.cliques));
  const maxD = Math.max(1, ...p.cliquesDia);
  const url = `fregues.app/${p.endereco}`;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[clamp(2rem,4vw,2.8rem)] font-extrabold tracking-[-0.02em]">Links da bio</h1>
          <p className="max-w-[620px] text-[15px] text-areia">A página que vai na bio do Instagram. Cada toque é contado, e você vê quantos pedidos vieram de lá.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              navigator.clipboard?.writeText(`https://${url}`).catch(() => {});
              show("Link copiado. Cole na bio do Instagram.");
            }}
            className="flex items-center gap-2 rounded-full border border-linha px-4 py-2.5 text-[14px] font-semibold hover:border-areia"
          >
            <Copy className="h-4 w-4" /> {url}
          </button>
          <a href="#bio" className="flex items-center gap-2 rounded-full bg-brasa px-4 py-2.5 text-[14px] font-semibold text-carvao hover:bg-mostarda">
            <ExternalLink className="h-4 w-4" /> Abrir página
          </a>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["Visitas em 30 dias", p.visitas.toLocaleString("pt-BR")],
          ["Toques nos botões", cliques.toLocaleString("pt-BR")],
          ["Pedidos vindos da bio", String(p.pedidos)],
          ["Vendas vindas da bio", brl(p.receita)],
        ].map(([k, v], i) => (
          <div key={k} className={`rounded-2xl p-4 ${i === 3 ? "bg-[#2e1a10]" : "border border-linha bg-forno"}`}>
            <p className={`text-[12px] ${i === 3 ? "text-[#ffc7a6]" : "text-areia"}`}>{k}</p>
            <p className={`tabular mt-1 font-display text-[24px] font-bold ${i === 3 ? "text-brasa" : ""}`}>{v}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <section className="rounded-3xl border border-linha bg-forno p-5">
            <h2 className="font-display text-[18px] font-bold">Toques por dia</h2>
            <div className="mt-4 flex h-[120px] items-end gap-1" role="img" aria-label="Toques por dia nos últimos 30 dias">
              {p.cliquesDia.map((v, i) => (
                <span key={i} className={`flex-1 rounded-t ${i === p.cliquesDia.length - 1 ? "bg-brasa" : "bg-linha"}`} style={{ height: `${(v / maxD) * 100}%` }} title={`${v} toques`} />
              ))}
            </div>
            <p className="mt-2 text-[12px] text-areia">Os picos são sexta e sábado. Poste o link nos Stories nesses dias.</p>
          </section>

          <section className="rounded-3xl border border-linha bg-forno p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-[18px] font-bold">Botões</h2>
              <button onClick={() => setNovo(!novo)} className="flex items-center gap-1.5 rounded-full border border-linha px-3 py-1.5 text-[13px] font-semibold hover:border-areia">
                <Plus className="h-4 w-4" /> Adicionar
              </button>
            </div>
            {novo && (
              <div className="mt-3 flex flex-wrap gap-2 rounded-2xl bg-grafite p-3">
                {TIPOS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      set((x) => ({ ...x, botoes: [...x.botoes, { id: Math.random().toString(36).slice(2, 8), tipo: t.id, rotulo: t.rotulo, url: t.url, ativo: true, cliques: 0 }] }));
                      setNovo(false);
                    }}
                    className="flex items-center gap-2 rounded-full bg-carvao px-3 py-1.5 text-[13px] hover:text-brasa"
                  >
                    {ICONE_BOTAO[t.id]} {t.rotulo}
                  </button>
                ))}
              </div>
            )}
            <ul className="mt-3 space-y-2">
              {p.botoes.map((b, i) => (
                <li key={b.id} className={`flex flex-wrap items-center gap-3 rounded-2xl border p-3 ${b.ativo ? "border-linha" : "border-dashed border-linha opacity-60"}`}>
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${b.destaque ? "bg-brasa text-carvao" : "bg-grafite"}`}>{ICONE_BOTAO[b.tipo]}</span>
                  <div className="min-w-[180px] flex-1">
                    <input value={b.rotulo} onChange={(e) => setB(b.id, { rotulo: e.target.value })} aria-label="Texto do botão" className="w-full bg-transparent font-semibold outline-none focus:underline" />
                    <input value={b.url} onChange={(e) => setB(b.id, { url: e.target.value })} aria-label="Endereço do botão" className="w-full bg-transparent text-[12px] text-areia outline-none" />
                  </div>
                  <div className="w-[120px]">
                    <p className="tabular text-right text-[13px] font-semibold">{b.cliques.toLocaleString("pt-BR")} toques</p>
                    <span className="mt-1 block h-1.5 rounded-full bg-grafite">
                      <span className="block h-full rounded-full bg-brasa" style={{ width: `${(b.cliques / maxB) * 100}%` }} />
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setB(b.id, { destaque: !b.destaque })} aria-pressed={!!b.destaque} className={`rounded-lg px-2 py-1 text-[11px] font-semibold ${b.destaque ? "bg-brasa text-carvao" : "text-areia hover:bg-grafite"}`}>
                      Destaque
                    </button>
                    <button onClick={() => mover(i, -1)} aria-label="Subir botão" className="rounded-lg p-1.5 text-areia hover:bg-grafite">
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button onClick={() => mover(i, 1)} aria-label="Descer botão" className="rounded-lg p-1.5 text-areia hover:bg-grafite">
                      <ArrowDown className="h-4 w-4" />
                    </button>
                    <button onClick={() => setB(b.id, { ativo: !b.ativo })} className="rounded-lg px-2 py-1 text-[12px] font-semibold text-areia hover:bg-grafite">
                      {b.ativo ? "Ocultar" : "Mostrar"}
                    </button>
                    <button onClick={() => set((x) => ({ ...x, botoes: x.botoes.filter((y) => y.id !== b.id) }))} aria-label="Apagar botão" className="rounded-lg p-1.5 text-areia hover:bg-grafite hover:text-tomate">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="grid gap-3 rounded-3xl border border-linha bg-forno p-5 md:grid-cols-2">
            <label className="block text-[13px] text-areia">
              Nome
              <input value={p.titulo} onChange={(e) => set((x) => ({ ...x, titulo: e.target.value }))} className="mt-1 w-full rounded-xl border border-linha bg-carvao px-3 py-2 text-[15px] text-papel" />
            </label>
            <label className="block text-[13px] text-areia">
              Endereço
              <span className="mt-1 flex items-center rounded-xl border border-linha bg-carvao px-3 text-[15px]">
                <span className="text-fumo">fregues.app/</span>
                <input value={p.endereco} onChange={(e) => set((x) => ({ ...x, endereco: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))} className="min-w-0 flex-1 bg-transparent py-2 text-papel outline-none" />
              </span>
            </label>
            <label className="block text-[13px] text-areia md:col-span-2">
              Texto da bio
              <textarea value={p.bio} onChange={(e) => set((x) => ({ ...x, bio: e.target.value }))} rows={2} className="mt-1 w-full rounded-xl border border-linha bg-carvao px-3 py-2 text-[15px] text-papel" />
            </label>
            <div className="md:col-span-2">
              <p className="text-[13px] text-areia">Tema</p>
              <div className="mt-1 flex gap-2">
                {(
                  [
                    ["brasa", "Brasa", "#17110e", "#ff5b1f"],
                    ["noite", "Noite", "#0f1a1a", "#49c27e"],
                    ["papel", "Papel", "#fff6e9", "#17110e"],
                  ] as const
                ).map(([v, r, a, b]) => (
                  <button key={v} onClick={() => set((x) => ({ ...x, tema: v }))} aria-pressed={p.tema === v} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-[14px] font-semibold ${p.tema === v ? "border-papel" : "border-linha text-areia"}`}>
                    <span className="h-5 w-5 rounded-full border border-linha" style={{ background: `linear-gradient(135deg, ${a} 50%, ${b} 50%)` }} />
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>

        <div className="xl:sticky xl:top-6 xl:self-start">
          <p className="mb-2 text-center text-[13px] text-areia">Como fica no celular</p>
          <div className="mx-auto h-[680px] w-[340px] overflow-hidden rounded-[44px] border-[10px] border-[#0b0806] shadow-2xl">
            <PaginaBio p={p} preview />
          </div>
        </div>
      </div>
      <Toast />
    </div>
  );
}
