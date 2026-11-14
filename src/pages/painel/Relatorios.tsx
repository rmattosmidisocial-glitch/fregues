// Relatórios por período (opcional: o dono liga em Configurações). Totais, formas de pagamento, canais,
// vendas por dia, produtos campeões e as planilhas para o contador.
import { useEffect, useMemo, useState } from "react";
import { Download, FileSpreadsheet } from "lucide-react";
import { useDados, type Relatorio } from "../../data/dados";
import { brl } from "../../data/mock";

const iso = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const hoje = () => new Date();
function periodo(p: string): [string, string] {
  const h = hoje();
  if (p === "hoje") return [iso(h), iso(h)];
  if (p === "7") return [iso(new Date(h.getTime() - 6 * 864e5)), iso(h)];
  if (p === "30") return [iso(new Date(h.getTime() - 29 * 864e5)), iso(h)];
  if (p === "mes") return [iso(new Date(h.getFullYear(), h.getMonth(), 1)), iso(h)];
  if (p === "passado") return [iso(new Date(h.getFullYear(), h.getMonth() - 1, 1)), iso(new Date(h.getFullYear(), h.getMonth(), 0))];
  return [iso(new Date(h.getFullYear(), 0, 1)), iso(h)];
}
const FORMAS: Record<string, string> = { pix: "Pix", cartao: "Cartão", maquininha: "Maquininha", dinheiro: "Dinheiro" };
const dataBR = (s: string) => new Date(s + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
const num = (n: number) => n.toFixed(2).replace(".", ",");

function planilha(nome: string, linhas: (string | number | null | undefined)[][]) {
  const csv = "﻿" + linhas.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(";")).join("\n");
  const u = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = u;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(u);
}

