import { useState } from "react";
import { Armchair, Bell, CheckCircle2, Clock, CreditCard, Download, Gift, ImagePlus, MapPin, ShoppingBag, Store, Trash2, Users, Wallet } from "lucide-react";
import { avisar, avisosLigados, avisosSuportados, instalarApp, jaInstalado, pedirAvisos, podeInstalar, quandoPuderInstalar } from "../../lib/avisos";
import { supabase } from "../../data/dados";
import { useEffect } from "react";
import type { Cupom } from "../../data/dados";
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
        <Fidelidade key={"fid" + d.loja.id} />
        <SalaoPadroes key={"sal" + d.loja.id} />
        <Avisos />
        {(d.papel === "dono" || d.modo === "demo") && <Equipe key={"eq" + d.loja.id} />}
        {(d.papel === "dono" || d.modo === "demo") && <Assinatura />}
        {(d.papel === "dono" || d.modo === "demo") && <SeusDados />}
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

const num = (t: string) => (t.trim() === "" ? 0 : Number(t.replace(",", ".")));

function Fidelidade() {
  const d = useDados();
  const L = d.loja;
  const [cb, setCb] = useState({
    ativo: !!L.cashback_ativo,
    pct: L.cashback_percentual ? String(Math.round(L.cashback_percentual * 1000) / 10).replace(".", ",") : "5",
    minimo: L.cashback_minimo_uso ? String(L.cashback_minimo_uso).replace(".", ",") : "",
    validade: L.cashback_validade_dias ? String(L.cashback_validade_dias) : "",
  });
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);

  async function salvarCashback() {
    const pct = num(cb.pct), minimo = num(cb.minimo), validade = cb.validade.trim() ? Math.round(num(cb.validade)) : null;
    if (cb.ativo && (!Number.isFinite(pct) || pct <= 0 || pct > 50)) return setMsg({ ok: false, t: "A porcentagem vai de 0,5% a 50%." });
    if (!Number.isFinite(minimo) || minimo < 0 || (validade !== null && (!Number.isFinite(validade) || validade < 1))) return setMsg({ ok: false, t: "Confira os valores." });
    const r = await d.acoes.salvarLoja({ cashback_ativo: cb.ativo, cashback_percentual: pct / 100, cashback_minimo_uso: minimo, cashback_validade_dias: validade });
    setMsg(r ? { ok: false, t: r } : { ok: true, t: cb.ativo ? `Cashback ligado: ${cb.pct}% de volta em cada pedido entregue.` : "Cashback desligado." });
  }

  return (
    <Secao icone={<Gift className="h-5 w-5 text-brasa" />} titulo="Fidelidade" sub="Cashback e cupons são opcionais. Ligue só o que fizer sentido para a sua loja.">
      <div className="rounded-2xl border border-linha p-4 text-[14px]">
        <label className="flex items-center gap-3">
          <input type="checkbox" checked={cb.ativo} onChange={(e) => (setCb({ ...cb, ativo: e.target.checked }), setMsg(null))} className="h-5 w-5 accent-[#ff5b1f]" />
          <span>
            <b>Cashback</b>
            <span className="block text-[12px] text-areia">O cliente ganha uma parte do que gastou como saldo para o próximo pedido. Conta quando o pedido é entregue.</span>
          </span>
        </label>
        {cb.ativo && (
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <label className="block font-semibold">
              % de volta
              <input value={cb.pct} onChange={(e) => setCb({ ...cb, pct: e.target.value })} inputMode="decimal" className={campo} />
            </label>
            <label className="block font-semibold">
              Usar a partir de (R$)
              <input value={cb.minimo} onChange={(e) => setCb({ ...cb, minimo: e.target.value })} inputMode="decimal" placeholder="sem mínimo" className={campo} />
            </label>
            <label className="block font-semibold">
              Vence em (dias)
              <input value={cb.validade} onChange={(e) => setCb({ ...cb, validade: e.target.value })} inputMode="numeric" placeholder="não vence" className={campo} />
            </label>
          </div>
        )}
        {cb.ativo && num(cb.pct) > 0 && <p className="mt-2 text-[12px] text-areia">Exemplo: pedido de R$ 80,00 devolve {brlSimples((80 * num(cb.pct)) / 100)} de saldo.</p>}
        {msg && <p className={`mt-2 ${msg.ok ? "text-manjericao" : "text-[#e8846f]"}`}>{msg.t}</p>}
        <button onClick={salvarCashback} className="mt-3 w-full rounded-xl bg-brasa py-2.5 font-semibold text-carvao hover:bg-mostarda">
          Salvar cashback
        </button>
      </div>
      <Cupons />
    </Secao>
  );
}
const brlSimples = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const CUPOM_VAZIO = { codigo: "", tipo: "percentual" as Cupom["tipo"], valor: "10", minimo: "", validade: "", limite: "", uma_por_cliente: true, primeiro_pedido: false };

