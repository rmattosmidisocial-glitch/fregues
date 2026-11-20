import { createContext, useContext, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Camera, Copy, FolderCog, ImageUp, Moon, Plus, Search, Sun, Trash2, X } from "lucide-react";
import { brl, type Grupo, type Produto } from "../../data/mock";
import { supabase, useDados, type ProdutoEdit } from "../../data/dados";
import { Foto } from "../../components/Foto";
import { useToast } from "../../components/ui";

const precoTxt = (n?: number) => (n == null ? "" : n.toFixed(2).replace(".", ","));
const lerPreco = (s: string) => {
  const t = s.replace(/[^\d,.]/g, "");
  if (!t) return NaN;
  // "1.234,56" ou "29,90" ou "29.90"
  const norm = t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t;
  return Math.round(Number(norm) * 100) / 100;
};

/** Com dois cardápios: qual deles o dono está vendo e editando agora (não é o que está no ar). */
const Visto = createContext<{ duplo: boolean; visto: 1 | 2 }>({ duplo: false, visto: 1 });
const campo = "w-full rounded-xl border border-linha bg-carvao/0 px-3 py-2.5 text-[15px] outline-none focus:border-brasa";
const rotulo = "mb-1 block text-[13px] font-semibold text-areia";

export function Cardapio() {
  const d = useDados();
  const duplo = !!d.loja.cardapios_duplos;
  const noAr: 1 | 2 = d.loja.cardapio_ativo === 2 ? 2 : 1;
  const [vistoEscolhido, setVisto] = useState<1 | 2 | null>(null);
  const visto: 1 | 2 = duplo ? (vistoEscolhido ?? noAr) : 1;
  const CATEGORIAS = duplo ? d.categoriasTodas.filter((c) => [0, visto].includes(d.catCardapio[c] ?? 1)) : d.categoriasTodas;
  const itens = duplo ? d.cardapioTodo.filter((p) => CATEGORIAS.includes(p.cat)) : d.cardapioTodo;
  const [busca, setBusca] = useState("");
  const [editando, setEditando] = useState<Produto | "novo" | null>(null);
  const [catNova, setCatNova] = useState<string | undefined>();
  const [gerirCats, setGerirCats] = useState(false);
  const [importar, setImportar] = useState(false);
  const { show, Toast } = useToast();

  const q = busca.trim().toLowerCase();
  const visiveis = q ? itens.filter((p) => p.nome.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q)) : itens;
  const esgotados = itens.filter((p) => p.esgotado).length;

  return (
    <Visto.Provider value={{ duplo, visto }}>
      <div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-[clamp(2rem,4vw,2.8rem)] font-extrabold tracking-[-0.015em]">Cardápio</h1>
            <p className="text-[15px] text-areia">
              {itens.length} produtos em {CATEGORIAS.length} categorias{esgotados ? ` · ${esgotados} esgotado${esgotados > 1 ? "s" : ""}` : ""}. Vale para loja online, mesa (QR) e caixa.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                setCatNova(undefined);
                setEditando("novo");
              }}
              className="flex items-center gap-2 rounded-full bg-brasa px-4 py-2.5 text-[14px] font-semibold text-carvao hover:bg-mostarda"
            >
              <Plus className="h-4 w-4" /> Novo produto
            </button>
            <button onClick={() => setGerirCats(true)} className="flex items-center gap-2 rounded-full border border-linha px-4 py-2.5 text-[14px] font-semibold hover:bg-grafite">
              <FolderCog className="h-4 w-4" /> Categorias
            </button>
            <button onClick={() => setImportar(true)} className="flex items-center gap-2 rounded-full border border-linha px-4 py-2.5 text-[14px] font-semibold hover:bg-grafite">
              <ImageUp className="h-4 w-4" /> Importar cardápio
            </button>
          </div>
        </div>

        <DoisCardapios visto={visto} setVisto={setVisto} avisar={show} />

        <label className="mt-6 flex max-w-[420px] items-center gap-2 rounded-full border border-linha bg-forno px-4 py-2.5">
          <Search className="h-4 w-4 text-areia" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar produto" aria-label="Buscar produto" className="w-full bg-transparent text-[15px] outline-none" />
        </label>

        {itens.length === 0 && (
          <div className="mt-8 rounded-3xl border-2 border-dashed border-linha p-8 text-center">
            <p className="font-display text-[22px] font-bold">{duplo ? `O cardápio ${(d.loja.cardapio_nomes ?? ["Dia", "Noite"])[visto - 1]} está vazio` : "Seu cardápio está vazio"}</p>
            <p className="mt-1 text-[15px] text-areia">Mande a foto ou o PDF do seu cardápio em “Importar cardápio” e a gente monta tudo para você conferir.</p>
          </div>
        )}

        {CATEGORIAS.map((cat) => {
          const daCat = visiveis.filter((p) => p.cat === cat);
          if (q && daCat.length === 0) return null;
          return (
            <section key={cat} className="mt-8">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-[22px] font-bold">
                  {cat} <span className="text-[15px] font-semibold text-fumo">{daCat.length}</span>
                </h2>
                <button
                  onClick={() => {
                    setCatNova(cat);
                    setEditando("novo");
                  }}
                  className="flex items-center gap-1 rounded-full px-3 py-1.5 text-[13px] font-semibold text-areia hover:bg-grafite hover:text-papel"
                >
                  <Plus className="h-4 w-4" /> Adicionar aqui
                </button>
              </div>
              {daCat.length === 0 && <p className="mt-2 text-[14px] text-fumo">Nenhum produto nesta categoria ainda.</p>}
              <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {daCat.map((p) => (
                  <article key={p.id} className={`flex gap-4 rounded-2xl border border-linha bg-forno p-3 ${p.esgotado ? "opacity-60" : ""}`}>
                    <button onClick={() => setEditando(p)} aria-label={`Editar ${p.nome}`} className="shrink-0">
                      <Foto nome={p.nome} arte={p.arte} url={p.foto} className="h-20 w-20 rounded-xl" />
                    </button>
                    <div className="min-w-0 flex-1">
                      <button onClick={() => setEditando(p)} className="block w-full text-left">
                        <p className="flex items-center gap-2 font-semibold">
                          <span className="truncate">{p.nome}</span>
                          {p.maisPedido && <span className="shrink-0 rounded-full bg-mostarda/30 px-2 py-0.5 text-[11px] font-semibold">Mais pedido</span>}
                        </p>
                        <p className="line-clamp-2 text-[13px] text-areia">{p.desc || "Sem descrição"}</p>
                      </button>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="tabular text-[15px] font-semibold">
                          {p.promo ? (
                            <>
                              {brl(p.promo)} <s className="text-[12px] text-fumo">{brl(p.preco)}</s>
                            </>
                          ) : (
                            brl(p.preco)
                          )}
                        </span>
                        <label className="flex cursor-pointer items-center gap-2 text-[12px] text-areia">
                          {p.esgotado ? "Esgotado" : "À venda"}
                          <input
                            type="checkbox"
                            className="peer sr-only"
                            checked={!p.esgotado}
                            onChange={() => {
                              d.acoes.toggleEsgotado(p.id);
                              show(p.esgotado ? `${p.nome} voltou para a loja` : `${p.nome} marcado como esgotado`);
                            }}
                          />
                          <span className={`relative h-5 w-9 rounded-full transition ${p.esgotado ? "bg-linha" : "bg-manjericao"} peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-mostarda`}>
                            <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${p.esgotado ? "left-0.5" : "left-[18px]"}`} />
                          </span>
                        </label>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          );
        })}

        {editando && <EditorProduto produto={editando === "novo" ? undefined : editando} categoriaInicial={catNova} fechar={() => setEditando(null)} avisar={show} />}
        {gerirCats && <GerirCategorias fechar={() => setGerirCats(false)} avisar={show} />}
        {importar && <ColarLista fechar={() => setImportar(false)} avisar={show} />}
        <Toast />
      </div>
    </Visto.Provider>
  );
}

/** Dois cardápios: liga a opção, dá nome a cada um, escolhe qual está no ar e qual está editando. */
function DoisCardapios({ visto, setVisto, avisar }: { visto: 1 | 2; setVisto: (v: 1 | 2) => void; avisar: (t: string) => void }) {
  const d = useDados();
  const duplo = !!d.loja.cardapios_duplos;
  const noAr: 1 | 2 = d.loja.cardapio_ativo === 2 ? 2 : 1;
  const nomes = d.loja.cardapio_nomes?.length === 2 ? d.loja.cardapio_nomes : ["Dia", "Noite"];
  const auto = !!d.loja.cardapio_auto;
  const horas = d.loja.cardapio_horas?.length === 2 ? d.loja.cardapio_horas : ["06:00", "18:00"];
  const icone = (n: 1 | 2) => (n === 1 ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />);
  const qtd = (n: 1 | 2) => d.cardapioTodo.filter((p) => [0, n].includes(d.catCardapio[p.cat] ?? 1)).length;
  const salvar = async (c: Parameters<typeof d.acoes.salvarLoja>[0], msg?: string) => {
    const e = await d.acoes.salvarLoja(c);
    if (e) avisar(e);
    else if (msg) avisar(msg);
  };
  if (!duplo)
    return (
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-linha p-4">
        <p className="text-[14px] text-areia">
          <b className="text-papel">Funciona de um jeito de dia e de outro à noite?</b> Use dois cardápios (ex.: restaurante no almoço, hamburgueria à noite) e escolha qual fica no ar.
        </p>
        <button onClick={() => salvar({ cardapios_duplos: true, cardapio_ativo: 1, cardapio_nomes: nomes }, "Dois cardápios ligados. Tudo o que já existe ficou no primeiro.")} className="rounded-full border border-linha px-4 py-2 text-[14px] font-semibold hover:border-areia">
          Usar dois cardápios
        </button>
      </div>
    );
  return (
    <div className="mt-5 rounded-3xl border border-linha bg-forno p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-display text-[18px] font-bold">No ar agora na loja, no salão e no caixa</p>
        <button onClick={() => salvar({ cardapios_duplos: false }, "Voltou a ser um cardápio só, com todas as categorias.")} className="text-[13px] font-semibold text-areia underline-offset-4 hover:underline">
          Voltar a um cardápio só
        </button>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {([1, 2] as const).map((n) => (
          <button
            key={n}
            onClick={() => {
              if (auto) return salvar({ cardapio_auto: false, cardapio_ativo: n }, `Troca automática desligada. Cardápio ${nomes[n - 1]} no ar`);
              if (n !== noAr) salvar({ cardapio_ativo: n }, `Cardápio ${nomes[n - 1]} no ar`);
            }}
            aria-pressed={n === noAr}
            className={`flex items-center justify-between gap-3 rounded-2xl border-2 p-4 text-left transition ${n === noAr ? "border-manjericao bg-[#e4f3ea] text-[#1b6149]" : "border-linha hover:border-areia"}`}
          >
            <span className="flex items-center gap-2 font-display text-[18px] font-extrabold">
              {icone(n)} {nomes[n - 1]}
            </span>
            <span className="text-right text-[13px] font-semibold">
              {n === noAr ? (auto ? "No ar (automático)" : "No ar") : "Ligar este"}
              {auto && <span className="block text-[12px] font-normal opacity-80">a partir das {horas[n - 1]}</span>}
            </span>
          </button>
        ))}
      </div>
      <div className="mt-3 rounded-2xl bg-grafite p-3 text-[14px]">
        <label className="flex items-center gap-2 font-semibold">
          <input type="checkbox" checked={auto} onChange={(e) => salvar({ cardapio_auto: e.target.checked, cardapio_horas: horas }, e.target.checked ? "Troca automática ligada" : "Troca automática desligada")} className="h-4 w-4 accent-[#ff5b1f]" />
          Trocar sozinho pelo horário
        </label>
        {auto && (
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-areia">
            {([1, 2] as const).map((n) => (
              <label key={n} className="flex items-center gap-2">
                {icone(n)} {nomes[n - 1]} entra às
                <input
                  type="time"
                  value={horas[n - 1]}
                  onChange={(e) => {
                    const hh = [...horas];
                    hh[n - 1] = e.target.value || horas[n - 1];
                    salvar({ cardapio_horas: hh });
                  }}
                  aria-label={`Horário em que o cardápio ${nomes[n - 1]} entra`}
                  className="rounded-lg border border-linha bg-carvao px-2 py-1 text-papel"
                />
              </label>
            ))}
          </div>
        )}
        <p className="mt-1 text-[12px] text-areia">{auto ? "Hora de Brasília. Tocar num cardápio acima desliga a troca automática." : "Ex.: almoço entra às 6h e hamburgueria às 18h, sem ninguém precisar lembrar."}</p>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-linha pt-4 text-[14px]">
        <span className="text-areia">Editando:</span>
        {([1, 2] as const).map((n) => (
          <button key={n} onClick={() => setVisto(n)} aria-pressed={n === visto} className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 font-semibold ${n === visto ? "bg-papel text-carvao" : "border border-linha text-areia hover:text-papel"}`}>
            {icone(n)} {nomes[n - 1]} <span className="opacity-70">({qtd(n)})</span>
          </button>
        ))}
        <label className="ml-auto flex items-center gap-2 text-areia">
          Nome
          <input
            key={`${visto}-${nomes[visto - 1]}`}
            defaultValue={nomes[visto - 1]}
            maxLength={20}
            aria-label="Nome deste cardápio"
            onBlur={(e) => {
              const v = e.target.value.trim();
              if (!v || v === nomes[visto - 1]) return;
              const nn = [...nomes];
              nn[visto - 1] = v;
              salvar({ cardapio_nomes: nn }, "Nome salvo");
            }}
            className="w-32 rounded-lg border border-linha bg-carvao px-2 py-1 text-papel"
          />
        </label>
      </div>
      <p className="mt-2 text-[12px] text-areia">Cada categoria é de um cardápio ou dos dois (ex.: Bebidas). Para mudar, use o botão Categorias.</p>
    </div>
  );
}

function Janela({ titulo, fechar, children, largura = 620 }: { titulo: string; fechar: () => void; children: React.ReactNode; largura?: number }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4" onClick={fechar}>
      <div role="dialog" aria-label={titulo} className="flex max-h-[94vh] w-full flex-col rounded-t-3xl border border-linha bg-forno sm:rounded-3xl" style={{ maxWidth: largura }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-linha px-6 py-4">
          <h2 className="font-display text-[22px] font-extrabold">{titulo}</h2>
          <button onClick={fechar} aria-label="Fechar" className="rounded-full p-2 hover:bg-grafite">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

type GrupoForm = { nome: string; obrigatorio: boolean; max: string; itens: { nome: string; preco: string }[] };
const grupoParaForm = (g: Grupo): GrupoForm => ({ nome: g.nome, obrigatorio: g.min > 0, max: String(g.max), itens: g.itens.map((o) => ({ nome: o.nome, preco: o.preco ? precoTxt(o.preco) : "" })) });

function EditorProduto({ produto, categoriaInicial, fechar, avisar }: { produto?: Produto; categoriaInicial?: string; fechar: () => void; avisar: (t: string) => void }) {
  const d = useDados();
  const { duplo, visto } = useContext(Visto);
  const cats = duplo ? d.categoriasTodas.filter((c) => [0, visto].includes(d.catCardapio[c] ?? 1)) : d.categoriasTodas;
  const [nome, setNome] = useState(produto?.nome ?? "");
  const [desc, setDesc] = useState(produto?.desc ?? "");
  const [cat, setCat] = useState(produto?.cat ?? categoriaInicial ?? cats[0] ?? "");
  const [catNovaTxt, setCatNovaTxt] = useState(cats.length === 0 ? "" : "");
  const [criandoCat, setCriandoCat] = useState(cats.length === 0);
  const [preco, setPreco] = useState(precoTxt(produto?.preco));
  const [temPromo, setTemPromo] = useState(produto?.promo != null);
  const [promo, setPromo] = useState(precoTxt(produto?.promo));
  const [foto, setFoto] = useState(produto?.foto);
  const [maisPedido, setMaisPedido] = useState(produto?.maisPedido ?? false);
  const [aVenda, setAVenda] = useState(!(produto?.esgotado ?? false));
  const [grupos, setGrupos] = useState<GrupoForm[]>((produto?.grupos ?? []).map(grupoParaForm));
  const [salvando, setSalvando] = useState(false);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [confirmarExcluir, setConfirmarExcluir] = useState(false);
  const arquivo = useRef<HTMLInputElement>(null);

  const comGrupos = useMemo(() => d.cardapioTodo.filter((p) => p.id !== produto?.id && (p.grupos?.length ?? 0) > 0), [d.cardapioTodo, produto?.id]);

  const mudarGrupo = (i: number, g: Partial<GrupoForm>) => setGrupos((l) => l.map((x, j) => (j === i ? { ...x, ...g } : x)));
  const mudarItem = (gi: number, ii: number, it: Partial<{ nome: string; preco: string }>) => setGrupos((l) => l.map((x, j) => (j === gi ? { ...x, itens: x.itens.map((o, k) => (k === ii ? { ...o, ...it } : o)) } : x)));

  async function escolherFoto(f?: File) {
    if (!f) return;
    setEnviandoFoto(true);
    setErro(null);
    const r = await d.acoes.enviarFoto(f);
    setEnviandoFoto(false);
    if (r.erro) setErro(r.erro);
    else setFoto(r.url);
  }

  async function salvar() {
    setErro(null);
    const categoria = criandoCat ? catNovaTxt.trim() : cat;
    const pr = lerPreco(preco);
    const pp = temPromo ? lerPreco(promo) : undefined;
    if (nome.trim().length < 2) return setErro("Dê um nome ao produto.");
    if (!categoria) return setErro("Escolha ou crie uma categoria.");
    if (!Number.isFinite(pr)) return setErro("Informe o preço, por exemplo 29,90.");
    if (temPromo && !Number.isFinite(pp)) return setErro("Informe o preço promocional ou desligue a promoção.");
    for (const g of grupos) {
      if (!g.nome.trim() && g.itens.some((o) => o.nome.trim())) return setErro("Dê um nome a cada grupo de complementos (ex.: Adicionais).");
      if (g.nome.trim() && !g.itens.some((o) => o.nome.trim())) return setErro(`Coloque pelo menos uma opção em “${g.nome}”.`);
    }
    const p: ProdutoEdit = {
      id: produto?.id,
      categoria,
      nome,
      descricao: desc,
      preco: pr,
      promo: pp,
      foto,
      maisPedido,
      esgotado: !aVenda,
      grupos: grupos.map((g) => {
        const itens = g.itens.filter((o) => o.nome.trim()).map((o) => ({ nome: o.nome, preco: Number.isFinite(lerPreco(o.preco)) ? lerPreco(o.preco) : 0 }));
        const max = Math.max(1, Math.min(Number(g.max) || 1, itens.length || 1));
        return { nome: g.nome, min: g.obrigatorio ? 1 : 0, max, itens };
      }),
    };
    setSalvando(true);
    const nova = !d.categoriasTodas.some((c) => c.toLowerCase() === categoria.toLowerCase());
    const e = await d.acoes.salvarProduto(p);
    if (!e && nova && duplo) await d.acoes.cardapioDaCategoria(categoria, visto);
    setSalvando(false);
    if (e) return setErro(e);
    avisar(produto ? `${nome.trim()} atualizado` : `${nome.trim()} adicionado ao cardápio`);
    fechar();
  }

  async function excluir() {
    if (!produto) return;
    const e = await d.acoes.excluirProduto(produto.id);
    if (e) return setErro(e);
    avisar(`${produto.nome} saiu do cardápio`);
    fechar();
  }

  return (
    <Janela titulo={produto ? "Editar produto" : "Novo produto"} fechar={fechar}>
      <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
        <div className="flex gap-4">
          <div className="shrink-0">{foto ? <img src={foto} alt="" className="h-28 w-28 rounded-2xl object-cover" /> : <Foto nome={nome || "?"} arte={produto && !produto.foto ? produto.arte : "sem"} className="h-28 w-28 rounded-2xl" />}</div>
          <div className="flex flex-col justify-center gap-2">
            <input ref={arquivo} type="file" accept="image/*" className="hidden" onChange={(e) => escolherFoto(e.target.files?.[0])} />
            <button onClick={() => arquivo.current?.click()} disabled={enviandoFoto} className="flex items-center gap-2 rounded-full border border-linha px-4 py-2 text-[14px] font-semibold hover:bg-grafite disabled:opacity-60">
              <Camera className="h-4 w-4" /> {enviandoFoto ? "Enviando…" : foto ? "Trocar foto" : "Colocar foto"}
            </button>
            {foto && (
              <button onClick={() => setFoto(undefined)} className="text-left text-[13px] font-semibold text-areia underline">
                Tirar a foto
              </button>
            )}
            <p className="text-[12px] text-fumo">Foto do celular serve. A gente reduz o tamanho sozinho.</p>
          </div>
        </div>

        <div>
          <label className={rotulo} htmlFor="p-nome">
            Nome
          </label>
          <input id="p-nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: X-Bacon Duplo" className={campo} />
        </div>
        <div>
          <label className={rotulo} htmlFor="p-desc">
            Descrição
          </label>
          <textarea id="p-desc" value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} placeholder="O que vai no prato. É isso que convence o cliente." className={campo} />
        </div>

        <div>
          <label className={rotulo} htmlFor="p-cat">
            Categoria
          </label>
          {criandoCat ? (
            <div className="flex gap-2">
              <input id="p-cat" autoFocus value={catNovaTxt} onChange={(e) => setCatNovaTxt(e.target.value)} placeholder="Ex.: Pizzas, Bebidas, Pratos do dia" className={campo} />
              {cats.length > 0 && (
                <button onClick={() => setCriandoCat(false)} className="shrink-0 rounded-xl border border-linha px-3 text-[13px] font-semibold">
                  Usar existente
                </button>
              )}
            </div>
          ) : (
            <select
              id="p-cat"
              value={cat}
              onChange={(e) => {
                if (e.target.value === "__nova") {
                  setCriandoCat(true);
                  setCatNovaTxt("");
                } else setCat(e.target.value);
              }}
              className={campo}
            >
              {cats.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              <option value="__nova">+ Nova categoria…</option>
            </select>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={rotulo} htmlFor="p-preco">
              Preço (R$)
            </label>
            <input id="p-preco" inputMode="decimal" value={preco} onChange={(e) => setPreco(e.target.value)} placeholder="29,90" className={`${campo} tabular`} />
          </div>
          <div>
            <label className="mb-1 flex items-center gap-2 text-[13px] font-semibold text-areia">
              <input type="checkbox" checked={temPromo} onChange={(e) => setTemPromo(e.target.checked)} className="accent-[#e8541e]" /> Preço promocional
            </label>
            <input aria-label="Preço promocional" inputMode="decimal" disabled={!temPromo} value={promo} onChange={(e) => setPromo(e.target.value)} placeholder="24,90" className={`${campo} tabular disabled:opacity-40`} />
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <label className="flex items-center justify-between gap-3 rounded-xl bg-grafite px-4 py-3 text-[14px] font-semibold">
            À venda agora
            <input type="checkbox" checked={aVenda} onChange={(e) => setAVenda(e.target.checked)} className="h-5 w-5 accent-[#e8541e]" />
          </label>
          <label className="flex items-center justify-between gap-3 rounded-xl bg-grafite px-4 py-3 text-[14px] font-semibold">
            Selo “Mais pedido”
            <input type="checkbox" checked={maisPedido} onChange={(e) => setMaisPedido(e.target.checked)} className="h-5 w-5 accent-[#e8541e]" />
          </label>
        </div>

        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-display text-[18px] font-bold">Complementos</p>
              <p className="text-[13px] text-areia">Adicionais, ponto da carne, tamanho, borda, sabor… O cliente escolhe ao pedir.</p>
            </div>
            {comGrupos.length > 0 && (
              <label className="flex items-center gap-2 text-[13px] font-semibold text-areia">
                <Copy className="h-4 w-4" />
                <select
                  aria-label="Copiar complementos de outro produto"
                  value=""
                  onChange={(e) => {
                    const p = comGrupos.find((x) => x.id === e.target.value);
                    if (p) {
                      setGrupos((l) => [...l, ...(p.grupos ?? []).map(grupoParaForm)]);
                      avisar(`Complementos de ${p.nome} copiados`);
                    }
                  }}
                  className="rounded-lg border border-linha bg-forno px-2 py-1.5"
                >
                  <option value="">Copiar de outro produto</option>
                  {comGrupos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          <div className="mt-3 space-y-3">
            {grupos.map((g, gi) => (
              <div key={gi} className="rounded-2xl border border-linha p-4">
                <div className="flex gap-2">
                  <input aria-label="Nome do grupo" value={g.nome} onChange={(e) => mudarGrupo(gi, { nome: e.target.value })} placeholder="Nome do grupo (ex.: Adicionais)" className={campo} />
                  <button onClick={() => setGrupos((l) => l.filter((_, j) => j !== gi))} aria-label="Remover grupo" className="shrink-0 rounded-xl p-2.5 text-areia hover:bg-grafite hover:text-papel">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px]">
                  <label className="flex items-center gap-2 font-semibold">
                    <input type="checkbox" checked={g.obrigatorio} onChange={(e) => mudarGrupo(gi, { obrigatorio: e.target.checked })} className="accent-[#e8541e]" /> Obrigatório escolher
                  </label>
                  <label className="flex items-center gap-2 text-areia">
                    Pode escolher até
                    <input aria-label="Máximo de escolhas" inputMode="numeric" value={g.max} onChange={(e) => mudarGrupo(gi, { max: e.target.value.replace(/\D/g, "") })} className="w-12 rounded-lg border border-linha bg-transparent px-2 py-1 text-center" />
                  </label>
                </div>
                <div className="mt-3 space-y-2">
                  {g.itens.map((o, ii) => (
                    <div key={ii} className="flex gap-2">
                      <input aria-label="Opção" value={o.nome} onChange={(e) => mudarItem(gi, ii, { nome: e.target.value })} placeholder="Opção (ex.: Bacon extra)" className="min-w-0 flex-1 rounded-xl border border-linha bg-transparent px-3 py-2 text-[15px] outline-none focus:border-brasa" />
                      <input aria-label="Preço da opção" inputMode="decimal" value={o.preco} onChange={(e) => mudarItem(gi, ii, { preco: e.target.value })} placeholder="+ 0,00" className="tabular w-24 shrink-0 rounded-xl border border-linha bg-transparent px-3 py-2 text-[15px] outline-none focus:border-brasa" />
                      <button onClick={() => mudarGrupo(gi, { itens: g.itens.filter((_, k) => k !== ii) })} aria-label="Remover opção" className="shrink-0 rounded-xl p-2 text-areia hover:bg-grafite">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <button onClick={() => mudarGrupo(gi, { itens: [...g.itens, { nome: "", preco: "" }] })} className="flex items-center gap-1 text-[13px] font-semibold text-brasa">
                    <Plus className="h-4 w-4" /> Opção
                  </button>
                </div>
              </div>
            ))}
            <button
              onClick={() => setGrupos((l) => [...l, { nome: "", obrigatorio: false, max: "1", itens: [{ nome: "", preco: "" }] }])}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-linha py-3 text-[14px] font-semibold text-areia hover:border-brasa hover:text-papel"
            >
              <Plus className="h-4 w-4" /> Grupo de complementos
            </button>
          </div>
        </div>
      </div>

      <div className="border-t border-linha px-6 py-4">
        {erro && <p className="mb-3 rounded-xl bg-[#fde7e4] px-4 py-2.5 text-[14px] font-semibold text-[#9b2c1f]">{erro}</p>}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {produto ? (
            confirmarExcluir ? (
              <span className="flex items-center gap-2 text-[14px]">
                Excluir de vez?
                <button onClick={excluir} className="rounded-full bg-[#9b2c1f] px-3 py-1.5 font-semibold text-white">
                  Sim, excluir
                </button>
                <button onClick={() => setConfirmarExcluir(false)} className="font-semibold text-areia underline">
                  Não
                </button>
              </span>
            ) : (
              <button onClick={() => setConfirmarExcluir(true)} className="flex items-center gap-1 text-[14px] font-semibold text-areia hover:text-[#9b2c1f]">
                <Trash2 className="h-4 w-4" /> Excluir
              </button>
            )
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button onClick={fechar} className="rounded-full border border-linha px-5 py-2.5 text-[14px] font-semibold">
              Cancelar
            </button>
            <button onClick={salvar} disabled={salvando || enviandoFoto} className="rounded-full bg-brasa px-6 py-2.5 text-[14px] font-semibold text-carvao hover:bg-mostarda disabled:opacity-60">
              {salvando ? "Salvando…" : "Salvar"}
            </button>
          </div>
        </div>
      </div>
    </Janela>
  );
}

function GerirCategorias({ fechar, avisar }: { fechar: () => void; avisar: (t: string) => void }) {
  const d = useDados();
  const { duplo, visto } = useContext(Visto);
  const nomesCard = d.loja.cardapio_nomes?.length === 2 ? d.loja.cardapio_nomes : ["Dia", "Noite"];
  const [nova, setNova] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const contagem = (c: string) => d.cardapioTodo.filter((p) => p.cat === c).length;

  return (
    <Janela titulo="Categorias" fechar={fechar} largura={520}>
      <div className="flex-1 space-y-2 overflow-y-auto px-6 py-5">
        <p className="text-[14px] text-areia">A ordem aqui é a ordem que o cliente vê na loja. Toque no nome para renomear.</p>
        {d.categoriasTodas.map((c, i) => (
          <div key={c} className="flex items-center gap-2 rounded-xl bg-grafite px-3 py-2">
            <input
              aria-label={`Nome da categoria ${c}`}
              defaultValue={c}
              onBlur={async (e) => {
                const v = e.target.value.trim();
                if (v === c) return;
                const r = await d.acoes.renomearCategoria(c, v);
                if (r) {
                  setErro(r);
                  e.target.value = c;
                } else avisar(`Categoria renomeada para ${v}`);
              }}
              className="min-w-0 flex-1 bg-transparent py-1 text-[15px] font-semibold outline-none focus:underline"
            />
            <span className="text-[12px] text-fumo">{contagem(c)} itens</span>
            {duplo && (
              <select
                value={d.catCardapio[c] ?? 1}
                onChange={async (e) => {
                  const n = Number(e.target.value) as 0 | 1 | 2;
                  const r = await d.acoes.cardapioDaCategoria(c, n);
                  if (r) setErro(r);
                  else avisar(n === 0 ? `${c} aparece nos dois cardápios` : `${c} agora é do cardápio ${nomesCard[n - 1]}`);
                }}
                aria-label={`Cardápio da categoria ${c}`}
                className="rounded-lg border border-linha bg-carvao px-1.5 py-1 text-[12px]"
              >
                <option value={1}>{nomesCard[0]}</option>
                <option value={2}>{nomesCard[1]}</option>
                <option value={0}>Os dois</option>
              </select>
            )}
            <button onClick={() => d.acoes.moverCategoria(c, -1)} disabled={i === 0} aria-label={`Subir ${c}`} className="rounded-lg p-1.5 hover:bg-forno disabled:opacity-30">
              <ArrowUp className="h-4 w-4" />
            </button>
            <button onClick={() => d.acoes.moverCategoria(c, 1)} disabled={i === d.categoriasTodas.length - 1} aria-label={`Descer ${c}`} className="rounded-lg p-1.5 hover:bg-forno disabled:opacity-30">
              <ArrowDown className="h-4 w-4" />
            </button>
            <button
              onClick={async () => {
                const r = await d.acoes.excluirCategoria(c);
                if (r) setErro(r);
                else avisar(`Categoria ${c} excluída`);
              }}
              aria-label={`Excluir ${c}`}
              title={contagem(c) ? "Só dá para excluir categoria vazia" : "Excluir"}
              className="rounded-lg p-1.5 text-areia hover:bg-forno hover:text-[#9b2c1f]"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        <form
          className="flex gap-2 pt-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const r = await d.acoes.criarCategoria(nova, duplo ? visto : 1);
            if (r) setErro(r);
            else {
              avisar(`Categoria ${nova.trim()} criada`);
              setNova("");
              setErro(null);
            }
          }}
        >
          <input value={nova} onChange={(e) => setNova(e.target.value)} placeholder="Nova categoria" aria-label="Nova categoria" className={campo} />
          <button className="shrink-0 rounded-xl bg-brasa px-4 text-[14px] font-semibold text-carvao">Criar</button>
        </form>
        {erro && <p className="rounded-xl bg-[#fde7e4] px-4 py-2.5 text-[14px] font-semibold text-[#9b2c1f]">{erro}</p>}
      </div>
    </Janela>
  );
}

type Linha = { cat: string; nome: string; desc: string; preco: number };
/** Lê uma lista colada (do WhatsApp, do Word, do iFood). Linha sem preço vira categoria. */
export function lerLista(texto: string): Linha[] {
  const out: Linha[] = [];
  let cat = "Cardápio";
  for (const bruta of texto.split(/\r?\n/)) {
    const l = bruta
      .replace(/[•·*_]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!l) continue;
    const m = l.match(/^(.*?)[\s\-–—:.|]*(?:R\$\s*)?(\d{1,4}(?:[.,]\d{2})?)\s*(?:reais)?$/i);
    if (m && m[1].trim().length >= 2) {
      const partes = m[1].split(/\s[-–—|]\s|\s*:\s+/);
      const nome = partes[0]
        .trim()
        .replace(/[-–—:]+$/, "")
        .trim();
      const desc = partes.slice(1).join(" - ").trim();
      out.push({ cat, nome, desc, preco: lerPreco(m[2]) });
    } else {
      cat = l.replace(/[:\-–—]+$/, "").trim() || cat;
    }
  }
  return out;
}

// ---------------- Importar cardápio (arquivo com IA, CSV ou texto colado) ----------------

type Previa = { cat: string; nome: string; desc: string; preco: string; grupos: Grupo[]; incluir: boolean };
type RespostaIA = {
  categorias?: { nome: string; produtos: { nome: string; descricao?: string; preco: number | null; complementos?: { nome: string; obrigatorio: boolean; max: number; opcoes: { nome: string; preco: number }[] }[] }[] }[];
  avisos?: string[];
  erro?: string;
  semChave?: boolean;
};

const deIA = (r: RespostaIA): Previa[] =>
  (r.categorias ?? []).flatMap((c) =>
    c.produtos.map((p) => ({
      cat: c.nome || "Cardápio",
      nome: p.nome,
      desc: p.descricao ?? "",
      preco: p.preco == null ? "" : precoTxt(p.preco),
      grupos: (p.complementos ?? []).map((g) => ({ nome: g.nome, min: g.obrigatorio ? 1 : 0, max: Math.max(1, g.max || 1), itens: g.opcoes.map((o) => ({ nome: o.nome, preco: Number(o.preco) || 0 })) })),
      incluir: true,
    })),
  );
const deLinhas = (ls: Linha[]): Previa[] => ls.map((l) => ({ cat: l.cat, nome: l.nome, desc: l.desc, preco: precoTxt(l.preco), grupos: [], incluir: true }));

/** CSV/planilha exportada: colunas categoria; nome; descrição; preço (em qualquer ordem, com cabeçalho) ou texto livre. */
function lerCSV(texto: string): Previa[] {
  const linhas = texto.split(/\r?\n/).filter((l) => l.trim());
  if (!linhas.length) return [];
  const sep = (linhas[0].match(/;/g)?.length ?? 0) >= (linhas[0].match(/,/g)?.length ?? 0) ? ";" : linhas[0].includes("\t") ? "\t" : ",";
  const cel = (l: string) => l.split(sep).map((c) => c.replace(/^"|"$/g, "").trim());
  const cab = cel(linhas[0]).map((c) => c.toLowerCase());
  const idx = (...n: string[]) => cab.findIndex((c) => n.some((x) => c.includes(x)));
  const iNome = idx("nome", "produto", "item");
  const iPreco = idx("preço", "preco", "valor");
  if (iNome < 0 || iPreco < 0) return deLinhas(lerLista(linhas.map((l) => cel(l).join(" ")).join("\n")));
  const iCat = idx("categ", "grupo", "seção", "secao");
  const iDesc = idx("descr", "ingred");
  return linhas
    .slice(1)
    .map(cel)
    .filter((c) => c[iNome])
    .map((c) => ({ cat: (iCat >= 0 && c[iCat]) || "Cardápio", nome: c[iNome], desc: iDesc >= 0 ? (c[iDesc] ?? "") : "", preco: c[iPreco] ?? "", grupos: [], incluir: true }));
}

async function imagemBase64(f: File): Promise<{ tipo: string; base64: string }> {
  const url = URL.createObjectURL(f);
  try {
    const img = await new Promise<HTMLImageElement>((ok, falha) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => falha(new Error("img"));
      i.src = url;
    });
    const esc = Math.min(1, 1800 / Math.max(img.width, img.height));
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

const EXEMPLO_DEMO: RespostaIA = {
  categorias: [
    {
      nome: "Pizzas",
      produtos: [
        {
          nome: "Margherita",
          descricao: "Molho de tomate, mussarela e manjericão",
          preco: 42.9,
          complementos: [
            {
              nome: "Tamanho",
              obrigatorio: true,
              max: 1,
              opcoes: [
                { nome: "Média", preco: 0 },
                { nome: "Grande", preco: 12 },
              ],
            },
            {
              nome: "Borda",
              obrigatorio: false,
              max: 1,
              opcoes: [
                { nome: "Catupiry", preco: 8 },
                { nome: "Cheddar", preco: 8 },
              ],
            },
          ],
        },
        {
          nome: "Calabresa",
          descricao: "Calabresa fatiada e cebola",
          preco: 44.9,
          complementos: [
            {
              nome: "Tamanho",
              obrigatorio: true,
              max: 1,
              opcoes: [
                { nome: "Média", preco: 0 },
                { nome: "Grande", preco: 12 },
              ],
            },
          ],
        },
      ],
    },
    {
      nome: "Bebidas",
      produtos: [
        { nome: "Guaraná 2L", descricao: "", preco: 14, complementos: [] },
        { nome: "Água sem gás", descricao: "", preco: null, complementos: [] },
      ],
    },
  ],
  avisos: ["Não consegui ler o preço da Água sem gás. Confira."],
};

function ColarLista({ fechar, avisar }: { fechar: () => void; avisar: (t: string) => void }) {
  const d = useDados();
  const { duplo, visto } = useContext(Visto);
  const [aba, setAba] = useState<"arquivo" | "texto">("arquivo");
  const [texto, setTexto] = useState("");
  const [previa, setPrevia] = useState<Previa[] | null>(null);
  const [avisos, setAvisos] = useState<string[]>([]);
  const [lendo, setLendo] = useState<string | null>(null);
  const [indo, setIndo] = useState<number | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const entrada = useRef<HTMLInputElement>(null);

  const doTexto = useMemo(() => deLinhas(lerLista(texto)), [texto]);
  const lista = previa ?? (aba === "texto" ? doTexto : []);
  const escolhidos = lista.filter((p) => p.incluir);

  async function lerArquivos(fs: FileList | null) {
    if (!fs?.length) return;
    setErro(null);
    setAvisos([]);
    const todos = [...fs];
    // CSV / texto: lê aqui mesmo, sem IA
    if (todos.every((f) => /\.(csv|txt|tsv)$/i.test(f.name) || f.type.startsWith("text/"))) {
      const t = (await Promise.all(todos.map((f) => f.text()))).join("\n");
      const p = /\.(csv|tsv)$/i.test(todos[0].name) ? lerCSV(t) : deLinhas(lerLista(t));
      if (!p.length) return setErro("Não encontrei produtos com preço nesse arquivo.");
      return setPrevia(p);
    }
    if (todos.some((f) => /\.(xlsx?|ods)$/i.test(f.name))) return setErro("Planilha do Excel: salve como CSV (Arquivo → Salvar como → CSV) ou envie uma foto/PDF do cardápio.");
    const validos = todos.filter((f) => f.type.startsWith("image/") || f.type === "application/pdf");
    if (!validos.length) return setErro("Envie foto (JPG/PNG), PDF ou CSV.");
    if (d.modo === "demo") {
      setLendo("Lendo o cardápio…");
      await new Promise((r) => setTimeout(r, 1200));
      setLendo(null);
      setAvisos(["Demonstração: este é um cardápio de exemplo. Na loja real, a IA lê o seu arquivo.", ...(EXEMPLO_DEMO.avisos ?? [])]);
      return setPrevia(deIA(EXEMPLO_DEMO));
    }
    try {
      setLendo("Preparando o arquivo…");
      const arquivos = [];
      for (const f of validos.slice(0, 8)) {
        if (f.type === "application/pdf") {
          if (f.size > 3_000_000) throw new Error("O PDF passa de 3 MB. Envie fotos das páginas ou um PDF menor.");
          arquivos.push({ tipo: "application/pdf", base64: await arquivoBase64(f) });
        } else arquivos.push(await imagemBase64(f));
      }
      if (arquivos.reduce((s, a) => s + a.base64.length, 0) > 4_200_000) throw new Error("Arquivos grandes demais de uma vez. Importe em duas partes.");
      setLendo(`A IA está lendo ${arquivos.length > 1 ? `${arquivos.length} páginas` : "o cardápio"}… pode levar até 1 minuto`);
      const { data } = await supabase!.auth.getSession();
      const r = await fetch("/api/cardapio/ler", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}` },
        body: JSON.stringify({ arquivos }),
      });
      const corpo: RespostaIA = await r.json().catch(() => ({ erro: `O servidor respondeu ${r.status}` }));
      if (!r.ok || corpo.erro) throw new Error(corpo.erro ?? "Não consegui ler.");
      const p = deIA(corpo);
      if (!p.length) throw new Error("Não encontrei produtos. Tente uma foto mais nítida e de frente.");
      setAvisos(corpo.avisos ?? []);
      setPrevia(p);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setLendo(null);
    }
  }

  const mudar = (i: number, m: Partial<Previa>) => {
    const base = previa ?? doTexto;
    setPrevia(base.map((p, j) => (j === i ? { ...p, ...m } : p)));
  };

  async function cadastrar() {
    setErro(null);
    const ruins = escolhidos.filter((p) => !Number.isFinite(lerPreco(p.preco)) || p.nome.trim().length < 2);
    if (ruins.length) return setErro(`Confira ${ruins.length === 1 ? `“${ruins[0].nome || "sem nome"}”` : `${ruins.length} produtos`}: falta nome ou preço. Corrija ou desmarque.`);
    setIndo(0);
    let falhas = 0;
    const antes = new Set(d.categoriasTodas.map((c) => c.toLowerCase()));
    for (let i = 0; i < escolhidos.length; i++) {
      const p = escolhidos[i];
      const e = await d.acoes.salvarProduto({ categoria: p.cat.trim() || "Cardápio", nome: p.nome, descricao: p.desc, preco: lerPreco(p.preco), maisPedido: false, esgotado: false, grupos: p.grupos }, { semRecarregar: i < escolhidos.length - 1 });
      if (e) falhas++;
      setIndo(i + 1);
    }
    if (duplo && visto === 2) for (const c of new Set(escolhidos.map((p) => p.cat.trim() || "Cardápio"))) if (!antes.has(c.toLowerCase())) await d.acoes.cardapioDaCategoria(c, 2);
    if (falhas) {
      await d.acoes.recarregar();
      setErro(`${escolhidos.length - falhas} cadastrados, ${falhas} não entraram (talvez já existam). Confira.`);
      setIndo(null);
      return;
    }
    avisar(`${escolhidos.length} produtos cadastrados. Agora coloque as fotos`);
    fechar();
  }

  const cats = [...new Set(lista.map((p) => p.cat))];

  return (
    <Janela titulo="Importar cardápio" fechar={fechar} largura={720}>
      <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
        {!previa && (
          <>
            <div className="flex gap-1 rounded-full bg-grafite p-1 text-[14px] font-semibold">
              {(["arquivo", "texto"] as const).map((a) => (
                <button key={a} onClick={() => setAba(a)} className={`flex-1 rounded-full py-2 ${aba === a ? "bg-forno shadow" : "text-areia"}`}>
                  {a === "arquivo" ? "Enviar arquivo" : "Colar texto"}
                </button>
              ))}
            </div>
            {aba === "arquivo" ? (
              <>
                <input ref={entrada} type="file" multiple accept="image/*,application/pdf,.csv,.txt,.tsv,text/csv,text/plain" className="hidden" onChange={(e) => lerArquivos(e.target.files)} />
                <button
                  onClick={() => entrada.current?.click()}
                  disabled={!!lendo}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    lerArquivos(e.dataTransfer.files);
                  }}
                  className="flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-linha py-10 text-center text-areia hover:border-brasa hover:text-papel disabled:opacity-70"
                >
                  <ImageUp className="h-9 w-9" />
                  <span className="font-semibold">{lendo ?? "Escolher foto, PDF ou planilha (CSV)"}</span>
                  <span className="px-6 text-[13px]">Pode mandar várias fotos de uma vez (uma por página). Foto de frente, com boa luz, lê melhor.</span>
                </button>
                {lendo && (
                  <div className="h-1.5 overflow-hidden rounded-full bg-grafite">
                    <div className="h-full w-1/3 animate-[carregar_1.2s_ease-in-out_infinite] rounded-full bg-brasa" />
                  </div>
                )}
              </>
            ) : (
              <>
                <p className="text-[14px] text-areia">Cole o cardápio em texto (WhatsApp, Word, iFood). Uma linha por produto com o preço no fim. Linha sem preço vira categoria.</p>
                <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={8} aria-label="Lista de produtos" placeholder={"Pizzas\nMargherita - molho, mussarela e manjericão - 49,90\nCalabresa 52,00\n\nBebidas\nCoca-Cola lata 7,00"} className={`${campo} font-mono text-[14px]`} />
              </>
            )}
          </>
        )}

        {avisos.length > 0 && (
          <ul className="space-y-1 rounded-2xl bg-mostarda/20 px-4 py-3 text-[13px]">
            {avisos.map((a, i) => (
              <li key={i}>⚠️ {a}</li>
            ))}
          </ul>
        )}

        {lista.length > 0 && (
          <div className="rounded-2xl border border-linha">
            <div className="flex items-center justify-between gap-3 border-b border-linha px-4 py-2 text-[13px] font-semibold text-areia">
              <span>
                {escolhidos.length} de {lista.length} produtos · {cats.length} categoria{cats.length > 1 ? "s" : ""}
              </span>
              {previa && (
                <button
                  onClick={() => {
                    setPrevia(null);
                    setAvisos([]);
                  }}
                  className="underline"
                >
                  Começar de novo
                </button>
              )}
            </div>
            <div className={`${previa ? "max-h-[52vh]" : "max-h-56"} overflow-y-auto`}>
              {cats.map((c) => (
                <div key={c}>
                  <input
                    aria-label={`Categoria ${c}`}
                    value={c}
                    onChange={(e) => {
                      const base = previa ?? doTexto;
                      setPrevia(base.map((p) => (p.cat === c ? { ...p, cat: e.target.value } : p)));
                    }}
                    className="w-full bg-grafite px-4 py-1.5 text-[13px] font-bold uppercase tracking-wide outline-none"
                  />
                  {lista.map((p, i) =>
                    p.cat !== c ? null : (
                      <div key={i} className={`flex items-start gap-3 border-b border-linha px-4 py-2 last:border-0 ${p.incluir ? "" : "opacity-45"}`}>
                        <input type="checkbox" checked={p.incluir} onChange={(e) => mudar(i, { incluir: e.target.checked })} aria-label={`Incluir ${p.nome}`} className="mt-2 h-4 w-4 accent-[#e8541e]" />
                        <div className="min-w-0 flex-1">
                          <input value={p.nome} onChange={(e) => mudar(i, { nome: e.target.value })} aria-label="Nome" className="w-full bg-transparent py-1 text-[14px] font-semibold outline-none focus:underline" />
                          {(p.desc || p.grupos.length > 0) && (
                            <p className="truncate text-[12px] text-areia">
                              {p.desc}
                              {p.grupos.length > 0 && (
                                <span className="text-brasa">
                                  {p.desc ? " · " : ""}
                                  {p.grupos.map((g) => `${g.nome} (${g.itens.length})`).join(", ")}
                                </span>
                              )}
                            </p>
                          )}
                        </div>
                        <input
                          value={p.preco}
                          onChange={(e) => mudar(i, { preco: e.target.value })}
                          aria-label={`Preço de ${p.nome}`}
                          inputMode="decimal"
                          placeholder="preço"
                          className={`tabular w-20 shrink-0 rounded-lg border px-2 py-1 text-right text-[14px] font-semibold outline-none ${Number.isFinite(lerPreco(p.preco)) ? "border-transparent bg-transparent" : "border-[#9b2c1f] bg-[#fde7e4]"}`}
                        />
                      </div>
                    ),
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="border-t border-linha px-6 py-4">
        {erro && <p className="mb-3 rounded-xl bg-[#fde7e4] px-4 py-2.5 text-[14px] font-semibold text-[#9b2c1f]">{erro}</p>}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[12px] text-fumo">{lista.length ? "Toque no nome ou no preço para corrigir antes de cadastrar." : ""}</p>
          <div className="flex gap-2">
            <button onClick={fechar} className="rounded-full border border-linha px-5 py-2.5 text-[14px] font-semibold">
              Cancelar
            </button>
            <button onClick={cadastrar} disabled={!escolhidos.length || indo !== null} className="rounded-full bg-brasa px-6 py-2.5 text-[14px] font-semibold text-carvao hover:bg-mostarda disabled:opacity-50">
              {indo !== null ? `Cadastrando ${indo}/${escolhidos.length}…` : `Cadastrar ${escolhidos.length || ""} produtos`}
            </button>
          </div>
        </div>
      </div>
    </Janela>
  );
}
