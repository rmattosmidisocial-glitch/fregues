import { useMemo, useState } from "react";
import { ArrowUpRight, Building2, Check, ChevronRight, CircleDollarSign, Clock, Copy, CreditCard, ExternalLink, History, LayoutDashboard, Layers, LogOut, Pause, Play, Plus, Search, ShieldCheck, Store, TrendingUp, X } from "lucide-react";
import { Logo } from "../../components/Logo";
import { brl } from "../../data/mock";
import { BotaoTema } from "../../tema";
import { useAdmin, type Cliente, type NovoCliente, type StatusAssin } from "./adminDados";

const STATUS: Record<StatusAssin, { rotulo: string; cls: string; cor: string }> = {
  ativa: { rotulo: "Ativa", cls: "bg-[#e2f2ea] text-[#1b6149]", cor: "#49c27e" },
  teste: { rotulo: "Em teste", cls: "bg-[#dff1ee] text-[#1f5f59]", cor: "#2f7d77" },
  atrasada: { rotulo: "Atrasada", cls: "bg-[#fcefd9] text-[#7a4600]", cor: "#ffc03a" },
  suspensa: { rotulo: "Suspensa", cls: "bg-[#fbe4e0] text-[#9b3530]", cor: "#f0524a" },
  cancelada: { rotulo: "Cancelada", cls: "bg-grafite text-fumo", cor: "#8f7b6c" },
};
const dataBR = (s?: string | null) => (s ? new Date(s.length === 10 ? s + "T12:00:00" : s).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) : "—");
const diasAte = (s?: string | null) => (s ? Math.round((new Date(s + "T12:00:00").getTime() - Date.now()) / 86400000) : null);
const desde = (s?: string | null) => {
  if (!s) return "nunca";
  const d = Math.floor((Date.now() - new Date(s).getTime()) / 86400000);
  return d <= 0 ? "hoje" : d === 1 ? "ontem" : `há ${d} dias`;
};
const LINK_BASE = typeof window !== "undefined" ? window.location.origin + window.location.pathname : "";

type Aba = "visao" | "clientes" | "financeiro" | "planos" | "atividade";

