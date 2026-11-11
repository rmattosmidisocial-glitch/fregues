import { useState } from "react";
import { ArrowLeft, Bell, Check, Minus, Plus, Receipt, ShoppingBag, X } from "lucide-react";
import { brl, type Produto } from "../../data/mock";
import { useDados } from "../../data/dados";
import { useMesaPublica, type StatusItem } from "../../data/salao";
import { Foto, FOTOS } from "../../components/Foto";
import { Brasinha } from "../../components/Logo";

// Mesa aberta pelo QR (?mesa=7). Na demonstração, o painel escolhe a mesa pelo botão "Ver QR do cliente".
let mesaEscolhida = 12;
export const setMesaQR = (n: number) => {
  mesaEscolhida = n;
};
const lerMesa = () => {
  try {
    return Number(new URLSearchParams(window.location.search).get("mesa")) || mesaEscolhida;
  } catch {
    return mesaEscolhida;
  }
};

const STATUS: Record<StatusItem, string> = { novo: "Pedido recebido", preparo: "Na cozinha", pronto: "Saindo", entregue: "Na mesa", cancelado: "Cancelado" };

export function Mesa() {
  const d = useDados();
  const [numero] = useState(lerMesa);
  const m = useMesaPublica(numero);
  const [cat, setCat] = useState(d.categorias[0] ?? "");
  const [sacola, setSacola] = useState<Record<string, { p: Produto; qtd: number }>>({});
  const [verSacola, setVerSacola] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [verConta, setVerConta] = useState(false);
  const qtd = Object.values(sacola).reduce((s, x) => s + x.qtd, 0);
  const totalSacola = Object.values(sacola).reduce((s, x) => s + x.qtd * (x.p.promo ?? x.p.preco), 0);
  const consumo = (m.dados?.itens ?? []).reduce((s, i) => s + i.qtd * i.unit, 0);
  const mais = (p: Produto, n: number) =>
    setSacola((c) => {
      const q = Math.max(0, (c[p.id]?.qtd ?? 0) + n);
      const novo = { ...c };
      if (q === 0) delete novo[p.id];
      else novo[p.id] = { p, qtd: q };
      return novo;
    });
  const avisar = (t: string) => {
    setAviso(t);
    setTimeout(() => setAviso(null), 3000);
  };

  if (m.erro || (!m.dados && !d.carregando))
    return (
      <div className="grid min-h-screen place-items-center bg-[#fffaf2] p-6 text-center text-carvao">
        <div>
          <p className="font-display text-[24px] font-extrabold">Não achamos esta mesa</p>
          <p className="mt-2 text-[#6b5a4c]">Chame o garçom, por favor.</p>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-[#f6ecdf] text-carvao">
      <div className="mx-auto min-h-screen max-w-[480px] bg-[#fffaf2] pb-32">
        <div className="flex items-center justify-between bg-carvao px-4 py-2 text-[12px] text-areia">
          <a href="#salao" className="flex items-center gap-1 hover:text-papel">
            <ArrowLeft className="h-3.5 w-3.5" /> Painel do dono
          </a>
          <span className="flex items-center gap-1.5">
            Feito com <Brasinha className="h-4 w-4" /> freguês
          </span>
        </div>
        <header className="relative overflow-hidden px-5 pb-5 pt-16 text-papel">
          <img src={FOTOS.grelha} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-carvao via-carvao/75 to-carvao/20" />
          <div className="relative">
            <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-brasa">{d.loja.nome}</p>
            <h1 className="font-display text-[44px] font-extrabold leading-none tracking-[-0.015em]">Mesa {numero}</h1>
            <p className="mt-1 text-[14px] text-areia">Peça por aqui que vai direto para a cozinha.</p>
          </div>
        </header>

        <div className="grid grid-cols-2 gap-2 px-4 pt-4">
          <button
            onClick={async () => {
              const r = await m.chamar("garcom");
              avisar(r ?? "Chamamos o garçom. Já já ele chega!");
            }}
            className="flex items-center justify-center gap-2 rounded-2xl border-2 border-carvao py-3 font-semibold"
          >
            <Bell className="h-5 w-5" /> Chamar garçom
          </button>
          <button onClick={() => setVerConta(true)} className="flex items-center justify-center gap-2 rounded-2xl bg-carvao py-3 font-semibold text-papel">
            <Receipt className="h-5 w-5" /> Minha conta {consumo > 0 && `· ${brl(consumo)}`}
          </button>
        </div>

        <nav className="scroll-thin sticky top-0 z-10 mt-4 flex gap-2 overflow-x-auto bg-[#fffaf2] px-4 py-2" aria-label="Categorias">
          {d.categorias.map((c) => (
            <button key={c} onClick={() => setCat(c)} aria-pressed={cat === c} className={`shrink-0 rounded-full px-4 py-2 text-[14px] font-semibold ${cat === c ? "bg-carvao text-papel" : "bg-[#efe3d3]"}`}>
              {c}
            </button>
          ))}
        </nav>
        <ul className="space-y-3 px-4 pt-2">
          {d.cardapio
            .filter((p) => p.cat === cat)
            .map((p) => {
              const q = sacola[p.id]?.qtd ?? 0;
              return (
                <li key={p.id} className={`flex gap-3 rounded-2xl bg-white p-3 shadow-[0_1px_0_#efe3d3] ${p.esgotado ? "opacity-50" : ""}`}>
                  <Foto nome={p.nome} arte={p.arte} className="h-20 w-20 shrink-0 rounded-xl" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold leading-tight">{p.nome}</p>
                    <p className="mt-0.5 line-clamp-2 text-[13px] text-[#6b5a4c]">{p.desc}</p>
                    <div className="mt-1.5 flex items-center justify-between">
                      <span className="tabular font-bold">{p.esgotado ? "Acabou hoje" : brl(p.promo ?? p.preco)}</span>
                      {!p.esgotado && (
                        <span className="flex items-center gap-1.5">
                          {q > 0 && (
                            <>
                              <button onClick={() => mais(p, -1)} aria-label={`Tirar ${p.nome}`} className="grid h-8 w-8 place-items-center rounded-full bg-[#efe3d3]">
                                <Minus className="h-4 w-4" />
                              </button>
                              <span className="tabular w-4 text-center font-bold">{q}</span>
                            </>
                          )}
                          <button onClick={() => mais(p, 1)} aria-label={`Adicionar ${p.nome}`} className="grid h-8 w-8 place-items-center rounded-full bg-brasa text-carvao">
                            <Plus className="h-4 w-4" />
                          </button>
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
        </ul>
      </div>

      {qtd > 0 && !verSacola && (
        <div className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[480px] p-4">
          <button onClick={() => setVerSacola(true)} className="flex w-full items-center justify-between rounded-full bg-carvao px-5 py-4 font-semibold text-papel shadow-2xl">
            <span className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" /> Ver pedido ({qtd})
            </span>
            <span className="tabular">{brl(totalSacola)}</span>
          </button>
        </div>
      )}

      {(verSacola || verConta) && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50" onClick={() => (setVerSacola(false), setVerConta(false))}>
          <div className="max-h-[85vh] w-full max-w-[480px] overflow-y-auto rounded-t-3xl bg-[#fffaf2] p-5" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={verConta ? "Minha conta" : "Seu pedido"}>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-[24px] font-extrabold">{verConta ? `Conta da mesa ${numero}` : "Seu pedido"}</h2>
              <button onClick={() => (setVerSacola(false), setVerConta(false))} aria-label="Fechar" className="rounded-full p-2 hover:bg-[#efe3d3]">
                <X className="h-5 w-5" />
              </button>
            </div>
            {verSacola ? (
              <>
                <ul className="mt-3 divide-y divide-[#efe3d3]">
                  {Object.values(sacola).map(({ p, qtd: q }) => (
                    <li key={p.id} className="flex justify-between py-2.5">
                      <span>
                        {q}x {p.nome}
                      </span>
                      <span className="tabular">{brl(q * (p.promo ?? p.preco))}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={async () => {
                    const r = await m.pedir(Object.values(sacola).map(({ p, qtd: q }) => ({ produto: p.id, nome: p.nome, preco: p.promo ?? p.preco, qtd: q })));
                    if (r) return avisar(r);
                    setSacola({});
                    setVerSacola(false);
                    avisar("Pedido enviado para a cozinha!");
                  }}
                  className="mt-4 w-full rounded-full bg-brasa py-4 text-[16px] font-bold text-carvao"
                >
                  Enviar para a cozinha · {brl(totalSacola)}
                </button>
                <p className="mt-2 text-center text-[12px] text-[#8f7b6c]">Você paga no fim, junto com o resto da mesa.</p>
              </>
            ) : (
              <>
                <ul className="mt-3 divide-y divide-[#efe3d3]">
                  {(m.dados?.itens ?? []).map((i, k) => (
                    <li key={k} className="flex items-center justify-between gap-3 py-2.5">
                      <span>
                        {i.qtd}x {i.nome}
                        <span className="block text-[12px] text-[#8f7b6c]">{STATUS[i.status]}</span>
                      </span>
                      <span className="tabular">{brl(i.qtd * i.unit)}</span>
                    </li>
                  ))}
                  {(m.dados?.itens ?? []).length === 0 && <li className="py-6 text-center text-[#8f7b6c]">Nada pedido ainda.</li>}
                </ul>
                {consumo > 0 && (
                  <div className="mt-3 space-y-1 rounded-2xl bg-[#efe3d3] p-3 text-[15px]">
                    <p className="flex justify-between">
                      <span>Consumo</span>
                      <span className="tabular">{brl(consumo)}</span>
                    </p>
                    <p className="flex justify-between">
                      <span>Serviço ({m.dados?.taxa_servico ?? 10}%)</span>
                      <span className="tabular">{brl((consumo * (m.dados?.taxa_servico ?? 10)) / 100)}</span>
                    </p>
                    <p className="flex justify-between text-[18px] font-bold">
                      <span>Total</span>
                      <span className="tabular">{brl(consumo * (1 + (m.dados?.taxa_servico ?? 10) / 100))}</span>
                    </p>
                  </div>
                )}
                {m.dados?.status === "conta" ? (
                  <p className="mt-4 flex items-center justify-center gap-2 rounded-full bg-[#dff3e6] py-3 font-semibold text-[#1d6b3d]">
                    <Check className="h-5 w-5" /> Conta pedida. O garçom já está vindo.
                  </p>
                ) : (
                  consumo > 0 && (
                    <button
                      onClick={async () => {
                        const r = await m.chamar("conta");
                        avisar(r ?? "Pedimos a sua conta!");
                        setVerConta(false);
                      }}
                      className="mt-4 w-full rounded-full bg-carvao py-4 text-[16px] font-bold text-papel"
                    >
                      Pedir a conta
                    </button>
                  )
                )}
              </>
            )}
          </div>
        </div>
      )}

      {aviso && (
        <div role="status" className="fixed inset-x-0 top-4 z-50 mx-auto w-fit max-w-[90%] rounded-full bg-carvao px-5 py-3 text-center font-semibold text-papel shadow-2xl">
          {aviso}
        </div>
      )}
    </div>
  );
}