function Cupons() {
  const d = useDados();
  const [lista, setLista] = useState<Cupom[] | null>(null);
  const [novo, setNovo] = useState<typeof CUPOM_VAZIO | null>(null);
  const [erro, setErro] = useState("");
  const carregar = () => d.acoes.listarCupons().then(setLista);
  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function criar() {
    if (!novo) return;
    const r = await d.acoes.salvarCupom({
      codigo: novo.codigo,
      tipo: novo.tipo,
      valor: num(novo.valor),
      minimo: num(novo.minimo),
      validade: novo.validade || null,
      limite_total: novo.limite.trim() ? Math.round(num(novo.limite)) : null,
      uma_por_cliente: novo.uma_por_cliente,
      primeiro_pedido: novo.primeiro_pedido,
      ativo: true,
    });
    if (r) return setErro(r);
    setNovo(null);
    setErro("");
    carregar();
  }
  const descricao = (c: Cupom) =>
    [
      c.tipo === "percentual" ? `${c.valor}% de desconto` : c.tipo === "valor" ? `${brlSimples(c.valor)} de desconto` : "Entrega grátis",
      c.minimo > 0 && `a partir de ${brlSimples(c.minimo)}`,
      c.primeiro_pedido && "só 1º pedido",
      c.uma_por_cliente && "1 por cliente",
      c.limite_total && `até ${c.limite_total} usos`,
      c.validade && `até ${new Date(c.validade + "T12:00").toLocaleDateString("pt-BR")}`,
    ]
      .filter(Boolean)
      .join(" · ");

  return (
    <div className="mt-4 rounded-2xl border border-linha p-4 text-[14px]">
      <div className="flex items-center justify-between">
        <span>
          <b>Cupons de desconto</b>
          <span className="block text-[12px] text-areia">O cliente digita o código na hora de pagar. Não soma com o cashback.</span>
        </span>
        {!novo && (
          <button onClick={() => setNovo({ ...CUPOM_VAZIO })} className="shrink-0 rounded-full bg-brasa px-3 py-1.5 font-semibold text-carvao">
            + Cupom
          </button>
        )}
      </div>

      {novo && (
        <div className="mt-3 space-y-3 rounded-xl bg-grafite p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block font-semibold">
              Código
              <input value={novo.codigo} onChange={(e) => setNovo({ ...novo, codigo: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") })} placeholder="BEMVINDO10" className={campo} />
            </label>
            <label className="block font-semibold">
              Tipo
              <select value={novo.tipo} onChange={(e) => setNovo({ ...novo, tipo: e.target.value as Cupom["tipo"] })} className={campo}>
                <option value="percentual">% de desconto</option>
                <option value="valor">Valor fixo (R$)</option>
                <option value="entrega">Entrega grátis</option>
              </select>
            </label>
            {novo.tipo !== "entrega" && (
              <label className="block font-semibold">
                {novo.tipo === "percentual" ? "Desconto (%)" : "Desconto (R$)"}
                <input value={novo.valor} onChange={(e) => setNovo({ ...novo, valor: e.target.value })} inputMode="decimal" className={campo} />
              </label>
            )}
            <label className="block font-semibold">
              Pedido mínimo (R$)
              <input value={novo.minimo} onChange={(e) => setNovo({ ...novo, minimo: e.target.value })} inputMode="decimal" placeholder="sem mínimo" className={campo} />
            </label>
            <label className="block font-semibold">
              Válido até
              <input type="date" value={novo.validade} onChange={(e) => setNovo({ ...novo, validade: e.target.value })} className={campo} />
            </label>
            <label className="block font-semibold">
              Limite de usos no total
              <input value={novo.limite} onChange={(e) => setNovo({ ...novo, limite: e.target.value })} inputMode="numeric" placeholder="sem limite" className={campo} />
            </label>
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={novo.uma_por_cliente} onChange={(e) => setNovo({ ...novo, uma_por_cliente: e.target.checked })} className="h-4 w-4 accent-[#ff5b1f]" /> Uma vez por cliente
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={novo.primeiro_pedido} onChange={(e) => setNovo({ ...novo, primeiro_pedido: e.target.checked })} className="h-4 w-4 accent-[#ff5b1f]" /> Só no primeiro pedido do cliente
          </label>
          {erro && <p className="text-[#e8846f]">{erro}</p>}
          <div className="flex gap-2">
            <button onClick={criar} className="flex-1 rounded-xl bg-brasa py-2.5 font-semibold text-carvao">
              Criar cupom
            </button>
            <button onClick={() => (setNovo(null), setErro(""))} className="rounded-xl border border-linha px-4 font-semibold">
              Cancelar
            </button>
          </div>
        </div>
      )}

      <ul className="mt-3 space-y-2">
        {lista === null && <li className="text-areia">Carregando…</li>}
        {lista?.length === 0 && !novo && <li className="text-areia">Nenhum cupom ainda. Que tal um BEMVINDO10 só para o primeiro pedido?</li>}
        {lista?.map((c) => (
          <li key={c.id} className={`rounded-xl bg-grafite p-3 ${c.ativo ? "" : "opacity-60"}`}>
            <div className="flex items-start justify-between gap-2">
              <span>
                <b className="font-mono text-[15px]">{c.codigo}</b> {!c.ativo && <span className="text-[12px] text-areia">(pausado)</span>}
                <span className="block text-[12px] text-areia">{descricao(c)}</span>
                <span className="mt-1 block text-[12px]">
                  {c.usos ?? 0} {c.usos === 1 ? "uso" : "usos"} · {brlSimples(c.vendas ?? 0)} em pedidos · {brlSimples(c.desconto ?? 0)} de desconto dado
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-1">
                <button
                  onClick={async () => {
                    const r = await d.acoes.salvarCupom({ ...c, ativo: !c.ativo });
                    if (r) setErro(r);
                    carregar();
                  }}
                  className="rounded-full border border-linha px-2.5 py-1 text-[12px] font-semibold"
                >
                  {c.ativo ? "Pausar" : "Ativar"}
                </button>
                <button
                  onClick={async () => {
                    if (!confirm(`Apagar o cupom ${c.codigo}?`)) return;
                    await d.acoes.removerCupom(c.id);
                    carregar();
                  }}
                  aria-label={`Apagar ${c.codigo}`}
                  className="rounded-full p-1.5 text-areia hover:text-[#ff8b80]"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------- 13. Salão ----------
function SalaoPadroes() {
  const d = useDados();
  const [serv, setServ] = useState(String(d.loja.servico_padrao ?? 10).replace(".", ","));
  const [couv, setCouv] = useState(d.loja.couvert_padrao ? String(d.loja.couvert_padrao).replace(".", ",") : "");
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  async function salvar() {
    const sv = num(serv), cv = num(couv);
    if (!Number.isFinite(sv) || sv < 0 || sv > 30) return setMsg({ ok: false, t: "A taxa de serviço vai de 0% a 30%." });
    if (!Number.isFinite(cv) || cv < 0) return setMsg({ ok: false, t: "Couvert inválido." });
    const r = await d.acoes.salvarLoja({ servico_padrao: sv, couvert_padrao: cv });
    setMsg(r ? { ok: false, t: r } : { ok: true, t: "Salvo. Vale para as próximas mesas abertas." });
  }
  return (
    <Secao icone={<Armchair className="h-5 w-5 text-brasa" />} titulo="Salão" sub="Valores que já vêm em cada mesa aberta. O garçom ainda pode mudar numa mesa específica.">
      <div className="grid gap-3 text-[14px] sm:grid-cols-2">
        <label className="block font-semibold">
          Taxa de serviço (%)
          <input value={serv} onChange={(e) => (setServ(e.target.value), setMsg(null))} inputMode="decimal" className={campo} />
          <span className="mt-1 block text-[12px] font-normal text-areia">0 = sem taxa. O comum é 10%.</span>
        </label>
        <label className="block font-semibold">
          Couvert por pessoa (R$)
          <input value={couv} onChange={(e) => (setCouv(e.target.value), setMsg(null))} inputMode="decimal" placeholder="sem couvert" className={campo} />
          <span className="mt-1 block text-[12px] font-normal text-areia">Música ao vivo, pão de entrada etc.</span>
        </label>
      </div>
      {msg && <p className={`mt-3 text-[14px] ${msg.ok ? "text-manjericao" : "text-[#e8846f]"}`}>{msg.t}</p>}
      <button onClick={salvar} className="mt-3 w-full rounded-xl bg-brasa py-3 font-semibold text-carvao hover:bg-mostarda">
        Salvar salão
      </button>
    </Secao>
  );
}

// ---------- 16. App e avisos ----------
function Avisos() {
  const [, forcar] = useState(0);
  useEffect(() => quandoPuderInstalar(() => forcar((x) => x + 1)), []);
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const [estado, setEstado] = useState(avisosLigados() ? "ligado" : avisosSuportados() && Notification.permission === "denied" ? "bloqueado" : "");
  return (
    <Secao icone={<Bell className="h-5 w-5 text-brasa" />} titulo="App e avisos de pedido" sub="Instale o painel como app no celular ou no computador e receba um aviso a cada pedido novo.">
      <div className="space-y-3 text-[14px]">
        <div className="rounded-2xl border border-linha p-3">
          <p className="font-semibold">Instalar como app</p>
          {jaInstalado() ? (
            <p className="mt-1 text-manjericao">Já está instalado neste aparelho.</p>
          ) : podeInstalar() ? (
            <button onClick={() => instalarApp().then(() => forcar((x) => x + 1))} className="mt-2 rounded-full bg-brasa px-4 py-2 font-semibold text-carvao">
              Instalar o Freguês
            </button>
          ) : ios ? (
            <p className="mt-1 text-areia">No iPhone: abra no Safari, toque em Compartilhar (quadrado com seta) e depois em "Adicionar à Tela de Início".</p>
          ) : (
            <p className="mt-1 text-areia">No Chrome: menu (três pontinhos) → "Instalar app" ou "Adicionar à tela inicial".</p>
          )}
        </div>
        <div className="rounded-2xl border border-linha p-3">
          <p className="font-semibold">Aviso de pedido novo</p>
          {estado === "ligado" ? (
            <>
              <p className="mt-1 text-manjericao">Ligado neste aparelho.</p>
              <button onClick={() => avisar("Teste do Freguês", "Assim chega o aviso de pedido novo.")} className="mt-2 rounded-full border border-linha px-4 py-2 font-semibold">
                Testar aviso
              </button>
            </>
          ) : estado === "bloqueado" ? (
            <p className="mt-1 text-[#e8846f]">O navegador bloqueou os avisos. Libere em: cadeado ao lado do endereço → Notificações → Permitir.</p>
          ) : !avisosSuportados() ? (
            <p className="mt-1 text-areia">Este navegador não mostra avisos. No iPhone, instale o app primeiro (acima) e abra por ele.</p>
          ) : (
            <button onClick={async () => setEstado((await pedirAvisos()) === "granted" ? "ligado" : "bloqueado")} className="mt-2 rounded-full bg-brasa px-4 py-2 font-semibold text-carvao">
              Ligar avisos
            </button>
          )}
          <p className="mt-2 text-[12px] text-areia">O aviso chega com o painel aberto (pode estar minimizado ou em outra aba). Deixe a tela de Pedidos aberta no computador do caixa.</p>
        </div>
      </div>
    </Secao>
  );
}

// ---------- 14. Equipe ----------
const PAPEIS: { v: string; t: string; d: string }[] = [
  { v: "gerente", t: "Gerente", d: "Vê e muda tudo, menos a equipe e a assinatura" },
  { v: "caixa", t: "Caixa", d: "Pedidos, caixa, salão e conversas" },
  { v: "cozinha", t: "Cozinha", d: "Só a tela de pedidos" },
  { v: "garcom", t: "Garçom", d: "Só o salão e as mesas" },
  { v: "entregador", t: "Entregador", d: "Só a tela de pedidos" },
];
type Membro = { user_id: string; email: string; papel: string; ultimo_login: string | null; provisoria: boolean };

function Equipe() {
  const d = useDados();
  const [lista, setLista] = useState<Membro[] | null>(null);
  const [novo, setNovo] = useState<{ email: string; papel: string; senha: string } | null>(null);
  const [pronto, setPronto] = useState<{ email: string; senha: string; papel: string } | null>(null);
  const [erro, setErro] = useState("");
  const carregar = async () => {
    if (!supabase || !d.loja.id) return setLista([]);
    const { data } = await supabase.rpc("equipe_listar", { p_store: d.loja.id });
    setLista((data as Membro[]) ?? []);
  };
  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const senhaNova = () => (d.loja.nome || "equipe").toLowerCase().normalize("NFD").replace(/[^a-z0-9]/g, "").slice(0, 10) + String(1000 + Math.floor(Math.random() * 9000));
  const nomePapel = (v: string) => (v === "dono" ? "Dono" : PAPEIS.find((p) => p.v === v)?.t ?? v);

  async function criar() {
    if (!novo || !supabase) return;
    setErro("");
    const { data } = await supabase.auth.getSession();
    const r = await fetch("/api/conta/equipe", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}` },
      body: JSON.stringify({ org_id: d.loja.org_id, email: novo.email, papel: novo.papel, senha: novo.senha }),
    }).catch(() => null);
    const c = r ? await r.json().catch(() => ({})) : {};
    if (!r || !r.ok) return setErro(c.erro || "Não consegui criar agora.");
    setPronto(c.ja_existia ? { email: novo.email, senha: "", papel: novo.papel } : { ...novo });
    setNovo(null);
    carregar();
  }
  async function mudar(m: Membro, papel: string | null) {
    if (!supabase) return;
    if (papel === null && !confirm(`Tirar o acesso de ${m.email}?`)) return;
    const { error } = await supabase.rpc("equipe_mudar", { p_store: d.loja.id, p_user: m.user_id, p_papel: papel });
    if (error) setErro(error.message);
    carregar();
  }
  const link = `${window.location.origin}/?r=${d.loja.slug}#pedidos`;
  const msgZap = pronto ? `Seu acesso ao painel da ${d.loja.nome} (${nomePapel(pronto.papel)}):\n\n${link}\nE-mail: ${pronto.email}${pronto.senha ? `\nSenha provisória: ${pronto.senha}\n\nNo primeiro acesso, crie a sua senha.` : "\nUse a senha que você já tem."}` : "";

  return (
    <Secao icone={<Users className="h-5 w-5 text-brasa" />} titulo="Equipe" sub="Cada pessoa entra com o próprio e-mail e vê só a parte dela.">
      <ul className="space-y-2 text-[14px]">
        {lista === null && <li className="text-areia">Carregando…</li>}
        {lista?.map((m) => (
          <li key={m.user_id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-grafite px-3 py-2.5">
            <span className="min-w-0">
              <b className="block break-all">{m.email}</b>
              <span className="text-[12px] text-areia">{m.ultimo_login ? `Último acesso ${new Date(m.ultimo_login).toLocaleDateString("pt-BR")}` : "Ainda não entrou"}</span>
            </span>
            {m.papel === "dono" ? (
              <span className="rounded-full bg-papel px-3 py-1 text-[12px] font-bold text-carvao">Dono</span>
            ) : (
              <span className="flex items-center gap-1.5">
                <select value={m.papel} onChange={(e) => mudar(m, e.target.value)} className="rounded-lg border border-linha bg-carvao px-2 py-1.5 text-[13px] text-papel">
                  {PAPEIS.map((p) => (
                    <option key={p.v} value={p.v}>
                      {p.t}
                    </option>
                  ))}
                </select>
                <button onClick={() => mudar(m, null)} aria-label={`Tirar ${m.email}`} className="rounded-full p-1.5 text-areia hover:text-[#ff8b80]">
                  <Trash2 className="h-4 w-4" />
                </button>
              </span>
            )}
          </li>
        ))}
      </ul>

      {pronto && (
        <div className="mt-3 rounded-xl bg-carvao p-3 text-[14px]">
          <p className="font-semibold text-manjericao">Acesso criado. Mande para a pessoa:</p>
          <p className="mt-2 whitespace-pre-line break-words rounded-lg bg-grafite p-2.5">{msgZap}</p>
          <div className="mt-2 flex gap-2">
            <a href={`https://wa.me/?text=${encodeURIComponent(msgZap)}`} target="_blank" rel="noreferrer" className="flex-1 rounded-xl bg-[#25d366] py-2.5 text-center font-bold text-[#0b2e17]">
              Enviar no WhatsApp
            </a>
            <button onClick={() => setPronto(null)} className="rounded-xl border border-linha px-4 font-semibold">
              Ok
            </button>
          </div>
        </div>
      )}

      {novo ? (
        <div className="mt-3 space-y-3 rounded-xl border border-linha p-3 text-[14px]">
          <label className="block font-semibold">
            E-mail da pessoa
            <input type="email" value={novo.email} onChange={(e) => setNovo({ ...novo, email: e.target.value })} className={campo} />
          </label>
          <div className="grid gap-2 sm:grid-cols-2">
            {PAPEIS.map((p) => (
              <label key={p.v} className={`flex cursor-pointer items-start gap-2 rounded-xl px-3 py-2 ${novo.papel === p.v ? "bg-papel text-carvao" : "bg-grafite"}`}>
                <input type="radio" name="papel" checked={novo.papel === p.v} onChange={() => setNovo({ ...novo, papel: p.v })} className="mt-1 accent-[#ff5b1f]" />
                <span>
                  <b>{p.t}</b>
                  <span className="block text-[12px] opacity-80">{p.d}</span>
                </span>
              </label>
            ))}
          </div>
          <label className="block font-semibold">
            Senha provisória
            <input value={novo.senha} onChange={(e) => setNovo({ ...novo, senha: e.target.value })} className={campo} />
          </label>
          {erro && <p className="text-[#e8846f]">{erro}</p>}
          <div className="flex gap-2">
            <button onClick={criar} className="flex-1 rounded-xl bg-brasa py-2.5 font-semibold text-carvao">
              Criar acesso
            </button>
            <button onClick={() => (setNovo(null), setErro(""))} className="rounded-xl border border-linha px-4 font-semibold">
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setNovo({ email: "", papel: "caixa", senha: senhaNova() })} className="mt-3 w-full rounded-xl bg-brasa py-3 font-semibold text-carvao hover:bg-mostarda">
          + Adicionar pessoa
        </button>
      )}
      {!novo && erro && <p className="mt-2 text-[14px] text-[#e8846f]">{erro}</p>}
    </Secao>
  );
}

// ---------- 15. Minha assinatura ----------
type Fatura = { id: string; competencia: string; vencimento: string; valor: number; status: string; pago_em: string | null; link: string | null };
function Assinatura() {
  const [a, setA] = useState<{ status: string; plano_nome: string; valor: number; teste_ate: string | null; proximo_vencimento: string | null } | null>(null);
  const [faturas, setFaturas] = useState<Fatura[]>([]);
  useEffect(() => {
    if (!supabase) return;
    supabase.rpc("minha_assinatura").then(({ data }) => setA(data as typeof a));
    supabase.rpc("minhas_faturas").then(({ data }) => setFaturas((data as Fatura[]) ?? []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const dt = (s: string | null) => (s ? new Date(s + (s.length === 10 ? "T12:00" : "")).toLocaleDateString("pt-BR") : "—");
  const ST: Record<string, [string, string]> = { teste: ["Em teste", "text-[#1f5f59]"], ativa: ["Ativa", "text-manjericao"], atrasada: ["Em atraso", "text-mostarda"], suspensa: ["Suspensa", "text-[#e8846f]"], cancelada: ["Cancelada", "text-areia"] };
  return (
    <Secao icone={<CreditCard className="h-5 w-5 text-brasa" />} titulo="Minha assinatura" sub="Seu plano do Freguês e as mensalidades.">
      {a ? (
        <div className="grid gap-2 text-[14px] sm:grid-cols-3">
          <div className="rounded-xl bg-grafite p-3">
            <p className="text-[12px] text-areia">Plano</p>
            <p className="font-bold">{a.plano_nome}</p>
            <p className="text-[13px]">{brlSimples(Number(a.valor))}/mês</p>
          </div>
          <div className="rounded-xl bg-grafite p-3">
            <p className="text-[12px] text-areia">Situação</p>
            <p className={`font-bold ${ST[a.status]?.[1] ?? ""}`}>{ST[a.status]?.[0] ?? a.status}</p>
            {a.status === "teste" && <p className="text-[13px]">até {dt(a.teste_ate)}</p>}
          </div>
          <div className="rounded-xl bg-grafite p-3">
            <p className="text-[12px] text-areia">Próximo vencimento</p>
            <p className="font-bold">{dt(a.proximo_vencimento)}</p>
          </div>
        </div>
      ) : (
        <p className="text-[14px] text-areia">{supabase ? "Carregando…" : "Na demonstração não há assinatura."}</p>
      )}
      <ul className="mt-3 divide-y divide-linha rounded-xl border border-linha text-[14px]">
        {faturas.map((f) => (
          <li key={f.id} className="flex items-center justify-between gap-2 px-3 py-2.5">
            <span>
              <b>{new Date(f.competencia + "T12:00").toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</b>
              <span className="block text-[12px] text-areia">
                {brlSimples(Number(f.valor))} · vence {dt(f.vencimento)}
                {f.pago_em ? ` · paga em ${dt(f.pago_em.slice(0, 10))}` : ""}
              </span>
            </span>
            {f.status === "paga" ? (
              <span className="text-[13px] font-semibold text-manjericao">Paga</span>
            ) : f.link ? (
              <a href={f.link} target="_blank" rel="noreferrer" className="rounded-full bg-brasa px-3 py-1.5 text-[13px] font-semibold text-carvao">
                Pagar / 2ª via
              </a>
            ) : (
              <span className={`text-[13px] font-semibold ${f.status === "atrasada" ? "text-mostarda" : "text-areia"}`}>{f.status === "atrasada" ? "Em atraso" : "Em aberto"}</span>
            )}
          </li>
        ))}
        {faturas.length === 0 && <li className="px-3 py-3 text-areia">Nenhuma fatura ainda.</li>}
      </ul>
    </Secao>
  );
}

// ---------- 17. Seus dados (LGPD) ----------
async function todasAsLinhas(tabela: string, colunas: string, filtro: (q: any) => any) {
  const linhas: Record<string, unknown>[] = [];
  for (let de = 0; de < 50000; de += 1000) {
    const { data, error } = await filtro(supabase!.from(tabela).select(colunas)).range(de, de + 999);
    if (error || !data?.length) break;
    linhas.push(...(data as Record<string, unknown>[]));
    if (data.length < 1000) break;
  }
  return linhas;
}
function baixarCSV(nome: string, linhas: Record<string, unknown>[]) {
  if (!linhas.length) return alert("Nada para exportar ainda.");
  const cols = Object.keys(linhas[0]);
  const esc = (v: unknown) => {
    const t = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[;"\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  const csv = "\ufeff" + [cols.join(";"), ...linhas.map((l) => cols.map((c) => esc(l[c])).join(";"))].join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  a.download = nome;
  a.click();
}

function SeusDados() {
  const d = useDados();
  const [baixando, setBaixando] = useState("");
  const [cancelar, setCancelar] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [msg, setMsg] = useState("");
  const exportar = async (tipo: "fregueses" | "pedidos" | "cardapio") => {
    if (!supabase || !d.loja.id) return alert("Na demonstração não há dados para exportar.");
    setBaixando(tipo);
    const dia = new Date().toISOString().slice(0, 10);
    if (tipo === "fregueses") baixarCSV(`fregueses-${dia}.csv`, await todasAsLinhas("customers", "nome,telefone,aniversario,tags,obs,aceita_marketing,canal_origem,created_at", (q) => q.eq("org_id", d.loja.org_id)));
    if (tipo === "pedidos") baixarCSV(`pedidos-${dia}.csv`, await todasAsLinhas("orders", "numero,created_at,status,modo,subtotal,taxa_entrega,taxa_embalagem,desconto,total,pagamento,pago,cupom_codigo,endereco", (q) => q.eq("store_id", d.loja.id).order("created_at")));
    if (tipo === "cardapio") baixarCSV(`cardapio-${dia}.csv`, await todasAsLinhas("products", "nome,descricao,preco,preco_promo,esgotado", (q) => q.eq("store_id", d.loja.id).order("ordem")));
    setBaixando("");
  };
  return (
    <Secao icone={<Download className="h-5 w-5 text-brasa" />} titulo="Seus dados" sub="Os dados da sua loja são seus. Baixe quando quiser, em planilha (abre no Excel e no Google Planilhas).">
      <div className="flex flex-wrap gap-2 text-[14px]">
        {(
          [
            ["fregueses", "Fregueses"],
            ["pedidos", "Pedidos"],
            ["cardapio", "Cardápio"],
          ] as const
        ).map(([t, r]) => (
          <button key={t} disabled={!!baixando} onClick={() => exportar(t)} className="flex items-center gap-1.5 rounded-full border border-linha px-4 py-2 font-semibold hover:border-areia disabled:opacity-50">
            <Download className="h-4 w-4" /> {baixando === t ? "Baixando…" : r}
          </button>
        ))}
      </div>
      <div className="mt-5 border-t border-linha pt-4 text-[14px]">
        {msg ? (
          <p className="text-manjericao">{msg}</p>
        ) : cancelar ? (
          <div className="space-y-2">
            <p>Antes de cancelar, baixe seus dados acima. Depois do cancelamento a loja sai do ar e os dados são apagados.</p>
            <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Conta pra gente o motivo (opcional)" rows={3} className={campo} />
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  if (!supabase) return;
                  const { error } = await supabase.rpc("pedir_cancelamento", { p_motivo: motivo });
                  setMsg(error ? error.message : "Pedido de cancelamento enviado. A equipe do Freguês fala com você em até 1 dia útil.");
                }}
                className="flex-1 rounded-xl bg-tomate py-2.5 font-semibold text-papel"
              >
                Pedir cancelamento
              </button>
              <button onClick={() => setCancelar(false)} className="rounded-xl border border-linha px-4 font-semibold">
                Voltar
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setCancelar(true)} className="text-[13px] text-areia underline hover:text-[#ff8b80]">
            Encerrar minha conta
          </button>
        )}
      </div>
    </Secao>
  );
}
