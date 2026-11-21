// Janelas para lançar prejuízo: desperdício/cortesia avulsa, cortesia de item da mesa e pedido que voltou.
import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { brl } from "../../data/mock";
import { useDados } from "../../data/dados";
import { compraDe, custoFicha, useCustos } from "../../data/custos";
import { MOTIVOS, TIPOS_PREJUIZO, useLancarPrejuizo, type TipoPrejuizo } from "../../data/prejuizos";

const num = (s: string) => {
  const t = s.replace(/[^\d,.]/g, "");
  if (!t) return NaN;
  return Number(t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t);
};

function Janela({ titulo, fechar, children }: { titulo: string; fechar: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4" onClick={fechar}>
      <div role="dialog" aria-label={titulo} className="flex max-h-[94vh] w-full max-w-[560px] flex-col rounded-t-3xl border border-linha bg-forno sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-linha px-6 py-4">
          <h2 className="font-display text-[22px] font-extrabold">{titulo}</h2>
          <button onClick={fechar} aria-label="Fechar" className="rounded-full p-2 hover:bg-grafite">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

export function Motivos({ tipo, motivo, setMotivo }: { tipo: TipoPrejuizo; motivo: string; setMotivo: (m: string) => void }) {
  return (
    <div>
      <p className="mb-1.5 text-[13px] font-semibold text-areia">Motivo</p>
      <div className="flex flex-wrap gap-1.5">
        {MOTIVOS[tipo].map((m) => (
          <button key={m} onClick={() => setMotivo(motivo === m ? "" : m)} aria-pressed={motivo === m} className={`rounded-full px-3 py-1.5 text-[13px] font-semibold ${motivo === m ? "bg-papel text-carvao" : "border border-linha text-areia hover:text-papel"}`}>
            {m}
          </button>
        ))}
      </div>
      <input value={MOTIVOS[tipo].includes(motivo) ? "" : motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ou escreva o motivo" aria-label="Outro motivo" className="mt-2 w-full rounded-xl border border-linha bg-carvao/0 px-3 py-2 text-[14px] outline-none focus:border-brasa" />
    </div>
  );
}

type Item = { chave: string; tipo: "produto" | "insumo"; id: string; nome: string; preco: number; custo: number | null; unidade?: "kg" | "l" | "un" };
type Linha = { item: Item; qtd: string };
const un = (i: Item) => (i.tipo === "insumo" ? (i.unidade === "l" ? "L" : i.unidade!) : "un");

/** Desperdício ou cortesia avulsa (sem mesa), com quantos produtos e insumos quiser. */
export function LancarPrejuizo({ fechar, avisar, depois }: { fechar: () => void; avisar: (t: string) => void; depois?: () => void }) {
  const d = useDados();
  const c = useCustos();
  const l = useLancarPrejuizo();
  const [tipo, setTipo] = useState<"desperdicio" | "cortesia">("desperdicio");
  const [busca, setBusca] = useState("");
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [motivo, setMotivo] = useState("");
  const [quem, setQuem] = useState("");
  const [indo, setIndo] = useState<number | null>(null);

  const itens: Item[] = useMemo(
    () => [
      ...d.cardapioTodo.map((p) => ({ chave: "p" + p.id, tipo: "produto" as const, id: p.id, nome: p.nome, preco: p.promo ?? p.preco, custo: custoFicha(c.fichas[p.id], c.insumos) })),
      ...c.insumos.map((i) => ({ chave: "i" + i.id, tipo: "insumo" as const, id: i.id, nome: i.nome, preco: 0, custo: i.custo, unidade: i.unidade })),
    ],
    [d.cardapioTodo, c.fichas, c.insumos],
  );
  const q = busca.trim().toLowerCase();
  const achados = q ? itens.filter((i) => i.nome.toLowerCase().includes(q)).slice(0, 8) : [];
  const custoLinha = (x: Linha) => (x.item.custo != null && num(x.qtd) > 0 ? x.item.custo * num(x.qtd) : 0);
  const total = linhas.reduce((s, x) => s + custoLinha(x), 0);
  const semFicha = linhas.filter((x) => x.item.tipo === "produto" && x.item.custo == null);

  function adicionar(i: Item) {
    setBusca("");
    const j = linhas.findIndex((x) => x.item.chave === i.chave);
    if (j >= 0) return setLinhas(linhas.map((x, k) => (k === j && i.tipo === "produto" ? { ...x, qtd: String((num(x.qtd) || 0) + 1) } : x)));
    setLinhas([...linhas, { item: i, qtd: i.tipo === "produto" ? "1" : "" }]);
  }
  const mudar = (k: number, qtd: string) => setLinhas(linhas.map((x, j) => (j === k ? { ...x, qtd } : x)));

  async function salvar() {
    if (!linhas.length) return avisar("Adicione pelo menos um produto ou insumo");
    const ruim = linhas.find((x) => !(num(x.qtd) > 0));
    if (ruim) return avisar(`Diga a quantidade de ${ruim.item.nome}`);
    if (tipo === "cortesia" && !quem.trim()) return avisar("Diga para quem foi a cortesia");
    const falhas: string[] = [];
    for (const [k, x] of linhas.entries()) {
      setIndo(k + 1);
      const r = await l.lancar(tipo, { [x.item.tipo === "produto" ? "product_id" : "insumo_id"]: x.item.id, nome: x.item.nome, preco: x.item.preco, custo: x.item.custo ?? 0 }, num(x.qtd), motivo, quem);
      if (r) falhas.push(`${x.item.nome} (${r})`);
    }
    setIndo(null);
    if (falhas.length) return avisar(`Não deu: ${falhas.join(", ")}`);
    avisar(`${TIPOS_PREJUIZO[tipo].nome}: ${linhas.length} ${linhas.length === 1 ? "item lançado" : "itens lançados"} · custo ${brl(total)}. O estoque já baixou.`);
    depois?.();
    fechar();
  }

  return (
    <Janela titulo="Lançar prejuízo" fechar={fechar}>
      <div className="grid grid-cols-2 gap-2" role="group" aria-label="Tipo">
        {(["desperdicio", "cortesia"] as const).map((t) => (
          <button key={t} onClick={() => (setTipo(t), setMotivo(""))} aria-pressed={tipo === t} className={`rounded-2xl border p-3 text-left ${tipo === t ? "border-brasa bg-brasa/10" : "border-linha hover:bg-grafite"}`}>
            <span className="block font-semibold">{TIPOS_PREJUIZO[t].nome}</span>
            <span className="text-[12px] text-areia">{t === "desperdicio" ? "Perdido na cozinha ou no estoque" : "Dado sem passar pelo caixa"}</span>
          </button>
        ))}
      </div>

      <div className="mt-4">
        <p className="mb-1.5 text-[13px] font-semibold text-areia">Produtos e insumos</p>
        <label className="flex items-center gap-2 rounded-xl border border-linha px-3 focus-within:border-brasa">
          <Search className="h-4 w-4 text-areia" />
          <input autoFocus value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar e adicionar prato ou insumo" aria-label="Buscar prato ou insumo" className="w-full bg-transparent py-2.5 text-[15px] outline-none" />
        </label>
        {!!achados.length && (
          <ul className="mt-1 divide-y divide-linha rounded-xl border border-linha">
            {achados.map((i) => (
              <li key={i.chave}>
                <button onClick={() => adicionar(i)} className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-grafite">
                  <span>{i.nome}</span>
                  <span className="text-[12px] text-areia">{i.tipo === "insumo" ? `insumo · ${brl(i.custo ?? 0)}/${compraDe(i.unidade!)}` : i.custo != null ? `custo ${brl(i.custo)}` : "sem ficha técnica"}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {linhas.length > 0 && (
          <ul className="mt-3 space-y-2">
            {linhas.map((x, k) => (
              <li key={x.item.chave} className="flex items-center gap-2 rounded-xl bg-grafite p-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{x.item.nome}</p>
                  <p className="text-[12px] text-areia">{x.item.custo == null ? "sem ficha técnica · custo zero" : `custo ${brl(custoLinha(x))}`}</p>
                </div>
                {x.item.tipo === "produto" && (
                  <button onClick={() => mudar(k, String(Math.max(1, (num(x.qtd) || 1) - 1)))} aria-label="Menos" className="grid h-8 w-8 place-items-center rounded-full border border-linha text-[18px]">
                    −
                  </button>
                )}
                <label className="flex w-[86px] items-center gap-1 rounded-lg border border-linha bg-carvao/0 px-2 focus-within:border-brasa">
                  <input value={x.qtd} onChange={(e) => mudar(k, e.target.value)} inputMode="decimal" placeholder="0" aria-label={`Quantidade de ${x.item.nome}`} className="w-full bg-transparent py-1.5 text-right text-[15px] outline-none" />
                  <span className="text-[12px] text-areia">{un(x.item)}</span>
                </label>
                {x.item.tipo === "produto" && (
                  <button onClick={() => mudar(k, String((num(x.qtd) || 0) + 1))} aria-label="Mais" className="grid h-8 w-8 place-items-center rounded-full border border-linha text-[18px]">
                    +
                  </button>
                )}
                <button onClick={() => setLinhas(linhas.filter((_, j) => j !== k))} aria-label={`Tirar ${x.item.nome}`} className="rounded-full p-1.5 text-areia hover:text-tomate">
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
        {!linhas.length && <p className="mt-2 text-[12px] text-fumo">Adicione quantos itens quiser. Pedido que voltou se lança no próprio pedido; cortesia de mesa, no item da comanda.</p>}
      </div>

      <div className="mt-4 flex items-center justify-between rounded-xl border border-tomate/40 bg-tomate/10 px-4 py-3">
        <span className="text-[14px] text-areia">Prejuízo pelo custo (CMV)</span>
        <span className="tabular font-display text-[22px] font-extrabold text-tomate">{brl(total)}</span>
      </div>
      {!!semFicha.length && <p className="mt-1 text-[12px] text-fumo">Sem ficha técnica: {semFicha.map((x) => x.item.nome).join(", ")}. Monte a ficha em Cardápio → Custos para o custo entrar.</p>}

      <div className="mt-4">
        <Motivos tipo={tipo} motivo={motivo} setMotivo={setMotivo} />
      </div>
      {tipo === "cortesia" && (
        <label className="mt-4 block text-[13px] font-semibold text-areia">
          Para quem
          <input value={quem} onChange={(e) => setQuem(e.target.value)} placeholder="Ex.: cliente Juliana, equipe, entregador, parceiro" className="mt-1 w-full rounded-xl border border-linha bg-carvao/0 px-3 py-2.5 text-[15px] font-normal text-papel outline-none focus:border-brasa" />
        </label>
      )}
      <button disabled={indo != null || !linhas.length} onClick={salvar} className="mt-5 w-full rounded-full bg-brasa py-3.5 text-[15px] font-bold text-carvao hover:bg-mostarda disabled:opacity-50">
        {indo != null ? `Lançando ${indo} de ${linhas.length}…` : linhas.length ? `Lançar ${linhas.length} ${linhas.length === 1 ? "item" : "itens"}` : "Adicione os itens"}
      </button>
    </Janela>
  );
}

/** Item da mesa vira cortesia. */
export function CortesiaItem({ item, fechar, avisar, depois }: { item: { id: string; nome: string; qtd: number; unit: number }; fechar: () => void; avisar: (t: string) => void; depois: (motivo: string) => void }) {
  const l = useLancarPrejuizo();
  const [motivo, setMotivo] = useState("");
  const [quem, setQuem] = useState("");
  const [indo, setIndo] = useState(false);
  return (
    <Janela titulo="Dar como cortesia" fechar={fechar}>
      <p className="text-[15px]">
        <b>
          {item.qtd}x {item.nome}
        </b>{" "}
        sai da conta e entra nos prejuízos como cortesia, pelo custo (CMV) do prato.
      </p>
      <div className="mt-4">
        <Motivos tipo="cortesia" motivo={motivo} setMotivo={setMotivo} />
      </div>
      <label className="mt-4 block text-[13px] font-semibold text-areia">
        Para quem (opcional)
        <input value={quem} onChange={(e) => setQuem(e.target.value)} placeholder="Ex.: Juliana, aniversariante" className="mt-1 w-full rounded-xl border border-linha bg-carvao/0 px-3 py-2.5 text-[15px] font-normal text-papel outline-none focus:border-brasa" />
      </label>
      <button
        disabled={indo}
        onClick={async () => {
          setIndo(true);
          const r = await l.cortesia(item.id, { nome: item.nome, valor: item.unit * item.qtd, qtd: item.qtd }, motivo, quem);
          setIndo(false);
          if (r) return avisar(r);
          avisar(`${item.nome} virou cortesia e saiu da conta`);
          depois(motivo);
          fechar();
        }}
        className="mt-5 w-full rounded-full bg-brasa py-3.5 text-[15px] font-bold text-carvao hover:bg-mostarda disabled:opacity-50"
      >
        {indo ? "Lançando…" : "Confirmar cortesia"}
      </button>
    </Janela>
  );
}

/** Pedido que voltou. */
export function DevolverPedido({ pedido, fechar, avisar, depois }: { pedido: { id?: string; num: number; total: number }; fechar: () => void; avisar: (t: string) => void; depois: (motivo: string) => void }) {
  const l = useLancarPrejuizo();
  const [motivo, setMotivo] = useState("");
  const [indo, setIndo] = useState(false);
  return (
    <Janela titulo={`Pedido #${pedido.num} voltou`} fechar={fechar}>
      <p className="text-[15px]">
        O pedido sai do caixa e entra nos prejuízos como <b>venda que voltou</b>, pelo custo (CMV) do que foi feito. O que foi usado na cozinha baixa do estoque como perda.
      </p>
      <p className="mt-2 text-[13px] text-areia">Se o cliente pagou, combine com ele a devolução do dinheiro pelo mesmo meio.</p>
      <div className="mt-4">
        <Motivos tipo="devolucao" motivo={motivo} setMotivo={setMotivo} />
      </div>
      <button
        disabled={indo || !motivo.trim()}
        onClick={async () => {
          setIndo(true);
          const r = await l.devolver(pedido.id, { num: pedido.num, total: pedido.total }, motivo);
          setIndo(false);
          if (r) return avisar(r);
          avisar(`Pedido #${pedido.num} lançado como devolvido`);
          depois(motivo);
          fechar();
        }}
        className="mt-5 w-full rounded-full bg-tomate py-3.5 text-[15px] font-bold text-white disabled:opacity-50"
      >
        {indo ? "Lançando…" : motivo.trim() ? "Confirmar devolução" : "Escolha o motivo"}
      </button>
    </Janela>
  );
}
