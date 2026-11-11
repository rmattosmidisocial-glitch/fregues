import { useState } from "react";
import { Bike, Clock, Printer, Store, UtensilsCrossed } from "lucide-react";
import { brl, type Pedido, type StatusPedido } from "../../data/mock";
import { useDados } from "../../data/dados";
import { useToast } from "../../components/ui";

const COLUNAS: { id: StatusPedido; rotulo: string; acao?: string; prox?: StatusPedido }[] = [
  { id: "novo", rotulo: "Novos", acao: "Aceitar", prox: "preparo" },
  { id: "preparo", rotulo: "Em preparo", acao: "Marcar pronto", prox: "pronto" },
  { id: "pronto", rotulo: "Prontos", acao: "Despachar", prox: "rota" },
  { id: "rota", rotulo: "Saiu para entrega", acao: "Entregue", prox: "entregue" },
  { id: "entregue", rotulo: "Entregues" },
];

const MOTOS = ["Marquinhos", "Dudu", "Léo"];

export function Pedidos() {
  const d = useDados();
  const lista = d.pedidos;
  const [pico, setPico] = useState(false);
  const { show, Toast } = useToast();

  function avancar(p: Pedido, prox: StatusPedido) {
    d.acoes.avancarPedido(p.num, prox, prox === "rota" && !p.motoboy && p.modo === "Entrega" ? MOTOS[p.num % 3] : undefined);
    if (prox === "preparo") show(`Pedido #${p.num} aceito e enviado para a impressora da cozinha`);
    if (prox === "rota") show(p.modo === "Entrega" ? `#${p.num} saiu com ${MOTOS[p.num % 3]}. Cliente avisado no WhatsApp` : `#${p.num} liberado`);
    if (prox === "entregue") show(`#${p.num} entregue. Pesquisa de satisfação enviada`);
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[clamp(2rem,4vw,2.8rem)] font-extrabold tracking-[-0.02em]">Pedidos</h1>
          <p className="text-[15px] text-areia">Tempo médio de preparo hoje: {pico ? 32 : 22} min</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              setPico(!pico);
              show(pico ? "Modo pico desligado" : "Modo pico: +10 min em todas as previsões");
            }}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-[14px] font-semibold ${pico ? "bg-mostarda text-carvao" : "border border-linha"}`}
          >
            <Clock className="h-4 w-4" /> Modo pico {pico ? "ligado" : "desligado"}
          </button>
          <span className="flex items-center gap-2 rounded-full border border-linha px-4 py-2 text-[14px] text-areia">
            <Printer className="h-4 w-4 text-manjericao" /> 2 impressoras conectadas
          </span>
        </div>
      </div>

      <div className="scroll-thin -mx-4 mt-6 flex gap-4 overflow-x-auto px-4 pb-4 md:-mx-8 md:px-8">
        {COLUNAS.map((c) => {
          const itens = lista.filter((p) => p.status === c.id);
          return (
            <section key={c.id} className="w-[290px] shrink-0" aria-label={c.rotulo}>
              <div className="mb-3 flex items-center justify-between px-1">
                <h2 className="font-display text-[18px] font-bold">{c.rotulo}</h2>
                <span className="tabular rounded-full bg-grafite px-2.5 py-0.5 text-[13px]">{itens.length}</span>
              </div>
              <div className="space-y-3">
                {itens.map((p) => (
                  <article
                    key={p.num}
                    className={`rounded-2xl border bg-forno p-4 ${c.id === "novo" ? "border-brasa shadow-[0_0_0_4px_rgba(255,91,31,.12)]" : "border-linha"}`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-display text-[22px] font-extrabold leading-none">#{p.num}</p>
                        <p className="mt-1 font-semibold">{p.cliente}</p>
                      </div>
                      <span className={`tabular rounded-full px-2 py-0.5 text-[12px] font-semibold ${p.min > 20 && c.id !== "entregue" ? "bg-[#4a1c10] text-[#ffb4a0]" : "bg-grafite text-areia"}`}>
                        há {p.min} min
                      </span>
                    </div>
                    <p className="mt-2 flex items-center gap-1.5 text-[13px] text-areia">
                      {p.modo === "Entrega" ? <Bike className="h-4 w-4" /> : p.modo === "Retirada" || p.modo === "Balcão" ? <Store className="h-4 w-4" /> : <UtensilsCrossed className="h-4 w-4" />}
                      {p.modo === "Entrega" ? p.bairro : p.modo}
                      {p.motoboy && ` · ${p.motoboy}`}
                    </p>
                    {p.primeira && <p className="mt-2 inline-block rounded-full bg-mostarda/15 px-2 py-0.5 text-[12px] font-semibold text-mostarda">Primeira compra</p>}
                    <ul className="mt-3 space-y-0.5 text-[14px]">
                      {p.itens.map((i) => (
                        <li key={i}>{i}</li>
                      ))}
                    </ul>
                    {p.nota && <p className="mt-2 rounded-lg bg-grafite px-2.5 py-1.5 text-[13px] text-mostarda">Obs.: {p.nota}</p>}
                    <div className="mt-3 flex items-center justify-between border-t border-linha pt-3 text-[14px]">
                      <span className="tabular font-semibold">{brl(p.total)}</span>
                      <span className={p.pag === "Pix pago" || p.pag === "Cartão online" ? "text-manjericao" : p.pag === "Pix pendente" ? "text-mostarda" : "text-areia"}>{p.pag}</span>
                    </div>
                    {c.acao && c.prox && (
                      <button
                        onClick={() => avancar(p, c.prox!)}
                        className={`mt-3 w-full rounded-xl py-2.5 text-[14px] font-semibold ${c.id === "novo" ? "bg-brasa text-carvao hover:bg-mostarda" : "bg-papel text-carvao hover:bg-mostarda"}`}
                      >
                        {c.acao}
                      </button>
                    )}
                  </article>
                ))}
                {itens.length === 0 && <p className="rounded-2xl border border-dashed border-linha p-6 text-center text-[14px] text-fumo">Nenhum pedido aqui.</p>}
              </div>
            </section>
          );
        })}
      </div>
      <Toast />
    </div>
  );
}
