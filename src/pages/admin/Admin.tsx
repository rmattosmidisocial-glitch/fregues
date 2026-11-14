import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, MessageCircle, Pencil, Settings, Trash2, Building2, Check, ChevronRight, CircleDollarSign, Clock, Copy, CreditCard, ExternalLink, History, LayoutDashboard, Layers, LogOut, Pause, Play, Plus, Search, ShieldCheck, Store, TrendingUp, X } from "lucide-react";
import { Logo } from "../../components/Logo";
import { brl } from "../../data/mock";
import { BotaoTema } from "../../tema";
import { EnderecoLoja, ENDERECO_VAZIO, type Endereco } from "./EnderecoLoja";
import { assinaturaDe, useAdmin, type Cliente, type Config, type Cobranca, type NovoCliente, type StatusAssin } from "./adminDados";

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

type Aba = "visao" | "clientes" | "financeiro" | "planos" | "atividade" | "config";

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

// senha provisória: nome da loja + 4 números (fácil de digitar, difícil de adivinhar)
function senhaProvisoria(loja: string) {
  const base = loja.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "").slice(0, 12) || "fregues";
  const n = new Uint32Array(1);
  crypto.getRandomValues(n);
  return base + String(1000 + (n[0] % 9000));
}

const linkPainelDe = (slug: string) => `${window.location.origin}/?r=${slug}#painel`;
const linkLojaDe = (slug: string) => `${window.location.origin}/?r=${slug}#loja`;
const telFmt = (t: string) => {
  const d = (t || "").replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
  return d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : d.length === 10 ? `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}` : t;
};
const zapDe = (t: string) => {
  const d = (t || "").replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
  return d.length >= 10 ? "55" + d : "";
};

/** Botões de envio: WhatsApp (abre a conversa com a mensagem pronta) e copiar. */
function Enviar({ msg, telefone }: { msg: string; telefone: string }) {
  const [copiado, setCopiado] = useState(false);
  const zap = zapDe(telefone);
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <a
        href={zap ? `https://wa.me/${zap}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`}
        target="_blank"
        rel="noreferrer"
        className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#25d366] px-4 py-3 text-[15px] font-bold text-[#0b2e17] hover:brightness-95"
      >
        <MessageCircle className="h-5 w-5" /> Enviar no WhatsApp{zap ? ` · ${telFmt(telefone)}` : ""}
      </a>
      <button
        onClick={() => {
          navigator.clipboard?.writeText(msg).catch(() => {});
          setCopiado(true);
        }}
        className="flex items-center gap-1.5 rounded-xl border border-linha px-4 py-3 text-[14px] font-semibold hover:border-areia"
      >
        <Copy className="h-4 w-4" /> {copiado ? "Copiado" : "Copiar"}
      </button>
    </div>
  );
}

type Login = { email: string; papel: string; ultimo_login: string | null; provisoria: boolean };

