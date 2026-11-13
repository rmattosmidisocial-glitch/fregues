import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { ArrowRightLeft, Bell, BellRing, Cake, ChefHat, Clock, Minus, Pencil, Plus, Printer, QrCode, Receipt, Search, Star, Trash2, Users, X } from "lucide-react";
import { brl, type Produto } from "../../data/mock";
import { SLUG, useDados } from "../../data/dados";
import { totais, useSalao, type Comanda, type ItemComanda, type Mesa, type NovoItem, type Pagamento, type StatusItem } from "../../data/salao";
import { Foto } from "../../components/Foto";
import { useToast } from "../../components/ui";
import { Couvert } from "../../components/Couvert";
import { imprimirComanda } from "../../components/comanda";
import { useGarcons } from "../../data/equipe";
import { setMesaQR } from "../publico/Mesa";

const minutos = (iso: string) => Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
const tempo = (iso: string) => {
  const m = minutos(iso);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h${String(m % 60).padStart(2, "0")}`;
};
const digitos = (s?: string | null) => (s ?? "").replace(/\D/g, "");
const ITEM: Record<StatusItem, { rotulo: string; cls: string }> = {
  aguardando: { rotulo: "Confirmar pedido", cls: "bg-[#dff1ee] text-[#1f5f59]" },
  novo: { rotulo: "Novo", cls: "bg-[#fbe4e0] text-[#9b3530]" },
  preparo: { rotulo: "Na cozinha", cls: "bg-[#fcefd9] text-[#7a4600]" },
  pronto: { rotulo: "Pronto", cls: "bg-[#e2f2ea] text-[#1b6149]" },
  entregue: { rotulo: "Na mesa", cls: "bg-grafite text-areia" },
  cancelado: { rotulo: "Cancelado", cls: "bg-grafite text-fumo line-through" },
};
const FORMAS: { id: Pagamento["forma"]; rotulo: string }[] = [
  { id: "pix", rotulo: "Pix" },
  { id: "maquininha", rotulo: "Cartão" },
  { id: "dinheiro", rotulo: "Dinheiro" },
];
export const linkMesa = (n: number) => `${window.location.origin}${window.location.pathname}?r=${SLUG}&mesa=${n}#mesa`;

function QR({ texto, tamanho = 120 }: { texto: string; tamanho?: number }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    QRCode.toDataURL(texto, { margin: 1, width: tamanho * 2, color: { dark: "#17110e", light: "#fff6e9" } }).then(setSrc);
  }, [texto, tamanho]);
  return src ? <img src={src} width={tamanho} height={tamanho} alt="QR code da mesa" className="rounded-lg" /> : <span style={{ width: tamanho, height: tamanho }} className="block rounded-lg bg-papel" />;
}

