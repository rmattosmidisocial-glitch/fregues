import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, AtSign as Instagram, Bot, CheckCheck, MapPin, MessageCircle, Search, Send, Settings2, ShoppingBag, Smile, Frown, Meh, Store, UserRound } from "lucide-react";
import { crescer, quandoTxt, responder, useCrescer, type Conversa, type Humor } from "../../data/crescer";
import { useDados } from "../../data/dados";
import { brl } from "../../data/mock";

const CANAL: Record<Conversa["canal"], React.ReactNode> = {
  Loja: <Store className="h-3.5 w-3.5" />,
  WhatsApp: <MessageCircle className="h-3.5 w-3.5" />,
  Instagram: <Instagram className="h-3.5 w-3.5" />,
};
const HUMOR: Record<Humor, { rotulo: string; cor: string; icone: React.ReactNode }> = {
  positivo: { rotulo: "Feliz", cor: "text-manjericao", icone: <Smile className="h-4 w-4" /> },
  neutro: { rotulo: "Neutro", cor: "text-areia", icone: <Meh className="h-4 w-4" /> },
  negativo: { rotulo: "Chateado", cor: "text-tomate", icone: <Frown className="h-4 w-4" /> },
};
const iniciais = (n: string) =>
  n
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
const hora = (t: number) => new Date(t).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

function Ajustes() {
  const aj = useCrescer((s) => s.ajustes);
  const zonas = useDados().zonas;
  const [teste, setTeste] = useState("vocês entregam no Méier?");
  const r = responder(teste, { zonas, ajustes: aj });
  const Opcao = ({ k, rotulo, desc }: { k: "emojis" | "recomendar" | "passarReclamacao"; rotulo: string; desc: string }) => (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl bg-grafite p-4">
      <span>
        <span className="block font-semibold">{rotulo}</span>
        <span className="block text-[13px] text-areia">{desc}</span>
      </span>
      <input type="checkbox" checked={aj[k]} onChange={(e) => crescer.setAjustes({ [k]: e.target.checked })} className="mt-1 h-5 w-5 accent-[#ff5b1f]" />
    </label>
  );
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="space-y-3 rounded-3xl border border-linha bg-forno p-5">
        <h2 className="font-display text-[20px] font-bold">Como a atendente responde</h2>
        <p className="text-[14px] text-areia">Ela já sabe o cardápio, os preços, o que acabou, a taxa de cada bairro do Mapa de atuação, o horário e as formas de pagamento. Tudo que você mudar no painel ela aprende na hora.</p>
        <label className="block text-[13px] text-areia">
          Nome da atendente
          <input value={aj.nomeAtendente} onChange={(e) => crescer.setAjustes({ nomeAtendente: e.target.value })} className="mt-1 w-full rounded-xl border border-linha bg-carvao px-3 py-2 text-[15px] text-papel" />
        </label>
        <div className="flex gap-2">
          {(
            [
              ["amigavel", "Amigável"],
              ["direto", "Direto"],
            ] as const
          ).map(([v, r]) => (
            <button key={v} onClick={() => crescer.setAjustes({ tom: v })} aria-pressed={aj.tom === v} className={`flex-1 rounded-xl py-2.5 text-[14px] font-semibold ${aj.tom === v ? "bg-papel text-carvao" : "border border-linha text-areia"}`}>
              Tom {r.toLowerCase()}
            </button>
          ))}
        </div>
        <Opcao k="emojis" rotulo="Usar emojis" desc="Deixa a conversa mais leve, como no WhatsApp." />
        <Opcao k="recomendar" rotulo="Sugerir os mais pedidos" desc="Quando perguntam o cardápio, ela indica o que mais vende." />
        <Opcao k="passarReclamacao" rotulo="Reclamação vai direto para a equipe" desc="Pedido frio, atrasado ou errado: ela pede desculpas e chama você." />
      </div>
      <div className="rounded-3xl border border-linha bg-forno p-5">
        <h2 className="font-display text-[20px] font-bold">Teste a atendente</h2>
        <p className="text-[14px] text-areia">Escreva como um cliente escreveria.</p>
        <input value={teste} onChange={(e) => setTeste(e.target.value)} className="mt-3 w-full rounded-xl border border-linha bg-carvao px-3 py-2.5 text-[15px] text-papel" aria-label="Mensagem de teste" />
        <div className="mt-3 flex flex-wrap gap-2">
          {["qual o mais pedido?", "entregam em Bonsucesso?", "aceita pix?", "meu lanche chegou frio", "tem vegetariano?"].map((x) => (
            <button key={x} onClick={() => setTeste(x)} className="rounded-full border border-linha px-3 py-1 text-[13px] text-areia hover:text-papel">
              {x}
            </button>
          ))}
        </div>
        <div className="mt-4 space-y-2">
          <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-tr-sm bg-grafite px-4 py-2.5 text-[15px]">{teste || "…"}</p>
          <div className="flex items-end gap-2">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brasa text-carvao">
              <Bot className="h-4 w-4" />
            </span>
            <p className="max-w-[85%] rounded-2xl rounded-tl-sm bg-[#1f3b2c] px-4 py-2.5 text-[15px] leading-relaxed text-[#e9f7ee]">{r.texto}</p>
          </div>
          <p className="pt-1 text-[13px] text-areia">
            Assunto: <b className="text-papel">{r.titulo}</b> · Humor: <b className={HUMOR[r.humor].cor}>{HUMOR[r.humor].rotulo}</b>
            {r.equipe && <b className="text-mostarda"> · Passa para a equipe</b>}
          </p>
        </div>
      </div>
    </div>
  );
}

