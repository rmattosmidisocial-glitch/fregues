import { useMemo } from "react";
import { ArrowUpRight, Bike, Map, MessageCircle, QrCode, Sparkles, Store, Check } from "lucide-react";
import { Logo } from "../components/Logo";
import { BotaoTema } from "../tema";
import { Comanda } from "../components/Comanda";
import { GeoMap, BAIRROS, nomeBairro, vizinhos, type Layer } from "../components/GeoMap";
import { Foto, FOTOS } from "../components/Foto";
import { LOJA, ZONAS, CARDAPIO, brl, chamarHoje } from "../data/mock";

const WHATS = "https://wa.me/5521967640607?text=Quero%20saber%20mais%20sobre%20o%20Fregu%C3%AAs";

function HeroMapa() {
  const { layers, fit } = useMemo(() => {
    const idsZonas = ZONAS.flatMap((z) => z.bairros);
    const fit = BAIRROS.filter((f) => idsZonas.includes(f.properties.id));
    const base: Layer = {
      id: "base",
      features: vizinhos(fit, 0.6),
      fill: () => "#241b16",
      stroke: () => "#17110e",
      strokeWidth: 0.8,
    };
    const zonas: Layer[] = ZONAS.map((z, i) => ({
      id: z.id,
      features: BAIRROS.filter((f) => z.bairros.includes(f.properties.id)),
      fill: () => z.cor,
      stroke: () => "#17110e",
      strokeWidth: 1.2,
      className: "acender",
      style: { animationDelay: `${0.35 + i * 0.45}s` },
      opacity: () => (z.id === "z3" ? 0.85 : 0.95),
    }));
    return { layers: [base, ...zonas], fit };
  }, []);
  return (
    <GeoMap
      width={620}
      height={560}
      padding={30}
      fitTo={fit}
      layers={layers}
      pins={[{ coord: LOJA.coord, kind: "loja" }]}
      className="h-full w-full"
      ariaLabel="Mapa da Zona Norte do Rio com os bairros atendidos pela Brasa Burger acesos em três zonas de entrega"
    />
  );
}

