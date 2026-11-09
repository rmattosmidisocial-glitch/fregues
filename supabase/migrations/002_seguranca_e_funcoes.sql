-- FREGUÊS · segurança (RLS) e funções

alter table public.stores add column if not exists demonstracao boolean not null default false;

-- ---------- Ajudantes ----------
create or replace function public.is_member(p_org uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.memberships m where m.org_id = p_org and m.user_id = auth.uid());
$$;

create or replace function public.store_org(p_store uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select org_id from public.stores where id = p_store;
$$;

create or replace function public.store_visivel(p_store uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.stores s where s.id = p_store and (s.publicada or public.is_member(s.org_id)));
$$;

-- ---------- Permissões base (o RLS decide linha a linha) ----------
grant usage on schema public to anon, authenticated;
grant select on all tables in schema public to anon, authenticated;
grant insert, update, delete on all tables in schema public to authenticated;
grant usage on all sequences in schema public to authenticated;
revoke all on public.customers, public.orders, public.order_items, public.out_of_area_leads, public.memberships, public.organizations from anon;

alter table public.geo_municipios enable row level security;
alter table public.geo_bairros enable row level security;
alter table public.organizations enable row level security;
alter table public.memberships enable row level security;
alter table public.stores enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.option_groups enable row level security;
alter table public.options enable row level security;
alter table public.delivery_zones enable row level security;
alter table public.zone_bairros enable row level security;
alter table public.zone_municipios enable row level security;
alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.out_of_area_leads enable row level security;

-- Geografia: leitura pública, escrita só pelo sistema
create policy geo_mun_ler on public.geo_municipios for select to anon, authenticated using (true);
create policy geo_bai_ler on public.geo_bairros for select to anon, authenticated using (true);
revoke insert, update, delete on public.geo_municipios, public.geo_bairros from authenticated;

-- Organização
create policy org_ler on public.organizations for select to authenticated using (public.is_member(id));
create policy org_editar on public.organizations for update to authenticated using (public.is_member(id)) with check (public.is_member(id));
create policy memb_ler on public.memberships for select to authenticated using (user_id = auth.uid() or public.is_member(org_id));
revoke insert, update, delete on public.memberships, public.organizations from authenticated;
grant update on public.organizations to authenticated;

-- Loja e cardápio: o público vê lojas publicadas; membros editam
create policy store_ler on public.stores for select to anon, authenticated using (publicada or public.is_member(org_id));
create policy store_editar on public.stores for update to authenticated using (public.is_member(org_id)) with check (public.is_member(org_id));

create policy cat_ler on public.categories for select to anon, authenticated using (public.store_visivel(store_id));
create policy cat_escrever on public.categories for all to authenticated using (public.is_member(public.store_org(store_id))) with check (public.is_member(public.store_org(store_id)));

create policy prod_ler on public.products for select to anon, authenticated using (public.store_visivel(store_id));
create policy prod_escrever on public.products for all to authenticated using (public.is_member(public.store_org(store_id))) with check (public.is_member(public.store_org(store_id)));

create policy og_ler on public.option_groups for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id and public.store_visivel(p.store_id)));
create policy og_escrever on public.option_groups for all to authenticated
  using (exists (select 1 from public.products p where p.id = product_id and public.is_member(public.store_org(p.store_id))))
  with check (exists (select 1 from public.products p where p.id = product_id and public.is_member(public.store_org(p.store_id))));

create policy opt_ler on public.options for select to anon, authenticated
  using (exists (select 1 from public.option_groups g join public.products p on p.id = g.product_id where g.id = group_id and public.store_visivel(p.store_id)));
create policy opt_escrever on public.options for all to authenticated
  using (exists (select 1 from public.option_groups g join public.products p on p.id = g.product_id where g.id = group_id and public.is_member(public.store_org(p.store_id))))
  with check (exists (select 1 from public.option_groups g join public.products p on p.id = g.product_id where g.id = group_id and public.is_member(public.store_org(p.store_id))));

