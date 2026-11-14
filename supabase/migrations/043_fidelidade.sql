-- 043: fidelidade. Cashback opcional por loja (%, mínimo para usar, validade) e cupons de desconto.
alter table public.stores add column if not exists cashback_ativo boolean not null default false;
alter table public.stores add column if not exists cashback_minimo_uso numeric(10,2) not null default 0;
alter table public.stores add column if not exists cashback_validade_dias int check (cashback_validade_dias is null or cashback_validade_dias > 0);
update public.stores set cashback_ativo = demonstracao;   -- só a demonstração já vem com cashback ligado

-- extrato do cashback: crédito quando o pedido é entregue, uso quando vira desconto
create table if not exists public.cashback_movimentos (
  id bigserial primary key,
  store_id uuid not null references public.stores(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  order_id uuid references public.orders(id) on delete cascade,
  tipo text not null check (tipo in ('credito', 'uso')),
  valor numeric(10,2) not null,
  criado_em timestamptz not null default now(),
  unique (order_id, tipo)
);
create index if not exists cashback_mov_idx on public.cashback_movimentos(store_id, customer_id, criado_em);
alter table public.cashback_movimentos enable row level security;
drop policy if exists cashback_ler on public.cashback_movimentos;
create policy cashback_ler on public.cashback_movimentos for select to authenticated using (public.is_member(public.store_org(store_id)));

-- saldo: créditos dentro da validade menos os usos do mesmo período
create or replace function public.cashback_saldo_interno(p_org uuid, p_store uuid, p_customer uuid)
returns numeric language sql stable security definer set search_path = public as $$
  select case when not s.cashback_ativo then 0 else greatest(0, coalesce((
    select sum(m.valor) from cashback_movimentos m
    where m.store_id = p_store and m.customer_id = p_customer
      and (s.cashback_validade_dias is null or m.criado_em > now() - make_interval(days => s.cashback_validade_dias))
  ), 0)) end
  from stores s where s.id = p_store;
$$;

-- crédito automático quando o pedido é entregue (pedido com cliente identificado e loja com cashback ligado)
create or replace function public.cashback_creditar() returns trigger language plpgsql security definer set search_path = public as $$
declare v_pct numeric; v_ativo boolean;
begin
  if new.status <> 'entregue' or new.customer_id is null then return new; end if;
  if tg_op = 'UPDATE' and old.status = 'entregue' then return new; end if;
  select cashback_ativo, cashback_percentual into v_ativo, v_pct from stores where id = new.store_id;
  if not v_ativo or coalesce(v_pct, 0) <= 0 then return new; end if;
  insert into cashback_movimentos (store_id, customer_id, order_id, tipo, valor)
  values (new.store_id, new.customer_id, new.id, 'credito', round(greatest(new.subtotal - new.desconto, 0) * v_pct, 2))
  on conflict (order_id, tipo) do nothing;
  return new;
end $$;
drop trigger if exists cashback_creditar on public.orders;
create trigger cashback_creditar after insert or update of status on public.orders for each row execute function public.cashback_creditar();

-- pedido cancelado: devolve o cashback usado e tira o crédito
create or replace function public.cashback_estornar() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'cancelado' and old.status <> 'cancelado' then
    delete from cashback_movimentos where order_id = new.id;
    delete from cupom_usos where order_id = new.id;
  end if;
  return new;
end $$;

-- a demonstração ganha o cashback dos pedidos já entregues (para a vitrine mostrar saldo)
insert into public.cashback_movimentos (store_id, customer_id, order_id, tipo, valor)
select o.store_id, o.customer_id, o.id, 'credito', round(greatest(o.subtotal - o.desconto, 0) * s.cashback_percentual, 2)
from public.orders o join public.stores s on s.id = o.store_id
where s.demonstracao and o.status = 'entregue' and o.customer_id is not null
on conflict (order_id, tipo) do nothing;

-- ---------- Cupons ----------
create table if not exists public.cupons (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  codigo text not null check (codigo ~ '^[A-Z0-9]{3,20}$'),
  tipo text not null check (tipo in ('percentual', 'valor', 'entrega')),
  valor numeric(10,2) not null default 0 check (valor >= 0),
  minimo numeric(10,2) not null default 0 check (minimo >= 0),
  validade date,
  limite_total int check (limite_total is null or limite_total > 0),
  uma_por_cliente boolean not null default true,
  primeiro_pedido boolean not null default false,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  unique (store_id, codigo)
);
alter table public.cupons enable row level security;
drop policy if exists cupons_membros on public.cupons;
create policy cupons_membros on public.cupons for all to authenticated using (public.is_member(public.store_org(store_id))) with check (public.is_member(public.store_org(store_id)));
revoke all on public.cupons from anon;

create table if not exists public.cupom_usos (
  id bigserial primary key,
  cupom_id uuid not null references public.cupons(id) on delete cascade,
  order_id uuid references public.orders(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  desconto numeric(10,2) not null default 0,
  criado_em timestamptz not null default now()
);
alter table public.cupom_usos enable row level security;
drop policy if exists cupom_usos_ler on public.cupom_usos;
create policy cupom_usos_ler on public.cupom_usos for select to authenticated
  using (exists (select 1 from cupons c where c.id = cupom_id and public.is_member(public.store_org(c.store_id))));
revoke all on public.cupom_usos from anon;

alter table public.orders add column if not exists cupom_id uuid references public.cupons(id) on delete set null;
alter table public.orders add column if not exists cupom_codigo text;

drop trigger if exists cashback_estornar on public.orders;
create trigger cashback_estornar after update of status on public.orders for each row execute function public.cashback_estornar();

-- confere o cupom e calcula o desconto (o servidor decide, nunca o navegador)
create or replace function public.cupom_valido(p_store uuid, p_codigo text, p_customer uuid, p_subtotal numeric)
returns table (id uuid, tipo text, desconto numeric, erro text) language plpgsql stable security definer set search_path = public as $$
declare c cupons; v_usos int;
begin
  select * into c from cupons where store_id = p_store and codigo = upper(trim(p_codigo));
  if c.id is null or not c.ativo then return query select null::uuid, null::text, 0::numeric, 'Cupom não encontrado'; return; end if;
  if c.validade is not null and c.validade < (now() at time zone 'America/Sao_Paulo')::date then return query select null::uuid, null::text, 0::numeric, 'Este cupom venceu'; return; end if;
  if p_subtotal < c.minimo then return query select null::uuid, null::text, 0::numeric, 'Este cupom vale para pedidos a partir de R$ ' || to_char(c.minimo, 'FM999G990D00'); return; end if;
  if c.limite_total is not null then
    select count(*) into v_usos from cupom_usos where cupom_id = c.id;
    if v_usos >= c.limite_total then return query select null::uuid, null::text, 0::numeric, 'Este cupom já esgotou'; return; end if;
  end if;
  if p_customer is not null and c.uma_por_cliente and exists (select 1 from cupom_usos where cupom_id = c.id and customer_id = p_customer) then
    return query select null::uuid, null::text, 0::numeric, 'Você já usou este cupom'; return;
  end if;
  if c.primeiro_pedido and p_customer is not null and exists (select 1 from orders where customer_id = p_customer and store_id = p_store and status <> 'cancelado') then
    return query select null::uuid, null::text, 0::numeric, 'Este cupom é só para o primeiro pedido'; return;
  end if;
  return query select c.id, c.tipo,
    case c.tipo when 'percentual' then round(p_subtotal * least(c.valor, 100) / 100, 2) when 'valor' then least(c.valor, p_subtotal) else 0 end,
    null::text;
end $$;
revoke all on function public.cupom_valido(uuid, text, uuid, numeric) from public, anon, authenticated;

-- loja online: confere o cupom antes de fechar o pedido
create or replace function public.cupom_conferir(p_slug text, p_codigo text, p_telefone text, p_subtotal numeric)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare s stores; v_cli uuid; r record;
begin
  select * into s from stores where slug = p_slug and publicada;
  if s.id is null then return jsonb_build_object('erro', 'Loja não encontrada'); end if;
  select id into v_cli from customers where org_id = s.org_id and telefone = so_digitos(p_telefone);
  select * into r from cupom_valido(s.id, p_codigo, v_cli, p_subtotal);
  if r.erro is not null then return jsonb_build_object('erro', r.erro); end if;
  return jsonb_build_object('tipo', r.tipo, 'desconto', r.desconto, 'codigo', upper(trim(p_codigo)));
end $$;
grant execute on function public.cupom_conferir(text, text, text, numeric) to anon, authenticated;

-- painel: cupons com uso e vendas
create or replace function public.cupons_resumo(p_store uuid)
returns table (id uuid, usos bigint, desconto numeric, vendas numeric) language sql stable security definer set search_path = public as $$
  select c.id, count(u.id), coalesce(sum(u.desconto), 0), coalesce(sum(o.total), 0)
  from cupons c left join cupom_usos u on u.cupom_id = c.id left join orders o on o.id = u.order_id
  where c.store_id = p_store and public.is_member(public.store_org(p_store))
  group by c.id;
$$;
grant execute on function public.cupons_resumo(uuid) to authenticated;

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
  v_emb numeric := 0;
  v_cupom record;
  v_codigo text := upper(trim(coalesce(p->>'cupom', '')));
  v_usou_cashback boolean := false;
begin
  select null::uuid as id, null::text as tipo, 0::numeric as desconto, null::text as erro into v_cupom;  -- sem cupom
  select * into v_store from stores where slug = p_slug and publicada;
  if v_store.id is null then raise exception 'Loja não encontrada'; end if;
  if not v_store.aberta then raise exception 'A loja está fechada agora'; end if;
  if v_modo not in ('entrega', 'retirada', 'mesa') then raise exception 'Modo de pedido inválido'; end if;
  if v_pag not in ('pix', 'cartao', 'dinheiro', 'maquininha') then raise exception 'Forma de pagamento inválida'; end if;
  -- o que a loja aceita (Configurações do dono)
  if v_modo = 'entrega' and not v_store.entrega_ativa then raise exception 'Esta loja não está fazendo entregas agora'; end if;
  if v_modo = 'retirada' and not v_store.retirada_ativa then raise exception 'Esta loja não está aceitando retirada agora'; end if;
  if v_modo in ('entrega', 'retirada') then
    if v_pag = 'pix' and (not v_store.aceita_pix or (coalesce(v_store.pix_chave, '') = '' and not v_store.demonstracao)) then raise exception 'Esta loja não aceita Pix pelo site'; end if;
    if v_pag in ('cartao', 'maquininha') and not v_store.aceita_cartao then raise exception 'Esta loja não aceita cartão'; end if;
    if v_pag = 'dinheiro' and not v_store.aceita_dinheiro then raise exception 'Esta loja não aceita dinheiro'; end if;
  end if;
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

  -- pedido mínimo da loja e embalagem
  if v_modo in ('entrega', 'retirada') then
    if v_sub < coalesce(v_store.pedido_minimo_geral, 0) then
      raise exception 'O pedido mínimo da loja é R$ %', to_char(v_store.pedido_minimo_geral, 'FM999G990D00');
    end if;
    v_emb := coalesce(v_store.taxa_embalagem, 0);
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

  -- desconto: cupom OU cashback (nunca os dois)
  if v_codigo <> '' then
    select * into v_cupom from public.cupom_valido(v_store.id, v_codigo, v_cli, v_sub);
    if v_cupom.erro is not null then raise exception '%', v_cupom.erro; end if;
    if v_cupom.tipo = 'entrega' then v_taxa := 0; end if;
    v_desc := least(v_cupom.desconto, v_sub);
  elsif coalesce((p->>'usar_cashback')::boolean, false) and v_store.cashback_ativo then
    if v_sub >= coalesce(v_store.cashback_minimo_uso, 0) then
      v_desc := least(cashback_saldo_interno(v_store.org_id, v_store.id, v_cli), v_sub);
      v_usou_cashback := v_desc > 0;
    end if;
  end if;

  insert into orders (store_id, customer_id, modo, mesa, bairro_id, zone_id, endereco, ponto, subtotal, taxa_entrega, taxa_embalagem, desconto, total,
                      pagamento, pago, troco_para, observacao, utm, cupom_id, cupom_codigo)
  values (v_store.id, v_cli, v_modo, p->>'mesa', v_entrega->>'bairro_id', (v_entrega->>'zona_id')::uuid,
          case when v_modo = 'entrega' then jsonb_build_object(
            'rua', left(p->'endereco'->>'rua', 120), 'numero', left(p->'endereco'->>'numero', 20),
            'complemento', left(p->'endereco'->>'complemento', 160), 'bairro', v_entrega->>'bairro') end,
          v_ponto, round(v_sub, 2), v_taxa, v_emb, round(v_desc, 2), round(v_sub + v_taxa + v_emb - v_desc, 2),
          v_pag, false, nullif(p->>'troco_para', '')::numeric, left(p->>'observacao', 300), p->'utm',
          v_cupom.id, case when v_cupom.id is not null then v_codigo end)
  returning * into v_order;

  if v_cupom.id is not null then
    insert into public.cupom_usos (cupom_id, order_id, customer_id, desconto) values (v_cupom.id, v_order.id, v_cli, v_desc);
  end if;
  if v_usou_cashback then
    insert into public.cashback_movimentos (store_id, customer_id, order_id, tipo, valor) values (v_store.id, v_cli, v_order.id, 'uso', -v_desc);
  end if;

  insert into order_items (order_id, product_id, nome, qtd, unit, escolhas, obs)
  select v_order.id, (l->>'product_id')::uuid, l->>'nome', (l->>'qtd')::int, (l->>'unit')::numeric, l->'escolhas', l->>'obs'
  from jsonb_array_elements(v_linhas) l;

  return jsonb_build_object('id', v_order.id, 'numero', v_order.numero, 'total', v_order.total, 'desconto', v_order.desconto,
                            'taxa', v_order.taxa_entrega, 'embalagem', v_order.taxa_embalagem, 'status', v_order.status,
                            'tempo_min', coalesce((v_entrega->>'tempo_min')::int, 15), 'tempo_max', coalesce((v_entrega->>'tempo_max')::int, 25));
end $$;
