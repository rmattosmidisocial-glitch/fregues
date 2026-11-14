// Bloco do Admin: planos editáveis, regras de cobrança, modelos de mensagem, saúde das integrações,
// outros administradores, relatórios da carteira, lembretes de mensalidade e extras da ficha do cliente.
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, CheckCircle2, CircleHelp, Download, Pencil, Plus, RefreshCw, ShieldCheck, Trash2, X, XCircle } from "lucide-react";
import { brl } from "../../data/mock";
import { Enviar, dataBR, desde, diasAte, linkLojaDe, senhaProvisoria } from "./comum";
import { MODELOS_INFO, MODELOS_PADRAO, REGRAS_PADRAO, mensagem, preencher, type AdminUser, type ChaveModelo, type Cliente, type FichaExtra, type GrupoErro, type ItemSaude, type LinhaRelatorio, type Plano, type Regras, type useAdmin } from "./adminDados";

type A = ReturnType<typeof useAdmin>;
const inp = "mt-1 w-full rounded-xl border border-linha bg-carvao px-3 py-2.5 text-[15px] text-papel";
const caixa = "rounded-3xl border border-linha bg-forno p-5";
const Aviso = ({ m }: { m: { ok: boolean; t: string } | null }) => (m ? <p className={`text-[14px] ${m.ok ? "text-manjericao" : "text-[#e8846f]"}`}>{m.t}</p> : null);

/* ---------------- 19. Planos e preços ---------------- */

