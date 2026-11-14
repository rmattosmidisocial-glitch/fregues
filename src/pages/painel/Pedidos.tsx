import { useEffect, useRef, useState } from "react";
import { Bell, BellOff, Bike, ChevronDown, ChevronUp, MapPin, MessageCircle, Phone, Printer, Store, UserPlus, Users, UtensilsCrossed, X } from "lucide-react";
import { brl, type Pedido, type StatusPedido } from "../../data/mock";
import { SLUG, supabase, useDados } from "../../data/dados";
import { useToast } from "../../components/ui";
import { enderecoTxt, imprimirComanda, NOME_FORMA } from "../../components/comanda";
import { ImpressoraModal } from "./Impressora";
import { avisar } from "../../lib/avisos";

const COLUNAS: { id: StatusPedido; rotulo: string; acao?: string; prox?: StatusPedido }[] = [
  { id: "novo", rotulo: "Novos", acao: "Aceitar", prox: "preparo" },
  { id: "preparo", rotulo: "Em preparo", acao: "Marcar pronto", prox: "pronto" },
  { id: "pronto", rotulo: "Prontos", acao: "Despachar", prox: "rota" },
  { id: "rota", rotulo: "Saiu para entrega", acao: "Entregue", prox: "entregue" },
  { id: "entregue", rotulo: "Entregues" },
];

const FORMAS: { id: NonNullable<Pedido["forma"]>; rotulo: string }[] = [
  { id: "pix", rotulo: "Pix" },
  { id: "cartao", rotulo: "Cartão" },
  { id: "dinheiro", rotulo: "Dinheiro" },
  { id: "maquininha", rotulo: "Maquininha" },
];

type Entregador = { id: string; nome: string; telefone?: string | null; ativo: boolean };

// preferência guardada só neste aparelho (a impressora e o som são da máquina da cozinha)
function usePref(chave: string, inicial: boolean): [boolean, (v: boolean) => void] {
  const k = `fregues-${chave}:${SLUG}`;
  const [v, setV] = useState(() => {
    try {
      const s = localStorage.getItem(k);
      return s === null ? inicial : s === "1";
    } catch {
      return inicial;
    }
  });
  return [
    v,
    (n) => {
      setV(n);
      try {
        localStorage.setItem(k, n ? "1" : "0");
      } catch {
        /* sem armazenamento: vale nesta visita */
      }
    },
  ];
}

function apito() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    [0, 0.22, 0.44].forEach((t, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = i === 2 ? 1046 : 880;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.18);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + t);
      o.stop(ctx.currentTime + t + 0.2);
    });
  } catch {
    /* navegador sem som */
  }
}

const zap = (tel: string | undefined, texto: string) => {
  const t = (tel ?? "").replace(/\D/g, "");
  if (t.length < 10) return null;
  return `https://wa.me/${t.startsWith("55") ? t : "55" + t}?text=${encodeURIComponent(texto)}`;
};

function useEntregadores(lojaId?: string) {
  const [lista, setLista] = useState<Entregador[]>(
    supabase
      ? []
      : [
          { id: "d1", nome: "Marquinhos", telefone: "(21) 97000-1111", ativo: true },
          { id: "d2", nome: "Dudu", telefone: "(21) 97000-2222", ativo: true },
        ],
  );
  const carregar = async () => {
    if (!supabase || !lojaId) return;
    const { data } = await supabase.from("couriers").select("id,nome,telefone,ativo").eq("store_id", lojaId).order("nome");
    setLista((data as Entregador[]) ?? []);
  };
  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lojaId]);
  return {
    lista,
    async adicionar(nome: string, telefone: string) {
      if (supabase && lojaId) {
        const { error } = await supabase.from("couriers").insert({ store_id: lojaId, nome, telefone: telefone || null });
        if (error) return error.message;
        await carregar();
      } else setLista((l) => [...l, { id: String(Date.now()), nome, telefone, ativo: true }]);
      return null;
    },
    async remover(id: string) {
      if (supabase) {
        await supabase.from("couriers").delete().eq("id", id);
        await carregar();
      } else setLista((l) => l.filter((x) => x.id !== id));
    },
  };
}

