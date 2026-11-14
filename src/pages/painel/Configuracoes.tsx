import { useState } from "react";
import { CheckCircle2, Clock, ImagePlus, MapPin, ShoppingBag, Store, Wallet } from "lucide-react";
import { DIAS, linhaDoDia, type Faixa, type Horarios } from "../../lib/horario";
import { EnderecoLoja, type Endereco as End } from "../admin/EnderecoLoja";
import { useDados } from "../../data/dados";
import { codigoPix, normalizarChave, tipoChave } from "../../lib/pix";
import { brl } from "../../data/mock";

const campo = "mt-1 w-full rounded-xl border border-linha bg-carvao px-3 py-2.5 text-[15px] text-papel";

/** Configurações da loja, feitas pelo próprio dono. */
export function Configuracoes() {
  const d = useDados();
  if (d.modo === "real" && !d.loja.id) return <p className="text-areia">Abrindo as configurações…</p>;
  return (
    <div className="max-w-[760px]">
      <h1 className="font-display text-[clamp(2rem,4vw,2.8rem)] font-extrabold tracking-[-0.015em]">Configurações</h1>
      <p className="text-[15px] text-areia">Tudo o que você ajusta aqui muda na hora na sua loja.</p>
      <div className="mt-6 space-y-5">
        <DadosLoja key={"dados" + d.loja.id} />
        <Funcionamento key={"hor" + d.loja.id} />
        <Endereco key={"end" + d.loja.id} />
        <Regras key={"reg" + d.loja.id} />
        <Pagamentos key={d.loja.id} />
      </div>
    </div>
  );
}

