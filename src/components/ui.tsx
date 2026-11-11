import { useEffect, useState } from "react";
import type { Status } from "../data/mock";

export const STATUS_INFO: Record<Status, { rotulo: string; cor: string; bg: string; txt: string }> = {
  ritmo: { rotulo: "No ritmo", cor: "#22785C", bg: "bg-[#e2f2ea]", txt: "text-[#1b6149]" },
  atrasado: { rotulo: "Fora do ritmo", cor: "#A15C00", bg: "bg-[#fcefd9]", txt: "text-[#7a4600]" },
  sumindo: { rotulo: "Sumindo", cor: "#B53E38", bg: "bg-[#fbe4e0]", txt: "text-[#9b3530]" },
};

export function AnelPulso({ dias, intervalo, status, size = 40 }: { dias: number; intervalo: number; status: Status; size?: number }) {
  const r = size / 2 - 4;
  const c = 2 * Math.PI * r;
  const frac = Math.min(1, dias / (intervalo * 2.5));
  const cor = STATUS_INFO[status].cor;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-label={`${STATUS_INFO[status].rotulo}: ${dias} dias sem pedir, costuma pedir a cada ${intervalo} dias`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-linha)" strokeWidth="4" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={cor}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={`${c * frac} ${c}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fill="var(--color-papel)" fontSize={size * 0.3} fontWeight={700} fontFamily="Nunito">
        {dias}
      </text>
    </svg>
  );
}

export function StatusPill({ status, dias }: { status: Status; dias?: number }) {
  const s = STATUS_INFO[status];
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] font-semibold ${s.bg} ${s.txt}`}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.cor }} />
      {s.rotulo}
      {dias !== undefined && ` · ${dias} dias`}
    </span>
  );
}

export function Numero({ valor, prefixo = "", className = "" }: { valor: number; prefixo?: string; className?: string }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / 900);
      setV(Math.round(valor * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [valor]);
  return (
    <span className={`tabular ${className}`}>
      {prefixo}
      {v.toLocaleString("pt-BR")}
    </span>
  );
}

export function useToast() {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 2600);
    return () => clearTimeout(t);
  }, [msg]);
  const Toast = () =>
    msg ? (
      <div role="status" className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-papel px-5 py-3 text-[15px] font-semibold text-carvao shadow-2xl md:bottom-8">
        {msg}
      </div>
    ) : null;
  return { show: setMsg, Toast };
}

export function Painelzinho({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-3xl border border-linha bg-forno p-5 md:p-6 ${className}`}>{children}</section>;
}
