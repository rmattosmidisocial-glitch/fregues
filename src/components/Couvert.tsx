import { useState } from "react";
import { Music } from "lucide-react";
import { brl } from "../data/mock";
import { SLUG } from "../data/dados";

// Couvert opcional: valor por pessoa. O último valor usado fica como atalho neste aparelho.
const CHAVE = `fregues-couvert:${SLUG}`;
const lerUltimo = () => {
  try {
    return Number(localStorage.getItem(CHAVE)) || 0;
  } catch {
    return 0;
  }
};

export function Couvert({ valor, pessoas, mudar, mudarPessoas }: { valor: number; pessoas: number; mudar: (v: number) => void; mudarPessoas?: (n: number) => void }) {
  const [ultimo, setUltimo] = useState(lerUltimo);
  const [texto, setTexto] = useState(valor ? String(valor).replace(".", ",") : "");
  const aplicar = (v: number) => {
    mudar(v);
    setTexto(v ? String(v).replace(".", ",") : "");
    if (v > 0) {
      setUltimo(v);
      try {
        localStorage.setItem(CHAVE, String(v));
      } catch {
        /* sem armazenamento */
      }
    }
  };
  return (
    <div className="rounded-xl border border-linha p-3 text-[13px]">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 font-semibold">
          <Music className="h-4 w-4 text-areia" /> Couvert
        </span>
        <button onClick={() => aplicar(0)} aria-pressed={!valor} className={`rounded-full px-3 py-1 font-semibold ${!valor ? "bg-papel text-carvao" : "border border-linha"}`}>
          Sem
        </button>
        {ultimo > 0 && (
          <button onClick={() => aplicar(ultimo)} aria-pressed={valor === ultimo} className={`rounded-full px-3 py-1 font-semibold ${valor === ultimo ? "bg-papel text-carvao" : "border border-linha"}`}>
            {brl(ultimo)}
          </button>
        )}
        <label className="flex items-center gap-1.5 text-areia">
          R$
          <input
            inputMode="decimal"
            value={texto}
            onChange={(e) => setTexto(e.target.value.replace(/[^\d,.]/g, ""))}
            onBlur={() => aplicar(Math.max(0, Number(texto.replace(",", ".")) || 0))}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            placeholder="por pessoa"
            aria-label="Couvert por pessoa"
            className="tabular w-24 rounded-lg border border-linha bg-carvao px-2 py-1 text-papel"
          />
        </label>
      </div>
      {valor > 0 && (
        <p className="mt-2 flex items-center gap-2 text-areia">
          {mudarPessoas ? (
            <>
              <span>Pessoas</span>
              <button onClick={() => mudarPessoas(Math.max(1, pessoas - 1))} className="h-7 w-7 rounded-full border border-linha font-bold" aria-label="Menos uma pessoa">
                −
              </button>
              <span className="tabular w-5 text-center font-semibold text-papel">{pessoas}</span>
              <button onClick={() => mudarPessoas(pessoas + 1)} className="h-7 w-7 rounded-full border border-linha font-bold" aria-label="Mais uma pessoa">
                +
              </button>
            </>
          ) : (
            <span>{pessoas} {pessoas === 1 ? "pessoa" : "pessoas"}</span>
          )}
          <span className="ml-auto tabular font-semibold text-papel">= {brl(valor * pessoas)}</span>
        </p>
      )}
    </div>
  );
}
