import { brl } from "../data/mock";

export function Comanda({ className = "" }: { className?: string }) {
  const itens: [string, number][] = [
    ["2x Smash da Penha", 55.8],
    ["1x Batata rústica", 18.9],
    ["2x Refrigerante lata", 13],
  ];
  const sub = itens.reduce((s, [, v]) => s + v, 0);
  return (
    <div className={`w-[248px] rotate-[2.5deg] text-carvao drop-shadow-[0_24px_40px_rgba(0,0,0,.45)] ${className}`}>
      <div className="comanda-edge h-3 bg-papel" />
      <div className="bg-papel px-5 pb-5 pt-2 font-mono text-[12px] leading-[1.55]">
        <div className="flex items-baseline justify-between">
          <span className="font-display text-[22px] font-extrabold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
            #1047
          </span>
          <span className="text-[11px] text-fumo">20:41</span>
        </div>
        <p className="mt-1">Larissa G. — primeira compra</p>
        <p className="text-brasa-escura">Vista Alegre · zona Vizinhança</p>
        <div className="my-3 border-t border-dashed border-carvao/40" />
        {itens.map(([n, v]) => (
          <div key={n} className="flex justify-between gap-3">
            <span>{n}</span>
            <span className="tabular">{brl(v)}</span>
          </div>
        ))}
        <div className="flex justify-between gap-3">
          <span>Entrega</span>
          <span className="tabular">{brl(4.9)}</span>
        </div>
        <div className="my-3 border-t border-dashed border-carvao/40" />
        <div className="flex justify-between text-[14px] font-bold">
          <span>Total</span>
          <span className="tabular">{brl(sub + 4.9)}</span>
        </div>
        <p className="mt-2 inline-block rounded bg-manjericao/20 px-1.5 text-[#1e6b42]">Pix pago</p>
        <p className="mt-1 text-fumo">Previsão: 25–35 min</p>
      </div>
      <div className="comanda-edge h-3 rotate-180 bg-papel" />
    </div>
  );
}
