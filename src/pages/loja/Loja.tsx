import { useEffect, useMemo, useState } from "react";
import { ChatLoja } from "./ChatLoja";
import { geoContains, type GeoPermissibleObjects } from "d3-geo";
import { ArrowLeft, Bike, Check, ChevronRight, Clock, Copy, CreditCard, Minus, Plus, ShoppingBag, Star, Store, Wallet, X } from "lucide-react";
import { brl, type Grupo, type Produto } from "../../data/mock";
import { useDados, type Entrega } from "../../data/dados";
import { Foto, FOTOS } from "../../components/Foto";
import { BAIRROS, BAIRROS_RIO, GeoMap, centroide, vizinhos, type Feature, type Layer } from "../../components/GeoMap";
import { Brasinha } from "../../components/Logo";
import { buscarCep, localizar, type EnderecoCep } from "../../data/endereco";

type Item = { uid: number; p: Produto; qtd: number; escolhas: Record<string, string[]>; obs: string; unit: number };
type Etapa = "sacola" | "entrega" | "pagamento" | "pix" | "acompanhar";

const precoBase = (p: Produto) => p.promo ?? p.preco;

function calcUnit(p: Produto, esc: Record<string, string[]>) {
  let t = precoBase(p);
  for (const g of p.grupos ?? []) for (const n of esc[g.nome] ?? []) t += g.itens.find((i) => i.nome === n)?.preco ?? 0;
  return t;
}