function Entregadores({ e, fechar }: { e: ReturnType<typeof useEntregadores>; fechar: () => void }) {
  const [nome, setNome] = useState("");
  const [tel, setTel] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={fechar}>
      <div role="dialog" aria-label="Entregadores" className="w-full max-w-[440px] rounded-3xl bg-forno p-6" onClick={(x) => x.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-display text-[24px] font-extrabold">Entregadores</h2>
            <p className="text-[14px] text-areia">Quem leva os pedidos da casa. Você escolhe um em cada entrega.</p>
          </div>
          <button onClick={fechar} aria-label="Fechar" className="rounded-full p-2 hover:bg-grafite">
            <X className="h-5 w-5" />
          </button>
        </div>
        <ul className="mt-4 divide-y divide-linha">
          {e.lista.map((x) => (
            <li key={x.id} className="flex items-center justify-between py-2.5">
              <span>
                <span className="font-semibold">{x.nome}</span>
                {x.telefone && <span className="block text-[13px] text-areia">{x.telefone}</span>}
              </span>
              <button onClick={() => e.remover(x.id)} className="rounded-full px-3 py-1 text-[13px] text-areia hover:bg-grafite hover:text-tomate">
                Remover
              </button>
            </li>
          ))}
          {e.lista.length === 0 && <li className="py-3 text-[14px] text-areia">Nenhum entregador ainda.</li>}
        </ul>
        <form
          className="mt-4 grid grid-cols-[1fr_1fr_auto] gap-2"
          onSubmit={async (x) => {
            x.preventDefault();
            if (!nome.trim()) return;
            const r = await e.adicionar(nome.trim(), tel.trim());
            setErro(r);
            if (!r) {
              setNome("");
              setTel("");
            }
          }}
        >
          <input value={nome} onChange={(x) => setNome(x.target.value)} placeholder="Nome" aria-label="Nome do entregador" className="rounded-xl border border-linha bg-carvao px-3 py-2.5 text-[15px]" />
          <input value={tel} onChange={(x) => setTel(x.target.value)} placeholder="WhatsApp" inputMode="tel" aria-label="WhatsApp do entregador" className="rounded-xl border border-linha bg-carvao px-3 py-2.5 text-[15px]" />
          <button className="flex items-center gap-1.5 rounded-xl bg-brasa px-3 text-[14px] font-semibold text-carvao">
            <UserPlus className="h-4 w-4" /> Incluir
          </button>
        </form>
        {erro && <p className="mt-2 text-[14px] text-tomate">{erro}</p>}
      </div>
    </div>
  );
}

