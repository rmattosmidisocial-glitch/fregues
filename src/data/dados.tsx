import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";
import * as M from "./mock";
import type { Freguês, Pedido, Produto, StatusPedido, Zona } from "./mock";
import { nomeBairro } from "../components/GeoMap";

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
// Cada restaurante tem um endereço: ?r=slug. Sem isso, abre a loja de demonstração.
const lerSlug = () => {
  try {
    return new URLSearchParams(window.location.search).get("r") || localStorage.getItem("fregues-loja") || "brasa-burger";
  } catch {
    return "brasa-burger";
  }
};
export const SLUG = lerSlug();
export const supabase: SupabaseClient | null = URL && KEY ? createClient(URL, KEY) : null;
export const MODO: "real" | "demo" = supabase ? "real" : "demo";

export type Loja = typeof M.LOJA & { id?: string };
export type Pulso = { risco: number; recuperado: number; voltaram: number; ritmo: number; atrasado: number; sumindo: number; total: number; comissao: number };
export type DiaSemana = { dia: string; propria: number; marketplace: number };
export type Entrega = {
  atende: boolean;
  bairro: string | null;
  municipio?: string | null;
  zona?: string | null;
  taxa?: number;
  tempo_min?: number;
  tempo_max?: number;
  pedido_minimo?: number;
  gratis_acima?: number | null;
};
export type NovoPedido = {
  modo: "entrega" | "retirada";
  cliente: { nome: string; telefone: string; aceita_marketing: boolean };
  itens: { product_id: string; qtd: number; escolhas: string[]; obs?: string }[];
  ponto?: { lon: number; lat: number };
  endereco?: { rua: string; numero: string; complemento: string };
  pagamento: "pix" | "cartao" | "dinheiro" | "maquininha";
  usar_cashback: boolean;
  avisar_quando_atender?: boolean;
};
export type ProdutoEdit = {
  id?: string;
  categoria: string;
  nome: string;
  descricao: string;
  preco: number;
  promo?: number;
  foto?: string;
  maisPedido: boolean;
  esgotado: boolean;
  grupos: M.Grupo[];
};

/** Reduz a foto no próprio aparelho (lado maior 900px, WebP) antes de enviar. */
async function reduzirFoto(arquivo: File): Promise<Blob> {
  const url = URL_.createObjectURL(arquivo);
  try {
    const img = await new Promise<HTMLImageElement>((ok, falha) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => falha(new Error("img"));
      i.src = url;
    });
    const esc = Math.min(1, 900 / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * esc);
    c.height = Math.round(img.height * esc);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return await new Promise<Blob>((ok, falha) => c.toBlob((b) => (b ? ok(b) : falha(new Error("blob"))), "image/webp", 0.82));
  } finally {
    URL_.revokeObjectURL(url);
  }
}
const URL_ = globalThis.URL;

export type PedidoCriado = { id: string; numero: number; total: number; desconto: number; taxa: number; tempo_min: number; tempo_max: number; erro?: string; fora_da_area?: boolean };

