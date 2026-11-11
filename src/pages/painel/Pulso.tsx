import { CalendarDays, ChevronRight, Frown, MessageCircle, MessagesSquare, Sparkles, Star, TrendingUp } from "lucide-react";
import { crescer, quandoTxt, useCrescer } from "../../data/crescer";
import { AnelPulso, Numero, Painelzinho, StatusPill, useToast } from "../../components/ui";
import { brl, type Freguês } from "../../data/mock";
import { useDados, type DiaSemana } from "../../data/dados";

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

export function Pulso({ abrirCopiloto }: { abrirCopiloto: () => void }) {
  const { show, Toast } = useToast();
  const d = useDados();
  const VENDAS_SEMANA = d.semana;
  const pulsoResumo = d.pulso;
  const COMISSAO = Number(d.pulso.comissao ?? 0.12);
  const chamarHoje: Freguês[] = d.fregueses.filter((f) => f.status !== "ritmo").sort((a, b) => b.ticket * b.pedidos - a.ticket * a.pedidos).slice(0, 6);
  const propria = VENDAS_SEMANA.reduce((s, x) => s + x.propria, 0);
  const total = pulsoResumo.total;
  const novos = d.pedidos.filter((p) => p.status === "novo").length;
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
          <p className="relative text-[15px] text-[#9a3412]">Em risco nos próximos 7 dias</p>
          <p className="relative mt-1 font-display text-[clamp(3rem,7vw,5.2rem)] font-extrabold leading-none tracking-[-0.015em] text-brasa">
            <Numero valor={pulsoResumo.risco} prefixo="R$ " />
          </p>
          <p className="relative mt-3 max-w-[30rem] text-[15px] text-[#8e2f2a]">
            {pulsoResumo.atrasado + pulsoResumo.sumindo} fregueses saíram do ritmo de pedidos. Esse é o valor que eles costumam gastar por semana.
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
                <button
                  onClick={() => show(`“O de sempre” enviado para ${f.nome.split(" ")[0]}`)}
                  className="flex items-center gap-1.5 rounded-full bg-papel px-3 py-2 text-[13px] font-semibold text-carvao hover:bg-mostarda"
                >
                  <MessageCircle className="h-4 w-4" /> <span className="hidden sm:inline">Chamar</span>
                </button>
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
