import { describe, expect, it } from "vitest";
// @ts-expect-error módulo JS do servidor
import { _teste } from "../api/_rotas/loja/maquininha.js";

const ler = _teste.ler as (o: unknown) => { status: string; detalhe: string | null; pagamento_id?: string | null; forma?: string | null };

describe("maquininha: leitura da order do Mercado Pago Point", () => {
  it("processed é pagamento aprovado, com id e tipo do cartão", () => {
    const r = ler({ status: "processed", transactions: { payments: [{ id: "PAY01", status: "processed", payment_method: { type: "debit_card" } }] } });
    expect(r.status).toBe("aprovada");
    expect(r.pagamento_id).toBe("PAY01");
    expect(r.forma).toBe("debito");
  });
  it("created e at_terminal ficam aguardando", () => {
    expect(ler({ status: "created" }).status).toBe("enviada");
    expect(ler({ status: "at_terminal" }).status).toBe("na_maquininha");
    expect(ler({ status: "action_required" }).detalhe).toMatch(/maquininha/);
  });
  it("recusas trazem o motivo em português", () => {
    const r = ler({ status: "failed", transactions: { payments: [{ status: "failed", status_detail: "insufficient_amount" }] } });
    expect(r.status).toBe("recusada");
    expect(r.detalhe).toBe("Saldo ou limite insuficiente");
  });
  it("cancelada na maquininha e expirada", () => {
    expect(ler({ status: "canceled", status_detail: "canceled_on_terminal" })).toMatchObject({ status: "cancelada", detalhe: "Cancelada na maquininha" });
    expect(ler({ status: "expired" }).status).toBe("expirada");
  });
});