function SheetProduto({ p, fechar, adicionar }: { p: Produto; fechar: () => void; adicionar: (i: Omit<Item, "uid">) => void }) {
  const [esc, setEsc] = useState<Record<string, string[]>>({});
  const [qtd, setQtd] = useState(1);
  const [obs, setObs] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const unit = calcUnit(p, esc);

  function toggle(g: Grupo, nome: string) {
    setErro(null);
    setEsc((e) => {
      const atual = e[g.nome] ?? [];
      if (g.max === 1) return { ...e, [g.nome]: [nome] };
      if (atual.includes(nome)) return { ...e, [g.nome]: atual.filter((x) => x !== nome) };
      if (atual.length >= g.max) return e;
      return { ...e, [g.nome]: [...atual, nome] };
    });
  }

  function confirmar() {
    const falta = (p.grupos ?? []).find((g) => (esc[g.nome]?.length ?? 0) < g.min);
    if (falta) {
      setErro(`Escolha uma opção em “${falta.nome}”.`);
      return;
    }
    adicionar({ p, qtd, escolhas: esc, obs, unit });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center" onClick={fechar}>
      <div role="dialog" aria-label={p.nome} className="scroll-thin max-h-[92vh] w-full max-w-[480px] overflow-y-auto rounded-t-3xl bg-[#fffaf2] text-carvao sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="relative">
          <Foto nome={p.nome} arte={p.arte} url={p.foto} eager className="h-64 w-full sm:rounded-t-3xl" />
          <button onClick={fechar} aria-label="Fechar" className="absolute right-4 top-4 rounded-full bg-[#fffaf2] p-2 shadow">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5">
          <h2 className="font-display text-[26px] font-extrabold leading-tight">{p.nome}</h2>
          <p className="mt-1 text-[15px] leading-relaxed text-[#5a4c41]">{p.desc}</p>
          <p className="tabular mt-2 text-[18px] font-semibold text-brasa-escura">{brl(precoBase(p))}</p>
          {(p.grupos ?? []).map((g) => (
            <fieldset key={g.nome} className="mt-5">
              <legend className="flex w-full items-center justify-between rounded-xl bg-[#f3e8d8] px-3 py-2">
                <span className="font-semibold">{g.nome}</span>
                <span className="text-[12px] text-[#5a4c41]">{g.min > 0 ? "Obrigatório" : `Até ${g.max}`}</span>
              </legend>
              <div className="divide-y divide-[#eadccb]">
                {g.itens.map((i) => {
                  const on = esc[g.nome]?.includes(i.nome) ?? false;
                  return (
                    <label key={i.nome} className="flex cursor-pointer items-center justify-between gap-3 px-1 py-3">
                      <span>
                        <span className="block text-[15px]">{i.nome}</span>
                        {i.preco > 0 && <span className="tabular text-[13px] text-[#5a4c41]">+ {brl(i.preco)}</span>}
                      </span>
                      <input type={g.max === 1 ? "radio" : "checkbox"} name={g.nome} checked={on} onChange={() => toggle(g, i.nome)} className="h-5 w-5 accent-[#c2410c]" />
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ))}
          <label className="mt-5 block text-[14px] font-semibold">
            Alguma observação?
            <textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={2} placeholder="Ex.: sem cebola" className="mt-1 w-full rounded-xl border border-[#eadccb] bg-white p-3 text-[15px] font-normal" />
          </label>
        </div>
        <div className="sticky bottom-0 border-t border-[#eadccb] bg-[#fffaf2] p-4">
          {erro && (
            <p role="alert" className="mb-3 text-[14px] font-semibold text-[#b42318]">
              {erro}
            </p>
          )}
          <div className="flex items-center gap-3">
          <div className="flex items-center rounded-full border border-[#eadccb]">
            <button aria-label="Diminuir" onClick={() => setQtd(Math.max(1, qtd - 1))} className="p-3">
              <Minus className="h-4 w-4" />
            </button>
            <span className="tabular w-6 text-center font-semibold">{qtd}</span>
            <button aria-label="Aumentar" onClick={() => setQtd(qtd + 1)} className="p-3">
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <button onClick={confirmar} className="flex flex-1 items-center justify-between rounded-full bg-carvao px-5 py-3.5 font-semibold text-papel hover:bg-brasa-escura">
            <span>Adicionar</span>
            <span className="tabular">{brl(unit * qtd)}</span>
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}

function QrFake() {
  const cells = useMemo(() => {
    let s = 7;
    const r = () => ((s = (s * 9301 + 49297) % 233280), s / 233280);
    return Array.from({ length: 25 * 25 }, () => r() > 0.52);
  }, []);
  const finder = (x: number, y: number) => (
    <g key={`${x}${y}`}>
      <rect x={x} y={y} width="7" height="7" fill="#17110e" />
      <rect x={x + 1} y={y + 1} width="5" height="5" fill="#fff" />
      <rect x={x + 2} y={y + 2} width="3" height="3" fill="#17110e" />
    </g>
  );
  return (
    <svg viewBox="0 0 25 25" className="h-48 w-48" role="img" aria-label="QR Code do Pix de exemplo" shapeRendering="crispEdges">
      <rect width="25" height="25" fill="#fff" />
      {cells.map((on, i) => {
        const x = i % 25,
          y = Math.floor(i / 25);
        if ((x < 8 && y < 8) || (x > 16 && y < 8) || (x < 8 && y > 16)) return null;
        return on ? <rect key={i} x={x} y={y} width="1" height="1" fill="#17110e" /> : null;
      })}
      {finder(0, 0)}
      {finder(18, 0)}
      {finder(0, 18)}
    </svg>
  );
}


const PASSO: Record<string, number> = { novo: 1, preparo: 2, pronto: 2, rota: 3, entregue: 4 };

export function Loja() {
  const d = useDados();
  const { cardapio: CARDAPIO, loja: LOJA, zonas: ZONAS } = d;
  // Categoria sem produto não aparece para o cliente.
  const CATEGORIAS = d.categorias.filter((c) => CARDAPIO.some((p) => p.cat === c));
  const [cat, setCat] = useState("");
  const [aberto, setAberto] = useState<Produto | null>(null);
  const [itens, setItens] = useState<Item[]>([]);
  const [etapa, setEtapa] = useState<Etapa | null>(null);
  const [modo, setModo] = useState<"entrega" | "retirada">("entrega");
  const [ponto, setPonto] = useState<[number, number]>(() => {
    const f = BAIRROS_RIO.find((b) => b.properties.nome === "Vista Alegre")!;
    return centroide(f);
  });
  const [entrega, setEntrega] = useState<Entrega | null>(null);
  const [rua, setRua] = useState("");
  const [cep, setCep] = useState("");
  const [endCep, setEndCep] = useState<EnderecoCep | null>(null);
  const [busca, setBusca] = useState<"" | "cep" | "mapa" | "sem-cep" | "numero" | "rua" | "bairro" | "nao-achou">("");
  const [num, setNum] = useState("");
  const [ref, setRef] = useState("");
  const [erroEnd, setErroEnd] = useState("");
  const [nome, setNome] = useState("");
  const [tel, setTel] = useState("");
  const [aceita, setAceita] = useState(true);
  const [saldo, setSaldo] = useState(0);
  const [pag, setPag] = useState<"pix" | "cartao" | "dinheiro">("pix");
  const [cashback, setCashback] = useState(true);
  const [pago, setPago] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [passo, setPasso] = useState(1);
  const [enviando, setEnviando] = useState(false);
  const [erroPedido, setErroPedido] = useState("");
  const [pedido, setPedido] = useState<{ id: string; numero: number; total: number; desconto: number; taxa: number; tempo_min: number; tempo_max: number } | null>(null);

  const categoriaAtual = cat || CATEGORIAS[0];
  const bairroF = useMemo(() => BAIRROS.find((b) => geoContains(b.geometry as GeoPermissibleObjects, ponto)) ?? null, [ponto]);
  const bairro = bairroF?.properties.id ?? null;
  const mapaBase = useMemo(() => {
    const ids = ZONAS.flatMap((z) => z.bairros);
    const alvo = BAIRROS.filter((b) => ids.includes(b.properties.id));
    return vizinhos(alvo.length ? alvo : BAIRROS_RIO, 0.35);
  }, [ZONAS]);

  useEffect(() => {
    let vivo = true;
    d.acoes.resolverEntrega(ponto, bairro).then((r) => vivo && setEntrega(r));
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ponto, bairro, ZONAS]);

  // CEP: preenche a rua e o bairro sozinho
  useEffect(() => {
    const d = cep.replace(/\D/g, "");
    if (d.length !== 8) {
      setEndCep(null);
      return;
    }
    let vivo = true;
    setBusca("cep");
    buscarCep(d).then((e) => {
      if (!vivo) return;
      setEndCep(e);
      if (!e) return setBusca("sem-cep");
      if (e.rua) setRua(e.rua);
      setBusca("");
    });
    return () => {
      vivo = false;
    };
  }, [cep]);

  // CEP + número: acha o ponto no mapa e confere a área de entrega
  useEffect(() => {
    if (!endCep) return;
    let vivo = true;
    const t = setTimeout(() => {
      setBusca("mapa");
      localizar(endCep, num).then((a) => {
        if (!vivo) return;
        if (!a) return setBusca("nao-achou");
        setPonto(a.coord);
        setBusca(a.precisao);
      });
    }, 700);
    return () => {
      vivo = false;
      clearTimeout(t);
    };
  }, [endCep, num]);

  const telDigitos = tel.replace(/\D/g, "");
  useEffect(() => {
    if (telDigitos.length < 10) {
      setSaldo(0);
      return;
    }
    let vivo = true;
    d.acoes.saldoCashback(telDigitos).then((v) => vivo && setSaldo(v));
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [telDigitos]);

  const atende = !!entrega?.atende;
  const sub = itens.reduce((s, i) => s + i.unit * i.qtd, 0);
  const qtdTotal = itens.reduce((s, i) => s + i.qtd, 0);
  const taxa = modo === "retirada" || !atende ? 0 : entrega?.gratis_acima && sub >= entrega.gratis_acima ? 0 : entrega?.taxa ?? 0;
  const desconto = cashback ? Math.min(saldo, sub) : 0;
  const total = sub + taxa - desconto;
  const abaixoMinimo = modo === "entrega" && atende && sub < (entrega?.pedido_minimo ?? 0);
  const tempo = modo === "entrega" && atende ? `${entrega?.tempo_min}–${entrega?.tempo_max} min` : "cerca de 20 min";

  const ofertaUpsell = CARDAPIO.find((p) => p.nome === "Batata cheddar e bacon" && !p.esgotado);
  const oDeSempreProd = CARDAPIO.find((p) => p.nome === "X-Bacon Duplo");

  // acompanha o pagamento e o status do pedido no banco
  useEffect(() => {
    if (!pedido || d.modo === "demo") return;
    const t = setInterval(async () => {
      const s = await d.acoes.statusPedido(pedido.id);
      if (!s) return;
      setPago(s.pago);
      setPasso(PASSO[s.status] ?? 1);
    }, 3000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedido]);

  function adicionar(i: Omit<Item, "uid">) {
    setItens((l) => [...l, { ...i, uid: Date.now() + Math.random() }]);
    setAberto(null);
  }
  function oDeSempre() {
    const p = oDeSempreProd;
    if (!p) return;
    const esc = { "Ponto da carne": ["Ao ponto"], "Turbine seu burger": ["Bacon crocante"] };
    setItens([{ uid: 1, p, qtd: 1, escolhas: esc, obs: "", unit: calcUnit(p, esc) }]);
    setEtapa("sacola");
  }

  const mapaLayers: Layer[] = useMemo(
    () => [
      {
        id: "b",
        features: mapaBase,
        fill: (f) => {
          const z = ZONAS.find((x) => x.bairros.includes(f.properties.id));
          return f.properties.id === bairro ? "#ffc03a" : z ? "#ffe2cc" : "#efe4d4";
        },
        stroke: () => "#fffaf2",
        strokeWidth: 1.2,
      },
    ],
    [bairro, ZONAS, mapaBase],
  );
  const fitEntrega = useMemo(() => {
    const ids = ZONAS.slice(0, 2).flatMap((z) => z.bairros);
    const f = BAIRROS.filter((b) => ids.includes(b.properties.id));
    return f.length ? f : BAIRROS_RIO;
  }, [ZONAS]);

  function avancarEntrega() {
    if (!atende) {
      setErroEnd("Ainda não entregamos nesse ponto. Escolha retirar no balcão ou ajuste o pino.");
      return;
    }
    if (!rua.trim() || !num.trim()) {
      setErroEnd("Informe a rua e o número.");
      return;
    }
    if (abaixoMinimo) {
      setErroEnd(`O pedido mínimo para ${entrega?.bairro} é ${brl(entrega?.pedido_minimo ?? 0)}.`);
      return;
    }
    setErroEnd("");
    setEtapa("pagamento");
  }

  function idsDas(i: Item) {
    const ids: string[] = [];
    for (const g of i.p.grupos ?? []) for (const n of i.escolhas[g.nome] ?? []) ids.push(g.itens.find((o) => o.nome === n)?.id ?? n);
    return ids;
  }

  async function finalizar() {
    if (nome.trim().length < 2) return setErroPedido("Informe seu nome.");
    if (telDigitos.length < 10) return setErroPedido("Informe seu WhatsApp com DDD.");
    setErroPedido("");
    setEnviando(true);
    const r = await d.acoes.fazerPedido({
      modo,
      cliente: { nome: nome.trim(), telefone: telDigitos, aceita_marketing: aceita },
      itens: itens.map((i) => ({ product_id: i.p.id, qtd: i.qtd, escolhas: idsDas(i), obs: i.obs })),
      ponto: modo === "entrega" ? { lon: ponto[0], lat: ponto[1] } : undefined,
      endereco: modo === "entrega" ? { rua: endCep ? [rua, endCep.bairro, endCep.cidade].filter(Boolean).join(", ") : rua, numero: num, complemento: ref, ...(endCep ? { cep: endCep.cep } : {}) } : undefined,
      pagamento: pag === "dinheiro" ? "dinheiro" : pag,
      usar_cashback: cashback,
    });
    setEnviando(false);
    if (r.erro) return setErroPedido(r.erro);
    setPedido({ ...r, total: d.modo === "demo" ? total : Number(r.total), desconto: Number(r.desconto), taxa: Number(r.taxa) });
    setPago(false);
    setPasso(1);
    if (pag === "pix") {
      setEtapa("pix");
      if (d.modo === "demo") setTimeout(() => setPago(true), 3200);
    } else {
      setEtapa("acompanhar");
      if (d.modo === "demo") setTimeout(() => setPasso(2), 2500);
    }
  }

  const totalFinal = pedido?.total ?? total;

  if (d.modo === "real" && d.carregando) return <div className="grid min-h-screen place-items-center bg-[#fffaf2] text-[#5a4c41]">Abrindo o cardápio…</div>;

  return (
    <div className="min-h-screen bg-[#f6ecdf] text-carvao">
      <div className="mx-auto min-h-screen max-w-[480px] bg-[#fffaf2] pb-28 shadow-[0_0_80px_rgba(0,0,0,.08)]">
        <div className="flex items-center justify-between bg-carvao px-4 py-2 text-[12px] text-areia">
          {d.modo === "demo" ? (
            <a href="#painel" className="flex items-center gap-1 hover:text-papel">
              <ArrowLeft className="h-3.5 w-3.5" /> Painel do dono
            </a>
          ) : (
            <span>{d.loja.nome}</span>
          )}
          <span className="flex items-center gap-1.5">
            Loja feita com <Brasinha className="h-4 w-4" /> freguês
          </span>
        </div>

        <header className="relative overflow-hidden bg-carvao px-5 pb-6 pt-28 text-papel">
          <img src={FOTOS.grelha} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-carvao via-carvao/70 to-carvao/10" />
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brasa px-2.5 py-1 text-[12px] font-bold text-carvao">{LOJA.aberto ? "Aberto agora" : "Fechado"}</span>
            <h1 className="mt-2 font-display text-[42px] font-extrabold leading-none tracking-[-0.015em]" style={{ fontVariationSettings: '"wdth" 80' }}>
              {LOJA.nome}
            </h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px]">
              <span className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-mostarda text-mostarda" /> {LOJA.nota} ({LOJA.avaliacoes.toLocaleString("pt-BR")})
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" /> {LOJA.aberto ? LOJA.horario : "Fechado agora"}
              </span>
            </p>
            <div className="mt-4 inline-flex rounded-full bg-papel/15 p-1 text-[14px] font-semibold backdrop-blur" role="tablist" aria-label="Como receber">
              {(
                [
                  ["entrega", "Entrega", <Bike key="b" className="h-4 w-4" />],
                  ["retirada", "Retirar", <Store key="s" className="h-4 w-4" />],
                ] as const
              ).map(([v, r, i]) => (
                <button key={v} role="tab" aria-selected={modo === v} onClick={() => setModo(v)} className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 ${modo === v ? "bg-papel text-carvao" : "text-papel"}`}>
                  {i} {r}
                </button>
              ))}
            </div>
          </div>
        </header>

        {!LOJA.aberto && <p className="mx-4 mt-4 rounded-2xl bg-[#fde7e4] p-4 text-[15px] font-semibold text-[#9b2c1f]">A loja está fechada agora. Você pode olhar o cardápio, mas os pedidos voltam quando abrirmos.</p>}

        {d.modo === "demo" && oDeSempreProd && (
          <div className="mx-4 mt-4 flex items-center gap-3 rounded-2xl bg-carvao p-4 text-papel">
            <Foto nome="X-Bacon Duplo" className="h-14 w-14 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] text-areia">Bem-vindo de volta, Carlos</p>
              <p className="truncate font-semibold">O de sempre: X-Bacon Duplo + bacon</p>
            </div>
            <button onClick={oDeSempre} className="rounded-full bg-brasa px-3 py-2 text-[13px] font-semibold text-carvao">
              Pedir
            </button>
          </div>
        )}

        <nav className="sticky top-0 z-20 mt-4 flex gap-2 overflow-x-auto bg-[#fffaf2]/95 px-4 py-3 backdrop-blur" aria-label="Categorias">
          {CATEGORIAS.map((c) => (
            <a
              key={c}
              href="#loja"
              onClick={(e) => {
                e.preventDefault();
                setCat(c);
                document.getElementById(`cat-${c}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className={`shrink-0 rounded-full px-4 py-2 text-[14px] font-semibold ${categoriaAtual === c ? "bg-carvao text-papel" : "bg-[#f3e8d8] text-[#5a4c41]"}`}
            >
              {c}
            </a>
          ))}
        </nav>

        <main className="px-4">
          {d.erro && <p className="mt-4 rounded-2xl bg-[#fde7e4] p-4 text-[#9b2c1f]">{d.erro}</p>}
          {CATEGORIAS.map((c) => (
            <section key={c} id={`cat-${c}`} className="scroll-mt-16 pt-4">
              <h2 className="font-display text-[24px] font-extrabold">{c}</h2>
              <ul className="mt-2 divide-y divide-[#eadccb]">
                {CARDAPIO.filter((p) => p.cat === c).map((p) => (
                  <li key={p.id}>
                    <button disabled={p.esgotado || !LOJA.aberto} onClick={() => setAberto(p)} className="flex w-full items-center gap-4 py-4 text-left disabled:opacity-50">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">
                          {p.nome}
                          {p.maisPedido && <span className="ml-2 rounded-full bg-mostarda/40 px-2 py-0.5 text-[11px] font-bold text-[#7a4a00]">Mais pedido</span>}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-[14px] text-[#5a4c41]">{p.desc}</p>
                        <p className="tabular mt-1.5 text-[15px] font-semibold">
                          {p.esgotado ? (
                            <span className="text-[#5a4c41]">Esgotado hoje</span>
                          ) : p.promo ? (
                            <>
                              <span className="text-brasa-escura">{brl(p.promo)}</span> <s className="text-[13px] font-normal text-[#8f7b6c]">{brl(p.preco)}</s>
                            </>
                          ) : (
                            brl(p.preco)
                          )}
                        </p>
                      </div>
                      <Foto nome={p.nome} arte={p.arte} url={p.foto} className="h-24 w-24 shrink-0 rounded-2xl shadow-[0_6px_16px_rgba(23,17,14,.12)]" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          <p className="py-8 text-center text-[13px] text-[#8f7b6c]">
            {d.modo === "demo" ? "Loja de demonstração. Nenhum pedido é enviado." : "Loja de demonstração: os pedidos aparecem no painel em tempo real."}
          </p>
        </main>
      </div>

      {qtdTotal > 0 && !etapa && (
        <div className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[480px] p-4">
          <button onClick={() => setEtapa("sacola")} className="flex w-full items-center justify-between rounded-full bg-carvao px-5 py-4 font-semibold text-papel shadow-2xl">
            <span className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" /> Ver sacola ({qtdTotal})
            </span>
            <span className="tabular">{brl(sub)}</span>
          </button>
        </div>
      )}

      {!etapa && !aberto && <ChatLoja subir={qtdTotal > 0} />}
      {aberto && <SheetProduto p={aberto} fechar={() => setAberto(null)} adicionar={adicionar} />}

      {etapa && (
        <div className="fixed inset-0 z-40 bg-[#f6ecdf]">
          <div className="mx-auto flex h-full max-w-[480px] flex-col bg-[#fffaf2]">
            <div className="flex items-center gap-3 border-b border-[#eadccb] px-4 py-4">
              {etapa !== "acompanhar" && etapa !== "pix" && (
                <button
                  aria-label="Voltar"
                  onClick={() => setEtapa(etapa === "sacola" ? null : etapa === "entrega" ? "sacola" : modo === "entrega" ? "entrega" : "sacola")}
                  className="rounded-full p-2 hover:bg-[#f3e8d8]"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
              )}
              <h2 className="font-display text-[22px] font-extrabold">
                {{ sacola: "Sua sacola", entrega: "Onde vamos entregar?", pagamento: "Seus dados e pagamento", pix: "Pague com Pix", acompanhar: "Acompanhe seu pedido" }[etapa]}
              </h2>
            </div>

            <div className="scroll-thin flex-1 overflow-y-auto p-4">
              {etapa === "sacola" && (
                <>
                  {itens.length === 0 && <p className="py-10 text-center text-[#5a4c41]">Sua sacola está vazia. Escolha algo gostoso no cardápio.</p>}
                  <ul className="divide-y divide-[#eadccb]">
                    {itens.map((i) => (
                      <li key={i.uid} className="flex gap-3 py-3">
                        <Foto nome={i.p.nome} arte={i.p.arte} url={i.p.foto} className="h-14 w-14 shrink-0 rounded-xl" />
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold">
                            {i.qtd}x {i.p.nome}
                          </p>
                          <p className="text-[13px] text-[#5a4c41]">{Object.values(i.escolhas).flat().join(", ") || "Sem adicionais"}</p>
                          {i.obs && <p className="text-[13px] text-[#5a4c41]">Obs.: {i.obs}</p>}
                        </div>
                        <div className="text-right">
                          <p className="tabular font-semibold">{brl(i.unit * i.qtd)}</p>
                          <button onClick={() => setItens((l) => l.filter((x) => x.uid !== i.uid))} className="text-[13px] text-brasa-escura hover:underline">
                            Remover
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                  {ofertaUpsell && !itens.some((i) => i.p.id === ofertaUpsell.id) && itens.length > 0 && (
                    <div className="mt-3 flex items-center gap-3 rounded-2xl bg-[#f3e8d8] p-3">
                      <Foto nome={ofertaUpsell.nome} arte={ofertaUpsell.arte} url={ofertaUpsell.foto} className="h-12 w-12 shrink-0 rounded-xl" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] text-[#5a4c41]">Combina com o seu pedido</p>
                        <p className="truncate font-semibold">{ofertaUpsell.nome}</p>
                      </div>
                      <button onClick={() => adicionar({ p: ofertaUpsell, qtd: 1, escolhas: {}, obs: "", unit: ofertaUpsell.preco })} className="rounded-full bg-carvao px-3 py-2 text-[13px] font-semibold text-papel">
                        + {brl(ofertaUpsell.preco)}
                      </button>
                    </div>
                  )}
                </>
              )}

              {etapa === "entrega" && (
                <>
                  <div className="grid grid-cols-[1fr_96px] gap-3">
                    <label className="text-[13px] font-semibold">
                      CEP
                      <input
                        value={cep}
                        onChange={(e) => {
                          const d = e.target.value.replace(/\D/g, "").slice(0, 8);
                          setCep(d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d);
                        }}
                        inputMode="numeric"
                        autoComplete="postal-code"
                        placeholder="00000-000"
                        className="mt-1 w-full rounded-xl border border-[#eadccb] bg-white px-3 py-3 text-[15px] font-normal"
                      />
                    </label>
                    <label className="text-[13px] font-semibold">
                      Número
                      <input
                        value={num}
                        onChange={(e) => {
                          setNum(e.target.value);
                          if (erroEnd) setErroEnd("");
                        }}
                        inputMode="numeric"
                        className="mt-1 w-full rounded-xl border border-[#eadccb] bg-white px-3 py-3 text-[15px] font-normal"
                      />
                    </label>
                  </div>
                  <p className="mt-2 text-[13px] text-[#5a4c41]" aria-live="polite">
                    {busca === "cep"
                      ? "Buscando o CEP…"
                      : busca === "mapa"
                        ? "Procurando o endereço no mapa…"
                        : busca === "sem-cep"
                          ? "Não achamos esse CEP. Confira os números ou marque o ponto no mapa."
                          : busca === "nao-achou"
                            ? "Não achamos o endereço no mapa. Toque no mapa para marcar o ponto."
                            : endCep && busca
                              ? `${endCep.rua ? `${endCep.rua}, ` : ""}${endCep.bairro ? `${endCep.bairro}, ` : ""}${endCep.cidade}. ${busca === "numero" ? "Confira o pino no mapa." : busca === "rua" ? "Achamos a rua. Ajuste o pino na sua casa, se precisar." : "Achamos o bairro. Toque no mapa para marcar a sua casa."}`
                              : "Digite o CEP e o número, ou toque no mapa para marcar o ponto."}
                  </p>
                  <div className="mt-3 overflow-hidden rounded-2xl border border-[#eadccb] bg-[#f6ecdf]">
                    <GeoMap
                      width={440}
                      height={340}
                      padding={10}
                      fitTo={fitEntrega}
                      layers={mapaLayers}
                      pins={[
                        { coord: LOJA.coord, kind: "loja" },
                        { coord: ponto, kind: "cliente" },
                      ]}
                      onPointClick={(c) => setPonto(c)}
                      className="h-auto w-full cursor-crosshair"
                      ariaLabel="Mapa para marcar o ponto de entrega"
                    />
                  </div>
                  <div className={`mt-3 rounded-2xl p-3 text-[14px] ${atende ? "bg-[#e3f5e9] text-[#1e6b42]" : "bg-[#fde7e4] text-[#9b2c1f]"}`} aria-live="polite">
                    {!entrega ? (
                      "Conferindo o endereço…"
                    ) : atende ? (
                      <>
                        <b>Entregamos em {entrega.bairro}</b> · taxa {taxa === 0 ? "grátis" : brl(taxa)} · {tempo}
                      </>
                    ) : (
                      <>
                        <b>{entrega.bairro ? `Ainda não entregamos em ${entrega.bairro}` : "Esse ponto está fora do mapa"}</b>. Você pode retirar no balcão ou mudar o pino.
                        <AvisarBairro key={entrega.bairro ?? "fora"} ponto={ponto} nome={nome} telInicial={tel} bairro={entrega.bairro} />
                      </>
                    )}
                  </div>
                  <label className="mt-4 block text-[13px] font-semibold">
                    Rua
                    <input value={rua} onChange={(e) => setRua(e.target.value)} autoComplete="address-line1" className="mt-1 w-full rounded-xl border border-[#eadccb] bg-white px-3 py-3 text-[15px] font-normal" />
                  </label>
                  <label className="mt-3 block text-[13px] font-semibold">
                    Complemento e ponto de referência
                    <input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Ex.: casa 2, portão azul, perto da padaria" className="mt-1 w-full rounded-xl border border-[#eadccb] bg-white px-3 py-3 text-[15px] font-normal" />
                  </label>
                  {erroEnd && (
                    <p role="alert" className="mt-3 text-[14px] font-semibold text-[#b42318]">
                      {erroEnd}
                    </p>
                  )}
                </>
              )}

              {etapa === "pagamento" && (
                <div className="space-y-3">
                  <div className="grid gap-3">
                    <label className="text-[13px] font-semibold">
                      Seu nome
                      <input value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="name" className="mt-1 w-full rounded-xl border border-[#eadccb] bg-white px-3 py-3 text-[15px] font-normal" />
                    </label>
                    <label className="text-[13px] font-semibold">
                      WhatsApp com DDD
                      <input value={tel} onChange={(e) => setTel(e.target.value)} inputMode="tel" autoComplete="tel" placeholder="(21) 9 9999-9999" className="mt-1 w-full rounded-xl border border-[#eadccb] bg-white px-3 py-3 text-[15px] font-normal" />
                    </label>
                    <label className="flex items-start gap-3 text-[14px] text-[#5a4c41]">
                      <input type="checkbox" checked={aceita} onChange={() => setAceita(!aceita)} className="mt-0.5 h-5 w-5 accent-[#c2410c]" />
                      Quero receber novidades e cupons da {LOJA.nome} no WhatsApp. Posso sair quando quiser.
                    </label>
                  </div>
                  {saldo > 0 && (
                    <label className="flex items-center justify-between rounded-2xl border border-[#eadccb] p-4">
                      <span>
                        <span className="block font-semibold">Usar cashback</span>
                        <span className="text-[13px] text-[#5a4c41]">Você tem {brl(saldo)} de saldo</span>
                      </span>
                      <input type="checkbox" checked={cashback} onChange={() => setCashback(!cashback)} className="h-5 w-5 accent-[#c2410c]" />
                    </label>
                  )}
                  <p className="pt-2 text-[13px] font-semibold">Como você quer pagar?</p>
                  {(
                    [
                      ["pix", "Pix", "Aprovação na hora", <Wallet key="w" className="h-5 w-5" />],
                      ["cartao", "Cartão pelo site", "Crédito ou débito", <CreditCard key="c" className="h-5 w-5" />],
                      ["dinheiro", "Pagar na entrega", "Dinheiro ou maquininha", <Bike key="b" className="h-5 w-5" />],
                    ] as const
                  ).map(([v, t, ds, i]) => (
                    <label key={v} className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 ${pag === v ? "border-carvao bg-white" : "border-[#eadccb]"}`}>
                      <span className="text-brasa-escura">{i}</span>
                      <span className="flex-1">
                        <span className="block font-semibold">{t}</span>
                        <span className="text-[13px] text-[#5a4c41]">{ds}</span>
                      </span>
                      <input type="radio" name="pag" checked={pag === v} onChange={() => setPag(v)} className="h-5 w-5 accent-[#c2410c]" />
                    </label>
                  ))}
                  <div className="rounded-2xl bg-[#f3e8d8] p-4 text-[14px]">
                    <p className="font-semibold">{modo === "entrega" ? `Entrega em ${entrega?.bairro ?? ""}${num ? `, nº ${num}` : ""}` : `Retirada em ${LOJA.bairro}`}</p>
                    <p className="text-[#5a4c41]">Chega em {tempo}</p>
                  </div>
                  {erroPedido && (
                    <p role="alert" className="text-[14px] font-semibold text-[#b42318]">
                      {erroPedido}
                    </p>
                  )}
                </div>
              )}

              {etapa === "pix" && (
                <div className="flex flex-col items-center text-center">
                  <p className="text-[15px] text-[#5a4c41]">
                    Pedido #{pedido?.numero}. Pague {brl(totalFinal)} pelo app do seu banco.
                  </p>
                  <div className="mt-4 rounded-2xl border border-[#eadccb] bg-white p-4">
                    <QrFake />
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText("00020126580014br.gov.bcb.pix-demonstracao-fregues");
                      } catch {
                        /* demonstração */
                      }
                      setCopiado(true);
                    }}
                    className="mt-4 flex items-center gap-2 rounded-full border border-carvao px-5 py-3 font-semibold"
                  >
                    {copiado ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copiado ? "Código copiado" : "Copiar código Pix"}
                  </button>
                  <div className={`mt-6 w-full rounded-2xl p-4 text-[15px] font-semibold ${pago ? "bg-[#e3f5e9] text-[#1e6b42]" : "bg-[#f3e8d8] text-[#5a4c41]"}`} aria-live="polite">
                    {pago ? "Pagamento confirmado. Seu pedido já foi para a cozinha." : "Aguardando o pagamento…"}
                  </div>
                  {!pago && d.modo === "real" && pedido && (
                    <button
                      onClick={async () => {
                        await d.acoes.confirmarPixDemo(pedido.id);
                        setPago(true);
                      }}
                      className="mt-3 text-[14px] font-semibold text-brasa-escura underline-offset-4 hover:underline"
                    >
                      Simular pagamento (loja de demonstração)
                    </button>
                  )}
                </div>
              )}

              {etapa === "acompanhar" && (
                <div>
                  <div className="rounded-2xl bg-carvao p-5 text-papel">
                    <p className="text-[13px] text-areia">Pedido #{pedido?.numero}</p>
                    <p className="font-display text-[26px] font-extrabold leading-tight">
                      {passo >= 4 ? "Entregue. Bom apetite!" : passo === 3 ? "Saiu para entrega" : passo === 2 ? "Na chapa agora" : "Recebemos seu pedido"}
                    </p>
                    <p className="mt-1 text-[14px] text-areia">Previsão: {pedido ? `${pedido.tempo_min}–${pedido.tempo_max} min` : tempo}</p>
                  </div>
                  <ol className="mt-5 space-y-4">
                    {["Pedido recebido", "Em preparo", modo === "entrega" ? "Saiu para entrega" : "Pronto para retirar", "Entregue"].map((t, i) => (
                      <li key={t} className="flex items-center gap-3">
                        <span className={`flex h-8 w-8 items-center justify-center rounded-full text-[14px] font-bold ${i + 1 <= passo ? "bg-brasa text-carvao" : "bg-[#f3e8d8] text-[#8f7b6c]"}`}>
                          {i + 1 < passo ? <Check className="h-4 w-4" /> : i + 1}
                        </span>
                        <span className={i + 1 <= passo ? "font-semibold" : "text-[#8f7b6c]"}>{t}</span>
                      </li>
                    ))}
                  </ol>
                  <p className="mt-6 rounded-2xl bg-[#e3f5e9] p-4 text-[14px] text-[#1e6b42]">
                    {d.modo === "real" ? "Esta tela atualiza sozinha quando a cozinha muda o status no painel." : "Na versão completa, cada etapa também chega no WhatsApp."}
                  </p>
                  {d.modo === "demo" && (
                    <button onClick={() => setPasso(Math.min(4, passo + 1))} className="mt-4 w-full rounded-full border border-[#eadccb] py-3 text-[14px] font-semibold">
                      Avançar etapa (demonstração)
                    </button>
                  )}
                </div>
              )}
            </div>

            {(etapa === "sacola" || etapa === "entrega" || etapa === "pagamento") && (
              <div className="border-t border-[#eadccb] p-4">
                <dl className="space-y-1 text-[14px]">
                  <div className="flex justify-between">
                    <dt className="text-[#5a4c41]">Subtotal</dt>
                    <dd className="tabular">{brl(sub)}</dd>
                  </div>
                  {modo === "entrega" && etapa !== "sacola" && (
                    <div className="flex justify-between">
                      <dt className="text-[#5a4c41]">Entrega {atende ? `(${entrega?.bairro})` : ""}</dt>
                      <dd className="tabular">{atende ? (taxa === 0 ? "Grátis" : brl(taxa)) : "a calcular"}</dd>
                    </div>
                  )}
                  {desconto > 0 && etapa === "pagamento" && (
                    <div className="flex justify-between text-[#1e6b42]">
                      <dt>Cashback</dt>
                      <dd className="tabular">− {brl(desconto)}</dd>
                    </div>
                  )}
                  <div className="flex justify-between pt-1 text-[17px] font-bold">
                    <dt>Total</dt>
                    <dd className="tabular">{brl(etapa === "pagamento" ? total : sub + (etapa === "entrega" ? taxa : 0))}</dd>
                  </div>
                </dl>
                <button
                  disabled={itens.length === 0 || enviando}
                  onClick={() => (etapa === "sacola" ? setEtapa(modo === "entrega" ? "entrega" : "pagamento") : etapa === "entrega" ? avancarEntrega() : finalizar())}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-carvao py-4 font-semibold text-papel disabled:opacity-40"
                >
                  {enviando ? "Enviando pedido…" : etapa === "sacola" ? "Continuar" : etapa === "entrega" ? "Confirmar endereço" : pag === "pix" ? "Fazer pedido e gerar Pix" : "Fazer pedido"}
                  {!enviando && <ChevronRight className="h-4 w-4" />}
                </button>
              </div>
            )}
            {etapa === "pix" && pago && (
              <div className="border-t border-[#eadccb] p-4">
                <button
                  onClick={() => {
                    setEtapa("acompanhar");
                    if (d.modo === "demo") {
                      setPasso(2);
                      setTimeout(() => setPasso(3), 4000);
                    }
                  }}
                  className="w-full rounded-full bg-carvao py-4 font-semibold text-papel"
                >
                  Acompanhar pedido
                </button>
              </div>
            )}
            {etapa === "acompanhar" && (
              <div className="border-t border-[#eadccb] p-4">
                <button
                  onClick={() => {
                    setEtapa(null);
                    setItens([]);
                    setPedido(null);
                  }}
                  className="w-full rounded-full bg-carvao py-4 font-semibold text-papel"
                >
                  Voltar ao cardápio
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export type { Feature };

/** Fora da área: o cliente deixa o WhatsApp e a loja avisa quando começar a entregar ali. */
function AvisarBairro({ ponto, nome, telInicial, bairro }: { ponto: [number, number]; nome: string; telInicial: string; bairro: string | null }) {
  const d = useDados();
  const [tel, setTel] = useState(telInicial);
  const [feito, setFeito] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [indo, setIndo] = useState(false);
  if (feito) return <p className="mt-2 rounded-xl bg-white/70 px-3 py-2 font-semibold text-[#1e6b42]">✓ {feito}</p>;
  return (
    <form
      className="mt-2 rounded-xl bg-white/70 p-3 text-[#3a2a20]"
      onSubmit={async (e) => {
        e.preventDefault();
        setIndo(true);
        const r = await d.acoes.interesseFora(ponto, tel, nome);
        setIndo(false);
        if (r) setErro(r);
        else setFeito(`Combinado! Avisamos no seu WhatsApp quando começarmos a entregar${bairro ? ` em ${bairro}` : " aí"}.`);
      }}
    >
      <p className="text-[13px] font-semibold">Quer ser avisado quando começarmos a entregar{bairro ? ` em ${bairro}` : " aí"}?</p>
      <div className="mt-2 flex gap-2">
        <input
          value={tel}
          onChange={(e) => {
            setTel(e.target.value);
            setErro(null);
          }}
          inputMode="tel"
          autoComplete="tel"
          placeholder="Seu WhatsApp com DDD"
          aria-label="Seu WhatsApp para aviso"
          className="min-w-0 flex-1 rounded-lg border border-[#eadccb] bg-white px-3 py-2 text-[15px]"
        />
        <button disabled={indo} className="shrink-0 rounded-lg bg-[#1f1712] px-3 py-2 text-[13px] font-semibold text-white disabled:opacity-60">
          {indo ? "…" : "Me avise"}
        </button>
      </div>
      {erro && <p className="mt-1 text-[12px] text-[#9b2c1f]">{erro}</p>}
    </form>
  );
}
