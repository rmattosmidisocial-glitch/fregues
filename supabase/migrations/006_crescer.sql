-- 006 · Módulos de crescimento: automações, atendimento com IA, formulários e links da bio.

-- ---------- Automações ----------
create table public.automations (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  nome text not null,
  descricao text,
  estado text not null default 'rascunho' check (estado in ('ativa','pausada','rascunho')),
  gatilho text not null check (gatilho in ('pedido_entregue','cliente_sumindo','aniversario','bairro_novo','primeiro_pedido','mudou_nivel','resposta_formulario')),
  passos jsonb not null default '[]'::jsonb,   -- [{tipo, titulo, detalhe, texto?, horas?}]
  criado_em timestamptz not null default now(),
  editado_em timestamptz not null default now()
);
create index on public.automations (store_id, estado);

create table public.automation_runs (
  id uuid primary key default gen_random_uuid(),
  automation_id uuid not null references public.automations(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  passo_atual int not null default 0,
  proximo_em timestamptz not null default now(),          -- quando o próximo passo roda (esperas)
  resultado text not null default 'rodando' check (resultado in ('rodando','enviado','convertido','parou','teste','erro')),
  nota text,
  pedido_id uuid references public.orders(id) on delete set null,
  valor numeric(10,2),
  criado_em timestamptz not null default now()
);
create index on public.automation_runs (automation_id, criado_em desc);
create index on public.automation_runs (resultado, proximo_em) where resultado = 'rodando';

-- ---------- Atendimento ----------
create table public.ai_settings (
  store_id uuid primary key references public.stores(id) on delete cascade,
  nome_atendente text not null default 'Bia',
  tom text not null default 'amigavel' check (tom in ('amigavel','direto')),
  emojis boolean not null default true,
  recomendar boolean not null default true,
  passar_reclamacao boolean not null default true
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  token uuid not null default gen_random_uuid() unique,  -- chave do visitante anônimo da loja
  customer_id uuid references public.customers(id) on delete set null,
  cliente_nome text not null default 'Visitante da loja',
  canal text not null default 'Loja' check (canal in ('Loja','WhatsApp','Instagram')),
  titulo text not null default 'Nova conversa',
  humor text not null default 'neutro' check (humor in ('positivo','neutro','negativo')),
  status text not null default 'ia' check (status in ('ia','equipe','fechada')),
  nao_lida boolean not null default true,
  bairro_id text references public.geo_bairros(id),
  resumo text,
  pedido_id uuid references public.orders(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index on public.conversations (store_id, atualizado_em desc);

create table public.messages (
  id bigint generated always as identity primary key,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  autor text not null check (autor in ('cliente','ia','equipe','sistema')),
  texto text not null check (length(texto) between 1 and 2000),
  criado_em timestamptz not null default now()
);
create index on public.messages (conversation_id, id);

-- ---------- Formulários ----------
create table public.forms (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  nome text not null,
  descricao text,
  estado text not null default 'rascunho' check (estado in ('no ar','pausado','rascunho')),
  campos jsonb not null default '[]'::jsonb,   -- [{id, rotulo, tipo, opcoes?, obrigatorio?}]
  obrigado text not null default 'Obrigado! Recebemos sua resposta.',
  cor text not null default '#ff5b1f',
  criado_em timestamptz not null default now()
);

create table public.form_responses (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.forms(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  valores jsonb not null,
  criado_em timestamptz not null default now()
);
create index on public.form_responses (form_id, criado_em desc);

-- ---------- Links da bio ----------
create table public.link_pages (
  store_id uuid primary key references public.stores(id) on delete cascade,
  endereco text not null unique check (endereco ~ '^[a-z0-9-]{3,40}$'),
  titulo text not null,
  bio text,
  tema text not null default 'brasa' check (tema in ('brasa','noite','papel')),
  botoes jsonb not null default '[]'::jsonb    -- [{id, tipo, rotulo, url, ativo, destaque}]
);

create table public.link_clicks (
  id bigint generated always as identity primary key,
  store_id uuid not null references public.stores(id) on delete cascade,
  botao_id text,                                   -- null = visita à página
  criado_em timestamptz not null default now()
);
create index on public.link_clicks (store_id, criado_em desc);

-- ---------- Segurança ----------
alter table public.automations enable row level security;
alter table public.automation_runs enable row level security;
alter table public.ai_settings enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.forms enable row level security;
alter table public.form_responses enable row level security;
alter table public.link_pages enable row level security;
alter table public.link_clicks enable row level security;

-- Dono e equipe fazem tudo na própria loja
create policy auto_membro on public.automations for all to authenticated using (public.is_member(public.store_org(store_id))) with check (public.is_member(public.store_org(store_id)));
create policy run_membro on public.automation_runs for select to authenticated using (exists (select 1 from public.automations a where a.id = automation_id and public.is_member(public.store_org(a.store_id))));
create policy ia_membro on public.ai_settings for all to authenticated using (public.is_member(public.store_org(store_id))) with check (public.is_member(public.store_org(store_id)));
create policy conv_membro on public.conversations for all to authenticated using (public.is_member(public.store_org(store_id))) with check (public.is_member(public.store_org(store_id)));
create policy msg_membro_ler on public.messages for select to authenticated using (exists (select 1 from public.conversations c where c.id = conversation_id and public.is_member(public.store_org(c.store_id))));
create policy msg_membro_escrever on public.messages for insert to authenticated with check (autor = 'equipe' and exists (select 1 from public.conversations c where c.id = conversation_id and public.is_member(public.store_org(c.store_id))));
create policy form_membro on public.forms for all to authenticated using (public.is_member(public.store_org(store_id))) with check (public.is_member(public.store_org(store_id)));
create policy resp_membro on public.form_responses for select to authenticated using (exists (select 1 from public.forms f where f.id = form_id and public.is_member(public.store_org(f.store_id))));
create policy links_membro on public.link_pages for all to authenticated using (public.is_member(public.store_org(store_id))) with check (public.is_member(public.store_org(store_id)));
create policy cliques_membro on public.link_clicks for select to authenticated using (public.is_member(public.store_org(store_id)));

-- Público lê só o que está no ar
create policy form_publico on public.forms for select to anon, authenticated using (estado = 'no ar' and public.store_visivel(store_id));
create policy links_publico on public.link_pages for select to anon, authenticated using (public.store_visivel(store_id));

grant select, insert, update, delete on public.automations, public.ai_settings, public.conversations, public.forms, public.link_pages to authenticated;
grant select on public.automation_runs, public.form_responses, public.link_clicks to authenticated;
grant select, insert on public.messages to authenticated;
grant select on public.forms, public.link_pages to anon;

-- ---------- Funções públicas (visitante sem login) ----------

-- Resposta de formulário: valida obrigatórios e liga ao cliente pelo WhatsApp, se informado.
create or replace function public.responder_formulario(p_form uuid, p_valores jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  f public.forms;
  c jsonb;
  v_cliente uuid;
  v_tel text;
  v_id uuid;
begin
  select * into f from public.forms where id = p_form and estado = 'no ar';
  if not found or not public.store_visivel(f.store_id) then raise exception 'Formulário indisponível'; end if;
  if jsonb_typeof(p_valores) <> 'object' or length(p_valores::text) > 8000 then raise exception 'Resposta inválida'; end if;
  for c in select * from jsonb_array_elements(f.campos) loop
    if coalesce((c->>'obrigatorio')::boolean, false) and coalesce(p_valores->>(c->>'id'), '') = '' then
      raise exception 'Falta responder: %', c->>'rotulo';
    end if;
    if c->>'tipo' = 'telefone' then v_tel := public.so_digitos(p_valores->>(c->>'id')); end if;
  end loop;
  if v_tel is not null and length(v_tel) >= 10 then
    select id into v_cliente from public.customers where org_id = public.store_org(f.store_id) and public.so_digitos(telefone) = v_tel limit 1;
  end if;
  insert into public.form_responses (form_id, customer_id, valores) values (f.id, v_cliente, p_valores) returning id into v_id;
  return v_id;
end $$;

-- Chat da loja: o visitante manda mensagem com o token da conversa (null na primeira vez).
-- A resposta da IA é gravada por uma Edge Function (chave de serviço), que lê a conversa e o cardápio.
create or replace function public.chat_enviar(p_slug text, p_token uuid, p_texto text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  s public.stores;
  conv public.conversations;
begin
  select * into s from public.stores where slug = p_slug and publicada;
  if not found then raise exception 'Loja não encontrada'; end if;
  if p_texto is null or length(trim(p_texto)) = 0 or length(p_texto) > 1000 then raise exception 'Mensagem inválida'; end if;
  if p_token is not null then
    select * into conv from public.conversations where token = p_token and store_id = s.id;
  end if;
  if conv.id is null then
    -- limite simples contra abuso: no máximo 30 conversas novas por minuto por loja
    if (select count(*) from public.conversations where store_id = s.id and criado_em > now() - interval '1 minute') >= 30 then
      raise exception 'Muitas conversas agora, tente em instantes';
    end if;
    insert into public.conversations (store_id) values (s.id) returning * into conv;
  elsif (select count(*) from public.messages where conversation_id = conv.id and criado_em > now() - interval '1 minute') >= 20 then
    raise exception 'Calma, muitas mensagens seguidas';
  end if;
  insert into public.messages (conversation_id, autor, texto) values (conv.id, 'cliente', trim(p_texto));
  update public.conversations set nao_lida = true, atualizado_em = now(), status = case when status = 'fechada' then 'ia' else status end where id = conv.id;
  return jsonb_build_object('token', conv.token, 'status', (select status from public.conversations where id = conv.id));
end $$;

-- Visitante lê a própria conversa (só com o token).
create or replace function public.chat_ler(p_token uuid)
returns table (autor text, texto text, criado_em timestamptz) language sql stable security definer set search_path = public as $$
  select m.autor, m.texto, m.criado_em from public.messages m
  join public.conversations c on c.id = m.conversation_id
  where c.token = p_token order by m.id;
$$;

-- Contagem de toques na página de links. botao null = visita.
create or replace function public.registrar_clique(p_endereco text, p_botao text)
returns void language plpgsql security definer set search_path = public as $$
declare v_store uuid;
begin
  select store_id into v_store from public.link_pages where endereco = p_endereco;
  if v_store is null then return; end if;
  if p_botao is not null and not exists (select 1 from public.link_pages lp, jsonb_array_elements(lp.botoes) b where lp.store_id = v_store and b->>'id' = p_botao) then return; end if;
  insert into public.link_clicks (store_id, botao_id) values (v_store, p_botao);
end $$;

-- Painel: resumo da página de links nos últimos 30 dias
create or replace function public.links_resumo(p_store uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select case when public.is_member(public.store_org(p_store)) then jsonb_build_object(
    'visitas', (select count(*) from public.link_clicks where store_id = p_store and botao_id is null and criado_em > now() - interval '30 days'),
    'toques', (select count(*) from public.link_clicks where store_id = p_store and botao_id is not null and criado_em > now() - interval '30 days'),
    'por_botao', (select coalesce(jsonb_object_agg(botao_id, n), '{}'::jsonb) from (select botao_id, count(*) n from public.link_clicks where store_id = p_store and botao_id is not null and criado_em > now() - interval '30 days' group by botao_id) x),
    'por_dia', (select coalesce(jsonb_agg(n order by d), '[]'::jsonb) from (select date_trunc('day', g) d, (select count(*) from public.link_clicks where store_id = p_store and botao_id is not null and date_trunc('day', criado_em) = date_trunc('day', g)) n from generate_series(now() - interval '29 days', now(), interval '1 day') g) y)
  ) end;
$$;

revoke execute on function public.responder_formulario(uuid, jsonb), public.chat_enviar(text, uuid, text), public.chat_ler(uuid), public.registrar_clique(text, text), public.links_resumo(uuid) from public;
grant execute on function public.responder_formulario(uuid, jsonb), public.chat_enviar(text, uuid, text), public.chat_ler(uuid), public.registrar_clique(text, text) to anon, authenticated;
grant execute on function public.links_resumo(uuid) to authenticated;

-- Tempo real: novas mensagens e conversas aparecem no painel na hora
do $$ begin
  alter publication supabase_realtime add table public.messages, public.conversations;
exception when undefined_object then null; end $$;

-- ---------- Dados da loja de demonstração ----------
create or replace function public.seed_crescer(p_slug text default 'brasa-burger')
returns void language plpgsql security definer set search_path = public as $$
declare v_store uuid;
begin
  select id into v_store from public.stores where slug = p_slug;
  if v_store is null then raise exception 'Loja % não existe', p_slug; end if;
  delete from public.automations where store_id = v_store;
  delete from public.forms where store_id = v_store;
  delete from public.link_pages where store_id = v_store;
  insert into public.ai_settings (store_id) values (v_store) on conflict do nothing;
  insert into public.automations (store_id, nome, descricao, estado, gatilho, passos) values
    (v_store, 'Pedir avaliação depois da entrega', '1 hora depois da entrega, pergunta como estava.', 'ativa', 'pedido_entregue',
     '[{"tipo":"espera","titulo":"Esperar 1 hora","horas":1},{"tipo":"whatsapp","titulo":"Perguntar como estava","texto":"Oi, {nome}! Seu {pedido} chegou bem? Dá uma nota: {link_pesquisa}"},{"tipo":"filtro","titulo":"Nota 3 ou menos?"},{"tipo":"alerta","titulo":"Avisar o dono"},{"tipo":"cupom","titulo":"Cupom de desculpas","texto":"{nome}, sentimos muito. 15% no próximo pedido: {cupom}"}]'),
    (v_store, 'Resgatar quem está sumindo', 'Manda o pedido de sempre pronto no carrinho.', 'ativa', 'cliente_sumindo',
     '[{"tipo":"filtro","titulo":"Aceita receber ofertas?"},{"tipo":"espera","titulo":"Esperar o melhor horário","horas":0},{"tipo":"whatsapp","titulo":"Mandar o de sempre","texto":"Fala, {nome}! Separamos seu {favorito} com 10% até amanhã: {link_o_de_sempre}"}]'),
    (v_store, 'Presente de aniversário', '3 dias antes do aniversário, oferece um mimo.', 'ativa', 'aniversario',
     '[{"tipo":"whatsapp","titulo":"Mandar o presente","texto":"{nome}, a batata é por nossa conta na semana do seu dia: {cupom}"}]'),
    (v_store, 'Avisar quem estava fora da área', 'Quando um bairro entra no mapa, avisa quem tentou pedir de lá.', 'pausada', 'bairro_novo',
     '[{"tipo":"whatsapp","titulo":"Avisar com frete grátis","texto":"Agora a gente entrega em {bairro}! Primeiro pedido sem taxa: {link_loja}"}]');
  insert into public.forms (store_id, nome, descricao, estado, cor, obrigado, campos) values
    (v_store, 'Como estava seu pedido?', 'Enviada 1h depois da entrega.', 'no ar', '#ff5b1f', 'Valeu demais! Sua opinião vai direto para a cozinha.',
     '[{"id":"comida","rotulo":"Como estava a comida?","tipo":"estrelas","obrigatorio":true},{"id":"entrega","rotulo":"E a entrega?","tipo":"estrelas","obrigatorio":true},{"id":"nps","rotulo":"De 0 a 10, quanto você indicaria a Brasa para um amigo?","tipo":"nps","obrigatorio":true},{"id":"comentario","rotulo":"Quer contar mais alguma coisa?","tipo":"texto"}]'),
    (v_store, 'Reserva de mesa', 'A equipe confirma pelo WhatsApp.', 'no ar', '#ffc03a', 'Pedido de reserva recebido!',
     '[{"id":"nome","rotulo":"Seu nome","tipo":"nome","obrigatorio":true},{"id":"tel","rotulo":"WhatsApp","tipo":"telefone","obrigatorio":true},{"id":"data","rotulo":"Dia","tipo":"data","obrigatorio":true},{"id":"hora","rotulo":"Horário","tipo":"hora","obrigatorio":true},{"id":"pessoas","rotulo":"Quantas pessoas?","tipo":"numero","obrigatorio":true}]'),
    (v_store, 'Clube Brasa', 'Cadastro no cashback.', 'no ar', '#49c27e', 'Bem-vindo ao Clube Brasa!',
     '[{"id":"nome","rotulo":"Seu nome","tipo":"nome","obrigatorio":true},{"id":"tel","rotulo":"WhatsApp","tipo":"telefone","obrigatorio":true},{"id":"aniv","rotulo":"Data de aniversário","tipo":"data"}]');
  insert into public.link_pages (store_id, endereco, titulo, bio, botoes) values
    (v_store, 'brasaburger', 'Brasa Burger', 'Smash na brasa na Vila da Penha. Entrega até 60 min.',
     '[{"id":"b1","tipo":"pedir","rotulo":"Fazer pedido com 5% de volta","url":"/loja","ativo":true,"destaque":true},{"id":"b2","tipo":"cardapio","rotulo":"Ver o cardápio","url":"/loja","ativo":true},{"id":"b3","tipo":"whatsapp","rotulo":"Falar no WhatsApp","url":"https://wa.me/","ativo":true},{"id":"b4","tipo":"reserva","rotulo":"Reservar mesa","url":"/f/reserva","ativo":true}]');
end $$;
revoke execute on function public.seed_crescer(text) from public, anon, authenticated;
