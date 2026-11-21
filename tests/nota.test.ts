import { describe, expect, it } from "vitest";
import { acharInsumo } from "../src/pages/painel/NotaCompra";
import type { Insumo } from "../src/data/custos";

const ins: Insumo[] = [
  { id: "a", nome: "Queijo prato", unidade: "kg", custo: 48 },
  { id: "b", nome: "Bacon", unidade: "kg", custo: 46 },
  { id: "c", nome: "Pão brioche", unidade: "un", custo: 1.6 },
  { id: "d", nome: "Queijo", unidade: "kg", custo: 40 },
];

describe("ligar item da nota ao insumo", () => {
  it("acha pelo nome, sem acento e ignorando unidade", () => {
    expect(acharInsumo({ nome: "Queijo prato", descricao: "QUEIJO PRATO FAT 1KG" }, ins)?.id).toBe("a");
    expect(acharInsumo({ nome: "Pão brioche", descricao: "PAO BRIOCHE HAMB C/12 UN" }, ins)?.id).toBe("c");
    expect(acharInsumo({ nome: "Bacon", descricao: "BACON MANTA DEFUMADO KG" }, ins)?.id).toBe("b");
  });
  it("não inventa ligação", () => {
    expect(acharInsumo({ nome: "Detergente", descricao: "DETERG LIQ 500ML" }, ins)).toBeNull();
  });
});