function Nav() {
  return (
    <header className="relative z-20 mx-auto flex max-w-[1240px] items-center justify-between px-5 py-5 md:px-8">
      <a href="#" aria-label="Freguês, início">
        <Logo />
      </a>
      <nav className="hidden items-center gap-8 text-[15px] text-areia md:flex">
        <a href="#como" className="hover:text-papel">Como funciona</a>
        <a href="#fundador" className="hover:text-papel">Fundadores</a>
        <a href="#painel" className="hover:text-papel">Ver o painel</a>
      </nav>
      <span className="flex items-center gap-2">
        <BotaoTema />
      <a
          href={WHATS}
          target="_blank"
          rel="noreferrer"
          className="rounded-full bg-papel px-4 py-2 text-[14px] font-semibold text-carvao transition hover:bg-mostarda"
        >
          Falar com a gente
        </a>
      </span>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto grid max-w-[1240px] items-center gap-6 px-5 pb-16 pt-6 md:grid-cols-[1.05fr_1fr] md:px-8 md:pb-24 md:pt-10">
        <div className="relative z-10">
          <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-linha px-3 py-1 text-[13px] text-areia">
            <span className="h-2 w-2 rounded-full bg-manjericao" />
            Vagas abertas para restaurantes fundadores no Rio
          </p>
          <h1
            className="font-display text-[clamp(2.9rem,7.2vw,6.1rem)] font-extrabold leading-[0.92] tracking-[-0.035em] text-papel"
            style={{ fontVariationSettings: '"wdth" 78, "opsz" 96' }}
          >
            Quem pede uma vez vira freguês.
          </h1>
          <p className="mt-6 max-w-[34rem] text-[clamp(1.05rem,1.6vw,1.25rem)] leading-relaxed text-areia">
            Loja com cardápio digital, entrega por bairro e um CRM que avisa quem está sumindo e traz de volta pelo WhatsApp. Sem comissão por pedido.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <a href="#painel" className="rounded-full bg-brasa px-6 py-3.5 text-[16px] font-semibold text-carvao transition hover:bg-mostarda">
              Ver o painel funcionando
            </a>
            <a href="#loja" className="rounded-full border border-linha px-6 py-3.5 text-[16px] font-semibold text-papel transition hover:border-areia">
              Abrir a loja de exemplo
            </a>
          </div>
        </div>
        <div className="relative h-[460px] md:h-[600px]">
          <div className="absolute inset-y-0 left-6 right-0 overflow-hidden rounded-[36px] md:left-16">
            <Foto chave="smashbacon" eager alt="Smash burger duplo com bacon" className="h-full w-full scale-[1.02]" />
            <div className="absolute inset-0 bg-gradient-to-tr from-carvao/70 via-transparent to-transparent" />
          </div>
          <div className="comanda-sai absolute -bottom-6 left-0 md:-bottom-4 md:-left-6">
            <Comanda />
          </div>
          <div className="absolute right-0 top-4 w-[230px] rounded-2xl border border-linha bg-forno/95 p-4 text-[13px] shadow-2xl backdrop-blur md:right-2 md:top-10">
            <div className="flex items-center gap-2">
              <span className="pulso h-2.5 w-2.5 rounded-full bg-tomate" />
              <span className="text-areia">Sumindo há 34 dias</span>
            </div>
            <p className="mt-1.5 font-display text-[18px] font-bold leading-tight">Carlos Menezes</p>
            <p className="text-areia">Pedia X-Bacon Duplo a cada 9 dias</p>
            <a href="#fregueses" className="mt-3 flex items-center justify-center gap-1.5 rounded-lg bg-brasa py-2 font-semibold text-carvao">
              <MessageCircle className="h-4 w-4" /> Mandar “o de sempre”
            </a>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-[1240px] px-5 md:px-8">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-2 border-t border-linha pt-5 text-[15px] text-areia">
          {["Sem comissão por pedido", "Pix na hora", "Entrega por bairro do Rio", "WhatsApp oficial", "Sem app para o cliente"].map((t) => (
            <span key={t} className="flex items-center gap-2">
              <Check className="h-4 w-4 text-brasa" /> {t}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function MiniLoja() {
  const itens = CARDAPIO.filter((p) => ["p1", "p4", "p11"].includes(p.id));
  return (
    <div className="mx-auto w-[290px] rounded-[38px] border-[10px] border-[#0c0907] bg-papel p-3 text-carvao shadow-[0_30px_80px_rgba(0,0,0,.5)]">
      <div className="rounded-2xl bg-brasa p-4 text-carvao">
        <p className="font-display text-[22px] font-extrabold leading-none">Brasa Burger</p>
        <p className="mt-1 text-[12px]">Aberto · entrega em 25–35 min</p>
      </div>
      <div className="mt-3 space-y-2">
        {itens.map((p) => (
          <div key={p.id} className="flex items-center gap-3 rounded-xl bg-white p-2">
            <Foto nome={p.nome} arte={p.arte} className="h-14 w-14 shrink-0 rounded-lg" />
            <div className="min-w-0">
              <p className="truncate text-[14px] font-semibold">{p.nome}</p>
              <p className="text-[13px] text-brasa-escura">{brl(p.preco)}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-xl bg-carvao px-4 py-3 text-center text-[14px] font-semibold text-papel">Ver sacola · {brl(84.6)}</div>
    </div>
  );
}

function Pilar({
  n,
  titulo,
  texto,
  pontos,
  visual,
  inverter,
  icone,
}: {
  n: string;
  titulo: string;
  texto: string;
  pontos: string[];
  visual: React.ReactNode;
  inverter?: boolean;
  icone: React.ReactNode;
}) {
  return (
    <div className={`grid items-center gap-10 py-16 md:grid-cols-2 md:gap-16 md:py-24 ${inverter ? "md:[&>*:first-child]:order-2" : ""}`}>
      <div>
        <div className="flex items-center gap-3 text-brasa">
          {icone}
          <span className="font-display text-[15px] font-bold">Passo {n} de 3</span>
        </div>
        <h3
          className="mt-4 font-display text-[clamp(2rem,4vw,3.3rem)] font-extrabold leading-[0.98] tracking-[-0.015em]"
          style={{ fontVariationSettings: '"wdth" 82' }}
        >
          {titulo}
        </h3>
        <p className="mt-5 max-w-[32rem] text-[18px] leading-relaxed text-areia">{texto}</p>
        <ul className="mt-6 space-y-2.5">
          {pontos.map((p) => (
            <li key={p} className="flex gap-3 text-[16px] text-papel">
              <Check className="mt-0.5 h-5 w-5 shrink-0 text-manjericao" /> {p}
            </li>
          ))}
        </ul>
      </div>
      <div>{visual}</div>
    </div>
  );
}

function MiniMapaRegras() {
  return (
    <div className="rounded-3xl border border-linha bg-forno p-5">
      <div className="-mx-2 -mt-2 mb-4 h-[300px] overflow-hidden rounded-2xl bg-[#140f0c]">
        <HeroMapa />
      </div>
      <div className="flex items-center justify-between">
        <p className="font-display text-[20px] font-bold">Mapa de atuação</p>
        <span className="rounded-full bg-grafite px-3 py-1 text-[13px] text-areia">22 bairros ativos</span>
      </div>
      <div className="mt-4 space-y-2">
        {ZONAS.map((z) => (
          <div key={z.id} className="flex items-center gap-3 rounded-xl bg-grafite p-3">
            <span className="h-9 w-9 shrink-0 rounded-lg" style={{ background: z.cor }} />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{z.nome}</p>
              <p className="truncate text-[13px] text-areia">{z.bairros.slice(0, 4).map(nomeBairro).join(", ")}…</p>
            </div>
            <div className="text-right text-[13px]">
              <p className="tabular font-semibold">{brl(z.taxa)}</p>
              <p className="text-areia">{z.tempo[0]}–{z.tempo[1]} min</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-xl border border-dashed border-mostarda/50 p-3 text-[14px] text-areia">
        <span className="font-semibold text-mostarda">31 pessoas de Bonsucesso</span> tentaram pedir este mês. Ligue o bairro e o Freguês avisa todas.
      </div>
    </div>
  );
}

function MiniCRM() {
  return (
    <div className="rounded-3xl border border-linha bg-forno p-5">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-[#fde9df] p-4">
          <p className="text-[13px] text-[#9a3412]">Em risco esta semana</p>
          <p className="tabular font-display text-[30px] font-extrabold text-brasa">R$ 4.380</p>
        </div>
        <div className="rounded-2xl bg-[#e4f3ea] p-4">
          <p className="text-[13px] text-[#1b6149]">Voltou no mês</p>
          <p className="tabular font-display text-[30px] font-extrabold text-manjericao">R$ 2.910</p>
        </div>
      </div>
      <p className="mt-5 text-[14px] text-areia">Quem chamar hoje</p>
      <div className="mt-2 divide-y divide-linha">
        {chamarHoje.slice(0, 3).map((f) => (
          <div key={f.id} className="flex items-center justify-between py-2.5">
            <div>
              <p className="font-semibold">{f.nome}</p>
              <p className="text-[13px] text-areia">{f.favorito}</p>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ${f.status === "sumindo" ? "bg-[#fbe4e0] text-[#9b3530]" : "bg-[#fcefd9] text-[#7a4600]"}`}>
              {f.status === "sumindo" ? "Sumindo" : "Fora do ritmo"} · {f.diasDesde} dias
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Landing() {
  return (
    <div className="tema-claro min-h-screen bg-carvao text-papel">
      <Nav />
      <Hero />

      <section id="como" className="mx-auto max-w-[1240px] px-5 md:px-8">
        <div className="max-w-[46rem] pt-24">
          <h2 className="font-display text-[clamp(2.2rem,5vw,4rem)] font-extrabold leading-[0.95] tracking-[-0.015em]" style={{ fontVariationSettings: '"wdth" 80' }}>
            O cliente não reclama. Ele só para de pedir.
          </h2>
          <p className="mt-5 text-[19px] leading-relaxed text-areia">
            O pedido chega pelo app, pelo WhatsApp, pelo salão. Cada canal guarda um pedaço do cliente e ninguém vê o todo. O Freguês junta tudo num lugar só e transforma cada pedido em relacionamento.
          </p>
        </div>

        <Pilar
          n="1"
          icone={<Store className="h-5 w-5" />}
          titulo="Sua loja, seu cliente, sem comissão."
          texto="Cardápio digital com a cara da casa. O cliente pede pelo link, pelo QR Code da mesa ou pelo WhatsApp e paga no Pix na hora."
          pontos={["Importa o cardápio de uma foto, com IA", "Complementos, combos e pizza meio a meio", "Pix com confirmação automática", "Pedido cai na cozinha e na impressora"]}
          visual={<MiniLoja />}
        />
        <Pilar
          n="2"
          inverter
          icone={<Map className="h-5 w-5" />}
          titulo="Entregue onde vale a pena."
          texto="Abra o mapa do Rio, clique nos bairros e defina taxa, tempo e pedido mínimo de cada um. O endereço do cliente é conferido no mapa, não no achismo."
          pontos={["Municípios e bairros oficiais já carregados", "Raio, desenho livre ou bairro inteiro", "Mostra quem tentou pedir de fora da área", "Motoboy com rota e acerto no fim do dia"]}
          visual={<MiniMapaRegras />}
        />
        <Pilar
          n="3"
          icone={<Sparkles className="h-5 w-5" />}
          titulo="Saiba quem está sumindo antes que suma."
          texto="Cada freguês tem um ritmo. Quando alguém sai dele, o painel avisa quanto dinheiro está em jogo e manda a mensagem certa no WhatsApp."
          pontos={["Receita em risco e recuperada, em reais", "Pedido “o de sempre” em um toque", "Pontos, níveis e missões sem baixar app", "Copiloto: escreva o que quer, ele faz"]}
          visual={<MiniCRM />}
        />
      </section>

      <section className="bg-brasa text-carvao">
        <div className="mx-auto max-w-[1240px] px-5 py-20 md:px-8 md:py-28">
          <p className="text-[17px] font-semibold">Copiloto Chef</p>
          <p
            className="mt-4 max-w-[60rem] font-display text-[clamp(1.9rem,4.4vw,3.8rem)] font-extrabold leading-[1.02] tracking-[-0.025em]"
            style={{ fontVariationSettings: '"wdth" 85' }}
          >
            “Manda pra quem pediu X-Bacon e sumiu: batata grátis na sexta às 19h.”
          </p>
          <div className="mt-10 grid gap-3 text-[16px] sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Público", "48 fregueses encontrados"],
              ["Mensagem", "3 versões para escolher"],
              ["Envio", "Sexta, 19h, no WhatsApp"],
              ["Previsão", "R$ 1.240 de volta"],
            ].map(([a, b]) => (
              <div key={a} className="rounded-2xl bg-carvao/90 p-4 text-papel">
                <p className="text-[13px] text-areia">{a}</p>
                <p className="mt-1 font-semibold">{b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1240px] px-5 py-24 md:px-8">
        <h2 className="font-display text-[clamp(2rem,4.4vw,3.4rem)] font-extrabold leading-[0.98] tracking-[-0.015em]" style={{ fontVariationSettings: '"wdth" 82' }}>
          Do boteco à pizzaria, já chega configurado.
        </h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["Hamburgueria", "Combos, smash e “o de sempre” de sexta à noite.", "xbacon"],
            ["Pizzaria", "Meio a meio, borda de presente, sexta e sábado no foco.", "pizza"],
            ["Bar e boteco", "Happy hour, chopp em dobro e dia de jogo.", "chopp"],
            ["Restaurante", "Executivo no almoço, marmita no dia útil.", "prato"],
            ["Japonês", "Combinados, rodízio e datas especiais.", "sushi"],
            ["Açaí e café", "Dias quentes, manhãs e lanche da tarde.", "acai"],
          ].map(([t, d, k]) => (
            <article key={t} className="group relative aspect-[4/3] overflow-hidden rounded-3xl">
              <Foto chave={k} alt={t} className="absolute inset-0 h-full w-full transition duration-500 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-carvao via-carvao/40 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5">
                <p className="font-display text-[26px] font-extrabold leading-tight">{t}</p>
                <p className="mt-1 max-w-[22rem] text-[15px] leading-relaxed text-papel/85">{d}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-linha bg-forno">
        <div className="mx-auto grid max-w-[1240px] gap-4 px-5 py-14 md:grid-cols-4 md:px-8">
          {[
            [<QrCode key="q" className="h-6 w-6" />, "Sem app para o cliente", "Link, QR Code e WhatsApp."],
            [<Bike key="b" className="h-6 w-6" />, "Entrega própria", "Seu motoboy, sua rota, seu acerto."],
            [<MessageCircle key="m" className="h-6 w-6" />, "WhatsApp oficial", "Mensagens aprovadas, número protegido."],
            [<Store key="s" className="h-6 w-6" />, "Uma ou várias lojas", "Cada pedido vai para a unidade certa."],
          ].map(([i, t, d], k) => (
            <div key={k} className="flex gap-3">
              <span className="text-mostarda">{i}</span>
              <div>
                <p className="font-semibold">{t as string}</p>
                <p className="text-[15px] text-areia">{d as string}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="fundador" className="mx-auto max-w-[1240px] px-5 py-24 md:px-8">
        <div className="grid gap-10 md:grid-cols-[1.2fr_1fr]">
          <div>
            <h2 className="font-display text-[clamp(2.2rem,5vw,4.2rem)] font-extrabold leading-[0.95] tracking-[-0.015em]" style={{ fontVariationSettings: '"wdth" 80' }}>
              Seja um restaurante fundador.
            </h2>
            <p className="mt-5 max-w-[34rem] text-[19px] leading-relaxed text-areia">
              Estamos abrindo as primeiras vagas no Rio. Quem entra agora usa antes de todo mundo, paga preço de fundador e ajuda a decidir os próximos recursos.
            </p>
            <ul className="mt-8 space-y-3 text-[17px]">
              {["Preço de fundador garantido enquanto for cliente", "Implantação feita pela equipe MMATTOS", "Cardápio, mapa de entrega e WhatsApp configurados para você", "Canal direto para pedir recursos"].map((t) => (
                <li key={t} className="flex gap-3">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-brasa" /> {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="tema-escuro rounded-3xl bg-carvao p-8 text-papel">
            <p className="font-display text-[26px] font-extrabold leading-tight">Converse com a gente</p>
            <p className="mt-2 text-[16px] text-areia">Mostramos o Freguês com o cardápio e os bairros da sua casa em 20 minutos.</p>
            <a
              href={WHATS}
              target="_blank"
              rel="noreferrer"
              className="mt-6 flex items-center justify-center gap-2 rounded-full bg-brasa py-4 text-[17px] font-bold text-carvao transition hover:bg-mostarda"
            >
              Chamar no WhatsApp <ArrowUpRight className="h-5 w-5" />
            </a>
            <div className="mt-6 space-y-1 text-[16px]">
              <p className="tabular font-semibold">(21) 96764-0607</p>
              <p className="tabular font-semibold">(21) 99496-9943</p>
              <a href="https://instagram.com/m.mattos_mkt" target="_blank" rel="noreferrer" className="block text-brasa underline-offset-4 hover:underline">
                @m.mattos_mkt
              </a>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-linha">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-3 px-5 py-8 text-[14px] text-fumo md:flex-row md:items-center md:justify-between md:px-8">
          <Logo className="opacity-80" />
          <p>Uma solução MMATTOS Assessoria de MKT. Dados da demonstração são fictícios.</p>
        </div>
      </footer>
    </div>
  );
}
