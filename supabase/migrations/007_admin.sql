-- 007 · Administração da plataforma: você (dono do Freguês) controla todos os restaurantes clientes.

create table public.platform_admins (
  user_id uuid primary key,
  criado_em timestamptz not null default now()
);
alter table public.platform_admins enable row level security;
-- ninguém lê ou escreve direto; só pelas funções abaixo

create or replace function public.is_platform_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.platform_admins where user_id = auth.uid());
$$;

create table public.plans (
  id text primary key,
  nome text not null,
  preco numeric(10,2) not null check (preco >= 0),
  descricao text,
  recursos jsonb not null default '[]'::jsonb,
  ordem int not null default 0
);
alter table public.plans enable row level security;
create policy planos_ler on public.plans for select to anon, authenticated using (true);
grant select on public.plans to anon, authenticated;

insert into public.plans (id, nome, preco, descricao, recursos, ordem) values
  ('essencial', 'Essencial', 149, 'Loja própria e CRM para começar.', '["Loja e cardápio digital","Mapa de atuação","Fregueses e Pulso","1 usuário"]', 1),
  ('completo', 'Completo', 249, 'Tudo para vender mais sem marketplace.', '["Tudo do Essencial","Atendimento com IA","Automações","Formulários e links da bio","5 usuários"]', 2),
  ('rede', 'Rede', 499, 'Para quem tem mais de uma loja.', '["Tudo do Completo","Até 5 lojas","Usuários ilimitados","Suporte prioritário"]', 3)
on conflict (id) do nothing;

create table public.subscriptions (
  org_id uuid primary key references public.organizations(id) on delete cascade,
  plan_id text not null references public.plans(id),
  status text not null default 'teste' check (status in ('teste','ativa','atrasada','suspensa','cancelada')),
  valor numeric(10,2) not null,
  dia_vencimento int not null default 10 check (dia_vencimento between 1 and 28),
  teste_ate date,
  proximo_vencimento date,
  responsavel text,
  telefone text,
  email text,
  observacao text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
alter table public.subscriptions enable row level security;

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  competencia date not null,
  vencimento date not null,
  valor numeric(10,2) not null,
  status text not null default 'aberta' check (status in ('aberta','paga','atrasada','cancelada')),
  pago_em timestamptz,
  forma text,
  unique (org_id, competencia)
);
alter table public.invoices enable row level security;

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role text not null default 'dono',
  aceito_em timestamptz,
  criado_em timestamptz not null default now(),
  unique (org_id, email)
);
alter table public.invites enable row level security;

create table public.admin_audit (
  id bigint generated always as identity primary key,
  admin_id uuid,
  org_id uuid,
  acao text not null,
  detalhe jsonb,
  criado_em timestamptz not null default now()
);
alter table public.admin_audit enable row level security;

-- O dono do restaurante vê a própria assinatura e as faturas
create policy assin_membro on public.subscriptions for select to authenticated using (public.is_member(org_id));
create policy fat_membro on public.invoices for select to authenticated using (public.is_member(org_id));
grant select on public.subscriptions, public.invoices to authenticated;

create or replace function public.exigir_admin() returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_platform_admin() then raise exception 'Acesso só para administradores do Freguês'; end if;
end $$;

create or replace function public.registrar_auditoria(p_org uuid, p_acao text, p_detalhe jsonb)
returns void language sql security definer set search_path = public as $$
  insert into public.admin_audit (admin_id, org_id, acao, detalhe) values (auth.uid(), p_org, p_acao, p_detalhe);
$$;

