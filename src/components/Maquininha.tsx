// Cobrança na maquininha integrada: manda o valor para a maquininha do restaurante e acompanha até o cliente pagar.
// Usado no Caixa e no Salão. Na demonstração, o pagamento é simulado.
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, CreditCard, Loader2, XCircle } from "lucide-react";
import { brl } from "../data/mock";
import { useDados } from "../data/dados";

type Situacao = { id: string; status: "enviada" | "na_maquininha" | "aprovada" | "recusada" | "cancelada" | "expirada" | "erro"; detalhe: string | null; forma?: string | null };
export type ResultadoMaquininha = { ref: string | null; manual?: boolean };

/** A maquininha integrada está ligada e com pelo menos um aparelho? */
export function useMaquininha() {
  const d = useDados();
  const aparelhos = d.loja.maquininha_aparelhos ?? [];
  return { ativa: !!d.loja.maquininha_ativo && (aparelhos.length > 0 || d.modo === "demo"), aparelhos };
}

const PENDENTE = ["enviada", "na_maquininha"];
const TEXTO: Record<Situacao["status"], string> = {
  enviada: "Enviando para a maquininha…",
  na_maquininha: "Aguardando o cliente pagar na maquininha",
  aprovada: "Pagamento aprovado",
  recusada: "Pagamento recusado",
  cancelada: "Cobrança cancelada",
  expirada: "A cobrança expirou",
  erro: "A maquininha não recebeu a cobrança",
};

export function CobrarMaquininha({ valor, referencia, aoPagar, aoFechar }: { valor: number; referencia: string; aoPagar: (r: ResultadoMaquininha) => void; aoFechar: () => void }) {
  const d = useDados();
  const { aparelhos } = useMaquininha();
  const demo = d.modo !== "real";
  const [aparelho, setAparelho] = useState(aparelhos[0]?.id ?? "");
  const [forma, setForma] = useState<"" | "credito" | "debito">("");
  const [sit, setSit] = useState<Situacao | null>(null);
  const [erro, setErro] = useState("");
  const vivo = useRef(true);
  useEffect(() => () => void (vivo.current = false), []);

  const servidor = (op: string, corpo: Record<string, unknown> = {}) => d.acoes.servidorLoja<Situacao>("maquininha", { store_id: d.loja.id, op, ...corpo });

  // acompanha a cobrança enquanto ela está na maquininha
  useEffect(() => {
    if (!sit || !PENDENTE.includes(sit.status) || demo) return;
    const t = setTimeout(async () => {
      const r = await servidor("situacao", { id: sit.id });
      if (!vivo.current) return;
      if (r.erro) setErro(r.erro);
      else setSit(r);
    }, 2500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sit]);

  // aprovado: devolve para quem chamou
  useEffect(() => {
    if (sit?.status !== "aprovada") return;
    const t = setTimeout(() => aoPagar({ ref: sit.id }), 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sit?.status]);

  async function enviar() {
    setErro("");
    if (demo) {
      setSit({ id: "demo", status: "enviada", detalhe: null });
      setTimeout(() => vivo.current && setSit({ id: "demo", status: "na_maquininha", detalhe: null }), 700);
      setTimeout(() => vivo.current && setSit({ id: "demo", status: "aprovada", detalhe: null }), 3200);
      return;
    }
    setSit({ id: "", status: "enviada", detalhe: null });
    const r = await servidor("cobrar", { valor, referencia, aparelho, forma: forma || undefined });
    if (!vivo.current) return;
    if (r.erro) {
      setSit(null);
      setErro(r.erro);
    } else setSit(r);
  }

  async function cancelar() {
    if (!sit || demo || !sit.id) return setSit(null);
    const r = await servidor("cancelar", { id: sit.id });
    if (r.erro) setErro(r.erro);
    else setSit(r);
  }

  const pendente = !!sit && PENDENTE.includes(sit.status);
  const falhou = !!sit && ["recusada", "cancelada", "expirada", "erro"].includes(sit.status);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label="Cobrar na maquininha">
      <div className="w-full max-w-[400px] rounded-3xl border border-linha bg-forno p-5 text-papel">
        <p className="flex items-center gap-2 text-[14px] font-semibold text-areia">
          <CreditCard className="h-4 w-4" /> Cobrar na maquininha
        </p>
        <p className="tabular mt-1 font-display text-[40px] font-extrabold">{brl(valor)}</p>
        <p className="text-[13px] text-areia">{referencia}</p>

        {!sit && (
          <div className="mt-4 space-y-3">
            {aparelhos.length > 1 && (
              <label className="block text-[13px] text-areia">
                Maquininha
                <select value={aparelho} onChange={(e) => setAparelho(e.target.value)} className="mt-1 w-full rounded-xl border border-linha bg-carvao px-3 py-2.5 text-[15px] text-papel">
                  {aparelhos.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nome}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <div className="grid grid-cols-3 gap-1.5" role="group" aria-label="Tipo de cartão">
              {(
                [
                  ["", "Cliente escolhe"],
                  ["credito", "Crédito"],
                  ["debito", "Débito"],
                ] as const
              ).map(([v, r]) => (
                <button key={v} onClick={() => setForma(v)} aria-pressed={forma === v} className={`rounded-xl py-2.5 text-[13px] font-semibold ${forma === v ? "bg-papel text-carvao" : "border border-linha text-areia"}`}>
                  {r}
                </button>
              ))}
            </div>
            <button onClick={enviar} className="w-full rounded-xl bg-brasa py-3.5 text-[16px] font-bold text-carvao hover:bg-mostarda">
              Enviar para a maquininha
            </button>
          </div>
        )}

        {sit && (
          <div className="mt-4 rounded-2xl bg-grafite p-4 text-center" aria-live="polite">
            {pendente && <Loader2 className="mx-auto h-9 w-9 animate-spin text-brasa" />}
            {sit.status === "aprovada" && <CheckCircle2 className="mx-auto h-10 w-10 text-manjericao" />}
            {falhou && <XCircle className="mx-auto h-10 w-10 text-[#e8846f]" />}
            <p className="mt-2 text-[16px] font-bold">{TEXTO[sit.status]}</p>
            {sit.detalhe && <p className="mt-1 text-[14px] text-areia">{sit.detalhe}</p>}
            {pendente && sit.status === "na_maquininha" && <p className="mt-1 text-[13px] text-areia">O valor já aparece na tela da maquininha.</p>}
          </div>
        )}

        {erro && <p className="mt-3 rounded-xl bg-[#fbe4e0] p-3 text-[14px] text-[#8e2f2a]">{erro}</p>}

        <div className="mt-4 flex flex-col gap-2">
          {falhou && (
            <button onClick={() => (setSit(null), setErro(""))} className="w-full rounded-xl bg-brasa py-3 font-bold text-carvao hover:bg-mostarda">
              Tentar de novo
            </button>
          )}
          {pendente && (
            <button onClick={cancelar} className="w-full rounded-xl border border-linha py-3 font-semibold hover:border-areia">
              Cancelar cobrança
            </button>
          )}
          {!pendente && sit?.status !== "aprovada" && (
            <>
              <button
                onClick={() => {
                  if (confirm("O cliente pagou de outro jeito (outra maquininha ou digitando o valor)? A venda fica registrada como cartão.")) aoPagar({ ref: null, manual: true });
                }}
                className="text-[13px] text-areia underline-offset-4 hover:text-papel hover:underline"
              >
                Recebi de outro jeito
              </button>
              <button onClick={aoFechar} className="text-[13px] text-areia hover:text-papel">
                Voltar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