export function Relatorios() {
  const d = useDados();
  const [p, setP] = useState("mes");
  const [de, setDe] = useState(periodo("mes")[0]);
  const [ate, setAte] = useState(periodo("mes")[1]);
  const [r, setR] = useState<Relatorio | null>(null);
  const [erro, setErro] = useState("");
  const [baixando, setBaixando] = useState(false);

  useEffect(() => {
    if (p !== "outro") {
      const [a, b] = periodo(p);
      setDe(a);
      setAte(b);
    }
  }, [p]);
  useEffect(() => {
    if (!de || !ate) return;
    setR(null);
    setErro("");
    d.acoes.relatorio(de, ate).then((x) => (x.erro ? setErro(x.erro) : setR(x.dados!)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [de, ate, d.loja.id]);

  const maxDia = useMemo(() => Math.max(1, ...(r?.por_dia ?? []).map((x) => x.total)), [r]);
  const nomeArq = (t: string) => `${d.loja.slug || "loja"}-${t}-${de}-a-${ate}.csv`;

  async function baixarPedidos() {
    setBaixando(true);
    const l = await d.acoes.relatorioPedidos(de, ate);
    setBaixando(false);
    planilha(nomeArq("pedidos"), [
      ["Data", "Hora", "Pedido", "Canal", "Situação", "Forma de pagamento", "Pago", "Subtotal", "Desconto", "Taxa de entrega", "Embalagem", "Total", "Cliente", "Bairro", "Nota fiscal"],
      ...l.map((x) => {
        const dt = new Date(String(x.data));
        return [
          dt.toLocaleDateString("pt-BR"),
          dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
          x.numero as number,
          x.canal as string,
          x.status as string,
          String(x.forma ?? "")
            .split("+")
            .map((f) => FORMAS[f] ?? f)
            .join(" + "),
          x.pago ? "Sim" : "Não",
          num(Number(x.subtotal ?? x.total ?? 0)),
          num(Number(x.desconto ?? 0)),
          num(Number(x.taxa_entrega ?? 0)),
          num(Number(x.embalagem ?? 0)),
          num(Number(x.total ?? 0)),
          x.cliente as string,
          x.bairro as string,
          x.nota as string,
        ];
      }),
    ]);
  }
  function baixarResumo() {
    if (!r) return;
    planilha(nomeArq("resumo"), [
      ["Resumo de vendas", d.loja.nome],
      ["Período", `${new Date(de + "T12:00:00").toLocaleDateString("pt-BR")} a ${new Date(ate + "T12:00:00").toLocaleDateString("pt-BR")}`],
      [],
      ["Pedidos válidos", r.pedidos],
      ["Pedidos cancelados", r.cancelados],
      ["Vendas em produtos (bruto)", num(r.bruto)],
      ["Descontos", num(r.descontos)],
      ["Taxas de entrega", num(r.taxas_entrega)],
      ["Embalagens", num(r.embalagens)],
      ["Total vendido", num(r.total)],
      ["Recebido", num(r.recebido)],
      ["A receber", num(r.a_receber)],
      ["Notas fiscais emitidas", r.notas],
      [],
      ["Forma de pagamento", "Valor"],
      ...Object.entries(r.por_forma).map(([k, v]) => [FORMAS[k] ?? k, num(v)]),
      [],
      ["Canal", "Pedidos", "Valor"],
      ...Object.entries(r.por_canal).map(([k, v]) => [k, v.pedidos, num(v.total)]),
      [],
      ["Dia", "Pedidos", "Valor"],
      ...r.por_dia.map((x) => [new Date(x.dia + "T12:00:00").toLocaleDateString("pt-BR"), x.pedidos, num(x.total)]),
    ]);
  }

  const card = (rotulo: string, valor: string, sub?: string, destaque?: boolean) => (
    <div className={`rounded-3xl p-5 ${destaque ? "bg-[#fde9df]" : "border border-linha bg-forno"}`}>
      <p className={`text-[13px] ${destaque ? "text-[#9a3412]" : "text-areia"}`}>{rotulo}</p>
      <p className={`tabular mt-1 font-display text-[28px] font-extrabold leading-tight ${destaque ? "text-brasa" : ""}`}>{valor}</p>
      {sub && <p className="mt-1 text-[13px] text-areia">{sub}</p>}
    </div>
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-[clamp(2rem,4vw,2.8rem)] font-extrabold tracking-[-0.015em]">Relatórios</h1>
        <p className="text-[15px] text-areia">Escolha o período. As planilhas abrem no Excel e no Google Planilhas: é só mandar para o contador.</p>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        {[
          ["hoje", "Hoje"],
          ["7", "7 dias"],
          ["mes", "Este mês"],
          ["passado", "Mês passado"],
          ["30", "30 dias"],
          ["ano", "Este ano"],
          ["outro", "Escolher datas"],
        ].map(([id, rot]) => (
          <button key={id} onClick={() => setP(id)} aria-pressed={p === id} className={`rounded-full px-3.5 py-1.5 text-[14px] font-semibold ${p === id ? "bg-papel text-carvao" : "border border-linha text-areia hover:text-papel"}`}>
            {rot}
          </button>
        ))}
        {p === "outro" && (
          <span className="flex items-center gap-2 text-[14px]">
            <input type="date" value={de} max={ate} onChange={(e) => setDe(e.target.value)} className="rounded-xl border border-linha bg-carvao px-2 py-1.5" aria-label="Data inicial" />
            até
            <input type="date" value={ate} min={de} onChange={(e) => setAte(e.target.value)} className="rounded-xl border border-linha bg-carvao px-2 py-1.5" aria-label="Data final" />
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={baixarPedidos} disabled={baixando} className="flex items-center gap-2 rounded-full bg-brasa px-4 py-2.5 text-[14px] font-semibold text-carvao hover:bg-mostarda disabled:opacity-60">
          <FileSpreadsheet className="h-4 w-4" /> {baixando ? "Montando…" : "Planilha de pedidos (contador)"}
        </button>
        <button onClick={baixarResumo} disabled={!r} className="flex items-center gap-2 rounded-full border border-linha px-4 py-2.5 text-[14px] font-semibold hover:border-areia disabled:opacity-60">
          <Download className="h-4 w-4" /> Resumo do período
        </button>
      </div>

      {erro && <p className="rounded-2xl bg-[#fbe4e0] p-4 text-[#8e2f2a]">{erro}</p>}
      {!r && !erro && <p className="text-areia">Somando as vendas…</p>}
      {r && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {card("Total vendido", brl(r.total), `${r.pedidos} pedidos · ticket ${brl(r.pedidos ? r.total / r.pedidos : 0)}`, true)}
            {card("Recebido", brl(r.recebido), r.a_receber ? `${brl(r.a_receber)} ainda a receber` : "Tudo recebido")}
            {card("Descontos", brl(r.descontos), `Taxas de entrega ${brl(r.taxas_entrega)}`)}
            {card("Cancelados", String(r.cancelados), r.cancelados ? brl(r.valor_cancelado) : "Nenhum")}
          </div>

          {r.por_dia.length > 1 && (
            <section className="rounded-3xl border border-linha bg-forno p-5">
              <h2 className="font-semibold">Vendas por dia</h2>
              <div className="scroll-thin mt-4 flex h-[170px] items-end gap-1 overflow-x-auto">
                {r.por_dia.map((x) => (
                  <div key={x.dia} className="flex h-full min-w-[14px] flex-1 flex-col items-center justify-end gap-1" title={`${dataBR(x.dia)}: ${x.pedidos} pedidos · ${brl(x.total)}`}>
                    <span className="w-full max-w-[22px] rounded-t bg-brasa" style={{ height: `${(x.total / maxDia) * 100}%` }} />
                    {r.por_dia.length <= 31 && <span className="text-[10px] text-areia">{x.dia.slice(8)}</span>}
                  </div>
                ))}
              </div>
            </section>
          )}

          <div className="grid gap-4 lg:grid-cols-3">
            <section className="rounded-3xl border border-linha bg-forno p-5">
              <h2 className="font-semibold">Formas de pagamento</h2>
              <ul className="mt-3 space-y-2 text-[14px]">
                {Object.entries(r.por_forma)
                  .sort((a, b) => b[1] - a[1])
                  .map(([k, v]) => (
                    <li key={k} className="flex justify-between">
                      <span>{FORMAS[k] ?? k}</span>
                      <b className="tabular">{brl(v)}</b>
                    </li>
                  ))}
                {!Object.keys(r.por_forma).length && <li className="text-areia">Sem vendas no período.</li>}
              </ul>
            </section>
            <section className="rounded-3xl border border-linha bg-forno p-5">
              <h2 className="font-semibold">Por canal</h2>
              <ul className="mt-3 space-y-2 text-[14px]">
                {Object.entries(r.por_canal)
                  .sort((a, b) => b[1].total - a[1].total)
                  .map(([k, v]) => (
                    <li key={k} className="flex justify-between gap-2">
                      <span>{k}</span>
                      <span className="tabular text-areia">
                        {v.pedidos} · <b className="text-papel">{brl(v.total)}</b>
                      </span>
                    </li>
                  ))}
              </ul>
            </section>
            <section className="rounded-3xl border border-linha bg-forno p-5">
              <h2 className="font-semibold">Mais vendidos</h2>
              <ol className="mt-3 space-y-2 text-[14px]">
                {r.produtos.slice(0, 8).map((x, i) => (
                  <li key={x.nome} className="flex justify-between gap-2">
                    <span className="min-w-0 truncate">
                      {i + 1}. {x.nome}
                    </span>
                    <span className="tabular shrink-0 text-areia">
                      {x.qtd}× · <b className="text-papel">{brl(x.total)}</b>
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          </div>
          {d.loja.nfce_ativo && <p className="text-[14px] text-areia">Notas fiscais emitidas no período: {r.notas}</p>}
        </>
      )}
    </div>
  );
}
