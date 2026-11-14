// Cor da marca da loja: garante leitura (texto escuro sobre a cor) e gera o tom escuro para detalhes.
const hexRgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const rgbHex = (c: number[]) => "#" + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
const lum = (c: number[]) => {
  const [r, g, b] = c.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const contraste = (a: string, b: string) => {
  const [x, y] = [lum(hexRgb(a)), lum(hexRgb(b))].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
const misturar = (c: number[], alvo: number, t: number) => c.map((v) => v + (alvo - v) * t);
export const corValida = (h?: string | null) => !!h && /^#[0-9a-fA-F]{6}$/.test(h);

/** Cor principal (botões com texto escuro) e cor escura (textos e detalhes), a partir da cor escolhida. */
export function coresDaMarca(h: string) {
  const base = hexRgb(h);
  let principal = base;
  for (let t = 0; t <= 1 && contraste(rgbHex(principal), "#2b211d") < 4.5; t += 0.05) principal = misturar(base, 255, t);
  let escura = base;
  for (let t = 0; t <= 1 && contraste(rgbHex(escura), "#fffaf2") < 4.5; t += 0.05) escura = misturar(base, 0, t);
  return { principal: rgbHex(principal), escura: rgbHex(escura) };
}

/** Variáveis de tema para aplicar só na loja (o painel continua com as cores do Freguês). */
export function estiloDaMarca(h?: string | null): React.CSSProperties | undefined {
  if (!corValida(h)) return undefined;
  const c = coresDaMarca(h!);
  return { ["--color-brasa" as string]: c.principal, ["--color-brasa-escura" as string]: c.escura, ["--color-mostarda" as string]: c.principal } as React.CSSProperties;
}

export const CORES_SUGERIDAS = [
  ["#f45b26", "Brasa (padrão)"],
  ["#e63946", "Vermelho"],
  ["#f2a93b", "Mostarda"],
  ["#2a9d8f", "Verde-água"],
  ["#4cb38a", "Verde"],
  ["#3a86ff", "Azul"],
  ["#8e5cf7", "Roxo"],
  ["#ff6fa8", "Rosa"],
  ["#8b5e3c", "Café"],
] as const;