function EditarPlano({ a, p, novo, fechar }: { a: A; p: Plano; novo: boolean; fechar: () => void }) {
  const [f, setF] = useState({
    ...p,
    recursosTxt: p.recursos.join("\n"),
    precoTxt: String(p.preco).replace(".", ","),
  });
  const [m, setM] = useState<{ ok: boolean; t: string } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const nClientes = a.clientes.filter((c) => !c.demo && c.plano === p.id && c.status !== "cancelada").length;
  const salvar = async () => {
    const preco = Number(f.precoTxt.replace(/\./g, "").replace(",", "."));
    if (!Number.isFinite(preco) || preco < 0) return setM({ ok: false, t: "Preço inválido" });
    const id = novo
      ? f.nome
          .toLowerCase()
          .normalize("NFD")
          .replace(/[̀-ͯ]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "")
          .slice(0, 30)
      : p.id;
    if (!id || id.length < 2) return setM({ ok: false, t: "Dê um nome ao plano" });
    if (novo && a.planos.some((x) => x.id === id)) return setM({ ok: false, t: "Já existe um plano com esse nome" });
    setOcupado(true);
    const r = await a.acoes.salvarPlano({
      id,
      nome: f.nome.trim(),
      preco,
      descricao: f.descricao ?? "",
      recursos: f.recursosTxt
        .split("\n")
        .map((x) => x.trim())
        .filter(Boolean),
      ordem: f.ordem ?? a.planos.length + 1,
      ativo: f.ativo !== false,
    });
    setOcupado(false);
    if (r) return setM({ ok: false, t: r });
    fechar();
  };
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={fechar}>
      <div role="dialog" aria-label="Editar plano" className="scroll-thin max-h-[92vh] w-full max-w-[520px] overflow-y-auto rounded-3xl border border-linha bg-forno p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-[24px] font-extrabold">{novo ? "Novo plano" : `Plano ${p.nome}`}</h2>
          <button onClick={fechar} aria-label="Fechar" className="rounded-full p-2 hover:bg-grafite">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-4 space-y-3 text-[14px]">
          <label className="block font-semibold">
            Nome
            <input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} className={inp} />
          </label>
          <label className="block font-semibold">
            Preço por mês (R$)
            <input inputMode="decimal" value={f.precoTxt} onChange={(e) => setF({ ...f, precoTxt: e.target.value })} className={`${inp} tabular`} />
          </label>
          <label className="block font-semibold">
            Frase curta
            <input value={f.descricao ?? ""} onChange={(e) => setF({ ...f, descricao: e.target.value })} className={inp} />
          </label>
          <label className="block font-semibold">
            O que o plano inclui <span className="font-normal text-areia">(um item por linha)</span>
            <textarea rows={6} value={f.recursosTxt} onChange={(e) => setF({ ...f, recursosTxt: e.target.value })} className={inp} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block font-semibold">
              Ordem na lista
              <input type="number" min={0} value={f.ordem ?? 0} onChange={(e) => setF({ ...f, ordem: Number(e.target.value) })} className={`${inp} tabular`} />
            </label>
            <label className="flex items-end gap-2 pb-3 font-semibold">
              <input type="checkbox" checked={f.ativo !== false} onChange={(e) => setF({ ...f, ativo: e.target.checked })} className="h-5 w-5 accent-[#f06a3a]" />
              Disponível para novos clientes
            </label>
          </div>
          {!novo && nClientes > 0 && (
            <p className="rounded-xl bg-grafite p-3 text-areia">
              {nClientes} cliente{nClientes > 1 ? "s" : ""} neste plano. O preço novo vale para quem entrar daqui em diante; quem já é cliente continua com o valor da ficha dele (mude na ficha, se quiser).
            </p>
          )}
          <Aviso m={m} />
          <button disabled={ocupado} onClick={salvar} className="w-full rounded-xl bg-brasa py-3 font-semibold text-carvao hover:bg-mostarda disabled:opacity-60">
            {ocupado ? "Salvando…" : "Salvar plano"}
          </button>
          {!novo && (
            <button
              onClick={async () => {
                if (!confirm(`Excluir o plano ${p.nome}?`)) return;
                const r = await a.acoes.excluirPlano(p.id);
                if (r) setM({ ok: false, t: r });
                else fechar();
              }}
              className="flex w-full items-center justify-center gap-1.5 py-2 text-[13px] text-areia hover:text-[#e8846f]"
            >
              <Trash2 className="h-4 w-4" /> Excluir plano
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function PlanosAdmin({ a }: { a: A }) {
  const [edit, setEdit] = useState<{ p: Plano; novo: boolean } | null>(null);
  const porPlano = a.planos.map((p) => ({
    p,
    n: a.clientes.filter((x) => !x.demo && x.plano === p.id && x.status !== "cancelada").length,
    mrr: a.clientes.filter((x) => !x.demo && x.plano === p.id && (x.status === "ativa" || x.status === "atrasada")).reduce((s, x) => s + x.valor, 0),
  }));
  const maxPlano = Math.max(1, ...porPlano.map((x) => x.mrr));
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-[clamp(2rem,4vw,2.8rem)] font-extrabold tracking-[-0.015em]">Planos</h1>
          <p className="text-[15px] text-areia">Mude nomes, preços e o que cada plano inclui. Vale para os próximos clientes.</p>
        </div>
        <button
          onClick={() =>
            setEdit({
              p: {
                id: "",
                nome: "",
                preco: 0,
                descricao: "",
                recursos: [],
                ordem: a.planos.length + 1,
                ativo: true,
              },
              novo: true,
            })
          }
          className="flex items-center gap-1.5 rounded-full bg-brasa px-4 py-2.5 text-[14px] font-semibold text-carvao hover:bg-mostarda"
        >
          <Plus className="h-4 w-4" /> Novo plano
        </button>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {porPlano.map(({ p, n, mrr }) => (
          <section key={p.id} className={`flex flex-col rounded-3xl border border-linha bg-forno p-6 ${p.ativo === false ? "opacity-70" : ""}`}>
            <div className="flex items-start justify-between gap-2">
              <p className="font-display text-[22px] font-extrabold">{p.nome}</p>
              <button onClick={() => setEdit({ p, novo: false })} className="flex items-center gap-1 rounded-full border border-linha px-3 py-1 text-[13px] font-semibold hover:border-areia">
                <Pencil className="h-3.5 w-3.5" /> Editar
              </button>
            </div>
            {p.ativo === false && <p className="mt-1 w-fit rounded-full bg-grafite px-2 py-0.5 text-[12px] font-semibold text-areia">Desativado para novos clientes</p>}
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
      <p className="text-[13px] text-areia">Para mudar o preço de um cliente específico (desconto, reajuste), use a ficha dele.</p>
      {edit && <EditarPlano a={a} p={edit.p} novo={edit.novo} fechar={() => setEdit(null)} />}
    </div>
  );
}

/* ---------------- 20. Regras de cobrança ---------------- */

export function RegrasCobranca({ a }: { a: A }) {
  const pegar = (): Regras => ({
    tolerancia_dias: a.config.tolerancia_dias,
    suspender_dias: a.config.suspender_dias,
    multa_pct: a.config.multa_pct,
    juros_pct: a.config.juros_pct,
    aviso_dias: a.config.aviso_dias,
    teste_dias: a.config.teste_dias,
  });
  const [r, setR] = useState<Regras>(pegar);
  const [m, setM] = useState<{ ok: boolean; t: string } | null>(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setR(pegar()), [a.config]);
  const campo = (k: keyof Regras, rotulo: string, sufixo: string, max: number, passo = 1, dica?: string) => (
    <label className="flex items-center justify-between gap-3 rounded-2xl bg-grafite p-3 text-[14px]">
      <span>
        <span className="font-semibold">{rotulo}</span>
        {dica && <span className="block text-[12px] text-areia">{dica}</span>}
      </span>
      <span className="flex shrink-0 items-center gap-1.5">
        <input type="number" min={0} max={max} step={passo} value={r[k]} onChange={(e) => setR({ ...r, [k]: Number(e.target.value) })} className="tabular w-20 rounded-lg border border-linha bg-carvao px-2 py-1.5 text-right" />
        <span className="w-14 text-areia">{sufixo}</span>
      </span>
    </label>
  );
  return (
    <form
      className={`${caixa} space-y-2.5`}
      onSubmit={async (e) => {
        e.preventDefault();
        const x = await a.acoes.salvarRegras(r);
        setM(
          x
            ? { ok: false, t: x }
            : {
                ok: true,
                t: 'Regras salvas. Valem a partir da rotina de amanhã; multa e juros entram nas novas cobranças da Asaas (e nas em aberto ao clicar em "Atualizar cobranças" na ficha).',
              },
        );
      }}
    >
      <h2 className="text-[18px] font-bold">Regras de cobrança</h2>
      <p className="text-[14px] text-areia">A rotina diária segue estas regras. Multa e juros vão para os boletos e Pix da Asaas.</p>
      {campo("teste_dias", "Teste grátis", "dias", 60, 1, "Sugerido ao cadastrar cliente novo")}
      {campo("aviso_dias", "Lembrar antes do vencimento", "dias", 15, 1, "Aparece na Visão geral com o botão de WhatsApp")}
      {campo("tolerancia_dias", "Tolerância depois do vencimento", "dias", 30, 1, "Depois disso o cliente fica como atrasado")}
      {campo("suspender_dias", "Tirar a loja do ar com", "dias", 90, 1, "de atraso, até pagar")}
      {campo("multa_pct", "Multa por atraso", "%", 2, 0.1, "Máximo 2% (Código de Defesa do Consumidor)")}
      {campo("juros_pct", "Juros por mês de atraso", "% ao mês", 1, 0.1, "Máximo 1% ao mês")}
      <Aviso m={m} />
      <div className="flex gap-2">
        <button className="flex-1 rounded-xl bg-brasa py-3 font-semibold text-carvao hover:bg-mostarda">Salvar regras</button>
        <button type="button" onClick={() => setR(REGRAS_PADRAO)} className="rounded-xl border border-linha px-4 text-[14px] font-semibold hover:border-areia">
          Padrão
        </button>
      </div>
    </form>
  );
}

/* ---------------- 21. Modelos de mensagem ---------------- */

const EXEMPLO = {
  nome: "Carla",
  loja: "Cantina da Vila",
  link: "https://fregues.app/pagar/abc123",
  link_loja: "https://fregues.app/?r=cantina-da-vila#loja",
  email: "carla@cantina.com",
  senha: "cantinadavila4821",
  valor: "R$ 249,00",
  vencimento: "10/12",
};

export function ModelosMensagem({ a }: { a: A }) {
  const [sel, setSel] = useState<ChaveModelo>("acesso");
  const [txt, setTxt] = useState<Record<string, string>>({});
  const [m, setM] = useState<{ ok: boolean; t: string } | null>(null);
  useEffect(() => setTxt(Object.fromEntries(MODELOS_INFO.map((x) => [x.id, a.config.modelos?.[x.id] || MODELOS_PADRAO[x.id]]))), [a.config.modelos]);
  const info = MODELOS_INFO.find((x) => x.id === sel)!;
  const atual = txt[sel] ?? MODELOS_PADRAO[sel];
  const exemplo = preencher(atual, {
    ...EXEMPLO,
    assinatura: mensagem(a.config, "acesso", {}).split("\n").pop(),
    dias_suspensao: a.config.suspender_dias,
  });
  return (
    <section className={`${caixa} space-y-3`}>
      <h2 className="text-[18px] font-bold">Modelos de mensagem</h2>
      <p className="text-[14px] text-areia">Os textos que vão no WhatsApp para os clientes. O que está entre chaves o sistema troca sozinho.</p>
      <div className="flex flex-wrap gap-1.5">
        {MODELOS_INFO.map((x) => (
          <button key={x.id} onClick={() => setSel(x.id)} aria-pressed={sel === x.id} className={`rounded-full px-3 py-1.5 text-[13px] font-semibold ${sel === x.id ? "bg-papel text-carvao" : "border border-linha text-areia hover:text-papel"}`}>
            {x.titulo}
            {a.config.modelos?.[x.id] ? " •" : ""}
          </button>
        ))}
      </div>
      <p className="text-[13px] text-areia">Quando: {info.quando}</p>
      <textarea rows={8} value={atual} onChange={(e) => setTxt({ ...txt, [sel]: e.target.value })} className={`${inp} font-mono text-[13px]`} aria-label={info.titulo} />
      <div className="flex flex-wrap gap-1.5">
        {info.campos.map((c) => (
          <button key={c} type="button" onClick={() => setTxt({ ...txt, [sel]: `${atual}{${c}}` })} className="rounded-full bg-grafite px-2.5 py-1 font-mono text-[12px] hover:bg-linha">
            {`{${c}}`}
          </button>
        ))}
      </div>
      <div>
        <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-areia">Como fica</p>
        <p className="mt-1 whitespace-pre-line break-words rounded-xl bg-carvao p-3 text-[14px]">{exemplo}</p>
      </div>
      <Aviso m={m} />
      <div className="flex gap-2">
        <button
          onClick={async () => {
            const x = await a.acoes.salvarModelos(txt as Record<ChaveModelo, string>);
            setM(x ? { ok: false, t: x } : { ok: true, t: "Modelos salvos." });
          }}
          className="flex-1 rounded-xl bg-brasa py-3 font-semibold text-carvao hover:bg-mostarda"
        >
          Salvar modelos
        </button>
        <button onClick={() => setTxt({ ...txt, [sel]: MODELOS_PADRAO[sel] })} className="rounded-xl border border-linha px-4 text-[14px] font-semibold hover:border-areia">
          Voltar ao padrão
        </button>
      </div>
    </section>
  );
}

/* ---------------- 22. Saúde das integrações ---------------- */

export function SaudeIntegracoes({ a }: { a: A }) {
  const [itens, setItens] = useState<ItemSaude[] | null>(null);
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const conferir = async () => {
    setOcupado(true);
    setErro("");
    const r = await a.acoes.geral<{ itens: ItemSaude[] }>({ acao: "saude" });
    setOcupado(false);
    if (r.erro) return setErro(r.erro);
    setItens(r.itens);
  };
  useEffect(() => {
    if (a.modo === "real") conferir();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <section className={`${caixa} space-y-3`}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[18px] font-bold">Saúde das integrações</h2>
        <button onClick={conferir} disabled={ocupado} className="flex items-center gap-1.5 rounded-full border border-linha px-3 py-1.5 text-[13px] font-semibold hover:border-areia disabled:opacity-60">
          <RefreshCw className={`h-3.5 w-3.5 ${ocupado ? "animate-spin" : ""}`} /> {ocupado ? "Conferindo…" : "Conferir agora"}
        </button>
      </div>
      {a.modo === "demo" && <p className="text-[14px] text-areia">Na versão publicada, aqui aparece se banco, Asaas, e-mail e IA estão funcionando.</p>}
      {erro && <p className="text-[14px] text-[#e8846f]">{erro}</p>}
      {itens && (
        <ul className="space-y-2">
          {itens.map((i) => (
            <li key={i.nome} className="flex items-start gap-3 rounded-2xl bg-grafite p-3 text-[14px]">
              {i.ok === true ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-manjericao" /> : i.ok === false ? <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#e8846f]" /> : <CircleHelp className="mt-0.5 h-5 w-5 shrink-0 text-mostarda" />}
              <span>
                <span className="block font-semibold">{i.nome}</span>
                <span className="text-areia">{i.detalhe}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="text-[12px] text-areia">Verde: funcionando. Amarelo: ainda não configurado (o sistema segue funcionando sem). Vermelho: precisa de atenção.</p>
    </section>
  );
}

/* ---------------- 23. Outros administradores ---------------- */

export function Administradores({ a }: { a: A }) {
  const [lista, setLista] = useState<AdminUser[] | null>(null);
  const [email, setEmail] = useState("");
  const [tel, setTel] = useState("");
  const [senha, setSenha] = useState(() => senhaProvisoria("admin"));
  const [m, setM] = useState<{ ok: boolean; t: string } | null>(null);
  const [pronto, setPronto] = useState<{
    email: string;
    senha: string;
    link: string;
  } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const carregar = () => a.acoes.admins().then(setLista);
  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <section className={`${caixa} space-y-3`}>
      <h2 className="flex items-center gap-2 text-[18px] font-bold">
        <ShieldCheck className="h-5 w-5 text-brasa" /> Administradores
      </h2>
      <p className="text-[14px] text-areia">Quem pode entrar nesta área. Administradores não entram no painel dos restaurantes.</p>
      <ul className="space-y-2">
        {(lista ?? []).map((u) => (
          <li key={u.user_id} className="flex items-center justify-between gap-3 rounded-2xl bg-grafite p-3 text-[14px]">
            <span className="min-w-0">
              <span className="block break-all font-semibold">
                {u.email} {u.eu && <span className="ml-1 rounded-full bg-carvao px-2 py-0.5 text-[11px] text-areia">você</span>}
              </span>
              <span className="text-[12px] text-areia">
                {u.ultimo_login ? `Último acesso ${desde(u.ultimo_login)}` : "Ainda não entrou"}
                {u.provisoria ? " · com senha provisória" : ""}
              </span>
            </span>
            {!u.eu && (
              <button
                onClick={async () => {
                  if (!confirm(`Tirar o acesso de ${u.email}?`)) return;
                  const r = await a.acoes.removerAdmin(u.user_id);
                  setM(r ? { ok: false, t: r } : { ok: true, t: "Acesso retirado." });
                  carregar();
                }}
                className="shrink-0 rounded-full border border-linha px-3 py-1 text-[12px] font-semibold text-areia hover:border-[#e8846f] hover:text-[#e8846f]"
              >
                Tirar acesso
              </button>
            )}
          </li>
        ))}
        {lista === null && <li className="text-[14px] text-areia">Carregando…</li>}
      </ul>
      {pronto ? (
        <div className="rounded-2xl border border-linha p-3 text-[14px]">
          <p className="font-semibold text-manjericao">Acesso criado. Mande para a pessoa:</p>
          {(() => {
            const msg = `Olá! Você agora é administrador do Freguês.\n\nAcesse: ${pronto.link}\nE-mail: ${pronto.email}\nSenha provisória: ${pronto.senha}\n\nNo primeiro acesso, crie a sua própria senha.\n${mensagem(a.config, "acesso", {}).split("\n").pop()}`;
            return (
              <>
                <p className="mt-2 whitespace-pre-line break-words rounded-xl bg-carvao p-3">{msg}</p>
                <Enviar msg={msg} telefone={tel} />
              </>
            );
          })()}
          <button onClick={() => setPronto(null)} className="mt-2 w-full py-2 text-[13px] text-areia hover:text-papel">
            Fechar
          </button>
        </div>
      ) : (
        <form
          className="space-y-2 rounded-2xl border border-linha p-3 text-[14px]"
          onSubmit={async (e) => {
            e.preventDefault();
            setM(null);
            setOcupado(true);
            const r = await a.acoes.geral<{ email: string; link: string }>({
              acao: "novo_admin",
              email,
              senha,
            });
            setOcupado(false);
            if (r.erro) return setM({ ok: false, t: r.erro });
            setPronto({ email: r.email, senha, link: r.link });
            setEmail("");
            setSenha(senhaProvisoria("admin"));
            carregar();
          }}
        >
          <p className="font-semibold">Adicionar administrador</p>
          <label className="block">
            E-mail
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inp} />
          </label>
          <label className="block">
            WhatsApp <span className="text-areia">(para mandar o acesso)</span>
            <input type="tel" value={tel} onChange={(e) => setTel(e.target.value)} className={inp} />
          </label>
          <label className="block">
            Senha provisória
            <input required minLength={8} value={senha} onChange={(e) => setSenha(e.target.value)} className={inp} />
          </label>
          <button disabled={ocupado} className="w-full rounded-xl border-2 border-papel py-2.5 font-semibold text-papel hover:bg-papel hover:text-carvao disabled:opacity-60">
            {ocupado ? "Criando…" : "Criar acesso de administrador"}
          </button>
        </form>
      )}
      <Aviso m={m} />
    </section>
  );
}

/** Primeiro acesso de um administrador criado por outro: troca a senha provisória. */
export function PrimeiraSenhaAdmin({ a }: { a: A }) {
  const [s1, setS1] = useState("");
  const [s2, setS2] = useState("");
  const [m, setM] = useState<string | null>(null);
  return (
    <div className="tema-claro grid min-h-screen place-items-center bg-carvao p-4">
      <form
        className="w-full max-w-[400px] space-y-3 rounded-3xl border border-linha bg-forno p-7"
        onSubmit={async (e) => {
          e.preventDefault();
          if (s1 !== s2) return setM("As duas senhas não são iguais.");
          const r = await a.acoes.trocarMinhaSenha(s1);
          if (r) setM(r);
        }}
      >
        <ShieldCheck className="h-8 w-8 text-brasa" />
        <h1 className="font-display text-[28px] font-extrabold">Crie a sua senha</h1>
        <p className="text-[15px] text-areia">Você entrou com uma senha provisória. Crie uma só sua para continuar.</p>
        <input type="password" required minLength={8} autoComplete="new-password" placeholder="Nova senha (mínimo 8)" value={s1} onChange={(e) => setS1(e.target.value)} className={inp} />
        <input type="password" required minLength={8} autoComplete="new-password" placeholder="Repita a senha" value={s2} onChange={(e) => setS2(e.target.value)} className={inp} />
        {m && <p className="text-[14px] text-[#e8846f]">{m}</p>}
        <button className="w-full rounded-xl bg-brasa py-3 font-semibold text-carvao hover:bg-mostarda">Salvar e entrar</button>
      </form>
    </div>
  );
}

/* ---------------- 24. Relatórios da carteira ---------------- */

const mesCurto = (s: string) => new Date(s + "T12:00:00").toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }).replace(". de ", "/").replace(" de ", "/");

export function Relatorios({ a }: { a: A }) {
  const [meses, setMeses] = useState(12);
  const [l, setL] = useState<LinhaRelatorio[] | null>(null);
  useEffect(() => {
    setL(null);
    a.acoes.relatorio(meses).then(setL);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meses, a.faturas.length, a.clientes.length]);
  const tot = useMemo(() => {
    if (!l) return null;
    const recebido = l.reduce((s, x) => s + x.recebido, 0);
    const faturado = l.reduce((s, x) => s + x.faturado, 0);
    const novos = l.reduce((s, x) => s + x.novos, 0);
    const cancel = l.reduce((s, x) => s + x.cancelados, 0);
    const base = l.reduce((s, x) => s + x.clientes, 0) / Math.max(1, l.length);
    const atraso = l.reduce((s, x) => s + x.em_atraso, 0);
    return {
      recebido,
      faturado,
      novos,
      cancel,
      churn: base ? (cancel / l.length / base) * 100 : 0,
      inad: faturado ? (atraso / faturado) * 100 : 0,
    };
  }, [l]);
  const reais = a.clientes.filter((c) => !c.demo && c.status !== "cancelada");
  const porBairro = Object.entries(reais.reduce<Record<string, number>>((s, c) => ((s[c.bairro || "Sem bairro"] = (s[c.bairro || "Sem bairro"] ?? 0) + 1), s), {}))
    .sort((x, y) => y[1] - x[1])
    .slice(0, 8);
  const maxRec = Math.max(1, ...(l ?? []).map((x) => Math.max(x.recebido, x.faturado)));
  const baixar = () => {
    if (!l) return;
    const linhas = [
      ["Mês", "Recebido", "Faturado", "Em atraso", "Clientes novos", "Cancelamentos", "Clientes no fim do mês"],
      ...l.map((x) => [x.mes.slice(0, 7), x.recebido.toFixed(2).replace(".", ","), x.faturado.toFixed(2).replace(".", ","), x.em_atraso.toFixed(2).replace(".", ","), x.novos, x.cancelados, x.clientes]),
    ];
    const csv = "﻿" + linhas.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    const u = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const el = document.createElement("a");
    el.href = u;
    el.download = `fregues-carteira-${new Date().toISOString().slice(0, 10)}.csv`;
    el.click();
    URL.revokeObjectURL(u);
  };
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-[clamp(2rem,4vw,2.8rem)] font-extrabold tracking-[-0.015em]">Relatórios</h1>
          <p className="text-[15px] text-areia">Como a carteira evoluiu mês a mês. A loja de demonstração fica de fora.</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={meses} onChange={(e) => setMeses(Number(e.target.value))} className="rounded-full border border-linha bg-forno px-3 py-2 text-[14px]" aria-label="Período">
            <option value={6}>Últimos 6 meses</option>
            <option value={12}>Últimos 12 meses</option>
            <option value={24}>Últimos 24 meses</option>
          </select>
          <button onClick={baixar} disabled={!l} className="flex items-center gap-1.5 rounded-full bg-papel px-4 py-2 text-[14px] font-semibold text-carvao disabled:opacity-60">
            <Download className="h-4 w-4" /> Planilha
          </button>
        </div>
      </div>
      {!l || !tot ? (
        <p className="text-areia">Montando o relatório…</p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Recebido no período", brl(tot.recebido), `${brl(tot.faturado)} faturado`],
              ["Clientes novos", String(tot.novos), `${tot.cancel} cancelamento${tot.cancel === 1 ? "" : "s"}`],
              ["Cancelamento por mês", `${tot.churn.toFixed(1).replace(".", ",")}%`, "dos clientes, em média"],
              ["Inadimplência", `${tot.inad.toFixed(1).replace(".", ",")}%`, "do faturado está em atraso"],
            ].map(([k, v, s]) => (
              <div key={k} className="rounded-3xl border border-linha bg-forno p-5">
                <p className="text-[13px] text-areia">{k}</p>
                <p className="tabular mt-1 font-display text-[28px] font-extrabold leading-tight">{v}</p>
                <p className="mt-1 text-[13px] text-areia">{s}</p>
              </div>
            ))}
          </div>

          <section className={caixa}>
            <h2 className="font-semibold">Recebido e faturado por mês</h2>
            <p className="mt-0.5 flex gap-4 text-[12px] text-areia">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-brasa" /> Recebido
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-linha" /> Faturado
              </span>
            </p>
            <div className="scroll-thin mt-4 flex h-[200px] items-end gap-2 overflow-x-auto">
              {l.map((x) => (
                <div key={x.mes} className="flex h-full min-w-[34px] flex-1 flex-col items-center justify-end gap-1" title={`${mesCurto(x.mes)}: recebido ${brl(x.recebido)} · faturado ${brl(x.faturado)}`}>
                  <div className="flex h-full w-full items-end justify-center gap-0.5">
                    <span className="w-1/2 max-w-[14px] rounded-t bg-brasa" style={{ height: `${(x.recebido / maxRec) * 100}%` }} />
                    <span className="w-1/2 max-w-[14px] rounded-t bg-linha" style={{ height: `${(x.faturado / maxRec) * 100}%` }} />
                  </div>
                  <span className="whitespace-nowrap text-[11px] capitalize text-areia">{mesCurto(x.mes)}</span>
                </div>
              ))}
            </div>
          </section>

          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <section className="overflow-x-auto rounded-3xl border border-linha bg-forno">
              <table className="w-full min-w-[520px] text-[14px]">
                <thead>
                  <tr className="border-b border-linha text-left text-[12px] text-areia">
                    <th className="px-4 py-3 font-medium">Mês</th>
                    <th className="px-4 py-3 text-right font-medium">Recebido</th>
                    <th className="px-4 py-3 text-right font-medium">Em atraso</th>
                    <th className="px-4 py-3 text-right font-medium">Novos</th>
                    <th className="px-4 py-3 text-right font-medium">Saíram</th>
                    <th className="px-4 py-3 text-right font-medium">Clientes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-linha">
                  {[...l].reverse().map((x) => (
                    <tr key={x.mes}>
                      <td className="px-4 py-2.5 capitalize">{mesCurto(x.mes)}</td>
                      <td className="tabular px-4 py-2.5 text-right font-semibold">{brl(x.recebido)}</td>
                      <td className={`tabular px-4 py-2.5 text-right ${x.em_atraso ? "text-mostarda" : "text-areia"}`}>{brl(x.em_atraso)}</td>
                      <td className="tabular px-4 py-2.5 text-right">{x.novos}</td>
                      <td className="tabular px-4 py-2.5 text-right">{x.cancelados}</td>
                      <td className="tabular px-4 py-2.5 text-right">{x.clientes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
            <section className={caixa}>
              <h2 className="font-semibold">Clientes por bairro</h2>
              <ul className="mt-3 space-y-2 text-[14px]">
                {porBairro.map(([b, n]) => (
                  <li key={b}>
                    <p className="flex justify-between">
                      <span>{b}</span>
                      <b className="tabular">{n}</b>
                    </p>
                    <span className="mt-1 block h-1.5 rounded-full bg-grafite">
                      <span
                        className="block h-full rounded-full bg-brasa"
                        style={{
                          width: `${(n / Math.max(1, porBairro[0][1])) * 100}%`,
                        }}
                      />
                    </span>
                  </li>
                ))}
                {porBairro.length === 0 && <li className="text-areia">Nenhum cliente ainda.</li>}
              </ul>
            </section>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------------- Lembretes de mensalidade (Visão geral) ---------------- */

export function Lembretes({ a, abrir }: { a: A; abrir: (org: string) => void }) {
  const [aberto, setAberto] = useState<string | null>(null);
  const linkDe = (org: string) => a.faturas.find((f) => f.org_id === org && (f.status === "aberta" || f.status === "atrasada") && f.link)?.link ?? "";
  const vencendo = a.clientes.filter((c) => !c.demo && c.status === "ativa" && (diasAte(c.proximo_vencimento) ?? 99) >= 0 && (diasAte(c.proximo_vencimento) ?? 99) <= a.config.aviso_dias);
  const atrasados = a.clientes.filter((c) => !c.demo && c.status === "atrasada");
  const linha = (c: Cliente, tipo: "lembrete" | "atraso") => {
    const fat = a.faturas.filter((f) => f.org_id === c.org_id && (f.status === "aberta" || f.status === "atrasada")).sort((x, y) => x.vencimento.localeCompare(y.vencimento))[0];
    const venc = fat?.vencimento ?? c.proximo_vencimento;
    const msg = mensagem(a.config, tipo, {
      nome: c.responsavel.split(" ")[0],
      loja: c.loja,
      valor: brl(fat?.valor ?? c.valor),
      vencimento: venc
        ? new Date(venc + "T12:00:00").toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
          })
        : "",
      link: linkDe(c.org_id),
    });
    const k = tipo + c.org_id;
    return (
      <li key={k} className="rounded-xl bg-grafite px-3 py-2.5 text-[14px]">
        <div className="flex items-center justify-between gap-2">
          <button onClick={() => abrir(c.org_id)} className="min-w-0 text-left">
            <span className="block truncate font-semibold">{c.loja}</span>
            <span className="block text-[12px] text-areia">
              {brl(fat?.valor ?? c.valor)} · {tipo === "lembrete" ? `vence ${dataBR(venc)}` : `venceu ${dataBR(venc)}`}
            </span>
          </button>
          <button onClick={() => setAberto(aberto === k ? null : k)} className="shrink-0 rounded-full bg-[#25d366] px-3 py-1 text-[12px] font-bold text-[#0b2e17]">
            {tipo === "lembrete" ? "Lembrar" : "Cobrar"}
          </button>
        </div>
        {aberto === k && (
          <div className="mt-2">
            <p className="whitespace-pre-line break-words rounded-xl bg-carvao p-3 text-[13px]">{msg}</p>
            <Enviar msg={msg} telefone={c.telefone} />
          </div>
        )}
      </li>
    );
  };
  if (!vencendo.length && !atrasados.length) return null;
  return (
    <section className={caixa}>
      <h3 className="flex items-center gap-2 font-semibold">
        <AlertTriangle className="h-4 w-4 text-mostarda" /> Mensalidades para avisar
      </h3>
      <p className="mt-0.5 text-[13px] text-areia">Vencendo nos próximos {a.config.aviso_dias} dias e atrasadas. A mensagem segue o seu modelo.</p>
      <ul className="mt-3 space-y-1.5">
        {atrasados.map((c) => linha(c, "atraso"))}
        {vencendo.map((c) => linha(c, "lembrete"))}
      </ul>
    </section>
  );
}

/* ---------------- Ficha do cliente: termos, cancelamento e boas-vindas ---------------- */

export function FichaExtras({ a, c }: { a: A; c: Cliente }) {
  const [x, setX] = useState<FichaExtra | null>(null);
  const [msg, setMsg] = useState("");
  const [boas, setBoas] = useState(false);
  useEffect(() => {
    a.acoes.fichaExtra(c.org_id).then(setX);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c.org_id]);
  const texto = mensagem(a.config, "boas_vindas", {
    nome: c.responsavel.split(" ")[0],
    loja: c.loja,
    link_loja: linkLojaDe(c.slug),
  });
  return (
    <>
      {x?.cancelamento_em && (
        <section className="mt-4 rounded-2xl border-2 border-[#e8846f] p-4 text-[14px]">
          <h3 className="font-semibold text-[#e8846f]">Pediu cancelamento {desde(x.cancelamento_em)}</h3>
          <p className="mt-1">{x.cancelamento_motivo || "Sem motivo informado."}</p>
          <p className="mt-2 text-areia">Fale com o cliente. Se ele desistir, marque como resolvido; se confirmar, use "Cancelar" acima.</p>
          <button
            onClick={async () => {
              const r = await a.acoes.resolverCancelamento(c.org_id);
              setMsg(r ?? "Pedido marcado como resolvido.");
              if (!r) setX({ ...x, cancelamento_em: null });
            }}
            className="mt-2 rounded-full border border-linha px-3 py-1.5 text-[13px] font-semibold hover:border-areia"
          >
            Marcar como resolvido
          </button>
        </section>
      )}
      <section className="mt-4 rounded-2xl border border-linha p-4 text-[14px]">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold">Mensagem de boas-vindas</h3>
          <button onClick={() => setBoas(!boas)} className="rounded-full border border-linha px-3 py-1 text-[13px] font-semibold hover:border-areia">
            {boas ? "Fechar" : "Abrir"}
          </button>
        </div>
        {boas && (
          <>
            <p className="mt-2 whitespace-pre-line break-words rounded-xl bg-carvao p-3">{texto}</p>
            <Enviar msg={texto} telefone={c.telefone} />
          </>
        )}
      </section>
      {x && (
        <section className="mt-4 rounded-2xl border border-linha p-4 text-[14px]">
          <h3 className="font-semibold">Termos de uso</h3>
          {x.termos.length ? (
            <ul className="mt-1 space-y-1 text-areia">
              {x.termos.map((t) => (
                <li key={t.email + t.versao}>
                  {t.email} aceitou a versão {t.versao} em{" "}
                  {new Date(t.aceito_em).toLocaleString("pt-BR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-areia">Ainda não aceitou (o painel pede no primeiro acesso).</p>
          )}
        </section>
      )}
      {msg && <p className="mt-2 text-[14px] text-manjericao">{msg}</p>}
    </>
  );
}

/* ---------------- 26. Monitor de erros ---------------- */

const ORIGEM: Record<string, string> = { navegador: "Navegador", promessa: "Navegador", tela: "Tela quebrou", servidor: "Servidor" };
const navegadorCurto = (ua: string | null) => {
  if (!ua) return "";
  const so = /iPhone|iPad/.test(ua) ? "iPhone" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : /Mac OS/.test(ua) ? "Mac" : "";
  const nav = /Edg\//.test(ua) ? "Edge" : /SamsungBrowser/.test(ua) ? "Samsung" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : /Firefox\//.test(ua) ? "Firefox" : "";
  return [nav, so].filter(Boolean).join(" no ");
};

export function ErrosSistema({ a }: { a: A }) {
  const [dias, setDias] = useState(7);
  const [lista, setLista] = useState<GrupoErro[] | null>(null);
  const [aberto, setAberto] = useState<string | null>(null);
  const carregar = () => {
    setLista(null);
    a.acoes.erros(dias).then(setLista);
  };
  useEffect(carregar, [dias]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <section className={`${caixa} space-y-3`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[18px] font-bold">Erros do sistema</h2>
        <div className="flex items-center gap-2">
          <select value={dias} onChange={(e) => setDias(Number(e.target.value))} className="rounded-full border border-linha bg-carvao px-3 py-1.5 text-[13px]" aria-label="Período">
            <option value={1}>Últimas 24 horas</option>
            <option value={7}>Últimos 7 dias</option>
            <option value={30}>Últimos 30 dias</option>
          </select>
          <button onClick={carregar} className="flex items-center gap-1.5 rounded-full border border-linha px-3 py-1.5 text-[13px] font-semibold hover:border-areia">
            <RefreshCw className="h-3.5 w-3.5" /> Atualizar
          </button>
        </div>
      </div>
      <p className="text-[14px] text-areia">Tudo o que deu errado na tela de alguém (painel, loja ou aqui) ou no servidor, agrupado. Mande para o suporte técnico quando algo se repetir.</p>
      {a.modo === "demo" && <p className="text-[14px] text-areia">Na versão publicada, os erros reais aparecem aqui.</p>}
      {lista === null && a.modo === "real" && <p className="text-[14px] text-areia">Carregando…</p>}
      {lista?.length === 0 && (
        <p className="flex items-center gap-2 rounded-2xl bg-grafite p-3 text-[14px]">
          <CheckCircle2 className="h-5 w-5 text-manjericao" /> Nenhum erro no período.
        </p>
      )}
      <ul className="space-y-2">
        {(lista ?? []).map((e) => {
          const k = e.origem + e.mensagem;
          return (
            <li key={k} className="rounded-2xl bg-grafite p-3 text-[14px]">
              <button onClick={() => setAberto(aberto === k ? null : k)} className="w-full text-left">
                <span className="flex items-start justify-between gap-2">
                  <span className="min-w-0 break-words font-semibold">{e.mensagem}</span>
                  <span className="tabular shrink-0 rounded-full bg-carvao px-2 py-0.5 text-[12px] font-bold">{e.vezes}×</span>
                </span>
                <span className="mt-0.5 block text-[12px] text-areia">
                  {ORIGEM[e.origem] ?? e.origem} · {e.rotas?.length ? `tela ${e.rotas.join(", ")}` : "sem tela"}
                  {e.lojas?.length ? ` · ${e.lojas.join(", ")}` : ""} · última {desde(e.ultima)}
                  {e.pessoas > 1 ? ` · ${e.pessoas} pessoas` : ""}
                </span>
              </button>
              {aberto === k && (
                <div className="mt-2 space-y-2">
                  {e.exemplo_navegador && <p className="text-[12px] text-areia">{navegadorCurto(e.exemplo_navegador) || e.exemplo_navegador}</p>}
                  {e.exemplo_pilha && <pre className="scroll-thin max-h-[180px] overflow-auto whitespace-pre-wrap rounded-xl bg-carvao p-2 text-[11px] text-areia">{e.exemplo_pilha}</pre>}
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => navigator.clipboard?.writeText(`Erro no Freguês (${e.vezes}x, ${ORIGEM[e.origem] ?? e.origem}, tela ${e.rotas?.join(", ") ?? "-"})\n${e.mensagem}\n\n${e.exemplo_pilha ?? ""}\n${e.exemplo_navegador ?? ""}`).catch(() => {})}
                      className="rounded-full border border-linha px-3 py-1 text-[12px] font-semibold hover:border-areia"
                    >
                      Copiar para o suporte
                    </button>
                    <button
                      onClick={async () => {
                        await a.acoes.resolverErro(e.origem, e.mensagem);
                        setLista((l) => (l ?? []).filter((x) => x.origem + x.mensagem !== k));
                      }}
                      className="rounded-full bg-manjericao px-3 py-1 text-[12px] font-semibold text-carvao"
                    >
                      Marcar como resolvido
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