-- ---------- Visão geral ----------
create or replace function public.admin_visao_geral() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare r jsonb;
begin
  perform public.exigir_admin();
  select jsonb_build_object(
    'mrr', coalesce((select sum(valor) from public.subscriptions where status in ('ativa','atrasada')), 0),
    'clientes_ativos', (select count(*) from public.subscriptions where status = 'ativa'),
    'em_teste', (select count(*) from public.subscriptions where status = 'teste'),
    'atrasados', (select count(*) from public.subscriptions where status = 'atrasada'),
    'suspensos', (select count(*) from public.subscriptions where status = 'suspensa'),
    'cancelados_30d', (select count(*) from public.subscriptions where status = 'cancelada' and atualizado_em > now() - interval '30 days'),
    'a_receber', coalesce((select sum(valor) from public.invoices where status in ('aberta','atrasada')), 0),
    'recebido_mes', coalesce((select sum(valor) from public.invoices where status = 'paga' and pago_em >= date_trunc('month', now())), 0),
    'pedidos_30d', (select count(*) from public.orders where created_at > now() - interval '30 days' and status <> 'cancelado'),
    'vendas_30d', coalesce((select sum(total) from public.orders where created_at > now() - interval '30 days' and status <> 'cancelado'), 0),
    'fregueses', (select count(*) from public.customers)
  ) into r;
  return r;
end $$;

-- ---------- Lista de clientes com uso ----------
create or replace function public.admin_clientes()
returns table (
  org_id uuid, empresa text, loja text, slug text, bairro text, publicada boolean,
  plano text, status text, valor numeric, proximo_vencimento date, teste_ate date,
  responsavel text, telefone text, email text, observacao text, criado_em timestamptz,
  pedidos_30d bigint, vendas_30d numeric, fregueses bigint, ultimo_pedido timestamptz, usuarios bigint, convites_pendentes bigint
) language plpgsql stable security definer set search_path = public as $$
begin
  perform public.exigir_admin();
  return query
  select o.id, o.nome, s.nome, s.slug, s.bairro, s.publicada,
         sub.plan_id, coalesce(sub.status, 'teste'), sub.valor, sub.proximo_vencimento, sub.teste_ate,
         sub.responsavel, sub.telefone, sub.email, sub.observacao, o.created_at,
         (select count(*) from public.orders x where x.store_id = s.id and x.created_at > now() - interval '30 days' and x.status <> 'cancelado'),
         coalesce((select sum(x.total) from public.orders x where x.store_id = s.id and x.created_at > now() - interval '30 days' and x.status <> 'cancelado'), 0),
         (select count(*) from public.customers c where c.org_id = o.id),
         (select max(x.created_at) from public.orders x where x.store_id = s.id),
         (select count(*) from public.memberships m where m.org_id = o.id),
         (select count(*) from public.invites i where i.org_id = o.id and i.aceito_em is null)
  from public.organizations o
  left join lateral (select * from public.stores st where st.org_id = o.id order by st.created_at limit 1) s on true
  left join public.subscriptions sub on sub.org_id = o.id
  order by o.created_at desc;
end $$;

create or replace function public.admin_faturas(p_org uuid default null)
returns setof public.invoices language plpgsql stable security definer set search_path = public as $$
begin
  perform public.exigir_admin();
  return query select * from public.invoices where (p_org is null or org_id = p_org) order by vencimento desc limit 500;
end $$;

