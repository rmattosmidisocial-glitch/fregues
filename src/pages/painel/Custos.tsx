import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Plus, Search, Trash2 } from "lucide-react";
import { brl, type Produto } from "../../data/mock";
import { useDados } from "../../data/dados";
import { COR_FAIXA, compraDe, custoFicha, custoLinha, faixaCmv, UNIDADES, usoDe, useCustos, useVendas30, type Insumo, type LinhaFicha, type Unidade } from "../../data/custos";

const campo = "w-full rounded-xl border border-linha bg-carvao/0 px-3 py-2 text-[15px] outline-none focus:border-brasa";
const num = (s: string) => {
  const t = s.replace(/[^\d,.]/g, "");
  if (!t) return NaN;
  return Number(t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t);
};
const txt = (n: number, casas = 2) => (Number.isFinite(n) ? n.toLocaleString("pt-BR", { maximumFractionDigits: casas }) : "");
const pctTxt = (n: number) => `${n.toFixed(0)}%`;
const precoVenda = (p: Produto) => p.promo ?? p.preco;

export function CmvSelo({ pct }: { pct: number }) {
  return <span className={`tabular shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${COR_FAIXA[faixaCmv(pct)]}`}>CMV {pctTxt(pct)}</span>;
}

export function Custos({ produtos, c, avisar }: { produtos: Produto[]; c: ReturnType<typeof useCustos>; avisar: (t: string) => void }) {
  const vendas = useVendas30();
  const [aba, setAba] = useState<"pratos" | "insumos">("pratos");

  const linhas = useMemo(
    () =>
      produtos.map((p) => {
        const custo = custoFicha(c.fichas[p.id], c.insumos);
        const preco = precoVenda(p);
        return { p, custo, preco, pct: custo != null && preco > 0 ? (custo / preco) * 100 : null };
      }),
    [produtos, c.fichas, c.insumos],
  );

  // CMV das vendas: só entra o que tem ficha técnica
  const resumo = useMemo(() => {
    let custo = 0,
      receita = 0,
      receitaTotal = 0;
    for (const l of linhas) {
      const v = vendas?.[l.p.id];
      if (!v) continue;
      receitaTotal += v.receita;
      if (l.custo == null) continue;
      custo += v.qtd * l.custo;
      receita += v.receita;
    }
    return { custo, receita, pct: receita ? (custo / receita) * 100 : null, cobertura: receitaTotal ? (receita / receitaTotal) * 100 : 0 };
  }, [linhas, vendas]);

  const comFicha = linhas.filter((l) => l.custo != null);
  const caros = comFicha.filter((l) => l.pct != null && l.pct > 38);

  return (
    <div className="mt-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-linha bg-forno p-4">
          <p className="text-[13px] text-areia">CMV das vendas (30 dias)</p>
          <p className={`mt-1 font-display text-[34px] font-extrabold leading-none ${resumo.pct == null ? "text-fumo" : faixaCmv(resumo.pct) === "alto" ? "text-tomate" : faixaCmv(resumo.pct) === "atencao" ? "text-mostarda" : "text-manjericao"}`}>{resumo.pct == null ? "—" : pctTxt(resumo.pct)}</p>
          <p className="mt-1 text-[13px] text-areia">{resumo.pct == null ? "Monte a ficha dos pratos que mais vendem" : `${brl(resumo.custo)} de custo em ${brl(resumo.receita)} vendidos · cobre ${pctTxt(resumo.cobertura)} das vendas`}</p>
        </div>
        <div className="rounded-2xl border border-linha bg-forno p-4">
          <p className="text-[13px] text-areia">Pratos com ficha técnica</p>
          <p className="mt-1 font-display text-[34px] font-extrabold leading-none">
            {comFicha.length}
            <span className="text-[18px] text-fumo"> de {produtos.length}</span>
          </p>
          <p className="mt-1 text-[13px] text-areia">{c.insumos.length} insumos cadastrados</p>
        </div>
        <div className="rounded-2xl border border-linha bg-forno p-4">
          <p className="text-[13px] text-areia">Pratos com CMV acima de 38%</p>
          <p className={`mt-1 font-display text-[34px] font-extrabold leading-none ${caros.length ? "text-tomate" : "text-manjericao"}`}>{caros.length}</p>
          <p className="mt-1 text-[13px] text-areia">Meta comum no food service: entre 25% e 35%</p>
        </div>
      </div>

      <div className="mt-5 flex rounded-full bg-grafite p-1 text-[14px] font-semibold sm:inline-flex" role="tablist">
        {(["pratos", "insumos"] as const).map((a) => (
          <button key={a} role="tab" aria-selected={aba === a} onClick={() => setAba(a)} className={`flex-1 whitespace-nowrap rounded-full px-4 py-1.5 ${aba === a ? "bg-papel text-carvao" : "text-areia hover:text-papel"}`}>
            {a === "pratos" ? "Pratos" : `Insumos (${c.insumos.length})`}
          </button>
        ))}
      </div>

      {c.carregando ? <p className="mt-6 text-areia">Carregando…</p> : aba === "pratos" ? <Pratos linhas={linhas} c={c} vendas={vendas} avisar={avisar} irInsumos={() => setAba("insumos")} /> : <Insumos c={c} avisar={avisar} />}
    </div>
  );
}

