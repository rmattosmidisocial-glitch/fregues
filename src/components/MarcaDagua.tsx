// Símbolo do Freguês como marca d'água nas telas principais do sistema (painel, administração e login).
// Fica fixo no canto, atrás do conteúdo, e nunca recebe clique.

/** O símbolo (C + f + ponto) desenhado em vetor, para ficar nítido em qualquer tamanho. */
export function SimboloFregues({ className = "", cor = "currentColor" }: { className?: string; cor?: string }) {
  return (
    <svg viewBox="0 0 1024 1024" className={className} aria-hidden="true" fill="none">
      <path d="M790.4 279.6 A352 352 0 1 0 784.8 736.9" stroke={cor} strokeWidth="95" />
      <path d="M396 727 V390 C396 280 460 228 575 228 H616 V316 H575 C510 316 484 335 484 390 V727 Z" fill={cor} />
      <rect x="344" y="420" width="264" height="88" fill={cor} />
      <circle cx="840" cy="488" r="56" fill={cor} />
    </svg>
  );
}

/**
 * Marca d'água: símbolo grande saindo pelo canto inferior direito, girado, com um anel fino em volta
 * e o laranja da marca bem visível (sem atrapalhar a leitura).
 */
export function MarcaDagua({ lado = "direita" }: { lado?: "direita" | "esquerda" }) {
  const dir = lado === "direita";
  return (
    <div aria-hidden="true" className="marca-dagua pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* anel fino e pontilhado, girando bem devagar */}
      <svg viewBox="0 0 100 100" className={`marca-anel absolute bottom-[-30vmin] h-[92vmin] w-[92vmin] ${dir ? "right-[-30vmin]" : "left-[-30vmin]"}`}>
        <circle cx="50" cy="50" r="48" fill="none" stroke="#F45B26" strokeWidth="0.35" strokeDasharray="0.6 2.4" strokeLinecap="round" opacity="0.55" />
      </svg>
      {/* símbolo grande */}
      <div className={`absolute bottom-[-16vmin] h-[68vmin] w-[68vmin] ${dir ? "right-[-14vmin] -rotate-[14deg]" : "left-[-14vmin] rotate-[14deg]"}`}>
        <SimboloFregues className="h-full w-full text-[#F45B26] opacity-[0.13]" />
      </div>
      {/* eco menor do ponto, no alto */}
      <span className={`absolute top-[12vh] h-[5vmin] w-[5vmin] rounded-full bg-[#F45B26] opacity-[0.16] ${dir ? "right-[6vw]" : "left-[6vw]"}`} />
    </div>
  );
}