create policy zona_ler on public.delivery_zones for select to anon, authenticated using (public.store_visivel(store_id));
create policy zona_escrever on public.delivery_zones for all to authenticated using (public.is_member(public.store_org(store_id))) with check (public.is_member(public.store_org(store_id)));
create policy zb_ler on public.zone_bairros for select to anon, authenticated using (public.store_visivel(store_id));
create policy zb_escrever on public.zone_bairros for all to authenticated using (public.is_member(public.store_org(store_id))) with check (public.is_member(public.store_org(store_id)));
create policy zm_ler on public.zone_municipios for select to anon, authenticated using (public.store_visivel(store_id));
create policy zm_escrever on public.zone_municipios for all to authenticated using (public.is_member(public.store_org(store_id))) with check (public.is_member(public.store_org(store_id)));

-- Dados de clientes: só membros. Pedidos novos entram pela função place_order.
create policy cli_membro on public.customers for all to authenticated using (public.is_member(org_id)) with check (public.is_member(org_id));
create policy ped_ler on public.orders for select to authenticated using (public.is_member(public.store_org(store_id)));
create policy ped_atualizar on public.orders for update to authenticated using (public.is_member(public.store_org(store_id))) with check (public.is_member(public.store_org(store_id)));
create policy item_ler on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and public.is_member(public.store_org(o.store_id))));
create policy lead_ler on public.out_of_area_leads for select to authenticated using (public.is_member(public.store_org(store_id)));
revoke insert, delete on public.orders, public.order_items, public.out_of_area_leads from authenticated;

-- ---------- Entrega: descobre bairro, zona e taxa pelo ponto ----------
create or replace function public.resolve_delivery(p_store uuid, p_lon double precision, p_lat double precision)
returns jsonb language plpgsql stable security definer set search_path = public, extensions as $$
declare
  v_pt geometry := st_setsrid(st_makepoint(p_lon, p_lat), 4326);
  v_bairro record;
  v_mun record;
  v_zona record;
begin
  select b.id, b.nome, b.municipio_nome into v_bairro from geo_bairros b where st_contains(b.geom, v_pt) limit 1;
  select m.cod_ibge, m.nome into v_mun from geo_municipios m where st_contains(m.geom, v_pt) limit 1;

  if v_bairro.id is not null then
    select z.* into v_zona from zone_bairros zb join delivery_zones z on z.id = zb.zone_id
    where zb.store_id = p_store and zb.bairro_id = v_bairro.id;
  end if;
  if v_zona.id is null and v_mun.cod_ibge is not null then
    select z.* into v_zona from zone_municipios zm join delivery_zones z on z.id = zm.zone_id
    where zm.store_id = p_store and zm.municipio_cod = v_mun.cod_ibge;
  end if;

  return jsonb_build_object(
    'atende', v_zona.id is not null,
    'bairro_id', v_bairro.id,
    'bairro', coalesce(v_bairro.nome, v_mun.nome),
    'municipio', coalesce(v_bairro.municipio_nome, v_mun.nome),
    'zona_id', v_zona.id,
    'zona', v_zona.nome,
    'taxa', v_zona.taxa,
    'tempo_min', v_zona.tempo_min,
    'tempo_max', v_zona.tempo_max,
    'pedido_minimo', v_zona.pedido_minimo,
    'gratis_acima', v_zona.gratis_acima
  );
end $$;

-- ---------- Cashback ----------
create or replace function public.cashback_saldo_interno(p_org uuid, p_store uuid, p_customer uuid)
returns numeric language sql stable security definer set search_path = public as $$
  select greatest(0, round(coalesce(sum(o.total) filter (where o.status <> 'cancelado'), 0) * (select cashback_percentual from stores where id = p_store), 2)
                     - coalesce(sum(o.desconto), 0))
  from orders o where o.customer_id = p_customer;
