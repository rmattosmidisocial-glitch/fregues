// Aviso de pedido novo em qualquer tela do painel: o sino toca a cada poucos segundos
// enquanto houver pedido esperando ser aceito, e só para quando todos forem aceitos.
import { useEffect, useRef } from "react";
import { BellRing } from "lucide-react";
import { useDados } from "../data/dados";
import { usePref } from "../data/prefs";
import { tocarSino } from "../lib/sino";
import { avisar } from "../lib/avisos";
import { brl } from "../data/mock";
import { useRota } from "../router";

const INTERVALO = 6000;

export function AlertaPedidos() {
  const d = useDados();
  const rota = useRota();
  const [som] = usePref("pedidos-som", true);
  const vistos = useRef<Set<number> | null>(null);
  const novos = d.pedidos.filter((p) => p.status === "novo" && !p.modo.startsWith("Mesa"));
  // na demonstração só toca quando chega pedido novo (os de exemplo não ficam tocando)
  const chegouAgora = useRef(false);

  // pedido que acabou de chegar: aviso do sistema (aparece mesmo com o navegador minimizado)
  useEffect(() => {
    if (d.carregando) return;
    if (vistos.current === null) {
      vistos.current = new Set(d.pedidos.map((p) => p.num));
      return;
    }
    const chegaram = novos.filter((p) => !vistos.current!.has(p.num));
    d.pedidos.forEach((p) => vistos.current!.add(p.num));
    if (!chegaram.length) return;
    chegouAgora.current = true;
    avisar(chegaram.length === 1 ? `Pedido novo #${chegaram[0].num}` : `${chegaram.length} pedidos novos`, chegaram.map((p) => `${p.cliente} · ${brl(p.total)}`).join("\n"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d.pedidos, d.carregando]);

  const tocando = som && novos.length > 0 && (d.modo === "real" || chegouAgora.current);
  useEffect(() => {
    if (!tocando) {
      chegouAgora.current = false;
      return;
    }
    tocarSino();
    const t = window.setInterval(() => tocarSino(), INTERVALO);
    return () => window.clearInterval(t);
  }, [tocando]);

  if (!novos.length || rota === "pedidos") return null;
  return (
    <a href="#pedidos" className="fixed bottom-24 right-4 z-40 flex items-center gap-3 rounded-2xl bg-brasa px-4 py-3 font-semibold text-carvao shadow-2xl md:bottom-6" role="status">
      <BellRing className={`h-5 w-5 ${tocando ? "animate-bounce" : ""}`} />
      <span>
        {novos.length === 1 ? `Pedido novo #${novos[0].num}` : `${novos.length} pedidos esperando`}
        <span className="block text-[12px] font-normal">Toque para ver e aceitar</span>
      </span>
    </a>
  );
}
