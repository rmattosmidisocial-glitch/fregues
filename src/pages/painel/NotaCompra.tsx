import { useRef, useState } from "react";
import { AlertTriangle, Camera, Loader2, X } from "lucide-react";
import { brl } from "../../data/mock";
import { supabase, useDados } from "../../data/dados";
import { compraDe, qtdTxt, UNIDADES, type Insumo, type Unidade, type useCustos } from "../../data/custos";

type C = ReturnType<typeof useCustos>;
type ItemIA = { descricao: string; nome: string; unidade: Unidade; quantidade: number; valor_total: number };
type RespostaNota = { fornecedor?: string; data?: string; total_nota?: number | null; itens?: ItemIA[]; avisos?: string[]; erro?: string };
/** destino: id de um insumo, "novo" (cria) ou "ignorar" */
type Linha = ItemIA & { destino: string; novoNome: string; qtdTxt: string; valorTxt: string };

const num = (s: string) => {
  const t = s.replace(/[^\d,.]/g, "");
  if (!t) return NaN;
  return Number(t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t);
};
const txt = (n: number, casas = 3) => n.toLocaleString("pt-BR", { maximumFractionDigits: casas, useGrouping: false });

// ---------- achar o insumo que corresponde ao item da nota ----------
const normal = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, " ");
const PALAVRAS_FRACAS = new Set(["de", "da", "do", "com", "kg", "g", "un", "und", "pct", "cx", "lt", "ml", "l", "fat", "fatiado", "tipo", "a", "e"]);
const palavras = (s: string) =>
  normal(s)
    .split(/\s+/)
    .filter((w) => w.length > 1 && !PALAVRAS_FRACAS.has(w) && !/^\d+$/.test(w));
export function acharInsumo(item: { nome: string; descricao: string }, insumos: Insumo[]): Insumo | null {
  const alvo = new Set([...palavras(item.nome), ...palavras(item.descricao)]);
  let melhor: Insumo | null = null;
  let nota = 0;
  for (const i of insumos) {
    const ws = palavras(i.nome);
    if (!ws.length) continue;
    // todas as palavras do insumo precisam aparecer no item (ex.: "queijo prato" em "QUEIJO PRATO FAT KG")
    const achou = ws.filter((w) => alvo.has(w) || [...alvo].some((a) => a.startsWith(w) || w.startsWith(a))).length;
    const n = achou / ws.length;
    if (n === 1 && ws.length > nota) {
      melhor = i;
      nota = ws.length;
    }
  }
  return melhor;
}

const EXEMPLO_DEMO: RespostaNota = {
  fornecedor: "Atacadão Penha",
  data: new Date().toLocaleDateString("pt-BR"),
  total_nota: 390.17,
  itens: [
    { descricao: "BACON MANTA DEFUMADO KG", nome: "Bacon", unidade: "kg", quantidade: 2.5, valor_total: 112.5 },
    { descricao: "PAO BRIOCHE HAMB C/12 UN", nome: "Pão brioche", unidade: "un", quantidade: 48, valor_total: 76.8 },
    { descricao: "QUEIJO PRATO FAT 1KG", nome: "Queijo prato", unidade: "kg", quantidade: 2, valor_total: 99.8 },
    { descricao: "REFRIG COCA COLA LT 350ML CX12", nome: "Refrigerante lata", unidade: "un", quantidade: 24, valor_total: 74.4 },
    { descricao: "CEBOLA ROXA KG", nome: "Cebola roxa", unidade: "kg", quantidade: 3, valor_total: 17.7 },
    { descricao: "DETERG LIQ 500ML", nome: "Detergente", unidade: "un", quantidade: 3, valor_total: 8.97 },
  ],
  avisos: ["Demonstração: esta é uma nota de exemplo. Na loja real, a IA lê a foto da sua nota."],
};