$$;

create or replace function public.so_digitos(t text) returns text language sql immutable as $$
  select regexp_replace(coalesce(t, ''), '\D', '', 'g');
$$;

create or replace function public.cashback_saldo(p_slug text, p_telefone text)
returns numeric language plpgsql stable security definer set search_path = public as $$
declare v_store stores; v_cli uuid;
begin
  select * into v_store from stores where slug = p_slug and publicada;
  if v_store.id is null then return 0; end if;
  select id into v_cli from customers where org_id = v_store.org_id and telefone = so_digitos(p_telefone);
  if v_cli is null then return 0; end if;
  return cashback_saldo_interno(v_store.org_id, v_store.id, v_cli);
end $$;

-- ---------- Fazer pedido (a única porta de entrada de pedidos) ----------
create or replace function public.place_order(p_slug text, p jsonb)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  v_store stores;
  v_modo text := p->>'modo';
  v_tel text := so_digitos(p->'cliente'->>'telefone');
  v_nome text := left(trim(coalesce(p->'cliente'->>'nome', '')), 80);
  v_pag text := p->>'pagamento';
  v_cli uuid;
  v_item jsonb;
  v_prod products;
  v_grupo option_groups;
  v_esc uuid[];
  v_qtd int;
  v_unit numeric;
  v_sub numeric := 0;
  v_taxa numeric := 0;
  v_desc numeric := 0;
  v_entrega jsonb;
  v_ponto geometry;
  v_order orders;
  v_linhas jsonb := '[]';
  v_nomes_esc jsonb;
  v_cnt int;
