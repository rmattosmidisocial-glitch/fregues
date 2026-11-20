import { useEffect, useState } from "react";
import { Star, X } from "lucide-react";
import { useDados } from "../../data/dados";

const ROTULO = ["", "Muito ruim", "Ruim", "Ok", "Bom", "Excelente!"];

/** Estrelas + comentário para o cliente avaliar o pedido entregue. */
export function AvaliarPedido({ id, aoAvaliar }: { id: string; aoAvaliar?: () => void }) {
  const d = useDados();
  const [jaDada, setJaDada] = useState<number | null | undefined>(undefined);
  const [nota, setNota] = useState(0);
  const [sobre, setSobre] = useState(0);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let vivo = true;
    d.acoes.avaliacaoDoPedido(id).then((n) => vivo && setJaDada(n));
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function enviar() {
    if (!nota) return;
    setEnviando(true);
    setErro("");
    const r = await d.acoes.avaliarPedido(id, nota, texto);
    setEnviando(false);
    if (r === "ok" || r === "ja_avaliado") {
      setJaDada(nota);
      aoAvaliar?.();
    } else
      setErro(
        {
          ainda_nao_entregue: "Dá para avaliar assim que o pedido for entregue.",
          prazo_encerrado: "O prazo para avaliar este pedido já passou.",
          nao_encontrado: "Não encontramos este pedido.",
        }[r] ?? "Não consegui enviar agora. Tente de novo em instantes.",
      );
  }

  if (jaDada === undefined) return null;
  if (jaDada)
    return (
      <div className="mt-5 rounded-2xl bg-[#fff4d6] p-4 text-center">
        <div className="flex justify-center gap-1" aria-label={`Sua nota: ${jaDada} de 5`}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Star key={n} className={`h-6 w-6 ${n <= jaDada ? "fill-mostarda text-mostarda" : "text-[#d9c9b6]"}`} />
          ))}
        </div>
        <p className="mt-2 font-semibold">Obrigado pela avaliação!</p>
        <p className="text-[14px] text-[#6b5a4d]">{jaDada <= 3 ? "Sentimos muito. A loja já recebeu e vai usar isso para melhorar." : "Ela ajuda a loja a crescer. Bom apetite!"}</p>
      </div>
    );

  const mostrar = sobre || nota;
  return (
    <div className="mt-5 rounded-2xl border border-[#eadccb] p-4">
      <p className="text-center font-display text-[19px] font-extrabold">Como estava o pedido?</p>
      <div className="mt-3 flex justify-center gap-1.5" role="radiogroup" aria-label="Nota de 1 a 5" onMouseLeave={() => setSobre(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} role="radio" aria-checked={nota === n} aria-label={`${n} estrela${n > 1 ? "s" : ""}`} onClick={() => setNota(n)} onMouseEnter={() => setSobre(n)} className="p-1 transition active:scale-90">
            <Star className={`h-9 w-9 ${n <= mostrar ? "fill-mostarda text-mostarda" : "text-[#d9c9b6]"}`} />
          </button>
        ))}
      </div>
      <p className="mt-1 h-5 text-center text-[14px] font-semibold text-[#6b5a4d]">{ROTULO[mostrar]}</p>
      {nota > 0 && (
        <>
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value.slice(0, 500))}
            rows={3}
            aria-label="Comentário"
            placeholder={nota <= 3 ? "O que deu errado? A loja vai ler." : "Quer contar o que mais gostou? (opcional)"}
            className="mt-3 w-full rounded-xl border border-[#eadccb] bg-white px-3 py-2.5 text-[15px] outline-none focus:border-carvao"
          />
          {erro && <p className="mt-2 text-[14px] text-[#9b2c1f]">{erro}</p>}
          <button disabled={enviando} onClick={enviar} className="mt-3 w-full rounded-full bg-carvao py-3.5 font-semibold text-papel disabled:opacity-50">
            {enviando ? "Enviando…" : "Enviar avaliação"}
          </button>
        </>
      )}
    </div>
  );
}

/** Aberta pelo link que a loja manda no WhatsApp: ?avaliar=<código do pedido>. */
export function AvaliarPeloLink({ id, fechar }: { id: string; fechar: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center" role="dialog" aria-modal="true" aria-label="Avaliar pedido">
      <div className="w-full max-w-[480px] rounded-t-3xl bg-[#fffaf2] p-5 text-carvao sm:rounded-3xl">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-[22px] font-extrabold">Sua avaliação</h2>
          <button onClick={fechar} aria-label="Fechar" className="rounded-full p-2 hover:bg-[#f3e8d8]">
            <X className="h-5 w-5" />
          </button>
        </div>
        <AvaliarPedido id={id} />
        <button onClick={fechar} className="mt-4 w-full rounded-full border border-[#eadccb] py-3 text-[14px] font-semibold">
          Ver o cardápio
        </button>
      </div>
    </div>
  );
}
