import { brl, type Pedido } from "../data/mock";

export const NOME_FORMA: Record<string, string> = { pix: "Pix", cartao: "Cartão", dinheiro: "Dinheiro", maquininha: "Maquininha" };

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export function enderecoTxt(p: Pedido) {
  const e = p.endereco;
  if (!e) return p.bairro;
  return [[e.rua, e.numero].filter(Boolean).join(", "), e.complemento, e.bairro ?? p.bairro].filter(Boolean).join(" · ");
}

// Comanda de 80 mm: abre a janela de impressão do navegador (a impressora térmica instalada no computador aparece ali)
export function imprimirComanda(p: Pedido, loja: string) {
  const quando = p.criadoEm ? new Date(p.criadoEm) : new Date();
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Pedido #${p.num}</title><style>
    @page { size: 80mm auto; margin: 0 }
    body { width: 72mm; margin: 0 auto; padding: 4mm 0; font: 13px/1.35 "Courier New", monospace; color: #000 }
    h1 { font-size: 22px; margin: 0 } .c { text-align: center } .g { font-size: 16px; font-weight: bold }
    hr { border: 0; border-top: 1px dashed #000; margin: 6px 0 } ul { list-style: none; padding: 0; margin: 0 } li { margin: 2px 0 }
  </style></head><body>
    <div class="c"><b>${esc(loja)}</b><br>${quando.toLocaleDateString("pt-BR")} ${quando.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</div><hr>
    <h1 class="c">#${p.num}</h1><div class="c g">${esc(p.modo === "Entrega" ? "ENTREGA" : p.modo.toUpperCase())}</div><hr>
    <div><b>${esc(p.cliente)}</b>${p.tel ? `<br>${esc(p.tel)}` : ""}</div>
    ${p.modo === "Entrega" ? `<div>${esc(enderecoTxt(p))}</div>` : ""}<hr>
    <ul>${p.itens.map((i) => `<li class="${i.startsWith("+") ? "" : "g"}">${esc(i)}</li>`).join("")}</ul>
    ${p.nota ? `<hr><div class="g">OBS: ${esc(p.nota)}</div>` : ""}<hr>
    <div class="g">TOTAL ${esc(brl(p.total))}</div>
    <div>${p.pago ? "PAGO" : "A RECEBER"}${p.forma ? ` · ${esc(NOME_FORMA[p.forma])}` : p.pago ? ` · ${esc(p.pag)}` : ""}</div>
    ${p.motoboy ? `<div>Entregador: ${esc(p.motoboy)}</div>` : ""}<hr><div class="c">Freguês</div>
  </body></html>`;
  const f = document.createElement("iframe");
  f.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  document.body.appendChild(f);
  const d = f.contentWindow!.document;
  d.open();
  d.write(html);
  d.close();
  setTimeout(() => {
    f.contentWindow!.focus();
    f.contentWindow!.print();
    setTimeout(() => f.remove(), 1500);
  }, 150);
}