begin
  select * into v_store from stores where slug = p_slug and publicada;
  if v_store.id is null then raise exception 'Loja não encontrada'; end if;
  if not v_store.aberta then raise exception 'A loja está fechada agora'; end if;
  if v_modo not in ('entrega', 'retirada', 'mesa') then raise exception 'Modo de pedido inválido'; end if;
  if v_pag not in ('pix', 'cartao', 'dinheiro', 'maquininha') then raise exception 'Forma de pagamento inválida'; end if;
  if length(v_tel) not between 10 and 11 then raise exception 'Informe um telefone com DDD'; end if;
  if length(v_nome) < 2 then raise exception 'Informe seu nome'; end if;
  if jsonb_typeof(p->'itens') <> 'array' or jsonb_array_length(p->'itens') = 0 then raise exception 'A sacola está vazia'; end if;
  if jsonb_array_length(p->'itens') > 30 then raise exception 'Itens demais em um pedido'; end if;

  -- Itens: preço sempre recalculado aqui, nunca confiamos no navegador
  for v_item in select * from jsonb_array_elements(p->'itens') loop
    select * into v_prod from products where id = (v_item->>'product_id')::uuid and store_id = v_store.id;
    if v_prod.id is null then raise exception 'Produto não encontrado'; end if;
    if v_prod.esgotado then raise exception '% esgotou agora há pouco', v_prod.nome; end if;
    v_qtd := coalesce((v_item->>'qtd')::int, 1);
    if v_qtd not between 1 and 50 then raise exception 'Quantidade inválida'; end if;
    v_esc := coalesce(array(select jsonb_array_elements_text(coalesce(v_item->'escolhas', '[]'))::uuid), '{}');

    -- toda escolha precisa ser deste produto
    if exists (select 1 from unnest(v_esc) e where not exists (
      select 1 from options o join option_groups g on g.id = o.group_id where o.id = e and g.product_id = v_prod.id)) then
      raise exception 'Opção inválida em %', v_prod.nome;
    end if;
    for v_grupo in select * from option_groups where product_id = v_prod.id loop
      select count(*) into v_cnt from options o where o.group_id = v_grupo.id and o.id = any(v_esc);
      if v_cnt < v_grupo.min then raise exception 'Escolha “%” em %', v_grupo.nome, v_prod.nome; end if;
      if v_cnt > v_grupo.max then raise exception 'Escolhas demais em “%”', v_grupo.nome; end if;
    end loop;

    v_unit := coalesce(v_prod.preco_promo, v_prod.preco) + coalesce((select sum(o.preco) from options o where o.id = any(v_esc)), 0);
    select coalesce(jsonb_agg(o.nome order by g.ordem, o.ordem), '[]') into v_nomes_esc
      from options o join option_groups g on g.id = o.group_id where o.id = any(v_esc);
    v_sub := v_sub + v_unit * v_qtd;
    v_linhas := v_linhas || jsonb_build_object('product_id', v_prod.id, 'nome', v_prod.nome, 'qtd', v_qtd, 'unit', v_unit,
                                              'escolhas', v_nomes_esc, 'obs', left(v_item->>'obs', 200));
  end loop;

  -- Entrega: o ponto no mapa decide bairro, zona e taxa
  if v_modo = 'entrega' then
    if p->'ponto' is null then raise exception 'Marque o endereço no mapa'; end if;
    v_ponto := st_setsrid(st_makepoint((p->'ponto'->>'lon')::float8, (p->'ponto'->>'lat')::float8), 4326);
    v_entrega := resolve_delivery(v_store.id, st_x(v_ponto), st_y(v_ponto));
    if not (v_entrega->>'atende')::boolean then
      insert into out_of_area_leads (store_id, bairro_id, telefone, aceita_aviso, ponto)
      values (v_store.id, v_entrega->>'bairro_id', v_tel, coalesce((p->>'avisar_quando_atender')::boolean, false), v_ponto);
      -- não usamos exceção aqui para o registro da procura não ser desfeito
      return jsonb_build_object('erro', 'Ainda não entregamos em ' || coalesce(v_entrega->>'bairro', 'esse endereço'),
                                'fora_da_area', true, 'bairro', v_entrega->>'bairro');
    end if;
    if v_sub < (v_entrega->>'pedido_minimo')::numeric then
      raise exception 'Pedido mínimo para % é R$ %', v_entrega->>'bairro', to_char((v_entrega->>'pedido_minimo')::numeric, 'FM999G990D00');
    end if;
    v_taxa := case when (v_entrega->>'gratis_acima') is not null and v_sub >= (v_entrega->>'gratis_acima')::numeric then 0
                   else (v_entrega->>'taxa')::numeric end;
    if coalesce(trim(p->'endereco'->>'numero'), '') = '' then raise exception 'Informe o número do endereço'; end if;
  end if;

  -- Cliente: cria ou atualiza pelo telefone
  insert into customers (org_id, nome, telefone, bairro_id, aceita_marketing, aceita_marketing_em, canal_origem)
  values (v_store.org_id, v_nome, v_tel, v_entrega->>'bairro_id', coalesce((p->'cliente'->>'aceita_marketing')::boolean, false),
          case when coalesce((p->'cliente'->>'aceita_marketing')::boolean, false) then now() end, 'Loja própria')
  on conflict (org_id, telefone) do update set
    nome = excluded.nome,
    bairro_id = coalesce(excluded.bairro_id, customers.bairro_id),
    aceita_marketing = customers.aceita_marketing or excluded.aceita_marketing,
    aceita_marketing_em = coalesce(customers.aceita_marketing_em, excluded.aceita_marketing_em)
  returning id into v_cli;

  if coalesce((p->>'usar_cashback')::boolean, false) then
    v_desc := least(cashback_saldo_interno(v_store.org_id, v_store.id, v_cli), v_sub);
  end if;

  insert into orders (store_id, customer_id, modo, mesa, bairro_id, zone_id, endereco, ponto, subtotal, taxa_entrega, desconto, total,
                      pagamento, pago, troco_para, observacao, utm)
  values (v_store.id, v_cli, v_modo, p->>'mesa', v_entrega->>'bairro_id', (v_entrega->>'zona_id')::uuid,
          case when v_modo = 'entrega' then jsonb_build_object(
            'rua', left(p->'endereco'->>'rua', 120), 'numero', left(p->'endereco'->>'numero', 20),
            'complemento', left(p->'endereco'->>'complemento', 160), 'bairro', v_entrega->>'bairro') end,
          v_ponto, round(v_sub, 2), v_taxa, round(v_desc, 2), round(v_sub + v_taxa - v_desc, 2),
          v_pag, false, nullif(p->>'troco_para', '')::numeric, left(p->>'observacao', 300), p->'utm')
  returning * into v_order;

  insert into order_items (order_id, product_id, nome, qtd, unit, escolhas, obs)
  select v_order.id, (l->>'product_id')::uuid, l->>'nome', (l->>'qtd')::int, (l->>'unit')::numeric, l->'escolhas', l->>'obs'
  from jsonb_array_elements(v_linhas) l;

  return jsonb_build_object('id', v_order.id, 'numero', v_order.numero, 'total', v_order.total, 'desconto', v_order.desconto,
                            'taxa', v_order.taxa_entrega, 'status', v_order.status,
                            'tempo_min', coalesce((v_entrega->>'tempo_min')::int, 15), 'tempo_max', coalesce((v_entrega->>'tempo_max')::int, 25));
