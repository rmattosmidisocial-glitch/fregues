// Recursos opcionais da loja: relatórios, pagamento online (Mercado Pago), WhatsApp oficial e nota fiscal (NFC-e).
// Tudo vem desligado. As chaves ficam guardadas só no servidor: depois de salvas, ninguém vê de novo (nem o dono).
import { useEffect, useState } from "react";
import { BarChart3, CheckCircle2, CreditCard, FileText, MessageCircle, Palette } from "lucide-react";
import { CORES_SUGERIDAS, coresDaMarca } from "../../lib/cor";
import { useDados, type Integracoes } from "../../data/dados";

const campo = "mt-1 w-full rounded-xl border border-linha bg-carvao px-3 py-2.5 text-[15px] text-papel";
type Msg = { ok: boolean; t: string } | null;
const Aviso = ({ m }: { m: Msg }) => (m ? <p className={`mt-3 text-[14px] ${m.ok ? "text-manjericao" : "text-[#e8846f]"}`}>{m.t}</p> : null);

function Secao({ icone, titulo, sub, children }: { icone: React.ReactNode; titulo: string; sub: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-linha bg-forno p-5">
      <h2 className="flex items-center gap-2 font-display text-[20px] font-bold">
        {icone} {titulo}
        <span className="ml-1 rounded-full bg-grafite px-2 py-0.5 font-sans text-[11px] font-semibold text-areia">opcional</span>
      </h2>
      <p className="mt-1 text-[14px] text-areia">{sub}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Liga({ ligado, onChange, rotulo, dica, desabilitado }: { ligado: boolean; onChange: (v: boolean) => void; rotulo: string; dica?: string; desabilitado?: boolean }) {
  return (
    <label className={`flex items-start gap-3 rounded-xl bg-grafite px-3 py-2.5 text-[14px] ${desabilitado ? "opacity-60" : ""}`}>
      <input type="checkbox" checked={ligado} disabled={desabilitado} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#ff5b1f]" />
      <span>
        <b>{rotulo}</b>
        {dica && <span className="block text-[12px] text-areia">{dica}</span>}
      </span>
    </label>
  );
}

function useIntegracoes() {
  const d = useDados();
  const [i, setI] = useState<Integracoes | null>(null);
  const carregar = () => d.acoes.integracoes().then(setI);
  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d.loja.id]);
  return { i, carregar };
}

/* ---------------- Relatórios ---------------- */
export function OpcaoRelatorios() {
  const d = useDados();
  const [m, setM] = useState<Msg>(null);
  return (
    <Secao icone={<BarChart3 className="h-5 w-5 text-brasa" />} titulo="Relatórios e contador" sub="Vendas por período, formas de pagamento, mais vendidos e planilhas prontas para mandar ao contador.">
      <Liga
        ligado={!!d.loja.relatorios_ativo}
        rotulo="Mostrar Relatórios no menu"
        dica="Só você e o gerente veem."
        onChange={async (v) => {
          const r = await d.acoes.salvarLoja({ relatorios_ativo: v });
          setM(r ? { ok: false, t: r } : { ok: true, t: v ? "Pronto: Relatórios apareceu no menu." : "Relatórios saiu do menu." });
        }}
      />
      <Aviso m={m} />
    </Secao>
  );
}

