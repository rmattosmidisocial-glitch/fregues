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
/** Via do caixa: pedido completo. Via da cozinha: só número, nome de quem pediu, itens e observação. */
export type ViaTipo = "caixa" | "cozinha";
export type ImpressoraCfg = {
  papel: 80 | 58;
  /** 1 = só a via do caixa; 2 = via do caixa + via da cozinha */
  vias: 1 | 2;
  letra: "normal" | "grande";
  /** o que este computador imprime: as duas vias, só a do caixa (a cozinha tem impressora própria) ou só a da cozinha */
  funcao: "tudo" | "caixa" | "cozinha";
  /** impressão automática: quando o pedido chega ou quando a loja aceita */
  quando: "aceitar" | "chegar";
  /** texto no fim da via do caixa (ex.: "Obrigado pela preferência!") */
  rodape: string;
  /** legado */
  cozinhaSemPreco?: boolean;
};
export const CFG_PADRAO: ImpressoraCfg = { papel: 80, vias: 2, letra: "normal", funcao: "tudo", quando: "aceitar", rodape: "Obrigado pela preferência!" };
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

/** Quais vias este computador imprime, pela configuração dele. */
export function viasDoComputador(cfg: ImpressoraCfg = lerImpressora()): ViaTipo[] {
  if (cfg.funcao === "cozinha") return ["cozinha"];
  if (cfg.funcao === "caixa" || cfg.vias === 1) return ["caixa"];
  return ["caixa", "cozinha"];
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

const hora = (p: Pedido) => {
  const q = p.criadoEm ? new Date(p.criadoEm) : new Date();
  return `${q.toLocaleDateString("pt-BR")} ${q.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
};
const modoTxt = (p: Pedido) => (p.modo === "Entrega" ? "ENTREGA" : p.modo.toUpperCase());

/** Via da cozinha: número e nome bem grandes para conferir, itens, observação. Sem preço, telefone ou endereço. */
function viaCozinha(p: Pedido) {
  return `<section class="via">
    <div class="c tit">COZINHA</div><div class="c peq">${hora(p)}</div><hr>
    <h1 class="c">#${p.num}</h1>
    <div class="c nome">${esc(p.cliente)}</div>
    <div class="c g">${esc(modoTxt(p))}</div><hr>
    <ul>${p.itens.map((i) => `<li class="${i.startsWith("+") ? "ad" : "g"}">${esc(i)}</li>`).join("")}</ul>
    ${p.nota ? `<hr><div class="g">OBS: ${esc(p.nota)}</div>` : ""}
    <hr><div class="c">#${p.num} · ${esc(p.cliente)}</div>
  </section>`;
}

/** Via do caixa: tudo o que precisa para cobrar e entregar. */
function viaCaixa(p: Pedido, loja: string, cfg: ImpressoraCfg) {
  return `<section class="via">
    <div class="c"><b>${esc(loja)}</b><br>${hora(p)}</div>
    <div class="c tit">CAIXA</div><hr>
    <h1 class="c">#${p.num}</h1><div class="c g">${esc(modoTxt(p))}</div><hr>
    <div><b>${esc(p.cliente)}</b>${p.tel ? `<br>${esc(p.tel)}` : ""}</div>
    ${p.modo === "Entrega" ? `<div>${esc(enderecoTxt(p))}</div>` : ""}<hr>
    <ul>${p.itens.map((i) => `<li class="${i.startsWith("+") ? "" : "g"}">${esc(i)}</li>`).join("")}</ul>
    ${p.nota ? `<hr><div class="g">OBS: ${esc(p.nota)}</div>` : ""}
    <hr><div class="g">TOTAL ${esc(brl(p.total))}</div>
    <div>${p.pago ? "PAGO" : "A RECEBER"}${p.forma ? ` · ${esc(NOME_FORMA[p.forma] ?? p.forma)}` : p.pago ? ` · ${esc(p.pag)}` : ""}</div>
    ${p.troco ? `<div class="g">TROCO PARA ${esc(brl(p.troco))} (levar ${esc(brl(Math.max(0, p.troco - p.total)))})</div>` : ""}
    ${p.motoboy ? `<div>Entregador: ${esc(p.motoboy)}</div>` : ""}
    <hr>${cfg.rodape ? `<div class="c">${esc(cfg.rodape)}</div>` : ""}<div class="c peq">Freguês</div>
  </section>`;
}

/** HTML das vias pedidas (padrão: as deste computador), no tamanho do papel configurado. */
export function htmlComanda(p: Pedido, loja: string, cfg: ImpressoraCfg = lerImpressora(), quais: ViaTipo[] = viasDoComputador(cfg)) {
  const larg = cfg.papel === 58 ? 48 : 72;
  const base = cfg.letra === "grande" ? 15 : 13;
  const vias = quais.map((v) => (v === "cozinha" ? viaCozinha(p) : viaCaixa(p, loja, cfg))).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>Pedido #${p.num}</title><style>
    @page { size: ${cfg.papel}mm auto; margin: 0 }
    body { width: ${larg}mm; margin: 0 auto; padding: 4mm 0; font: ${base}px/1.35 "Courier New", monospace; color: #000; background: #fff }
    h1 { font-size: ${base + 14}px; margin: 2px 0 } .c { text-align: center } .g { font-size: ${base + 3}px; font-weight: bold }
    .nome { font-size: ${base + 7}px; font-weight: bold; margin: 2px 0 4px } .ad { padding-left: 10px }
    .tit { font-weight: bold; margin-top: 2px; letter-spacing: 2px } .peq { font-size: ${base - 2}px }
    hr { border: 0; border-top: 1px dashed #000; margin: 6px 0 } ul { list-style: none; padding: 0; margin: 0 } li { margin: 2px 0 }
    .via + .via { page-break-before: always; break-before: page; margin-top: 10mm }
  </style></head><body>${vias}</body></html>`;
}

/** Abre a impressão. Com o Chrome no modo "impressão direta" sai sozinho na impressora padrão, sem janela. */
export function imprimirComanda(p: Pedido, loja: string, cfg: ImpressoraCfg = lerImpressora(), quais?: ViaTipo[]) {
  const html = htmlComanda(p, loja, cfg, quais ?? viasDoComputador(cfg));
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
