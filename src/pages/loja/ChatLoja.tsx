import { useEffect, useRef, useState } from "react";
import { Bot, MessageCircle, Send, X } from "lucide-react";
import { crescer, useCrescer } from "../../data/crescer";
import { supabase, useDados } from "../../data/dados";
import { falarNaLojaReal, useChatLojaReal } from "../../data/atendimento";

const SUGESTOES = ["Qual o mais pedido?", "Entregam no meu bairro?", "Que horas fecha?", "Aceita Pix?"];

export function ChatLoja({ subir }: { subir: boolean }) {
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState("");
  const d = useDados();
  const zonas = d.zonas;
  useChatLojaReal(aberto);
  const nome = useCrescer((s) => s.ajustes.nomeAtendente);
  const conv = useCrescer((s) => s.conversas.find((c) => c.id === s.conversaLoja));
  const fim = useRef<HTMLDivElement>(null);
  const msgs = conv?.mensagens ?? [];
  const digitando = msgs.length > 0 && msgs[msgs.length - 1].de === "cliente" && conv?.status !== "equipe";

  useEffect(() => {
    fim.current?.scrollIntoView({ block: "end" });
  }, [msgs.length, aberto]);

  function enviar(t = texto) {
    if (!t.trim()) return;
    if (supabase) falarNaLojaReal(t.trim(), { zonas, cardapio: d.cardapio, loja: { nome: d.loja.nome, bairro: d.loja.bairro, horario: d.loja.horario, aberto: d.loja.aberto } });
    else crescer.falarNaLoja(t.trim(), zonas);
    setTexto("");
  }

  return (
    <>
      {!aberto && (
        <button
          onClick={() => setAberto(true)}
          className={`fixed right-4 z-30 flex items-center gap-2 rounded-full bg-brasa px-4 py-3 font-semibold text-carvao shadow-xl transition hover:bg-mostarda sm:right-[calc(50%-224px)] ${subir ? "bottom-24" : "bottom-5"}`}
        >
          <MessageCircle className="h-5 w-5" /> Dúvidas?
        </button>
      )}
      {aberto && (
        <div className="fixed inset-x-0 bottom-0 z-50 mx-auto flex h-[78vh] max-w-[480px] flex-col overflow-hidden rounded-t-3xl bg-[#fffaf2] text-carvao shadow-[0_-20px_60px_rgba(0,0,0,.25)]" role="dialog" aria-label="Conversar com a loja">
          <div className="flex items-center gap-3 bg-carvao px-4 py-3 text-papel">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-brasa text-carvao">
              <Bot className="h-5 w-5" />
            </span>
            <div className="flex-1">
              <p className="font-semibold">{nome || "Atendimento"} · {d.loja.nome}</p>
              <p className="text-[12px] text-areia">{conv?.status === "equipe" ? "Alguém da equipe vai te responder" : "Responde na hora"}</p>
            </div>
            <button onClick={() => setAberto(false)} aria-label="Fechar conversa" className="rounded-full p-2 hover:bg-grafite">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="scroll-thin flex-1 space-y-3 overflow-y-auto p-4">
            <p className="max-w-[85%] rounded-2xl rounded-tl-sm bg-[#efe3d3] px-4 py-2.5 text-[15px] leading-relaxed">
              Oi! 😊 Sou a {nome || "atendente"}, da {d.loja.nome}. Pergunta o que quiser: cardápio, taxa do seu bairro, horário, pagamento.
            </p>
            {msgs.map((m) =>
              m.de === "sistema" ? (
                <p key={m.id} className="mx-auto w-fit rounded-full bg-[#efe3d3] px-3 py-1 text-[12px] text-[#6b5a4c]">
                  {m.texto}
                </p>
              ) : (
                <p key={m.id} className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed ${m.de === "cliente" ? "ml-auto rounded-tr-sm bg-carvao text-papel" : m.de === "equipe" ? "rounded-tl-sm bg-brasa text-carvao" : "rounded-tl-sm bg-[#efe3d3]"}`}>
                  {m.texto}
                </p>
              ),
            )}
            {digitando && <p className="w-fit rounded-2xl bg-[#efe3d3] px-4 py-2.5 text-[15px] tracking-widest text-[#8f7b6c]">•••</p>}
            <div ref={fim} />
          </div>
          {msgs.length === 0 && (
            <div className="flex gap-2 overflow-x-auto px-4 pb-2">
              {SUGESTOES.map((s) => (
                <button key={s} onClick={() => enviar(s === "Entregam no meu bairro?" ? "vocês entregam na Penha?" : s)} className="shrink-0 rounded-full border border-[#e3d3bf] px-3 py-1.5 text-[13px] font-semibold">
                  {s}
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-2 border-t border-[#efe3d3] p-3">
            <input value={texto} onChange={(e) => setTexto(e.target.value)} onKeyDown={(e) => e.key === "Enter" && enviar()} placeholder="Escreva sua dúvida" aria-label="Sua mensagem" className="min-w-0 flex-1 rounded-full border border-[#e3d3bf] bg-white px-4 py-2.5 text-[15px]" />
            <button onClick={() => enviar()} aria-label="Enviar" className="grid h-11 w-11 place-items-center rounded-full bg-carvao text-papel">
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