type Dados = {
  modo: "real" | "demo";
  carregando: boolean;
  erro: string | null;
  sessao: Session | null;
  loja: Loja;
  zonas: Zona[];
  cardapio: Produto[];
  categorias: string[];
  fregueses: Freguês[];
  pedidos: Pedido[];
  pulso: Pulso;
  semana: DiaSemana[];
  demanda: Record<string, number>;
  acoes: {
    entrar: (email: string, senha: string) => Promise<string | null>;
    sair: () => Promise<void>;
    moverBairro: (bairroId: string, destino: string | null) => Promise<void>;
    atenderMunicipio: (cod: string, destino: string | null) => Promise<void>;
    editarZona: (id: string, campo: "taxa" | "minimo" | "t1", valor: number) => Promise<void>;
    toggleEsgotado: (id: string) => Promise<void>;
    /** Cria ou edita um produto (com complementos). Devolve a mensagem de erro, ou null. */
    salvarProduto: (p: ProdutoEdit, opcoes?: { semRecarregar?: boolean }) => Promise<string | null>;
    criarCategoria: (nome: string) => Promise<string | null>;
    excluirProduto: (id: string) => Promise<string | null>;
    enviarFoto: (arquivo: File) => Promise<{ url?: string; erro?: string }>;
    renomearCategoria: (antigo: string, novo: string) => Promise<string | null>;
    moverCategoria: (nome: string, direcao: -1 | 1) => Promise<void>;
    excluirCategoria: (nome: string) => Promise<string | null>;
    avancarPedido: (num: number, status: StatusPedido, motoboy?: string) => Promise<void>;
    pagarPedido: (num: number, forma: NonNullable<Pedido["forma"]>) => Promise<string | null>;
    cancelarPedido: (num: number, motivo: string) => Promise<string | null>;
    setAberta: (v: boolean) => Promise<void>;
    resolverEntrega: (coord: [number, number], bairroLocalId: string | null) => Promise<Entrega>;
    fazerPedido: (p: NovoPedido) => Promise<PedidoCriado>;
    statusPedido: (id: string) => Promise<{ status: StatusPedido; pago: boolean } | null>;
    confirmarPixDemo: (id: string) => Promise<void>;
    saldoCashback: (tel: string) => Promise<number>;
    recarregar: () => Promise<void>;
    /** Demonstração: coloca um pedido no quadro da cozinha (o modo real recebe pelo banco). */
    pedidoLocal: (p: Pedido) => void;
  };
};

const Ctx = createContext<Dados | null>(null);
export const useDados = () => {
  const d = useContext(Ctx);
  if (!d) throw new Error("useDados fora do provedor");
  return d;
};

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const PAG: Record<string, Pedido["pag"]> = { pix: "Pix pago", cartao: "Cartão online", dinheiro: "Dinheiro (troco p/ 100)", maquininha: "Maquininha" };
const fmtTel = (t: string) => (t.length === 11 ? `(${t.slice(0, 2)}) ${t.slice(2, 7)}-${t.slice(7)}` : t);

const pulsoDemo: Pulso = { ...M.pulsoResumo, voltaram: 41, total: M.FREGUESES.length, comissao: 0.12 };

