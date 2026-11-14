import { describe, expect, it } from "vitest";
import { dentroDoHorario, textoHorario, type Horarios } from "../src/lib/horario";

// datas em horário de Brasília (UTC-3). 2026-11-13 é sexta (5), 2026-11-14 é sábado (6)
const em = (iso: string) => new Date(iso + "-03:00");
const h: Horarios = { "5": [["18:00", "02:00"]], "6": [["11:00", "15:00"], ["18:00", "23:30"]] };

describe("Horário de funcionamento", () => {
  it("sem horário cadastrado fica sempre aberto", () => {
    expect(dentroDoHorario(null)).toBe(true);
    expect(dentroDoHorario({ "0": [] })).toBe(true);
  });
  it("abre e fecha na faixa do dia", () => {
    expect(dentroDoHorario(h, em("2026-11-14T12:00"))).toBe(true);
    expect(dentroDoHorario(h, em("2026-11-14T16:00"))).toBe(false);
    expect(dentroDoHorario(h, em("2026-11-14T23:29"))).toBe(true);
    expect(dentroDoHorario(h, em("2026-11-14T23:30"))).toBe(false);
  });
  it("faixa que passa da meia-noite continua aberta no dia seguinte", () => {
    expect(dentroDoHorario(h, em("2026-11-13T23:00"))).toBe(true);
    expect(dentroDoHorario(h, em("2026-11-14T01:30"))).toBe(true);
    expect(dentroDoHorario(h, em("2026-11-14T02:00"))).toBe(false);
  });
  it("texto para a loja", () => {
    expect(textoHorario(h, em("2026-11-14T12:00"))).toBe("Aberto até 15h");
    expect(textoHorario(h, em("2026-11-14T16:00"))).toBe("Abre hoje às 18h");
    expect(textoHorario(h, em("2026-11-14T23:45"))).toBe("Abre sexta às 18h");
  });
});