export function Atendimento() {
  const conversas = useCrescer((s) => s.conversas);
  const d = useDados();
  const [aba, setAba] = useState<"conversas" | "ajustes">("conversas");
  const [filtro, setFiltro] = useState<"todas" | "naolidas" | "equipe" | "fechadas">("todas");
  const [busca, setBusca] = useState("");
  const [selId, setSelId] = useState<string | null>(null);
  const [texto, setTexto] = useState("");
  const fim = useRef<HTMLDivElement>(null);
  const sel = conversas.find((c) => c.id === selId);

  useEffect(() => {
    fim.current?.scrollIntoView({ block: "end" });
  }, [selId, sel?.mensagens.length]);

  useEffect(() => {
    if (sel?.naoLida) crescer.setConversa(sel.id, (c) => ({ ...c, naoLida: false }));
  }, [sel?.id, sel?.naoLida]);

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return conversas.filter(
      (c) =>
        (filtro === "todas" || (filtro === "naolidas" && c.naoLida) || (filtro === "equipe" && c.status === "equipe") || (filtro === "fechadas" && c.status === "fechada")) &&
        (!q || c.cliente.toLowerCase().includes(q) || c.titulo.toLowerCase().includes(q)),
    );
  }, [conversas, filtro, busca]);

  const resolvidasIA = conversas.filter((c) => c.status !== "equipe" && !c.mensagens.some((m) => m.de === "equipe")).length;
  const pedidos = conversas.filter((c) => c.pedidoGerado);
  const cliente = sel ? d.fregueses.find((f) => f.nome === sel.cliente) : undefined;

  function enviar() {
    if (!sel || !texto.trim()) return;
    crescer.enviarEquipe(sel.id, texto.trim());
    setTexto("");
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[clamp(2rem,4vw,2.8rem)] font-extrabold tracking-[-0.02em]">Atendimento</h1>
          <p className="max-w-[640px] text-[15px] text-areia">Uma atendente com IA responde na loja, no WhatsApp e no Instagram. Quando precisa de gente, ela passa para você.</p>
        </div>
        <div className="flex rounded-full border border-linha p-1 text-[14px] font-semibold" role="tablist">
          <button role="tab" aria-selected={aba === "conversas"} onClick={() => setAba("conversas")} className={`rounded-full px-4 py-1.5 ${aba === "conversas" ? "bg-papel text-carvao" : "text-areia"}`}>
            Conversas
          </button>
          <button role="tab" aria-selected={aba === "ajustes"} onClick={() => setAba("ajustes")} className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 ${aba === "ajustes" ? "bg-papel text-carvao" : "text-areia"}`}>
            <Settings2 className="h-4 w-4" /> Ajustar a IA
          </button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["Conversas hoje", String(conversas.length)],
          ["Resolvidas pela IA", `${Math.round((resolvidasIA / Math.max(1, conversas.length)) * 100)}%`],
          ["Esperando a equipe", String(conversas.filter((c) => c.status === "equipe").length)],
          ["Viraram pedido", String(pedidos.length)],
        ].map(([k, v]) => (
          <div key={k} className="rounded-2xl border border-linha bg-forno p-4">
            <p className="text-[12px] text-areia">{k}</p>
            <p className="tabular mt-1 font-display text-[26px] font-bold">{v}</p>
          </div>
        ))}
      </div>

      {aba === "ajustes" ? (
        <div className="mt-5">
          <Ajustes />
        </div>
      ) : (
        <div className="mt-5 grid h-[calc(100vh-260px)] min-h-[560px] overflow-hidden rounded-3xl border border-linha bg-forno lg:grid-cols-[320px_1fr_300px]">
          <div className={`flex min-h-0 flex-col border-r border-linha ${sel ? "hidden lg:flex" : "flex"}`}>
            <div className="space-y-2 border-b border-linha p-3">
              <label className="relative block">
                <span className="sr-only">Buscar conversa</span>
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fumo" />
                <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar" className="w-full rounded-full border border-linha bg-carvao py-2 pl-9 pr-3 text-[14px]" />
              </label>
              <div className="flex flex-wrap gap-1">
                {(
                  [
                    ["todas", "Todas"],
                    ["naolidas", "Não lidas"],
                    ["equipe", "Com a equipe"],
                    ["fechadas", "Fechadas"],
                  ] as const
                ).map(([v, r]) => (
                  <button key={v} onClick={() => setFiltro(v)} aria-pressed={filtro === v} className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ${filtro === v ? "bg-papel text-carvao" : "text-areia hover:text-papel"}`}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <ul className="scroll-thin min-h-0 flex-1 overflow-y-auto">
              {lista.map((c) => {
                const ult = c.mensagens[c.mensagens.length - 1];
                return (
                  <li key={c.id}>
                    <button onClick={() => setSelId(c.id)} className={`flex w-full gap-3 border-b border-linha/60 px-3 py-3 text-left transition hover:bg-grafite ${selId === c.id ? "bg-grafite" : ""}`}>
                      <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full bg-linha text-[13px] font-bold">
                        {c.cliente === "Visitante da loja" ? <UserRound className="h-4 w-4" /> : iniciais(c.cliente)}
                        <span className="absolute -bottom-0.5 -right-0.5 grid h-5 w-5 place-items-center rounded-full border-2 border-forno bg-carvao text-areia">{CANAL[c.canal]}</span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className={`truncate text-[14px] ${c.naoLida ? "font-bold" : "font-semibold"}`}>{c.titulo}</span>
                          <span className="shrink-0 text-[11px] text-fumo">{quandoTxt(ult.quando)}</span>
                        </span>
                        <span className="block truncate text-[13px] text-areia">
                          {c.cliente} · {ult.texto}
                        </span>
                        <span className="mt-1 flex items-center gap-2 text-[11px]">
                          {c.status === "equipe" && <span className="rounded-full bg-[#46320f] px-2 py-0.5 font-semibold text-[#ffd08a]">Com a equipe</span>}
                          {c.status === "ia" && <span className="rounded-full bg-grafite px-2 py-0.5 font-semibold text-areia">IA respondendo</span>}
                          {c.humor === "negativo" && <span className="font-semibold text-tomate">Chateado</span>}
                          {c.pedidoGerado && <span className="font-semibold text-manjericao">Virou pedido</span>}
                          {c.naoLida && <span className="ml-auto h-2 w-2 rounded-full bg-brasa" />}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
              {lista.length === 0 && <li className="p-6 text-center text-[14px] text-areia">Nenhuma conversa aqui.</li>}
            </ul>
          </div>

          <div className={`min-h-0 flex-col ${sel ? "flex" : "hidden lg:flex"}`}>
            {!sel ? (
              <div className="m-auto max-w-[280px] text-center text-areia">
                <Bot className="mx-auto h-8 w-8 text-brasa" />
                <p className="mt-2 font-semibold text-papel">Escolha uma conversa</p>
                <p className="text-[14px]">Você lê tudo o que a atendente respondeu e pode assumir quando quiser.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 border-b border-linha px-4 py-3">
                  <button onClick={() => setSelId(null)} className="rounded-full p-1 lg:hidden" aria-label="Voltar para a lista">
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{sel.titulo}</p>
                    <p className="flex items-center gap-1 text-[12px] text-areia">
                      {CANAL[sel.canal]} {sel.canal} · {sel.cliente}
                    </p>
                  </div>
                  {sel.status !== "fechada" ? (
                    <button onClick={() => crescer.setConversa(sel.id, (c) => ({ ...c, status: "fechada" }))} className="flex items-center gap-1.5 rounded-full border border-linha px-3 py-1.5 text-[13px] font-semibold hover:border-areia">
                      <CheckCheck className="h-4 w-4" /> Fechar
                    </button>
                  ) : (
                    <span className="rounded-full bg-grafite px-3 py-1.5 text-[12px] text-areia">Fechada</span>
                  )}
                </div>
                <div className="scroll-thin min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
                  {sel.mensagens.map((m) =>
                    m.de === "sistema" ? (
                      <p key={m.id} className="mx-auto w-fit rounded-full bg-grafite px-3 py-1 text-[12px] text-areia">
                        {m.texto}
                      </p>
                    ) : m.de === "cliente" ? (
                      <div key={m.id} className="max-w-[80%]">
                        <p className="rounded-2xl rounded-tl-sm bg-grafite px-4 py-2.5 text-[15px] leading-relaxed">{m.texto}</p>
                        <p className="mt-1 text-[11px] text-fumo">{hora(m.quando)}</p>
                      </div>
                    ) : (
                      <div key={m.id} className="ml-auto max-w-[80%]">
                        <p className={`rounded-2xl rounded-tr-sm px-4 py-2.5 text-[15px] leading-relaxed ${m.de === "ia" ? "bg-[#1f3b2c] text-[#e9f7ee]" : "bg-brasa text-carvao"}`}>{m.texto}</p>
                        <p className="mt-1 flex items-center justify-end gap-1 text-[11px] text-fumo">
                          {m.de === "ia" ? (
                            <>
                              <Bot className="h-3 w-3" /> Atendente IA
                            </>
                          ) : (
                            "Você"
                          )}{" "}
                          · {hora(m.quando)}
                        </p>
                      </div>
                    ),
                  )}
                  <div ref={fim} />
                </div>
                <div className="border-t border-linha p-3">
                  {sel.status === "ia" && <p className="mb-2 text-[12px] text-areia">A IA está respondendo esta conversa. Se você escrever, assume no lugar dela.</p>}
                  <div className="flex gap-2">
                    <input
                      value={texto}
                      onChange={(e) => setTexto(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && enviar()}
                      placeholder={`Responder ${sel.cliente.split(" ")[0]}…`}
                      className="min-w-0 flex-1 rounded-full border border-linha bg-carvao px-4 py-2.5 text-[15px]"
                      aria-label="Sua resposta"
                    />
                    <button onClick={enviar} className="flex items-center gap-2 rounded-full bg-brasa px-4 text-[14px] font-semibold text-carvao hover:bg-mostarda">
                      <Send className="h-4 w-4" /> {sel.status === "ia" ? "Assumir e enviar" : "Enviar"}
                    </button>
                  </div>
                  {sel.status === "equipe" && (
                    <button onClick={() => crescer.setConversa(sel.id, (c) => ({ ...c, status: "ia" }))} className="mt-2 text-[12px] font-semibold text-areia underline-offset-2 hover:text-papel hover:underline">
                      Devolver para a IA
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          <aside className={`scroll-thin hidden min-h-0 overflow-y-auto border-l border-linha p-4 lg:block`}>
            {sel ? (
              <div className="space-y-4 text-[14px]">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-linha font-bold">{sel.cliente === "Visitante da loja" ? <UserRound className="h-5 w-5" /> : iniciais(sel.cliente)}</span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{sel.cliente}</p>
                    <p className="text-[12px] text-areia">{sel.tel ?? (sel.canal === "Loja" ? "Ainda não se identificou" : sel.canal)}</p>
                  </div>
                </div>
                <div className="rounded-2xl bg-grafite p-3">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-brasa">Resumo da IA</p>
                  <p className="mt-1 leading-relaxed">{sel.resumo || "Conversa começando."}</p>
                  <p className={`mt-2 flex items-center gap-1.5 font-semibold ${HUMOR[sel.humor].cor}`}>
                    {HUMOR[sel.humor].icone} {HUMOR[sel.humor].rotulo}
                  </p>
                </div>
                {sel.bairro && (
                  <p className="flex items-center gap-2 rounded-2xl bg-grafite p-3">
                    <MapPin className="h-4 w-4 text-brasa" /> {sel.bairro}
                  </p>
                )}
                {sel.pedidoGerado && (
                  <p className="flex items-center gap-2 rounded-2xl bg-[#17351f] p-3 text-[#9be3b0]">
                    <ShoppingBag className="h-4 w-4" /> Virou o pedido #{sel.pedidoGerado}
                  </p>
                )}
                {cliente && (
                  <div className="rounded-2xl border border-linha p-3">
                    <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-areia">Já é freguês</p>
                    <dl className="mt-2 grid grid-cols-2 gap-2">
                      <div>
                        <dt className="text-[12px] text-areia">Pedidos</dt>
                        <dd className="tabular font-semibold">{cliente.pedidos}</dd>
                      </div>
                      <div>
                        <dt className="text-[12px] text-areia">Ticket</dt>
                        <dd className="tabular font-semibold">{brl(cliente.ticket)}</dd>
                      </div>
                      <div className="col-span-2">
                        <dt className="text-[12px] text-areia">Favorito</dt>
                        <dd className="font-semibold">{cliente.favorito}</dd>
                      </div>
                    </dl>
                  </div>
                )}
                {sel.humor === "negativo" && (
                  <button
                    onClick={() => crescer.enviarEquipe(sel.id, `${sel.cliente.split(" ")[0]}, peço desculpas pelo problema. Já separei um cupom de 15% para o seu próximo pedido: BRASA-DESC15. Posso refazer o que faltou agora?`)}
                    className="w-full rounded-xl bg-brasa py-2.5 text-[14px] font-semibold text-carvao hover:bg-mostarda"
                  >
                    Pedir desculpas com cupom
                  </button>
                )}
              </div>
            ) : (
              <p className="text-[14px] text-areia">Os detalhes do cliente aparecem aqui.</p>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
