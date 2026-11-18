import { useEffect, useState } from "react";
import { SLUG } from "./dados";

// Preferência guardada só neste aparelho (impressora e som são da máquina do caixa ou da cozinha).
// Telas diferentes que usam a mesma preferência ficam sincronizadas.
const chave = (c: string) => `fregues-${c}:${SLUG}`;
const ler = (c: string, inicial: boolean) => {
  try {
    const s = localStorage.getItem(chave(c));
    return s === null ? inicial : s === "1";
  } catch {
    return inicial;
  }
};

export function usePref(c: string, inicial: boolean): [boolean, (v: boolean) => void] {
  const [v, setV] = useState(() => ler(c, inicial));
  useEffect(() => {
    const on = (e: Event) => (e as CustomEvent).detail === c && setV(ler(c, inicial));
    window.addEventListener("fregues-pref", on);
    return () => window.removeEventListener("fregues-pref", on);
  }, [c, inicial]);
  return [
    v,
    (n) => {
      setV(n);
      try {
        localStorage.setItem(chave(c), n ? "1" : "0");
      } catch {
        /* sem armazenamento: vale nesta visita */
      }
      window.dispatchEvent(new CustomEvent("fregues-pref", { detail: c }));
    },
  ];
}