function Secao({ icone, titulo, sub, children }: { icone: React.ReactNode; titulo: string; sub: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-linha bg-forno p-5">
      <h2 className="flex items-center gap-2 font-display text-[20px] font-bold">
        {icone} {titulo}
      </h2>
      <p className="mt-1 text-[14px] text-areia">{sub}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Pagamentos() {
  const d = useDados();
  const [chave, setChave] = useState(d.loja.pix_chave ?? "");
  const [nome, setNome] = useState(d.loja.pix_nome ?? d.loja.nome ?? "");
  const [cidade, setCidade] = useState(d.loja.pix_cidade ?? d.loja.cidade ?? "");
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const tipo = chave.trim() ? tipoChave(chave) : null;
  const exemplo = tipo ? codigoPix({ chave, nome: nome || d.loja.nome, cidade: cidade || "Rio de Janeiro", valor: 1, txid: "TESTE" }) : "";

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (chave.trim() && !tipo) return setMsg({ ok: false, t: "Essa chave não parece válida. Use CPF, CNPJ, celular, e-mail ou chave aleatória." });
    const r = await d.acoes.salvarLoja({ pix_chave: chave.trim() ? normalizarChave(chave) : null, pix_nome: nome.trim() || null, pix_cidade: cidade.trim() || null });
    setMsg(r ? { ok: false, t: r } : { ok: true, t: chave.trim() ? "Pix ligado. Seus clientes já podem pagar com Pix na loja." : "Pix desligado na loja." });
  }

  return (
    <Secao icone={<Wallet className="h-5 w-5 text-brasa" />} titulo="Pix da loja" sub="O cliente paga pelo app do banco e o dinheiro cai direto na sua conta. Sem taxa do Freguês.">
      <form onSubmit={salvar} className="space-y-3 text-[14px]">
        <label className="block font-semibold">
          Sua chave Pix
          <input value={chave} onChange={(e) => (setChave(e.target.value), setMsg(null))} placeholder="CPF, CNPJ, celular, e-mail ou chave aleatória" className={campo} />
          {chave.trim() && <span className={`mt-1 block text-[13px] font-normal ${tipo ? "text-manjericao" : "text-[#e8846f]"}`}>{tipo ? `Chave de ${tipo}: ${normalizarChave(chave)}` : "Chave não reconhecida"}</span>}
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block font-semibold">
            Nome de quem recebe
            <input value={nome} onChange={(e) => setNome(e.target.value)} maxLength={25} className={campo} />
          </label>
          <label className="block font-semibold">
            Cidade
            <input value={cidade} onChange={(e) => setCidade(e.target.value)} maxLength={15} className={campo} />
          </label>
        </div>
        {msg && <p className={`text-[14px] ${msg.ok ? "text-manjericao" : "text-[#e8846f]"}`}>{msg.t}</p>}
        <button className="w-full rounded-xl bg-brasa py-3 font-semibold text-carvao hover:bg-mostarda">Salvar Pix</button>
      </form>
      {exemplo && (
        <div className="mt-4 rounded-2xl bg-carvao p-4 text-[13px]">
          <p className="flex items-center gap-1.5 font-semibold text-papel">
            <CheckCircle2 className="h-4 w-4 text-manjericao" /> Teste antes de divulgar
          </p>
          <p className="mt-1 text-areia">Copie o código abaixo e cole no app do seu banco (Pix → Copia e cola). Deve aparecer o seu nome e o valor de {brl(1)}. Não precisa pagar.</p>
          <p className="mt-2 break-all rounded-xl bg-grafite p-2.5 font-mono text-[12px] text-papel">{exemplo}</p>
          <button type="button" onClick={() => navigator.clipboard?.writeText(exemplo)} className="mt-2 rounded-full border border-linha px-3 py-1.5 font-semibold text-papel">
            Copiar código de teste
          </button>
        </div>
      )}
      <p className="mt-4 text-[13px] text-areia">
        Como funciona: cada pedido gera um Pix com o valor certo e o número do pedido (ex.: PED1234). O pedido chega em Pedidos como <b className="text-papel">Pix pendente</b>; confira no seu banco e toque em <b className="text-papel">Marcar como pago</b>. Cartão e dinheiro são pagos na entrega ou na retirada.
      </p>
    </Secao>
  );
}

function DadosLoja() {
  const d = useDados();
  const [f, setF] = useState({ nome: d.loja.nome ?? "", descricao: d.loja.descricao ?? "", whatsapp: d.loja.whatsapp ?? "", instagram: d.loja.instagram ?? "" });
  const [logo, setLogo] = useState(d.loja.logo_url ?? "");
  const [capa, setCapa] = useState(d.loja.capa_url ?? "");
  const [enviando, setEnviando] = useState<"" | "logo" | "capa">("");
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);

  async function foto(tipo: "logo" | "capa", arquivo?: File) {
    if (!arquivo) return;
    setEnviando(tipo);
    const r = await d.acoes.enviarFoto(arquivo);
    setEnviando("");
    if (r.erro || !r.url) return setMsg({ ok: false, t: r.erro ?? "Não consegui enviar a imagem." });
    if (tipo === "logo") setLogo(r.url);
    else setCapa(r.url);
    const e = await d.acoes.salvarLoja(tipo === "logo" ? { logo_url: r.url } : { capa_url: r.url });
    setMsg(e ? { ok: false, t: e } : { ok: true, t: tipo === "logo" ? "Logo atualizada na loja." : "Capa atualizada na loja." });
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!f.nome.trim()) return setMsg({ ok: false, t: "O nome da loja não pode ficar vazio." });
    const zap = f.whatsapp.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
    if (zap && zap.length < 10) return setMsg({ ok: false, t: "WhatsApp com DDD, ex.: (21) 99999-9999." });
    const r = await d.acoes.salvarLoja({ nome: f.nome.trim(), descricao: f.descricao.trim() || null, whatsapp: zap || null, instagram: f.instagram.trim().replace(/^@/, "") || null });
    setMsg(r ? { ok: false, t: r } : { ok: true, t: "Dados salvos. Já aparecem na loja." });
  }

  const botaoFoto = (tipo: "logo" | "capa", atual: string, rotulo: string, formato: string) => (
    <label className="block cursor-pointer">
      <span className="font-semibold">{rotulo}</span>
      <span className={`mt-1 grid place-items-center overflow-hidden rounded-2xl border border-dashed border-linha bg-carvao text-areia hover:border-areia ${formato}`}>
        {atual ? <img src={atual} alt="" className="h-full w-full object-cover" /> : <span className="flex flex-col items-center gap-1 p-3 text-center text-[12px]"><ImagePlus className="h-5 w-5" /> {enviando === tipo ? "Enviando…" : "Escolher imagem"}</span>}
      </span>
      <input type="file" accept="image/*" className="sr-only" onChange={(e) => foto(tipo, e.target.files?.[0])} />
      {atual && <span className="mt-1 block text-[12px] text-areia">{enviando === tipo ? "Enviando…" : "Toque para trocar"}</span>}
    </label>
  );

  return (
    <Secao icone={<Store className="h-5 w-5 text-brasa" />} titulo="Dados da loja" sub="Nome, imagens e contatos que seus clientes veem na loja online.">
      <div className="grid gap-4 text-[14px] sm:grid-cols-[120px_1fr]">
        {botaoFoto("logo", logo, "Logo", "h-[120px] w-[120px]")}
        {botaoFoto("capa", capa, "Foto de capa", "h-[120px] w-full")}
      </div>
      <form onSubmit={salvar} className="mt-4 space-y-3 text-[14px]">
        <label className="block font-semibold">
          Nome da loja
          <input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} maxLength={60} className={campo} />
        </label>
        <label className="block font-semibold">
          Frase de apresentação <span className="font-normal text-areia">(aparece embaixo do nome)</span>
          <input value={f.descricao} onChange={(e) => setF({ ...f, descricao: e.target.value })} maxLength={120} placeholder="Ex.: Hambúrguer artesanal na brasa desde 2018" className={campo} />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block font-semibold">
            WhatsApp da loja
            <input value={f.whatsapp} onChange={(e) => setF({ ...f, whatsapp: e.target.value })} inputMode="tel" placeholder="(21) 99999-9999" className={campo} />
          </label>
          <label className="block font-semibold">
            Instagram
            <input value={f.instagram} onChange={(e) => setF({ ...f, instagram: e.target.value })} placeholder="@sualoja" className={campo} />
          </label>
        </div>
        {msg && <p className={`text-[14px] ${msg.ok ? "text-manjericao" : "text-[#e8846f]"}`}>{msg.t}</p>}
        <button className="w-full rounded-xl bg-brasa py-3 font-semibold text-carvao hover:bg-mostarda">Salvar dados</button>
      </form>
    </Secao>
  );
}