function Cartao({ p, c, ent, abrir, aberto, show }: { p: Pedido; c: (typeof COLUNAS)[number]; ent: Entregador[]; abrir: () => void; aberto: boolean; show: (m: string) => void }) {
  const d = useDados();
  const [quem, setQuem] = useState("");
  const [despachando, setDespachando] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [motivo, setMotivo] = useState("");
  const loja = d.loja.nome;
  const primeiro = p.cliente.split(" ")[0];
  const entrega = p.modo === "Entrega";

  const avancar = async (prox: StatusPedido, motoboy?: string) => {
    await d.acoes.avancarPedido(p.num, prox, motoboy);
    if (prox === "preparo") show(`Pedido #${p.num} aceito`);
    if (prox === "pronto") show(entrega ? `#${p.num} pronto. Escolha o entregador para despachar` : `#${p.num} pronto para o cliente`);
    if (prox === "rota") show(entrega ? `#${p.num} saiu com ${motoboy}` : `#${p.num} liberado`);
    if (prox === "entregue") show(`#${p.num} entregue`);
  };

  const avisoSaiu = zap(p.tel, `Oi, ${primeiro}! Seu pedido #${p.num} da ${loja} saiu para entrega${p.motoboy ? ` com ${p.motoboy}` : ""}. Já já chega aí!`);
  const avisoPronto = zap(p.tel, `Oi, ${primeiro}! Seu pedido #${p.num} da ${loja} está pronto para retirar.`);
  const falar = zap(p.tel, `Oi, ${primeiro}! Aqui é da ${loja}, sobre o seu pedido #${p.num}.`);
  const mapa = p.endereco?.rua ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(enderecoTxt(p).replace(/ · /g, ", ") + ", Rio de Janeiro")}` : null;

  return (
    <article className={`rounded-2xl border bg-forno p-4 ${c.id === "novo" ? "border-brasa shadow-[0_0_0_4px_rgba(255,91,31,.12)]" : "border-linha"}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="font-display text-[22px] font-extrabold leading-none">#{p.num}</p>
          <p className="mt-1 font-semibold">{p.cliente}</p>
        </div>
        <span className={`tabular rounded-full px-2 py-0.5 text-[12px] font-semibold ${p.min > 20 && c.id !== "entregue" ? "bg-[#fbe4e0] text-[#9b3530]" : "bg-grafite text-areia"}`}>há {p.min} min</span>
      </div>
      <p className="mt-2 flex items-center gap-1.5 text-[13px] text-areia">
        {entrega ? <Bike className="h-4 w-4" /> : p.modo === "Retirada" || p.modo === "Balcão" ? <Store className="h-4 w-4" /> : <UtensilsCrossed className="h-4 w-4" />}
        {entrega ? p.bairro : p.modo}
        {p.motoboy && ` · ${p.motoboy}`}
      </p>
      {p.primeira && <p className="mt-2 inline-block rounded-full bg-mostarda/15 px-2 py-0.5 text-[12px] font-semibold text-mostarda">Primeira compra</p>}
      <ul className="mt-3 space-y-0.5 text-[14px]">
        {p.itens.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
      {p.nota && <p className="mt-2 rounded-lg bg-grafite px-2.5 py-1.5 text-[13px] text-mostarda">Obs.: {p.nota}</p>}
      <div className="mt-3 flex items-center justify-between border-t border-linha pt-3 text-[14px]">
        <span className="tabular font-semibold">{brl(p.total)}</span>
        <span className={p.pago ? "text-manjericao" : "text-mostarda"}>
          {p.pago ? `${NOME_FORMA[p.forma ?? ""] ?? p.pag} · pago` : `${NOME_FORMA[p.forma ?? ""] ?? p.pag} · a receber`}
        </span>
      </div>

      {/* ações de cada etapa */}
      {c.id === "pronto" && entrega && despachando ? (
        <div className="mt-3 space-y-2">
          {ent.length ? (
            <select value={quem} onChange={(e) => setQuem(e.target.value)} aria-label="Entregador" className="w-full rounded-xl border border-linha bg-carvao px-3 py-2.5 text-[14px]">
              <option value="">Quem vai levar?</option>
              {ent.map((x) => (
                <option key={x.id} value={x.nome}>
                  {x.nome}
                </option>
              ))}
            </select>
          ) : (
            <p className="rounded-xl bg-grafite p-2.5 text-[13px] text-areia">Cadastre um entregador no botão Entregadores, no topo.</p>
          )}
          <div className="flex gap-2">
            <button onClick={() => setDespachando(false)} className="flex-1 rounded-xl border border-linha py-2.5 text-[14px]">
              Voltar
            </button>
            <button disabled={!quem} onClick={() => avancar("rota", quem)} className="flex-1 rounded-xl bg-papel py-2.5 text-[14px] font-semibold text-carvao disabled:opacity-40">
              Saiu com {quem || "…"}
            </button>
          </div>
        </div>
      ) : (
        c.acao &&
        c.prox && (
          <button
            onClick={() => (c.id === "pronto" && entrega ? setDespachando(true) : avancar(c.prox!))}
            className={`mt-3 w-full rounded-xl py-2.5 text-[14px] font-semibold ${c.id === "novo" ? "bg-brasa text-carvao hover:bg-mostarda" : "bg-papel text-carvao hover:bg-mostarda"}`}
          >
            {c.id === "pronto" && !entrega ? "Cliente retirou" : c.acao}
          </button>
        )
      )}
      {c.id === "rota" && avisoSaiu && (
        <a href={avisoSaiu} target="_blank" rel="noreferrer" className="mt-2 flex items-center justify-center gap-1.5 rounded-xl border border-linha py-2 text-[13px] font-semibold hover:border-areia">
          <MessageCircle className="h-4 w-4" /> Avisar que saiu
        </a>
      )}
      {c.id === "pronto" && !entrega && avisoPronto && (
        <a href={avisoPronto} target="_blank" rel="noreferrer" className="mt-2 flex items-center justify-center gap-1.5 rounded-xl border border-linha py-2 text-[13px] font-semibold hover:border-areia">
          <MessageCircle className="h-4 w-4" /> Avisar que está pronto
        </a>
      )}

      <button onClick={abrir} aria-expanded={aberto} className="mt-2 flex w-full items-center justify-center gap-1 py-1 text-[13px] text-areia hover:text-papel">
        {aberto ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />} {aberto ? "Fechar detalhes" : "Detalhes, pagamento e impressão"}
      </button>

      {aberto && (
        <div className="mt-2 space-y-3 border-t border-linha pt-3 text-[13px]">
          {entrega && (
            <p className="flex gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-areia" />
              <span>
                {enderecoTxt(p)}
                {mapa && (
                  <a href={mapa} target="_blank" rel="noreferrer" className="ml-1 font-semibold underline">
                    ver no mapa
                  </a>
                )}
              </span>
            </p>
          )}
          {p.tel && (
            <p className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-areia" /> {p.tel}
              {falar && (
                <a href={falar} target="_blank" rel="noreferrer" className="ml-auto rounded-full bg-manjericao px-2.5 py-1 font-semibold text-carvao">
                  WhatsApp
                </a>
              )}
            </p>
          )}
          {!p.pago && (
            <div>
              <p className="mb-1.5 text-areia">Recebeu o pagamento? Marque como pago para entrar no caixa:</p>
              <div className="grid grid-cols-2 gap-1.5">
                {FORMAS.map((f) => (
                  <button
                    key={f.id}
                    onClick={async () => {
                      const r = await d.acoes.pagarPedido(p.num, f.id);
                      show(r ?? `#${p.num} pago no ${f.rotulo}`);
                    }}
                    className="rounded-lg border border-linha py-1.5 font-semibold hover:border-areia"
                  >
                    {f.rotulo}
                  </button>
                ))}
              </div>
            </div>
          )}
          <button onClick={() => imprimirComanda(p, loja)} className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-linha py-2 font-semibold hover:border-areia">
            <Printer className="h-4 w-4" /> Imprimir comanda
          </button>
          {c.id !== "entregue" &&
            (cancelando ? (
              <div className="space-y-2">
                <input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Motivo do cancelamento" aria-label="Motivo do cancelamento" className="w-full rounded-xl border border-linha bg-carvao px-3 py-2 text-[14px]" />
                <div className="flex gap-2">
                  <button onClick={() => setCancelando(false)} className="flex-1 rounded-xl border border-linha py-2">
                    Voltar
                  </button>
                  <button
                    onClick={async () => {
                      const r = await d.acoes.cancelarPedido(p.num, motivo);
                      show(r ?? `#${p.num} cancelado`);
                    }}
                    className="flex-1 rounded-xl bg-tomate py-2 font-semibold text-white"
                  >
                    Confirmar cancelamento
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setCancelando(true)} className="w-full py-1 text-tomate hover:underline">
                Cancelar pedido
              </button>
            ))}
        </div>
      )}
    </article>
  );
}

