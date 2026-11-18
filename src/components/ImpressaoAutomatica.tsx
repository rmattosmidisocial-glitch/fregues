// Impressão automática deste computador, em qualquer tela do painel:
//   pedidos do site: quando chegam ou quando são aceitos (como estiver na configuração da impressora)
//   balcão: assim que a venda é registrada
//   salão: assim que o garçom (ou o cliente pelo QR Code) manda itens para a cozinha
// Funciona também quando a ação acontece em outro aparelho da loja (tempo real).
import { useEffect, useRef } from "react";
import { useDados } from "../data/dados";
import { useSalao, type ItemComanda, type StatusItem } from "../data/salao";
import type { StatusPedido } from "../data/mock";
import { imprimirComanda, imprimirCozinhaMesa, lerImpressora } from "./comanda";

export function ImpressaoAutomatica() {
  const d = useDados();
  const s = useSalao("impressao");
  const pedidosAntes = useRef<Map<number, StatusPedido> | null>(null);
  const itensAntes = useRef<Map<string, StatusItem> | null>(null);
  const feitos = useRef(new Set<string>());

  // pedidos do site e do balcão
  useEffect(() => {
    if (d.carregando) return;
    const antes = pedidosAntes.current;
    pedidosAntes.current = new Map(d.pedidos.map((p) => [p.num, p.status]));
    if (!antes) return;
    const cfg = lerImpressora();
    for (const p of d.pedidos) {
      if (p.modo.startsWith("Mesa")) continue; // conta da mesa fechada: a cozinha já recebeu pelo salão
      const prev = antes.get(p.num);
      const chegou = prev === undefined;
      const imprimir = (chegou && p.modo === "Balcão") || (chegou && p.status === "novo" && cfg.quando === "chegar") || (p.status === "preparo" && (prev === "novo" || chegou) && cfg.quando === "aceitar");
      const k = `p${p.num}`;
      if (imprimir && !feitos.current.has(k)) {
        feitos.current.add(k);
        imprimirComanda(p, d.loja.nome, cfg);
      }
    }
  }, [d.pedidos, d.loja.nome, d.carregando]);

  // salão: itens que acabaram de ir para a cozinha, um papel por mesa
  useEffect(() => {
    if (s.carregando) return;
    const antes = itensAntes.current;
    itensAntes.current = new Map(s.itens.map((i) => [i.id, i.status]));
    if (!antes) return;
    const novos = s.itens.filter((i) => i.status === "novo" && antes.get(i.id) !== "novo" && !feitos.current.has(`i${i.id}`));
    if (!novos.length) return;
    const porMesa = novos.reduce((m, i) => m.set(i.tab_id, [...(m.get(i.tab_id) ?? []), i]), new Map<string, ItemComanda[]>());
    for (const [tab, its] of porMesa) {
      its.forEach((i) => feitos.current.add(`i${i.id}`));
      const c = s.comandas.find((x) => x.id === tab);
      const m = s.mesas.find((x) => x.id === c?.table_id);
      imprimirCozinhaMesa({ mesa: m?.numero ?? "?", cliente: c?.cliente_nome, garcom: c?.garcom, qr: its.every((i) => i.origem === "cliente"), itens: its.map((i) => ({ qtd: i.qtd, nome: i.nome, obs: i.obs })) });
    }
  }, [s.itens, s.carregando, s.comandas, s.mesas]);

  return null;
}
