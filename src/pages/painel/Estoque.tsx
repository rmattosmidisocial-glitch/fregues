import { useEffect, useState } from "react";
import { AlertTriangle, ArrowDownCircle, ArrowUpCircle, Camera, ClipboardCheck, PackageX } from "lucide-react";
import { NotaCompra } from "./NotaCompra";
import { brl } from "../../data/mock";
import { compraDe, qtdTxt, situacao, type Insumo, type Movimento, type useCustos } from "../../data/custos";

type C = ReturnType<typeof useCustos>;
const campo = "w-full rounded-xl border border-linha bg-carvao/0 px-3 py-2 text-[15px] outline-none focus:border-brasa";
const num = (s: string) => {
  const t = s.replace(/[^\d,.]/g, "");
  if (!t) return NaN;
  return Number(t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t);
};
const SIT = {
  ok: { txt: "Ok", cls: "bg-manjericao/20 text-manjericao" },
  baixo: { txt: "Acabando", cls: "bg-mostarda/25 text-[#8a5a00]" },
  acabou: { txt: "Acabou", cls: "bg-tomate/15 text-tomate" },
  fora: { txt: "Sem controle", cls: "bg-grafite text-areia" },
} as const;
const NOME_MOV: Record<Movimento["tipo"], string> = { entrada: "Entrada", venda: "Venda", estorno: "Devolvido (cancelado)", perda: "Perda", contagem: "Contagem" };

