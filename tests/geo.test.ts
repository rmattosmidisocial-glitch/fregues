import { describe, expect, it } from "vitest";
import { idRio, municipioDoBairro, nomeBairro } from "../src/data/bairrosNomes";
import { bairroNoPonto, distanciaKm } from "../src/components/GeoMap";

describe("Bairros e distâncias", () => {
  it("índice leve de nomes bate com o mapa", () => {
    const id = idRio("Vila da Penha");
    expect(id).not.toBe("Vila da Penha");
    expect(nomeBairro(id)).toBe("Vila da Penha");
    expect(municipioDoBairro(id)).toBe("Rio de Janeiro");
  });
  it("acha o bairro de um ponto", () => {
    const b = bairroNoPonto([-43.1729, -22.9068]); // Centro do Rio
    expect(b?.properties.municipio).toBe("Rio de Janeiro");
  });
  it("distância em km", () => {
    const d = distanciaKm([-43.1729, -22.9068], [-43.1047, -22.8833]); // Centro do Rio até Niterói
    expect(d).toBeGreaterThan(6);
    expect(d).toBeLessThan(9);
  });
});