type C = ReturnType<typeof useCustos>;
type Linha = { p: Produto; custo: number | null; preco: number; pct: number | null };

function Pratos({ linhas, c, vendas, avisar, irInsumos }: { linhas: Linha[]; c: C; vendas: ReturnType<typeof useVendas30>; avisar: (t: string) => void; irInsumos: () => void }) {
  const [ordem, setOrdem] = useState<"cmv" | "vendas" | "nome">("cmv");
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState<string | null>(null);
  const q = busca.trim().toLowerCase();
  const lista = linhas.filter((l) => !q || l.p.nome.toLowerCase().includes(q)).sort((a, b) => (ordem === "nome" ? a.p.nome.localeCompare(b.p.nome) : ordem === "vendas" ? (vendas?.[b.p.id]?.qtd ?? 0) - (vendas?.[a.p.id]?.qtd ?? 0) : (b.pct ?? -1) - (a.pct ?? -1)));

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex min-w-[220px] flex-1 items-center gap-2 rounded-full border border-linha bg-forno px-4 py-2">
          <Search className="h-4 w-4 text-areia" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar prato" aria-label="Buscar prato" className="w-full bg-transparent text-[15px] outline-none" />
        </label>
        <select value={ordem} onChange={(e) => setOrdem(e.target.value as typeof ordem)} aria-label="Ordenar" className="rounded-full border border-linha bg-forno px-4 py-2 text-[14px]">
          <option value="cmv">Maior CMV primeiro</option>
          <option value="vendas">Mais vendidos primeiro</option>
          <option value="nome">Nome</option>
        </select>
      </div>
      {!c.insumos.length && (
        <p className="mt-3 rounded-2xl bg-grafite p-4 text-[14px] text-areia">
          Comece cadastrando os{" "}
          <button onClick={irInsumos} className="font-semibold text-papel underline">
            insumos
          </button>{" "}
          com o preço que você paga (ex.: carne R$ 42 o kg, pão R$ 1,60 a unidade). Depois é só abrir cada prato e dizer quanto vai de cada um.
        </p>
      )}
      <ul className="mt-3 divide-y divide-linha rounded-2xl border border-linha bg-forno">
        {lista.map((l) => {
          const v = vendas?.[l.p.id];
          const abre = aberto === l.p.id;
          return (
            <li key={l.p.id}>
              <button onClick={() => setAberto(abre ? null : l.p.id)} aria-expanded={abre} className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-left hover:bg-grafite/50 sm:flex-nowrap">
                <div className="min-w-0 flex-1 basis-full sm:basis-auto">
                  <p className="font-semibold">{l.p.nome}</p>
                  <p className="text-[13px] text-areia">
                    {l.p.cat} · venda {brl(l.preco)}
                    {v ? ` · ${v.qtd} vendidos em 30 dias` : ""}
                  </p>
                </div>
                {l.custo == null ? (
                  <span className="shrink-0 rounded-full border border-dashed border-linha px-3 py-1 text-[12px] font-semibold text-areia">Montar ficha</span>
                ) : (
                  <div className="mr-auto shrink-0 sm:mr-0 sm:text-right">
                    <p className="tabular text-[14px]">
                      custo <b>{brl(l.custo)}</b>
                    </p>
                    <p className="tabular text-[12px] text-areia">lucro bruto {brl(l.preco - l.custo)}</p>
                  </div>
                )}
                {l.pct != null && <CmvSelo pct={l.pct} />}
                {abre ? <ChevronUp className="h-4 w-4 shrink-0 text-areia" /> : <ChevronDown className="h-4 w-4 shrink-0 text-areia" />}
              </button>
              {abre && <EditorFicha key={l.p.id} p={l.p} preco={l.preco} c={c} avisar={avisar} fechar={() => setAberto(null)} />}
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-[13px] text-fumo">O custo usa o preço de venda atual (com promoção, se houver). Adicionais escolhidos pelo cliente não entram na conta.</p>
    </div>
  );
}

type LinhaForm = { insumo_id: string; qtd: string };

function EditorFicha({ p, preco, c, avisar, fechar }: { p: Produto; preco: number; c: C; avisar: (t: string) => void; fechar: () => void }) {
  const [linhas, setLinhas] = useState<LinhaForm[]>(() => (c.fichas[p.id]?.length ? c.fichas[p.id].map((l) => ({ insumo_id: l.insumo_id, qtd: txt(l.qtd, 3) })) : [{ insumo_id: "", qtd: "" }]));
  const [salvando, setSalvando] = useState(false);
  const [novo, setNovo] = useState<{ nome: string; unidade: Unidade; custo: string } | null>(null);
  const mapa = new Map(c.insumos.map((i) => [i.id, i]));
  const validas: LinhaFicha[] = linhas.map((l) => ({ insumo_id: l.insumo_id, qtd: num(l.qtd) })).filter((l) => l.insumo_id && l.qtd > 0);
  const total = validas.reduce((s, l) => s + custoLinha(l, mapa.get(l.insumo_id)), 0);
  const pct = preco > 0 ? (total / preco) * 100 : 0;
  const set = (i: number, x: Partial<LinhaForm>) => setLinhas(linhas.map((l, j) => (j === i ? { ...l, ...x } : l)));

  async function salvar() {
    setSalvando(true);
    const r = await c.salvarFicha(p.id, validas);
    setSalvando(false);
    if (r) return avisar(r);
    avisar(validas.length ? `Ficha de ${p.nome} salva: custo ${brl(total)}` : `Ficha de ${p.nome} apagada`);
    fechar();
  }

  async function criarInsumo() {
    if (!novo) return;
    const r = await c.salvarInsumo({ nome: novo.nome, unidade: novo.unidade, custo: num(novo.custo) });
    if (r) return avisar(r);
    avisar(`${novo.nome.trim()} cadastrado. Agora escolha na lista.`);
    setNovo(null);
  }

  return (
    <div className="border-t border-linha bg-carvao/30 px-4 py-4">
      <p className="text-[13px] font-semibold text-areia">Receita de 1 {p.nome}</p>
      <div className="mt-2 space-y-2">
        {linhas.map((l, i) => {
          const ins = mapa.get(l.insumo_id);
          const valor = ins ? custoLinha({ insumo_id: l.insumo_id, qtd: num(l.qtd) || 0 }, ins) : 0;
          return (
            <div key={i} className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
              <select value={l.insumo_id} onChange={(e) => set(i, { insumo_id: e.target.value })} aria-label="Insumo" className={`${campo} min-w-0 flex-1 basis-full sm:basis-auto`}>
                <option value="">Escolha o insumo…</option>
                {c.insumos.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.nome} ({brl(x.custo)}/{compraDe(x.unidade)})
                  </option>
                ))}
              </select>
              <label className="flex w-[130px] items-center gap-1 rounded-xl border border-linha px-3 focus-within:border-brasa">
                <input value={l.qtd} onChange={(e) => set(i, { qtd: e.target.value })} inputMode="decimal" placeholder="0" aria-label="Quantidade" className="w-full bg-transparent py-2 text-right text-[15px] outline-none" />
                <span className="text-[13px] text-areia">{ins ? usoDe(ins.unidade) : ""}</span>
              </label>
              <span className="tabular w-[84px] text-right text-[14px]">{valor ? brl(valor) : "—"}</span>
              <button onClick={() => setLinhas(linhas.filter((_, j) => j !== i))} aria-label="Tirar da receita" className="rounded-full p-2 text-areia hover:bg-grafite hover:text-tomate">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <button onClick={() => setLinhas([...linhas, { insumo_id: "", qtd: "" }])} className="flex items-center gap-1 rounded-full px-3 py-1.5 text-[13px] font-semibold text-areia hover:bg-grafite hover:text-papel">
          <Plus className="h-4 w-4" /> Adicionar insumo
        </button>
        {!novo && (
          <button onClick={() => setNovo({ nome: "", unidade: "kg", custo: "" })} className="rounded-full px-3 py-1.5 text-[13px] font-semibold text-areia hover:bg-grafite hover:text-papel">
            Cadastrar insumo novo
          </button>
        )}
      </div>
      {novo && <FormInsumo v={novo} setV={setNovo} ok={criarInsumo} cancelar={() => setNovo(null)} rotuloOk="Cadastrar" />}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-linha pt-3">
        <p className="text-[14px]">
          Custo <b className="tabular">{brl(total)}</b> · venda {brl(preco)} · lucro bruto <b className="tabular">{brl(preco - total)}</b> {total > 0 && <CmvSelo pct={pct} />}
        </p>
        <div className="flex gap-2">
          <button onClick={fechar} className="rounded-full border border-linha px-4 py-2 text-[14px]">
            Cancelar
          </button>
          <button disabled={salvando} onClick={salvar} className="rounded-full bg-brasa px-5 py-2 text-[14px] font-semibold text-carvao hover:bg-mostarda disabled:opacity-50">
            {salvando ? "Salvando…" : "Salvar ficha"}
          </button>
        </div>
      </div>
      {total > 0 && pct > 38 && (
        <p className="mt-2 text-[13px] text-tomate">
          CMV alto. Para chegar a 35%, o preço precisaria ser {brl(Math.ceil((total / 0.35) * 10) / 10)} ou o custo cair para {brl(preco * 0.35)}.
        </p>
      )}
    </div>
  );
}

function FormInsumo({ v, setV, ok, cancelar, rotuloOk }: { v: { nome: string; unidade: Unidade; custo: string }; setV: (x: { nome: string; unidade: Unidade; custo: string }) => void; ok: () => void; cancelar?: () => void; rotuloOk: string }) {
  return (
    <div className="mt-3 grid gap-2 rounded-2xl border border-linha p-3 sm:grid-cols-[1fr_150px_170px_auto]">
      <input value={v.nome} onChange={(e) => setV({ ...v, nome: e.target.value })} placeholder="Nome (ex.: Blend bovino)" aria-label="Nome do insumo" className={campo} />
      <select value={v.unidade} onChange={(e) => setV({ ...v, unidade: e.target.value as Unidade })} aria-label="Comprado por" className={campo}>
        {UNIDADES.map((u) => (
          <option key={u.id} value={u.id}>
            {u.nome}
          </option>
        ))}
      </select>
      <label className="flex items-center gap-1 rounded-xl border border-linha px-3 focus-within:border-brasa">
        <span className="text-[13px] text-areia">R$</span>
        <input value={v.custo} onChange={(e) => setV({ ...v, custo: e.target.value })} inputMode="decimal" placeholder="0,00" aria-label="Preço de compra" className="w-full bg-transparent py-2 text-right text-[15px] outline-none" />
        <span className="whitespace-nowrap text-[13px] text-areia">/{compraDe(v.unidade)}</span>
      </label>
      <div className="flex gap-2">
        {cancelar && (
          <button onClick={cancelar} className="rounded-full border border-linha px-3 py-2 text-[14px]">
            Cancelar
          </button>
        )}
        <button onClick={ok} className="rounded-full bg-papel px-4 py-2 text-[14px] font-semibold text-carvao hover:bg-mostarda">
          {rotuloOk}
        </button>
      </div>
    </div>
  );
}

function Insumos({ c, avisar }: { c: C; avisar: (t: string) => void }) {
  const d = useDados();
  const [novo, setNovo] = useState<{ nome: string; unidade: Unidade; custo: string }>({ nome: "", unidade: "kg", custo: "" });
  const [editando, setEditando] = useState<(Insumo & { custoTxt: string }) | null>(null);
  const usos = (id: string) => Object.entries(c.fichas).filter(([, ls]) => ls.some((l) => l.insumo_id === id)).length;
  const nomes = new Map(d.cardapioTodo.map((p) => [p.id, p.nome]));

  async function adicionar() {
    const r = await c.salvarInsumo({ nome: novo.nome, unidade: novo.unidade, custo: num(novo.custo) });
    if (r) return avisar(r);
    avisar(`${novo.nome.trim()} cadastrado`);
    setNovo({ nome: "", unidade: novo.unidade, custo: "" });
  }

  async function salvarEdicao() {
    if (!editando) return;
    const r = await c.salvarInsumo({ id: editando.id, nome: editando.nome, unidade: editando.unidade, custo: num(editando.custoTxt) });
    if (r) return avisar(r);
    const n = usos(editando.id);
    avisar(n ? `Preço atualizado. O custo de ${n} prato${n > 1 ? "s" : ""} foi recalculado.` : "Insumo atualizado");
    setEditando(null);
  }

  return (
    <div className="mt-4">
      <p className="text-[14px] text-areia">Cadastre pelo preço que você paga. Quando o fornecedor aumentar, é só atualizar aqui: o custo de todos os pratos muda junto.</p>
      <FormInsumo v={novo} setV={setNovo} ok={adicionar} rotuloOk="Adicionar" />
      <ul className="mt-3 divide-y divide-linha rounded-2xl border border-linha bg-forno">
        {!c.insumos.length && <li className="p-4 text-[14px] text-fumo">Nenhum insumo ainda.</li>}
        {c.insumos.map((i) =>
          editando?.id === i.id ? (
            <li key={i.id} className="px-2 pb-2">
              <FormInsumo v={{ nome: editando.nome, unidade: editando.unidade, custo: editando.custoTxt }} setV={(x) => setEditando({ ...editando, nome: x.nome, unidade: x.unidade, custoTxt: x.custo })} ok={salvarEdicao} cancelar={() => setEditando(null)} rotuloOk="Salvar" />
            </li>
          ) : (
            <li key={i.id} className="flex items-center gap-3 px-4 py-3">
              <button onClick={() => setEditando({ ...i, custoTxt: txt(i.custo, 4) })} className="min-w-0 flex-1 text-left">
                <p className="truncate font-semibold">{i.nome}</p>
                <p className="truncate text-[13px] text-areia">
                  {(() => {
                    const pratos = Object.entries(c.fichas)
                      .filter(([, ls]) => ls.some((l) => l.insumo_id === i.id))
                      .map(([pid]) => nomes.get(pid))
                      .filter(Boolean);
                    return pratos.length ? `Usado em ${pratos.length}: ${pratos.slice(0, 3).join(", ")}${pratos.length > 3 ? "…" : ""}` : "Ainda não usado em nenhum prato";
                  })()}
                </p>
              </button>
              <span className="tabular shrink-0 text-[15px] font-semibold">
                {brl(i.custo)}
                <span className="text-[13px] font-normal text-areia">/{compraDe(i.unidade)}</span>
              </span>
              <button
                onClick={async () => {
                  const n = usos(i.id);
                  if (n && !confirm(`${i.nome} está em ${n} prato${n > 1 ? "s" : ""}. Excluir tira ele dessas receitas. Continuar?`)) return;
                  const r = await c.removerInsumo(i.id);
                  avisar(r ?? `${i.nome} excluído`);
                }}
                aria-label={`Excluir ${i.nome}`}
                className="rounded-full p-2 text-areia hover:bg-grafite hover:text-tomate"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ),
        )}
      </ul>
    </div>
  );
}
