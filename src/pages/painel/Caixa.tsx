import { useMemo, useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine, Banknote, Check, CreditCard, Lock, Minus, Plus, Printer, QrCode, Search, Star, Trash2, Unlock, X } from "lucide-react";
import { brl, type Pedido, type Produto } from "../../data/mock";
import { SLUG, supabase, useDados } from "../../data/dados";
import { imprimirComanda } from "../../components/comanda";
import { registrarVendaDemo, useCaixa, type Forma, type ItemVenda, type Resumo, type Sessao } from "../../data/caixa";
import type { Pagamento } from "../../data/salao";
import { Foto } from "../../components/Foto";
import { useToast } from "../../components/ui";

// nomes de quem já abriu o caixa nesta loja, guardados neste aparelho
const CHAVE_OPS = `fregues-operadores:${SLUG}`;
function lerOperadores(): string[] {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_OPS) || "[]");
  } catch {
    return [];
  }
}
function guardarOperador(nome: string) {
  try {
    localStorage.setItem(CHAVE_OPS, JSON.stringify([nome, ...lerOperadores().filter((x) => x !== nome)].slice(0, 6)));
  } catch {
    /* sem armazenamento */
  }
}
const hora = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
const dataHora = (iso: string) => new Date(iso).toLocaleString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const digitos = (s: string) => s.replace(/\D/g, "");
const FORMAS: { id: Forma; rotulo: string; icone: React.ReactNode }[] = [
  { id: "pix", rotulo: "Pix", icone: <QrCode className="h-5 w-5" /> },
  { id: "maquininha", rotulo: "Cartão", icone: <CreditCard className="h-5 w-5" /> },
  { id: "dinheiro", rotulo: "Dinheiro", icone: <Banknote className="h-5 w-5" /> },
];
const NOME_FORMA: Record<Forma, string> = { pix: "Pix", maquininha: "Cartão na maquininha", cartao: "Cartão online", dinheiro: "Dinheiro" };
const r2 = (n: number) => Math.round(n * 100) / 100;

// ---------- abrir ----------
function Abrir({ c }: { c: ReturnType<typeof useCaixa> }) {
  const [valor, setValor] = useState("150");
  const [ops] = useState(lerOperadores);
  const [op, setOp] = useState(ops[0] ?? "");
  const [erro, setErro] = useState("");
  return (
    <div className="mx-auto mt-6 max-w-[460px] rounded-3xl border border-linha bg-forno p-6 text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-grafite text-brasa">
        <Lock className="h-7 w-7" />
      </span>
      <h2 className="mt-3 font-display text-[26px] font-extrabold">Caixa fechado</h2>
      <p className="text-[15px] text-areia">Abra o caixa para vender no balcão. O delivery e o salão continuam funcionando.</p>
      <label className="mt-5 block text-left text-[15px] font-semibold">
        Dinheiro na gaveta para troco
        <span className="mt-1.5 flex items-center rounded-xl border-2 border-[#6b5546] bg-[#fff6e9] px-4 text-carvao focus-within:border-brasa">
          <span className="text-[#8f7b6c]">R$</span>
          <input inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value.replace(/[^\d,.]/g, ""))} className="tabular min-w-0 flex-1 bg-transparent px-2 py-3 text-[20px] font-bold outline-none" />
        </span>
      </label>
      <p className="mt-4 text-left text-[15px] font-semibold">Quem está no caixa</p>
      <input value={op} onChange={(e) => setOp(e.target.value)} placeholder="Nome de quem abre o caixa" aria-label="Quem está no caixa" className="mt-1.5 w-full rounded-xl border-2 border-[#6b5546] bg-[#fff6e9] px-4 py-3 text-[17px] text-carvao focus:border-brasa focus:outline-none" />
      {ops.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {ops.map((o) => (
            <button key={o} onClick={() => setOp(o)} aria-pressed={op === o} className={`rounded-full px-3 py-1.5 text-[14px] font-semibold ${op === o ? "bg-papel text-carvao" : "border border-linha"}`}>
              {o}
            </button>
          ))}
        </div>
      )}
      {erro && <p className="mt-3 rounded-xl bg-[#fbe4e0] p-3 text-[14px] text-[#8e2f2a]">{erro}</p>}
      <button
        onClick={async () => {
          if (!op.trim()) return setErro("Escreva o nome de quem está no caixa.");
          const r = await c.acoes.abrir(Number(valor.replace(",", ".")) || 0, op.trim());
          if (r) setErro(r);
          else guardarOperador(op.trim());
        }}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-brasa py-3.5 text-[17px] font-bold text-carvao hover:bg-mostarda"
      >
        <Unlock className="h-5 w-5" /> Abrir caixa
      </button>
    </div>
  );
}