function Pill({ s }: { s: StatusAssin }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] font-semibold ${STATUS[s].cls}`}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: STATUS[s].cor }} />
      {STATUS[s].rotulo}
    </span>
  );
}

function Kpi({ rotulo, valor, sub, destaque }: { rotulo: string; valor: string; sub?: string; destaque?: boolean }) {
  return (
    <div className={`rounded-3xl p-5 ${destaque ? "bg-[#fde9df]" : "border border-linha bg-forno"}`}>
      <p className={`text-[13px] ${destaque ? "text-[#9a3412]" : "text-areia"}`}>{rotulo}</p>
      <p className={`tabular mt-1 font-display text-[30px] font-extrabold leading-tight ${destaque ? "text-brasa" : ""}`}>{valor}</p>
      {sub && <p className="mt-1 text-[13px] text-areia">{sub}</p>}
    </div>
  );
}

function LoginAdmin({ a }: { a: ReturnType<typeof useAdmin> }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [criar, setCriar] = useState(false);
  return (
    <div className="tema-claro grid min-h-screen place-items-center bg-carvao p-4">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setMsg(null);
          setMsg((criar ? await a.acoes.criarConta(email, senha) : await a.acoes.entrar(email, senha)) ?? null);
        }}
        className="w-full max-w-[400px] rounded-3xl border border-linha bg-forno p-7"
      >
        <Logo />
        <p className="mt-6 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.12em] text-brasa">
          <ShieldCheck className="h-4 w-4" /> Administração
        </p>
        <h1 className="mt-1 font-display text-[32px] font-extrabold">{criar ? "Criar seu acesso" : "Entrar"}</h1>
        <p className="mt-1 text-[15px] text-areia">{criar ? "Use o e-mail que vai administrar o Freguês." : "Área só para a equipe do Freguês."}</p>
        <label className="mt-5 block text-[15px] font-semibold text-papel">
          E-mail
          <input type="email" required autoComplete="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5 w-full rounded-xl border-2 border-[#6b5546] bg-[#fff6e9] px-4 py-3 text-[16px] text-carvao outline-none placeholder:text-[#8f7b6c] focus:border-brasa" />
        </label>
        <label className="mt-4 block text-[15px] font-semibold text-papel">
          Senha {criar && <span className="font-normal text-areia">(mínimo 8 caracteres)</span>}
          <input type="password" required minLength={8} autoComplete={criar ? "new-password" : "current-password"} placeholder="••••••••" value={senha} onChange={(e) => setSenha(e.target.value)} className="mt-1.5 w-full rounded-xl border-2 border-[#6b5546] bg-[#fff6e9] px-4 py-3 text-[16px] text-carvao outline-none placeholder:text-[#8f7b6c] focus:border-brasa" />
        </label>
        {msg && <p className="mt-4 rounded-xl bg-[#fde9df] p-3 text-[15px] text-[#8e2f2a]">{msg}</p>}
        <button className="mt-6 w-full rounded-xl bg-brasa py-3.5 text-[17px] font-bold text-carvao hover:bg-mostarda">{criar ? "Criar meu acesso" : "Entrar"}</button>
        <div className="my-5 flex items-center gap-3 text-[13px] text-areia">
          <span className="h-px flex-1 bg-linha" /> {criar ? "já tem acesso?" : "ainda não tem acesso?"} <span className="h-px flex-1 bg-linha" />
        </div>
        <button type="button" onClick={() => { setCriar(!criar); setMsg(null); }} className="w-full rounded-xl border-2 border-papel py-3 text-[16px] font-semibold text-papel hover:bg-papel hover:text-carvao">
          {criar ? "Voltar para Entrar" : "Primeiro acesso: criar conta"}
        </button>
      </form>
    </div>
  );
}

function NovoClienteModal({ a, fechar }: { a: ReturnType<typeof useAdmin>; fechar: () => void }) {
  const [n, setN] = useState<NovoCliente>({ empresa: "", loja: "", slug: "", bairro: "", plano: "completo", responsavel: "", telefone: "", email: "", dias_teste: 14 });
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState(false);
  const set = (p: Partial<NovoCliente>) => setN((x) => ({ ...x, ...p }));
  const slugDe = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60);
  const inp = "mt-1 w-full rounded-xl border border-linha bg-carvao px-3 py-2.5 text-[15px] text-papel";
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={fechar}>
      <div role="dialog" aria-label="Novo cliente" className="scroll-thin max-h-[92vh] w-full max-w-[640px] overflow-y-auto rounded-3xl border border-linha bg-forno p-6" onClick={(e) => e.stopPropagation()}>
        {ok ? (
          <div className="py-6 text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-manjericao text-carvao">
              <Check className="h-7 w-7" />
            </span>
            <h2 className="mt-4 font-display text-[24px] font-extrabold">{n.loja} entrou na carteira</h2>
            <p className="mt-2 text-[15px] text-areia">Mande para {n.responsavel.split(" ")[0] || "o dono"} criar o acesso com o e-mail {n.email || "dele"}. Ao entrar, o painel da loja abre direto.</p>
            <div className="mt-4 rounded-2xl bg-carvao p-3 text-left text-[14px]">
              <p className="text-areia">Painel do restaurante</p>
              <p className="break-all font-semibold">{`${LINK_BASE}?r=${n.slug}#painel`}</p>
              <p className="mt-2 text-areia">Loja para os clientes dele</p>
              <p className="break-all font-semibold">{`${LINK_BASE}?r=${n.slug}#loja`}</p>
            </div>
            <button onClick={fechar} className="mt-5 rounded-full bg-papel px-6 py-3 font-semibold text-carvao">
              Fechar
            </button>
          </div>
        ) : (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setErro("");
              const r = await a.acoes.criarCliente(n);
              if (r) setErro(r);
              else setOk(true);
            }}
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-display text-[24px] font-extrabold">Novo cliente</h2>
                <p className="text-[14px] text-areia">Cria a empresa, a loja e a assinatura. A loja fica fora do ar até o dono configurar o cardápio.</p>
              </div>
              <button type="button" onClick={fechar} aria-label="Fechar" className="rounded-full p-2 hover:bg-grafite">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <label className="block text-[13px] text-areia">
                Nome da loja
                <input required value={n.loja} onChange={(e) => set({ loja: e.target.value, slug: slugDe(e.target.value), empresa: n.empresa || "" })} className={inp} placeholder="Ex.: Forno Velho Pizzaria" />
              </label>
              <label className="block text-[13px] text-areia">
                Razão social
                <input required value={n.empresa} onChange={(e) => set({ empresa: e.target.value })} className={inp} placeholder="Ex.: Forno Velho LTDA" />
              </label>
              <label className="block text-[13px] text-areia">
                Endereço da loja
                <span className="mt-1 flex items-center rounded-xl border border-linha bg-carvao px-3 text-[15px]">
                  <span className="text-fumo">?r=</span>
                  <input required pattern="[a-z0-9-]{3,60}" value={n.slug} onChange={(e) => set({ slug: slugDe(e.target.value) })} className="min-w-0 flex-1 bg-transparent py-2.5 text-papel outline-none" />
                </span>
              </label>
              <label className="block text-[13px] text-areia">
                Bairro
                <input value={n.bairro} onChange={(e) => set({ bairro: e.target.value })} className={inp} placeholder="Ex.: Méier" />
              </label>
              <label className="block text-[13px] text-areia">
                Responsável
                <input required value={n.responsavel} onChange={(e) => set({ responsavel: e.target.value })} className={inp} />
              </label>
              <label className="block text-[13px] text-areia">
                WhatsApp
                <input value={n.telefone} onChange={(e) => set({ telefone: e.target.value })} className={inp} placeholder="(21) 9____-____" />
              </label>
              <label className="block text-[13px] text-areia sm:col-span-2">
                E-mail do dono (ele entra com este e-mail)
                <input type="email" required value={n.email} onChange={(e) => set({ email: e.target.value })} className={inp} />
              </label>
            </div>
            <p className="mt-5 text-[13px] text-areia">Plano</p>
            <div className="mt-1 grid gap-2 sm:grid-cols-3">
              {a.planos.map((p) => (
                <button type="button" key={p.id} onClick={() => set({ plano: p.id })} aria-pressed={n.plano === p.id} className={`rounded-2xl border p-3 text-left ${n.plano === p.id ? "border-brasa bg-[#fde9df]" : "border-linha"}`}>
                  <p className="font-semibold">{p.nome}</p>
                  <p className="tabular text-[14px] text-areia">{brl(p.preco)}/mês</p>
                </button>
              ))}
            </div>
            <label className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-grafite p-3 text-[14px]">
              Dias de teste grátis
              <input type="number" min={0} max={60} value={n.dias_teste} onChange={(e) => set({ dias_teste: Number(e.target.value) })} className="tabular w-20 rounded-lg border border-linha bg-carvao px-2 py-1.5 text-right" />
            </label>
            {erro && <p className="mt-3 rounded-xl bg-[#fbe4e0] p-3 text-[14px] text-[#8e2f2a]">{erro}</p>}
            <button className="mt-5 w-full rounded-xl bg-brasa py-3 font-semibold text-carvao hover:bg-mostarda">Cadastrar cliente</button>
          </form>
        )}
      </div>
    </div>
  );
}

