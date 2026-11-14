import { brl, type Pedido } from "../data/mock";
import { SLUG } from "../data/dados";

export const NOME_FORMA: Record<string, string> = { pix: "Pix", cartao: "Cartão", dinheiro: "Dinheiro", maquininha: "Maquininha" };

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export function enderecoTxt(p: Pedido) {
  const e = p.endereco;
  if (!e) return p.bairro;
  return [[e.rua, e.numero].filter(Boolean).join(", "), e.complemento, e.bairro ?? p.bairro].filter(Boolean).join(" · ");
}

// ---------- Configuração da impressora (fica salva neste computador) ----------
export type ImpressoraCfg = {
  papel: 80 | 58;
  /** 1 = uma via; 2 = via da cozinha + via do entregador/balcão */
  vias: 1 | 2;
  letra: "normal" | "grande";
  /** via da cozinha sem preços */
  cozinhaSemPreco: boolean;
  /** texto no fim da comanda (ex.: "Obrigado pela preferência!") */
  rodape: string;
};
export const CFG_PADRAO: ImpressoraCfg = { papel: 80, vias: 1, letra: "normal", cozinhaSemPreco: false, rodape: "Obrigado pela preferência!" };
const chave = () => `fregues-impressora:${SLUG}`;
export function lerImpressora(): ImpressoraCfg {
  try {
    return { ...CFG_PADRAO, ...JSON.parse(localStorage.getItem(chave()) || "{}") };
  } catch {
    return CFG_PADRAO;
  }
}
export function salvarImpressora(c: ImpressoraCfg) {
  try {
    localStorage.setItem(chave(), JSON.stringify(c));
  } catch {
    /* sem armazenamento */
  }
}

/** Pedido de exemplo para testar a impressora. */
export const PEDIDO_TESTE: Pedido = {
  id: "teste",
  num: 123,
  cliente: "Cliente Teste",
  tel: "(21) 99999-0000",
  bairro: "Centro",
  modo: "Entrega",
  itens: ["2x X-Bacon", "+ sem cebola", "1x Batata frita grande", "2x Refrigerante lata"],
  total: 78.9,
  pag: "Pix pago",
  pago: true,
  forma: "pix",
  status: "novo",
  min: 0,
  nota: "Interfone 102. Troco não precisa.",
  endereco: { rua: "Rua Exemplo", numero: "100", complemento: "Apto 102", bairro: "Centro" },
} as unknown as Pedido;

function via(p: Pedido, loja: string, cfg: ImpressoraCfg, tipo: "unica" | "cozinha" | "entrega") {
  const quando = p.criadoEm ? new Date(p.criadoEm) : new Date();
  const semPreco = tipo === "cozinha" && cfg.cozinhaSemPreco;
  const titulo = tipo === "cozinha" ? "VIA DA COZINHA" : tipo === "entrega" ? (p.modo === "Entrega" ? "VIA DO ENTREGADOR" : "VIA DO BALCÃO") : "";
  return `<section class="via">
    <div class="c"><b>${esc(loja)}</b><br>${quando.toLocaleDateString("pt-BR")} ${quando.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</div>
    ${titulo ? `<div class="c tit">${titulo}</div>` : ""}<hr>
    <h1 class="c">#${p.num}</h1><div class="c g">${esc(p.modo === "Entrega" ? "ENTREGA" : p.modo.toUpperCase())}</div><hr>
    <div><b>${esc(p.cliente)}</b>${p.tel && tipo !== "cozinha" ? `<br>${esc(p.tel)}` : ""}</div>
    ${p.modo === "Entrega" && tipo !== "cozinha" ? `<div>${esc(enderecoTxt(p))}</div>` : ""}<hr>
    <ul>${p.itens.map((i) => `<li class="${i.startsWith("+") ? "" : "g"}">${esc(i)}</li>`).join("")}</ul>
    ${p.nota ? `<hr><div class="g">OBS: ${esc(p.nota)}</div>` : ""}
    ${semPreco ? "" : `<hr><div class="g">TOTAL ${esc(brl(p.total))}</div>
    <div>${p.pago ? "PAGO" : "A RECEBER"}${p.forma ? ` · ${esc(NOME_FORMA[p.forma] ?? p.forma)}` : p.pago ? ` · ${esc(p.pag)}` : ""}</div>`}
    ${p.troco && !semPreco ? `<div class="g">TROCO PARA ${esc(brl(p.troco))} (levar ${esc(brl(Math.max(0, p.troco - p.total)))})</div>` : ""}
    ${p.motoboy && tipo !== "cozinha" ? `<div>Entregador: ${esc(p.motoboy)}</div>` : ""}
    <hr>${cfg.rodape && tipo !== "cozinha" ? `<div class="c">${esc(cfg.rodape)}</div>` : ""}<div class="c peq">Freguês</div>
  </section>`;
}

/** HTML da comanda (uma ou duas vias), no tamanho do papel configurado. */
export function htmlComanda(p: Pedido, loja: string, cfg: ImpressoraCfg = lerImpressora()) {
  const larg = cfg.papel === 58 ? 48 : 72;
  const base = cfg.letra === "grande" ? 15 : 13;
  const vias = cfg.vias === 2 ? via(p, loja, cfg, "cozinha") + via(p, loja, cfg, "entrega") : via(p, loja, cfg, "unica");
  return `<!doctype html><html><head><meta charset="utf-8"><title>Pedido #${p.num}</title><style>
    @page { size: ${cfg.papel}mm auto; margin: 0 }
    body { width: ${larg}mm; margin: 0 auto; padding: 4mm 0; font: ${base}px/1.35 "Courier New", monospace; color: #000; background: #fff }
    h1 { font-size: ${base + 9}px; margin: 0 } .c { text-align: center } .g { font-size: ${base + 3}px; font-weight: bold }
    .tit { font-weight: bold; margin-top: 4px; letter-spacing: 1px } .peq { font-size: ${base - 2}px }
    hr { border: 0; border-top: 1px dashed #000; margin: 6px 0 } ul { list-style: none; padding: 0; margin: 0 } li { margin: 2px 0 }
    .via + .via { page-break-before: always; break-before: page; margin-top: 10mm }
  </style></head><body>${vias}</body></html>`;
}

/** Abre a impressão. Com o Chrome no modo "impressão direta" sai sozinho na impressora padrão, sem janela. */
export function imprimirComanda(p: Pedido, loja: string, cfg: ImpressoraCfg = lerImpressora()) {
  const f = document.createElement("iframe");
  f.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  document.body.appendChild(f);
  const d = f.contentWindow!.document;
  d.open();
  d.write(htmlComanda(p, loja, cfg));
  d.close();
  setTimeout(() => {
    f.contentWindow!.focus();
    f.contentWindow!.print();
    setTimeout(() => f.remove(), 1500);
  }, 150);
}