export function DadosProvider({ children }: { children: React.ReactNode }) {
  const [sessao, setSessao] = useState<Session | null>(null);
  const [carregando, setCarregando] = useState(MODO === "real");
  const [erro, setErro] = useState<string | null>(null);
  const [loja, setLoja] = useState<Loja>(M.LOJA);
  const [zonas, setZonas] = useState<Zona[]>(() => M.ZONAS.map((z) => ({ ...z, bairros: [...z.bairros] })));
  const [cardapio, setCardapio] = useState<Produto[]>(M.CARDAPIO);
  const [categorias, setCategorias] = useState<string[]>(M.CATEGORIAS);
  const [fregueses, setFregueses] = useState<Freguês[]>(M.FREGUESES);
  const [pedidos, setPedidos] = useState<Pedido[]>(M.PEDIDOS);
  const [pulso, setPulso] = useState<Pulso>(pulsoDemo);
  const [semana, setSemana] = useState<DiaSemana[]>(M.VENDAS_SEMANA);
  const [demanda, setDemanda] = useState<Record<string, number>>(M.DEMANDA_FORA);

  // ---------- leitura pública: loja, zonas, cardápio ----------
  const carregarPublico = useCallback(async () => {
    if (!supabase) return;
    const { data: s, error } = await supabase.from("stores").select("id,nome,slug,bairro,nota,avaliacoes,horario,aberta").eq("slug", SLUG).single();
    if (error || !s) {
      setErro("Não foi possível abrir a loja agora.");
      return;
    }
    setLoja({ ...M.LOJA, ...s, nota: Number(s.nota), aberto: s.aberta } as Loja);
    const [{ data: zs }, { data: zb }, { data: zm }, { data: cats }, { data: prods }] = await Promise.all([
      supabase.from("delivery_zones").select("*").eq("store_id", s.id).order("ordem"),
      supabase.from("zone_bairros").select("zone_id, bairro_id").eq("store_id", s.id),
      supabase.from("zone_municipios").select("zone_id, municipio_cod").eq("store_id", s.id),
      supabase.from("categories").select("id,nome,ordem").eq("store_id", s.id).order("ordem"),
      supabase
        .from("products")
        .select("id,nome,descricao,preco,preco_promo,foto_url,arte,tags,esgotado,mais_pedido,ordem,categories(nome),option_groups(id,nome,min,max,ordem,options(id,nome,preco,ordem))")
        .eq("store_id", s.id)
        .order("ordem"),
    ]);
    setZonas(
      (zs ?? []).map((z) => ({
        id: z.id,
        nome: z.nome,
        cor: z.cor,
        taxa: Number(z.taxa),
        tempo: [z.tempo_min, z.tempo_max] as [number, number],
        minimo: Number(z.pedido_minimo),
        gratisAcima: z.gratis_acima ? Number(z.gratis_acima) : undefined,
        bairros: (zb ?? []).filter((x) => x.zone_id === z.id).map((x) => x.bairro_id as string),
        municipios: (zm ?? []).filter((x) => x.zone_id === z.id).map((x) => x.municipio_cod as string),
      })),
    );
    setCategorias((cats ?? []).map((c) => c.nome));
    setCardapio(
      (prods ?? []).map((p) => ({
        id: p.id,
        cat: (p.categories as unknown as { nome: string }).nome,
        nome: p.nome,
        desc: p.descricao ?? "",
        preco: Number(p.preco),
        promo: p.preco_promo ? Number(p.preco_promo) : undefined,
        arte: p.arte as M.Arte,
        foto: p.foto_url ?? undefined,
        tags: p.tags,
        esgotado: p.esgotado,
        maisPedido: p.mais_pedido,
        grupos: ((p.option_groups as unknown as { id: string; nome: string; min: number; max: number; ordem: number; options: { id: string; nome: string; preco: number; ordem: number }[] }[]) ?? [])
          .sort((a, b) => a.ordem - b.ordem)
          .map((g) => ({ nome: g.nome, min: g.min, max: g.max, itens: g.options.sort((a, b) => a.ordem - b.ordem).map((o) => ({ id: o.id, nome: o.nome, preco: Number(o.preco) })) })),
      })),
    );
  }, []);

  // ---------- leitura do painel (precisa estar logado) ----------
  const carregarPainel = useCallback(async (storeId?: string) => {
    if (!supabase || !storeId) return;
    const desde = new Date(Date.now() - 14 * 3600 * 1000).toISOString();
    const [{ data: cp, error: e1 }, { data: ps }, { data: ords }, { data: dem }] = await Promise.all([
      supabase.from("customer_pulse").select("*").order("gasto", { ascending: false }).limit(1000),
      supabase.rpc("pulse_summary", { p_store: storeId }),
      supabase
        .from("orders")
        .select("id,numero,status,modo,mesa,total,pagamento,pago,motoboy,observacao,created_at,endereco,customers(nome,telefone),order_items(nome,qtd,escolhas)")
        .eq("store_id", storeId)
        .gte("created_at", desde)
        .order("created_at", { ascending: false })
        .limit(80),
      supabase.rpc("demanda_fora", { p_store: storeId }),
    ]);
    if (e1) {
      setErro("Sua conta ainda não tem acesso a esta loja.");
      return;
    }
    setFregueses(
      (cp ?? []).map((c) => ({
        id: c.id,
        nome: c.nome,
        tel: fmtTel(c.telefone),
        bairro: c.bairro ?? "Sem bairro",
        bairroId: c.bairro_id ?? undefined,
        pedidos: c.pedidos,
        ticket: Number(c.ticket),
        intervalo: c.intervalo,
        diasDesde: c.dias_desde,
        favorito: c.favorito ?? "—",
        status: c.status,
        nivel: c.nivel,
        canal: c.canal ?? "Loja própria",
        horario: c.dow !== null ? `${["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"][c.dow]}, ${c.hora}h` : "—",
        aniversario: c.aniversario ? new Date(c.aniversario + "T12:00").toLocaleDateString("pt-BR", { day: "numeric", month: "short" }) : undefined,
        tags: c.tags ?? [],
        pontos: Math.round(Number(c.gasto)),
      })),
    );
    if (ps) {
      setPulso(ps as Pulso);
      setSemana(
        ((ps as { semana: { dia: string; propria: number }[] }).semana ?? []).map((d) => ({
          dia: DIAS[new Date(d.dia + "T12:00").getDay()],
          propria: Number(d.propria),
          marketplace: 0,
        })),
      );
    }
    setPedidos(
      (ords ?? []).filter((o) => o.status !== "cancelado").map((o) => ({
        id: o.id,
        num: o.numero,
        cliente: o.modo === "mesa" ? `Mesa ${o.mesa ?? ""}` : (o.customers as unknown as { nome: string } | null)?.nome ?? (o.modo === "balcao" ? o.observacao || "Balcão" : "Cliente"),
        bairro: o.modo === "retirada" ? "Retirada" : o.modo === "balcao" ? "Balcão" : o.modo === "mesa" ? "Salão" : ((o.endereco as { bairro?: string } | null)?.bairro ?? ""),
        itens: ((o.order_items as unknown as { nome: string; qtd: number; escolhas: string[] }[]) ?? []).flatMap((i) => [
          `${i.qtd}x ${i.nome}`,
          ...(i.escolhas?.length ? [`+ ${i.escolhas.join(", ")}`] : []),
        ]),
        total: Number(o.total),
        pag: o.pagamento === "pix" && !o.pago ? ("Pix pendente" as Pedido["pag"]) : PAG[o.pagamento],
        modo: o.modo === "entrega" ? "Entrega" : o.modo === "retirada" ? "Retirada" : o.modo === "balcao" ? "Balcão" : (`Mesa ${o.mesa ?? ""}` as Pedido["modo"]),
        min: Math.max(0, Math.round((Date.now() - new Date(o.created_at).getTime()) / 60000)),
        status: o.status,
        motoboy: o.motoboy ?? undefined,
        nota: o.observacao ?? undefined,
        tel: (o.customers as unknown as { telefone?: string } | null)?.telefone ? fmtTel((o.customers as unknown as { telefone: string }).telefone) : undefined,
        endereco: (o.endereco as Pedido["endereco"]) ?? undefined,
        pago: o.pago,
        forma: o.pagamento,
        criadoEm: o.created_at,
      })),
    );
    setDemanda(Object.fromEntries(((dem as { bairro_id: string; tentativas: number }[]) ?? []).filter((d) => d.bairro_id).map((d) => [d.bairro_id, Number(d.tentativas)])));
  }, []);

  const recarregar = useCallback(async () => {
    await carregarPublico();
  }, [carregarPublico]);

  useEffect(() => {
    if (!supabase) return;
    (async () => {
      const { data } = await supabase.auth.getSession();
      setSessao(data.session);
      await carregarPublico();
      setCarregando(false);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSessao(s));
    return () => sub.subscription.unsubscribe();
  }, [carregarPublico]);

  // Ao entrar: aceita convites do e-mail e abre a loja da qual a pessoa é dona ou equipe.
  useEffect(() => {
    if (!supabase || !sessao) return;
    (async () => {
      await supabase.rpc("aceitar_convites");
      const { data: ms } = await supabase.from("memberships").select("org_id").eq("user_id", sessao.user.id);
      if (!ms?.length) return;
      const { data: st } = await supabase.from("stores").select("slug").in("org_id", ms.map((m) => m.org_id)).order("created_at").limit(1);
      const slug = st?.[0]?.slug;
      if (slug && slug !== SLUG) {
        try {
          localStorage.setItem("fregues-loja", slug);
        } catch {
          /* sem armazenamento: segue pelo endereço */
        }
        window.location.search = `?r=${slug}`;
      }
    })();
  }, [sessao]);

  useEffect(() => {
    if (!supabase || !sessao || !loja.id) return;
    carregarPainel(loja.id);
    const canal = supabase
      .channel("pedidos-" + loja.id)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `store_id=eq.${loja.id}` }, () => carregarPainel(loja.id))
      .subscribe();
    const t = setInterval(() => carregarPainel(loja.id), 60000);
    return () => {
      supabase.removeChannel(canal);
      clearInterval(t);
    };
  }, [sessao, loja.id, carregarPainel]);

  // ---------- ações ----------
  const acoes: Dados["acoes"] = useMemo(
    () => ({
      async entrar(email, senha) {
        if (!supabase) return null;
        const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
        return error ? "E-mail ou senha incorretos." : null;
      },
      async sair() {
        await supabase?.auth.signOut();
        try {
          localStorage.removeItem("fregues-loja");
        } catch {
          /* nada */
        }
      },
      async moverBairro(id, destino) {
        setZonas((zs) => zs.map((z) => ({ ...z, bairros: z.id === destino ? [...z.bairros.filter((b) => b !== id), id] : z.bairros.filter((b) => b !== id) })));
        if (!supabase || !loja.id) return;
        await supabase.from("zone_bairros").delete().eq("store_id", loja.id).eq("bairro_id", id);
        if (destino) await supabase.from("zone_bairros").insert({ zone_id: destino, bairro_id: id, store_id: loja.id });
      },
      async atenderMunicipio(cod, destino) {
        setZonas((zs) =>
          zs.map((z) => {
            const ms = (z.municipios ?? []).filter((m) => m !== cod);
            return { ...z, municipios: z.id === destino ? [...ms, cod] : ms };
          }),
        );
        if (!supabase || !loja.id) return;
        await supabase.from("zone_municipios").delete().eq("store_id", loja.id).eq("municipio_cod", cod);
        if (destino) await supabase.from("zone_municipios").insert({ zone_id: destino, municipio_cod: cod, store_id: loja.id });
      },
      async editarZona(id, campo, valor) {
        setZonas((zs) => zs.map((z) => (z.id !== id ? z : campo === "t1" ? { ...z, tempo: [z.tempo[0], valor] } : { ...z, [campo]: valor })));
        if (!supabase || Number.isNaN(valor)) return;
        const col = campo === "taxa" ? { taxa: valor } : campo === "minimo" ? { pedido_minimo: valor } : { tempo_max: valor };
        await supabase.from("delivery_zones").update(col).eq("id", id);
      },
      async toggleEsgotado(id) {
        let novo = false;
        setCardapio((l) =>
          l.map((p) => {
            if (p.id !== id) return p;
            novo = !p.esgotado;
            return { ...p, esgotado: novo };
          }),
        );
        if (supabase) await supabase.from("products").update({ esgotado: novo }).eq("id", id);
      },
      async criarCategoria(nome) {
        const n = nome.trim();
        if (!n) return "Dê um nome à categoria";
        if (categorias.some((c) => c.toLowerCase() === n.toLowerCase())) return "Já existe uma categoria com esse nome";
        setCategorias((cs) => [...cs, n]);
        if (!supabase || !loja.id) return null;
        const { error } = await supabase.from("categories").insert({ store_id: loja.id, nome: n, ordem: categorias.length });
        return error ? error.message : null;
      },
      async salvarProduto(p, opcoes) {
        const nome = p.nome.trim();
        const cat = p.categoria.trim();
        if (nome.length < 2) return "Dê um nome ao produto";
        if (!cat) return "Escolha uma categoria";
        if (!(p.preco >= 0)) return "Preço inválido";
        if (p.promo != null && p.promo >= p.preco) return "O preço promocional precisa ser menor que o preço normal";
        const grupos = p.grupos
          .filter((g) => g.nome.trim())
          .map((g) => ({ ...g, nome: g.nome.trim(), itens: g.itens.filter((o) => o.nome.trim()) }));
        if (!supabase) {
          setCategorias((cs) => (cs.some((c) => c.toLowerCase() === cat.toLowerCase()) ? cs : [...cs, cat]));
          const catFinal = categorias.find((c) => c.toLowerCase() === cat.toLowerCase()) ?? cat;
          const base = { cat: catFinal, nome, desc: p.descricao.trim(), preco: p.preco, promo: p.promo, foto: p.foto, esgotado: p.esgotado, maisPedido: p.maisPedido, grupos };
          setCardapio((l) => (p.id ? l.map((x) => (x.id === p.id ? { ...x, ...base } : x)) : [...l, { id: "n" + Date.now() + Math.random().toString(36).slice(2, 6), arte: "sem", ...base }]));
          return null;
        }
        if (!loja.id) return "Loja não carregada";
        const { error } = await supabase.rpc("produto_salvar", {
          p_store: loja.id,
          p: {
            id: p.id ?? "",
            categoria: cat,
            nome,
            descricao: p.descricao,
            preco: p.preco,
            preco_promo: p.promo ?? "",
            foto_url: p.foto ?? "",
            mais_pedido: p.maisPedido,
            esgotado: p.esgotado,
            grupos: grupos.map((g) => ({ nome: g.nome, min: g.min, max: g.max, itens: g.itens.map((o) => ({ nome: o.nome, preco: o.preco })) })),
          },
        });
        if (error) return error.message;
        if (!opcoes?.semRecarregar) await recarregar();
        return null;
      },
      async excluirProduto(id) {
        setCardapio((l) => l.filter((p) => p.id !== id));
        if (!supabase) return null;
        const { error } = await supabase.from("products").delete().eq("id", id);
        if (error) {
          await recarregar();
          return error.message;
        }
        return null;
      },
      async enviarFoto(arquivo) {
        let blob: Blob;
        try {
          blob = await reduzirFoto(arquivo);
        } catch {
          return { erro: "Não consegui abrir essa imagem. Tente uma foto JPG ou PNG." };
        }
        if (!supabase) return { url: URL_.createObjectURL(blob) };
        if (!loja.id) return { erro: "Loja não carregada" };
        const caminho = `${loja.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
        const { error } = await supabase.storage.from("produtos").upload(caminho, blob, { contentType: "image/webp", upsert: false });
        if (error) return { erro: "Não consegui enviar a foto: " + error.message };
        return { url: supabase.storage.from("produtos").getPublicUrl(caminho).data.publicUrl };
      },
      async renomearCategoria(antigo, novo) {
        const n = novo.trim();
        if (!n) return "Dê um nome à categoria";
        if (n !== antigo && categorias.some((c) => c.toLowerCase() === n.toLowerCase())) return "Já existe uma categoria com esse nome";
        setCategorias((cs) => cs.map((c) => (c === antigo ? n : c)));
        setCardapio((l) => l.map((p) => (p.cat === antigo ? { ...p, cat: n } : p)));
        if (!supabase || !loja.id) return null;
        const { error } = await supabase.from("categories").update({ nome: n }).eq("store_id", loja.id).eq("nome", antigo);
        return error ? error.message : null;
      },
      async moverCategoria(nome, direcao) {
        const i = categorias.indexOf(nome);
        const j = i + direcao;
        if (i < 0 || j < 0 || j >= categorias.length) return;
        const nova = [...categorias];
        [nova[i], nova[j]] = [nova[j], nova[i]];
        setCategorias(nova);
        if (!supabase || !loja.id) return;
        await Promise.all(nova.map((c, ordem) => supabase!.from("categories").update({ ordem }).eq("store_id", loja.id).eq("nome", c)));
      },
      async excluirCategoria(nome) {
        if (cardapio.some((p) => p.cat === nome)) return "Mova ou exclua os produtos dessa categoria antes";
        setCategorias((cs) => cs.filter((c) => c !== nome));
        if (!supabase || !loja.id) return null;
        const { error } = await supabase.from("categories").delete().eq("store_id", loja.id).eq("nome", nome);
        return error ? error.message : null;
      },
      async avancarPedido(num, status, motoboy) {
        setPedidos((l) => l.map((p) => (p.num === num ? { ...p, status, motoboy: motoboy ?? p.motoboy } : p)));
        if (supabase && loja.id) await supabase.from("orders").update({ status, ...(motoboy ? { motoboy } : {}) }).eq("store_id", loja.id).eq("numero", num);
      },
      async pagarPedido(num, forma) {
        const p = pedidos.find((x) => x.num === num);
        if (supabase && p?.id) {
          const { error } = await supabase.rpc("pedido_pagar", { p_pedido: p.id, p_forma: forma });
          if (error) return error.message.replace(/^.*?:\s*/, "");
        }
        const rot: Record<string, Pedido["pag"]> = { pix: "Pix pago", cartao: "Cartão online", dinheiro: "Dinheiro (troco p/ 100)", maquininha: "Maquininha" };
        setPedidos((l) => l.map((x) => (x.num === num ? { ...x, pago: true, forma, pag: rot[forma] } : x)));
        return null;
      },
      async cancelarPedido(num, motivo) {
        const p = pedidos.find((x) => x.num === num);
        if (supabase && p?.id) {
          const { error } = await supabase.rpc("pedido_cancelar", { p_pedido: p.id, p_motivo: motivo });
          if (error) return error.message.replace(/^.*?:\s*/, "");
        }
        setPedidos((l) => l.filter((x) => x.num !== num));
        return null;
      },
      async setAberta(v) {
        setLoja((l) => ({ ...l, aberto: v }));
        if (supabase && loja.id) await supabase.from("stores").update({ aberta: v }).eq("id", loja.id);
      },
      async resolverEntrega(coord, bairroLocalId) {
        if (supabase && loja.id) {
          const { data } = await supabase.rpc("resolve_delivery", { p_store: loja.id, p_lon: coord[0], p_lat: coord[1] });
          if (data) {
            const d = data as Entrega & Record<string, unknown>;
            return { ...d, taxa: Number(d.taxa ?? 0), pedido_minimo: Number(d.pedido_minimo ?? 0), gratis_acima: d.gratis_acima ? Number(d.gratis_acima) : null };
          }
        }
        const z = bairroLocalId ? zonas.find((x) => x.bairros.includes(bairroLocalId)) : undefined;
        const bairro = bairroLocalId ? nomeBairro(bairroLocalId) : null;
        return z
          ? { atende: true, bairro, zona: z.nome, taxa: z.taxa, tempo_min: z.tempo[0], tempo_max: z.tempo[1], pedido_minimo: z.minimo, gratis_acima: z.gratisAcima ?? null }
          : { atende: false, bairro };
      },
      pedidoLocal(p) {
        if (!supabase) setPedidos((ps) => [p, ...ps]);
      },
      async fazerPedido(p) {
        if (supabase) {
          const { data, error } = await supabase.rpc("place_order", { p_slug: SLUG, p });
          if (error) return { erro: error.message.replace(/^.*?:\s*/, "") } as PedidoCriado;
          return data as PedidoCriado;
        }
        // demonstração: calcula aqui mesmo
        await new Promise((r) => setTimeout(r, 600));
        let sub = 0;
        for (const i of p.itens) {
          const prod = cardapio.find((x) => x.id === i.product_id)!;
          const extras = (prod.grupos ?? []).flatMap((g) => g.itens).filter((o) => i.escolhas.includes(o.id ?? o.nome));
          sub += ((prod.promo ?? prod.preco) + extras.reduce((s, o) => s + o.preco, 0)) * i.qtd;
        }
        const num = 1048 + Math.floor(Math.random() * 20);
        return { id: "demo-" + num, numero: num, total: sub, desconto: 0, taxa: 0, tempo_min: 25, tempo_max: 35 };
      },
      async statusPedido(id) {
        if (!supabase || id.startsWith("demo")) return null;
        const { data } = await supabase.rpc("order_public", { p_id: id });
        return data ? { status: (data as { status: StatusPedido }).status, pago: (data as { pago: boolean }).pago } : null;
      },
      async confirmarPixDemo(id) {
        if (supabase && !id.startsWith("demo")) await supabase.rpc("confirmar_pix_demo", { p_id: id });
      },
      async saldoCashback(tel) {
        if (!supabase) return 12.4;
        const { data } = await supabase.rpc("cashback_saldo", { p_slug: SLUG, p_telefone: tel });
        return Number(data ?? 0);
      },
      recarregar,
    }),
    [loja.id, zonas, cardapio, categorias, pedidos, recarregar],
  );

  const valor: Dados = { modo: MODO, carregando, erro, sessao, loja, zonas, cardapio, categorias, fregueses, pedidos, pulso, semana, demanda, acoes };
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}
