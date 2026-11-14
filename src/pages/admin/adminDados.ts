// Dados da área de administração do Freguês (dono da plataforma).
// Modo real: funções admin_* do banco. Modo demonstração: carteira fictícia de restaurantes.
import { useCallback, useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { MODO, supabaseAdmin as supabase } from "../../data/dados";
import type { Endereco } from "./EnderecoLoja";

const enderecoArgs = (org: string, e: Endereco) => ({ p_org: org, p_cidade: e.cidade, p_bairro: e.bairro, p_rua: e.rua, p_numero: e.numero, p_cep: e.cep, p_lon: e.lon ?? null, p_lat: e.lat ?? null });

export type Config = { empresa: string; responsavel: string; email: string; whatsapp: string; assinatura: string };
export const CONFIG_PADRAO: Config = { empresa: "MMATTOS Assessoria de MKT", responsavel: "", email: "", whatsapp: "21967640607", assinatura: "" };
/** Linha que vai no fim das mensagens para os clientes. */
export function assinaturaDe(c: Config) {
  if (c.assinatura.trim()) return c.assinatura.trim();
  const d = c.whatsapp.replace(/\D/g, "");
  const tel = d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : d;
  return [c.responsavel || c.empresa, tel && `WhatsApp ${tel}`].filter(Boolean).join(" · ");
}

export type StatusAssin = "teste" | "ativa" | "atrasada" | "suspensa" | "cancelada";
export type Plano = { id: string; nome: string; preco: number; descricao: string; recursos: string[] };
export type Cliente = {
  org_id: string;
  empresa: string;
  loja: string;
  slug: string;
  bairro: string;
  publicada: boolean;
  plano: string;
  status: StatusAssin;
  valor: number;
  proximo_vencimento: string | null;
  teste_ate: string | null;
  responsavel: string;
  telefone: string;
  email: string;
  observacao: string;
  criado_em: string;
  pedidos_30d: number;
  vendas_30d: number;
  fregueses: number;
  ultimo_pedido: string | null;
  usuarios: number;
  convites_pendentes: number;
  nicho?: string;
  /** Loja de demonstração: fica fora do financeiro. */
  demo?: boolean;
};
export type Fatura = { id: string; org_id: string; competencia: string; vencimento: string; valor: number; status: "aberta" | "paga" | "atrasada" | "cancelada"; pago_em: string | null; forma: string | null; link?: string | null };
export type Cobranca = { ativa: boolean; link: string | null; documento: string | null; assinatura: string | null };
export type Auditoria = { id: number; org_id: string | null; acao: string; criado_em: string };
export type Visao = { mrr: number; clientes_ativos: number; em_teste: number; atrasados: number; suspensos: number; cancelados_30d: number; a_receber: number; recebido_mes: number; pedidos_30d: number; vendas_30d: number; fregueses: number };
export type NovoCliente = { empresa: string; loja: string; slug: string; bairro: string; plano: string; responsavel: string; telefone: string; email: string; dias_teste: number; endereco?: Endereco };

export const PLANOS_PADRAO: Plano[] = [
  { id: "essencial", nome: "Essencial", preco: 149, descricao: "Loja própria e CRM para começar.", recursos: ["Loja e cardápio digital", "Mapa de atuação", "Fregueses e Pulso", "1 usuário"] },
  { id: "completo", nome: "Completo", preco: 249, descricao: "Tudo para vender mais sem marketplace.", recursos: ["Tudo do Essencial", "Atendimento com IA", "Automações", "Formulários e links da bio", "5 usuários"] },
  { id: "rede", nome: "Rede", preco: 499, descricao: "Para quem tem mais de uma loja.", recursos: ["Tudo do Completo", "Até 5 lojas", "Usuários ilimitados", "Suporte prioritário"] },
];

// ---------------- carteira de demonstração ----------------
let seed = 7731;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296), seed / 4294967296);
const hoje = new Date();
const dia = (d: number) => new Date(hoje.getTime() + d * 86400000).toISOString().slice(0, 10);
const proximo10 = () => {
  const d = new Date(hoje.getFullYear(), hoje.getMonth() + (hoje.getDate() > 10 ? 1 : 0), 10);
  return d.toISOString().slice(0, 10);
};
const NOMES: [string, string, string][] = [
  ["Brasa Burger", "Vila da Penha", "Hamburgueria"],
  ["Forno Velho Pizzaria", "Méier", "Pizzaria"],
  ["Boteco do Alemão", "Tijuca", "Bar"],
  ["Sushi Kaigan", "Barra da Tijuca", "Japonês"],
  ["Cantina da Nonna", "Grajaú", "Italiano"],
  ["Açaí da Praia", "Recreio dos Bandeirantes", "Açaí"],
  ["Smash Bros", "Campo Grande", "Hamburgueria"],
  ["Pizzaria Bella Napoli", "Niterói - Icaraí", "Pizzaria"],
  ["Churrascaria Gaúcha Prime", "Madureira", "Churrascaria"],
  ["Point do Pastel", "Bangu", "Lanchonete"],
  ["Bar do Zé Rio", "Botafogo", "Bar"],
  ["Temaki Express", "Copacabana", "Japonês"],
  ["Cozinha da Vó Lourdes", "Nova Iguaçu - Centro", "Restaurante"],
  ["Burger Lab", "Duque de Caxias - Centro", "Hamburgueria"],
  ["Pizza na Brasa", "São Gonçalo - Alcântara", "Pizzaria"],
  ["Marmitaria Sabor Caseiro", "Penha", "Marmitaria"],
  ["Espetinho do Gordo", "Irajá", "Bar"],
  ["Doce Encanto Confeitaria", "Laranjeiras", "Doceria"],
  ["Tapiocaria Nordestina", "Olaria", "Lanchonete"],
  ["Poke House", "Leblon", "Saudável"],
  ["Hot Dog do Bigode", "Mesquita - Centro", "Lanchonete"],
  ["Restaurante Mar & Terra", "Ilha do Governador", "Restaurante"],
  ["Pastelaria Liberdade", "Centro", "Lanchonete"],
  ["Esfiha Damasco", "Vila Isabel", "Árabe"],
];
const RESP = ["Carlos", "Juliana", "Ricardo", "Fernanda", "Marcos", "Patrícia", "Anderson", "Luciana", "Roberto", "Camila", "Diego", "Tatiane"];