// ---------- adicionar itens ----------
function Cardapio({ adicionar }: { adicionar: (itens: NovoItem[]) => void }) {
  const d = useDados();
  const [cat, setCat] = useState(d.categorias[0] ?? "");
  const [busca, setBusca] = useState("");
  const [carrinho, setCarrinho] = useState<Record<string, { p: Produto; qtd: number; obs: string }>>({});
  const lista = d.cardapio.filter((p) => (busca ? p.nome.toLowerCase().includes(busca.toLowerCase()) : p.cat === cat));
  const qtdTotal = Object.values(carrinho).reduce((s, x) => s + x.qtd, 0);
  const mais = (p: Produto, n: number) =>
    setCarrinho((c) => {
      const atual = c[p.id]?.qtd ?? 0;
      const q = Math.max(0, atual + n);
      const novo = { ...c };
      if (q === 0) delete novo[p.id];
      else novo[p.id] = { p, qtd: q, obs: c[p.id]?.obs ?? "" };
      return novo;
    });
  return (
    <div>
      <label className="relative block">
        <span className="sr-only">Buscar no cardápio</span>
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fumo" />
        <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar no cardápio" className="w-full rounded-xl border border-linha bg-carvao py-2.5 pl-9 pr-3 text-[15px]" />
      </label>
      {!busca && (
        <div className="scroll-thin mt-2 flex gap-1.5 overflow-x-auto pb-1">
          {d.categorias.map((c) => (
            <button key={c} onClick={() => setCat(c)} aria-pressed={cat === c} className={`shrink-0 rounded-full px-3 py-1.5 text-[13px] font-semibold ${cat === c ? "bg-papel text-carvao" : "border border-linha text-areia"}`}>
              {c}
            </button>
          ))}
        </div>
      )}
      <ul className="mt-2 grid gap-2 sm:grid-cols-2">
        {lista.map((p) => {
          const q = carrinho[p.id]?.qtd ?? 0;
          return (
            <li key={p.id} className={`flex items-center gap-2.5 rounded-2xl border p-2 ${q ? "border-brasa" : "border-linha"} ${p.esgotado ? "opacity-50" : ""}`}>
              <Foto nome={p.nome} arte={p.arte} url={p.foto} className="h-12 w-12 shrink-0 rounded-xl" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-semibold">{p.nome}</span>
                <span className="tabular text-[13px] text-areia">{p.esgotado ? "Acabou hoje" : brl(p.promo ?? p.preco)}</span>
              </span>
              {!p.esgotado && (
                <span className="flex items-center gap-1">
                  {q > 0 && (
                    <>
                      <button onClick={() => mais(p, -1)} aria-label={`Tirar ${p.nome}`} className="grid h-8 w-8 place-items-center rounded-full bg-grafite">
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="tabular w-5 text-center font-semibold">{q}</span>
                    </>
                  )}
                  <button onClick={() => mais(p, 1)} aria-label={`Adicionar ${p.nome}`} className="grid h-8 w-8 place-items-center rounded-full bg-brasa text-carvao">
                    <Plus className="h-4 w-4" />
                  </button>
                </span>
              )}
            </li>
          );
        })}
      </ul>
      {qtdTotal > 0 && (
        <div className="sticky bottom-0 mt-3 space-y-2 rounded-2xl border border-linha bg-forno p-3">
          {Object.values(carrinho).map(({ p, qtd, obs }) => (
            <div key={p.id} className="flex items-center gap-2 text-[14px]">
              <span className="tabular w-6 font-semibold">{qtd}x</span>
              <span className="w-[38%] truncate">{p.nome}</span>
              <input value={obs} onChange={(e) => setCarrinho((c) => ({ ...c, [p.id]: { ...c[p.id], obs: e.target.value } }))} placeholder="Observação (sem cebola…)" aria-label={`Observação de ${p.nome}`} className="min-w-0 flex-1 rounded-lg border border-linha bg-carvao px-2 py-1 text-[13px]" />
            </div>
          ))}
          <button
            onClick={() => {
              adicionar(Object.values(carrinho).map(({ p, qtd, obs }) => ({ produto: p.id, nome: p.nome, preco: p.promo ?? p.preco, qtd, obs: obs || undefined })));
              setCarrinho({});
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brasa py-3 font-semibold text-carvao hover:bg-mostarda"
          >
            <ChefHat className="h-5 w-5" /> Mandar {qtdTotal} {qtdTotal === 1 ? "item" : "itens"} para a cozinha
          </button>
        </div>
      )}
    </div>
  );
}

// ---------- comanda ----------
function PainelComanda({ mesa, comanda, s, fechar }: { mesa: Mesa; comanda?: Comanda; s: ReturnType<typeof useSalao>; fechar: () => void }) {
  const d = useDados();
  const { show, Toast } = useToast();
  const [aba, setAba] = useState<"conta" | "lancar" | "pagar">(comanda ? "conta" : "conta");
  const [pessoas, setPessoas] = useState(2);
  const garcons = useGarcons();
  const [garcom, setGarcom] = useState("");
  useEffect(() => {
    if (!garcom && garcons.lista[0]) setGarcom(garcons.lista[0].nome);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [garcons.lista]);
  const [tel, setTel] = useState(comanda?.telefone ?? "");
  const [nome, setNome] = useState(comanda?.cliente_nome ?? "");
  const [pags, setPags] = useState<Pagamento[]>([]);
  const [erro, setErro] = useState("");
  const [transf, setTransf] = useState(false);
  const itens = comanda ? s.itens.filter((i) => i.tab_id === comanda.id) : [];
  const t = comanda ? totais(comanda, s.itens) : { sub: 0, servico: 0, couvert: 0, total: 0 };
  const pago = pags.reduce((x, p) => x + (Number(p.valor) || 0), 0);
  const falta = Math.max(0, Math.round((t.total - pago) * 100) / 100);
  const fregues = useMemo(() => {
    const q = digitos(tel);
    if (q.length < 8) return undefined;
    return d.fregueses.find((f) => digitos(f.tel).endsWith(q.slice(-8)));
  }, [tel, d.fregueses]);
  const porNome = !fregues && comanda?.cliente_nome ? d.fregueses.find((f) => f.nome === comanda.cliente_nome) : undefined;
  const f = fregues ?? porNome;

  useEffect(() => {
    if (aba === "pagar" && pags.length === 0 && t.total > 0) setPags([{ forma: "pix", valor: Math.round(t.total * 100) / 100 }]);
  }, [aba]);
  // com uma forma só, o valor acompanha o total (serviço, couvert e desconto mudam o total)
  useEffect(() => {
    setPags((ps) => (ps.length === 1 ? [{ ...ps[0], valor: Math.round(t.total * 100) / 100 }] : ps));
  }, [t.total]);

  if (!comanda)
    return (
      <div className="space-y-4">
        {mesa.reservada_para && <p className="rounded-2xl bg-[#dff1ee] p-3 text-[14px] text-[#1f5f59]">Reservada: {mesa.reservada_para}</p>}
        <div>
          <p className="text-[13px] text-areia">Quantas pessoas?</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => (
              <button key={n} onClick={() => setPessoas(n)} aria-pressed={pessoas === n} className={`tabular h-11 w-11 rounded-xl text-[16px] font-semibold ${pessoas === n ? "bg-papel text-carvao" : "border border-linha"}`}>
                {n}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[13px] text-areia">Garçom</p>
          {garcons.lista.length ? (
            <div className="mt-1 flex flex-wrap gap-1.5">
              {garcons.lista.map((g) => (
                <button key={g.id} onClick={() => setGarcom(g.nome)} aria-pressed={garcom === g.nome} className={`rounded-xl px-4 py-2 font-semibold ${garcom === g.nome ? "bg-papel text-carvao" : "border border-linha"}`}>
                  {g.nome}
                </button>
              ))}
            </div>
          ) : (
            <>
              <input value={garcom} onChange={(e) => setGarcom(e.target.value)} placeholder="Nome do garçom" aria-label="Garçom" className="mt-1 w-full rounded-xl border border-linha bg-carvao px-3 py-2.5 text-[15px]" />
              <p className="mt-1 text-[12px] text-areia">Cadastre os garçons em "Mesas e QR" para escolher com um toque.</p>
            </>
          )}
        </div>
        <button
          onClick={async () => {
            await s.acoes.abrirMesa(mesa.id, pessoas, garcom.trim());
            show(`Mesa ${mesa.numero} aberta`);
          }}
          className="w-full rounded-xl bg-brasa py-3.5 text-[16px] font-bold text-carvao hover:bg-mostarda"
        >
          Abrir mesa {mesa.numero}
        </button>
        <Toast />
      </div>
    );

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 text-[13px] text-areia">
        <span className="flex items-center gap-1">
          <Users className="h-4 w-4" />
          <button onClick={() => s.acoes.setComanda(comanda.id, { pessoas: Math.max(1, comanda.pessoas - 1) })} aria-label="Menos uma pessoa" className="rounded px-1 hover:bg-grafite">
            −
          </button>
          <b className="tabular text-papel">{comanda.pessoas}</b>
          <button onClick={() => s.acoes.setComanda(comanda.id, { pessoas: comanda.pessoas + 1 })} aria-label="Mais uma pessoa" className="rounded px-1 hover:bg-grafite">
            +
          </button>
          pessoas
        </span>
        <span>·</span>
        <span className="flex items-center gap-1">
          <Clock className="h-4 w-4" /> {tempo(comanda.aberta_em)}
        </span>
        {comanda.garcom && <span>· {comanda.garcom}</span>}
        <button onClick={() => setTransf(!transf)} className="ml-auto flex items-center gap-1 rounded-full border border-linha px-2.5 py-1 font-semibold text-papel hover:border-areia">
          <ArrowRightLeft className="h-3.5 w-3.5" /> Trocar de mesa
        </button>
      </div>
      {transf && (
        <div className="mt-2 flex flex-wrap gap-1.5 rounded-2xl bg-grafite p-3">
          <span className="w-full text-[13px] text-areia">Levar a conta para a mesa:</span>
          {s.mesas
            .filter((m) => m.ativa && !s.comandas.some((c) => c.table_id === m.id))
            .map((m) => (
              <button
                key={m.id}
                onClick={async () => {
                  const r = await s.acoes.transferir(comanda.id, m.id);
                  show(r ?? `Conta foi para a mesa ${m.numero}`);
                  setTransf(false);
                  if (!r) fechar();
                }}
                className="tabular h-10 w-10 rounded-lg border border-linha font-semibold hover:bg-papel hover:text-carvao"
              >
                {m.numero}
              </button>
            ))}
        </div>
      )}

      {/* Freguês: o salão conversa com o CRM */}
      <div className="mt-3 rounded-2xl border border-linha p-3">
        <div className="flex gap-2">
          <input value={tel} onChange={(e) => setTel(e.target.value)} onBlur={() => s.acoes.setComanda(comanda.id, { telefone: tel || null })} inputMode="tel" placeholder="WhatsApp do cliente" aria-label="WhatsApp do cliente" className="min-w-0 flex-1 rounded-xl border border-linha bg-carvao px-3 py-2 text-[14px]" />
          <input value={nome} onChange={(e) => setNome(e.target.value)} onBlur={() => s.acoes.setComanda(comanda.id, { cliente_nome: nome || null })} placeholder="Nome" aria-label="Nome do cliente" className="w-[38%] rounded-xl border border-linha bg-carvao px-3 py-2 text-[14px]" />
        </div>
        {f ? (
          <div className="mt-2 rounded-xl bg-[#fde9df] p-3 text-[14px]">
            <p className="flex items-center gap-1.5 font-semibold text-brasa">
              <Star className="h-4 w-4 fill-brasa" /> {f.nome} já é freguês · {f.nivel}
            </p>
            <p className="mt-1 text-[#8e2f2a]">
              {f.pedidos} pedidos · costuma pedir <b>{f.favorito}</b> · ticket {brl(f.ticket)}
            </p>
            {f.tags.length > 0 && <p className="mt-1 text-[13px] text-[#9a3412]">{f.tags.join(" · ")}</p>}
            {f.aniversario && (
              <p className="mt-1 flex items-center gap-1.5 text-[13px] text-mostarda">
                <Cake className="h-3.5 w-3.5" /> Aniversário {f.aniversario}
              </p>
            )}
          </div>
        ) : (
          <p className="mt-2 text-[12px] text-areia">Com o WhatsApp, a venda do salão entra no CRM e o cliente ganha cashback como no delivery.</p>
        )}
      </div>

      <div className="mt-4 flex gap-1 border-b border-linha" role="tablist">
        {(
          [
            ["conta", `Consumo (${itens.filter((i) => i.status !== "cancelado").length})`],
            ["lancar", "Lançar itens"],
            ["pagar", "Fechar conta"],
          ] as const
        ).map(([v, r]) => (
          <button key={v} role="tab" aria-selected={aba === v} onClick={() => setAba(v)} className={`-mb-px border-b-2 px-3 py-2 text-[14px] font-semibold ${aba === v ? "border-brasa text-papel" : "border-transparent text-areia"}`}>
            {r}
          </button>
        ))}
      </div>

      {aba === "conta" && (
        <div className="mt-3">
          {itens.length === 0 && (
            <button onClick={() => setAba("lancar")} className="w-full rounded-2xl border border-dashed border-linha p-6 text-center text-areia hover:text-papel">
              Mesa aberta e sem pedido. Toque para lançar itens.
            </button>
          )}
          <ul className="divide-y divide-linha">
            {itens.map((i) => (
              <ItemLinha key={i.id} i={i} s={s} />
            ))}
          </ul>
        </div>
      )}
      {aba === "lancar" && (
        <div className="mt-3">
          <Cardapio
            adicionar={async (novos) => {
              const r = await s.acoes.lancar(comanda.id, novos);
              show(r ?? "Pedido enviado para a cozinha");
              if (!r) setAba("conta");
            }}
          />
        </div>
      )}
      {aba === "pagar" && (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap gap-2 text-[13px]">
            <span className="text-areia">Serviço:</span>
            {[0, 10, 12].map((p) => (
              <button key={p} onClick={() => s.acoes.setComanda(comanda.id, { taxa_servico: p })} aria-pressed={comanda.taxa_servico === p} className={`rounded-full px-3 py-1 font-semibold ${comanda.taxa_servico === p ? "bg-papel text-carvao" : "border border-linha"}`}>
                {p === 0 ? "Sem" : `${p}%`}
              </button>
            ))}
            <label className="ml-auto flex items-center gap-1.5 text-areia">
              Desconto R$
              <input type="number" min={0} step="0.5" value={comanda.desconto || ""} onChange={(e) => s.acoes.setComanda(comanda.id, { desconto: Number(e.target.value) || 0 })} className="tabular w-20 rounded-lg border border-linha bg-carvao px-2 py-1 text-papel" />
            </label>
          </div>
          <Couvert valor={comanda.couvert ?? 0} pessoas={comanda.pessoas} mudar={(v) => s.acoes.setComanda(comanda.id, { couvert: v })} mudarPessoas={(n) => s.acoes.setComanda(comanda.id, { pessoas: n })} />
          <div className="flex flex-wrap gap-2">
            <span className="w-full text-[13px] text-areia">Dividir igual por:</span>
            {[2, 3, 4, 5, 6].map((n) => (
              <button
                key={n}
                onClick={() => {
                  const parte = Math.floor((t.total / n) * 100) / 100;
                  const resto = Math.round((t.total - parte * (n - 1)) * 100) / 100;
                  setPags(Array.from({ length: n }, (_, k) => ({ forma: "pix", valor: k === n - 1 ? resto : parte })));
                }}
                className="tabular rounded-full border border-linha px-3 py-1 text-[13px] font-semibold hover:border-areia"
              >
                {n} pessoas
              </button>
            ))}
          </div>
          <ul className="space-y-2">
            {pags.map((p, k) => (
              <li key={k} className="flex items-center gap-2">
                <span className="tabular w-6 text-[13px] text-fumo">{k + 1}</span>
                <div className="flex rounded-xl border border-linha p-0.5">
                  {FORMAS.map((fm) => (
                    <button key={fm.id} onClick={() => setPags(pags.map((x, j) => (j === k ? { ...x, forma: fm.id } : x)))} aria-pressed={p.forma === fm.id} className={`rounded-lg px-2.5 py-1.5 text-[13px] font-semibold ${p.forma === fm.id ? "bg-papel text-carvao" : "text-areia"}`}>
                      {fm.rotulo}
                    </button>
                  ))}
                </div>
                <input type="number" min={0} step="0.01" value={p.valor} onChange={(e) => setPags(pags.map((x, j) => (j === k ? { ...x, valor: Number(e.target.value) } : x)))} aria-label={`Valor do pagamento ${k + 1}`} className="tabular min-w-0 flex-1 rounded-xl border border-linha bg-carvao px-3 py-2 text-right text-[15px]" />
                <button onClick={() => setPags(pags.filter((_, j) => j !== k))} aria-label="Remover pagamento" className="rounded-lg p-1.5 text-areia hover:text-tomate">
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
          <button onClick={() => setPags([...pags, { forma: "maquininha", valor: falta }])} className="flex items-center gap-1.5 text-[14px] font-semibold text-areia hover:text-papel">
            <Plus className="h-4 w-4" /> Outra forma de pagamento
          </button>
          <p className={`rounded-xl p-3 text-[15px] font-semibold ${falta > 0 ? "bg-[#fcefd9] text-[#7a4600]" : "bg-[#e2f2ea] text-[#1b6149]"}`}>{falta > 0 ? `Falta receber ${brl(falta)}` : pago > t.total + 0.009 ? `Troco: ${brl(pago - t.total)}` : "Tudo certo para fechar"}</p>
          {erro && <p className="rounded-xl bg-[#fbe4e0] p-3 text-[14px] text-[#8e2f2a]">{erro}</p>}
          <button
            disabled={falta > 0}
            onClick={async () => {
              setErro("");
              const r = await s.acoes.fechar(comanda.id, pags, tel, nome);
              if (r) setErro(r);
              else {
                show(`Mesa ${mesa.numero} fechada · ${brl(t.total)}${tel ? " · venda no CRM" : ""}`);
                fechar();
              }
            }}
            className="w-full rounded-xl bg-brasa py-3.5 text-[16px] font-bold text-carvao hover:bg-mostarda disabled:opacity-40"
          >
            Fechar conta e liberar mesa
          </button>
          <button
            onClick={() =>
              imprimirComanda(
                {
                  num: mesa.numero,
                  cliente: comanda.cliente_nome || `Conta da mesa ${mesa.numero}`,
                  bairro: "Salão",
                  itens: [
                    ...itens.filter((i) => i.status !== "cancelado").map((i) => `${i.qtd}x ${i.nome}  ${brl(i.qtd * i.unit)}`),
                    `+ Consumo ${brl(t.sub)}`,
                    ...(t.servico > 0 ? [`+ Serviço ${comanda.taxa_servico}%: ${brl(t.servico)}`] : []),
                    ...(t.couvert > 0 ? [`+ Couvert ${comanda.pessoas}x ${brl(comanda.couvert ?? 0)}: ${brl(t.couvert)}`] : []),
                    ...(comanda.desconto > 0 ? [`+ Desconto: -${brl(comanda.desconto)}`] : []),
                    ...(comanda.pessoas > 1 ? [`+ ${comanda.pessoas} pessoas: ${brl(t.total / comanda.pessoas)} cada`] : []),
                  ],
                  total: t.total,
                  pag: "Maquininha",
                  modo: `Mesa ${mesa.numero}`,
                  min: 0,
                  status: "novo",
                  pago: false,
                  forma: undefined,
                  criadoEm: new Date().toISOString(),
                },
                d.loja.nome,
              )
            }
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-papel py-3 font-semibold"
          >
            <Printer className="h-4 w-4" /> Imprimir conta para o cliente
          </button>
          <button
            onClick={async () => {
              if (itens.some((i) => i.status !== "cancelado")) return setErro("Cancele os itens antes de cancelar a comanda.");
              await s.acoes.cancelarComanda(comanda.id);
              fechar();
            }}
            className="w-full text-[13px] text-areia hover:text-tomate"
          >
            Cancelar comanda (cliente foi embora sem consumir)
          </button>
        </div>
      )}

      <div className="mt-4 space-y-1 rounded-2xl bg-grafite p-3 text-[14px]">
        <p className="flex justify-between">
          <span className="text-areia">Consumo</span>
          <span className="tabular">{brl(t.sub)}</span>
        </p>
        <p className="flex justify-between">
          <span className="text-areia">Serviço {comanda.taxa_servico}%</span>
          <span className="tabular">{brl(t.servico)}</span>
        </p>
        {t.couvert > 0 && (
          <p className="flex justify-between">
            <span className="text-areia">
              Couvert {comanda.pessoas} × {brl(comanda.couvert ?? 0)}
            </span>
            <span className="tabular">{brl(t.couvert)}</span>
          </p>
        )}
        {comanda.desconto > 0 && (
          <p className="flex justify-between">
            <span className="text-areia">Desconto</span>
            <span className="tabular">−{brl(comanda.desconto)}</span>
          </p>
        )}
        <p className="flex justify-between border-t border-linha pt-1 text-[17px] font-bold">
          <span>Total</span>
          <span className="tabular">{brl(t.total)}</span>
        </p>
        <p className="tabular text-right text-[12px] text-areia">{brl(t.total / Math.max(1, comanda.pessoas))} por pessoa</p>
      </div>
      {comanda.status !== "conta" && aba !== "pagar" && (
        <button
          onClick={async () => {
            await s.acoes.setComanda(comanda.id, { status: "conta" });
            setAba("pagar");
          }}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-papel py-3 font-semibold hover:bg-papel hover:text-carvao"
        >
          <Receipt className="h-5 w-5" /> Pedir a conta
        </button>
      )}
      <Toast />
    </div>
  );
}

function ItemLinha({ i, s }: { i: ItemComanda; s: ReturnType<typeof useSalao> }) {
  const prox: Partial<Record<StatusItem, StatusItem>> = { novo: "preparo", preparo: "pronto", pronto: "entregue" };
  return (
    <li className={`flex items-start gap-3 py-2.5 ${i.status === "cancelado" ? "opacity-50" : ""}`}>
      <span className="tabular w-7 pt-0.5 font-semibold">{i.qtd}x</span>
      <span className="min-w-0 flex-1">
        <span className={`block text-[15px] ${i.status === "cancelado" ? "line-through" : ""}`}>{i.nome}</span>
        <span className="text-[12px] text-areia">
          {brl(i.unit * i.qtd)} · {tempo(i.criado_em)}
          {i.origem === "cliente" && <span className="ml-1 rounded bg-[#dff1ee] px-1.5 text-[#1f5f59]">pelo QR</span>}
        </span>
        {i.obs && <span className="block text-[13px] text-mostarda">{i.obs}</span>}
      </span>
      {i.status === "aguardando" ? (
        <span className="flex flex-col items-end gap-1">
          <button onClick={() => s.acoes.confirmarItens([i.id])} className="rounded-full bg-manjericao px-3 py-1 text-[12px] font-semibold text-carvao">
            Confirmar e mandar
          </button>
          <button onClick={() => s.acoes.statusItem(i.id, "cancelado")} className="text-[11px] text-fumo hover:text-tomate">
            recusar
          </button>
        </span>
      ) : (
      <span className="flex flex-col items-end gap-1">
        <button disabled={!prox[i.status]} onClick={() => prox[i.status] && s.acoes.statusItem(i.id, prox[i.status]!)} className={`rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${ITEM[i.status].cls}`} title={prox[i.status] ? `Marcar como ${ITEM[prox[i.status]!].rotulo}` : undefined}>
          {ITEM[i.status].rotulo}
        </button>
        {i.status !== "cancelado" && i.status !== "entregue" && (
          <button onClick={() => s.acoes.statusItem(i.id, "cancelado")} className="text-[11px] text-fumo hover:text-tomate">
            cancelar
          </button>
        )}
      </span>
      )}
    </li>
  );
}

// ---------- cozinha (itens do salão em preparo) ----------
function Cozinha({ s }: { s: ReturnType<typeof useSalao> }) {
  const col: { st: StatusItem; rotulo: string; acao: string; prox: StatusItem }[] = [
    { st: "novo", rotulo: "Chegou", acao: "Começar", prox: "preparo" },
    { st: "preparo", rotulo: "Preparando", acao: "Pronto", prox: "pronto" },
    { st: "pronto", rotulo: "Pronto para levar", acao: "Levei à mesa", prox: "entregue" },
  ];
  const mesaDe = (tab: string) => s.mesas.find((m) => m.id === s.comandas.find((c) => c.id === tab)?.table_id);
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {col.map((c) => {
        const its = s.itens.filter((i) => i.status === c.st).sort((a, b) => a.criado_em.localeCompare(b.criado_em));
        return (
          <section key={c.st} className="rounded-3xl border border-linha bg-forno p-4">
            <h3 className="flex items-center justify-between font-display text-[18px] font-bold">
              {c.rotulo} <span className="tabular rounded-full bg-grafite px-2.5 text-[13px]">{its.length}</span>
            </h3>
            <ul className="mt-3 space-y-2">
              {its.map((i) => {
                const m = mesaDe(i.tab_id);
                const atraso = minutos(i.criado_em) > 20 && c.st !== "pronto";
                return (
                  <li key={i.id} className={`rounded-2xl p-3 ${atraso ? "bg-[#fbe4e0]" : "bg-grafite"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-display text-[20px] font-extrabold leading-tight">Mesa {m?.numero}</p>
                        <p className="text-[15px] font-semibold">
                          {i.qtd}x {i.nome}
                        </p>
                        {i.obs && <p className="text-[14px] font-semibold text-mostarda">⚠ {i.obs}</p>}
                      </div>
                      <span className={`tabular text-[13px] ${atraso ? "font-bold text-[#9b3530]" : "text-areia"}`}>{tempo(i.criado_em)}</span>
                    </div>
                    <button onClick={() => s.acoes.statusItem(i.id, c.prox)} className="mt-2 w-full rounded-xl bg-papel py-2 text-[14px] font-semibold text-carvao">
                      {c.acao}
                    </button>
                  </li>
                );
              })}
              {its.length === 0 && <li className="rounded-2xl border border-dashed border-linha p-4 text-center text-[14px] text-areia">Nada aqui</li>}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

// ---------- editar mesas e QR codes ----------
function EditarMesas({ s }: { s: ReturnType<typeof useSalao> }) {
  const nomeLoja = useDados().loja.nome;
  const { show, Toast } = useToast();
  const [imprimir, setImprimir] = useState(false);
  const areas = [...new Set(s.mesas.map((m) => m.area))];
  const prox = Math.max(0, ...s.mesas.map((m) => m.numero)) + 1;
  const garcons = useGarcons();
  const [novoG, setNovoG] = useState("");
  if (imprimir)
    return (
      <div>
        <div className="mb-4 flex items-center justify-between print:hidden">
          <p className="text-areia">Imprima e cole um em cada mesa. O cliente aponta a câmera, vê o cardápio e pede direto para a cozinha.</p>
          <div className="flex gap-2">
            <button onClick={() => window.print()} className="flex items-center gap-2 rounded-full bg-brasa px-4 py-2 font-semibold text-carvao">
              <Printer className="h-4 w-4" /> Imprimir
            </button>
            <button onClick={() => setImprimir(false)} className="rounded-full border border-linha px-4 py-2 font-semibold">
              Voltar
            </button>
          </div>
        </div>
        <div data-print className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {s.mesas.map((m) => (
            <div key={m.id} className="break-inside-avoid rounded-3xl bg-papel p-4 text-center text-carvao">
              <p className="text-[12px] font-semibold uppercase tracking-[0.12em]">{nomeLoja}</p>
              <p className="font-display text-[34px] font-extrabold leading-none">Mesa {m.numero}</p>
              <div className="mt-2 flex justify-center">
                <QR texto={linkMesa(m.numero)} tamanho={130} />
              </div>
              <p className="mt-2 text-[13px] font-semibold">Aponte a câmera para pedir</p>
            </div>
          ))}
        </div>
      </div>
    );
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {[...areas, ...(areas.includes("Varanda") ? [] : ["Varanda"])].map((a) => (
          <button
            key={a}
            onClick={async () => {
              const r = await s.acoes.salvarMesa({ numero: prox, area: a, lugares: 4, forma: "quadrada" });
              show(r ?? `Mesa ${prox} criada em ${a}`);
            }}
            className="flex items-center gap-1.5 rounded-full border border-linha px-4 py-2 text-[14px] font-semibold hover:border-areia"
          >
            <Plus className="h-4 w-4" /> Mesa no(a) {a}
          </button>
        ))}
        <button onClick={() => setImprimir(true)} className="ml-auto flex items-center gap-2 rounded-full bg-papel px-4 py-2 text-[14px] font-semibold text-carvao">
          <QrCode className="h-4 w-4" /> QR codes para imprimir
        </button>
      </div>
      <section className="mb-4 rounded-3xl border border-linha bg-forno p-5">
        <h3 className="font-display text-[18px] font-bold">Pedido feito pelo cliente no QR da mesa</h3>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {(
            [
              [true, "O garçom confirma antes", "O pedido aparece para a equipe e só vai para a cozinha quando alguém confirmar."],
              [false, "Vai direto para a cozinha", "Mais rápido, sem conferência. Bom para casas com pouco movimento de mesa."],
            ] as const
          ).map(([v, t, sub]) => (
            <button key={String(v)} onClick={() => s.acoes.setConfirmar(v)} aria-pressed={s.confirmar === v} className={`rounded-2xl border-2 p-4 text-left ${s.confirmar === v ? "border-brasa bg-[#fde9df]" : "border-linha"}`}>
              <span className="block font-semibold">{t}</span>
              <span className="mt-1 block text-[13px] text-areia">{sub}</span>
            </button>
          ))}
        </div>
      </section>
      <section className="mb-4 rounded-3xl border border-linha bg-forno p-5">
        <h3 className="font-display text-[18px] font-bold">Garçons</h3>
        <p className="text-[13px] text-areia">Aparecem para escolher ao abrir uma mesa.</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {garcons.lista.map((g) => (
            <span key={g.id} className="flex items-center gap-1 rounded-full bg-grafite py-1 pl-3 pr-1 text-[14px] font-semibold">
              {g.nome}
              <button onClick={() => garcons.remover(g.id)} aria-label={`Remover ${g.nome}`} className="rounded-full p-1 text-areia hover:text-tomate">
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
          <form
            className="flex gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!novoG.trim()) return;
              const r = await garcons.adicionar(novoG.trim());
              show(r ?? `${novoG.trim()} incluído`);
              if (!r) setNovoG("");
            }}
          >
            <input value={novoG} onChange={(e) => setNovoG(e.target.value)} placeholder="Nome do garçom" aria-label="Nome do garçom" className="w-40 rounded-full border border-linha bg-carvao px-3 py-1.5 text-[14px]" />
            <button className="flex items-center gap-1 rounded-full bg-papel px-3 py-1.5 text-[13px] font-semibold text-carvao">
              <Plus className="h-4 w-4" /> Incluir
            </button>
          </form>
        </div>
      </section>
      <div className="overflow-x-auto rounded-3xl border border-linha bg-forno">
        <table className="w-full min-w-[560px] text-[14px]">
          <thead>
            <tr className="border-b border-linha text-left text-[12px] text-areia">
              <th className="px-4 py-3 font-medium">Mesa</th>
              <th className="px-4 py-3 font-medium">Área</th>
              <th className="px-4 py-3 font-medium">Lugares</th>
              <th className="px-4 py-3 font-medium">Reserva</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-linha">
            {s.mesas.map((m) => (
              <tr key={m.id}>
                <td className="tabular px-4 py-2 font-semibold">{m.numero}</td>
                <td className="px-4 py-2">
                  <input defaultValue={m.area} onBlur={(e) => e.target.value !== m.area && s.acoes.salvarMesa({ id: m.id, area: e.target.value || "Salão" })} aria-label={`Área da mesa ${m.numero}`} className="w-32 rounded-lg border border-linha bg-carvao px-2 py-1" />
                </td>
                <td className="px-4 py-2">
                  <input type="number" min={1} max={40} defaultValue={m.lugares} onBlur={(e) => Number(e.target.value) !== m.lugares && s.acoes.salvarMesa({ id: m.id, lugares: Number(e.target.value) || 1 })} aria-label={`Lugares da mesa ${m.numero}`} className="tabular w-16 rounded-lg border border-linha bg-carvao px-2 py-1" />
                </td>
                <td className="px-4 py-2">
                  <input defaultValue={m.reservada_para ?? ""} placeholder="Ex.: 20h · Ana (4)" onBlur={(e) => (e.target.value || null) !== m.reservada_para && s.acoes.salvarMesa({ id: m.id, reservada_para: e.target.value || null })} aria-label={`Reserva da mesa ${m.numero}`} className="w-44 rounded-lg border border-linha bg-carvao px-2 py-1" />
                </td>
                <td className="px-4 py-2 text-right">
                  <button
                    onClick={async () => {
                      const r = await s.acoes.removerMesa(m.id);
                      show(r ?? `Mesa ${m.numero} removida`);
                    }}
                    aria-label={`Remover mesa ${m.numero}`}
                    className="rounded-lg p-1.5 text-areia hover:text-tomate"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Toast />
    </div>
  );
}

// ---------- tela principal ----------
export function Salao() {
  const s = useSalao();
  const [aba, setAba] = useState<"mesas" | "cozinha" | "editar">("mesas");
  const [sel, setSel] = useState<string | null>(null);
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((x) => x + 1), 30000);
    return () => clearInterval(t);
  }, []);
  if (s.carregando) return <p className="text-areia">Abrindo o salão…</p>;

  const comandaDe = (m: Mesa) => s.comandas.find((c) => c.table_id === m.id);
  const ocupadas = s.mesas.filter((m) => comandaDe(m));
  const pessoas = s.comandas.reduce((x, c) => x + c.pessoas, 0);
  const emAberto = s.comandas.reduce((x, c) => x + totais(c, s.itens).total, 0);
  const vendasHoje = s.fechadasHoje.reduce((x, f) => x + f.total, 0);
  const pessoasHoje = s.fechadasHoje.reduce((x, f) => x + f.pessoas, 0);
  const lugares = s.mesas.reduce((x, m) => x + m.lugares, 0);
  const naCozinha = s.itens.filter((i) => i.status === "novo" || i.status === "preparo").length;
  const areas = [...new Set(s.mesas.map((m) => m.area))];
  const mesaSel = s.mesas.find((m) => m.id === sel);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[clamp(2rem,4vw,2.8rem)] font-extrabold tracking-[-0.015em]">Salão</h1>
          <p className="text-[15px] text-areia">Mesas, comandas e cozinha. Cada conta fechada entra no CRM junto com o delivery.</p>
        </div>
        <div className="flex rounded-full border border-linha p-1 text-[14px] font-semibold" role="tablist">
          {(
            [
              ["mesas", "Mesas"],
              ["cozinha", `Cozinha${naCozinha ? ` (${naCozinha})` : ""}`],
              ["editar", "Mesas e QR"],
            ] as const
          ).map(([v, r]) => (
            <button key={v} role="tab" aria-selected={aba === v} onClick={() => setAba(v)} className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 ${aba === v ? "bg-papel text-carvao" : "text-areia"}`}>
              {v === "editar" && <Pencil className="h-3.5 w-3.5" />}
              {r}
            </button>
          ))}
        </div>
      </div>

      {(() => {
        const espera = s.itens.filter((i) => i.status === "aguardando");
        if (!espera.length) return null;
        const porMesa = new Map<string, ItemComanda[]>();
        for (const i of espera) porMesa.set(i.tab_id, [...(porMesa.get(i.tab_id) ?? []), i]);
        return (
          <div className="mt-4 space-y-2">
            {[...porMesa.entries()].map(([tab, its]) => {
              const c = s.comandas.find((x) => x.id === tab);
              const m = c && s.mesas.find((x) => x.id === c.table_id);
              return (
                <div key={tab} className="pulso-borda flex flex-wrap items-center gap-3 rounded-2xl bg-[#dff1ee] p-3 text-[#1f5f59]">
                  <QrCode className="h-5 w-5 shrink-0" />
                  <p className="min-w-0 flex-1 font-semibold">
                    Mesa {m?.numero} pediu pelo QR: {its.map((i) => `${i.qtd}x ${i.nome}`).join(", ")}
                  </p>
                  <button onClick={() => m && setSel(m.id)} className="rounded-full border border-[#1f5f59] px-3 py-1.5 text-[14px] font-semibold">
                    Ver mesa
                  </button>
                  <button onClick={() => s.acoes.confirmarItens(its.map((i) => i.id))} className="rounded-full bg-papel px-4 py-1.5 text-[14px] font-semibold text-carvao">
                    Confirmar e mandar
                  </button>
                </div>
              );
            })}
          </div>
        );
      })()}

      {s.chamados.length > 0 && (
        <div className="mt-4 space-y-2">
          {s.chamados.map((c) => {
            const m = s.mesas.find((x) => x.id === c.table_id);
            return (
              <div key={c.id} className="pulso-borda flex items-center gap-3 rounded-2xl bg-[#fcefd9] p-3 text-[#7a4600]">
                <BellRing className="h-5 w-5 shrink-0" />
                <p className="flex-1 font-semibold">
                  Mesa {m?.numero} {c.tipo === "conta" ? "pediu a conta" : "está chamando o garçom"} · {tempo(c.criado_em)}
                </p>
                <button
                  onClick={() => {
                    s.acoes.atenderChamado(c.id);
                    if (c.tipo === "conta" && m) setSel(m.id);
                  }}
                  className="rounded-full bg-papel px-4 py-1.5 text-[14px] font-semibold text-carvao"
                >
                  {c.tipo === "conta" ? "Levar a conta" : "Fui atender"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["Mesas ocupadas", `${ocupadas.length} de ${s.mesas.length}`, `${Math.round((pessoas / Math.max(1, lugares)) * 100)}% dos lugares`],
          ["Pessoas agora", String(pessoas), `${naCozinha} itens na cozinha`],
          ["Consumo em aberto", brl(emAberto), "nas mesas ocupadas"],
          ["Vendido no salão hoje", brl(vendasHoje), pessoasHoje ? `${brl(vendasHoje / pessoasHoje)} por pessoa` : "nenhuma conta fechada"],
        ].map(([k, v, sub]) => (
          <div key={k} className="rounded-2xl border border-linha bg-forno p-4">
            <p className="text-[12px] text-areia">{k}</p>
            <p className="tabular mt-1 font-display text-[24px] font-bold">{v}</p>
            <p className="text-[12px] text-areia">{sub}</p>
          </div>
        ))}
      </div>

      {aba === "mesas" && (
        <div className="mt-5 space-y-6">
          {areas.map((a) => (
            <section key={a}>
              <h2 className="mb-2 font-display text-[18px] font-bold">{a}</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {s.mesas
                  .filter((m) => m.area === a && m.ativa)
                  .map((m) => {
                    const c = comandaDe(m);
                    const t = c ? totais(c, s.itens) : null;
                    const chamando = s.chamados.some((x) => x.table_id === m.id);
                    const pend = c ? s.itens.filter((i) => i.tab_id === c.id && (i.status === "aguardando" || i.status === "novo" || i.status === "pronto")).length : 0;
                    const estilo = !c ? (m.reservada_para ? "border-azulejo bg-[#dff1ee]" : "border-dashed border-linha bg-forno") : c.status === "conta" ? "border-mostarda bg-[#fcefd9]" : "border-brasa bg-[#fde9df]";
                    return (
                      <button key={m.id} onClick={() => setSel(m.id)} className={`relative flex min-h-[128px] flex-col rounded-3xl border-2 p-4 text-left transition hover:scale-[1.02] ${estilo} ${m.forma === "redonda" ? "rounded-[40px]" : ""}`}>
                        {chamando && (
                          <span className="pulso absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full bg-mostarda text-carvao">
                            <Bell className="h-4 w-4" />
                          </span>
                        )}
                        <span className="font-display text-[30px] font-extrabold leading-none">{m.numero}</span>
                        <span className="mt-0.5 text-[12px] text-areia">
                          {c ? `${c.pessoas} de ${m.lugares} lugares` : `${m.lugares} lugares`}
                        </span>
                        <span className="mt-auto pt-2">
                          {c ? (
                            <>
                              <span className="tabular block text-[18px] font-bold">{brl(t!.total)}</span>
                              <span className="flex items-center gap-1 text-[12px] text-areia">
                                <Clock className="h-3 w-3" /> {tempo(c.aberta_em)}
                                {c.status === "conta" && <b className="ml-1 text-mostarda">conta pedida</b>}
                                {pend > 0 && c.status !== "conta" && <b className="ml-1 text-[#9b3530]">{pend} p/ atenção</b>}
                              </span>
                            </>
                          ) : m.reservada_para ? (
                            <span className="text-[12px] font-semibold text-[#1f5f59]">Reservada · {m.reservada_para}</span>
                          ) : (
                            <span className="text-[13px] font-semibold text-manjericao">Livre</span>
                          )}
                        </span>
                      </button>
                    );
                  })}
              </div>
            </section>
          ))}
          <div className="flex flex-wrap gap-4 text-[13px] text-areia">
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 rounded border-2 border-dashed border-linha" /> Livre
            </span>
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 rounded bg-brasa" /> Ocupada
            </span>
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 rounded bg-mostarda" /> Pediu a conta
            </span>
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 rounded bg-azulejo" /> Reservada
            </span>
          </div>
        </div>
      )}
      {aba === "cozinha" && (
        <div className="mt-5">
          <Cozinha s={s} />
        </div>
      )}
      {aba === "editar" && (
        <div className="mt-5">
          <EditarMesas s={s} />
        </div>
      )}

      {mesaSel && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={() => setSel(null)}>
          <div role="dialog" aria-label={`Mesa ${mesaSel.numero}`} className="scroll-thin h-full w-full max-w-[520px] overflow-y-auto border-l border-linha bg-forno p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-start justify-between">
              <div>
                <p className="text-[13px] text-areia">{mesaSel.area}</p>
                <h2 className="font-display text-[32px] font-extrabold leading-none">Mesa {mesaSel.numero}</h2>
              </div>
              <div className="flex items-center gap-1">
                <a href="#mesa" onClick={() => setMesaQR(mesaSel.numero)} className="flex items-center gap-1.5 rounded-full border border-linha px-3 py-1.5 text-[13px] font-semibold hover:border-areia" title="Ver a página que o cliente abre pelo QR code">
                  <QrCode className="h-4 w-4" /> Ver QR do cliente
                </a>
                <button onClick={() => setSel(null)} aria-label="Fechar" className="rounded-full p-2 hover:bg-grafite">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <PainelComanda key={mesaSel.id + (comandaDe(mesaSel)?.id ?? "")} mesa={mesaSel} comanda={comandaDe(mesaSel)} s={s} fechar={() => setSel(null)} />
          </div>
        </div>
      )}
    </div>
  );
}