/* ---------------- 29. Pagamento online ---------------- */
export function PagamentoOnline() {
  const d = useDados();
  const { i, carregar } = useIntegracoes();
  const [token, setToken] = useState("");
  const [m, setM] = useState<Msg>(null);
  const [ocupado, setOcupado] = useState(false);
  const real = d.modo === "real";
  async function ligarChave() {
    setOcupado(true);
    setM(null);
    const r = await d.acoes.servidorLoja<{ conta?: string; teste?: boolean }>("chave", { store_id: d.loja.id, tipo: "mp", token: token.trim() });
    setOcupado(false);
    if (r.erro) return setM({ ok: false, t: r.erro });
    setToken("");
    await carregar();
    await d.acoes.salvarLoja({ pagamento_online_ok: true });
    setM({ ok: true, t: `Conta conectada${r.conta ? `: ${r.conta}` : ""}${r.teste ? " (chave de TESTE: o Pix não cobra de verdade)" : ""}. Agora ligue abaixo.` });
  }
  return (
    <Secao icone={<CreditCard className="h-5 w-5 text-brasa" />} titulo="Pagamento online" sub="O cliente paga o Pix e o pedido é confirmado sozinho, sem você conferir o extrato. O dinheiro cai na sua conta do Mercado Pago (taxa do Mercado Pago, nenhuma do Freguês).">
      {!real && <p className="mb-3 rounded-xl border border-dashed border-linha p-3 text-[13px] text-areia">Na demonstração, as conexões ficam desligadas.</p>}
      {i?.mp ? (
        <div className="space-y-2">
          <p className="flex items-center gap-2 rounded-xl bg-grafite p-3 text-[14px]">
            <CheckCircle2 className="h-5 w-5 text-manjericao" /> Mercado Pago conectado (chave terminada em {i.mp_final})
          </p>
          <Liga
            ligado={!!d.loja.pagamento_online}
            rotulo="Usar Pix com confirmação automática na loja online"
            dica="Desligado, a loja volta a usar o Pix da sua chave (você confere o pagamento)."
            onChange={async (v) => {
              const r = await d.acoes.salvarLoja({ pagamento_online: v });
              setM(r ? { ok: false, t: r } : { ok: true, t: v ? "Ligado. O próximo pedido com Pix já confirma sozinho." : "Desligado." });
            }}
          />
          <button
            onClick={async () => {
              if (!confirm("Desconectar o Mercado Pago?")) return;
              await d.acoes.servidorLoja("chave", { store_id: d.loja.id, tipo: "mp", remover: true });
              await d.acoes.salvarLoja({ pagamento_online: false, pagamento_online_ok: false });
              carregar();
            }}
            className="text-[13px] text-areia underline-offset-4 hover:underline"
          >
            Desconectar
          </button>
        </div>
      ) : (
        <div className="space-y-2 text-[14px]">
          <ol className="list-decimal space-y-1 pl-5 text-areia">
            <li>Entre em mercadopago.com.br/developers com a conta da loja e crie uma aplicação (tipo: pagamentos online).</li>
            <li>
              Em "Credenciais de produção", copie o <b className="text-papel">Access Token</b> (começa com APP_USR-).
            </li>
            <li>Cole aqui. A chave é testada e fica guardada só no servidor.</li>
          </ol>
          <input type="password" autoComplete="off" value={token} onChange={(e) => setToken(e.target.value)} placeholder="APP_USR-…" className={campo} aria-label="Access Token do Mercado Pago" />
          <button disabled={ocupado || !token.trim() || !real} onClick={ligarChave} className="w-full rounded-xl bg-brasa py-3 font-semibold text-carvao hover:bg-mostarda disabled:opacity-60">
            {ocupado ? "Testando a chave…" : "Conectar Mercado Pago"}
          </button>
        </div>
      )}
      <Aviso m={m} />
    </Secao>
  );
}

/* ---------------- 28. WhatsApp oficial ---------------- */
const EVENTOS: { id: string; rotulo: string; modelo: string; texto: string }[] = [
  { id: "recebido", rotulo: "Pedido recebido", modelo: "fregues_pedido_recebido", texto: "Olá {{1}}! Recebemos seu pedido nº {{2}} na {{3}}. Já já ele entra em preparo." },
  { id: "preparo", rotulo: "Em preparo", modelo: "fregues_pedido_preparo", texto: "{{1}}, seu pedido nº {{2}} já está sendo preparado na {{3}}." },
  { id: "rota", rotulo: "Saiu para entrega", modelo: "fregues_pedido_saiu", texto: "{{1}}, seu pedido nº {{2}} da {{3}} saiu para entrega!" },
  { id: "pronto", rotulo: "Pronto para retirar", modelo: "fregues_pedido_pronto", texto: "{{1}}, seu pedido nº {{2}} está pronto para retirar na {{3}}." },
];

