import { useState } from "react";
import { CalendarClock, MessageCircle, Send, Users } from "lucide-react";
import { brl, type Freguês } from "../../data/mock";
import { useDados } from "../../data/dados";

const SUGESTOES = [
  "Manda pra quem pediu X-Bacon e sumiu: batata grátis na sexta às 19h",
  "Quem faz aniversário este mês ganha um brownie",
  "Clientes de Irajá que não pedem há 30 dias",
];

type Resultado = { pedido: string; publico: number; previsao: number; versoes: string[]; quando: string };

function interpretar(t: string, FREGUESES: Freguês[]): Resultado {
  const q = t.toLowerCase();
  let base = FREGUESES;
  if (q.includes("bacon")) base = base.filter((f) => f.favorito.toLowerCase().includes("bacon"));
  if (q.includes("sumi") || q.includes("não pedem") || q.includes("30 dias")) base = base.filter((f) => f.status !== "ritmo");
  if (q.includes("irajá")) base = base.filter((f) => f.bairro === "Irajá");
  if (q.includes("aniversário")) {
    const mes = new Date().toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
    base = base.filter((f) => f.aniversario?.includes(mes));
  }
  const publico = base.length;
  const previsao = Math.round(base.reduce((s, f) => s + f.ticket, 0) * 0.32);
  const brinde = q.includes("batata") ? "uma batata rústica por nossa conta" : q.includes("brownie") ? "um brownie com sorvete de presente" : "um mimo da casa";
  return {
    pedido: t,
    publico,
    previsao,
    quando: q.includes("sexta") ? "Sexta, 19h" : "Amanhã, no horário em que cada um costuma pedir",
    versoes: [
      `Oi, {nome}! A chapa sentiu sua falta 🔥 Nesta sexta seu pedido vem com ${brinde}. É só pedir pelo link: fregues.app/brasa`,
      `{nome}, bateu a vontade? Separamos ${brinde} pra você. Vale até domingo.`,
      `Saudade de você por aqui, {nome}! Peça hoje e ganhe ${brinde}. Seu favorito já está no carrinho.`,
    ],
  };
}

export function Copiloto() {
  const FREGUESES = useDados().fregueses;
  const [texto, setTexto] = useState("");
  const [res, setRes] = useState<Resultado | null>(null);
  const [escolhida, setEscolhida] = useState(0);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState("");

  function enviar(t: string) {
    if (!t.trim()) {
      setErro("Escreva o que você quer fazer.");
      return;
    }
    setErro("");
    setRes(interpretar(t, FREGUESES));
    setEscolhida(0);
    setEnviado(false);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="scroll-thin flex-1 space-y-4 overflow-y-auto p-5">
        {!res && (
          <>
            <p className="text-[15px] leading-relaxed text-areia">Escreva como você falaria com um funcionário. O Copiloto encontra os clientes, escreve a mensagem e agenda o envio.</p>
            <div className="space-y-2">
              {SUGESTOES.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setTexto(s);
                    enviar(s);
                  }}
                  className="w-full rounded-2xl border border-linha p-3 text-left text-[14px] hover:border-areia"
                >
                  {s}
                </button>
              ))}
            </div>
          </>
        )}
        {res && (
          <>
            <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-papel p-3 text-[14px] text-carvao">{res.pedido}</div>
            <div className="grid grid-cols-2 gap-2 text-[14px]">
              <div className="rounded-2xl bg-grafite p-3">
                <Users className="h-4 w-4 text-brasa" />
                <p className="tabular mt-1 font-display text-[24px] font-extrabold">{res.publico}</p>
                <p className="text-areia">fregueses encontrados</p>
              </div>
              <div className="rounded-2xl bg-[#e4f3ea] p-3">
                <span className="text-[13px] text-[#1b6149]">Previsão de retorno</span>
                <p className="tabular mt-1 font-display text-[24px] font-extrabold text-manjericao">{brl(res.previsao)}</p>
                <p className="text-[#1e3a2c]">em até 7 dias</p>
              </div>
            </div>
            <p className="text-[14px] text-areia">Escolha a mensagem</p>
            <div className="space-y-2">
              {res.versoes.map((v, i) => (
                <button
                  key={i}
                  onClick={() => setEscolhida(i)}
                  aria-pressed={escolhida === i}
                  className={`w-full rounded-2xl p-3 text-left text-[14px] leading-relaxed ${escolhida === i ? "bg-[#e4f3ea] text-[#1e3a2c] ring-2 ring-manjericao" : "bg-grafite text-areia"}`}
                >
                  {v}
                </button>
              ))}
            </div>
            <p className="flex items-center gap-2 text-[14px] text-areia">
              <CalendarClock className="h-4 w-4" /> {res.quando}
            </p>
            {enviado ? (
              <p className="rounded-2xl bg-[#e2f2ea] p-3 text-[14px] font-semibold text-[#1b6149]">Campanha agendada para {res.publico} fregueses. O resultado aparece no Pulso.</p>
            ) : (
              <button onClick={() => setEnviado(true)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-brasa py-3 font-semibold text-carvao hover:bg-mostarda">
                <MessageCircle className="h-4 w-4" /> Agendar no WhatsApp
              </button>
            )}
          </>
        )}
      </div>
      <form
        className="border-t border-linha p-4"
        onSubmit={(e) => {
          e.preventDefault();
          enviar(texto);
        }}
      >
        <div className="flex gap-2">
          <label className="sr-only" htmlFor="copiloto-texto">
            O que você quer fazer?
          </label>
          <input
            id="copiloto-texto"
            value={texto}
            onChange={(e) => {
              setTexto(e.target.value);
              if (erro) setErro("");
            }}
            placeholder="Ex.: chama quem sumiu com um cupom"
            className="flex-1 rounded-full border border-linha bg-carvao px-4 py-3 text-[15px] placeholder:text-fumo"
          />
          <button type="submit" aria-label="Enviar para o Copiloto" className="rounded-full bg-brasa p-3 text-carvao hover:bg-mostarda">
            <Send className="h-5 w-5" />
          </button>
        </div>
        {erro && <p className="mt-2 text-[13px] text-[#9b3530]">{erro}</p>}
      </form>
    </div>
  );
}