function carteira(): { clientes: Cliente[]; faturas: Fatura[]; auditoria: Auditoria[] } {
  const clientes: Cliente[] = NOMES.map(([loja, bairro, nicho], i) => {
    const r = rnd();
    const status: StatusAssin = i === 0 ? "ativa" : r < 0.62 ? "ativa" : r < 0.75 ? "teste" : r < 0.86 ? "atrasada" : r < 0.94 ? "suspensa" : "cancelada";
    const plano = i === 0 ? "completo" : rnd() < 0.45 ? "essencial" : rnd() < 0.8 ? "completo" : "rede";
    const p = PLANOS_PADRAO.find((x) => x.id === plano)!;
    const idade = Math.round(10 + rnd() * 300);
    const ativo = status !== "suspensa" && status !== "cancelada";
    const pedidos = i === 0 ? 437 : ativo ? Math.round((status === "teste" ? 20 : 60) + rnd() * (plano === "rede" ? 900 : 380)) : Math.round(rnd() * 12);
    const ticket = 38 + rnd() * 50;
    const resp = RESP[i % RESP.length];
    const slug = loja.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const semPedido = status === "ativa" && i % 9 === 4;
    return {
      org_id: `org${i + 1}`,
      empresa: `${loja} LTDA`,
      loja,
      slug,
      bairro,
      nicho,
      publicada: ativo,
      plano,
      status,
      valor: p.preco,
      proximo_vencimento: status === "cancelada" ? null : status === "atrasada" || status === "suspensa" ? dia(-Math.round(4 + rnd() * 20)) : proximo10(),
      teste_ate: status === "teste" ? dia(Math.round(1 + rnd() * 13)) : null,
      responsavel: `${resp} ${["Silva", "Souza", "Costa", "Lima", "Rocha"][i % 5]}`,
      telefone: `(21) 9${8000 + i * 37}-${String(1000 + i * 113).slice(0, 4)}`,
      email: `${resp.toLowerCase()}@${slug.replace(/-/g, "")}.com.br`,
      observacao: status === "atrasada" ? "Prometeu pagar até sexta." : status === "suspensa" ? "Suspensa por falta de pagamento." : status === "cancelada" ? "Voltou para o marketplace." : "",
      criado_em: dia(-idade),
      pedidos_30d: semPedido ? 0 : pedidos,
      vendas_30d: Math.round((semPedido ? 0 : pedidos) * ticket * 100) / 100,
      fregueses: i === 0 ? 309 : Math.round(pedidos * (0.5 + rnd() * 0.6) + idade * 0.4),
      ultimo_pedido: semPedido ? dia(-9) : ativo ? dia(0) : dia(-Math.round(20 + rnd() * 40)),
      usuarios: 1 + Math.floor(rnd() * (plano === "rede" ? 9 : 4)),
      convites_pendentes: status === "teste" && rnd() < 0.5 ? 1 : 0,
    };
  });
  const faturas: Fatura[] = [];
  clientes.forEach((c) => {
    for (let m = 0; m < 3; m++) {
      const venc = new Date(hoje.getFullYear(), hoje.getMonth() - m, 10);
      const comp = new Date(hoje.getFullYear(), hoje.getMonth() - m, 1);
      if (new Date(c.criado_em) > venc || c.status === "teste") continue;
      const adiantou = rnd() < 0.55;
      const st: Fatura["status"] = m === 0 && (c.status === "atrasada" || c.status === "suspensa") ? "atrasada" : m === 0 && venc > hoje && !adiantou ? "aberta" : c.status === "suspensa" && m === 1 ? "atrasada" : "paga";
      faturas.push({ id: `${c.org_id}-${m}`, org_id: c.org_id, competencia: comp.toISOString().slice(0, 10), vencimento: venc.toISOString().slice(0, 10), valor: c.valor, status: st, pago_em: st === "paga" ? new Date(Math.min(hoje.getTime() - 3600_000, venc.getTime() - 86400000 * Math.round(rnd() * 3))).toISOString() : null, forma: st === "paga" ? (rnd() < 0.7 ? "Pix" : "Boleto") : null });
    }
  });
  const auditoria: Auditoria[] = [
    { id: 5, org_id: "org2", acao: "registrou pagamento", criado_em: new Date(hoje.getTime() - 3600_000 * 3).toISOString() },
    { id: 4, org_id: clientes.find((c) => c.status === "suspensa")?.org_id ?? "org3", acao: "mudou status para suspensa", criado_em: new Date(hoje.getTime() - 86400_000).toISOString() },
    { id: 3, org_id: clientes.find((c) => c.status === "teste")?.org_id ?? "org4", acao: "criou cliente", criado_em: new Date(hoje.getTime() - 86400_000 * 2).toISOString() },
    { id: 2, org_id: "org8", acao: "mudou plano para completo", criado_em: new Date(hoje.getTime() - 86400_000 * 5).toISOString() },
  ];
  return { clientes, faturas, auditoria };
}