-- ---------- Novo cliente ----------
create or replace function public.admin_criar_cliente(
  p_empresa text, p_loja text, p_slug text, p_bairro text, p_plano text,
  p_responsavel text, p_telefone text, p_email text, p_dias_teste int default 14
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_org uuid; v_valor numeric;
begin
  perform public.exigir_admin();
  if p_slug !~ '^[a-z0-9-]{3,60}$' then raise exception 'Endereço inválido: use letras minúsculas, números e hífen'; end if;
  if exists (select 1 from public.stores where slug = p_slug) then raise exception 'Esse endereço já está em uso'; end if;
  select preco into v_valor from public.plans where id = p_plano;
  if v_valor is null then raise exception 'Plano não existe'; end if;
  insert into public.organizations (nome) values (p_empresa) returning id into v_org;
  insert into public.stores (org_id, slug, nome, bairro, publicada) values (v_org, p_slug, p_loja, p_bairro, false);
  insert into public.subscriptions (org_id, plan_id, status, valor, teste_ate, proximo_vencimento, responsavel, telefone, email)
  values (v_org, p_plano, case when p_dias_teste > 0 then 'teste' else 'ativa' end, v_valor,
          case when p_dias_teste > 0 then current_date + p_dias_teste end,
          current_date + greatest(p_dias_teste, 0) + 0, p_responsavel, p_telefone, lower(p_email));
  if coalesce(p_email, '') <> '' then
    insert into public.invites (org_id, email) values (v_org, lower(trim(p_email)));
  end if;
  perform public.registrar_auditoria(v_org, 'criou cliente', jsonb_build_object('plano', p_plano, 'slug', p_slug));
  return v_org;
end $$;

-- ---------- Ações sobre um cliente ----------
create or replace function public.admin_mudar_status(p_org uuid, p_status text, p_motivo text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.exigir_admin();
  if p_status not in ('teste','ativa','atrasada','suspensa','cancelada') then raise exception 'Status inválido'; end if;
  update public.subscriptions set status = p_status, atualizado_em = now(),
    observacao = coalesce(nullif(p_motivo, ''), observacao) where org_id = p_org;
  -- suspenso ou cancelado: a loja sai do ar; reativado: volta
  update public.stores set publicada = (p_status in ('teste','ativa','atrasada')) where org_id = p_org;
  perform public.registrar_auditoria(p_org, 'mudou status para ' || p_status, jsonb_build_object('motivo', p_motivo));
end $$;

create or replace function public.admin_mudar_plano(p_org uuid, p_plano text, p_valor numeric default null)
returns void language plpgsql security definer set search_path = public as $$
declare v numeric;
begin
  perform public.exigir_admin();
  select coalesce(p_valor, preco) into v from public.plans where id = p_plano;
  if v is null then raise exception 'Plano não existe'; end if;
  update public.subscriptions set plan_id = p_plano, valor = v, atualizado_em = now() where org_id = p_org;
  perform public.registrar_auditoria(p_org, 'mudou plano para ' || p_plano, jsonb_build_object('valor', v));
end $$;

create or replace function public.admin_gerar_fatura(p_org uuid, p_competencia date default date_trunc('month', current_date)::date)
returns uuid language plpgsql security definer set search_path = public as $$
declare s public.subscriptions; v_id uuid;
begin
  perform public.exigir_admin();
  select * into s from public.subscriptions where org_id = p_org;
  if s.org_id is null then raise exception 'Cliente sem assinatura'; end if;
  insert into public.invoices (org_id, competencia, vencimento, valor)
  values (p_org, p_competencia, make_date(extract(year from p_competencia)::int, extract(month from p_competencia)::int, s.dia_vencimento), s.valor)
  on conflict (org_id, competencia) do nothing returning id into v_id;
  return v_id;
end $$;

create or replace function public.admin_registrar_pagamento(p_fatura uuid, p_forma text default 'Pix')
returns void language plpgsql security definer set search_path = public as $$
declare f public.invoices;
begin
  perform public.exigir_admin();
  update public.invoices set status = 'paga', pago_em = now(), forma = p_forma where id = p_fatura returning * into f;
  if f.id is null then raise exception 'Fatura não encontrada'; end if;
  update public.subscriptions set status = 'ativa', proximo_vencimento = (f.vencimento + interval '1 month')::date, atualizado_em = now()
  where org_id = f.org_id and status in ('teste','atrasada','ativa','suspensa');
  update public.stores set publicada = true where org_id = f.org_id;
  perform public.registrar_auditoria(f.org_id, 'registrou pagamento', jsonb_build_object('valor', f.valor, 'forma', p_forma));
end $$;

create or replace function public.admin_auditoria(p_org uuid default null)
returns setof public.admin_audit language plpgsql stable security definer set search_path = public as $$
begin
  perform public.exigir_admin();
  return query select * from public.admin_audit where p_org is null or org_id = p_org order by id desc limit 200;
end $$;

-- Rotina diária: fatura aberta vencida há mais de 3 dias vira atrasada; mais de 15 dias, a loja é suspensa.
create or replace function public.rotina_cobranca() returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.invoices set status = 'atrasada' where status = 'aberta' and vencimento < current_date - 3;
  update public.subscriptions s set status = 'atrasada', atualizado_em = now()
   where status = 'ativa' and exists (select 1 from public.invoices i where i.org_id = s.org_id and i.status = 'atrasada');
  update public.subscriptions s set status = 'suspensa', atualizado_em = now()
   where status = 'atrasada' and exists (select 1 from public.invoices i where i.org_id = s.org_id and i.status = 'atrasada' and i.vencimento < current_date - 15);
  update public.stores st set publicada = false where exists (select 1 from public.subscriptions s where s.org_id = st.org_id and s.status in ('suspensa','cancelada'));
  -- teste vencido sem pagamento vira atrasada
  update public.subscriptions set status = 'atrasada', atualizado_em = now() where status = 'teste' and teste_ate < current_date;
end $$;

do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('fregues-cobranca', '0 9 * * *', 'select public.rotina_cobranca()');
  end if;
end $$;

-- O dono do restaurante, ao entrar, aceita convites pendentes do e-mail dele
create or replace function public.aceitar_convites() returns int
language plpgsql security definer set search_path = public, auth as $$
declare v_email text; n int := 0;
begin
  select email into v_email from auth.users where id = auth.uid();
  if v_email is null then return 0; end if;
  insert into public.memberships (org_id, user_id, role)
  select i.org_id, auth.uid(), i.role from public.invites i where lower(i.email) = lower(v_email) and i.aceito_em is null
  on conflict do nothing;
  get diagnostics n = row_count;
  update public.invites set aceito_em = now() where lower(email) = lower(v_email) and aceito_em is null;
  return n;
end $$;

-- O restaurante vê a própria situação (aviso de mensalidade no painel)
create or replace function public.minha_assinatura() returns jsonb
language sql stable security definer set search_path = public as $$
  select to_jsonb(x) from (
    select s.status, s.plan_id as plano, p.nome as plano_nome, s.valor, s.teste_ate, s.proximo_vencimento,
           (select count(*) from public.invoices i where i.org_id = s.org_id and i.status in ('aberta','atrasada')) as faturas_abertas
    from public.subscriptions s join public.plans p on p.id = s.plan_id
    where public.is_member(s.org_id) limit 1
  ) x;
$$;

revoke execute on function public.is_platform_admin(), public.exigir_admin(), public.registrar_auditoria(uuid, text, jsonb),
  public.admin_visao_geral(), public.admin_clientes(), public.admin_faturas(uuid),
  public.admin_criar_cliente(text, text, text, text, text, text, text, text, int), public.admin_mudar_status(uuid, text, text),
  public.admin_mudar_plano(uuid, text, numeric), public.admin_gerar_fatura(uuid, date), public.admin_registrar_pagamento(uuid, text),
  public.admin_auditoria(uuid), public.rotina_cobranca(), public.aceitar_convites(), public.minha_assinatura() from public, anon;
grant execute on function public.is_platform_admin(), public.admin_visao_geral(), public.admin_clientes(), public.admin_faturas(uuid),
  public.admin_criar_cliente(text, text, text, text, text, text, text, text, int), public.admin_mudar_status(uuid, text, text),
  public.admin_mudar_plano(uuid, text, numeric), public.admin_gerar_fatura(uuid, date), public.admin_registrar_pagamento(uuid, text),
  public.admin_auditoria(uuid), public.aceitar_convites(), public.minha_assinatura() to authenticated;
revoke execute on function public.registrar_auditoria(uuid, text, jsonb), public.rotina_cobranca(), public.exigir_admin() from authenticated;

-- Tornar alguém administrador (rode no SQL Editor com o e-mail do dono do Freguês, depois que ele criar a conta):
create or replace function public.tornar_admin(p_email text) returns text
language plpgsql security definer set search_path = public, auth as $$
declare v uuid;
begin
  select id into v from auth.users where lower(email) = lower(p_email);
  if v is null then return 'Ninguém com esse e-mail criou conta ainda'; end if;
  insert into public.platform_admins (user_id) values (v) on conflict do nothing;
  return 'Agora ' || p_email || ' é administrador do Freguês';
end $$;
revoke execute on function public.tornar_admin(text) from public, anon, authenticated;

-- A loja de demonstração ganha uma assinatura
insert into public.subscriptions (org_id, plan_id, status, valor, proximo_vencimento, responsavel, email)
select s.org_id, 'completo', 'ativa', 249, (date_trunc('month', current_date) + interval '1 month + 9 days')::date, 'Demonstração', 'demo@fregues.app'
from public.stores s where s.slug = 'brasa-burger'
on conflict (org_id) do nothing;