/** Login do dono: cria (ou renova) e-mail + senha provisória e manda no WhatsApp dele. No primeiro acesso ele é obrigado a criar a senha dele. */
function AcessoDono({ a, org_id, loja, slug, email, responsavel, telefone }: { a: ReturnType<typeof useAdmin>; org_id: string; loja: string; slug: string; email: string; responsavel: string; telefone: string }) {
  const [logins, setLogins] = useState<Login[] | null>(null);
  const [em, setEm] = useState(email);
  const [senha, setSenha] = useState(() => senhaProvisoria(loja));
  const [novaSenha, setNovaSenha] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [pronto, setPronto] = useState<{ email: string; senha: string } | null>(null);
  const [erro, setErro] = useState("");
  const carregar = () => a.acoes.logins(org_id).then(setLogins);
  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org_id]);

  const dono = logins?.find((l) => l.papel === "dono") ?? logins?.[0];
  const nome = responsavel.split(" ")[0] || "";
  const link = linkPainelDe(slug);
  const inp = "mt-1 w-full rounded-xl border border-linha bg-carvao px-3 py-2.5 text-[15px] text-papel";

  const criar = async (login: string, redefinir: boolean) => {
    setErro("");
    setEnviando(true);
    const r = await a.acoes.criarAcesso(org_id, login, senha, redefinir);
    setEnviando(false);
    if (r.erro) return setErro(r.erro);
    if (r.ja_existia && !r.senha_trocada) {
      setErro("Esse e-mail já tem login. Use \"Gerar nova senha provisória\".");
      return carregar();
    }
    setPronto({ email: login.trim().toLowerCase(), senha });
    setNovaSenha(false);
    carregar();
  };

  if (logins === null) return <p className="mt-2 text-areia">Carregando…</p>;

  // acabou de criar ou renovar: mensagem com a senha, pronta para o WhatsApp
  if (pronto) {
    const msg = `Olá${nome ? " " + nome : ""}! O painel do Freguês da ${loja} está pronto.\n\nAcesse: ${link}\nE-mail: ${pronto.email}\nSenha provisória: ${pronto.senha}\n\nNo primeiro acesso, o sistema pede para você criar a sua própria senha. Depois disso, só você sabe a senha.\n\nQualquer dúvida, fale comigo.\n${assinaturaDe(a.config)}`;
    return (
      <div className="mt-2">
        <p className="font-semibold text-manjericao">Login pronto. Agora mande para {nome || "o dono"}:</p>
        <p className="mt-2 whitespace-pre-line break-words rounded-xl bg-carvao p-3">{msg}</p>
        <Enviar msg={msg} telefone={telefone} />
        <button onClick={() => setPronto(null)} className="mt-2 w-full py-2 text-[13px] text-areia hover:text-papel">
          Voltar
        </button>
      </div>
    );
  }

  // ainda não tem login
  if (!dono)
    return (
      <div className="mt-2">
        <p className="text-areia">Este cliente ainda não tem login. Crie o e-mail e a senha provisória e mande no WhatsApp do dono.</p>
        <label className="mt-2 block">
          E-mail do dono (é o login dele)
          <input type="email" value={em} onChange={(e) => setEm(e.target.value)} className={inp} />
        </label>
        <label className="mt-2 block">
          Senha provisória
          <input value={senha} onChange={(e) => setSenha(e.target.value)} className={inp} />
        </label>
        {erro && <p className="mt-2 text-[#e8846f]">{erro}</p>}
        <button disabled={enviando || senha.length < 8 || !em} onClick={() => criar(em, false)} className="mt-3 w-full rounded-xl bg-brasa py-3 font-semibold text-carvao hover:bg-mostarda disabled:opacity-60">
          {enviando ? "Criando…" : "Criar login"}
        </button>
      </div>
    );

  // já tem login
  const msgLink = `Olá${nome ? " " + nome : ""}! Este é o link do painel do Freguês da ${loja}:\n\n${link}\n\nEntre com o seu e-mail (${dono.email}) e a sua senha.\n\n${assinaturaDe(a.config)}`;
  return (
    <div className="mt-2">
      <div className="rounded-xl bg-carvao p-3">
        <p className="break-all font-semibold">{dono.email}</p>
        <p className={`mt-0.5 text-[13px] ${dono.ultimo_login ? "text-manjericao" : "text-mostarda"}`}>
          {dono.ultimo_login ? `Último acesso ${desde(dono.ultimo_login)}${dono.provisoria ? " · ainda com a senha provisória" : " · já criou a senha dele"}` : "Ainda não entrou no painel"}
        </p>
      </div>

      {dono.ultimo_login && !dono.provisoria ? (
        <>
          <p className="mt-3 text-areia">Mandar o link do painel de novo (sem senha):</p>
          <Enviar msg={msgLink} telefone={telefone} />
        </>
      ) : (
        <p className="mt-3 text-areia">Para mandar o acesso, gere uma senha provisória: ela vai na mensagem do WhatsApp.</p>
      )}

      {novaSenha ? (
        <div className="mt-3 rounded-xl border border-linha p-3">
          <label className="block">
            Nova senha provisória
            <input value={senha} onChange={(e) => setSenha(e.target.value)} className={inp} />
          </label>
          {dono.ultimo_login && !dono.provisoria && <p className="mt-2 text-[13px] text-mostarda">A senha atual do dono para de funcionar e ele vai criar outra no próximo acesso.</p>}
          {erro && <p className="mt-2 text-[#e8846f]">{erro}</p>}
          <div className="mt-3 flex gap-2">
            <button disabled={enviando || senha.length < 8} onClick={() => criar(dono.email, true)} className="flex-1 rounded-xl bg-brasa py-2.5 font-semibold text-carvao hover:bg-mostarda disabled:opacity-60">
              {enviando ? "Gerando…" : "Gerar e preparar o WhatsApp"}
            </button>
            <button onClick={() => setNovaSenha(false)} className="rounded-xl border border-linha px-4 py-2.5 font-semibold">
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setNovaSenha(true)} className={`mt-3 w-full rounded-xl py-3 font-semibold ${dono.ultimo_login && !dono.provisoria ? "border border-linha text-papel hover:border-areia" : "bg-brasa text-carvao hover:bg-mostarda"}`}>
          {dono.ultimo_login && !dono.provisoria ? "Dono esqueceu a senha: gerar nova provisória" : "Gerar senha provisória e enviar no WhatsApp"}
        </button>
      )}
    </div>
  );
}

