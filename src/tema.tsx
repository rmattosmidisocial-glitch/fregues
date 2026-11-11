// Modo claro ou noturno. A escolha fica salva neste aparelho; sem escolha, segue o celular ou computador.
import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

type Modo = "claro" | "noturno";
const CHAVE = "fregues-tema";
const ouvintes = new Set<() => void>();

function lerSalvo(): Modo | null {
  try {
    const v = localStorage.getItem(CHAVE);
    return v === "claro" || v === "noturno" ? v : null;
  } catch {
    return null;
  }
}
const doSistema = (): Modo => (typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "noturno" : "claro");

let atual: Modo = lerSalvo() ?? doSistema();
function aplicar() {
  document.documentElement.classList.toggle("noturno", atual === "noturno");
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", atual === "noturno" ? "#1D1613" : "#2B211D");
}
aplicar();
window.matchMedia?.("(prefers-color-scheme: dark)").addEventListener?.("change", () => {
  if (lerSalvo()) return;
  atual = doSistema();
  aplicar();
  ouvintes.forEach((o) => o());
});

export function definirTema(m: Modo) {
  atual = m;
  try {
    localStorage.setItem(CHAVE, m);
  } catch {
    /* sem armazenamento: vale só nesta visita */
  }
  aplicar();
  ouvintes.forEach((o) => o());
}

export function useTema() {
  return useSyncExternalStore(
    (o) => {
      ouvintes.add(o);
      return () => ouvintes.delete(o);
    },
    () => atual,
  );
}

/** Botão de sol e lua. `rotulo` mostra o texto ao lado (menu lateral). */
export function BotaoTema({ rotulo = false, className = "" }: { rotulo?: boolean; className?: string }) {
  const t = useTema();
  const prox = t === "noturno" ? "claro" : "noturno";
  return (
    <button
      onClick={() => definirTema(prox)}
      aria-label={t === "noturno" ? "Usar modo claro" : "Usar modo noturno"}
      title={t === "noturno" ? "Modo claro" : "Modo noturno"}
      className={`flex items-center gap-3 rounded-xl transition ${rotulo ? "w-full px-3 py-2.5 text-[14px] text-areia hover:text-papel" : "grid h-10 w-10 place-items-center rounded-full border border-linha hover:border-areia"} ${className}`}
    >
      {t === "noturno" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      {rotulo && (t === "noturno" ? "Modo claro" : "Modo noturno")}
    </button>
  );
}
