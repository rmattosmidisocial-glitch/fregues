-- 045 · Bloco do Admin: planos editáveis, regras de cobrança, modelos de mensagem,
-- outros administradores, relatórios da carteira e extras da ficha do cliente.

-- ---------- 19. Planos e preços ----------
alter table public.plans add column if not exists ativo boolean not null default true;

create or replace function public.admin_plano_salvar(p_id text, p_nome text, p_preco numeric, p_descricao text, p_recursos jsonb, p_ordem int, p_ativo boolean)
returns text language plpgsql security definer set search_path = public as $$
declare v_id text := lower(trim(coalesce(p_id, '')));
begin
  perform public.exigir_admin();
  if v_id !~ '^[a-z0-9-]{2,30}$' then raise exception 'Código do plano inválido: use letras minúsculas, números e hífen'; end if;
  if coalesce(trim(p_nome), '') = '' then raise exception 'Dê um nome ao plano'; end if;
  if p_preco is null or p_preco < 0 then raise exception 'Preço inválido'; end if;
  if jsonb_typeof(coalesce(p_recursos, '[]'::jsonb)) <> 'array' then raise exception 'Lista de recursos inválida'; end if;
  insert into public.plans (id, nome, preco, descricao, recursos, ordem, ativo)
  values (v_id, trim(p_nome), round(p_preco, 2), nullif(trim(p_descricao), ''), coalesce(p_recursos, '[]'::jsonb), coalesce(p_ordem, 0), coalesce(p_ativo, true))
  on conflict (id) do update set nome = excluded.nome, preco = excluded.preco, descricao = excluded.descricao,
    recursos = excluded.recursos, ordem = excluded.ordem, ativo = excluded.ativo;
  perform public.registrar_auditoria(null, 'salvou o plano ' || trim(p_nome), jsonb_build_object('id', v_id, 'preco', p_preco, 'ativo', p_ativo));
  return v_id;
end $$;