/** Zona de perigo: excluir o cliente de vez, digitando o nome da loja para confirmar. */
function ExcluirCliente({ c, a, fechar }: { c: Cliente; a: ReturnType<typeof useAdmin>; fechar: () => void }) {
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState("");
  const [excluindo, setExcluindo] = useState(false);
  const confere = nome.trim().toLowerCase() === c.loja.trim().toLowerCase();
  if (!aberto)
    return (
      <button onClick={() => setAberto(true)} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-tomate py-3 text-[14px] font-semibold text-tomate hover:bg-[#fbe4e0]">
        <Trash2 className="h-4 w-4" /> Excluir cliente
      </button>
    );
  return (
    <section className="mt-6 rounded-2xl border-2 border-tomate p-4 text-[14px]">
      <h3 className="font-semibold text-tomate">Excluir {c.loja} de vez</h3>
      <p className="mt-1">Isso apaga a loja, o cardápio, os pedidos, os fregueses, as faturas e o login do dono, e cancela a assinatura na Asaas. Não dá para desfazer.</p>
      <p className="mt-2 text-areia">Se só quer tirar a loja do ar, use "Suspender" ou "Cancelar assinatura" lá em cima.</p>
      <label className="mt-3 block font-semibold">
        Para confirmar, digite o nome da loja: <span className="text-tomate">{c.loja}</span>
        <input value={nome} onChange={(e) => setNome(e.target.value)} className="mt-1 w-full rounded-xl border border-linha bg-carvao px-3 py-2.5 text-[15px] text-papel" />
      </label>
      {erro && <p className="mt-2 text-[#e8846f]">{erro}</p>}
      <div className="mt-3 flex gap-2">
        <button
          disabled={!confere || excluindo}
          onClick={async () => {
            setExcluindo(true);
            const r = await a.acoes.excluirCliente(c.org_id);
            setExcluindo(false);
            if (r.erro) return setErro(r.erro);
            if (r.aviso) alert(r.aviso);
            fechar();
          }}
          className="flex-1 rounded-xl bg-tomate py-2.5 font-semibold text-papel disabled:opacity-40"
        >
          {excluindo ? "Excluindo…" : "Excluir de vez"}
        </button>
        <button onClick={() => setAberto(false)} className="rounded-xl border border-linha px-4 py-2.5 font-semibold">
          Cancelar
        </button>
      </div>
    </section>
  );
}

/** Editar o cadastro do cliente (dados da empresa, da loja e do responsável). */
function EditarCadastro({ c, a, endereco, fechar }: { c: Cliente; a: ReturnType<typeof useAdmin>; endereco: Endereco | null; fechar: (msg?: string) => void }) {
  const [end, setEnd] = useState<Endereco>(endereco ?? { ...ENDERECO_VAZIO, bairro: c.bairro ?? "" });
  const [f, setF] = useState({ empresa: c.empresa, loja: c.loja, slug: c.slug, bairro: c.bairro ?? "", responsavel: c.responsavel ?? "", telefone: c.telefone ?? "", email: c.email ?? "" });
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const inp = "mt-1 w-full rounded-xl border border-linha bg-carvao px-3 py-2.5 text-[15px] text-papel";
  const campo = (k: keyof typeof f, rotulo: string, tipo = "text") => (
    <label className="block">
      {rotulo}
      <input type={tipo} value={f[k]} onChange={(e) => setF({ ...f, [k]: k === "slug" ? e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") : e.target.value })} className={inp} />
    </label>
  );
  return (
    <form
      className="mt-3 space-y-2.5 text-[14px]"
      onSubmit={async (e) => {
        e.preventDefault();
        setSalvando(true);
        const r = (await a.acoes.editarCliente(c.org_id, { ...f, bairro: end.bairro })) ?? (await a.acoes.enderecoSalvar(c.org_id, end));
        setSalvando(false);
        if (r) setErro(r);
        else fechar("Cadastro atualizado.");
      }}
    >
      {campo("empresa", "Empresa (razão ou nome fantasia)")}
      {campo("loja", "Nome da loja")}
      {campo("slug", "Link da loja (o que vem depois de ?r=)")}
      {f.slug !== c.slug && <p className="text-[13px] text-mostarda">Mudar o link troca o endereço da loja e do painel. Os links antigos param de funcionar.</p>}
      <div className="rounded-xl border border-linha p-3">
        <p className="mb-2 font-semibold">Endereço do restaurante</p>
        <EnderecoLoja valor={end} mudar={setEnd} />
      </div>
      {campo("responsavel", "Responsável")}
      {campo("telefone", "WhatsApp", "tel")}
      {campo("email", "E-mail de contato", "email")}
      <p className="text-[13px] text-areia">O e-mail de contato não muda o login do dono. O login é trocado pelo próprio dono, em "Minha conta".</p>
      {erro && <p className="text-[#e8846f]">{erro}</p>}
      <div className="flex gap-2 pt-1">
        <button disabled={salvando} className="flex-1 rounded-xl bg-brasa py-2.5 font-semibold text-carvao hover:bg-mostarda disabled:opacity-60">
          {salvando ? "Salvando…" : "Salvar"}
        </button>
        <button type="button" onClick={() => fechar()} className="rounded-xl border border-linha px-4 py-2.5 font-semibold">
          Cancelar
        </button>
      </div>
    </form>
  );
}

function NovoClienteModal({ a, fechar }: { a: ReturnType<typeof useAdmin>; fechar: () => void }) {
  const [n, setN] = useState<NovoCliente>({ empresa: "", loja: "", slug: "", bairro: "", plano: "completo", responsavel: "", telefone: "", email: "", dias_teste: 14, endereco: ENDERECO_VAZIO });
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState<string | null>(null);
  const set = (p: Partial<NovoCliente>) => setN((x) => ({ ...x, ...p }));
  const slugDe = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60);
  const inp = "mt-1 w-full rounded-xl border border-linha bg-carvao px-3 py-2.5 text-[15px] text-papel";
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={fechar}>
      <div role="dialog" aria-label="Novo cliente" className="scroll-thin max-h-[92vh] w-full max-w-[640px] overflow-y-auto rounded-3xl border border-linha bg-forno p-6" onClick={(e) => e.stopPropagation()}>
        {ok !== null ? (
          <div className="py-6 text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-manjericao text-carvao">
              <Check className="h-7 w-7" />
            </span>
            <h2 className="mt-4 font-display text-[24px] font-extrabold">{n.loja} entrou na carteira</h2>
            <p className="mt-2 text-[15px] text-areia">Agora crie o login do dono e mande no WhatsApp dele.</p>
            {ok && (
              <div className="mt-3 rounded-2xl border border-linha p-3 text-left">
                <AcessoDono a={a} org_id={ok} loja={n.loja} slug={n.slug} email={n.email} responsavel={n.responsavel} telefone={n.telefone} />
              </div>
            )}
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
              if (r.erro) setErro(r.erro);
              else setOk(r.id ?? "");
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
              <label className="block text-[13px] text-areia sm:col-span-2">
                Link da loja <span className="text-fumo">(sai do nome; os clientes dele usam este link)</span>
                <span className="mt-1 flex items-center rounded-xl border border-linha bg-carvao px-3 text-[15px]">
                  <span className="shrink-0 text-fumo">{window.location.host}/?r=</span>
                  <input required pattern="[a-z0-9-]{3,60}" value={n.slug} onChange={(e) => set({ slug: slugDe(e.target.value) })} className="min-w-0 flex-1 bg-transparent py-2.5 text-papel outline-none" />
                </span>
              </label>
              <div className="sm:col-span-2">
                <p className="text-[13px] font-semibold text-papel">Endereço do restaurante</p>
                <div className="mt-2">
                  <EnderecoLoja valor={n.endereco ?? ENDERECO_VAZIO} mudar={(e) => set({ endereco: e, bairro: e.bairro })} />
                </div>
              </div>
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

function CobrancaAuto({ c, a }: { c: Cliente; a: ReturnType<typeof useAdmin> }) {
  const [info, setInfo] = useState<Cobranca | null>(null);
  const [doc, setDoc] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  useEffect(() => {
    let vivo = true;
    a.acoes.cobranca(c.org_id).then((x) => {
      if (!vivo) return;
      setInfo(x);
      if (x?.documento) setDoc(x.documento);
    });
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c.org_id, a.faturas]);
  const ativar = async () => {
    setOcupado(true);
    setMsg(null);
    const r = await a.acoes.servidor("ativar", { org_id: c.org_id, documento: doc });
    setOcupado(false);
    if (r.erro) return setMsg(r.erro);
    setInfo((i) => ({ ...(i ?? { documento: doc, assinatura: null }), ativa: true, link: r.link ?? null }));
    setMsg(`Cobrança ativada. Primeiro vencimento: ${dataBR(r.vencimento)}.${r.aviso ? ` ${r.aviso}` : ""}`);
  };
  const atualizar = async () => {
    setOcupado(true);
    const r = await a.acoes.servidor("atualizar", { org_id: c.org_id });
    setOcupado(false);
    setMsg(r.erro ?? `Cobranças conferidas na Asaas (${r.cobrancas?.length ?? 0}).`);
  };
  const tel = (c.telefone || "").replace(/\D/g, "");
  const texto = info?.link ? `Olá, ${c.responsavel.split(" ")[0] || ""}! Aqui é do Freguês. Para manter a ${c.loja} no ar, cadastre a forma de pagamento da mensalidade (Pix, boleto ou cartão) neste link: ${info.link}` : "";
  return (
    <section className="mt-4 rounded-2xl border border-linha p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold">Cobrança automática</h3>
        <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${info?.ativa ? "bg-[#e2f2ea] text-[#1b6149]" : "bg-grafite text-areia"}`}>{info?.ativa ? "Ativa na Asaas" : "Desligada"}</span>
      </div>
      {!info?.ativa ? (
        <>
          <p className="mt-1 text-[14px] text-areia">A Asaas gera a cobrança todo mês, avisa o cliente antes do vencimento e dá baixa aqui quando ele paga. O cliente escolhe Pix, boleto ou cartão.</p>
          <label className="mt-3 block text-[13px] text-areia">
            CPF ou CNPJ do cliente
            <input value={doc} onChange={(e) => setDoc(e.target.value)} inputMode="numeric" placeholder="00.000.000/0000-00" className="mt-1 w-full rounded-xl border border-linha bg-carvao px-3 py-2.5 text-[15px] text-papel" />
          </label>
          <button onClick={ativar} disabled={ocupado} className="mt-3 w-full rounded-xl bg-brasa px-4 py-2.5 text-[14px] font-semibold text-carvao disabled:opacity-60">
            {ocupado ? "Falando com a Asaas…" : "Ativar cobrança automática"}
          </button>
        </>
      ) : (
        <>
          <p className="mt-1 text-[14px] text-areia">Mande o link para o cliente escolher como pagar. Depois disso, tudo acontece sozinho.</p>
          {info.link && (
            <div className="mt-3 rounded-xl bg-grafite p-3 text-[13px]">
              <p className="break-all font-semibold">{info.link}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(info.link!);
                    setCopiado(true);
                    setTimeout(() => setCopiado(false), 1500);
                  }}
                  className="rounded-full border border-linha px-3 py-1 font-semibold hover:border-areia"
                >
                  {copiado ? "Copiado" : "Copiar link"}
                </button>
                {tel && (
                  <a href={`https://wa.me/55${tel}?text=${encodeURIComponent(texto)}`} target="_blank" rel="noreferrer" className="rounded-full bg-manjericao px-3 py-1 font-semibold text-carvao">
                    Mandar no WhatsApp
                  </a>
                )}
                <a href={info.link} target="_blank" rel="noreferrer" className="rounded-full border border-linha px-3 py-1 font-semibold hover:border-areia">
                  Abrir
                </a>
              </div>
            </div>
          )}
          <button onClick={atualizar} disabled={ocupado} className="mt-3 rounded-full border border-linha px-3 py-1.5 text-[13px] font-semibold hover:border-areia disabled:opacity-60">
            {ocupado ? "Conferindo…" : "Atualizar cobranças"}
          </button>
        </>
      )}
      {msg && <p className="mt-3 rounded-xl bg-grafite p-3 text-[14px]">{msg}</p>}
    </section>
  );
}

