import { describe, expect, it } from "vitest";
import { custoFicha, faixaCmv, type Insumo } from "../src/data/custos";

const ins: Insumo[] = [
  { id: "carne", nome: "Carne", unidade: "kg", custo: 42 },
  { id: "pao", nome: "Pão", unidade: "un", custo: 1.6 },
  { id: "molho", nome: "Molho", unidade: "l", custo: 20 },
];

describe("ficha técnica", () => {
  it("converte gramas e ml e soma unidades", () => {
    expect(custoFicha([{ insumo_id: "carne", qtd: 150 }, { insumo_id: "pao", qtd: 1 }, { insumo_id: "molho", qtd: 30 }], ins)).toBe(8.5);
  });
  it("sem ficha devolve null e faixas do CMV", () => {
    expect(custoFicha([], ins)).toBeNull();
    expect([faixaCmv(28), faixaCmv(35), faixaCmv(45)]).toEqual(["bom", "atencao", "alto"]);
  });
});