create or replace function public.admin_plano_excluir(p_id text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.exigir_admin();
  if exists (select 1 from public.subscriptions where plan_id = p_id) then
    raise exception 'Esse plano tem clientes. Desative em vez de excluir: ele some para novos clientes e os atuais continuam.';
  end if;
  delete from public.plans where id = p_id;
  perform public.registrar_auditoria(null, 'excluiu o plano ' || p_id, null);
end $$;

-- novo cliente só entra em plano ativo
create or replace function public.admin_criar_cliente(
  p_empresa text, p_loja text, p_slug text, p_bairro text, p_plano text,
  p_responsavel text, p_telefone text, p_email text, p_dias_teste int default 14
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_org uuid; v_valor numeric;
begin
  perform public.exigir_admin();
  if p_slug !~ '^[a-z0-9-]{3,60}$' then raise exception 'Endereço inválido: use letras minúsculas, números e hífen'; end if;
  if exists (select 1 from public.stores where slug = p_slug) then raise exception 'Esse endereço já está em uso'; end if;
  select preco into v_valor from public.plans where id = p_plano and ativo;
  if v_valor is null then raise exception 'Plano não existe ou está desativado'; end if;
  insert into public.organizations (nome) values (p_empresa) returning id into v_org;
  insert into public.stores (org_id, slug, nome, bairro, publicada) values (v_org, p_slug, p_loja, p_bairro, false);
  insert into public.subscriptions (org_id, plan_id, status, valor, teste_ate, proximo_vencimento, responsavel, telefone, email)
  values (v_org, p_plano, case when p_dias_teste > 0 then 'teste' else 'ativa' end, v_valor,
          case when p_dias_teste > 0 then current_date + p_dias_teste end,
          current_date + greatest(p_dias_teste, 0), p_responsavel, p_telefone, lower(p_email));
  if coalesce(p_email, '') <> '' then
    insert into public.invites (org_id, email) values (v_org, lower(trim(p_email)));
  end if;
  perform public.registrar_auditoria(v_org, 'criou cliente', jsonb_build_object('plano', p_plano, 'slug', p_slug));
  return v_org;
end $$;

-- ---------- 20 e 21. Regras de cobrança e modelos de mensagem ----------
alter table public.platform_config add column if not exists tolerancia_dias int not null default 3;
alter table public.platform_config add column if not exists suspender_dias int not null default 15;
alter table public.platform_config add column if not exists multa_pct numeric(5,2) not null default 2;
alter table public.platform_config add column if not exists juros_pct numeric(5,2) not null default 1;
alter table public.platform_config add column if not exists aviso_dias int not null default 3;
alter table public.platform_config add column if not exists teste_dias int not null default 14;
alter table public.platform_config add column if not exists modelos jsonb not null default '{}'::jsonb;
do $$ begin
  alter table public.platform_config add constraint config_regras_ok check (
    tolerancia_dias between 0 and 30 and suspender_dias between 1 and 90 and suspender_dias > tolerancia_dias
    and multa_pct between 0 and 2 and juros_pct between 0 and 1 and aviso_dias between 0 and 15 and teste_dias between 0 and 60
    and jsonb_typeof(modelos) = 'object');
exception when duplicate_object then null; end $$;

-- A rotina diária passa a usar as regras salvas
create or replace function public.rotina_cobranca() returns void
language plpgsql security definer set search_path = public as $$
declare v_tol int; v_sus int;
begin
  select tolerancia_dias, suspender_dias into v_tol, v_sus from public.platform_config where id = 1;
  v_tol := coalesce(v_tol, 3);
  v_sus := coalesce(v_sus, 15);
  update public.invoices set status = 'atrasada' where status = 'aberta' and vencimento < current_date - v_tol and public.org_real(org_id);
  update public.subscriptions s set status = 'atrasada', atualizado_em = now()
   where status = 'ativa' and public.org_real(s.org_id) and exists (select 1 from public.invoices i where i.org_id = s.org_id and i.status = 'atrasada');
  update public.subscriptions s set status = 'suspensa', atualizado_em = now()
   where status = 'atrasada' and public.org_real(s.org_id) and exists (select 1 from public.invoices i where i.org_id = s.org_id and i.status = 'atrasada' and i.vencimento < current_date - v_sus);
  update public.stores st set publicada = false where public.org_real(st.org_id) and exists (select 1 from public.subscriptions s where s.org_id = st.org_id and s.status in ('suspensa','cancelada'));
  update public.subscriptions set status = 'atrasada', atualizado_em = now() where status = 'teste' and teste_ate < current_date and public.org_real(org_id);
end $$;
revoke execute on function public.rotina_cobranca() from public, anon, authenticated;

-- ---------- 23. Outros administradores ----------
create or replace function public.admin_listar_admins()
returns table (user_id uuid, email text, criado_em timestamptz, ultimo_login timestamptz, provisoria boolean, eu boolean)
language plpgsql stable security definer set search_path = public, auth as $$
begin
  perform public.exigir_admin();
  return query select a.user_id, u.email::text, a.criado_em, u.last_sign_in_at,
    coalesce((u.raw_user_meta_data->>'trocar_senha')::boolean, false), a.user_id = auth.uid()
  from public.platform_admins a join auth.users u on u.id = a.user_id order by a.criado_em;
end $$;

create or replace function public.admin_remover_admin(p_user uuid) returns void
language plpgsql security definer set search_path = public, auth as $$
declare v_email text;
begin
  perform public.exigir_admin();
  if p_user = auth.uid() then raise exception 'Você não pode tirar o seu próprio acesso'; end if;
  if (select count(*) from public.platform_admins) <= 1 then raise exception 'Precisa ficar pelo menos um administrador'; end if;
  select email into v_email from auth.users where id = p_user;
  delete from public.platform_admins where user_id = p_user;
  perform public.registrar_auditoria(null, 'removeu o administrador ' || coalesce(v_email, '?'), null);
end $$;

-- chamada só pelo servidor (/api/admin/geral), depois de conferir que quem pediu é administrador
create or replace function public.admin_adicionar_srv(p_user uuid, p_por uuid, p_email text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.memberships where user_id = p_user) then
    raise exception 'Esse e-mail é login de um restaurante. Use outro e-mail para o administrador.';
  end if;
  insert into public.platform_admins (user_id) values (p_user) on conflict do nothing;
  insert into public.admin_audit (admin_id, org_id, acao, detalhe) values (p_por, null, 'adicionou o administrador ' || p_email, null);
end $$;
revoke all on function public.admin_adicionar_srv(uuid, uuid, text) from public, anon, authenticated;

-- ---------- 24. Relatórios da carteira ----------
create or replace function public.admin_relatorio(p_meses int default 12)
returns table (mes date, recebido numeric, faturado numeric, em_atraso numeric, novos int, cancelados int, clientes int)
language plpgsql stable security definer set search_path = public as $$
declare n int := greatest(1, least(coalesce(p_meses, 12), 36));
begin
  perform public.exigir_admin();
  return query
  with meses as (
    select g::date as m from generate_series(date_trunc('month', current_date) - make_interval(months => n - 1), date_trunc('month', current_date), interval '1 month') g
  )
  select m.m,
    coalesce((select sum(i.valor) from public.invoices i where i.status = 'paga' and date_trunc('month', i.pago_em)::date = m.m and public.org_real(i.org_id)), 0),
    coalesce((select sum(i.valor) from public.invoices i where i.competencia = m.m and i.status <> 'cancelada' and public.org_real(i.org_id)), 0),
    coalesce((select sum(i.valor) from public.invoices i where i.competencia = m.m and i.status = 'atrasada' and public.org_real(i.org_id)), 0),
    (select count(*)::int from public.subscriptions s where date_trunc('month', s.criado_em)::date = m.m and public.org_real(s.org_id)),
    (select count(distinct x.org_id)::int from public.admin_audit x where (x.acao = 'mudou status para cancelada' or x.acao like 'excluiu o cliente%') and date_trunc('month', x.criado_em)::date = m.m),
    (select count(*)::int from public.subscriptions s where public.org_real(s.org_id) and s.criado_em < m.m + interval '1 month'
       and (s.status <> 'cancelada' or s.atualizado_em >= m.m + interval '1 month'))
  from meses m order by m.m;
end $$;

-- ---------- Ficha do cliente: termos aceitos e pedido de cancelamento ----------
create or replace function public.admin_ficha_extra(p_org uuid) returns jsonb
language plpgsql stable security definer set search_path = public, auth as $$
begin
  perform public.exigir_admin();
  return jsonb_build_object(
    'cancelamento_em', (select cancelamento_pedido_em from public.subscriptions where org_id = p_org),
    'cancelamento_motivo', (select cancelamento_motivo from public.subscriptions where org_id = p_org),
    'termos', coalesce((select jsonb_agg(jsonb_build_object('email', u.email, 'versao', t.versao, 'aceito_em', t.aceito_em) order by t.aceito_em desc)
      from public.memberships mb join auth.users u on u.id = mb.user_id join public.termos_aceites t on t.user_id = mb.user_id
      where mb.org_id = p_org), '[]'::jsonb));
end $$;

create or replace function public.admin_cancelamento_resolver(p_org uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.exigir_admin();
  update public.subscriptions set cancelamento_pedido_em = null, cancelamento_motivo = null where org_id = p_org;
  perform public.registrar_auditoria(p_org, 'resolveu o pedido de cancelamento', null);
end $$;

revoke all on function public.admin_plano_salvar(text, text, numeric, text, jsonb, int, boolean), public.admin_plano_excluir(text),
  public.admin_listar_admins(), public.admin_remover_admin(uuid), public.admin_relatorio(int), public.admin_ficha_extra(uuid),
  public.admin_cancelamento_resolver(uuid) from public, anon;
grant execute on function public.admin_plano_salvar(text, text, numeric, text, jsonb, int, boolean), public.admin_plano_excluir(text),
  public.admin_listar_admins(), public.admin_remover_admin(uuid), public.admin_relatorio(int), public.admin_ficha_extra(uuid),
  public.admin_cancelamento_resolver(uuid), public.admin_criar_cliente(text, text, text, text, text, text, text, text, int) to authenticated;
