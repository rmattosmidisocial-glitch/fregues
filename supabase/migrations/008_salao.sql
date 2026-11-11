-- 008 · Salão: mesas, comandas, itens, cozinha e pedido pelo QR code da mesa.
-- Ao fechar a comanda, a venda vira um pedido (modo 'mesa', canal 'Salão') e entra no CRM como qualquer outro.

create table public.dining_tables (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  numero int not null check (numero between 1 and 999),
  area text not null default 'Salão',
  lugares int not null default 4 check (lugares between 1 and 40),
  forma text not null default 'quadrada' check (forma in ('quadrada','redonda','retangular')),
  ativa boolean not null default true,
  reservada_para text,
  unique (store_id, numero)
);

create table public.tabs (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  table_id uuid not null references public.dining_tables(id) on delete cascade,
  status text not null default 'aberta' check (status in ('aberta','conta','fechada','cancelada')),
  pessoas int not null default 1 check (pessoas between 1 and 60),
  garcom text,
  customer_id uuid references public.customers(id) on delete set null,
  cliente_nome text,
  telefone text,
  taxa_servico numeric(4,1) not null default 10 check (taxa_servico between 0 and 30),
  desconto numeric(10,2) not null default 0,
  pagamentos jsonb not null default '[]'::jsonb,
  order_id uuid references public.orders(id) on delete set null,
  aberta_em timestamptz not null default now(),
  fechada_em timestamptz
);
create unique index tabs_uma_aberta_por_mesa on public.tabs(table_id) where status in ('aberta','conta');
create index tabs_store_idx on public.tabs(store_id, aberta_em desc);

