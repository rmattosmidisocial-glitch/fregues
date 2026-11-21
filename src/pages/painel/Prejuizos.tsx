import { useMemo, useState } from "react";
import { Bell, Plus, TrendingDown } from "lucide-react";
import { brl } from "../../data/mock";
import { useDados } from "../../data/dados";
import { TIPOS_PREJUIZO, usePrejuizos, type Prejuizo, type TipoPrejuizo } from "../../data/prejuizos";
import { useToast } from "../../components/ui";
import { LancarPrejuizo } from "./Prejuizo";

const PERIODOS = [
  [7, "7 dias"],
  [30, "30 dias"],
  [90, "3 meses"],
] as const;
const quando = (iso: string) => new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

function agrupar(lista: Prejuizo[], chave: (p: Prejuizo) => string | null) {
  const m = new Map<string, { n: number; custo: number; venda: number }>();
  for (const p of lista) {
    const k = chave(p);
    if (!k) continue;
    const x = m.get(k) ?? { n: 0, custo: 0, venda: 0 };
    x.n += 1;
    x.custo += p.custo;
    x.venda += p.valor_venda;
    m.set(k, x);
  }
  return [...m.entries()].sort((a, b) => b[1].custo - a[1].custo);
}

function Barras({ titulo, linhas, vazio }: { titulo: string; linhas: [string, { n: number; custo: number }][]; vazio: string }) {
  const max = Math.max(1, ...linhas.map(([, v]) => v.custo));
  return (
    <section className="rounded-3xl border border-linha bg-forno p-5">
      <h2 className="font-display text-[19px] font-bold">{titulo}</h2>
      {!linhas.length ? (
        <p className="mt-3 text-[14px] text-fumo">{vazio}</p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {linhas.slice(0, 6).map(([k, v]) => (
            <li key={k}>
              <div className="flex justify-between gap-3 text-[14px]">
                <span className="truncate">{k}</span>
                <span className="tabular shrink-0 text-areia">
                  {v.n}x · <b className="text-papel">{brl(v.custo)}</b>
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-grafite">
                <div className="h-full rounded-full bg-tomate" style={{ width: `${(v.custo / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function Prejuizos() {
  const d = useDados();
  const [dias, setDias] = useState(30);
  const [filtro, setFiltro] = useState<TipoPrejuizo | "todos">("todos");
  const [lancar, setLancar] = useState(false);
  const { lista, recarregar } = usePrejuizos(dias);
  const { show, Toast } = useToast();
  const [alerta, setAlerta] = useState(d.loja.prejuizo_alerta != null ? String(d.loja.prejuizo_alerta).replace(".", ",") : "");

  const todos = useMemo(() => lista ?? [], [lista]);
  const vis = filtro === "todos" ? todos : todos.filter((p) => p.tipo === filtro);
  const soma = (l: Prejuizo[], k: "custo" | "valor_venda") => l.reduce((s, p) => s + p[k], 0);
  const porTipo = (Object.keys(TIPOS_PREJUIZO) as TipoPrejuizo[]).map((t) => {
    const l = todos.filter((p) => p.tipo === t);
    return { t, n: l.length, custo: soma(l, "custo"), venda: soma(l, "valor_venda") };
  });

  async function salvarAlerta() {
    const v = alerta.trim() ? Number(alerta.replace(/\./g, "").replace(",", ".")) : null;
    if (v != null && !(v >= 0)) return show("Valor inválido");
    await d.acoes.salvarLoja({ prejuizo_alerta: v });
    show(v == null ? "Aviso desligado" : `O Pulso avisa quando o prejuízo da semana passar de ${brl(v)}`);
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[clamp(2rem,4vw,2.8rem)] font-extrabold tracking-[-0.015em]">Prejuízos</h1>
          <p className="max-w-[720px] text-[15px] text-areia">Vendas que voltaram, desperdício e cortesias: tudo o que saiu da casa sem entrar no caixa. O custo vem da ficha técnica, e o estoque baixa sozinho.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-full bg-grafite p-1 text-[14px] font-semibold" role="group" aria-label="Período">
            {PERIODOS.map(([v, r]) => (
              <button key={v} onClick={() => setDias(v)} aria-pressed={dias === v} className={`rounded-full px-3 py-1.5 ${dias === v ? "bg-papel text-carvao" : "text-areia hover:text-papel"}`}>
                {r}
              </button>
            ))}
          </div>
          <button onClick={() => setLancar(true)} className="flex items-center gap-2 rounded-full bg-brasa px-4 py-2.5 text-[14px] font-semibold text-carvao hover:bg-mostarda">
            <Plus className="h-4 w-4" /> Lançar prejuízo
          </button>
        </div>
      </div>

      {lista === null ? (
        <p className="mt-6 text-areia">Carregando…</p>
      ) : (
        <>
          <div className="mt-6 grid gap-3 lg:grid-cols-[1.2fr_1fr_1fr_1fr]">
            <div className="rounded-3xl border border-tomate/40 bg-tomate/10 p-5">
              <p className="flex items-center gap-2 text-[14px] text-tomate">
                <TrendingDown className="h-4 w-4" /> Prejuízo no período
              </p>
              <p className="tabular mt-1 font-display text-[40px] font-extrabold leading-none text-tomate">{brl(soma(todos, "custo"))}</p>
              <p className="mt-2 text-[13px] text-areia">
                de custo para a casa · {brl(soma(todos, "valor_venda"))} deixaram de entrar no caixa · {todos.length} lançamentos
              </p>
            </div>
            {porTipo.map(({ t, n, custo, venda }) => (
              <button key={t} onClick={() => setFiltro(filtro === t ? "todos" : t)} aria-pressed={filtro === t} className={`rounded-3xl border p-5 text-left transition ${filtro === t ? "border-brasa bg-brasa/10" : "border-linha bg-forno hover:bg-grafite"}`}>
                <p className="flex items-center gap-2 text-[14px] text-areia">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: TIPOS_PREJUIZO[t].cor }} /> {TIPOS_PREJUIZO[t].nome}
                </p>
                <p className="tabular mt-1 font-display text-[28px] font-extrabold leading-none">{brl(custo)}</p>
                <p className="mt-2 text-[13px] text-areia">
                  {n} {n === 1 ? "vez" : "vezes"}
                  {venda > 0 ? ` · ${brl(venda)} em vendas` : ""}
                </p>
              </button>
            ))}
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <Barras titulo="Motivos" linhas={agrupar(vis, (p) => p.motivo ?? "Sem motivo")} vazio="Nada lançado no período." />
            <Barras
              titulo="O que mais se perde"
              linhas={agrupar(
                vis.filter((p) => p.tipo !== "devolucao"),
                (p) => p.descricao,
              )}
              vazio="Nenhum produto ou insumo perdido."
            />
            <Barras titulo={filtro === "cortesia" ? "Para quem foi a cortesia" : "Quem lançou"} linhas={filtro === "cortesia" ? agrupar(vis, (p) => p.quem) : agrupar(vis, (p) => p.lancado_por ?? "Sem nome")} vazio="Ninguém lançou no período." />
          </div>

          <section className="mt-4 rounded-3xl border border-linha bg-forno p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-[19px] font-bold">Lançamentos{filtro !== "todos" ? ` · ${TIPOS_PREJUIZO[filtro].nome}` : ""}</h2>
              {filtro !== "todos" && (
                <button onClick={() => setFiltro("todos")} className="text-[13px] text-areia hover:text-papel">
                  ver todos
                </button>
              )}
            </div>
            {!vis.length ? (
              <p className="mt-3 text-[14px] text-fumo">Nada aqui. Para lançar: botão “Lançar prejuízo” no Caixa, “cortesia” no item da mesa e “Voltou / devolvido” no pedido.</p>
            ) : (
              <ul className="mt-2 divide-y divide-linha">
                {vis.slice(0, 60).map((p) => (
                  <li key={p.id} className="flex items-center gap-3 py-2.5">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: TIPOS_PREJUIZO[p.tipo].cor }} title={TIPOS_PREJUIZO[p.tipo].nome} />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">
                        {p.tipo !== "devolucao" && `${p.qtd.toLocaleString("pt-BR", { maximumFractionDigits: 3 })}x `}
                        {p.descricao} <span className="text-[13px] font-normal text-areia">· {TIPOS_PREJUIZO[p.tipo].curto}</span>
                      </p>
                      <p className="truncate text-[13px] text-areia">{[p.motivo, p.quem && `para ${p.quem}`, p.lancado_por && `por ${p.lancado_por}`, quando(p.quando)].filter(Boolean).join(" · ")}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="tabular font-semibold text-tomate">{brl(p.custo)}</p>
                      {p.valor_venda > 0 && <p className="tabular text-[12px] text-areia">venda {brl(p.valor_venda)}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="mt-4 flex flex-wrap items-center gap-3 rounded-3xl border border-dashed border-linha p-5">
            <Bell className="h-5 w-5 text-mostarda" />
            <p className="min-w-[220px] flex-1 text-[14px] text-areia">
              <b className="text-papel">Aviso no Pulso:</b> mostrar em “Precisa de você” quando o prejuízo dos últimos 7 dias passar de:
            </p>
            <label className="flex items-center gap-1 rounded-xl border border-linha px-3 focus-within:border-brasa">
              <span className="text-[13px] text-areia">R$</span>
              <input value={alerta} onChange={(e) => setAlerta(e.target.value)} inputMode="decimal" placeholder="sem aviso" aria-label="Valor do aviso" className="w-28 bg-transparent py-2 text-[15px] outline-none" />
            </label>
            <button onClick={salvarAlerta} className="rounded-full bg-papel px-4 py-2 text-[14px] font-semibold text-carvao hover:bg-mostarda">
              Salvar
            </button>
          </section>
        </>
      )}
      {lancar && <LancarPrejuizo fechar={() => setLancar(false)} avisar={show} depois={recarregar} />}
      <Toast />
    </div>
  );
}
