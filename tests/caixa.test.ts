// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { resumoDe, tirarTroco, type Sessao } from "../src/data/caixa";
import { totais, type Comanda, type ItemComanda } from "../src/data/salao";

describe("Caixa", () => {
  it("troco sai do dinheiro, não do cartão", () => {
    expect(
      tirarTroco(
        [
          { forma: "cartao", valor: 30 },
          { forma: "dinheiro", valor: 50 },
        ],
        60,
      ),
    ).toEqual([
      { forma: "cartao", valor: 30 },
      { forma: "dinheiro", valor: 30 },
    ]);
    expect(tirarTroco([{ forma: "dinheiro", valor: 20 }], 20)).toEqual([{ forma: "dinheiro", valor: 20 }]);
  });
  it("fechamento: dinheiro esperado na gaveta", () => {
    const s: Sessao = { id: "c", status: "aberto", operador: "Ana", valor_inicial: 100, aberto_em: "2026-11-14T10:00:00Z", fechado_em: null, dinheiro_contado: null, resumo: null };
    const r = resumoDe(
      s,
      [
        { quando: "2026-11-14T11:00:00Z", canal: "Balcão", total: 50, pagamentos: [{ forma: "dinheiro", valor: 50 }], descricao: "" },
        { quando: "2026-11-14T12:00:00Z", canal: "Delivery", total: 80, pagamentos: [{ forma: "pix", valor: 80 }], descricao: "" },
        { quando: "2026-11-14T09:00:00Z", canal: "Balcão", total: 999, pagamentos: [{ forma: "dinheiro", valor: 999 }], descricao: "antes de abrir" },
      ],
      [
        { id: "1", tipo: "retirada", valor: 30, motivo: null, criado_em: "" },
        { id: "2", tipo: "reforco", valor: 10, motivo: null, criado_em: "" },
      ],
    );
    expect(r.vendas).toBe(2);
    expect(r.total).toBe(130);
    expect(r.por_canal).toEqual({ Balcão: 50, Delivery: 80 });
    expect(r.dinheiro_esperado).toBe(100 + 50 + 10 - 30);
  });
});

describe("Conta da mesa", () => {
  it("serviço, couvert por pessoa e desconto; item cancelado não entra", () => {
    const c = { id: "t", taxa_servico: 10, couvert: 5, pessoas: 3, desconto: 4 } as Comanda;
    const item = (qtd: number, unit: number, status: ItemComanda["status"] = "entregue") => ({ id: String(Math.random()), tab_id: "t", product_id: null, nome: "x", qtd, unit, obs: null, status, origem: "garcom", criado_em: "" }) as ItemComanda;
    const t = totais(c, [item(2, 30), item(1, 40), item(1, 99, "cancelado"), item(1, 50, "aguardando")]);
    expect(t.sub).toBe(100);
    expect(t.servico).toBe(10);
    expect(t.couvert).toBe(15);
    expect(t.total).toBe(121);
  });
});