/** Configurações básicas: os seus dados (vão nas mensagens para os clientes e no botão de atendimento do painel deles) e a sua senha. */
function Configuracoes({ a }: { a: ReturnType<typeof useAdmin> }) {
  const [f, setF] = useState<Config>(a.config);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [senha, setSenha] = useState("");
  const [msgSenha, setMsgSenha] = useState<{ ok: boolean; t: string } | null>(null);
  useEffect(() => setF(a.config), [a.config]);
  const inp = "mt-1 w-full rounded-xl border border-linha bg-carvao px-3 py-2.5 text-[15px] text-papel";
  const campo = (k: keyof Config, rotulo: string, tipo = "text", dica?: string) => (
    <label className="block text-[14px] font-semibold">
      {rotulo}
      {dica && <span className="font-normal text-areia"> {dica}</span>}
      <input type={tipo} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} className={inp} />
    </label>
  );
  return (
    <div className="max-w-[640px]">
      <h1 className="font-display text-[clamp(2rem,4vw,2.8rem)] font-extrabold tracking-[-0.015em]">Configurações</h1>
      <p className="text-[15px] text-areia">Seus dados aparecem nas mensagens que você manda aos clientes e no botão "Falar com o Freguês" do painel deles.</p>
      <form
        className="mt-5 space-y-3 rounded-3xl border border-linha bg-forno p-5"
        onSubmit={async (e) => {
          e.preventDefault();
          const r = await a.acoes.salvarConfig(f);
          setMsg(r ? { ok: false, t: r } : { ok: true, t: "Salvo." });
        }}
      >
        <h2 className="text-[18px] font-bold">Seus dados</h2>
        {campo("empresa", "Empresa")}
        {campo("responsavel", "Seu nome")}
        {campo("email", "E-mail de contato", "email")}
        {campo("whatsapp", "WhatsApp de atendimento", "tel", "(os restaurantes falam com você por aqui)")}
        {campo("assinatura", "Assinatura das mensagens", "text", "(opcional)")}
        <p className="rounded-xl bg-carvao p-3 text-[14px]">
          <span className="text-areia">Fim das mensagens que você manda: </span>
          {assinaturaDe(f) || "—"}
        </p>
        {msg && <p className={`text-[14px] ${msg.ok ? "text-manjericao" : "text-[#e8846f]"}`}>{msg.t}</p>}
        <button className="w-full rounded-xl bg-brasa py-3 font-semibold text-carvao hover:bg-mostarda">Salvar</button>
      </form>

      <form
        className="mt-4 space-y-3 rounded-3xl border border-linha bg-forno p-5"
        onSubmit={async (e) => {
          e.preventDefault();
          const r = await a.acoes.trocarMinhaSenha(senha);
          setMsgSenha(r ? { ok: false, t: r } : { ok: true, t: "Senha trocada." });
          if (!r) setSenha("");
        }}
      >
        <h2 className="text-[18px] font-bold">Seu acesso de administrador</h2>
        <p className="text-[14px] text-areia">Você entra com {a.sessao?.user.email ?? "o seu e-mail"}.</p>
        <label className="block text-[14px] font-semibold">
          Nova senha <span className="font-normal text-areia">(mínimo 8 caracteres)</span>
          <input type="password" minLength={8} required autoComplete="new-password" value={senha} onChange={(e) => setSenha(e.target.value)} className={inp} />
        </label>
        {msgSenha && <p className={`text-[14px] ${msgSenha.ok ? "text-manjericao" : "text-[#e8846f]"}`}>{msgSenha.t}</p>}
        <button className="w-full rounded-xl border-2 border-papel py-3 font-semibold text-papel hover:bg-papel hover:text-carvao">Trocar minha senha</button>
      </form>
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
  const [editando, setEditando] = useState(false);
  const [endereco, setEndereco] = useState<Endereco | null>(null);
  useEffect(() => {
    a.acoes.enderecoLer(c.org_id).then(setEndereco);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c.org_id, editando]);
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={fechar}>
      <div role="dialog" aria-label={`Cliente ${c.loja}`} className="scroll-thin h-full w-full max-w-[560px] overflow-y-auto border-l border-linha bg-forno p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Pill s={c.status} />
            <h2 className="mt-2 font-display text-[28px] font-extrabold leading-tight">{c.loja}</h2>
            {c.demo && <p className="mt-1 rounded-xl bg-[#e6eefb] px-3 py-2 text-[13px] font-semibold text-[#1d4f91]">Loja de demonstração: fica no ar para mostrar a quem vai comprar e não entra no seu faturamento.</p>}
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

        <CobrancaAuto c={c} a={a} />

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
                  {f.link && f.status !== "paga" && (
                    <a href={f.link} target="_blank" rel="noreferrer" className="rounded-full border border-linha px-2.5 py-1 text-[12px] font-semibold hover:border-areia">
                      Abrir cobrança
                    </a>
                  )}
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
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Cadastro</h3>
            {!editando && (
              <button onClick={() => setEditando(true)} className="flex items-center gap-1.5 rounded-full border border-linha px-3 py-1.5 text-[13px] font-semibold hover:border-areia">
                <Pencil className="h-3.5 w-3.5" /> Editar
              </button>
            )}
          </div>
          {editando ? (
            <EditarCadastro
              c={c}
              a={a}
              endereco={endereco}
              fechar={(m) => {
                setEditando(false);
                if (m) setMsg(m);
              }}
            />
          ) : (
            <dl className="mt-2 grid grid-cols-[110px_1fr] gap-x-3 gap-y-1">
              <dt className="text-areia">Empresa</dt>
              <dd>{c.empresa}</dd>
              <dt className="text-areia">Loja</dt>
              <dd>{c.loja}</dd>
              <dt className="text-areia">Loja online</dt>
              <dd className="break-all">
                <a href={linkLojaDe(c.slug)} target="_blank" rel="noreferrer" className="underline decoration-linha underline-offset-2 hover:text-brasa">
                  {linkLojaDe(c.slug).replace(/^https?:\/\//, "")}
                </a>
              </dd>
              <dt className="text-areia">Endereço</dt>
              <dd>
                {endereco ? [[endereco.rua, endereco.numero].filter(Boolean).join(", "), endereco.bairro, endereco.cidade].filter(Boolean).join(" · ") || "—" : c.bairro || "—"}
                {endereco && (endereco.lon != null ? <span className="ml-1 text-[12px] text-manjericao">· no mapa</span> : <span className="ml-1 text-[12px] text-mostarda">· sem ponto no mapa</span>)}
              </dd>
              <dt className="text-areia">Responsável</dt>
              <dd>{c.responsavel || "—"}</dd>
              <dt className="text-areia">WhatsApp</dt>
              <dd>{c.telefone ? telFmt(c.telefone) : "—"}</dd>
              <dt className="text-areia">E-mail</dt>
              <dd className="break-all">{c.email || "—"}</dd>
            </dl>
          )}
          {c.observacao && <p className="mt-2 rounded-xl bg-grafite p-2.5">{c.observacao}</p>}
        </section>

        {!c.demo && (
          <section className="mt-4 rounded-2xl border border-linha p-4 text-[14px]">
            <h3 className="font-semibold">Login do dono</h3>
            <AcessoDono key={c.org_id + c.slug} a={a} org_id={c.org_id} loja={c.loja} slug={c.slug} email={c.email} responsavel={c.responsavel} telefone={c.telefone} />
          </section>
        )}

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

        {!c.demo && <ExcluirCliente c={c} a={a} fechar={fechar} />}
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
  const testesVencendo = a.clientes.filter((x) => !x.demo && x.status === "teste" && (diasAte(x.teste_ate) ?? 99) <= 5);
  const atrasados = a.clientes.filter((x) => !x.demo && x.status === "atrasada");
  const parados = a.clientes.filter((x) => !x.demo && x.status === "ativa" && x.ultimo_pedido && Date.now() - new Date(x.ultimo_pedido).getTime() > 7 * 86400000);
  const ticketMedio = v.clientes_ativos + v.atrasados ? v.mrr / (v.clientes_ativos + v.atrasados) : 0;
  const porPlano = a.planos.map((p) => ({ p, n: a.clientes.filter((x) => !x.demo && x.plano === p.id && x.status !== "cancelada").length, mrr: a.clientes.filter((x) => !x.demo && x.plano === p.id && (x.status === "ativa" || x.status === "atrasada")).reduce((s, x) => s + x.valor, 0) }));
  const maxPlano = Math.max(1, ...porPlano.map((x) => x.mrr));
  const ITENS: { id: Aba; rotulo: string; icone: React.ReactNode }[] = [
    { id: "visao", rotulo: "Visão geral", icone: <LayoutDashboard className="h-5 w-5" /> },
    { id: "clientes", rotulo: "Clientes", icone: <Building2 className="h-5 w-5" /> },
    { id: "financeiro", rotulo: "Financeiro", icone: <CircleDollarSign className="h-5 w-5" /> },
    { id: "planos", rotulo: "Planos", icone: <Layers className="h-5 w-5" /> },
    { id: "atividade", rotulo: "Atividade", icone: <History className="h-5 w-5" /> },
    { id: "config", rotulo: "Configurações", icone: <Settings className="h-5 w-5" /> },
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
                <span className="block truncate font-semibold">{x.loja} {x.demo && <span className="ml-1.5 rounded-full bg-[#e6eefb] px-2 py-0.5 align-middle text-[11px] font-semibold text-[#1d4f91]">Demonstração</span>}</span>
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
          <a href="https://fregues-site.vercel.app" target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl px-3 py-2 text-[14px] text-areia hover:text-papel">
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
                          <span className="min-w-0 flex-1 truncate font-semibold">{x.loja} {x.demo && <span className="ml-1.5 rounded-full bg-[#e6eefb] px-2 py-0.5 align-middle text-[11px] font-semibold text-[#1d4f91]">Demonstração</span>}</span>
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
                  <p className="text-[15px] text-areia">{a.clientes.filter((x) => !x.demo).length} restaurantes na carteira{a.clientes.some((x) => x.demo) ? " (mais a loja de demonstração)" : ""}. Toque em um para ver uso, plano e faturas.</p>
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
                            <p className="font-semibold">{x.loja} {x.demo && <span className="ml-1.5 rounded-full bg-[#e6eefb] px-2 py-0.5 align-middle text-[11px] font-semibold text-[#1d4f91]">Demonstração</span>}</p>
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

          {aba === "config" && <Configuracoes a={a} />}

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