async function imagemBase64(f: File): Promise<{ tipo: string; base64: string }> {
  const url = URL.createObjectURL(f);
  try {
    const img = await new Promise<HTMLImageElement>((ok, falha) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => falha(new Error("Não consegui abrir a imagem"));
      i.src = url;
    });
    // nota é comprida e de letra miúda: guarda mais resolução que o cardápio
    const esc = Math.min(1, 2600 / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * esc);
    c.height = Math.round(img.height * esc);
    const g = c.getContext("2d")!;
    g.fillStyle = "#fff";
    g.fillRect(0, 0, c.width, c.height);
    g.drawImage(img, 0, 0, c.width, c.height);
    return { tipo: "image/jpeg", base64: c.toDataURL("image/jpeg", 0.85).split(",")[1] };
  } finally {
    URL.revokeObjectURL(url);
  }
}
const arquivoBase64 = (f: File) =>
  new Promise<string>((ok, falha) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result).split(",")[1]);
    r.onerror = () => falha(new Error("ler"));
    r.readAsDataURL(f);
  });

export function NotaCompra({ c, avisar, fechar }: { c: C; avisar: (t: string) => void; fechar: () => void }) {
  const d = useDados();
  const ref = useRef<HTMLInputElement>(null);
  const [lendo, setLendo] = useState(false);
  const [erro, setErro] = useState("");
  const [cab, setCab] = useState<{ fornecedor: string; data: string; total: number | null; avisos: string[] } | null>(null);
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [lancando, setLancando] = useState<number | null>(null);

  async function ler(fs: FileList | null) {
    if (!fs?.length) return;
    setErro("");
    setLendo(true);
    try {
      let r: RespostaNota;
      if (d.modo === "demo") {
        await new Promise((ok) => setTimeout(ok, 1200));
        r = EXEMPLO_DEMO;
      } else {
        const arquivos = [];
        for (const f of [...fs].slice(0, 4)) {
          if (f.type === "application/pdf") {
            if (f.size > 3_000_000) throw new Error("O PDF passa de 3 MB. Envie uma foto da nota.");
            arquivos.push({ tipo: "application/pdf", base64: await arquivoBase64(f) });
          } else if (f.type.startsWith("image/")) arquivos.push(await imagemBase64(f));
        }
        if (!arquivos.length) throw new Error("Envie a foto (JPG/PNG) ou o PDF da nota.");
        const { data } = await supabase!.auth.getSession();
        const resp = await fetch("/api/estoque/nota", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}` }, body: JSON.stringify({ arquivos }) });
        r = await resp.json().catch(() => ({ erro: `O servidor respondeu ${resp.status}` }));
        if (!resp.ok || r.erro) throw new Error(r.erro ?? "Não consegui ler a nota.");
      }
      setCab({ fornecedor: r.fornecedor ?? "", data: r.data ?? "", total: r.total_nota ?? null, avisos: r.avisos ?? [] });
      setLinhas(
        (r.itens ?? []).map((i) => {
          const ins = acharInsumo(i, c.insumos);
          return { ...i, destino: ins ? ins.id : "novo", novoNome: i.nome, qtdTxt: txt(i.quantidade), valorTxt: txt(i.valor_total, 2) };
        }),
      );
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setLendo(false);
      if (ref.current) ref.current.value = "";
    }
  }

  const set = (k: number, m: Partial<Linha>) => setLinhas(linhas.map((l, j) => (j === k ? { ...l, ...m } : l)));
  const mapa = new Map(c.insumos.map((i) => [i.id, i]));
  const validas = linhas.filter((l) => l.destino !== "ignorar");
  const somaNota = linhas.reduce((s, l) => s + (num(l.valorTxt) || 0), 0);

  async function lancar() {
    const obs = ["Nota", cab?.fornecedor, cab?.data].filter(Boolean).join(" · ").slice(0, 200);
    let ok = 0,
      novos = 0,
      soPreco = 0;
    const falhas: string[] = [];
    setLancando(0);
    for (const [k, l] of validas.entries()) {
      setLancando(k + 1);
      const q = num(l.qtdTxt);
      const v = num(l.valorTxt);
      if (!(q > 0) || !(v >= 0)) {
        falhas.push(l.nome);
        continue;
      }
      const unit = Math.round((v / q) * 10000) / 10000;
      if (l.destino === "novo") {
        const r = await c.criarInsumo({ nome: l.novoNome, unidade: l.unidade, custo: unit });
        if (!r.id) {
          falhas.push(l.novoNome);
          continue;
        }
        // insumo novo: começa a controlar com o que acabou de chegar
        const e = await c.lancarEstoque(r.id, "contagem", q, { obs, silencioso: true });
        if (e) falhas.push(l.novoNome);
        else novos++;
        continue;
      }
      const ins = mapa.get(l.destino);
      if (!ins) {
        falhas.push(l.nome);
        continue;
      }
      if (ins.estoque == null) {
        const e = await c.atualizarCusto(ins.id, unit);
        if (e) falhas.push(ins.nome);
        else soPreco++;
        continue;
      }
      const e = await c.lancarEstoque(ins.id, "entrada", q, { custo: unit, obs, silencioso: true });
      if (e) falhas.push(ins.nome);
      else ok++;
    }
    await c.recarregar();
    setLancando(null);
    const partes = [ok && `${ok} entrada${ok > 1 ? "s" : ""} no estoque`, novos && `${novos} insumo${novos > 1 ? "s" : ""} novo${novos > 1 ? "s" : ""}`, soPreco && `${soPreco} só com preço atualizado (sem controle de estoque)`].filter(Boolean);
    avisar(falhas.length ? `Lançado: ${partes.join(", ") || "nada"}. Não deu: ${falhas.join(", ")}` : `Nota lançada: ${partes.join(", ")}. Custos e CMV atualizados.`);
    if (!falhas.length) fechar();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4" onClick={fechar}>
      <div role="dialog" aria-label="Lançar nota de compra" className="flex max-h-[94vh] w-full max-w-[900px] flex-col rounded-t-3xl border border-linha bg-forno sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-linha px-6 py-4">
          <h2 className="font-display text-[22px] font-extrabold">Lançar nota de compra</h2>
          <button onClick={fechar} aria-label="Fechar" className="rounded-full p-2 hover:bg-grafite">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5">
          {!linhas.length ? (
            <div className="text-center">
              <p className="text-[15px] text-areia">Tire uma foto da nota fiscal ou do cupom da compra (inteira, de frente e com boa luz). A IA lê cada produto com quantidade, unidade e valor, e você confere antes de lançar.</p>
              <input ref={ref} type="file" accept="image/*,application/pdf" capture="environment" multiple className="hidden" onChange={(e) => ler(e.target.files)} />
              <button disabled={lendo} onClick={() => ref.current?.click()} className="mx-auto mt-5 flex items-center gap-2 rounded-full bg-brasa px-6 py-3 text-[15px] font-semibold text-carvao hover:bg-mostarda disabled:opacity-60">
                {lendo ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />} {lendo ? "Lendo a nota… pode levar até 1 minuto" : "Enviar foto ou PDF da nota"}
              </button>
              <p className="mt-2 text-[12px] text-fumo">Nota comprida? Mande até 4 fotos de uma vez.</p>
              {erro && <p className="mt-4 rounded-xl bg-tomate/10 p-3 text-[14px] text-tomate">{erro}</p>}
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 text-[14px]">
                <p>
                  <b>{cab?.fornecedor || "Fornecedor não identificado"}</b>
                  {cab?.data ? ` · ${cab.data}` : ""}
                </p>
                <p className="text-areia">
                  Itens somam <b className="text-papel">{brl(somaNota)}</b>
                  {cab?.total ? ` · total da nota ${brl(cab.total)}` : ""}
                </p>
              </div>
              {!!cab?.avisos.length && (
                <ul className="mt-2 space-y-1 rounded-xl bg-mostarda/15 p-3 text-[13px] text-[#8a5a00]">
                  {cab.avisos.map((a) => (
                    <li key={a} className="flex gap-1.5">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {a}
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 text-[13px] text-areia">Confira cada linha. O que não for insumo da casa (limpeza, descartável que você não controla…), toque no X ou escolha “Não lançar”.</p>

              <ul className="mt-3 space-y-2">
                {linhas.map((l, k) => {
                  const ins = mapa.get(l.destino);
                  const un: Unidade = ins ? ins.unidade : l.unidade;
                  const q = num(l.qtdTxt);
                  const v = num(l.valorTxt);
                  const difUnidade = ins && ins.unidade !== l.unidade;
                  const ignorado = l.destino === "ignorar";
                  return (
                    <li key={k} className={`rounded-2xl border border-linha p-3 ${ignorado ? "opacity-50" : ""}`}>
                      <div className="flex items-start justify-between gap-2">
                        <p className="min-w-0 text-[12px] uppercase tracking-wide text-fumo">{l.descricao}</p>
                        <button onClick={() => setLinhas(linhas.filter((_, j) => j !== k))} aria-label="Tirar da lista" className="-mr-1 -mt-1 shrink-0 rounded-full p-1.5 text-areia hover:bg-grafite hover:text-tomate">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="mt-2 grid gap-2 sm:grid-cols-[1.4fr_1fr_1fr_auto] sm:items-center">
                        <div className="flex gap-2">
                          <select value={l.destino} onChange={(e) => set(k, { destino: e.target.value })} aria-label="Lançar em" className="min-w-0 flex-1 rounded-xl border border-linha bg-carvao/0 px-3 py-2 text-[14px]">
                            <option value="novo">＋ Criar insumo novo</option>
                            <option value="ignorar">Não lançar</option>
                            <optgroup label="Seus insumos">
                              {c.insumos.map((i) => (
                                <option key={i.id} value={i.id}>
                                  {i.nome} ({compraDe(i.unidade)})
                                </option>
                              ))}
                            </optgroup>
                          </select>
                        </div>
                        <label className="flex items-center gap-1 rounded-xl border border-linha px-3 focus-within:border-brasa">
                          <input value={l.qtdTxt} onChange={(e) => set(k, { qtdTxt: e.target.value })} disabled={ignorado} inputMode="decimal" aria-label="Quantidade" className="w-full bg-transparent py-2 text-right text-[15px] outline-none" />
                          {l.destino === "novo" ? (
                            <select value={l.unidade} onChange={(e) => set(k, { unidade: e.target.value as Unidade })} aria-label="Unidade" className="bg-transparent text-[13px] text-areia outline-none">
                              {UNIDADES.map((u) => (
                                <option key={u.id} value={u.id}>
                                  {u.id === "l" ? "L" : u.id}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-[13px] text-areia">{un === "l" ? "L" : un}</span>
                          )}
                        </label>
                        <label className="flex items-center gap-1 rounded-xl border border-linha px-3 focus-within:border-brasa">
                          <span className="text-[13px] text-areia">R$</span>
                          <input value={l.valorTxt} onChange={(e) => set(k, { valorTxt: e.target.value })} disabled={ignorado} inputMode="decimal" aria-label="Valor pago" className="w-full bg-transparent py-2 text-right text-[15px] outline-none" />
                        </label>
                        <p className="tabular text-right text-[13px] text-areia sm:w-[120px]">{q > 0 && v >= 0 ? `${brl(v / q)}/${compraDe(un)}` : "—"}</p>
                      </div>
                      {l.destino === "novo" && (
                        <input value={l.novoNome} onChange={(e) => set(k, { novoNome: e.target.value })} aria-label="Nome do insumo novo" placeholder="Nome do insumo" className="mt-2 w-full rounded-xl border border-dashed border-linha bg-carvao/0 px-3 py-2 text-[14px] outline-none focus:border-brasa" />
                      )}
                      {difUnidade && (
                        <p className="mt-2 flex items-center gap-1.5 text-[12px] text-mostarda">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> A nota veio em {l.unidade === "l" ? "litro" : l.unidade}, mas {ins!.nome} é controlado por {compraDe(ins!.unidade)}. Ajuste a quantidade para {compraDe(ins!.unidade)}.
                        </p>
                      )}
                      {ins && !ignorado && (
                        <p className="mt-1 text-[12px] text-fumo">{ins.estoque == null ? `${ins.nome} não tem estoque controlado: só o preço será atualizado.` : `Estoque de ${ins.nome}: ${qtdTxt(ins.estoque, ins.unidade)}${q > 0 ? ` → ${qtdTxt(Math.round((ins.estoque + q) * 1000) / 1000, ins.unidade)}` : ""}`}</p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
        {!!linhas.length && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-linha px-6 py-4">
            <button
              onClick={() => {
                setLinhas([]);
                setCab(null);
              }}
              className="text-[14px] text-areia hover:text-papel"
            >
              Ler outra nota
            </button>
            <button disabled={!validas.length || lancando != null} onClick={lancar} className="rounded-full bg-brasa px-6 py-3 text-[15px] font-semibold text-carvao hover:bg-mostarda disabled:opacity-50">
              {lancando != null ? `Lançando ${lancando} de ${validas.length}…` : `Lançar ${validas.length} ${validas.length === 1 ? "item" : "itens"}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
