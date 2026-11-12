import { CalendarDays, ChevronRight, Frown, MessageCircle, MessagesSquare, Sparkles, Star, TrendingUp } from "lucide-react";
import { crescer, quandoTxt, useCrescer } from "../../data/crescer";
import { AnelPulso, Numero, Painelzinho, StatusPill, useToast } from "../../components/ui";
import { brl, type Freguês } from "../../data/mock";
import { SLUG, useDados, type DiaSemana } from "../../data/dados";
import { useState } from "react";

function GraficoSemana({ VENDAS_SEMANA }: { VENDAS_SEMANA: DiaSemana[] }) {
  const temMkt = VENDAS_SEMANA.some((d) => d.marketplace > 0);
  const max = Math.max(1, ...VENDAS_SEMANA.map((d) => d.propria + d.marketplace));
  return (
    <div>
      <div className="flex h-[180px] items-end gap-2 sm:gap-3" role="img" aria-label="Vendas da semana por canal: loja própria e marketplace">
        {VENDAS_SEMANA.map((d) => (
          <div key={d.dia} className="flex flex-1 flex-col items-center gap-2">
            <div className="flex w-full max-w-[44px] flex-col overflow-hidden rounded-lg" style={{ height: `${((d.propria + d.marketplace) / max) * 150}px` }}>
              <div className="bg-grafite" style={{ flex: d.marketplace }} title={`Marketplace: ${brl(d.marketplace)}`} />
              <div className="bg-brasa" style={{ flex: d.propria }} title={`Loja própria: ${brl(d.propria)}`} />
            </div>
            <span className="text-[12px] text-areia">{d.dia}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-5 text-[13px] text-areia">
        <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-brasa" /> Loja própria</span>
        {temMkt && <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-grafite" /> Marketplace</span>}
      </div>
    </div>
  );
}

function Atencao() {
  const conversas = useCrescer((s) => s.conversas);
  const forms = useCrescer((s) => s.forms);
  const itens: { chave: string; icone: React.ReactNode; texto: string; sub: string; href: string; antes?: () => void; cor: string }[] = [];
  for (const c of conversas.filter((c) => c.status === "equipe" || (c.naoLida && c.humor === "negativo")).slice(0, 3))
    itens.push({ chave: c.id, icone: c.humor === "negativo" ? <Frown className="h-4 w-4" /> : <MessagesSquare className="h-4 w-4" />, texto: `${c.titulo} · ${c.cliente}`, sub: c.status === "equipe" ? `A IA chamou você ${quandoTxt(c.mensagens[c.mensagens.length - 1].quando)}` : "Cliente chateado", href: "#atendimento", cor: c.humor === "negativo" ? "#f0524a" : "#ffc03a" });
  const pesq = forms.find((f) => f.id === "fo1");
  for (const r of (pesq?.respostas ?? []).filter((r) => Number(r.valores.comida) <= 3 && Date.now() - r.quando < 3 * 86400_000).slice(0, 2))
    itens.push({ chave: r.id, icone: <Star className="h-4 w-4" />, texto: `Nota ${r.valores.comida} de ${r.cliente}`, sub: String(r.valores.comentario || "Sem comentário") + ` · ${quandoTxt(r.quando)}`, href: "#formularios", cor: "#f0524a" });
  const res = forms.find((f) => f.id === "fo2");
  for (const r of (res?.respostas ?? []).slice(0, 1))
    itens.push({ chave: r.id, icone: <CalendarDays className="h-4 w-4" />, texto: `Reserva para ${r.valores.pessoas} pessoas · ${r.cliente}`, sub: `${r.valores.data} às ${r.valores.hora} · ${r.valores.ocasiao ?? ""}`, href: "#formularios", antes: () => crescer.abrirPublico("fo2"), cor: "#ffc03a" });
  if (!itens.length) return null;
  return (
    <section className="rounded-3xl border border-linha bg-forno p-5" aria-label="Precisa de atenção">
      <h2 className="flex items-center gap-2 font-display text-[18px] font-bold">
        Precisa de você <span className="tabular rounded-full bg-brasa px-2 text-[13px] text-carvao">{itens.length}</span>
      </h2>
      <ul className="mt-3 grid gap-2 md:grid-cols-2">
        {itens.map((i) => (
          <li key={i.chave}>
            <a href={i.href} onClick={i.antes} className="flex items-center gap-3 rounded-2xl bg-grafite p-3 transition hover:bg-linha">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-carvao" style={{ background: i.cor }}>
                {i.icone}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-semibold">{i.texto}</span>
                <span className="block truncate text-[13px] text-areia">{i.sub}</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-fumo" />
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

// Chance de o freguês não voltar sozinho, por status (mesma regra do banco)
const PERDA = { ritmo: 0, atrasado: 0.45, sumindo: 0.8 } as const;
const PERIODOS = [7, 15, 30] as const;
const CHAVE_PERIODO = `fregues-pulso-periodo:${SLUG}`;

function lerPeriodo(): number {
  try {
    const v = Number(localStorage.getItem(CHAVE_PERIODO));
    return (PERIODOS as readonly number[]).includes(v) ? v : 7;
  } catch {
    return 7;
  }
}

// mensagem do "o de sempre" para o WhatsApp do freguês
export function linkChamar(f: Freguês, loja: string) {
  const tel = f.tel.replace(/\D/g, "");
  if (tel.length < 10) return null;
  const nome = f.nome.split(" ")[0];
  const prato = f.favorito && f.favorito !== "—" ? `seu ${f.favorito}` : "o de sempre";
  const linkLoja = `${location.origin}${location.pathname}?r=${SLUG}#loja`;
  const texto = `Oi, ${nome}! Aqui é da ${loja}. Faz um tempinho que você não aparece e ${prato} está te esperando. Quer pedir hoje? É só tocar aqui: ${linkLoja}`;
  return `https://wa.me/${tel.startsWith("55") ? tel : "55" + tel}?text=${encodeURIComponent(texto)}`;
}

export function Pulso({ abrirCopiloto }: { abrirCopiloto: () => void }) {
  const [periodo, setPeriodoState] = useState(lerPeriodo);
  const setPeriodo = (p: number) => {
    setPeriodoState(p);
    try {
      localStorage.setItem(CHAVE_PERIODO, String(p));
    } catch {
      /* sem armazenamento: vale só nesta visita */
    }
  };
  const { show, Toast } = useToast();
  const d = useDados();
  const VENDAS_SEMANA = d.semana;
  const pulsoResumo = d.pulso;
  const COMISSAO = Number(d.pulso.comissao ?? 0.12);
  const chamarHoje: Freguês[] = d.fregueses.filter((f) => f.status !== "ritmo").sort((a, b) => b.ticket * b.pedidos - a.ticket * a.pedidos).slice(0, 6);
  const propria = VENDAS_SEMANA.reduce((s, x) => s + x.propria, 0);
  const total = pulsoResumo.total;
  const novos = d.pedidos.filter((p) => p.status === "novo").length;
  // quanto os fregueses fora do ritmo costumam gastar no período escolhido
  const risco = d.fregueses.length
    ? Math.round(d.fregueses.reduce((s, f) => s + f.ticket * (periodo / Math.max(1, f.intervalo)) * PERDA[f.status] * 1.6, 0))
    : Math.round(pulsoResumo.risco * (periodo / 7));
  const hoje = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
  const h = new Date().getHours();
  const saudacao = h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[15px] capitalize text-areia">{hoje}</p>
          <h1 className="font-display text-[clamp(2rem,4vw,2.8rem)] font-extrabold leading-tight tracking-[-0.015em]">{saudacao}. Aqui está o pulso da casa.</h1>
        </div>
        <a href="#pedidos" className="flex items-center gap-2 rounded-full border border-linha px-4 py-2 text-[14px] font-semibold hover:border-areia">
          <span className="pulso h-2 w-2 rounded-full bg-brasa" /> {novos} pedidos novos agora
        </a>
      </div>

      <Atencao />

      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <section className="relative overflow-hidden rounded-3xl bg-[#fde9df] p-6 md:p-8">
          <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-brasa/20 blur-3xl" />
          <div className="relative flex flex-wrap items-center justify-between gap-2">
            <p className="text-[15px] text-[#9a3412]">Em risco nos próximos {periodo} dias</p>
            <div className="flex rounded-full bg-white/70 p-1 text-[13px] font-semibold" role="group" aria-label="Período">
              {PERIODOS.map((p) => (
                <button key={p} onClick={() => setPeriodo(p)} aria-pressed={periodo === p} className={`rounded-full px-3 py-1 transition ${periodo === p ? "bg-brasa text-white" : "text-[#8e2f2a] hover:bg-white"}`}>
                  {p === 30 ? "1 mês" : `${p} dias`}
                </button>
              ))}
            </div>
          </div>
          <p className="relative mt-1 font-display text-[clamp(3rem,7vw,5.2rem)] font-extrabold leading-none tracking-[-0.015em] text-brasa">
            <Numero valor={risco} prefixo="R$ " />
          </p>
          <p className="relative mt-3 max-w-[30rem] text-[15px] text-[#8e2f2a]">
            {pulsoResumo.atrasado + pulsoResumo.sumindo} fregueses saíram do ritmo de pedidos. {`Esse é o valor que eles costumam gastar em ${periodo === 30 ? "um mês" : `${periodo} dias`}. Cada freguês tem o próprio ritmo: quem pede uma vez por mês só sai do ritmo depois de uns 38 dias sem pedir.`}
          </p>
          <div className="relative mt-6 flex flex-wrap gap-3">
            <a href="#fregueses" className="rounded-full bg-brasa px-5 py-2.5 text-[15px] font-semibold text-carvao hover:bg-mostarda">Ver quem está sumindo</a>
            <button onClick={abrirCopiloto} className="flex items-center gap-2 rounded-full border border-[#6a3415] px-5 py-2.5 text-[15px] font-semibold text-papel hover:border-brasa">
              <Sparkles className="h-4 w-4" /> Pedir ao Copiloto
            </button>
          </div>
        </section>
        <div className="grid gap-4">
          <section className="rounded-3xl bg-[#e4f3ea] p-6">
            <p className="text-[15px] text-[#1b6149]">Voltou ao caixa este mês</p>
            <p className="mt-1 font-display text-[clamp(2.4rem,5vw,3.4rem)] font-extrabold leading-none text-manjericao">
              <Numero valor={pulsoResumo.recuperado} prefixo="R$ " />
            </p>
            <p className="mt-2 text-[14px] text-[#1e3a2c]">{pulsoResumo.voltaram} fregueses que tinham sumido voltaram a pedir este mês.</p>
          </section>
          <Painelzinho className="!p-5">
            <p className="text-[14px] text-areia">Ritmo da base ({total} fregueses)</p>
            <div className="mt-3 flex h-3 overflow-hidden rounded-full" role="img" aria-label={`${pulsoResumo.ritmo} no ritmo, ${pulsoResumo.atrasado} fora do ritmo, ${pulsoResumo.sumindo} sumindo`}>
              <div className="bg-manjericao" style={{ flex: pulsoResumo.ritmo }} />
              <div className="bg-mostarda" style={{ flex: pulsoResumo.atrasado }} />
              <div className="bg-tomate" style={{ flex: pulsoResumo.sumindo }} />
            </div>
            <div className="mt-3 grid grid-cols-3 text-[13px]">
              <span><b className="tabular text-[17px]">{pulsoResumo.ritmo}</b><br /><span className="text-areia">no ritmo</span></span>
              <span><b className="tabular text-[17px]">{pulsoResumo.atrasado}</b><br /><span className="text-areia">fora do ritmo</span></span>
              <span><b className="tabular text-[17px]">{pulsoResumo.sumindo}</b><br /><span className="text-areia">sumindo</span></span>
            </div>
          </Painelzinho>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Painelzinho>
          <div className="flex items-center justify-between">
            <h2 className="font-display text-[22px] font-bold">Quem merece atenção hoje</h2>
            <a href="#fregueses" className="text-[14px] text-areia hover:text-papel">Ver todos</a>
          </div>
          <ul className="mt-3 divide-y divide-linha">
            {chamarHoje.map((f) => (
              <li key={f.id} className="flex items-center gap-3 py-3">
                <AnelPulso dias={f.diasDesde} intervalo={f.intervalo} status={f.status} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{f.nome}</p>
                  <p className="truncate text-[13px] text-areia">
                    {f.favorito} · a cada {f.intervalo} dias · {brl(f.ticket)}
                  </p>
                </div>
                <span className="hidden sm:block">
                  <StatusPill status={f.status} />
                </span>
                {(() => {
                  const link = linkChamar(f, d.loja.nome);
                  return link ? (
                    <a
                      href={link}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => show(`Abrindo o WhatsApp de ${f.nome.split(" ")[0]} com o "o de sempre"`)}
                      className="flex items-center gap-1.5 rounded-full bg-papel px-3 py-2 text-[13px] font-semibold text-carvao hover:bg-mostarda"
                    >
                      <MessageCircle className="h-4 w-4" /> <span className="hidden sm:inline">Chamar</span>
                    </a>
                  ) : (
                    <span title="Sem telefone cadastrado" className="flex cursor-not-allowed items-center gap-1.5 rounded-full bg-grafite px-3 py-2 text-[13px] font-semibold text-fumo">
                      <MessageCircle className="h-4 w-4" /> <span className="hidden sm:inline">Sem telefone</span>
                    </span>
                  );
                })()}
              </li>
            ))}
          </ul>
        </Painelzinho>

        <Painelzinho>
          <h2 className="font-display text-[22px] font-bold">Semana por canal</h2>
          <p className="mt-1 text-[14px] text-areia">Loja própria: {brl(propria)}</p>
          <div className="mt-5">
            <GraficoSemana VENDAS_SEMANA={VENDAS_SEMANA} />
          </div>
          <div className="mt-5 flex gap-3 rounded-2xl bg-grafite p-4">
            <TrendingUp className="h-5 w-5 shrink-0 text-manjericao" />
            <p className="text-[14px] leading-relaxed text-areia">
              Vendendo pela loja própria você deixou de pagar <b className="text-papel">{brl(propria * COMISSAO)}</b> em comissão nesta semana (comissão de {COMISSAO * 100}%, ajustável).
            </p>
          </div>
        </Painelzinho>
      </div>
      <p className="text-center text-[13px] text-fumo">{d.modo === "demo" ? "Demonstração com dados fictícios da Brasa Burger." : "Loja de demonstração com dados fictícios, gravados no banco."}</p>
      <Toast />
    </div>
  );
}