function Detalhe({ c, a, fechar }: { c: Cliente; a: ReturnType<typeof useAdmin>; fechar: () => void }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
  const fats = a.faturas.filter((f) => f.org_id === c.org_id);
  const hist = a.auditoria.filter((x) => x.org_id === c.org_id);
  const plano = a.planos.find((p) => p.id === c.plano);
  const acao = async (p: Promise<string | null>, ok: string) => setMsg((await p) ?? ok);
  const linkPainel = `${LINK_BASE}?r=${c.slug}#painel`;
  const linkLoja = `${LINK_BASE}?r=${c.slug}#loja`;
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={fechar}>
      <div role="dialog" aria-label={`Cliente ${c.loja}`} className="scroll-thin h-full w-full max-w-[560px] overflow-y-auto border-l border-linha bg-forno p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Pill s={c.status} />
            <h2 className="mt-2 font-display text-[28px] font-extrabold leading-tight">{c.loja}</h2>
            <p className="text-[14px] text-areia">
              {c.empresa} · {c.bairro || "sem bairro"}
            </p>
          </div>
          <button onClick={fechar} aria-label="Fechar" className="rounded-full p-2 hover:bg-grafite">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 text-[14px]">
          {[
            ["Pedidos em 30 dias", c.pedidos_30d.toLocaleString("pt-BR")],
            ["Vendas em 30 dias", brl(c.vendas_30d)],
            ["Fregueses na base", c.fregueses.toLocaleString("pt-BR")],
            ["Último pedido", desde(c.ultimo_pedido)],
            ["Usuários", `${c.usuarios}${c.convites_pendentes ? ` + ${c.convites_pendentes} convite` : ""}`],
            ["Cliente desde", dataBR(c.criado_em)],
          ].map(([k, v]) => (
            <div key={k} className="rounded-2xl bg-grafite p-3">
              <p className="text-[12px] text-areia">{k}</p>
              <p className="tabular mt-0.5 font-semibold">{v}</p>
            </div>
          ))}
        </div>

        <section className="mt-5 rounded-2xl border border-linha p-4">
          <h3 className="font-semibold">Assinatura</h3>
          <p className="mt-1 text-[14px] text-areia">
            {plano?.nome} · {brl(c.valor)}/mês · {c.status === "teste" ? `teste até ${dataBR(c.teste_ate)}` : `vence ${dataBR(c.proximo_vencimento)}`}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {a.planos
              .filter((p) => p.id !== c.plano)
              .map((p) => (
                <button key={p.id} onClick={() => acao(a.acoes.mudarPlano(c.org_id, p.id), `Plano mudou para ${p.nome}`)} className="rounded-full border border-linha px-3 py-1.5 text-[13px] font-semibold hover:border-areia">
                  Mudar para {p.nome} ({brl(p.preco)})
                </button>
              ))}
          </div>
          <input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Motivo ou observação (opcional)" className="mt-3 w-full rounded-xl border border-linha bg-carvao px-3 py-2 text-[14px]" aria-label="Motivo" />
          <div className="mt-2 flex flex-wrap gap-2">
            {c.status === "suspensa" || c.status === "cancelada" ? (
              <button onClick={() => acao(a.acoes.mudarStatus(c.org_id, "ativa", motivo), "Cliente reativado. A loja voltou ao ar.")} className="flex items-center gap-1.5 rounded-xl bg-manjericao px-4 py-2 text-[14px] font-semibold text-carvao">
                <Play className="h-4 w-4" /> Reativar
              </button>
            ) : (
              <button onClick={() => acao(a.acoes.mudarStatus(c.org_id, "suspensa", motivo), "Cliente suspenso. A loja saiu do ar.")} className="flex items-center gap-1.5 rounded-xl border border-tomate px-4 py-2 text-[14px] font-semibold text-tomate hover:bg-[#fbe4e0]">
                <Pause className="h-4 w-4" /> Suspender
              </button>
            )}
            {c.status === "teste" && (
              <button onClick={() => acao(a.acoes.mudarStatus(c.org_id, "ativa", motivo), "Teste convertido em assinatura")} className="rounded-xl bg-brasa px-4 py-2 text-[14px] font-semibold text-carvao">
                Converter em assinatura
              </button>
            )}
            {c.status !== "cancelada" && (
              <button onClick={() => acao(a.acoes.mudarStatus(c.org_id, "cancelada", motivo), "Assinatura cancelada")} className="rounded-xl px-4 py-2 text-[14px] text-areia hover:text-tomate">
                Cancelar assinatura
              </button>
            )}
          </div>
          {msg && <p className="mt-3 rounded-xl bg-grafite p-3 text-[14px]">{msg}</p>}
        </section>

        <section className="mt-4 rounded-2xl border border-linha p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Faturas</h3>
            <button onClick={() => acao(a.acoes.gerarFatura(c.org_id), "Fatura do mês gerada")} className="rounded-full border border-linha px-3 py-1 text-[13px] font-semibold hover:border-areia">
              Gerar fatura do mês
            </button>
          </div>
          <ul className="mt-2 divide-y divide-linha text-[14px]">
            {fats.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-3 py-2.5">
                <span>
                  <span className="font-semibold capitalize">{new Date(f.competencia + "T12:00:00").toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</span>
                  <span className="block text-[12px] text-areia">
                    vence {dataBR(f.vencimento)} {f.pago_em && `· pago ${dataBR(f.pago_em)} (${f.forma})`}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="tabular font-semibold">{brl(f.valor)}</span>
                  {f.status === "paga" ? (
                    <span className="rounded-full bg-[#e2f2ea] px-2 py-0.5 text-[12px] font-semibold text-[#1b6149]">Paga</span>
                  ) : (
                    <button onClick={() => acao(a.acoes.registrarPagamento(f.id), "Pagamento registrado")} className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ${f.status === "atrasada" ? "bg-[#fcefd9] text-[#7a4600]" : "bg-grafite text-areia"} hover:bg-papel hover:text-carvao`}>
                      {f.status === "atrasada" ? "Atrasada · marcar paga" : "Marcar paga"}
                    </button>
                  )}
                </span>
              </li>
            ))}
            {fats.length === 0 && <li className="py-3 text-areia">Nenhuma fatura ainda.</li>}
          </ul>
        </section>

        <section className="mt-4 rounded-2xl border border-linha p-4 text-[14px]">
          <h3 className="font-semibold">Contato e acesso</h3>
          <p className="mt-1">
            {c.responsavel} · {c.telefone}
          </p>
          <p className="text-areia">{c.email}</p>
          {c.observacao && <p className="mt-2 rounded-xl bg-grafite p-2.5">{c.observacao}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            {c.telefone && (
              <a href={`https://wa.me/55${c.telefone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-full bg-[#e4f3ea] px-3 py-1.5 text-[13px] font-semibold text-[#1b6149]">
                WhatsApp <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            )}
            <a href={linkLoja} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-full border border-linha px-3 py-1.5 text-[13px] font-semibold hover:border-areia">
              <Store className="h-3.5 w-3.5" /> Abrir a loja
            </a>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(linkPainel).catch(() => {});
                setMsg("Link do painel copiado. Mande para o dono.");
              }}
              className="flex items-center gap-1.5 rounded-full border border-linha px-3 py-1.5 text-[13px] font-semibold hover:border-areia"
            >
              <Copy className="h-3.5 w-3.5" /> Link do painel do dono
            </button>
          </div>
        </section>

        {hist.length > 0 && (
          <section className="mt-4 text-[14px]">
            <h3 className="font-semibold">Histórico</h3>
            <ul className="mt-2 space-y-1.5">
              {hist.map((h) => (
                <li key={h.id} className="flex justify-between text-areia">
                  <span>{h.acao}</span>
                  <span>{desde(h.criado_em)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}

export function Admin() {
  const a = useAdmin();
  const [aba, setAba] = useState<Aba>("visao");
  const [sel, setSel] = useState<string | null>(null);
  const [novo, setNovo] = useState(false);
  const [busca, setBusca] = useState("");
  const [fStatus, setFStatus] = useState<StatusAssin | "todos">("todos");
  const [fPlano, setFPlano] = useState("todos");
  const [ordem, setOrdem] = useState<"vendas" | "recentes" | "vencimento">("vendas");

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const l = a.clientes.filter((c) => (fStatus === "todos" || c.status === fStatus) && (fPlano === "todos" || c.plano === fPlano) && (!q || `${c.loja} ${c.empresa} ${c.bairro} ${c.responsavel} ${c.email}`.toLowerCase().includes(q)));
    return l.sort((x, y) => (ordem === "vendas" ? y.vendas_30d - x.vendas_30d : ordem === "recentes" ? y.criado_em.localeCompare(x.criado_em) : (x.proximo_vencimento ?? "9").localeCompare(y.proximo_vencimento ?? "9")));
  }, [a.clientes, busca, fStatus, fPlano, ordem]);

  if (a.carregando) return <div className="tema-claro grid min-h-screen place-items-center bg-carvao text-areia">Abrindo a administração…</div>;
  if (a.modo === "real" && !a.sessao) return <LoginAdmin a={a} />;
  if (a.modo === "real" && a.admin === false)
    return (
      <div className="tema-claro grid min-h-screen place-items-center bg-carvao p-6 text-center">
        <div className="max-w-[420px]">
          <ShieldCheck className="mx-auto h-10 w-10 text-brasa" />
          <h1 className="mt-3 font-display text-[26px] font-extrabold">Esta conta não é administradora</h1>
          <p className="mt-2 text-areia">Você entrou como {a.sessao?.user.email}. A área de administração é só para a equipe do Freguês.</p>
          <button onClick={() => a.acoes.sair()} className="mt-5 rounded-full bg-papel px-6 py-3 font-semibold text-carvao">
            Sair
          </button>
        </div>
      </div>
    );

  if (!a.visao)
    return (
      <div className="tema-claro grid min-h-screen place-items-center bg-carvao p-6 text-center text-areia">
        <div>
          <p>{a.erro ? `Não foi possível carregar: ${a.erro}` : "Carregando os números…"}</p>
          <button onClick={() => a.acoes.recarregar()} className="mt-4 rounded-full border-2 border-papel px-5 py-2 font-semibold text-papel">
            Tentar de novo
          </button>
        </div>
      </div>
    );
  const v = a.visao;
  const c = a.clientes.find((x) => x.org_id === sel);
  const testesVencendo = a.clientes.filter((x) => x.status === "teste" && (diasAte(x.teste_ate) ?? 99) <= 5);
  const atrasados = a.clientes.filter((x) => x.status === "atrasada");
  const parados = a.clientes.filter((x) => x.status === "ativa" && x.ultimo_pedido && Date.now() - new Date(x.ultimo_pedido).getTime() > 7 * 86400000);
  const ticketMedio = v.clientes_ativos + v.atrasados ? v.mrr / (v.clientes_ativos + v.atrasados) : 0;
  const porPlano = a.planos.map((p) => ({ p, n: a.clientes.filter((x) => x.plano === p.id && x.status !== "cancelada").length, mrr: a.clientes.filter((x) => x.plano === p.id && (x.status === "ativa" || x.status === "atrasada")).reduce((s, x) => s + x.valor, 0) }));
  const maxPlano = Math.max(1, ...porPlano.map((x) => x.mrr));
  const ITENS: { id: Aba; rotulo: string; icone: React.ReactNode }[] = [
    { id: "visao", rotulo: "Visão geral", icone: <LayoutDashboard className="h-5 w-5" /> },
    { id: "clientes", rotulo: "Clientes", icone: <Building2 className="h-5 w-5" /> },
    { id: "financeiro", rotulo: "Financeiro", icone: <CircleDollarSign className="h-5 w-5" /> },
    { id: "planos", rotulo: "Planos", icone: <Layers className="h-5 w-5" /> },
    { id: "atividade", rotulo: "Atividade", icone: <History className="h-5 w-5" /> },
  ];
  const Alerta = ({ titulo, itens, cor, texto }: { titulo: string; itens: Cliente[]; cor: string; texto: (x: Cliente) => string }) => (
    <section className="rounded-3xl border border-linha bg-forno p-5">
      <h3 className="flex items-center gap-2 font-semibold">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: cor }} /> {titulo}
        <span className="tabular ml-auto rounded-full bg-grafite px-2 text-[12px] text-areia">{itens.length}</span>
      </h3>
      <ul className="mt-3 space-y-1.5">
        {itens.slice(0, 5).map((x) => (
          <li key={x.org_id}>
            <button onClick={() => setSel(x.org_id)} className="flex w-full items-center justify-between gap-3 rounded-xl bg-grafite px-3 py-2.5 text-left text-[14px] hover:bg-linha">
              <span className="min-w-0">
                <span className="block truncate font-semibold">{x.loja}</span>
                <span className="block truncate text-[12px] text-areia">{texto(x)}</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-fumo" />
            </button>
          </li>
        ))}
        {itens.length === 0 && <li className="text-[14px] text-areia">Nada por aqui. 👌</li>}
      </ul>
    </section>
  );

  return (
    <div className="tema-claro min-h-screen bg-carvao text-papel md:grid md:grid-cols-[240px_1fr]">
      <aside className="tema-escuro sticky top-0 hidden h-screen flex-col bg-forno px-4 py-5 md:flex">
        <Logo />
        <p className="mt-2 flex items-center gap-1.5 px-1 text-[12px] font-semibold uppercase tracking-[0.12em] text-brasa">
          <ShieldCheck className="h-3.5 w-3.5" /> Administração
        </p>
        <nav className="mt-6 space-y-1">
          {ITENS.map((i) => (
            <button key={i.id} onClick={() => setAba(i.id)} aria-current={aba === i.id ? "page" : undefined} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] transition ${aba === i.id ? "bg-papel font-semibold text-carvao" : "text-areia hover:bg-grafite hover:text-papel"}`}>
              {i.icone} {i.rotulo}
              {i.id === "financeiro" && atrasados.length > 0 && <span className="tabular ml-auto rounded-full bg-mostarda px-2 text-[12px] font-bold text-carvao">{atrasados.length}</span>}
            </button>
          ))}
        </nav>
        <div className="mt-auto space-y-1">
          <button onClick={() => setNovo(true)} className="flex w-full items-center gap-2 rounded-xl bg-brasa px-3 py-3 text-[15px] font-semibold text-carvao hover:bg-mostarda">
            <Plus className="h-5 w-5" /> Novo cliente
          </button>
          <a href="#inicio" className="flex items-center gap-2 rounded-xl px-3 py-2 text-[14px] text-areia hover:text-papel">
            <ExternalLink className="h-4 w-4" /> Site de vendas
          </a>
          <BotaoTema rotulo className="!px-3 !py-2" />
          {a.sessao && (
            <button onClick={() => a.acoes.sair()} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-[14px] text-areia hover:text-papel">
              <LogOut className="h-4 w-4" /> Sair ({a.sessao.user.email})
            </button>
          )}
        </div>
      </aside>

      <div className="min-w-0 pb-24 md:pb-0">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-linha bg-carvao/90 px-4 py-3 backdrop-blur md:hidden">
          <Logo />
          <span className="flex items-center gap-2">
            <BotaoTema />
            <button onClick={() => setNovo(true)} className="flex items-center gap-1.5 rounded-full bg-brasa px-3 py-2 text-[14px] font-semibold text-carvao">
              <Plus className="h-4 w-4" /> Cliente
            </button>
          </span>
        </header>
        <main className="mx-auto max-w-[1280px] px-4 py-6 md:px-8 md:py-8">
          {a.erro && <p className="mb-4 rounded-2xl bg-[#fbe4e0] p-4 text-[#8e2f2a]">{a.erro}</p>}
          {a.modo === "demo" && <p className="mb-4 rounded-2xl border border-dashed border-linha p-3 text-[13px] text-areia">Demonstração: carteira fictícia de restaurantes. No endereço publicado, aqui aparecem os seus clientes reais.</p>}

          {aba === "visao" && (
            <div className="space-y-5">
              <div>
                <p className="text-[15px] capitalize text-areia">{new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}</p>
                <h1 className="font-display text-[clamp(2rem,4vw,2.8rem)] font-extrabold tracking-[-0.015em]">Sua carteira de restaurantes</h1>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Kpi destaque rotulo="Receita recorrente por mês" valor={brl(v.mrr)} sub={`${brl(v.mrr * 12)} por ano`} />
                <Kpi rotulo="Clientes pagando" valor={String(v.clientes_ativos)} sub={`${v.em_teste} em teste · ticket ${brl(ticketMedio)}`} />
                <Kpi rotulo="A receber" valor={brl(v.a_receber)} sub={`${v.atrasados} atrasados · ${v.suspensos} suspensos`} />
                <Kpi rotulo="Recebido este mês" valor={brl(v.recebido_mes)} />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <Kpi rotulo="Pedidos na plataforma (30 dias)" valor={v.pedidos_30d.toLocaleString("pt-BR")} />
                <Kpi rotulo="Vendas dos seus clientes (30 dias)" valor={brl(v.vendas_30d)} sub="Dinheiro que passou longe da comissão de marketplace" />
                <Kpi rotulo="Fregueses cadastrados" valor={v.fregueses.toLocaleString("pt-BR")} />
              </div>
              <div className="grid gap-4 lg:grid-cols-3">
                <Alerta titulo="Teste acabando" cor="#2f7d77" itens={testesVencendo} texto={(x) => `termina ${dataBR(x.teste_ate)} · ${x.pedidos_30d} pedidos no teste`} />
                <Alerta titulo="Mensalidade atrasada" cor="#ffc03a" itens={atrasados} texto={(x) => `${brl(x.valor)} · venceu ${dataBR(x.proximo_vencimento)}`} />
                <Alerta titulo="Sem pedidos há 7 dias" cor="#f0524a" itens={parados} texto={(x) => `último pedido ${desde(x.ultimo_pedido)} · risco de cancelar`} />
              </div>
              <section className="rounded-3xl border border-linha bg-forno p-5">
                <h3 className="flex items-center gap-2 font-semibold">
                  <TrendingUp className="h-4 w-4 text-brasa" /> Quem mais vende
                </h3>
                <ul className="mt-3 divide-y divide-linha">
                  {[...a.clientes]
                    .sort((x, y) => y.vendas_30d - x.vendas_30d)
                    .slice(0, 6)
                    .map((x, i) => (
                      <li key={x.org_id}>
                        <button onClick={() => setSel(x.org_id)} className="flex w-full items-center gap-3 py-2.5 text-left text-[14px] hover:text-brasa">
                          <span className="tabular w-5 text-fumo">{i + 1}</span>
                          <span className="min-w-0 flex-1 truncate font-semibold">{x.loja}</span>
                          <span className="tabular text-areia">{x.pedidos_30d} pedidos</span>
                          <span className="tabular w-28 text-right font-semibold">{brl(x.vendas_30d)}</span>
                        </button>
                      </li>
                    ))}
                </ul>
              </section>
            </div>
          )}

          {aba === "clientes" && (
            <div>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h1 className="font-display text-[clamp(2rem,4vw,2.8rem)] font-extrabold tracking-[-0.015em]">Clientes</h1>
                  <p className="text-[15px] text-areia">{a.clientes.length} restaurantes na carteira. Toque em um para ver uso, plano e faturas.</p>
                </div>
                <button onClick={() => setNovo(true)} className="flex items-center gap-2 rounded-full bg-brasa px-5 py-3 text-[15px] font-semibold text-carvao hover:bg-mostarda">
                  <Plus className="h-4 w-4" /> Novo cliente
                </button>
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-2">
                {(["todos", "ativa", "teste", "atrasada", "suspensa", "cancelada"] as const).map((s) => (
                  <button key={s} onClick={() => setFStatus(s)} aria-pressed={fStatus === s} className={`rounded-full px-3.5 py-1.5 text-[13px] font-semibold ${fStatus === s ? "bg-papel text-carvao" : "border border-linha text-areia hover:text-papel"}`}>
                    {s === "todos" ? "Todos" : STATUS[s].rotulo} <span className="tabular opacity-70">{s === "todos" ? a.clientes.length : a.clientes.filter((x) => x.status === s).length}</span>
                  </button>
                ))}
                <select value={fPlano} onChange={(e) => setFPlano(e.target.value)} aria-label="Filtrar por plano" className="rounded-full border border-linha bg-forno px-3 py-1.5 text-[13px]">
                  <option value="todos">Todos os planos</option>
                  {a.planos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome}
                    </option>
                  ))}
                </select>
                <select value={ordem} onChange={(e) => setOrdem(e.target.value as typeof ordem)} aria-label="Ordenar" className="rounded-full border border-linha bg-forno px-3 py-1.5 text-[13px]">
                  <option value="vendas">Mais vendas</option>
                  <option value="recentes">Mais recentes</option>
                  <option value="vencimento">Vencimento mais próximo</option>
                </select>
                <label className="relative ml-auto w-full sm:w-[260px]">
                  <span className="sr-only">Buscar cliente</span>
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fumo" />
                  <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Loja, dono, bairro ou e-mail" className="w-full rounded-full border border-linha bg-forno py-2 pl-9 pr-3 text-[14px]" />
                </label>
              </div>
              <div className="mt-4 overflow-x-auto rounded-3xl border border-linha bg-forno">
                <table className="w-full min-w-[860px] text-[14px]">
                  <thead>
                    <tr className="border-b border-linha text-left text-[12px] text-areia">
                      <th className="px-4 py-3 font-medium">Restaurante</th>
                      <th className="px-4 py-3 font-medium">Plano</th>
                      <th className="px-4 py-3 font-medium">Situação</th>
                      <th className="px-4 py-3 font-medium">Vencimento</th>
                      <th className="px-4 py-3 text-right font-medium">Pedidos 30d</th>
                      <th className="px-4 py-3 text-right font-medium">Vendas 30d</th>
                      <th className="px-4 py-3 font-medium">Último pedido</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-linha">
                    {lista.map((x) => {
                      const dv = diasAte(x.status === "teste" ? x.teste_ate : x.proximo_vencimento);
                      return (
                        <tr key={x.org_id} onClick={() => setSel(x.org_id)} className="cursor-pointer transition hover:bg-grafite">
                          <td className="px-4 py-3">
                            <p className="font-semibold">{x.loja}</p>
                            <p className="text-[12px] text-areia">
                              {x.nicho ? `${x.nicho} · ` : ""}
                              {x.bairro} · {x.responsavel}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            {a.planos.find((p) => p.id === x.plano)?.nome}
                            <p className="tabular text-[12px] text-areia">{brl(x.valor)}</p>
                          </td>
                          <td className="px-4 py-3">
                            <Pill s={x.status} />
                          </td>
                          <td className={`tabular px-4 py-3 ${dv !== null && dv < 0 ? "font-semibold text-mostarda" : ""}`}>
                            {x.status === "cancelada" ? "—" : dataBR(x.status === "teste" ? x.teste_ate : x.proximo_vencimento)}
                            {dv !== null && x.status !== "cancelada" && <p className="text-[12px] text-areia">{dv < 0 ? `${-dv} dias atrás` : dv === 0 ? "hoje" : dv === 1 ? "amanhã" : `em ${dv} dias`}</p>}
                          </td>
                          <td className="tabular px-4 py-3 text-right">{x.pedidos_30d.toLocaleString("pt-BR")}</td>
                          <td className="tabular px-4 py-3 text-right font-semibold">{brl(x.vendas_30d)}</td>
                          <td className={`px-4 py-3 ${x.status === "ativa" && x.ultimo_pedido && Date.now() - new Date(x.ultimo_pedido).getTime() > 7 * 86400000 ? "font-semibold text-tomate" : "text-areia"}`}>{desde(x.ultimo_pedido)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {lista.length === 0 && <p className="p-8 text-center text-areia">Nenhum cliente com esse filtro.</p>}
              </div>
            </div>
          )}

          {aba === "financeiro" && (
            <div className="space-y-5">
              <h1 className="font-display text-[clamp(2rem,4vw,2.8rem)] font-extrabold tracking-[-0.015em]">Financeiro</h1>
              <div className="grid gap-3 sm:grid-cols-3">
                <Kpi destaque rotulo="Recebido este mês" valor={brl(v.recebido_mes)} />
                <Kpi rotulo="Em aberto" valor={brl(a.faturas.filter((f) => f.status === "aberta").reduce((s, f) => s + f.valor, 0))} sub={`${a.faturas.filter((f) => f.status === "aberta").length} faturas`} />
                <Kpi rotulo="Atrasado" valor={brl(a.faturas.filter((f) => f.status === "atrasada").reduce((s, f) => s + f.valor, 0))} sub={`${a.faturas.filter((f) => f.status === "atrasada").length} faturas`} />
              </div>
              <p className="flex items-start gap-2 rounded-2xl bg-grafite p-4 text-[14px] text-areia">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-brasa" />A cobrança roda sozinha todo dia: fatura vencida há 3 dias deixa o cliente como atrasado, e com 15 dias de atraso a loja dele sai do ar até o pagamento.
              </p>
              <div className="overflow-x-auto rounded-3xl border border-linha bg-forno">
                <table className="w-full min-w-[720px] text-[14px]">
                  <thead>
                    <tr className="border-b border-linha text-left text-[12px] text-areia">
                      <th className="px-4 py-3 font-medium">Cliente</th>
                      <th className="px-4 py-3 font-medium">Mês</th>
                      <th className="px-4 py-3 font-medium">Vencimento</th>
                      <th className="px-4 py-3 text-right font-medium">Valor</th>
                      <th className="px-4 py-3 font-medium">Situação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-linha">
                    {[...a.faturas]
                      .sort((x, y) => (x.status === y.status ? y.vencimento.localeCompare(x.vencimento) : x.status === "atrasada" ? -1 : y.status === "atrasada" ? 1 : x.status === "aberta" ? -1 : 1))
                      .slice(0, 60)
                      .map((f) => {
                        const cli = a.clientes.find((x) => x.org_id === f.org_id);
                        return (
                          <tr key={f.id}>
                            <td className="px-4 py-3">
                              <button onClick={() => setSel(f.org_id)} className="font-semibold hover:text-brasa">
                                {cli?.loja ?? "—"}
                              </button>
                            </td>
                            <td className="px-4 py-3 capitalize">{new Date(f.competencia + "T12:00:00").toLocaleDateString("pt-BR", { month: "short", year: "numeric" })}</td>
                            <td className="tabular px-4 py-3">{dataBR(f.vencimento)}</td>
                            <td className="tabular px-4 py-3 text-right font-semibold">{brl(f.valor)}</td>
                            <td className="px-4 py-3">
                              {f.status === "paga" ? (
                                <span className="text-[13px] text-manjericao">
                                  Paga {dataBR(f.pago_em)} · {f.forma}
                                </span>
                              ) : (
                                <button onClick={() => a.acoes.registrarPagamento(f.id)} className={`rounded-full px-3 py-1 text-[12px] font-semibold ${f.status === "atrasada" ? "bg-[#fcefd9] text-[#7a4600]" : "bg-grafite text-areia"} hover:bg-papel hover:text-carvao`}>
                                  <CreditCard className="mr-1 inline h-3.5 w-3.5" />
                                  {f.status === "atrasada" ? "Atrasada · marcar paga" : "Marcar paga"}
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
                {a.faturas.length === 0 && <p className="p-8 text-center text-areia">Nenhuma fatura ainda. Gere pela ficha de cada cliente.</p>}
              </div>
            </div>
          )}

          {aba === "planos" && (
            <div className="space-y-5">
              <h1 className="font-display text-[clamp(2rem,4vw,2.8rem)] font-extrabold tracking-[-0.015em]">Planos</h1>
              <div className="grid gap-4 md:grid-cols-3">
                {porPlano.map(({ p, n, mrr }) => (
                  <section key={p.id} className="flex flex-col rounded-3xl border border-linha bg-forno p-6">
                    <p className="font-display text-[22px] font-extrabold">{p.nome}</p>
                    <p className="text-[14px] text-areia">{p.descricao}</p>
                    <p className="tabular mt-3 font-display text-[34px] font-extrabold">
                      {brl(p.preco)}
                      <span className="text-[15px] font-normal text-areia">/mês</span>
                    </p>
                    <ul className="mt-3 flex-1 space-y-1.5 text-[14px]">
                      {p.recursos.map((r) => (
                        <li key={r} className="flex gap-2">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-manjericao" /> {r}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-4 rounded-2xl bg-grafite p-3 text-[14px]">
                      <p className="flex justify-between">
                        <span className="text-areia">Clientes</span>
                        <b className="tabular">{n}</b>
                      </p>
                      <p className="flex justify-between">
                        <span className="text-areia">Receita por mês</span>
                        <b className="tabular">{brl(mrr)}</b>
                      </p>
                      <span className="mt-2 block h-1.5 rounded-full bg-carvao">
                        <span className="block h-full rounded-full bg-brasa" style={{ width: `${(mrr / maxPlano) * 100}%` }} />
                      </span>
                    </div>
                  </section>
                ))}
              </div>
              <p className="text-[13px] text-areia">Para mudar o preço de um cliente específico, use a ficha dele. O preço dos planos para novos clientes fica na tabela "plans" do banco.</p>
            </div>
          )}

          {aba === "atividade" && (
            <div>
              <h1 className="font-display text-[clamp(2rem,4vw,2.8rem)] font-extrabold tracking-[-0.015em]">Atividade</h1>
              <p className="text-[15px] text-areia">Tudo o que a administração fez, com data. Fica registrado no banco.</p>
              <ul className="mt-5 divide-y divide-linha rounded-3xl border border-linha bg-forno">
                {a.auditoria.map((h) => (
                  <li key={h.id} className="flex items-center justify-between gap-3 px-5 py-3 text-[14px]">
                    <span>
                      <button onClick={() => h.org_id && setSel(h.org_id)} className="font-semibold hover:text-brasa">
                        {a.clientes.find((x) => x.org_id === h.org_id)?.loja ?? "Plataforma"}
                      </button>{" "}
                      <span className="text-areia">· {h.acao}</span>
                    </span>
                    <span className="shrink-0 text-areia">{new Date(h.criado_em).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                  </li>
                ))}
                {a.auditoria.length === 0 && <li className="p-8 text-center text-areia">Nada registrado ainda.</li>}
              </ul>
            </div>
          )}
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-linha bg-forno md:hidden" aria-label="Administração">
        {ITENS.map((i) => (
          <button key={i.id} onClick={() => setAba(i.id)} aria-current={aba === i.id ? "page" : undefined} className={`flex flex-col items-center gap-1 py-2.5 text-[11px] ${aba === i.id ? "text-brasa" : "text-areia"}`}>
            {i.icone}
            {i.rotulo.split(" ")[0]}
          </button>
        ))}
      </nav>

      {c && <Detalhe c={c} a={a} fechar={() => setSel(null)} />}
      {novo && <NovoClienteModal a={a} fechar={() => setNovo(false)} />}
    </div>
  );
}
