import { describe, expect, it } from "vitest";
import { cardapioDoHorario } from "../src/lib/horario";

// horas de Brasília (UTC-3) convertidas para UTC no Date
const sp = (h: number, m = 0) => new Date(Date.UTC(2026, 10, 20, h + 3, m));

describe("troca automática do cardápio", () => {
  it("dia das 6h às 18h, noite das 18h às 6h", () => {
    expect(cardapioDoHorario(["06:00", "18:00"], sp(5, 59))).toBe(2);
    expect(cardapioDoHorario(["06:00", "18:00"], sp(6))).toBe(1);
    expect(cardapioDoHorario(["06:00", "18:00"], sp(17, 59))).toBe(1);
    expect(cardapioDoHorario(["06:00", "18:00"], sp(18))).toBe(2);
    expect(cardapioDoHorario(["06:00", "18:00"], sp(23, 30))).toBe(2);
  });
  it("cardápio 1 que passa da meia-noite", () => {
    expect(cardapioDoHorario(["20:00", "04:00"], sp(22))).toBe(1);
    expect(cardapioDoHorario(["20:00", "04:00"], sp(2))).toBe(1);
    expect(cardapioDoHorario(["20:00", "04:00"], sp(12))).toBe(2);
  });
});
