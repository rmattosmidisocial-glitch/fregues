// Horário de funcionamento da loja (hora de Brasília).
// horarios = { "0": [["18:00","23:30"]], "1": [], ... } — 0 = domingo. Fim menor que o início = passa da meia-noite.

export type Faixa = [string, string];
export type Horarios = Record<string, Faixa[]>;
export const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

/** Dia da semana (0–6) e minutos do dia agora, no horário de Brasília. */
export function agoraSP(d = new Date()) {
  const p = new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(d);
  const v = (t: string) => p.find((x) => x.type === t)?.value ?? "0";
  const dia = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(v("weekday"));
  return { dia, min: Number(v("hour")) * 60 + Number(v("minute")) };
}
const minutos = (h: string) => {
  const [a, b] = h.split(":").map(Number);
  return (a || 0) * 60 + (b || 0);
};
export const temHorario = (h?: Horarios | null) => !!h && Object.values(h).some((f) => f.length > 0);

/** A loja está dentro do horário agora? (sem horário cadastrado = sempre) */
export function dentroDoHorario(h?: Horarios | null, d = new Date()) {
  if (!temHorario(h)) return true;
  const { dia, min } = agoraSP(d);
  for (const [a, b] of h![String(dia)] ?? []) {
    const ini = minutos(a), fim = minutos(b);
    if (fim > ini ? min >= ini && min < fim : min >= ini) return true;
  }
  for (const [a, b] of h![String((dia + 6) % 7)] ?? []) {
    const ini = minutos(a), fim = minutos(b);
    if (fim <= ini && min < fim) return true; // faixa de ontem que passou da meia-noite
  }
  return false;
}

const fmt = (h: string) => h.replace(/^0/, "").replace(":00", "h").replace(":", "h");

/** Texto curto: "Hoje, 18h às 23h30" ou "Abre amanhã às 11h". */
export function textoHorario(h?: Horarios | null, d = new Date()) {
  if (!temHorario(h)) return "";
  const { dia, min } = agoraSP(d);
  const hoje = h![String(dia)] ?? [];
  if (dentroDoHorario(h, d)) {
    const f = hoje.find(([a, b]) => (minutos(b) > minutos(a) ? min >= minutos(a) && min < minutos(b) : min >= minutos(a))) ?? (h![String((dia + 6) % 7)] ?? []).find(([a, b]) => minutos(b) <= minutos(a));
    return f ? `Aberto até ${fmt(f[1])}` : "Aberto agora";
  }
  const depois = hoje.find(([a]) => minutos(a) > min);
  if (depois) return `Abre hoje às ${fmt(depois[0])}`;
  for (let i = 1; i <= 7; i++) {
    const f = (h![String((dia + i) % 7)] ?? [])[0];
    if (f) return `Abre ${i === 1 ? "amanhã" : DIAS[(dia + i) % 7].toLowerCase()} às ${fmt(f[0])}`;
  }
  return "";
}

/** Resumo por dia para mostrar na loja: "Seg a Sex: 11h–15h, 18h–23h". */
export function linhaDoDia(f: Faixa[]) {
  return f.length ? f.map(([a, b]) => `${fmt(a)}–${fmt(b)}`).join(", ") : "Fechado";
}
