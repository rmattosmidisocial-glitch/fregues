// Janelas para lançar prejuízo: desperdício/cortesia avulsa, cortesia de item da mesa e pedido que voltou.
import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { brl } from "../../data/mock";
import { useDados } from "../../data/dados";
import { compraDe, custoFicha, qtdTxt, useCustos } from "../../data/custos";
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

/** Desperdício ou cortesia avulsa (sem mesa): do Caixa ou da tela de Prejuízos. */
export function LancarPrejuizo({ fechar, avisar, depois }: { fechar: () => void; avisar: (t: string) => void; depois?: () => void }) {
  const d = useDados();
  const c = useCustos();
  const l = useLancarPrejuizo();
  const [tipo, setTipo] = useState<"desperdicio" | "cortesia">("desperdicio");
  const [busca, setBusca] = useState("");
  const [item, setItem] = useState<Item | null>(null);
  const [qtd, setQtd] = useState("1");
  const [motivo, setMotivo] = useState("");
  const [quem, setQuem] = useState("");
  const [indo, setIndo] = useState(false);

  const itens: Item[] = useMemo(
    () => [
      ...d.cardapioTodo.map((p) => ({ chave: "p" + p.id, tipo: "produto" as const, id: p.id, nome: p.nome, preco: p.promo ?? p.preco, custo: custoFicha(c.fichas[p.id], c.insumos) })),
      ...c.insumos.map((i) => ({ chave: "i" + i.id, tipo: "insumo" as const, id: i.id, nome: i.nome, preco: 0, custo: i.custo, unidade: i.unidade })),
    ],
    [d.cardapioTodo, c.fichas, c.insumos],
  );
  const q = busca.trim().toLowerCase();
  const achados = q ? itens.filter((i) => i.nome.toLowerCase().includes(q)).slice(0, 8) : [];
  const n = num(qtd);
  const custo = item?.custo != null && n > 0 ? item.custo * n : null;

  async function salvar() {
    if (!item) return avisar("Escolha o produto ou insumo");
    if (!(n > 0)) return avisar("Diga a quantidade");
    if (tipo === "cortesia" && !quem.trim()) return avisar("Diga para quem foi a cortesia");
    setIndo(true);
    const r = await l.lancar(tipo, { [item.tipo === "produto" ? "product_id" : "insumo_id"]: item.id, nome: item.nome, preco: item.preco, custo: item.custo ?? 0 }, n, motivo, quem);
    setIndo(false);
    if (r) return avisar(r);
    avisar(`${TIPOS_PREJUIZO[tipo].nome} lançado: ${item.nome}${custo != null ? ` · custo ${brl(custo)}` : ""}. O estoque já baixou.`);
    depois?.();
    fechar();
  }

  return (
    <Janela titulo="Lançar prejuízo" fechar={fechar}>
      <div className="grid grid-cols-2 gap-2" role="group" aria-label="Tipo">
        {(["desperdicio", "cortesia"] as const).map((t) => (
          <button key={t} onClick={() => (setTipo(t), setMotivo(""))} aria-pressed={tipo === t} className={`rounded-2xl border p-3 text-left ${tipo === t ? "border-brasa bg-brasa/10" : "border-linha hover:bg-grafite"}`}>
            <span className="block font-semibold">{TIPOS_PREJUIZO[t].nome}</span>
            <span className="text-[12px] text-areia">{t === "desperdicio" ? "Queimou, caiu, venceu, sobrou" : "Dado sem passar pelo caixa"}</span>
          </button>
        ))}
      </div>
      <p className="mt-3 text-[12px] text-fumo">Pedido que voltou se lança no próprio pedido, em Pedidos. Cortesia de mesa, no item da comanda.</p>

      <div className="mt-4">
        <p className="mb-1.5 text-[13px] font-semibold text-areia">O que foi</p>
        {item ? (
          <div className="flex items-center justify-between rounded-xl border border-brasa/50 bg-brasa/10 px-3 py-2.5">
            <span>
              <b>{item.nome}</b> <span className="text-[13px] text-areia">{item.tipo === "insumo" ? `insumo · ${brl(item.custo ?? 0)}/${compraDe(item.unidade!)}` : `produto · ${brl(item.preco)}`}</span>
            </span>
            <button onClick={() => setItem(null)} className="text-[13px] text-areia hover:text-papel">
              trocar
            </button>
          </div>
        ) : (
          <>
            <label className="flex items-center gap-2 rounded-xl border border-linha px-3 focus-within:border-brasa">
              <Search className="h-4 w-4 text-areia" />
              <input autoFocus value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar prato ou insumo" aria-label="Buscar prato ou insumo" className="w-full bg-transparent py-2.5 text-[15px] outline-none" />
            </label>
            {!!achados.length && (
              <ul className="mt-1 divide-y divide-linha rounded-xl border border-linha">
                {achados.map((i) => (
                  <li key={i.chave}>
                    <button onClick={() => (setItem(i), setQtd(i.tipo === "insumo" ? "" : "1"))} className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-grafite">
                      <span>{i.nome}</span>
                      <span className="text-[12px] text-areia">{i.tipo === "insumo" ? "insumo" : brl(i.preco)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <label className="text-[13px] font-semibold text-areia">
          Quantidade
          <span className="mt-1 flex items-center gap-1 rounded-xl border border-linha px-3 focus-within:border-brasa">
            <input value={qtd} onChange={(e) => setQtd(e.target.value)} inputMode="decimal" aria-label="Quantidade" className="w-full bg-transparent py-2.5 text-[15px] font-normal text-papel outline-none" />
            <span className="text-[13px] font-normal">{item?.tipo === "insumo" ? (item.unidade === "l" ? "L" : item.unidade) : "un"}</span>
          </span>
        </label>
        <div className="rounded-xl bg-grafite p-3 text-[13px]">
          <p className="text-areia">Custo para a casa</p>
          <p className="tabular font-display text-[20px] font-extrabold">{custo != null ? brl(custo) : "—"}</p>
          {item?.tipo === "produto" && item.custo == null && <p className="text-[11px] text-fumo">sem ficha técnica</p>}
        </div>
      </div>

      <div className="mt-4">
        <Motivos tipo={tipo} motivo={motivo} setMotivo={setMotivo} />
      </div>
      {tipo === "cortesia" && (
        <label className="mt-4 block text-[13px] font-semibold text-areia">
          Para quem
          <input value={quem} onChange={(e) => setQuem(e.target.value)} placeholder="Ex.: cliente Juliana, equipe, entregador, parceiro" className="mt-1 w-full rounded-xl border border-linha bg-carvao/0 px-3 py-2.5 text-[15px] font-normal text-papel outline-none focus:border-brasa" />
        </label>
      )}
      <button disabled={indo} onClick={salvar} className="mt-5 w-full rounded-full bg-brasa py-3.5 text-[15px] font-bold text-carvao hover:bg-mostarda disabled:opacity-50">
        {indo ? "Lançando…" : `Lançar ${TIPOS_PREJUIZO[tipo].nome.toLowerCase()}`}
      </button>
      {item?.tipo === "insumo" && item.unidade && n > 0 && (
        <p className="mt-2 text-center text-[12px] text-fumo">
          Sai {qtdTxt(n, item.unidade)} do estoque de {item.nome}.
        </p>
      )}
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
        sai da conta ({brl(item.unit * item.qtd)}) e entra nos prejuízos como cortesia.
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
        O pedido sai do caixa ({brl(pedido.total)}) e entra nos prejuízos como <b>venda que voltou</b>. O que foi usado na cozinha baixa do estoque como perda.
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
