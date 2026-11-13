// Fotos de comida: Unsplash (licença Unsplash, uso livre).
const arquivos = import.meta.glob("../assets/fotos/*.webp", { eager: true, import: "default" }) as Record<string, string>;
export const FOTOS: Record<string, string> = Object.fromEntries(Object.entries(arquivos).map(([k, v]) => [k.split("/").pop()!.replace(".webp", ""), v]));

const POR_NOME: Record<string, string> = {
  "Smash da Penha": "smash",
  "Smash Bacon": "smashbacon",
  "Triplo Brasa": "triplo",
  "X-Bacon Duplo": "xbacon",
  "Brasa Clássico": "classico",
  "Frango Crocante": "frango",
  "Vila Verde": "veg",
  "Combo Smash": "combo",
  "Combo Casal": "casal",
  "Batata rústica": "batata",
  "Batata cheddar e bacon": "cheddar",
  "Onion rings": "onion",
  "Refrigerante lata": "refri",
  "Suco de maracujá": "suco",
  "Milk-shake de Ovomaltine": "shake",
  "Brownie com sorvete": "brownie",
};
const POR_ARTE: Record<string, string> = {
  smash: "smash",
  duplo: "xbacon",
  frango: "frango",
  veg: "veg",
  batata: "batata",
  onion: "onion",
  refri: "refri",
  suco: "suco",
  shake: "shake",
  brownie: "brownie",
  combo: "combo",
  pizza: "pizza",
  sushi: "sushi",
};

export function fotoDe(nome?: string, arte?: string) {
  const k = (nome && POR_NOME[nome]) || (arte && POR_ARTE[arte]) || "smash";
  return FOTOS[k] ?? FOTOS.smash;
}

export function Foto({
  nome,
  arte,
  url,
  chave,
  className = "",
  alt,
  eager,
}: {
  nome?: string;
  arte?: string;
  /** Foto real do produto (enviada pelo dono). */
  url?: string;
  chave?: string;
  className?: string;
  alt?: string;
  eager?: boolean;
}) {
  if (!url && !chave && arte === "sem") {
    // Produto cadastrado sem foto: quadro neutro com a inicial, nunca uma foto de outro prato.
    return (
      <div role="img" aria-label={alt ?? nome ?? ""} style={{ containerType: "size" }} className={`flex items-center justify-center bg-gradient-to-br from-[#f3e2cf] to-[#e6c9a8] font-display font-extrabold text-[#8a5a3c] ${className}`}>
        <span className="leading-none" style={{ fontSize: "45cqmin" }}>{(nome ?? "?").trim().charAt(0).toUpperCase()}</span>
      </div>
    );
  }
  const src = url ?? (chave ? FOTOS[chave] : fotoDe(nome, arte));
  return <img src={src} alt={alt ?? nome ?? ""} loading="eager" decoding="async" className={`object-cover ${className}`} />;
}
