// Identidade Freguês (brandbook v1.0): anel aberto = continuidade, ponto = a pessoa, "f" = o nome.
type CorSimbolo = "laranja" | "creme" | "cafe" | "atual";
const COR: Record<CorSimbolo, string> = { laranja: "#F45B26", creme: "#FFF6EB", cafe: "#2B211D", atual: "currentColor" };

export function Simbolo({ className = "", cor = "laranja", titulo }: { className?: string; cor?: CorSimbolo; titulo?: string }) {
  const c = COR[cor];
  return (
    <svg viewBox="0 0 48 48" className={className} role={titulo ? "img" : undefined} aria-label={titulo} aria-hidden={titulo ? undefined : true}>
      {/* anel aberto à direita */}
      <path d="M35.2 12.9 A17.5 17.5 0 1 0 35.2 35.1" fill="none" stroke={c} strokeWidth="5.6" />
      {/* "f" arredondado */}
      <path d="M19.6 34.4 V20.4 Q19.6 14.6 25.6 14.6" fill="none" stroke={c} strokeWidth="4.6" strokeLinecap="round" />
      <path d="M15.2 22.6 H25.2" fill="none" stroke={c} strokeWidth="4.2" strokeLinecap="round" />
      {/* o ponto: cada pessoa tem seu lugar */}
      <circle cx="41.6" cy="24" r="3.3" fill={c} />
    </svg>
  );
}

/** Mantido por compatibilidade: o pequeno selo "Feito com freguês". */
export function Brasinha({ className = "", cor = "laranja" }: { className?: string; cor?: CorSimbolo }) {
  return <Simbolo className={className} cor={cor} />;
}

/**
 * Logo horizontal. O símbolo é sempre laranja (ou uma cor só, na versão monocromática);
 * o nome usa a cor do texto do tema: café no claro, creme no escuro.
 */
export function Logo({ className = "", tamanho = "md", mono = false }: { className?: string; tamanho?: "sm" | "md" | "lg"; mono?: boolean }) {
  const s = { sm: ["h-6 w-6", "text-[1.2rem]"], md: ["h-8 w-8", "text-[1.6rem]"], lg: ["h-12 w-12", "text-[2.4rem]"] }[tamanho];
  return (
    <span className={`inline-flex items-center gap-2 text-papel ${className}`} aria-label="Freguês">
      <Simbolo className={s[0]} cor={mono ? "atual" : "laranja"} />
      <span aria-hidden="true" className={`font-display font-extrabold leading-none tracking-[-0.015em] ${s[1]}`}>
        freguês
      </span>
    </span>
  );
}