export function WhatsAppOficial() {
  const d = useDados();
  const { i, carregar } = useIntegracoes();
  const [phone, setPhone] = useState("");
  const [token, setToken] = useState("");
  const [modelos, setModelos] = useState<Record<string, string>>({});
  const [teste, setTeste] = useState("");
  const [m, setM] = useState<Msg>(null);
  const [ocupado, setOcupado] = useState(false);
  const real = d.modo === "real";
  const ev = d.loja.whatsapp_eventos ?? { recebido: true, preparo: false, rota: true, pronto: true };
  useEffect(() => {
    if (i) {
      setPhone(i.wa_phone_id ?? "");
      setModelos(Object.fromEntries(EVENTOS.map((e) => [e.id, i.wa_modelos?.[e.id] || e.modelo])));
    }
  }, [i]);

  async function salvarChave() {
    setOcupado(true);
    setM(null);
    const r = await d.acoes.servidorLoja<{ numero?: string; nome?: string }>("chave", { store_id: d.loja.id, tipo: "wa", phone_id: phone, token: token.trim(), modelos });
    setOcupado(false);
    if (r.erro) return setM({ ok: false, t: r.erro });
    setToken("");
    await carregar();
    await d.acoes.salvarLoja({ whatsapp_ok: true });
    setM({ ok: true, t: `Conectado ao número ${r.numero ?? ""}${r.nome ? ` (${r.nome})` : ""}.` });
  }

  return (
    <Secao icone={<MessageCircle className="h-5 w-5 text-brasa" />} titulo="WhatsApp oficial" sub="O cliente recebe no WhatsApp cada etapa do pedido, sozinho, pelo número oficial da loja (API da Meta). A Meta cobra por conversa.">
      {!real && <p className="mb-3 rounded-xl border border-dashed border-linha p-3 text-[13px] text-areia">Na demonstração, as conexões ficam desligadas.</p>}
      {i?.wa && (
        <div className="mb-3 space-y-2">
          <p className="flex items-center gap-2 rounded-xl bg-grafite p-3 text-[14px]">
            <CheckCircle2 className="h-5 w-5 text-manjericao" /> WhatsApp conectado (ID do número {i.wa_phone_id})
          </p>
          <Liga
            ligado={!!d.loja.whatsapp_ativo}
            rotulo="Mandar os avisos automáticos"
            onChange={async (v) => {
              const r = await d.acoes.salvarLoja({ whatsapp_ativo: v });
              setM(r ? { ok: false, t: r } : { ok: true, t: v ? "Ligado." : "Desligado." });
            }}
          />
          <div className="grid gap-2 sm:grid-cols-2">
            {EVENTOS.map((e) => (
              <Liga key={e.id} ligado={!!ev[e.id]} desabilitado={!d.loja.whatsapp_ativo} rotulo={e.rotulo} onChange={(v) => d.acoes.salvarLoja({ whatsapp_eventos: { ...ev, [e.id]: v } })} />
            ))}
          </div>
          <div className="flex gap-2">
            <input value={teste} onChange={(e) => setTeste(e.target.value)} inputMode="tel" placeholder="Seu WhatsApp para teste" className={campo} />
            <button
              onClick={async () => {
                const r = await d.acoes.servidorLoja("whatsapp", { store_id: d.loja.id, teste_para: teste });
                setM(r.erro ? { ok: false, t: r.erro } : { ok: true, t: "Mensagem de teste enviada. Confira o WhatsApp." });
              }}
              className="mt-1 shrink-0 rounded-xl border border-linha px-4 text-[14px] font-semibold hover:border-areia"
            >
              Testar
            </button>
          </div>
        </div>
      )}
      <details className="rounded-xl border border-linha p-3 text-[14px]" open={!i?.wa}>
        <summary className="cursor-pointer font-semibold">{i?.wa ? "Trocar a conexão ou os modelos" : "Como conectar"}</summary>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-areia">
          <li>Em business.facebook.com, crie o app do WhatsApp Business (Cloud API) e cadastre o número da loja.</li>
          <li>Crie os modelos de mensagem abaixo (categoria "Utilidade", idioma Português BR), com os mesmos nomes e 3 variáveis.</li>
          <li>
            Copie o <b className="text-papel">ID do número de telefone</b> e um <b className="text-papel">token permanente</b> (usuário do sistema) e cole aqui.
          </li>
        </ol>
        <ul className="mt-2 space-y-1.5">
          {EVENTOS.map((e) => (
            <li key={e.id} className="rounded-lg bg-carvao p-2">
              <label className="block text-[12px] text-areia">
                Modelo "{e.rotulo}"
                <input value={modelos[e.id] ?? e.modelo} onChange={(x) => setModelos({ ...modelos, [e.id]: x.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") })} className="mt-1 w-full rounded-lg border border-linha bg-forno px-2 py-1.5 font-mono text-[13px] text-papel" />
              </label>
              <p className="mt-1 text-[12px] text-areia">Texto sugerido: {e.texto}</p>
            </li>
          ))}
        </ul>
        <label className="mt-3 block">
          ID do número de telefone
          <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="numeric" className={campo} />
        </label>
        <label className="mt-2 block">
          Token permanente {i?.wa && <span className="text-areia">(deixe em branco para manter o atual)</span>}
          <input type="password" autoComplete="off" value={token} onChange={(e) => setToken(e.target.value)} className={campo} />
        </label>
        <button disabled={ocupado || !real || !phone || (!token && !i?.wa)} onClick={salvarChave} className="mt-3 w-full rounded-xl bg-brasa py-3 font-semibold text-carvao hover:bg-mostarda disabled:opacity-60">
          {ocupado ? "Conferindo com a Meta…" : i?.wa ? "Salvar" : "Conectar WhatsApp"}
        </button>
        {i?.wa && (
          <button
            onClick={async () => {
              if (!confirm("Desconectar o WhatsApp oficial?")) return;
              await d.acoes.servidorLoja("chave", { store_id: d.loja.id, tipo: "wa", remover: true });
              await d.acoes.salvarLoja({ whatsapp_ativo: false, whatsapp_ok: false });
              carregar();
            }}
            className="mt-2 text-[13px] text-areia underline-offset-4 hover:underline"
          >
            Desconectar
          </button>
        )}
      </details>
      <Aviso m={m} />
    </Secao>
  );
}

/* ---------------- 31. Nota fiscal (NFC-e) ---------------- */
export function NotaFiscal() {
  const d = useDados();
  const L = d.loja;
  const { i, carregar } = useIntegracoes();
  const [f, setF] = useState({ cnpj: L.nfce_cnpj ?? "", ncm: L.nfce_ncm ?? "21069090", producao: !!L.nfce_producao, automatica: !!L.nfce_automatica });
  const [token, setToken] = useState("");
  const [m, setM] = useState<Msg>(null);
  const [ocupado, setOcupado] = useState(false);
  const real = d.modo === "real";

  async function salvar() {
    const cnpj = f.cnpj.replace(/\D/g, "");
    if (cnpj && cnpj.length !== 14) return setM({ ok: false, t: "O CNPJ precisa ter 14 números." });
    if (!/^\d{8}$/.test(f.ncm)) return setM({ ok: false, t: "O NCM tem 8 números (o contador informa)." });
    setOcupado(true);
    setM(null);
    let r = await d.acoes.salvarLoja({ nfce_cnpj: cnpj || null, nfce_ncm: f.ncm, nfce_producao: f.producao, nfce_automatica: f.automatica });
    if (!r && token.trim()) {
      const x = await d.acoes.servidorLoja("chave", { store_id: L.id, tipo: "focus", token: token.trim() });
      r = x.erro ?? null;
      if (!r) {
        setToken("");
        await d.acoes.salvarLoja({ nfce_ok: true });
        await carregar();
      }
    }
    setOcupado(false);
    setM(r ? { ok: false, t: r } : { ok: true, t: "Salvo." });
  }

  return (
    <Secao icone={<FileText className="h-5 w-5 text-brasa" />} titulo="Nota fiscal (NFC-e)" sub="Só se você quiser emitir nota pelo sistema. Desligada, tudo funciona normal sem nota.">
      <Liga
        ligado={!!L.nfce_ativo}
        rotulo="Emitir nota fiscal pelo Freguês"
        dica="Aparece o botão “Emitir nota” nos pedidos."
        onChange={async (v) => {
          const r = await d.acoes.salvarLoja({ nfce_ativo: v });
          setM(r ? { ok: false, t: r } : null);
        }}
      />
      {L.nfce_ativo && (
        <div className="mt-3 space-y-3 text-[14px]">
          <p className="rounded-xl bg-grafite p-3 text-areia">
            A nota sai pela <b className="text-papel">Focus NFe</b> (focusnfe.com.br), que guarda o certificado digital e o CSC da sua empresa. Crie a conta lá, cadastre a empresa com o contador e cole o token aqui. Comece em <b className="text-papel">homologação</b> (teste, sem valor fiscal).
          </p>
          <label className="block font-semibold">
            CNPJ da empresa
            <input value={f.cnpj} onChange={(e) => setF({ ...f, cnpj: e.target.value })} inputMode="numeric" placeholder="00.000.000/0000-00" className={campo} />
          </label>
          <label className="block font-semibold">
            NCM padrão dos produtos <span className="font-normal text-areia">(21069090 = preparações alimentícias; confirme com o contador)</span>
            <input value={f.ncm} onChange={(e) => setF({ ...f, ncm: e.target.value.replace(/\D/g, "").slice(0, 8) })} inputMode="numeric" className={campo} />
          </label>
          <div className="grid gap-2 sm:grid-cols-2">
            <Liga ligado={f.producao} rotulo="Ambiente de produção" dica="Desligado = homologação (teste)" onChange={(v) => setF({ ...f, producao: v })} />
            <Liga ligado={f.automatica} rotulo="Emitir sozinho ao entregar" dica="Senão, você emite no botão do pedido" onChange={(v) => setF({ ...f, automatica: v })} />
          </div>
          {i?.focus && (
            <p className="flex items-center gap-2 rounded-xl bg-grafite p-3">
              <CheckCircle2 className="h-5 w-5 text-manjericao" /> Focus NFe conectada (token terminado em {i.focus_final})
            </p>
          )}
          <label className="block font-semibold">
            Token da Focus NFe {i?.focus && <span className="font-normal text-areia">(deixe em branco para manter)</span>}
            <input type="password" autoComplete="off" value={token} onChange={(e) => setToken(e.target.value)} className={campo} />
          </label>
          <button disabled={ocupado || !real} onClick={salvar} className="w-full rounded-xl bg-brasa py-3 font-semibold text-carvao hover:bg-mostarda disabled:opacity-60">
            {ocupado ? "Salvando…" : "Salvar nota fiscal"}
          </button>
        </div>
      )}
      <Aviso m={m} />
    </Secao>
  );
}

/* ---------------- Aparência da loja ---------------- */
export function Aparencia() {
  const d = useDados();
  const [cor, setCor] = useState(d.loja.cor_marca || "#f45b26");
  const [m, setM] = useState<Msg>(null);
  const c = coresDaMarca(cor);
  const ajustou = c.principal.toLowerCase() !== cor.toLowerCase();
  return (
    <section className="rounded-3xl border border-linha bg-forno p-5">
      <h2 className="flex items-center gap-2 font-display text-[20px] font-bold">
        <Palette className="h-5 w-5 text-brasa" /> Aparência da loja
      </h2>
      <p className="mt-1 text-[14px] text-areia">A cor da sua marca nos botões e destaques da loja online. O painel continua igual.</p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {CORES_SUGERIDAS.map(([h, nome]) => (
          <button key={h} onClick={() => (setCor(h), setM(null))} title={nome} aria-label={nome} aria-pressed={cor.toLowerCase() === h} className={`h-9 w-9 rounded-full border-2 ${cor.toLowerCase() === h ? "border-papel ring-2 ring-brasa" : "border-transparent"}`} style={{ background: h }} />
        ))}
        <label className="flex items-center gap-2 rounded-full border border-linha px-3 py-1.5 text-[13px] font-semibold">
          <input type="color" value={cor} onChange={(e) => (setCor(e.target.value), setM(null))} className="h-6 w-8 cursor-pointer bg-transparent" aria-label="Outra cor" />
          Outra cor
        </label>
      </div>
      {/* prévia */}
      <div className="mt-4 overflow-hidden rounded-2xl border border-linha bg-[#fffaf2] text-[#2b211d]">
        <div className="bg-[#2b211d] px-4 py-3 text-[#fff6eb]">
          <p className="font-display text-[18px] font-extrabold">{d.loja.nome || "Sua loja"}</p>
          <span className="mt-1 inline-block rounded-full px-2.5 py-0.5 text-[12px] font-semibold text-[#2b211d]" style={{ background: c.principal }}>
            Aberto agora
          </span>
        </div>
        <div className="space-y-2 p-4">
          <p className="text-[14px]">
            X-Bacon Duplo <b style={{ color: c.escura }}>R$ 34,90</b>
          </p>
          <div className="rounded-full px-4 py-2.5 text-center text-[14px] font-semibold text-[#2b211d]" style={{ background: c.principal }}>
            Adicionar à sacola
          </div>
        </div>
      </div>
      {ajustou && <p className="mt-2 text-[12px] text-areia">Clareamos um pouco a cor para o texto dos botões continuar fácil de ler.</p>}
      <Aviso m={m} />
      <div className="mt-3 flex gap-2">
        <button
          onClick={async () => {
            const r = await d.acoes.salvarLoja({ cor_marca: cor.toLowerCase() === "#f45b26" ? null : cor.toLowerCase() });
            setM(r ? { ok: false, t: r } : { ok: true, t: "Pronto: a loja online já está com a nova cor." });
          }}
          className="flex-1 rounded-xl bg-brasa py-3 font-semibold text-carvao hover:bg-mostarda"
        >
          Salvar cor
        </button>
        <button onClick={() => (setCor("#f45b26"), setM(null))} className="rounded-xl border border-linha px-4 text-[14px] font-semibold hover:border-areia">
          Padrão
        </button>
      </div>
    </section>
  );
}