function visaoDe(cs: Cliente[], fs: Fatura[]): Visao {
  const mes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  return {
    mrr: cs.filter((c) => c.status === "ativa" || c.status === "atrasada").reduce((s, c) => s + c.valor, 0),
    clientes_ativos: cs.filter((c) => c.status === "ativa").length,
    em_teste: cs.filter((c) => c.status === "teste").length,
    atrasados: cs.filter((c) => c.status === "atrasada").length,
    suspensos: cs.filter((c) => c.status === "suspensa").length,
    cancelados_30d: cs.filter((c) => c.status === "cancelada").length,
    a_receber: fs.filter((f) => f.status === "aberta" || f.status === "atrasada").reduce((s, f) => s + f.valor, 0),
    recebido_mes: fs.filter((f) => f.status === "paga" && f.pago_em && new Date(f.pago_em) >= mes).reduce((s, f) => s + f.valor, 0),
    pedidos_30d: cs.reduce((s, c) => s + c.pedidos_30d, 0),
    vendas_30d: cs.reduce((s, c) => s + c.vendas_30d, 0),
    fregueses: cs.reduce((s, c) => s + c.fregueses, 0),
  };
}

export function useAdmin() {
  const [sessao, setSessao] = useState<Session | null>(null);
  const [admin, setAdmin] = useState<boolean | null>(MODO === "demo" ? true : null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [faturas, setFaturas] = useState<Fatura[]>([]);
  const [auditoria, setAuditoria] = useState<Auditoria[]>([]);
  const [planos, setPlanos] = useState<Plano[]>(PLANOS_PADRAO);
  const [visao, setVisao] = useState<Visao | null>(null);
  const [config, setConfig] = useState<Config>(CONFIG_PADRAO);
  const jaCarregou = useRef(false);

  const recarregar = useCallback(async () => {
    if (!supabase) {
      setCarregando(false);
      return;
    }
    // só mostra "carregando" na primeira vez; depois atualiza por baixo, sem fechar o que está aberto na tela
    if (!jaCarregou.current) setCarregando(true);
    const { data: ok } = await supabase.rpc("is_platform_admin");
    setAdmin(!!ok);
    if (!ok) {
      setCarregando(false);
      return;
    }
    const [v, c, f, a, p] = await Promise.all([supabase.rpc("admin_visao_geral"), supabase.rpc("admin_clientes"), supabase.rpc("admin_faturas"), supabase.rpc("admin_auditoria"), supabase.from("plans").select("*").order("ordem")]);
    const { data: cf } = await supabase.from("platform_config").select("*").eq("id", 1).maybeSingle();
    if (cf) setConfig({ ...CONFIG_PADRAO, ...(cf as Config) });
    const e = v.error ?? c.error ?? f.error;
    if (e) setErro(e.message);
    if (v.data) setVisao(v.data as Visao);
    setClientes(((c.data ?? []) as Cliente[]).map((x) => ({ ...x, valor: Number(x.valor ?? 0), vendas_30d: Number(x.vendas_30d), pedidos_30d: Number(x.pedidos_30d), fregueses: Number(x.fregueses) })));
    setFaturas(((f.data ?? []) as Fatura[]).map((x) => ({ ...x, valor: Number(x.valor) })));
    setAuditoria((a.data ?? []) as Auditoria[]);
    if (p.data?.length) setPlanos(p.data.map((x) => ({ ...x, preco: Number(x.preco) })) as Plano[]);
    jaCarregou.current = true;
    setCarregando(false);
  }, []);

  useEffect(() => {
    if (MODO === "demo") {
      const d = carteira();
      setClientes(d.clientes);
      setFaturas(d.faturas);
      setAuditoria(d.auditoria);
      setCarregando(false);
      return;
    }
    supabase!.auth.getSession().then(({ data }) => {
      setSessao(data.session);
      if (data.session) recarregar();
      else setCarregando(false);
    });
    const { data: sub } = supabase!.auth.onAuthStateChange((_e, s) => {
      setSessao(s);
      if (s) recarregar();
    });
    return () => sub.subscription.unsubscribe();
  }, [recarregar]);

  const v = MODO === "demo" ? visaoDe(clientes, faturas) : visao;
  const log = (org_id: string, acao: string) => setAuditoria((a) => [{ id: Date.now(), org_id, acao, criado_em: new Date().toISOString() }, ...a]);
  const setC = (id: string, p: Partial<Cliente>) => setClientes((cs) => cs.map((c) => (c.org_id === id ? { ...c, ...p } : c)));

  const acoes = {
    async entrar(email: string, senha: string) {
      if (!supabase) return null;
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
      return error ? "E-mail ou senha incorretos." : null;
    },
    async criarConta(email: string, senha: string) {
      if (!supabase) return null;
      const { error } = await supabase.auth.signUp({ email, password: senha });
      return error ? error.message : "Conta criada. Confirme pelo link que chegou no seu e-mail e depois peça para liberar o acesso de administrador.";
    },
    async sair() {
      await supabase?.auth.signOut();
    },
    async criarCliente(n: NovoCliente): Promise<{ erro?: string; id?: string }> {
      if (supabase) {
        const { data, error } = await supabase.rpc("admin_criar_cliente", { p_empresa: n.empresa, p_loja: n.loja, p_slug: n.slug, p_bairro: n.bairro, p_plano: n.plano, p_responsavel: n.responsavel, p_telefone: n.telefone, p_email: n.email, p_dias_teste: n.dias_teste });
        if (error) return { erro: error.message };
        if (n.endereco) await supabase.rpc("admin_endereco_salvar", enderecoArgs(data as string, n.endereco));
        await recarregar();
        return { id: data as string };
      }
      if (clientes.some((c) => c.slug === n.slug)) return { erro: "Esse endereço já está em uso" };
      const p = planos.find((x) => x.id === n.plano)!;
      const id = `org${Date.now()}`;
      setClientes((cs) => [
        { org_id: id, empresa: n.empresa, loja: n.loja, slug: n.slug, bairro: n.bairro, publicada: false, plano: n.plano, status: n.dias_teste > 0 ? "teste" : "ativa", valor: p.preco, proximo_vencimento: dia(n.dias_teste), teste_ate: n.dias_teste > 0 ? dia(n.dias_teste) : null, responsavel: n.responsavel, telefone: n.telefone, email: n.email, observacao: "", criado_em: dia(0), pedidos_30d: 0, vendas_30d: 0, fregueses: 0, ultimo_pedido: null, usuarios: 0, convites_pendentes: n.email ? 1 : 0 },
        ...cs,
      ]);
      log(id, "criou cliente");
      return { id };
    },
    async editarCliente(org_id: string, f: { empresa: string; loja: string; slug: string; bairro: string; responsavel: string; telefone: string; email: string }): Promise<string | null> {
      if (!f.empresa.trim() || !f.loja.trim()) return "Preencha empresa e nome da loja";
      if (!/^[a-z0-9-]{3,60}$/.test(f.slug)) return "Endereço inválido: use letras minúsculas, números e hífen";
      if (supabase) {
        const { error } = await supabase.rpc("admin_editar_cliente", { p_org: org_id, p_empresa: f.empresa, p_loja: f.loja, p_slug: f.slug, p_bairro: f.bairro, p_responsavel: f.responsavel, p_telefone: f.telefone, p_email: f.email });
        if (error) return error.message;
        await recarregar();
        return null;
      }
      if (clientes.some((c) => c.slug === f.slug && c.org_id !== org_id)) return "Esse endereço já está em uso";
      setC(org_id, f);
      log(org_id, "editou cadastro");
      return null;
    },
    async salvarConfig(c: Config): Promise<string | null> {
      setConfig(c);
      if (!supabase) return null;
      const { error } = await supabase.from("platform_config").update({ empresa: c.empresa.trim(), responsavel: c.responsavel.trim(), email: c.email.trim().toLowerCase(), whatsapp: c.whatsapp.replace(/\D/g, ""), assinatura: c.assinatura.trim(), atualizado_em: new Date().toISOString() }).eq("id", 1);
      return error ? error.message : null;
    },
    async trocarMinhaSenha(nova: string): Promise<string | null> {
      if (!supabase) return null;
      if (nova.length < 8) return "A senha precisa ter pelo menos 8 caracteres.";
      const { error } = await supabase.auth.updateUser({ password: nova });
      if (!error) return null;
      return /different from the old/i.test(error.message) ? "A nova senha precisa ser diferente da atual." : error.message;
    },
    async enderecoLer(org_id: string): Promise<Endereco | null> {
      if (!supabase) return null;
      const { data } = await supabase.rpc("admin_endereco_ler", { p_org: org_id });
      const e = (data as Endereco[] | null)?.[0];
      return e ? { cidade: e.cidade ?? "Rio de Janeiro", bairro: e.bairro ?? "", rua: e.rua ?? "", numero: e.numero ?? "", cep: e.cep ?? "", lon: e.lon, lat: e.lat } : null;
    },
    async enderecoSalvar(org_id: string, e: Endereco): Promise<string | null> {
      if (!supabase) return null;
      const { error } = await supabase.rpc("admin_endereco_salvar", enderecoArgs(org_id, e));
      if (error) return error.message;
      await recarregar();
      return null;
    },
    /** Exclui o cliente de vez (assinatura na Asaas, loja, dados e login do dono). */
    async excluirCliente(org_id: string): Promise<{ erro?: string; aviso?: string }> {
      if (!supabase) {
        setClientes((cs) => cs.filter((c) => c.org_id !== org_id));
        return {};
      }
      const { data } = await supabase.auth.getSession();
      const r = await fetch("/api/admin/excluir", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}` },
        body: JSON.stringify({ org_id }),
      }).catch(() => null);
      const c = r ? await r.json().catch(() => ({})) : {};
      if (!r || !r.ok) return { erro: c.erro || "Não consegui excluir agora. Tente de novo." };
      await recarregar();
      return { aviso: c.aviso };
    },
    /** Logins ligados ao cliente (e-mail, último acesso, se ainda está com a senha provisória). */
    async logins(org_id: string): Promise<{ email: string; papel: string; ultimo_login: string | null; provisoria: boolean }[]> {
      if (!supabase) return [];
      const { data } = await supabase.rpc("admin_logins", { p_org: org_id });
      return (data as { email: string; papel: string; ultimo_login: string | null; provisoria: boolean }[]) ?? [];
    },
    /** Cria o login do dono com senha provisória (ou vincula um login que já existe). */
    async criarAcesso(org_id: string, email: string, senha: string, redefinir = false): Promise<{ erro?: string; ja_existia?: boolean; senha_trocada?: boolean; enviado?: boolean; aviso?: string; link?: string }> {
      if (!supabase) return { senha_trocada: true, link: `${window.location.origin}/?r=demo#painel` };
      const { data } = await supabase.auth.getSession();
      const r = await fetch("/api/admin/acesso", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}` },
        body: JSON.stringify({ org_id, email, senha, redefinir }),
      }).catch(() => null);
      const c = r ? await r.json().catch(() => ({})) : {};
      if (!r || !r.ok) return { erro: c.erro || "Não consegui criar o acesso agora. Tente de novo." };
      await recarregar();
      return c;
    },
    async mudarStatus(id: string, status: StatusAssin, motivo = "") {
      if (supabase) {
        const { error } = await supabase.rpc("admin_mudar_status", { p_org: id, p_status: status, p_motivo: motivo });
        if (error) return error.message;
        await recarregar();
        return null;
      }
      setC(id, { status, publicada: ["teste", "ativa", "atrasada"].includes(status), ...(motivo ? { observacao: motivo } : {}) });
      log(id, `mudou status para ${status}`);
      return null;
    },
    async mudarPlano(id: string, plano: string, valor?: number) {
      if (supabase) {
        const { error } = await supabase.rpc("admin_mudar_plano", { p_org: id, p_plano: plano, p_valor: valor ?? null });
        if (error) return error.message;
        await recarregar();
        return null;
      }
      setC(id, { plano, valor: valor ?? planos.find((p) => p.id === plano)!.preco });
      log(id, `mudou plano para ${plano}`);
      return null;
    },
    async gerarFatura(id: string) {
      if (supabase) {
        const { error } = await supabase.rpc("admin_gerar_fatura", { p_org: id });
        if (error) return error.message;
        await recarregar();
        return null;
      }
      const c = clientes.find((x) => x.org_id === id)!;
      const comp = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0, 10);
      if (faturas.some((f) => f.org_id === id && f.competencia === comp)) return "A fatura deste mês já existe";
      setFaturas((fs) => [{ id: `${id}-${Date.now()}`, org_id: id, competencia: comp, vencimento: new Date(hoje.getFullYear(), hoje.getMonth(), 10).toISOString().slice(0, 10), valor: c.valor, status: "aberta", pago_em: null, forma: null }, ...fs]);
      log(id, "gerou fatura");
      return null;
    },
    async registrarPagamento(faturaId: string, forma = "Pix") {
      if (supabase) {
        const { error } = await supabase.rpc("admin_registrar_pagamento", { p_fatura: faturaId, p_forma: forma });
        if (error) return error.message;
        await recarregar();
        return null;
      }
      const f = faturas.find((x) => x.id === faturaId)!;
      setFaturas((fs) => fs.map((x) => (x.id === faturaId ? { ...x, status: "paga", pago_em: new Date().toISOString(), forma } : x)));
      const prox = new Date(f.vencimento);
      prox.setMonth(prox.getMonth() + 1);
      setC(f.org_id, { status: "ativa", publicada: true, proximo_vencimento: prox.toISOString().slice(0, 10) });
      log(f.org_id, "registrou pagamento");
      return null;
    },
    async cobranca(id: string): Promise<Cobranca | null> {
      if (!supabase) return null;
      const { data } = await supabase.rpc("admin_cobranca", { p_org: id });
      return (data as Cobranca) ?? null;
    },
    // chama o servidor (pasta /api), que fala com a Asaas
    async servidor(rota: "ativar" | "atualizar", corpo: Record<string, unknown>): Promise<{ erro?: string; link?: string; vencimento?: string; aviso?: string; cobrancas?: unknown[] }> {
      if (!supabase) return { erro: "A cobrança automática funciona na versão publicada, com a conta Asaas ligada." };
      const { data } = await supabase.auth.getSession();
      try {
        const r = await fetch(`/api/cobranca/${rota}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}` },
          body: JSON.stringify(corpo),
        });
        const j = await r.json().catch(() => ({ erro: `Servidor respondeu ${r.status}` }));
        if (r.ok) await recarregar();
        return j;
      } catch {
        return { erro: "Não consegui falar com o servidor." };
      }
    },
    recarregar,
  };

  return { modo: MODO, sessao, admin, carregando, erro, clientes, faturas, auditoria, planos, visao: v, config, acoes };
}