end $$;

-- Acompanhamento público: o id (uuid) do pedido funciona como senha
create or replace function public.order_public(p_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('numero', o.numero, 'status', o.status, 'modo', o.modo, 'total', o.total, 'pago', o.pago,
                            'pagamento', o.pagamento, 'criado', o.created_at, 'motoboy', o.motoboy)
  from orders o where o.id = p_id;
$$;

-- Pix de demonstração: só funciona em lojas marcadas como demonstração.
-- Em produção a confirmação vem do webhook do banco/gateway.
create or replace function public.confirmar_pix_demo(p_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update orders o set pago = true from stores s
  where o.id = p_id and s.id = o.store_id and s.demonstracao and o.pagamento = 'pix';
  return found;
end $$;

-- ---------- CRM: pulso de cada freguês ----------
create or replace view public.customer_pulse with (security_invoker = true) as
with ped as (
  select o.customer_id, o.store_id, o.created_at, o.total,
         lag(o.created_at) over (partition by o.customer_id order by o.created_at) as anterior
  from public.orders o where o.status <> 'cancelado' and o.customer_id is not null
), agg as (
  select customer_id,
         count(*) as pedidos,
         round(avg(total), 2) as ticket,
         sum(total) as gasto,
         max(created_at) as ultimo,
         greatest(3, round(coalesce(extract(epoch from avg(created_at - anterior)) / 86400, 14))) as intervalo
  from ped group by customer_id
), fav as (
  select distinct on (o.customer_id) o.customer_id, i.nome
  from public.order_items i join public.orders o on o.id = i.order_id
  group by o.customer_id, i.nome order by o.customer_id, sum(i.qtd) desc
), hor as (
  select distinct on (customer_id) customer_id,
         extract(dow from created_at at time zone 'America/Sao_Paulo')::int as dow,
         extract(hour from created_at at time zone 'America/Sao_Paulo')::int as hora
  from public.orders group by 1, 2, 3 order by customer_id, count(*) desc
)
select c.id, c.org_id, c.nome, c.telefone, b.nome as bairro, c.bairro_id, c.aniversario, c.tags, c.aceita_marketing, c.canal_origem as canal,
       a.pedidos, a.ticket, a.gasto, a.intervalo::int as intervalo, a.ultimo,
       greatest(0, floor(extract(epoch from now() - a.ultimo) / 86400))::int as dias_desde,
       case when extract(epoch from now() - a.ultimo) / 86400 <= a.intervalo * 1.25 then 'ritmo'
            when extract(epoch from now() - a.ultimo) / 86400 <= a.intervalo * 2 then 'atrasado'
            else 'sumindo' end as status,
       case when a.pedidos >= 30 then 'Lenda da Casa' when a.pedidos >= 14 then 'Fiel' when a.pedidos >= 4 then 'Freguês' else 'Visitante' end as nivel,
       f.nome as favorito, h.dow, h.hora
from public.customers c
join agg a on a.customer_id = c.id
left join fav f on f.customer_id = c.id
left join hor h on h.customer_id = c.id
left join public.geo_bairros b on b.id = c.bairro_id;

grant select on public.customer_pulse to authenticated;

create or replace function public.pulse_summary(p_store uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_org uuid := store_org(p_store); r jsonb;
begin
  if not is_member(v_org) then raise exception 'Sem acesso'; end if;
  with cp as (
    select * from customer_pulse where org_id = v_org
  ), voltas as (
    select o.total from (
      select o.*, lag(o.created_at) over (partition by o.customer_id order by o.created_at) as ant
      from orders o where o.store_id = p_store and o.status <> 'cancelado') o
    join cp on cp.id = o.customer_id
    where o.created_at >= date_trunc('month', now()) and o.ant is not null
      and extract(epoch from o.created_at - o.ant) / 86400 > cp.intervalo * 1.5
  ), semana as (
    select to_char(d, 'YYYY-MM-DD') as dia, extract(isodow from d)::int as dow,
           coalesce((select sum(total) from orders o where o.store_id = p_store and o.status <> 'cancelado'
                     and (o.created_at at time zone 'America/Sao_Paulo')::date = d), 0) as propria
    from generate_series((now() at time zone 'America/Sao_Paulo')::date - 6, (now() at time zone 'America/Sao_Paulo')::date, interval '1 day') d
  )
  select jsonb_build_object(
    'risco', coalesce((select round(sum(ticket * (7.0 / intervalo) * case status when 'atrasado' then 0.45 when 'sumindo' then 0.8 else 0 end * 1.6)) from cp), 0),
    'recuperado', coalesce((select round(sum(total)) from voltas), 0),
    'voltaram', (select count(*) from voltas),
    'ritmo', (select count(*) from cp where status = 'ritmo'),
    'atrasado', (select count(*) from cp where status = 'atrasado'),
    'sumindo', (select count(*) from cp where status = 'sumindo'),
    'total', (select count(*) from cp),
    'semana', (select jsonb_agg(jsonb_build_object('dia', dia, 'dow', dow, 'propria', propria) order by dia) from semana),
    'comissao', (select comissao_marketplace from stores where id = p_store)
  ) into r;
  return r;
end $$;

-- Demanda fora da área por bairro (últimos 30 dias)
create or replace function public.demanda_fora(p_store uuid)
returns table (bairro_id text, bairro text, tentativas bigint) language sql stable security definer set search_path = public as $$
  select l.bairro_id, b.nome, count(*) from out_of_area_leads l left join geo_bairros b on b.id = l.bairro_id
  where l.store_id = p_store and l.created_at > now() - interval '30 days' and public.is_member(public.store_org(p_store))
  group by 1, 2 order by 3 desc;
$$;

revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.resolve_delivery(uuid, double precision, double precision) to anon, authenticated;
grant execute on function public.place_order(text, jsonb) to anon, authenticated;
grant execute on function public.order_public(uuid) to anon, authenticated;
grant execute on function public.cashback_saldo(text, text) to anon, authenticated;
grant execute on function public.confirmar_pix_demo(uuid) to anon, authenticated;
grant execute on function public.pulse_summary(uuid) to authenticated;
grant execute on function public.demanda_fora(uuid) to authenticated;
grant execute on function public.is_member(uuid), public.store_org(uuid), public.store_visivel(uuid), public.so_digitos(text) to anon, authenticated;

-- Tempo real para o painel de pedidos
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.orders;
  end if;
end $$;