create table public.tab_items (
  id uuid primary key default gen_random_uuid(),
  tab_id uuid not null references public.tabs(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  nome text not null,
  qtd int not null check (qtd between 1 and 50),
  unit numeric(10,2) not null check (unit >= 0),
  obs text check (length(obs) <= 200),
  status text not null default 'novo' check (status in ('novo','preparo','pronto','entregue','cancelado')),
  origem text not null default 'garcom' check (origem in ('garcom','cliente')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index tab_items_tab_idx on public.tab_items(tab_id);
create index tab_items_cozinha_idx on public.tab_items(status) where status in ('novo','preparo','pronto');

create table public.table_calls (
  id bigint generated always as identity primary key,
  store_id uuid not null references public.stores(id) on delete cascade,
  table_id uuid not null references public.dining_tables(id) on delete cascade,
  tipo text not null check (tipo in ('garcom','conta')),
  criado_em timestamptz not null default now(),
  atendido_em timestamptz
);

alter table public.dining_tables enable row level security;
alter table public.tabs enable row level security;
alter table public.tab_items enable row level security;
alter table public.table_calls enable row level security;

create policy mesas_membro on public.dining_tables for all to authenticated using (public.is_member(public.store_org(store_id))) with check (public.is_member(public.store_org(store_id)));
create policy comandas_membro on public.tabs for all to authenticated using (public.is_member(public.store_org(store_id))) with check (public.is_member(public.store_org(store_id)));
create policy itens_membro on public.tab_items for all to authenticated
  using (exists (select 1 from public.tabs t where t.id = tab_id and public.is_member(public.store_org(t.store_id))))
  with check (exists (select 1 from public.tabs t where t.id = tab_id and public.is_member(public.store_org(t.store_id))));
create policy chamados_membro on public.table_calls for all to authenticated using (public.is_member(public.store_org(store_id))) with check (public.is_member(public.store_org(store_id)));

grant select, insert, update, delete on public.dining_tables, public.tabs, public.tab_items, public.table_calls to authenticated;

-- ---------- Equipe ----------

-- Abre a mesa (ou devolve a comanda já aberta)
create or replace function public.abrir_mesa(p_mesa uuid, p_pessoas int default 2, p_garcom text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare m public.dining_tables; v uuid;
begin
  select * into m from public.dining_tables where id = p_mesa;
  if m.id is null or not public.is_member(public.store_org(m.store_id)) then raise exception 'Mesa não encontrada'; end if;
  select id into v from public.tabs where table_id = p_mesa and status in ('aberta','conta');
  if v is not null then return v; end if;
  insert into public.tabs (store_id, table_id, pessoas, garcom) values (m.store_id, p_mesa, greatest(1, p_pessoas), p_garcom) returning id into v;
  update public.dining_tables set reservada_para = null where id = p_mesa;
  return v;
end $$;

-- Lança itens com o preço do cardápio (nunca o preço enviado pela tela)
create or replace function public._lancar(p_comanda uuid, p_itens jsonb, p_origem text)
returns int language plpgsql security definer set search_path = public as $$
declare t public.tabs; i jsonb; pr public.products; n int := 0;
begin
  select * into t from public.tabs where id = p_comanda and status in ('aberta','conta');
  if t.id is null then raise exception 'Comanda fechada ou inexistente'; end if;
  if jsonb_array_length(p_itens) > 40 then raise exception 'Itens demais de uma vez'; end if;
  for i in select * from jsonb_array_elements(p_itens) loop
    select * into pr from public.products where id = (i->>'produto')::uuid and store_id = t.store_id;
    if pr.id is null then raise exception 'Produto não está no cardápio'; end if;
    if pr.esgotado then raise exception '% acabou hoje', pr.nome; end if;
    insert into public.tab_items (tab_id, product_id, nome, qtd, unit, obs, origem)
    values (t.id, pr.id, pr.nome, least(50, greatest(1, coalesce((i->>'qtd')::int, 1))), coalesce(pr.preco_promo, pr.preco), left(nullif(trim(i->>'obs'), ''), 200), p_origem);
    n := n + 1;
  end loop;
  if t.status = 'conta' then update public.tabs set status = 'aberta' where id = t.id; end if;
  return n;
end $$;

create or replace function public.lancar_itens(p_comanda uuid, p_itens jsonb)
returns int language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.tabs t where t.id = p_comanda and public.is_member(public.store_org(t.store_id))) then raise exception 'Sem permissão'; end if;
  return public._lancar(p_comanda, p_itens, 'garcom');
end $$;

-- Fecha a conta: grava pagamentos, liga ao freguês pelo telefone e cria o pedido do CRM
create or replace function public.fechar_comanda(p_comanda uuid, p_pagamentos jsonb, p_telefone text default null, p_nome text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  t public.tabs; v_org uuid; v_sub numeric; v_serv numeric; v_total numeric; v_pago numeric;
  v_tel text := public.so_digitos(p_telefone); v_cli uuid; v_ped uuid; v_forma text; v_mesa int;
begin
  select * into t from public.tabs where id = p_comanda and status in ('aberta','conta') for update;
  if t.id is null then raise exception 'Comanda já fechada'; end if;
  v_org := public.store_org(t.store_id);
  if not public.is_member(v_org) then raise exception 'Sem permissão'; end if;
  select coalesce(sum(qtd * unit), 0) into v_sub from public.tab_items where tab_id = t.id and status <> 'cancelado';
  if v_sub <= 0 then raise exception 'Comanda sem itens. Para liberar a mesa, cancele a comanda.'; end if;
  v_serv := round(v_sub * t.taxa_servico / 100, 2);
  v_total := v_sub + v_serv - t.desconto;
  select coalesce(sum((x->>'valor')::numeric), 0) into v_pago from jsonb_array_elements(p_pagamentos) x;
  if v_pago + 0.009 < v_total then raise exception 'Falta receber R$ %', replace(to_char(v_total - v_pago, 'FM999990.00'), '.', ','); end if;
  select x->>'forma' into v_forma from jsonb_array_elements(p_pagamentos) x order by (x->>'valor')::numeric desc limit 1;
  if v_forma not in ('pix','cartao','dinheiro','maquininha') then v_forma := 'maquininha'; end if;

  if v_tel is not null and length(v_tel) >= 10 then
    insert into public.customers (org_id, nome, telefone)
    values (v_org, coalesce(nullif(trim(p_nome), ''), 'Cliente do salão'), v_tel)
    on conflict (org_id, telefone) do update set nome = coalesce(nullif(trim(excluded.nome), 'Cliente do salão'), public.customers.nome)
    returning id into v_cli;
  end if;

  select numero into v_mesa from public.dining_tables where id = t.table_id;
  insert into public.orders (store_id, customer_id, status, modo, mesa, subtotal, desconto, total, pagamento, pago, canal, observacao)
  values (t.store_id, coalesce(v_cli, t.customer_id), 'entregue', 'mesa', v_mesa::text, v_sub, t.desconto, v_total, v_forma, true, 'Salão',
          case when v_serv > 0 then 'Serviço ' || t.taxa_servico || '%: ' || v_serv end)
  returning id into v_ped;
  insert into public.order_items (order_id, product_id, nome, qtd, unit, obs)
  select v_ped, product_id, nome, qtd, unit, obs from public.tab_items where tab_id = t.id and status <> 'cancelado';

  update public.tabs set status = 'fechada', fechada_em = now(), pagamentos = p_pagamentos, order_id = v_ped,
    customer_id = coalesce(v_cli, customer_id), telefone = coalesce(v_tel, telefone), cliente_nome = coalesce(nullif(trim(p_nome), ''), cliente_nome)
  where id = t.id;
  update public.table_calls set atendido_em = now() where table_id = t.table_id and atendido_em is null;
  return v_ped;
end $$;

-- Resumo do salão para o painel
create or replace function public.salao_resumo(p_store uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select case when public.is_member(public.store_org(p_store)) then jsonb_build_object(
    'vendas_hoje', coalesce((select sum(total) from public.orders where store_id = p_store and modo = 'mesa' and created_at >= date_trunc('day', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo'), 0),
    'comandas_hoje', (select count(*) from public.tabs where store_id = p_store and status = 'fechada' and fechada_em >= date_trunc('day', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo'),
    'pessoas_hoje', coalesce((select sum(pessoas) from public.tabs where store_id = p_store and aberta_em >= date_trunc('day', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo'), 0)
  ) end;
$$;

-- ---------- Cliente na mesa (QR code, sem login) ----------

create or replace function public.mesa_publica(p_slug text, p_numero int)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare s public.stores; m public.dining_tables; t public.tabs;
begin
  select * into s from public.stores where slug = p_slug and publicada;
  if s.id is null then raise exception 'Loja não encontrada'; end if;
  select * into m from public.dining_tables where store_id = s.id and numero = p_numero and ativa;
  if m.id is null then raise exception 'Mesa não encontrada'; end if;
  select * into t from public.tabs where table_id = m.id and status in ('aberta','conta');
  return jsonb_build_object(
    'mesa', m.numero, 'area', m.area, 'aberta', t.id is not null, 'status', t.status, 'taxa_servico', coalesce(t.taxa_servico, 10),
    'itens', coalesce((select jsonb_agg(jsonb_build_object('nome', nome, 'qtd', qtd, 'unit', unit, 'status', status) order by criado_em)
                       from public.tab_items where tab_id = t.id and status <> 'cancelado'), '[]'::jsonb)
  );
end $$;

create or replace function public.mesa_pedir(p_slug text, p_numero int, p_itens jsonb)
returns int language plpgsql security definer set search_path = public as $$
declare s public.stores; m public.dining_tables; v uuid;
begin
  select * into s from public.stores where slug = p_slug and publicada and aberta;
  if s.id is null then raise exception 'A loja não está recebendo pedidos agora'; end if;
  select * into m from public.dining_tables where store_id = s.id and numero = p_numero and ativa;
  if m.id is null then raise exception 'Mesa não encontrada'; end if;
  -- limite simples contra abuso: 10 itens por minuto por mesa
  if (select count(*) from public.tab_items i join public.tabs t on t.id = i.tab_id where t.table_id = m.id and i.origem = 'cliente' and i.criado_em > now() - interval '1 minute') >= 10 then
    raise exception 'Muitos pedidos seguidos. Chame o garçom.';
  end if;
  select id into v from public.tabs where table_id = m.id and status in ('aberta','conta');
  if v is null then insert into public.tabs (store_id, table_id) values (s.id, m.id) returning id into v; end if;
  return public._lancar(v, p_itens, 'cliente');
end $$;

create or replace function public.mesa_chamar(p_slug text, p_numero int, p_tipo text)
returns void language plpgsql security definer set search_path = public as $$
declare s public.stores; m public.dining_tables;
begin
  if p_tipo not in ('garcom','conta') then raise exception 'Chamado inválido'; end if;
  select * into s from public.stores where slug = p_slug and publicada;
  select * into m from public.dining_tables where store_id = s.id and numero = p_numero and ativa;
  if m.id is null then raise exception 'Mesa não encontrada'; end if;
  if exists (select 1 from public.table_calls where table_id = m.id and tipo = p_tipo and atendido_em is null) then return; end if;
  insert into public.table_calls (store_id, table_id, tipo) values (s.id, m.id, p_tipo);
  if p_tipo = 'conta' then update public.tabs set status = 'conta' where table_id = m.id and status = 'aberta'; end if;
end $$;

revoke execute on function public._lancar(uuid, jsonb, text), public.abrir_mesa(uuid, int, text), public.lancar_itens(uuid, jsonb), public.fechar_comanda(uuid, jsonb, text, text),
  public.salao_resumo(uuid), public.mesa_publica(text, int), public.mesa_pedir(text, int, jsonb), public.mesa_chamar(text, int, text) from public, anon;
grant execute on function public.abrir_mesa(uuid, int, text), public.fechar_comanda(uuid, jsonb, text, text), public.salao_resumo(uuid) to authenticated;
grant execute on function public.mesa_publica(text, int), public.mesa_pedir(text, int, jsonb), public.mesa_chamar(text, int, text) to anon, authenticated;
grant execute on function public.lancar_itens(uuid, jsonb) to authenticated;
revoke execute on function public._lancar(uuid, jsonb, text) from authenticated;

do $$ begin
  alter publication supabase_realtime add table public.tabs, public.tab_items, public.table_calls;
exception when undefined_object then null; when duplicate_object then null; end $$;

-- ---------- Salão de exemplo da loja de demonstração ----------
create or replace function public.seed_salao(p_slug text default 'brasa-burger')
returns void language plpgsql security definer set search_path = public as $$
declare v_store uuid; v_mesa uuid; v_tab uuid; n int;
begin
  select id into v_store from public.stores where slug = p_slug;
  if v_store is null then raise exception 'Loja % não existe', p_slug; end if;
  delete from public.dining_tables where store_id = v_store;
  for n in 1..10 loop
    insert into public.dining_tables (store_id, numero, area, lugares, forma) values (v_store, n, 'Salão', case when n in (5,6) then 6 when n = 10 then 2 else 4 end, case when n in (5,6) then 'retangular' when n in (9,10) then 'redonda' else 'quadrada' end);
  end loop;
  for n in 11..14 loop
    insert into public.dining_tables (store_id, numero, area, lugares, forma) values (v_store, n, 'Varanda', 4, 'redonda');
  end loop;
  update public.dining_tables set reservada_para = '20h · Diego (12 pessoas)' where store_id = v_store and numero = 5;
  -- três mesas ocupadas com consumo
  for n in 2..4 loop
    select id into v_mesa from public.dining_tables where store_id = v_store and numero = (array[3,8,7])[n - 1];
    insert into public.tabs (store_id, table_id, pessoas, garcom, aberta_em, status) values (v_store, v_mesa, n, 'Léo', now() - (n * 17 || ' minutes')::interval, case when n = 4 then 'conta' else 'aberta' end) returning id into v_tab;
    insert into public.tab_items (tab_id, product_id, nome, qtd, unit, status)
    select v_tab, p.id, p.nome, 1 + (n % 2), coalesce(p.preco_promo, p.preco), case when n = 2 then 'preparo' else 'entregue' end
    from public.products p where p.store_id = v_store and not p.esgotado order by p.ordem offset n limit 3;
  end loop;
end $$;
revoke execute on function public.seed_salao(text) from public, anon, authenticated;