// ---------- vender no balcão ----------
function Vender({ c }: { c: ReturnType<typeof useCaixa> }) {
  const d = useDados();
  const [cat, setCat] = useState(d.categorias[0] ?? "");
  const [busca, setBusca] = useState("");
  const [itens, setItens] = useState<Record<string, ItemVenda>>({});
  const [tel, setTel] = useState("");
  const [nome, setNome] = useState("");
  const [desconto, setDesconto] = useState(0);
  const [forma, setForma] = useState<Forma>("pix");
  const [recebido, setRecebido] = useState("");
  const [dividir, setDividir] = useState(false);
  const [pags, setPags] = useState<Pagamento[]>([]);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [feito, setFeito] = useState<{ numero: number; total: number; troco: number; comanda: Pedido } | null>(null);

  const lista = d.cardapio.filter((p) => (busca ? p.nome.toLowerCase().includes(busca.toLowerCase()) : p.cat === cat));
  const linhas = Object.values(itens);
  const sub = r2(linhas.reduce((a, i) => a + i.preco * i.qtd, 0));
  const total = Math.max(0, r2(sub - desconto));
  const recebidoN = Number(recebido.replace(",", ".")) || 0;
  const pagamentos: Pagamento[] = dividir ? pags : forma === "dinheiro" ? [{ forma, valor: recebido ? recebidoN : total }] : [{ forma, valor: total }];
  const pago = r2(pagamentos.reduce((a, p) => a + (Number(p.valor) || 0), 0));
  const falta = Math.max(0, r2(total - pago));
  const troco = Math.max(0, r2(pago - total));
  const f = useMemo(() => {
    const q = digitos(tel);
    return q.length >= 8 ? d.fregueses.find((x) => digitos(x.tel).endsWith(q.slice(-8))) : undefined;
  }, [tel, d.fregueses]);

  const mais = (p: Produto, n: number) =>
    setItens((c) => {
      const q = Math.max(0, (c[p.id]?.qtd ?? 0) + n);
      const novo = { ...c };
      if (q === 0) delete novo[p.id];
      else novo[p.id] = { produto: p.id, nome: p.nome, preco: p.promo ?? p.preco, qtd: q, obs: c[p.id]?.obs };
      return novo;
    });
  const limpar = () => {
    setItens({});
    setTel("");
    setNome("");
    setDesconto(0);
    setRecebido("");
    setDividir(false);
    setPags([]);
    setErro("");
  };

  if (feito)
    return (
      <div className="mx-auto mt-6 max-w-[460px] rounded-3xl border border-linha bg-forno p-8 text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-manjericao text-carvao">
          <Check className="h-9 w-9" />
        </span>
        <p className="mt-4 text-[15px] text-areia">Venda registrada e enviada para a cozinha</p>
        <p className="font-display text-[44px] font-extrabold leading-none">Pedido #{feito.numero}</p>
        <p className="tabular mt-2 text-[18px]">{brl(feito.total)}</p>
        {feito.troco > 0 && <p className="tabular mt-4 rounded-2xl bg-mostarda py-4 font-display text-[30px] font-extrabold text-carvao">Troco: {brl(feito.troco)}</p>}
        <button onClick={() => imprimirComanda(feito.comanda, d.loja.nome)} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-papel py-3 font-semibold">
          <Printer className="h-4 w-4" /> Imprimir comanda
        </button>
        <button
          autoFocus
          onClick={() => {
            setFeito(null);
            limpar();
          }}
          className="mt-3 w-full rounded-xl bg-brasa py-3.5 text-[17px] font-bold text-carvao hover:bg-mostarda"
        >
          Nova venda
        </button>
      </div>
    );

  return (
    <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_400px]">
      <div>
        <label className="relative block">
          <span className="sr-only">Buscar no cardápio</span>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fumo" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar produto" className="w-full rounded-xl border border-linha bg-forno py-3 pl-9 pr-3 text-[15px]" />
        </label>
        {!busca && (
          <div className="scroll-thin mt-3 flex gap-2 overflow-x-auto pb-1">
            {d.categorias.map((x) => (
              <button key={x} onClick={() => setCat(x)} aria-pressed={cat === x} className={`shrink-0 rounded-full px-4 py-2 text-[14px] font-semibold ${cat === x ? "bg-papel text-carvao" : "border border-linha text-areia"}`}>
                {x}
              </button>
            ))}
          </div>
        )}
        <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {lista.map((p) => {
            const q = itens[p.id]?.qtd ?? 0;
            return (
              <li key={p.id}>
                <button disabled={p.esgotado} onClick={() => mais(p, 1)} className={`relative w-full overflow-hidden rounded-2xl border-2 bg-forno text-left transition active:scale-[.98] disabled:opacity-40 ${q ? "border-brasa" : "border-linha hover:border-areia"}`}>
                  <Foto nome={p.nome} arte={p.arte} className="h-24 w-full" />
                  {q > 0 && <span className="tabular absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-brasa font-bold text-carvao">{q}</span>}
                  <span className="block p-2.5">
                    <span className="block truncate text-[14px] font-semibold">{p.nome}</span>
                    <span className="tabular text-[14px] text-areia">{p.esgotado ? "Acabou" : brl(p.promo ?? p.preco)}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <aside className="lg:sticky lg:top-6 lg:self-start">
        <div className="rounded-3xl border border-linha bg-forno p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-[20px] font-bold">Venda no balcão</h2>
            {linhas.length > 0 && (
              <button onClick={limpar} className="flex items-center gap-1 text-[13px] text-areia hover:text-tomate">
                <Trash2 className="h-3.5 w-3.5" /> Limpar
              </button>
            )}
          </div>
          {linhas.length === 0 ? (
            <p className="mt-3 rounded-2xl border border-dashed border-linha p-6 text-center text-[14px] text-areia">Toque nos produtos para montar a venda.</p>
          ) : (
            <ul className="mt-2 divide-y divide-linha">
              {linhas.map((i) => (
                <li key={i.produto} className="py-2">
                  <div className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-[15px]">{i.nome}</span>
                    <button onClick={() => mais(d.cardapio.find((p) => p.id === i.produto)!, -1)} aria-label={`Tirar ${i.nome}`} className="grid h-7 w-7 place-items-center rounded-full bg-grafite">
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="tabular w-5 text-center font-semibold">{i.qtd}</span>
                    <button onClick={() => mais(d.cardapio.find((p) => p.id === i.produto)!, 1)} aria-label={`Mais ${i.nome}`} className="grid h-7 w-7 place-items-center rounded-full bg-grafite">
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                    <span className="tabular w-20 text-right font-semibold">{brl(i.preco * i.qtd)}</span>
                  </div>
                  <input value={i.obs ?? ""} onChange={(e) => setItens((c) => ({ ...c, [i.produto]: { ...c[i.produto], obs: e.target.value } }))} placeholder="Observação para a cozinha" aria-label={`Observação de ${i.nome}`} className="mt-1 w-full rounded-lg border border-linha bg-carvao px-2 py-1 text-[13px]" />
                </li>
              ))}
            </ul>
          )}

          <div className="mt-3 grid grid-cols-[1fr_0.8fr] gap-2">
            <input value={tel} onChange={(e) => setTel(e.target.value)} inputMode="tel" placeholder="WhatsApp (opcional)" aria-label="WhatsApp do cliente" className="min-w-0 rounded-xl border border-linha bg-carvao px-3 py-2 text-[14px]" />
            <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome para chamar" aria-label="Nome do cliente" className="min-w-0 rounded-xl border border-linha bg-carvao px-3 py-2 text-[14px]" />
          </div>
          {f && (
            <p className="mt-2 flex items-center gap-1.5 rounded-xl bg-[#fde9df] px-3 py-2 text-[13px] text-[#8e2f2a]">
              <Star className="h-3.5 w-3.5 fill-brasa text-brasa" /> {f.nome.split(" ")[0]} · {f.nivel} · costuma pedir {f.favorito}
            </p>
          )}

          <div className="mt-3 space-y-1 text-[14px]">
            <p className="flex justify-between">
              <span className="text-areia">Subtotal</span>
              <span className="tabular">{brl(sub)}</span>
            </p>
            <label className="flex items-center justify-between">
              <span className="text-areia">Desconto</span>
              <input type="number" min={0} step="0.5" value={desconto || ""} onChange={(e) => setDesconto(Number(e.target.value) || 0)} placeholder="0,00" className="tabular w-24 rounded-lg border border-linha bg-carvao px-2 py-1 text-right" />
            </label>
            <p className="flex justify-between border-t border-linha pt-2 font-display text-[26px] font-extrabold">
              <span>Total</span>
              <span className="tabular">{brl(total)}</span>
            </p>
          </div>

          {!dividir ? (
            <>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {FORMAS.map((x) => (
                  <button key={x.id} onClick={() => setForma(x.id)} aria-pressed={forma === x.id} className={`flex flex-col items-center gap-1 rounded-xl py-3 text-[14px] font-semibold ${forma === x.id ? "bg-papel text-carvao" : "border border-linha"}`}>
                    {x.icone}
                    {x.rotulo}
                  </button>
                ))}
              </div>
              {forma === "dinheiro" && total > 0 && (
                <div className="mt-3">
                  <label className="flex items-center gap-2 text-[14px]">
                    <span className="text-areia">Recebido</span>
                    <input inputMode="decimal" value={recebido} onChange={(e) => setRecebido(e.target.value.replace(/[^\d,.]/g, ""))} placeholder={total.toFixed(2).replace(".", ",")} className="tabular min-w-0 flex-1 rounded-xl border border-linha bg-carvao px-3 py-2 text-right text-[18px] font-bold" />
                  </label>
                  <div className="mt-2 flex gap-1.5">
                    {[...new Set([Math.ceil(total / 10) * 10, Math.ceil(total / 50) * 50, 100, 200])]
                      .filter((v) => v >= total)
                      .slice(0, 4)
                      .map((v) => (
                        <button key={v} onClick={() => setRecebido(String(v))} className="tabular flex-1 rounded-lg border border-linha py-1.5 text-[13px] font-semibold hover:border-areia">
                          R$ {v}
                        </button>
                      ))}
                  </div>
                </div>
              )}
              <button
                onClick={() => {
                  setDividir(true);
                  setPags([
                    { forma: "pix", valor: r2(total / 2) },
                    { forma: "maquininha", valor: r2(total - r2(total / 2)) },
                  ]);
                }}
                className="mt-2 text-[13px] font-semibold text-areia hover:text-papel"
              >
                Pagar com mais de uma forma
              </button>
            </>
          ) : (
            <div className="mt-3 space-y-2">
              {pags.map((p, k) => (
                <div key={k} className="flex items-center gap-1.5">
                  <select value={p.forma} onChange={(e) => setPags(pags.map((x, j) => (j === k ? { ...x, forma: e.target.value as Forma } : x)))} aria-label="Forma" className="rounded-lg border border-linha bg-carvao px-2 py-2 text-[14px]">
                    {FORMAS.map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.rotulo}
                      </option>
                    ))}
                  </select>
                  <input type="number" step="0.01" min={0} value={p.valor} onChange={(e) => setPags(pags.map((x, j) => (j === k ? { ...x, valor: Number(e.target.value) } : x)))} aria-label="Valor" className="tabular min-w-0 flex-1 rounded-lg border border-linha bg-carvao px-2 py-2 text-right" />
                  <button onClick={() => setPags(pags.filter((_, j) => j !== k))} aria-label="Remover" className="p-1 text-areia hover:text-tomate">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <div className="flex justify-between text-[13px]">
                <button onClick={() => setPags([...pags, { forma: "dinheiro", valor: falta }])} className="font-semibold text-areia hover:text-papel">
                  + Outra forma
                </button>
                <button onClick={() => (setDividir(false), setPags([]))} className="text-areia hover:text-papel">
                  Uma forma só
                </button>
              </div>
            </div>
          )}

          {total > 0 && (falta > 0 || troco > 0) && <p className={`tabular mt-3 rounded-xl p-3 text-center text-[18px] font-bold ${falta > 0 ? "bg-[#fcefd9] text-[#7a4600]" : "bg-mostarda text-carvao"}`}>{falta > 0 ? `Falta ${brl(falta)}` : `Troco ${brl(troco)}`}</p>}
          {erro && <p className="mt-3 rounded-xl bg-[#fbe4e0] p-3 text-[14px] text-[#8e2f2a]">{erro}</p>}
          <button
            disabled={linhas.length === 0 || falta > 0 || enviando}
            onClick={async () => {
              setErro("");
              setEnviando(true);
              const r = await c.acoes.vender(linhas, pagamentos, tel, nome, desconto);
              setEnviando(false);
              if (r.erro) setErro(r.erro);
              else
                setFeito({
                  numero: r.numero!,
                  total: r.total!,
                  troco: r.troco ?? 0,
                  comanda: {
                    num: r.numero!,
                    cliente: nome.trim() || "Balcão",
                    bairro: "Balcão",
                    itens: linhas.flatMap((l) => [`${l.qtd}x ${l.nome}`, ...(l.obs ? [`+ ${l.obs}`] : [])]),
                    total: r.total!,
                    pag: "Maquininha",
                    modo: "Balcão",
                    min: 0,
                    status: "novo",
                    tel: tel || undefined,
                    pago: true,
                    forma: pagamentos.length === 1 ? pagamentos[0].forma : pagamentos[0]?.forma,
                    criadoEm: new Date().toISOString(),
                  },
                });
            }}
            className="mt-3 w-full rounded-xl bg-brasa py-4 text-[18px] font-extrabold text-carvao hover:bg-mostarda disabled:opacity-40"
          >
            {enviando ? "Registrando…" : `Finalizar venda ${total > 0 ? brl(total) : ""}`}
          </button>
        </div>
      </aside>
    </div>
  );
}

// ---------- resumo e fechamento ----------
function Barras({ dados }: { dados: [string, number][] }) {
  const max = Math.max(1, ...dados.map((x) => x[1]));
  return (
    <ul className="space-y-2.5">
      {dados.map(([k, v]) => (
        <li key={k} className="text-[14px]">
          <div className="flex justify-between">
            <span>{k}</span>
            <span className="tabular font-semibold">{brl(v)}</span>
          </div>
          <span className="mt-1 block h-2 rounded-full bg-grafite">
            <span className="block h-full rounded-full bg-brasa" style={{ width: `${(v / max) * 100}%` }} />
          </span>
        </li>
      ))}
      {dados.length === 0 && <li className="text-[14px] text-areia">Nada ainda.</li>}
    </ul>
  );
}

function Relatorio({ s, r }: { s: Pick<Sessao, "operador" | "aberto_em" | "fechado_em">; r: Resumo }) {
  const formas = Object.entries(r.por_forma).map(([k, v]) => [NOME_FORMA[k as Forma] ?? k, Number(v)] as [string, number]);
  const dif = r.diferenca ?? 0;
  return (
    <div data-print className="space-y-3 text-[14px]">
      <p className="text-areia">
        {s.operador} · {dataHora(s.aberto_em)} {s.fechado_em && `até ${hora(s.fechado_em)}`}
      </p>
      <p className="flex justify-between font-display text-[22px] font-extrabold">
        <span>Total vendido</span>
        <span className="tabular">{brl(r.total)}</span>
      </p>
      <p className="text-areia">
        {r.vendas} vendas · ticket médio {brl(r.vendas ? r.total / r.vendas : 0)}
      </p>
      <Barras dados={formas} />
      <div className="space-y-1 rounded-2xl bg-grafite p-3">
        <p className="flex justify-between">
          <span className="text-areia">Fundo de troco</span>
          <span className="tabular">{brl(r.valor_inicial)}</span>
        </p>
        <p className="flex justify-between">
          <span className="text-areia">+ Vendas em dinheiro</span>
          <span className="tabular">{brl(Number(r.por_forma.dinheiro ?? 0))}</span>
        </p>
        <p className="flex justify-between">
          <span className="text-areia">+ Reforços</span>
          <span className="tabular">{brl(Number(r.reforcos))}</span>
        </p>
        <p className="flex justify-between">
          <span className="text-areia">− Retiradas</span>
          <span className="tabular">{brl(Number(r.retiradas))}</span>
        </p>
        <p className="flex justify-between border-t border-linha pt-1 font-semibold">
          <span>Dinheiro que deve ter na gaveta</span>
          <span className="tabular">{brl(Number(r.dinheiro_esperado))}</span>
        </p>
        {r.dinheiro_contado !== undefined && (
          <>
            <p className="flex justify-between">
              <span className="text-areia">Contado</span>
              <span className="tabular">{brl(Number(r.dinheiro_contado))}</span>
            </p>
            <p className={`flex justify-between font-bold ${Math.abs(dif) < 0.01 ? "text-manjericao" : dif > 0 ? "text-mostarda" : "text-tomate"}`}>
              <span>{Math.abs(dif) < 0.01 ? "Bateu certinho" : dif > 0 ? "Sobrou" : "Faltou"}</span>
              <span className="tabular">{brl(Math.abs(dif))}</span>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// dinheiro que ainda está com os entregadores: entregas não pagas, agrupadas por quem levou
function EntregasAReceber() {
  const d = useDados();
  const { show, Toast } = useToast();
  const lista = d.pedidos.filter((p) => p.modo === "Entrega" && !p.pago && (p.status === "rota" || p.status === "entregue"));
  if (!lista.length) return null;
  const grupos = new Map<string, Pedido[]>();
  for (const p of lista) grupos.set(p.motoboy ?? "Sem entregador", [...(grupos.get(p.motoboy ?? "Sem entregador") ?? []), p]);
  return (
    <section className="rounded-3xl border border-linha bg-forno p-5">
      <h2 className="font-display text-[20px] font-bold">Entregas a receber</h2>
      <p className="text-[14px] text-areia">Pedidos de delivery que o cliente paga na entrega. Quando o entregador prestar contas, marque como recebido e o valor entra neste caixa.</p>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {[...grupos.entries()].map(([quem, ps]) => (
          <div key={quem} className="rounded-2xl bg-grafite p-4">
            <p className="flex justify-between font-semibold">
              <span>{quem}</span>
              <span className="tabular">{brl(ps.reduce((a, p) => a + p.total, 0))}</span>
            </p>
            <ul className="mt-2 space-y-2 text-[14px]">
              {ps.map((p) => (
                <li key={p.num} className="flex items-center justify-between gap-2">
                  <span>
                    #{p.num} · {p.cliente.split(" ")[0]} · <span className="tabular">{brl(p.total)}</span>
                    <span className="block text-[12px] text-areia">{p.forma === "dinheiro" ? "Dinheiro" : p.forma === "maquininha" ? "Maquininha" : p.forma === "pix" ? "Pix" : "Cartão"}</span>
                  </span>
                  <button
                    onClick={async () => {
                      const forma = p.forma ?? "dinheiro";
                      const r = await d.acoes.pagarPedido(p.num, forma);
                      if (!r && !supabase) registrarVendaDemo("Delivery", p.total, [{ forma, valor: p.total }], `Entrega #${p.num}`);
                      show(r ?? `#${p.num} recebido e somado ao caixa`);
                    }}
                    className="rounded-full bg-papel px-3 py-1.5 text-[13px] font-semibold text-carvao hover:bg-mostarda"
                  >
                    Recebido
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <Toast />
    </section>
  );
}

function ResumoCaixa({ c, aoFechar }: { c: ReturnType<typeof useCaixa>; aoFechar: (r: Resumo, s: Sessao) => void }) {
  const { show, Toast } = useToast();
  const [mov, setMov] = useState<"retirada" | "reforco" | null>(null);
  const [valor, setValor] = useState("");
  const [motivo, setMotivo] = useState("");
  const [fechando, setFechando] = useState(false);
  const [contado, setContado] = useState("");
  const [obs, setObs] = useState("");
  const [erro, setErro] = useState("");
  const r = c.resumo;
  const s = c.sessao;

  if (!s || !r) return null;
  const contadoN = Number(contado.replace(",", ".")) || 0;
  const dif = contadoN - Number(r.dinheiro_esperado);
  const formas = Object.entries(r.por_forma).map(([k, v]) => [NOME_FORMA[k as Forma] ?? k, Number(v)] as [string, number]);
  const canais = Object.entries(r.por_canal).map(([k, v]) => [k, Number(v)] as [string, number]);

  return (
    <div className="mt-5 space-y-5">
      <EntregasAReceber />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["Vendido desde a abertura", brl(Number(r.total)), `${r.vendas} vendas`],
          ["Ticket médio", brl(r.vendas ? Number(r.total) / r.vendas : 0), "por venda"],
          ["Dinheiro na gaveta", brl(Number(r.dinheiro_esperado)), "deve ter agora"],
          ["Caixa aberto às", hora(s.aberto_em), `por ${s.operador}`],
        ].map(([k, v, x], i) => (
          <div key={k} className={`rounded-2xl p-4 ${i === 0 ? "bg-[#fde9df]" : "border border-linha bg-forno"}`}>
            <p className={`text-[12px] ${i === 0 ? "text-[#9a3412]" : "text-areia"}`}>{k}</p>
            <p className={`tabular mt-1 font-display text-[24px] font-bold ${i === 0 ? "text-brasa" : ""}`}>{v}</p>
            <p className="text-[12px] text-areia">{x}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-3xl border border-linha bg-forno p-5">
          <h3 className="mb-3 font-semibold">Por forma de pagamento</h3>
          <Barras dados={formas} />
        </section>
        <section className="rounded-3xl border border-linha bg-forno p-5">
          <h3 className="mb-3 font-semibold">Por canal</h3>
          <Barras dados={canais} />
        </section>
        <section className="rounded-3xl border border-linha bg-forno p-5">
          <h3 className="font-semibold">Gaveta</h3>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button onClick={() => setMov("retirada")} className="flex items-center justify-center gap-1.5 rounded-xl border border-linha py-2.5 text-[14px] font-semibold hover:border-areia">
              <ArrowUpFromLine className="h-4 w-4" /> Retirada
            </button>
            <button onClick={() => setMov("reforco")} className="flex items-center justify-center gap-1.5 rounded-xl border border-linha py-2.5 text-[14px] font-semibold hover:border-areia">
              <ArrowDownToLine className="h-4 w-4" /> Reforço
            </button>
          </div>
          {mov && (
            <div className="mt-3 space-y-2 rounded-2xl bg-grafite p-3">
              <p className="text-[13px] font-semibold">{mov === "retirada" ? "Tirar dinheiro da gaveta" : "Colocar dinheiro na gaveta"}</p>
              <input inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value.replace(/[^\d,.]/g, ""))} placeholder="Valor" aria-label="Valor" className="tabular w-full rounded-lg border border-linha bg-carvao px-3 py-2" />
              <input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder={mov === "retirada" ? "Motivo (ex.: pagamento do gás)" : "Motivo (ex.: mais troco)"} aria-label="Motivo" className="w-full rounded-lg border border-linha bg-carvao px-3 py-2 text-[14px]" />
              <div className="flex gap-2">
                <button onClick={() => setMov(null)} className="flex-1 rounded-lg py-2 text-[14px] text-areia">
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    const e = await c.acoes.movimento(mov, Number(valor.replace(",", ".")), motivo);
                    show(e ?? (mov === "retirada" ? "Retirada registrada" : "Reforço registrado"));
                    if (!e) {
                      setMov(null);
                      setValor("");
                      setMotivo("");
                    }
                  }}
                  className="flex-1 rounded-lg bg-papel py-2 text-[14px] font-semibold text-carvao"
                >
                  Registrar
                </button>
              </div>
            </div>
          )}
          <ul className="mt-3 space-y-1.5 text-[14px]">
            {c.movimentos.map((m) => (
              <li key={m.id} className="flex justify-between gap-2">
                <span className="min-w-0 truncate text-areia">
                  {hora(m.criado_em)} · {m.motivo || (m.tipo === "retirada" ? "Retirada" : "Reforço")}
                </span>
                <span className={`tabular shrink-0 font-semibold ${m.tipo === "retirada" ? "text-tomate" : "text-manjericao"}`}>
                  {m.tipo === "retirada" ? "−" : "+"}
                  {brl(m.valor)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {c.vendas.length > 0 && (
        <section className="rounded-3xl border border-linha bg-forno p-5">
          <h3 className="font-semibold">Vendas deste caixa</h3>
          <ul className="mt-2 divide-y divide-linha text-[14px]">
            {[...c.vendas].reverse().map((v, k) => (
              <li key={k} className="flex items-center justify-between gap-3 py-2">
                <span className="min-w-0">
                  <span className="block truncate">{v.descricao}</span>
                  <span className="text-[12px] text-areia">
                    {hora(v.quando)} · {v.canal} · {v.pagamentos.map((p) => NOME_FORMA[p.forma]).join(" + ")}
                  </span>
                </span>
                <span className="tabular font-semibold">{brl(v.total)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <button onClick={() => setFechando(true)} className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-tomate py-3.5 text-[16px] font-bold text-tomate hover:bg-[#fbe4e0]">
        <Lock className="h-5 w-5" /> Fechar caixa
      </button>

      {fechando && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={() => setFechando(false)}>
          <div role="dialog" aria-label="Fechar caixa" className="w-full max-w-[440px] rounded-3xl border border-linha bg-forno p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-display text-[24px] font-extrabold">Fechar caixa</h2>
            <p className="text-[14px] text-areia">Conte o dinheiro da gaveta e digite o valor. O sistema confere com o que deveria ter.</p>
            <label className="mt-4 block text-[15px] font-semibold">
              Dinheiro contado
              <span className="mt-1.5 flex items-center rounded-xl border-2 border-[#6b5546] bg-[#fff6e9] px-4 text-carvao focus-within:border-brasa">
                <span className="text-[#8f7b6c]">R$</span>
                <input autoFocus inputMode="decimal" value={contado} onChange={(e) => setContado(e.target.value.replace(/[^\d,.]/g, ""))} className="tabular min-w-0 flex-1 bg-transparent px-2 py-3 text-[22px] font-bold outline-none" />
              </span>
            </label>
            {contado && <p className={`tabular mt-3 rounded-xl p-3 text-center font-bold ${Math.abs(dif) < 0.01 ? "bg-[#e2f2ea] text-[#1b6149]" : dif > 0 ? "bg-[#fcefd9] text-[#7a4600]" : "bg-[#fbe4e0] text-[#8e2f2a]"}`}>{Math.abs(dif) < 0.01 ? "Bateu certinho" : dif > 0 ? `Sobrando ${brl(dif)}` : `Faltando ${brl(-dif)}`}</p>}
            <input value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Observação (opcional)" aria-label="Observação" className="mt-3 w-full rounded-xl border border-linha bg-carvao px-3 py-2 text-[14px]" />
            {erro && <p className="mt-3 rounded-xl bg-[#fbe4e0] p-3 text-[14px] text-[#8e2f2a]">{erro}</p>}
            <button
              disabled={!contado}
              onClick={async () => {
                const res = await c.acoes.fechar(contadoN, obs);
                if (res.erro) return setErro(res.erro);
                setFechando(false);
                aoFechar(res.resumo!, { ...s, fechado_em: new Date().toISOString() });
              }}
              className="mt-4 w-full rounded-xl bg-brasa py-3.5 font-bold text-carvao disabled:opacity-40"
            >
              Confirmar fechamento
            </button>
          </div>
        </div>
      )}
      <Toast />
    </div>
  );
}

function Historico({ c }: { c: ReturnType<typeof useCaixa> }) {
  const [ver, setVer] = useState<Sessao | null>(null);
  return (
    <div className="mt-5">
      <div className="overflow-x-auto rounded-3xl border border-linha bg-forno">
        <table className="w-full min-w-[640px] text-[14px]">
          <thead>
            <tr className="border-b border-linha text-left text-[12px] text-areia">
              <th className="px-4 py-3 font-medium">Caixa</th>
              <th className="px-4 py-3 font-medium">Quem</th>
              <th className="px-4 py-3 text-right font-medium">Vendido</th>
              <th className="px-4 py-3 text-right font-medium">Deveria ter</th>
              <th className="px-4 py-3 text-right font-medium">Contado</th>
              <th className="px-4 py-3 text-right font-medium">Diferença</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-linha">
            {c.historico.map((h) => {
              const dif = Number(h.resumo?.diferenca ?? 0);
              return (
                <tr key={h.id} onClick={() => setVer(h)} className="cursor-pointer hover:bg-grafite">
                  <td className="px-4 py-3 capitalize">{dataHora(h.aberto_em)}</td>
                  <td className="px-4 py-3">{h.operador}</td>
                  <td className="tabular px-4 py-3 text-right font-semibold">{brl(Number(h.resumo?.total ?? 0))}</td>
                  <td className="tabular px-4 py-3 text-right">{brl(Number(h.resumo?.dinheiro_esperado ?? 0))}</td>
                  <td className="tabular px-4 py-3 text-right">{brl(Number(h.dinheiro_contado ?? 0))}</td>
                  <td className={`tabular px-4 py-3 text-right font-semibold ${Math.abs(dif) < 0.01 ? "text-manjericao" : dif > 0 ? "text-mostarda" : "text-tomate"}`}>{Math.abs(dif) < 0.01 ? "OK" : `${dif > 0 ? "+" : "−"}${brl(Math.abs(dif))}`}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {c.historico.length === 0 && <p className="p-8 text-center text-areia">Nenhum caixa fechado ainda.</p>}
      </div>
      {ver?.resumo && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={() => setVer(null)}>
          <div role="dialog" aria-label="Fechamento de caixa" className="w-full max-w-[480px] rounded-3xl border border-linha bg-forno p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-display text-[22px] font-extrabold">Fechamento</h2>
              <button onClick={() => window.print()} className="flex items-center gap-1.5 rounded-full border border-linha px-3 py-1.5 text-[13px] font-semibold">
                <Printer className="h-4 w-4" /> Imprimir
              </button>
            </div>
            <Relatorio s={ver} r={ver.resumo} />
          </div>
        </div>
      )}
    </div>
  );
}

export function Caixa() {
  const c = useCaixa();
  const [aba, setAba] = useState<"vender" | "resumo" | "historico">("vender");
  const [final, setFinal] = useState<{ r: Resumo; s: Sessao } | null>(null);
  if (c.carregando) return <p className="text-areia">Abrindo o caixa…</p>;
  if (final)
    return (
      <div className="mx-auto mt-2 max-w-[520px] rounded-3xl border border-linha bg-forno p-6">
        <h2 className="font-display text-[26px] font-extrabold">Caixa fechado</h2>
        <div className="mt-3">
          <Relatorio s={final.s} r={final.r} />
        </div>
        <div className="mt-5 flex gap-2">
          <button onClick={() => window.print()} className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-papel py-3 font-semibold">
            <Printer className="h-4 w-4" /> Imprimir
          </button>
          <button onClick={() => (setFinal(null), setAba("vender"))} className="flex-1 rounded-xl bg-brasa py-3 font-semibold text-carvao">
            Pronto
          </button>
        </div>
      </div>
    );
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[clamp(2rem,4vw,2.8rem)] font-extrabold tracking-[-0.015em]">Caixa e balcão</h1>
          <p className="flex items-center gap-2 text-[15px] text-areia">
            {c.sessao ? (
              <>
                <span className="h-2 w-2 rounded-full bg-manjericao" /> Caixa aberto às {hora(c.sessao.aberto_em)} por {c.sessao.operador}
              </>
            ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-tomate" /> Caixa fechado
              </>
            )}
          </p>
        </div>
        <div className="flex rounded-full border border-linha p-1 text-[14px] font-semibold" role="tablist">
          {(
            [
              ["vender", "Vender"],
              ["resumo", "Resumo do caixa"],
              ["historico", "Fechamentos"],
            ] as const
          ).map(([v, r]) => (
            <button key={v} role="tab" aria-selected={aba === v} onClick={() => setAba(v)} className={`rounded-full px-4 py-1.5 ${aba === v ? "bg-papel text-carvao" : "text-areia"}`}>
              {r}
            </button>
          ))}
        </div>
      </div>
      {aba === "historico" ? <Historico c={c} /> : !c.sessao ? <Abrir c={c} /> : aba === "vender" ? <Vender c={c} /> : <ResumoCaixa c={c} aoFechar={(r, s) => setFinal({ r, s })} />}
    </div>
  );
}
