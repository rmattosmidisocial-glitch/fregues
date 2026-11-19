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
  linhas: [
    { qtd: 2, nome: "X-Bacon", valor: 51.8, escolhas: ["Sem cebola"] },
    { qtd: 1, nome: "Batata frita grande", valor: 14 },
    { qtd: 2, nome: "Refrigerante lata", valor: 13 },
  ],
  subtotal: 78.8,
  taxaEntrega: 5,
  desconto: 4.9,
  previsao: new Date(Date.now() + 40 * 60000).toISOString(),
} as unknown as Pedido;

// ---------- Layout da nota (modelo: cabeçalho, dados do cliente, itens em tabela, totais, cobrar, pagamento) ----------
const dataHora = (iso?: string) => {
  const q = iso ? new Date(iso) : new Date();
  return `${q.toLocaleDateString("pt-BR")} ${q.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
};
const soHora = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
const tipoTxt = (p: Pedido) => (p.modo === "Entrega" ? "Entrega" : p.modo === "Retirada" ? "Retirada" : p.modo === "Balcão" ? "Balcão" : p.modo);
const lin = (k: string, v: string) => `<div>${esc(k)}: ${esc(v)}</div>`;
const par = (k: string, v: string, cls = "") => `<div class="par ${cls}"><span>${esc(k)}</span><span>${esc(v)}</span></div>`;
const sep = `<hr>`;

type LinhaNota = { qtd: string; nome: string; valor?: string; obs?: string | null; sub?: boolean };
/** Itens com valor quando o pedido tem; senão lê as linhas de texto ("2x Nome", "+ adicional"). */
function linhasNota(p: Pedido, comValor: boolean): LinhaNota[] {
  if (p.linhas?.length) return p.linhas.flatMap((l) => [{ qtd: String(l.qtd), nome: l.nome.toUpperCase(), valor: comValor ? brl(l.valor) : undefined, obs: l.obs }, ...(l.escolhas ?? []).map((e) => ({ qtd: "--", nome: e.toUpperCase(), valor: comValor ? brl(0) : undefined, sub: true }))]);
  return p.itens.map((t) => {
    if (t.startsWith("+")) return { qtd: "--", nome: t.replace(/^\+\s*/, "").toUpperCase(), sub: true };
    const m = t.match(/^(\d+)x\s+(.*)$/);
    return m ? { qtd: m[1], nome: m[2].toUpperCase() } : { qtd: "", nome: t.toUpperCase() };
  });
}
function tabelaItens(ls: LinhaNota[], comValor: boolean) {
  return `<table class="itens"><tr class="cab"><td class="q">Qtd</td><td>Item</td>${comValor ? `<td class="v">Valor</td>` : ""}</tr>
    ${ls.map((l) => `<tr class="${l.sub ? "sub" : "it"}"><td class="q">${esc(l.qtd)}</td><td>${esc(l.nome)}${l.obs ? `<div class="obs">OBS: ${esc(l.obs)}</div>` : ""}</td>${comValor ? `<td class="v">${esc(l.valor ?? "")}</td>` : ""}</tr>`).join("")}</table>`;
}

/** Via da cozinha: mesmo padrão da nota, só com o que a cozinha precisa (número, nome, tipo, hora, itens e observações). */
function viaCozinha(p: Pedido) {
  return `<section class="via">
    <div class="titulo">COZINHA</div>
    ${lin("Pedido", `#${p.num}`)}${lin("Data", dataHora(p.criadoEm))}${lin("Tipo", tipoTxt(p))}${p.previsao ? lin(p.modo === "Entrega" ? "Sair até" : "Pronto até", soHora(p.previsao)) : ""}
    ${sep}<div class="sec">Cliente</div><div class="grande">${esc(p.cliente)}</div>
    ${sep}<div class="sec">Itens do pedido</div>${tabelaItens(linhasNota(p, false), false)}
    ${p.nota ? `${sep}<div class="sec">Observação</div><div class="forte">${esc(p.nota)}</div>` : ""}
    ${sep}<div class="c forte">#${p.num} · ${esc(p.cliente)}</div>
  </section>`;
}

/** Via do caixa: a nota completa para cobrar e entregar. */
function viaCaixa(p: Pedido, loja: string, cfg: ImpressoraCfg) {
  const e = p.endereco;
  const ls = linhasNota(p, true);
  const subtotal = p.subtotal ?? p.linhas?.reduce((s, l) => s + l.valor, 0);
  const troco = p.troco ? `Para ${brl(p.troco)} (levar ${brl(Math.max(0, p.troco - p.total))})` : p.forma === "dinheiro" && !p.pago ? "Não informado" : "";
  return `<section class="via">
    <div class="titulo">${esc(loja)}</div>
    ${lin("Pedido", `#${p.num}`)}${lin("Data", dataHora(p.criadoEm))}${lin("Tipo", tipoTxt(p))}${p.previsao ? lin(p.modo === "Entrega" ? "Hora prevista de entrega" : "Hora prevista de retirada", soHora(p.previsao)) : ""}
    ${sep}<div class="sec">Dados do Cliente</div>
    ${lin("Nome", p.cliente)}${lin("Celular", p.tel || "Não informado")}
    ${p.modo === "Entrega" ? lin("Endereço", [[e?.rua, e?.numero].filter(Boolean).join(", "), e?.bairro ?? p.bairro].filter(Boolean).join(", ") || p.bairro) + (e?.complemento ? lin("Complemento", e.complemento) : "") : ""}
    ${p.motoboy ? lin("Entregador", p.motoboy) : ""}
    ${sep}<div class="sec">Itens do pedido</div>${tabelaItens(ls, true)}
    ${p.nota ? `<div class="obs">OBS: ${esc(p.nota)}</div>` : ""}
    ${sep}${subtotal != null ? par("Subtotal", brl(subtotal)) : ""}${p.modo === "Entrega" ? par("Taxa de entrega", brl(p.taxaEntrega ?? 0)) : ""}${p.taxaEmbalagem ? par("Embalagem", brl(p.taxaEmbalagem)) : ""}${p.servico ? par("Serviço", brl(p.servico)) : ""}${p.couvert ? par("Couvert", brl(p.couvert)) : ""}${p.desconto != null ? par("Desconto", brl(p.desconto)) : ""}${troco ? par("Troco", troco) : ""}
    ${sep}${par(p.pago ? "Total (já pago)" : "Cobrar do Cliente", brl(p.total), "total")}
    ${sep}<div>Formas de pagamento</div><div class="forte">${esc((NOME_FORMA[p.forma ?? ""] ?? p.pag).toUpperCase())}${p.pago ? " · PAGO" : ""}</div>
    ${cfg.rodape ? `${sep}<div class="c">${esc(cfg.rodape)}</div>` : ""}<div class="c peq">Freguês · usefregues.com.br</div>
  </section>`;
}

function estilo(cfg: ImpressoraCfg) {
  const larg = cfg.papel === 58 ? 48 : 72;
  const base = cfg.letra === "grande" ? 14 : 12;
  return `<style>
    @page { size: ${cfg.papel}mm auto; margin: 0 }
    body { width: ${larg}mm; margin: 0 auto; padding: 4mm 0; font: ${base}px/1.4 "Courier New", monospace; color: #000; background: #fff }
    .titulo { text-align: center; font-weight: bold; font-size: ${base + 8}px; margin: 0 0 8px; text-transform: none }
    .sec { font-weight: bold; font-size: ${base + 4}px; margin-bottom: 4px }
    .grande { font-weight: bold; font-size: ${base + 8}px } .forte { font-weight: bold; font-size: ${base + 2}px }
    .c { text-align: center } .peq { font-size: ${base - 2}px; margin-top: 4px }
    .par { display: flex; justify-content: space-between; gap: 8px } .par span:last-child { text-align: right }
    .total { font-weight: bold; font-size: ${base + 6}px }
    table.itens { width: 100%; border-collapse: collapse } table.itens td { vertical-align: top; padding: 2px 0 }
    table.itens .q { width: 9mm } table.itens .v { text-align: right; white-space: nowrap; padding-left: 6px }
    table.itens tr.it td { font-weight: bold } table.itens tr.cab td { font-weight: normal }
    .obs { font-weight: bold; font-size: ${base}px; margin-top: 2px }
    hr { border: 0; border-top: 1px dashed #000; margin: 8px 0 }
    .via + .via { page-break-before: always; break-before: page; margin-top: 10mm }
  </style>`;
}

/** Itens que o salão mandou para a cozinha (garçom ou cliente pelo QR Code da mesa). */
export type EnvioMesa = { mesa: number | string; cliente?: string | null; garcom?: string | null; qr?: boolean; quando?: string; itens: { qtd: number; nome: string; obs?: string | null }[] };

/** Via da cozinha do salão, no mesmo padrão: mesa e nome de quem pediu em destaque, itens e observações. */
export function htmlCozinhaMesa(e: EnvioMesa, cfg: ImpressoraCfg = lerImpressora()) {
  const quem = e.cliente || (e.garcom ? `Garçom ${e.garcom}` : e.qr ? "Pedido pelo QR Code" : "");
  const ls: LinhaNota[] = e.itens.map((i) => ({ qtd: String(i.qtd), nome: i.nome.toUpperCase(), obs: i.obs }));
  return `<!doctype html><html><head><meta charset="utf-8"><title>Mesa ${e.mesa}</title>${estilo(cfg)}</head><body><section class="via">
    <div class="titulo">COZINHA · SALÃO</div>
    <div class="grande c">MESA ${esc(String(e.mesa))}</div>
    ${lin("Data", dataHora(e.quando))}${e.garcom ? lin("Garçom", e.garcom) : ""}${e.qr ? lin("Origem", "QR Code da mesa") : ""}
    ${sep}<div class="sec">Cliente</div><div class="grande">${esc(quem || "Não informado")}</div>
    ${sep}<div class="sec">Itens do pedido</div>${tabelaItens(ls, false)}
    ${sep}<div class="c forte">Mesa ${esc(String(e.mesa))}${quem ? ` · ${esc(quem)}` : ""}</div>
  </section></body></html>`;
}

export function imprimirCozinhaMesa(e: EnvioMesa, cfg: ImpressoraCfg = lerImpressora(), forcar = false) {
  if (forcar || viasDoComputador(cfg).includes("cozinha")) imprimirHtml(htmlCozinhaMesa(e, cfg));
}

/** HTML das vias pedidas (padrão: as deste computador), no tamanho do papel configurado. */
export function htmlComanda(p: Pedido, loja: string, cfg: ImpressoraCfg = lerImpressora(), quais: ViaTipo[] = viasDoComputador(cfg)) {
  const vias = quais.map((v) => (v === "cozinha" ? viaCozinha(p) : viaCaixa(p, loja, cfg))).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>Pedido #${p.num}</title>${estilo(cfg)}</head><body>${vias}</body></html>`;
}

/** Abre a impressão. Com o Chrome no modo "impressão direta" sai sozinho na impressora padrão, sem janela. */
export function imprimirComanda(p: Pedido, loja: string, cfg: ImpressoraCfg = lerImpressora(), quais?: ViaTipo[]) {
  const q = quais ?? viasDoComputador(cfg);
  if (q.length) imprimirHtml(htmlComanda(p, loja, cfg, q));
}

function imprimirHtml(html: string) {
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