export function Pedidos() {
  const d = useDados();
  const lista = d.pedidos;
  const { show, Toast } = useToast();
  const [som, setSom] = usePref("pedidos-som", true);
  const [auto, setAuto] = usePref("pedidos-imprimir", false);
  const [verEnt, setVerEnt] = useState(false);
  const [verImp, setVerImp] = useState(false);
  const [aberto, setAberto] = useState<number | null>(null);
  const [tempo, setTempo] = useState<number | null>(supabase ? null : 22);
  const ent = useEntregadores(d.loja.id);
  const vistos = useRef<Set<number> | null>(null);

  // tempo médio real de preparo de hoje
  useEffect(() => {
    if (!supabase || !d.loja.id) return;
    supabase.rpc("pedidos_tempo_medio", { p_store: d.loja.id }).then(({ data }) => setTempo((data as number | null) ?? null));
  }, [d.loja.id, lista]);

  // pedido novo: toca o alerta e, se ligado, imprime sozinho
  useEffect(() => {
    const novos = lista.filter((p) => p.status === "novo");
    if (vistos.current === null) {
      vistos.current = new Set(lista.map((p) => p.num));
      return;
    }
    const chegaram = novos.filter((p) => !vistos.current!.has(p.num));
    lista.forEach((p) => vistos.current!.add(p.num));
    if (!chegaram.length) return;
    if (som) apito();
    if (auto) chegaram.forEach((p) => imprimirComanda(p, d.loja.nome));
    avisar(chegaram.length === 1 ? `Pedido novo #${chegaram[0].num}` : `${chegaram.length} pedidos novos`, chegaram.map((p) => `${p.cliente} · ${brl(p.total)}`).join("\n"));
    show(chegaram.length === 1 ? `Pedido novo: #${chegaram[0].num} de ${chegaram[0].cliente}` : `${chegaram.length} pedidos novos`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lista]);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[clamp(2rem,4vw,2.8rem)] font-extrabold tracking-[-0.015em]">Pedidos</h1>
          <p className="text-[15px] text-areia">{tempo ? `Tempo médio de preparo hoje: ${tempo} min` : "O tempo médio de preparo aparece quando os primeiros pedidos de hoje ficarem prontos."}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              setSom(!som);
              if (!som) apito();
            }}
            aria-pressed={som}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-[14px] font-semibold ${som ? "bg-papel text-carvao" : "border border-linha"}`}
          >
            {som ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />} Som {som ? "ligado" : "desligado"}
          </button>
          <button
            onClick={() => {
              setAuto(!auto);
              show(!auto ? "Pedidos novos serão impressos assim que chegarem" : "Impressão automática desligada");
            }}
            aria-pressed={auto}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-[14px] font-semibold ${auto ? "bg-papel text-carvao" : "border border-linha"}`}
          >
            <Printer className="h-4 w-4" /> Imprimir ao chegar {auto ? "ligado" : "desligado"}
          </button>
          <button onClick={() => setVerImp(true)} className="flex items-center gap-2 rounded-full border border-linha px-4 py-2 text-[14px] font-semibold hover:border-areia">
            <Printer className="h-4 w-4" /> Impressora
          </button>
          <button onClick={() => setVerEnt(true)} className="flex items-center gap-2 rounded-full border border-linha px-4 py-2 text-[14px] font-semibold hover:border-areia">
            <Users className="h-4 w-4" /> Entregadores ({ent.lista.length})
          </button>
        </div>
      </div>

      <div className="scroll-thin -mx-4 mt-6 flex gap-4 overflow-x-auto px-4 pb-4 md:-mx-8 md:px-8">
        {COLUNAS.map((c) => {
          const itens = lista.filter((p) => p.status === c.id);
          return (
            <section key={c.id} className="w-[290px] shrink-0" aria-label={c.rotulo}>
              <div className="mb-3 flex items-center justify-between px-1">
                <h2 className="font-display text-[18px] font-bold">{c.rotulo}</h2>
                <span className="tabular rounded-full bg-grafite px-2.5 py-0.5 text-[13px]">{itens.length}</span>
              </div>
              <div className="space-y-3">
                {itens.map((p) => (
                  <Cartao key={p.num} p={p} c={c} ent={ent.lista.filter((x) => x.ativo)} aberto={aberto === p.num} abrir={() => setAberto(aberto === p.num ? null : p.num)} show={show} />
                ))}
                {itens.length === 0 && <p className="rounded-2xl border border-dashed border-linha p-6 text-center text-[14px] text-fumo">Nenhum pedido aqui.</p>}
              </div>
            </section>
          );
        })}
      </div>
      {verImp && <ImpressoraModal fechar={() => setVerImp(false)} auto={auto} setAuto={setAuto} />}
      {verEnt && <Entregadores e={ent} fechar={() => setVerEnt(false)} />}
      <Toast />
    </div>
  );
}
