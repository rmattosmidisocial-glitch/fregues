// Partes do sistema que dependem do plano da loja (Essencial, Completo, Rede).
import { Lock } from "lucide-react";
import { MODULO_INFO, useDados, type Modulo } from "../data/dados";

/** A loja tem essa parte no plano? */
export function useModulo(m: Modulo) {
  const d = useDados();
  return d.modo === "demo" || d.plano.modulos.includes(m);
}

/** Tela de "disponível no plano…" no lugar da parte bloqueada. */
export function BloqueadoNoPlano({ modulo, suporte = "21967640607" }: { modulo: Modulo; suporte?: string }) {
  const d = useDados();
  const info = MODULO_INFO[modulo];
  const msg = `Olá! Quero liberar ${info.nome} no Freguês da ${d.loja.nome}. Hoje estou no plano ${d.plano.nome ?? ""}.`;
  return (
    <div className="mx-auto mt-10 max-w-[520px] rounded-3xl border border-linha bg-forno p-8 text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-grafite">
        <Lock className="h-6 w-6 text-brasa" />
      </span>
      <h1 className="mt-4 font-display text-[26px] font-extrabold">{info.nome}</h1>
      <p className="mt-2 text-[15px] text-areia">
        Essa parte vem a partir do plano <b className="text-papel">{info.plano}</b>. Seu plano hoje é o <b className="text-papel">{d.plano.nome ?? "atual"}</b>.
      </p>
      <a href={`https://wa.me/55${suporte}?text=${encodeURIComponent(msg)}`} target="_blank" rel="noreferrer" className="mt-6 inline-block rounded-full bg-brasa px-6 py-3 font-semibold text-carvao hover:bg-mostarda">
        Quero liberar
      </a>
    </div>
  );
}
