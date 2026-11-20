import { useMemo, useState } from "react";
import { ChevronDown, LifeBuoy, MessageCircle, Search, X } from "lucide-react";
import { useDados } from "../../data/dados";
import { STATUS_CHAMADO, useChamados, useContatoSuporte } from "../../data/suporte";

// Respostas curtas para as dúvidas mais comuns dos restaurantes.
const DUVIDAS: { tema: string; q: string; r: string }[] = [
  { tema: "Impressora", q: "Como ligo a impressora?", r: 'Em Configurações → Impressora: escolha o papel (80 ou 58 mm), onde fica o computador (caixa ou cozinha) e ligue a impressão automática. Na aba "Como instalar" tem o passo a passo do Windows e o atalho para imprimir sem abrir janela.' },
  { tema: "Impressora", q: "A cozinha não tem tela. Como ela recebe o pedido?", r: 'Ligue a impressão automática no caixa marcando "Caixa (uma impressora só)": sai a via do caixa e a da cozinha. Se a cozinha tiver impressora ligada a um computador, marque esse computador como "Cozinha" que ele imprime sozinho.' },
  { tema: "Pedidos", q: "O som de pedido novo não toca", r: 'Em Pedidos, deixe o botão "Som ligado" e mantenha a aba aberta. Na primeira vez, clique em qualquer lugar da tela: o navegador só libera o som depois de um clique.' },
  { tema: "Pagamento", q: "Como recebo o Pix?", r: "Em Configurações → Pagamentos, cadastre a sua chave Pix. Com o Pagamento online ligado, o pedido se confirma sozinho quando o cliente paga." },
  { tema: "Pagamento", q: "O cliente pagou na entrega. Como marco como pago?", r: 'Em Pedidos, abra "Detalhes" no cartão do pedido e toque na forma que ele pagou (Pix, Cartão, Dinheiro). O valor entra no caixa.' },
  { tema: "Cardápio", q: "Como uso um cardápio de dia e outro de noite?", r: 'Em Cardápio, toque em "Usar dois cardápios". Monte cada um em "Editando" e escolha qual fica no ar em "Ligar este". Bebidas podem ficar nos dois (botão Categorias).' },
  { tema: "Cardápio", q: "Como marco um produto como esgotado?", r: 'Em Cardápio, desligue a chave "À venda" do produto. Ele some da loja na hora e volta quando você ligar de novo.' },
  { tema: "Equipe", q: "Como cadastro garçom, caixa e cozinha?", r: "Em Configurações → Equipe (só o dono vê): coloque o e-mail, escolha a função e mande a senha provisória para a pessoa. O nome do garçom na mesa vem de Salão → QR e garçons." },
  { tema: "Salão", q: "Como o cliente pede pela mesa?", r: 'Em Salão → QR e garçons, imprima o QR Code de cada mesa. O cliente aponta a câmera, vê o cardápio e pede. Se "O garçom confirma antes" estiver ligado, o pedido espera um ok da equipe.' },
  { tema: "Entrega", q: "Como mudo os bairros e a taxa de entrega?", r: "Em Território: escolha os bairros no mapa, a taxa, o tempo e o pedido mínimo de cada zona." },
  { tema: "Loja", q: "Como pauso a loja por alguns minutos?", r: 'No menu da esquerda, use a chave "Loja aberta". Para ficar fechado só um tempo, use a pausa rápida em Configurações → Horários.' },
  { tema: "Conta", q: "Esqueci a senha", r: 'Na tela de login, toque em "Esqueci a senha" e digite o e-mail. Chega um link para criar a senha nova (confira o Spam).' },
];
const ASSUNTOS = ["Dúvida de uso", "Algo não está funcionando", "Impressora", "Pagamento e Pix", "Cardápio", "Plano e cobrança", "Sugestão"];