export function Estoque({ c, avisar }: { c: C; avisar: (t: string) => void }) {
  const [filtro, setFiltro] = useState<"todos" | "atencao" | "fora">("todos");
  const [aberto, setAberto] = useState<string | null>(null);
  const [nota, setNota] = useState(false);
  const [hist, setHist] = useState<{ mov: Movimento[]; consumo7: Record<string, number> } | null>(null);
  const ver = c.insumos;

  useEffect(() => {
    let vivo = true;
    c.historico().then((h) => vivo && setHist(h));
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c.insumos]);

  const controlados = ver.filter((i) => i.estoque != null);
  const atencao = controlados.filter((i) => ["baixo", "acabou"].includes(situacao(i)));
  const valor = controlados.reduce((s, i) => s + Math.max(0, i.estoque ?? 0) * i.custo, 0);
  const ordem = { acabou: 0, baixo: 1, ok: 2, fora: 3 };
  const lista = ver.filter((i) => (filtro === "todos" ? true : filtro === "atencao" ? ["baixo", "acabou"].includes(situacao(i)) : i.estoque == null)).sort((a, b) => ordem[situacao(a)] - ordem[situacao(b)] || a.nome.localeCompare(b.nome));
  const nomes = new Map(ver.map((i) => [i.id, i]));

  const dura = (i: Insumo) => {
    const dia = (hist?.consumo7[i.id] ?? 0) / 7;
    if (i.estoque == null || dia <= 0) return null;
    return Math.max(0, Math.floor(i.estoque / dia));
  };

  if (c.carregando) return <p className="mt-6 text-areia">Carregando…</p>;

  return (
    <div className="mt-6">
      <button onClick={() => setNota(true)} className="mb-4 flex w-full items-center gap-3 rounded-2xl border border-brasa/50 bg-brasa/10 p-4 text-left hover:bg-brasa/15">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brasa text-carvao">
          <Camera className="h-5 w-5" />
        </span>
        <span>
          <b className="block">Lançar nota de compra pela foto</b>
          <span className="text-[13px] text-areia">A IA lê os produtos, quantidades e valores. Você confere e lança tudo de uma vez.</span>
        </span>
      </button>
      {nota && <NotaCompra c={c} avisar={avisar} fechar={() => setNota(false)} />}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-linha bg-forno p-4">
          <p className="text-[13px] text-areia">Acabando ou zerados</p>
          <p className={`mt-1 font-display text-[34px] font-extrabold leading-none ${atencao.length ? "text-tomate" : "text-manjericao"}`}>{atencao.length}</p>
          <p className="mt-1 truncate text-[13px] text-areia">{atencao.length ? atencao.map((i) => i.nome).join(", ") : "Tudo abastecido"}</p>
        </div>
        <div className="rounded-2xl border border-linha bg-forno p-4">
          <p className="text-[13px] text-areia">Insumos com estoque controlado</p>
          <p className="mt-1 font-display text-[34px] font-extrabold leading-none">
            {controlados.length}
            <span className="text-[18px] text-fumo"> de {ver.length}</span>
          </p>
          <p className="mt-1 text-[13px] text-areia">Cada venda dá baixa pela ficha técnica</p>
        </div>
        <div className="rounded-2xl border border-linha bg-forno p-4">
          <p className="text-[13px] text-areia">Valor parado em estoque</p>
          <p className="mt-1 font-display text-[34px] font-extrabold leading-none">{brl(valor)}</p>
          <p className="mt-1 text-[13px] text-areia">Pelo preço de compra atual</p>
        </div>
      </div>

      {!ver.length && <p className="mt-4 rounded-2xl bg-grafite p-4 text-[14px] text-areia">Cadastre os insumos na aba “Custos e CMV” e monte a ficha técnica dos pratos. Depois volte aqui para dizer quanto tem de cada um.</p>}

      {!!ver.length && (
        <>
          <div className="mt-5 inline-flex rounded-full bg-grafite p-1 text-[14px] font-semibold" role="group" aria-label="Filtro">
            {(
              [
                ["todos", "Todos"],
                ["atencao", `Acabando (${atencao.length})`],
                ["fora", "Sem controle"],
              ] as const
            ).map(([f, t]) => (
              <button key={f} onClick={() => setFiltro(f)} aria-pressed={filtro === f} className={`whitespace-nowrap rounded-full px-3 py-1.5 ${filtro === f ? "bg-papel text-carvao" : "text-areia hover:text-papel"}`}>
                {t}
              </button>
            ))}
          </div>

          <ul className="mt-3 divide-y divide-linha rounded-2xl border border-linha bg-forno">
            {!lista.length && <li className="p-4 text-[14px] text-fumo">Nada aqui.</li>}
            {lista.map((i) => {
              const s = situacao(i);
              const d = dura(i);
              return (
                <li key={i.id}>
                  <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 font-semibold">
                        <span className="truncate">{i.nome}</span>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${SIT[s].cls}`}>{SIT[s].txt}</span>
                      </p>
                      <p className="text-[13px] text-areia">{i.estoque == null ? "Toque em Controlar para dizer quanto tem" : `mínimo ${qtdTxt(i.minimo ?? 0, i.unidade)}${d != null ? ` · dura uns ${d} dia${d === 1 ? "" : "s"} no ritmo atual` : ""}`}</p>
                    </div>
                    {i.estoque != null && <span className={`tabular shrink-0 text-[17px] font-bold ${s === "acabou" ? "text-tomate" : s === "baixo" ? "text-mostarda" : ""}`}>{qtdTxt(i.estoque, i.unidade)}</span>}
                    <button onClick={() => setAberto(aberto === i.id ? null : i.id)} aria-expanded={aberto === i.id} className={`shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold ${i.estoque == null ? "border border-linha hover:bg-grafite" : "bg-papel text-carvao hover:bg-mostarda"}`}>
                      {i.estoque == null ? "Controlar" : "Lançar"}
                    </button>
                  </div>
                  {aberto === i.id && <Lancar key={i.id} i={i} c={c} avisar={avisar} fechar={() => setAberto(null)} />}
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-[13px] text-fumo">A baixa sai da ficha técnica de cada prato vendido (loja online, balcão e mesa, quando a conta fecha). Pedido cancelado devolve sozinho. Insumo sem ficha não baixa.</p>

          <h3 className="mt-8 font-display text-[20px] font-bold">Últimos lançamentos</h3>
          <ul className="mt-2 divide-y divide-linha rounded-2xl border border-linha bg-forno">
            {!hist?.mov.length && <li className="p-4 text-[14px] text-fumo">Nenhum lançamento ainda.</li>}
            {hist?.mov.slice(0, 15).map((m) => {
              const ins = nomes.get(m.insumo_id);
              const icone =
                m.tipo === "entrada" || m.tipo === "estorno" ? <ArrowUpCircle className="h-5 w-5 text-manjericao" /> : m.tipo === "perda" ? <PackageX className="h-5 w-5 text-tomate" /> : m.tipo === "contagem" ? <ClipboardCheck className="h-5 w-5 text-areia" /> : <ArrowDownCircle className="h-5 w-5 text-areia" />;
              return (
                <li key={m.id} className="flex items-center gap-3 px-4 py-2.5">
                  {icone}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold">
                      {NOME_MOV[m.tipo]} · {ins?.nome ?? "Insumo excluído"}
                    </p>
                    <p className="truncate text-[12px] text-areia">
                      {new Date(m.quando).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      {m.obs ? ` · ${m.obs}` : ""}
                    </p>
                  </div>
                  {ins && (
                    <span className="tabular shrink-0 text-right text-[14px]">
                      <span className={m.qtd >= 0 ? "text-manjericao" : "text-tomate"}>
                        {m.qtd >= 0 ? "+" : "−"}
                        {qtdTxt(Math.abs(m.qtd), ins.unidade)}
                      </span>
                      {m.saldo != null && <span className="block text-[12px] text-areia">ficou {qtdTxt(m.saldo, ins.unidade)}</span>}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

function Lancar({ i, c, avisar, fechar }: { i: Insumo; c: C; avisar: (t: string) => void; fechar: () => void }) {
  const novo = i.estoque == null;
  const [tipo, setTipo] = useState<"entrada" | "perda" | "contagem">(novo ? "contagem" : "entrada");
  const [qtd, setQtd] = useState("");
  const [preco, setPreco] = useState("");
  const [minimo, setMinimo] = useState(i.minimo ? String(i.minimo).replace(".", ",") : "");
  const [obs, setObs] = useState("");
  const [salvando, setSalvando] = useState(false);
  const u = compraDe(i.unidade);
  const un = i.unidade === "l" ? "L" : i.unidade;

  async function salvar() {
    const q = num(qtd);
    if (!(q >= 0)) return avisar("Diga a quantidade");
    const p = num(preco);
    const m = num(minimo);
    setSalvando(true);
    const r = await c.lancarEstoque(i.id, tipo, q, { custo: tipo === "entrada" && p >= 0 ? p : undefined, obs, minimo: m >= 0 ? m : undefined });
    setSalvando(false);
    if (r) return avisar(r);
    avisar(tipo === "entrada" ? `Entrada de ${qtdTxt(q, i.unidade)} de ${i.nome}${p >= 0 ? ` · custo atualizado para ${brl(p)}/${u}` : ""}` : tipo === "perda" ? `Perda de ${qtdTxt(q, i.unidade)} de ${i.nome} lançada` : `${i.nome}: estoque agora é ${qtdTxt(q, i.unidade)}`);
    fechar();
  }

  return (
    <div className="border-t border-linha bg-carvao/30 px-4 py-4">
      {novo ? (
        <p className="text-[14px] font-semibold">Começar a controlar {i.nome}: quanto tem agora?</p>
      ) : (
        <div className="inline-flex rounded-full bg-grafite p-1 text-[13px] font-semibold" role="group" aria-label="Tipo de lançamento">
          {(
            [
              ["entrada", "Chegou (compra)"],
              ["perda", "Perda"],
              ["contagem", "Contagem"],
            ] as const
          ).map(([t, r]) => (
            <button key={t} onClick={() => setTipo(t)} aria-pressed={tipo === t} className={`whitespace-nowrap rounded-full px-3 py-1.5 ${tipo === t ? "bg-papel text-carvao" : "text-areia hover:text-papel"}`}>
              {r}
            </button>
          ))}
        </div>
      )}
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <label className="flex items-center gap-1 rounded-xl border border-linha px-3 focus-within:border-brasa">
          <input autoFocus value={qtd} onChange={(e) => setQtd(e.target.value)} inputMode="decimal" placeholder={tipo === "contagem" ? "Quanto tem" : tipo === "entrada" ? "Quanto chegou" : "Quanto perdeu"} aria-label="Quantidade" className="w-full bg-transparent py-2 text-[15px] outline-none" />
          <span className="text-[13px] text-areia">{un}</span>
        </label>
        {tipo === "entrada" && (
          <label className="flex items-center gap-1 rounded-xl border border-linha px-3 focus-within:border-brasa">
            <span className="text-[13px] text-areia">R$</span>
            <input value={preco} onChange={(e) => setPreco(e.target.value)} inputMode="decimal" placeholder={`Preço pago por ${u} (opcional)`} aria-label="Preço pago" className="w-full bg-transparent py-2 text-[15px] outline-none" />
          </label>
        )}
        {tipo === "contagem" && (
          <label className="flex items-center gap-1 rounded-xl border border-linha px-3 focus-within:border-brasa">
            <input value={minimo} onChange={(e) => setMinimo(e.target.value)} inputMode="decimal" placeholder="Avisar quando chegar a…" aria-label="Estoque mínimo" className="w-full bg-transparent py-2 text-[15px] outline-none" />
            <span className="text-[13px] text-areia">{un}</span>
          </label>
        )}
        <input value={obs} onChange={(e) => setObs(e.target.value)} placeholder={tipo === "perda" ? "Motivo (venceu, caiu…)" : "Observação (opcional)"} aria-label="Observação" className={campo} />
      </div>
      {tipo === "entrada" && <p className="mt-2 text-[12px] text-areia">Se informar o preço, o custo do insumo e o CMV dos pratos são atualizados.</p>}
      {tipo === "contagem" && !novo && (
        <p className="mt-2 flex items-center gap-1.5 text-[12px] text-areia">
          <AlertTriangle className="h-3.5 w-3.5" /> O estoque passa a ser exatamente o que você contou. Hoje o sistema marca {qtdTxt(i.estoque ?? 0, i.unidade)}.
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        {!novo ? (
          <button
            onClick={async () => {
              if (!confirm(`Parar de controlar o estoque de ${i.nome}? O histórico fica guardado.`)) return;
              const r = await c.desligarEstoque(i.id);
              avisar(r ?? `${i.nome} sem controle de estoque`);
              fechar();
            }}
            className="text-[13px] text-areia hover:text-tomate"
          >
            Parar de controlar
          </button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <button onClick={fechar} className="rounded-full border border-linha px-4 py-2 text-[14px]">
            Cancelar
          </button>
          <button disabled={salvando} onClick={salvar} className="rounded-full bg-brasa px-5 py-2 text-[14px] font-semibold text-carvao hover:bg-mostarda disabled:opacity-50">
            {salvando ? "Salvando…" : "Lançar"}
          </button>
        </div>
      </div>
    </div>
  );
}