function Endereco() {
  const d = useDados();
  const [e, setE] = useState<End>({ cidade: d.loja.cidade || "Rio de Janeiro", bairro: d.loja.bairro ?? "", rua: d.loja.rua ?? "", numero: d.loja.numero ?? "", cep: d.loja.cep ?? "", lon: d.loja.lon ?? null, lat: d.loja.lat ?? null });
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  async function salvar() {
    if (e.lon == null || e.lat == null) return setMsg({ ok: false, t: "Marque o ponto do restaurante no mapa antes de salvar." });
    const r = await d.acoes.salvarLoja({ cidade: e.cidade, bairro: e.bairro, rua: e.rua || null, numero: e.numero || null, cep: e.cep || null, lon: e.lon, lat: e.lat });
    setMsg(r ? { ok: false, t: r } : { ok: true, t: "Endereço salvo. As distâncias de entrega já usam o ponto novo." });
  }
  return (
    <Secao icone={<MapPin className="h-5 w-5 text-brasa" />} titulo="Endereço do restaurante" sub="De onde saem as entregas. As zonas por km contam a distância a partir deste ponto.">
      <EnderecoLoja valor={e} mudar={(n) => (setE(n), setMsg(null))} />
      {msg && <p className={`mt-3 text-[14px] ${msg.ok ? "text-manjericao" : "text-[#e8846f]"}`}>{msg.t}</p>}
      <button onClick={salvar} className="mt-3 w-full rounded-xl bg-brasa py-3 font-semibold text-carvao hover:bg-mostarda">
        Salvar endereço
      </button>
    </Secao>
  );
}

const ORDEM = [1, 2, 3, 4, 5, 6, 0]; // segunda primeiro