export function Ajuda({ fechar, tela }: { fechar: () => void; tela: string }) {
  const d = useDados();
  const contato = useContatoSuporte();
  const ch = useChamados(d.modo === "real" ? d.loja.id : undefined);
  const [aba, setAba] = useState<"duvidas" | "falar" | "chamados">("duvidas");
  const [busca, setBusca] = useState("");
  const [aberta, setAberta] = useState<number | null>(null);
  const [assunto, setAssunto] = useState(ASSUNTOS[0]);
  const [msg, setMsg] = useState("");
  const [aviso, setAviso] = useState<{ ok: boolean; t: string } | null>(null);
  const [enviando, setEnviando] = useState(false);
  const q = busca.trim().toLowerCase();
  const lista = useMemo(() => DUVIDAS.filter((x) => !q || (x.q + x.r + x.tema).toLowerCase().includes(q)), [q]);
  const abertos = ch.lista.filter((c) => c.status !== "resolvido").length;
  const zap = (texto: string) => `https://wa.me/55${contato.whatsapp}?text=${encodeURIComponent(texto)}`;
  const contexto = `Loja: ${d.loja.nome || "—"}${d.plano?.nome ? ` · Plano ${d.plano.nome}` : ""} · Tela: ${tela}`;
  const opcao = (ativo: boolean) => `rounded-full px-3.5 py-1.5 text-[14px] font-semibold ${ativo ? "bg-papel text-carvao" : "border border-linha text-areia hover:text-papel"}`;

  async function enviar(eZap: boolean) {
    setAviso(null);
    setEnviando(true);
    const r = await ch.abrir(assunto, msg, tela, d.sessao?.user.email);
    setEnviando(false);
    if (r) return setAviso({ ok: false, t: r });
    if (eZap) window.open(zap(`Olá! Preciso de ajuda com o Freguês.\n${contexto}\nAssunto: ${assunto}\n\n${msg.trim()}`), "_blank");
    setMsg("");
    setAviso({ ok: true, t: 'Chamado registrado. Você acompanha a resposta em "Meus chamados".' });
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={fechar}>
      <div role="dialog" aria-label="Ajuda" className="scroll-thin flex max-h-[92vh] w-full max-w-[680px] flex-col overflow-hidden rounded-3xl border border-linha bg-forno" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 border-b border-linha px-6 py-5">
          <div>
            <h2 className="flex items-center gap-2 font-display text-[24px] font-extrabold">
              <LifeBuoy className="h-6 w-6 text-brasa" /> Ajuda
            </h2>
            <p className="mt-1 text-[14px] text-areia">Suporte: {contato.horario}.</p>
          </div>
          <button onClick={fechar} aria-label="Fechar" className="rounded-full p-2 hover:bg-grafite">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5 px-6 pt-4" role="tablist">
          <button role="tab" aria-selected={aba === "duvidas"} onClick={() => setAba("duvidas")} className={opcao(aba === "duvidas")}>
            Dúvidas frequentes
          </button>
          <button role="tab" aria-selected={aba === "falar"} onClick={() => setAba("falar")} className={opcao(aba === "falar")}>
            Falar com o suporte
          </button>
          <button role="tab" aria-selected={aba === "chamados"} onClick={() => setAba("chamados")} className={opcao(aba === "chamados")}>
            Meus chamados{abertos ? ` (${abertos})` : ""}
          </button>
        </div>
        <div className="scroll-thin flex-1 overflow-y-auto px-6 py-4">
          {aba === "duvidas" && (
            <div>
              <label className="flex items-center gap-2 rounded-full border border-linha bg-carvao px-4 py-2.5">
                <Search className="h-4 w-4 text-areia" />
                <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Procure: impressora, Pix, cardápio…" aria-label="Procurar dúvida" className="w-full bg-transparent text-[15px] outline-none" />
              </label>
              <div className="mt-3 divide-y divide-linha rounded-2xl border border-linha">
                {lista.map((x, i) => (
                  <div key={x.q}>
                    <button onClick={() => setAberta(aberta === i ? null : i)} aria-expanded={aberta === i} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
                      <span>
                        <span className="block text-[12px] font-semibold uppercase tracking-wide text-brasa">{x.tema}</span>
                        <span className="font-semibold">{x.q}</span>
                      </span>
                      <ChevronDown className={`h-5 w-5 shrink-0 transition ${aberta === i ? "rotate-180" : ""}`} />
                    </button>
                    {aberta === i && <p className="px-4 pb-4 text-[14px] leading-relaxed text-areia">{x.r}</p>}
                  </div>
                ))}
                {lista.length === 0 && <p className="p-4 text-[14px] text-areia">Nada encontrado. Fale com o suporte na aba ao lado.</p>}
              </div>
            </div>
          )}

          {aba === "falar" && (
            <div className="space-y-3">
              <label className="block text-[14px] font-semibold">
                Assunto
                <select value={assunto} onChange={(e) => setAssunto(e.target.value)} className="mt-1 w-full rounded-xl border border-linha bg-carvao px-3 py-2.5 text-[15px]">
                  {ASSUNTOS.map((a) => (
                    <option key={a}>{a}</option>
                  ))}
                </select>
              </label>
              <label className="block text-[14px] font-semibold">
                O que aconteceu?
                <textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={5} maxLength={2000} placeholder="Ex.: o pedido #1050 não imprimiu na cozinha." className="mt-1 w-full rounded-xl border border-linha bg-carvao px-3 py-2.5 text-[15px]" />
              </label>
              <p className="text-[12px] text-areia">Vai junto: {contexto}.</p>
              {aviso && <p className={`rounded-xl px-3 py-2 text-[14px] font-semibold ${aviso.ok ? "bg-[#e4f3ea] text-[#1b6149]" : "bg-[#fde7e4] text-[#9b2c1f]"}`}>{aviso.t}</p>}
              <div className="grid gap-2 sm:grid-cols-2">
                <button disabled={enviando || msg.trim().length < 3} onClick={() => enviar(true)} className="flex items-center justify-center gap-2 rounded-xl bg-[#25d366] py-3 font-bold text-[#0b2e17] disabled:opacity-50">
                  <MessageCircle className="h-5 w-5" /> Enviar e abrir WhatsApp
                </button>
                <button disabled={enviando || msg.trim().length < 3} onClick={() => enviar(false)} className="rounded-xl border border-linha py-3 font-semibold hover:border-areia disabled:opacity-50">
                  Só registrar o chamado
                </button>
              </div>
            </div>
          )}

          {aba === "chamados" && (
            <ul className="space-y-2">
              {ch.lista.map((c) => (
                <li key={c.id} className="rounded-2xl bg-grafite p-4 text-[14px]">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">{c.assunto}</p>
                    <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${STATUS_CHAMADO[c.status].cls}`}>{STATUS_CHAMADO[c.status].rotulo}</span>
                  </div>
                  <p className="mt-1 text-areia">{c.mensagem}</p>
                  {c.resposta && (
                    <p className="mt-2 rounded-xl bg-carvao p-3">
                      <b>Resposta do suporte:</b> {c.resposta}
                    </p>
                  )}
                  <p className="mt-2 text-[12px] text-fumo">{new Date(c.criado_em).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</p>
                </li>
              ))}
              {ch.lista.length === 0 && <p className="text-[14px] text-areia">Nenhum chamado ainda.</p>}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