function Funcionamento() {
  const d = useDados();
  const inicial: Horarios = d.loja.horarios ?? {};
  const [h, setH] = useState<Horarios>(() => Object.fromEntries(ORDEM.map((i) => [String(i), inicial[String(i)] ?? []])));
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const set = (dia: number, f: Faixa[]) => (setH((x) => ({ ...x, [String(dia)]: f })), setMsg(null));
  const hora = "rounded-lg border border-linha bg-carvao px-2 py-1.5 text-[14px] text-papel";
  const agora = Date.now();
  const pausada = d.loja.pausa_ate && new Date(d.loja.pausa_ate).getTime() > agora;
  const extraAtivo = (d.loja.extra_min ?? 0) > 0;

  async function salvar() {
    for (const f of Object.values(h)) for (const [a, b] of f) if (!a || !b || a === b) return setMsg({ ok: false, t: "Confira os horários: início e fim não podem ficar vazios nem iguais." });
    setOcupado(true);
    const vazio = Object.values(h).every((f) => !f.length);
    const r = await d.acoes.salvarLoja({ horarios: vazio ? null : h });
    setOcupado(false);
    setMsg(r ? { ok: false, t: r } : { ok: true, t: vazio ? "Sem horário: a loja segue só o botão Loja aberta/desligada." : "Horário salvo. A loja abre e fecha sozinha." });
  }
  const acao = async (c: Parameters<typeof d.acoes.salvarLoja>[0], t: string) => {
    const r = await d.acoes.salvarLoja(c);
    setMsg(r ? { ok: false, t: r } : { ok: true, t });
  };
  const daqui = (min: number) => new Date(Date.now() + min * 60000).toISOString();
  const amanha6h = () => {
    const x = new Date();
    x.setDate(x.getDate() + 1);
    x.setHours(6, 0, 0, 0);
    return x.toISOString();
  };

  return (
    <Secao icone={<Clock className="h-5 w-5 text-brasa" />} titulo="Horário de funcionamento" sub="A loja abre e fecha sozinha nesses horários (hora de Brasília). Fora deles, o cliente vê o cardápio mas não consegue pedir.">
      <div className="space-y-2 text-[14px]">
        {ORDEM.map((dia) => {
          const f = h[String(dia)] ?? [];
          return (
            <div key={dia} className="flex flex-wrap items-center gap-2 rounded-xl bg-grafite px-3 py-2">
              <label className="flex w-28 items-center gap-2 font-semibold">
                <input type="checkbox" checked={f.length > 0} onChange={(e) => set(dia, e.target.checked ? [["18:00", "23:00"]] : [])} className="h-4 w-4 accent-[#ff5b1f]" />
                {DIAS[dia]}
              </label>
              {f.length === 0 && <span className="text-areia">Fechado</span>}
              {f.map(([a, b], i) => (
                <span key={i} className="flex items-center gap-1">
                  <input type="time" value={a} onChange={(e) => set(dia, f.map((x, j) => (j === i ? [e.target.value, x[1]] : x)) as Faixa[])} className={hora} aria-label={`${DIAS[dia]} abre`} />
                  <span className="text-areia">às</span>
                  <input type="time" value={b} onChange={(e) => set(dia, f.map((x, j) => (j === i ? [x[0], e.target.value] : x)) as Faixa[])} className={hora} aria-label={`${DIAS[dia]} fecha`} />
                  {i > 0 && (
                    <button type="button" onClick={() => set(dia, f.filter((_, j) => j !== i))} className="px-1 text-areia hover:text-papel" aria-label="Tirar turno">
                      ×
                    </button>
                  )}
                </span>
              ))}
              {f.length === 1 && (
                <button type="button" onClick={() => set(dia, [...f, ["18:00", "23:00"]])} className="text-[12px] text-areia underline">
                  + 2º turno
                </button>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-[13px]">
        <button
          type="button"
          onClick={() => {
            const seg = h["1"] ?? [];
            setH((x) => ({ ...x, "2": seg, "3": seg, "4": seg, "5": seg }));
          }}
          className="rounded-full border border-linha px-3 py-1.5 font-semibold"
        >
          Copiar segunda para terça a sexta
        </button>
        <button
          type="button"
          onClick={() => {
            const seg = h["1"] ?? [];
            setH(Object.fromEntries(ORDEM.map((i) => [String(i), seg])));
          }}
          className="rounded-full border border-linha px-3 py-1.5 font-semibold"
        >
          Copiar segunda para todos
        </button>
      </div>
      <p className="mt-2 text-[12px] text-areia">Fecha depois da meia-noite? Coloque o fim menor que o início (ex.: 18:00 às 02:00).</p>
      <button disabled={ocupado} onClick={salvar} className="mt-3 w-full rounded-xl bg-brasa py-3 font-semibold text-carvao hover:bg-mostarda disabled:opacity-60">
        {ocupado ? "Salvando…" : "Salvar horário"}
      </button>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-linha p-3 text-[14px]">
          <p className="font-semibold">Pausa rápida</p>
          <p className="text-[12px] text-areia">{pausada ? `Pausada até ${new Date(d.loja.pausa_ate!).toLocaleString("pt-BR", { weekday: "short", hour: "2-digit", minute: "2-digit" })}` : "Para de receber pedidos por um tempo."}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {pausada ? (
              <button onClick={() => acao({ pausa_ate: null }, "Loja voltou a receber pedidos.")} className="rounded-full bg-manjericao px-3 py-1.5 font-semibold text-carvao">
                Voltar a receber
              </button>
            ) : (
              <>
                <button onClick={() => acao({ pausa_ate: daqui(30) }, "Pausada por 30 minutos.")} className="rounded-full border border-linha px-3 py-1.5 font-semibold">
                  30 min
                </button>
                <button onClick={() => acao({ pausa_ate: daqui(60) }, "Pausada por 1 hora.")} className="rounded-full border border-linha px-3 py-1.5 font-semibold">
                  1 hora
                </button>
                <button onClick={() => acao({ pausa_ate: amanha6h() }, "Pausada até amanhã.")} className="rounded-full border border-linha px-3 py-1.5 font-semibold">
                  Até amanhã
                </button>
              </>
            )}
          </div>
        </div>
        <div className="rounded-2xl border border-linha p-3 text-[14px]">
          <p className="font-semibold">Cozinha cheia</p>
          <p className="text-[12px] text-areia">{extraAtivo ? `Somando +${d.loja.extra_min} min na previsão até ${new Date(d.loja.extra_ate!).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : "Aumenta o tempo de entrega mostrado ao cliente por 1 hora."}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {[15, 30, 45].map((m) => (
              <button key={m} onClick={() => acao({ extra_min: m, extra_ate: daqui(60) }, `+${m} min na previsão pela próxima hora.`)} className={`rounded-full px-3 py-1.5 font-semibold ${d.loja.extra_min === m ? "bg-papel text-carvao" : "border border-linha"}`}>
                +{m} min
              </button>
            ))}
            {extraAtivo && (
              <button onClick={() => acao({ extra_min: 0, extra_ate: null }, "Tempo normal de novo.")} className="rounded-full border border-linha px-3 py-1.5 font-semibold">
                Normal
              </button>
            )}
          </div>
        </div>
      </div>
      {msg && <p className={`mt-3 text-[14px] ${msg.ok ? "text-manjericao" : "text-[#e8846f]"}`}>{msg.t}</p>}
      <p className="mt-3 text-[12px] text-areia">Resumo: {ORDEM.map((i) => `${DIAS[i].slice(0, 3)} ${linhaDoDia(h[String(i)] ?? [])}`).join(" · ")}</p>
    </Secao>
  );
}

function Regras() {
  const d = useDados();
  const L = d.loja;
  const [f, setF] = useState({
    entrega_ativa: L.entrega_ativa !== false,
    retirada_ativa: L.retirada_ativa !== false,
    aceita_pix: L.aceita_pix !== false,
    aceita_cartao: L.aceita_cartao !== false,
    aceita_dinheiro: L.aceita_dinheiro !== false,
    minimo: L.pedido_minimo_geral ? String(L.pedido_minimo_geral).replace(".", ",") : "",
    embalagem: L.taxa_embalagem ? String(L.taxa_embalagem).replace(".", ",") : "",
  });
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const semChave = !L.pix_chave;
  const valor = (t: string) => (t.trim() === "" ? 0 : Number(t.replace(",", ".")));

  async function salvar() {
    if (!f.entrega_ativa && !f.retirada_ativa) return setMsg({ ok: false, t: "Deixe pelo menos entrega ou retirada ligada." });
    if (!f.aceita_pix && !f.aceita_cartao && !f.aceita_dinheiro) return setMsg({ ok: false, t: "Deixe pelo menos uma forma de pagamento ligada." });
    const minimo = valor(f.minimo), embalagem = valor(f.embalagem);
    if (!Number.isFinite(minimo) || minimo < 0 || !Number.isFinite(embalagem) || embalagem < 0) return setMsg({ ok: false, t: "Use só números nos valores (ex.: 25,00)." });
    const r = await d.acoes.salvarLoja({
      entrega_ativa: f.entrega_ativa,
      retirada_ativa: f.retirada_ativa,
      aceita_pix: f.aceita_pix,
      aceita_cartao: f.aceita_cartao,
      aceita_dinheiro: f.aceita_dinheiro,
      pedido_minimo_geral: minimo,
      taxa_embalagem: embalagem,
    });
    setMsg(r ? { ok: false, t: r } : { ok: true, t: "Regras salvas. A loja já segue essas escolhas." });
  }

  const chave = (k: keyof typeof f, rotulo: string, dica?: string) => (
    <label className="flex items-start gap-3 rounded-xl bg-grafite px-3 py-2.5">
      <input type="checkbox" checked={f[k] as boolean} onChange={(e) => (setF({ ...f, [k]: e.target.checked }), setMsg(null))} className="mt-0.5 h-4 w-4 accent-[#ff5b1f]" />
      <span>
        <b>{rotulo}</b>
        {dica && <span className="block text-[12px] text-areia">{dica}</span>}
      </span>
    </label>
  );

  return (
    <Secao icone={<ShoppingBag className="h-5 w-5 text-brasa" />} titulo="Pedidos e pagamentos" sub="Como o cliente pode receber o pedido e como pode pagar na loja online.">
      <div className="grid gap-2 text-[14px] sm:grid-cols-2">
        {chave("entrega_ativa", "Entrega", "Usa as zonas e taxas do Território")}
        {chave("retirada_ativa", "Retirada no balcão", "O cliente busca na loja")}
      </div>
      <p className="mt-4 text-[13px] font-semibold text-areia">Formas de pagamento</p>
      <div className="mt-2 grid gap-2 text-[14px] sm:grid-cols-3">
        {chave("aceita_pix", "Pix pelo site", semChave ? "Cadastre a chave em \"Pix da loja\" abaixo" : "Cai direto na sua conta")}
        {chave("aceita_cartao", "Cartão na entrega", "Maquininha na entrega ou retirada")}
        {chave("aceita_dinheiro", "Dinheiro", "O cliente informa o troco")}
      </div>
      <div className="mt-4 grid gap-3 text-[14px] sm:grid-cols-2">
        <label className="block font-semibold">
          Pedido mínimo da loja (R$)
          <input value={f.minimo} onChange={(e) => setF({ ...f, minimo: e.target.value })} inputMode="decimal" placeholder="0,00 = sem mínimo" className={campo} />
          <span className="mt-1 block text-[12px] font-normal text-areia">Vale para entrega e retirada. Cada zona também pode ter o seu.</span>
        </label>
        <label className="block font-semibold">
          Taxa de embalagem (R$)
          <input value={f.embalagem} onChange={(e) => setF({ ...f, embalagem: e.target.value })} inputMode="decimal" placeholder="0,00 = sem taxa" className={campo} />
          <span className="mt-1 block text-[12px] font-normal text-areia">Somada uma vez por pedido.</span>
        </label>
      </div>
      {msg && <p className={`mt-3 text-[14px] ${msg.ok ? "text-manjericao" : "text-[#e8846f]"}`}>{msg.t}</p>}
      <button onClick={salvar} className="mt-3 w-full rounded-xl bg-brasa py-3 font-semibold text-carvao hover:bg-mostarda">
        Salvar regras
      </button>
    </Secao>
  );
}
