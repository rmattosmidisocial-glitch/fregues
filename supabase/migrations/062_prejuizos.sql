-- 062: prejuízos. Tudo o que a casa perdeu num lugar só:
--   devolucao   = venda que voltou (pedido devolvido/cancelado depois de feito)
--   desperdicio = prato ou insumo perdido (queimou, caiu, venceu, sobrou)
--   cortesia    = produto dado sem passar pelo caixa (cliente, equipe, parceiro)
-- O custo sai da ficha técnica (ou do preço do insumo) e o estoque baixa sozinho.

create table if not exists public.prejuizos (
  id bigint generated always as identity primary key,
  store_id uuid not null references public.stores(id) on delete cascade,
  tipo text not null check (tipo in ('devolucao', 'desperdicio', 'cortesia')),
  descricao text not null check (char_length(descricao) between 1 and 160),
  product_id uuid references public.products(id) on delete set null,
  insumo_id uuid references public.insumos(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  qtd numeric(10,3) not null default 1 check (qtd > 0),
  valor_venda numeric(10,2) not null default 0 check (valor_venda >= 0), -- quanto deixou de entrar no caixa
  custo numeric(10,2) not null default 0 check (custo >= 0),            -- quanto custou para a casa
  motivo text check (motivo is null or char_length(motivo) <= 160),
  quem text check (quem is null or char_length(quem) <= 120),           -- cortesia: para quem foi
  user_id uuid default auth.uid(),
  lancado_por text,
  criado_em timestamptz not null default now()
);
create index if not exists prejuizos_loja on public.prejuizos (store_id, criado_em desc);

alter table public.prejuizos enable row level security;
drop policy if exists prejuizos_ler on public.prejuizos;
create policy prejuizos_ler on public.prejuizos for select to authenticated
  using (public.meu_papel(public.store_org(store_id)) in ('dono', 'gerente'));

-- aviso no Pulso quando o prejuízo da semana passar deste valor (nulo = sem aviso)
alter table public.stores add column if not exists prejuizo_alerta numeric(10,2);

-- custo de 1 unidade do produto pela ficha técnica
create or replace function public._custo_produto(p_product uuid) returns numeric
language sql stable security definer set search_path = public as $$
  select coalesce(sum(ft.qtd / (case when i.unidade = 'un' then 1 else 1000 end) * i.custo), 0)
  from fichas_tecnicas ft join insumos i on i.id = ft.insumo_id where ft.product_id = p_product
$$;

-- tira do estoque o que foi perdido (produto pela ficha, ou o insumo direto)
create or replace function public._prejuizo_baixa(p_store uuid, p_product uuid, p_insumo uuid, p_qtd numeric, p_obs text, p_order uuid)
returns void language plpgsql security definer set search_path = public as $$
declare f record; v_q numeric; v_saldo numeric;
begin
  if p_product is not null then
    for f in select i.id, i.unidade, ft.qtd from fichas_tecnicas ft join insumos i on i.id = ft.insumo_id
             where ft.product_id = p_product and i.estoque is not null loop
      v_q := round(f.qtd * p_qtd / (case when f.unidade = 'un' then 1 else 1000 end), 3);
      update insumos set estoque = estoque - v_q where id = f.id returning estoque into v_saldo;
      insert into estoque_movimentos (store_id, insumo_id, tipo, qtd, saldo, order_id, obs) values (p_store, f.id, 'perda', -v_q, v_saldo, p_order, left(p_obs, 200));
    end loop;
  elsif p_insumo is not null then
    update insumos set estoque = estoque - p_qtd where id = p_insumo and estoque is not null returning estoque into v_saldo;
    if found then
      insert into estoque_movimentos (store_id, insumo_id, tipo, qtd, saldo, obs) values (p_store, p_insumo, 'perda', -p_qtd, v_saldo, left(p_obs, 200));
    end if;
  end if;
end $$;

-- Desperdício ou cortesia avulsa (produto do cardápio ou insumo). Qualquer pessoa da equipe lança.
-- p_qtd: unidades do produto, ou a quantidade do insumo na unidade de compra (kg, litro, unidade).
create or replace function public.prejuizo_lancar(p_store uuid, p_tipo text, p_product uuid, p_insumo uuid, p_qtd numeric, p_motivo text, p_quem text default null, p_nome text default null)
returns text language plpgsql security definer set search_path = public as $$
declare v_nome text; v_preco numeric := 0; v_custo numeric := 0; i record; p record;
begin
  if not public.is_member(public.store_org(p_store)) then return 'sem_permissao'; end if;
  if p_tipo not in ('desperdicio', 'cortesia') then return 'tipo_invalido'; end if;
  if p_qtd is null or p_qtd <= 0 or p_qtd > 10000 then return 'quantidade_invalida'; end if;
  if p_product is not null then
    select * into p from products where id = p_product and store_id = p_store;
    if p.id is null then return 'nao_encontrado'; end if;
    v_nome := p.nome; v_preco := coalesce(p.preco_promo, p.preco) * p_qtd; v_custo := public._custo_produto(p.id) * p_qtd;
  elsif p_insumo is not null then
    select * into i from insumos where id = p_insumo and store_id = p_store;
    if i.id is null then return 'nao_encontrado'; end if;
    v_nome := i.nome; v_custo := i.custo * p_qtd;
  else
    return 'sem_item';
  end if;
  insert into prejuizos (store_id, tipo, descricao, product_id, insumo_id, qtd, valor_venda, custo, motivo, quem, lancado_por)
  values (p_store, p_tipo, v_nome, p_product, p_insumo, p_qtd, round(v_preco, 2), round(v_custo, 2), nullif(left(trim(coalesce(p_motivo, '')), 160), ''), nullif(left(trim(coalesce(p_quem, '')), 120), ''), nullif(left(trim(coalesce(p_nome, '')), 80), ''));
  perform public._prejuizo_baixa(p_store, p_product, p_insumo, p_qtd, (case p_tipo when 'cortesia' then 'Cortesia' else 'Desperdício' end) || coalesce(': ' || nullif(trim(p_motivo), ''), ''), null);
  return 'ok';
end $$;

-- Mesa: o item vira cortesia. Sai da conta (preço zero) e fica registrado. A baixa no estoque
-- acontece quando a conta fecha, como os outros itens da mesa.
create or replace function public.item_cortesia(p_item uuid, p_motivo text, p_quem text default null, p_nome text default null)
returns text language plpgsql security definer set search_path = public as $$
declare it record; v_store uuid;
begin
  select ti.*, t.store_id as loja, t.status as st_comanda into it from tab_items ti join tabs t on t.id = ti.tab_id where ti.id = p_item;
  if it.id is null then return 'nao_encontrado'; end if;
  v_store := it.loja;
  if not public.is_member(public.store_org(v_store)) then return 'sem_permissao'; end if;
  if it.st_comanda not in ('aberta', 'conta') then return 'comanda_fechada'; end if;
  if it.unit = 0 then return 'ja_cortesia'; end if;
  insert into prejuizos (store_id, tipo, descricao, product_id, qtd, valor_venda, custo, motivo, quem, lancado_por)
  values (v_store, 'cortesia', it.nome, it.product_id, it.qtd, round(it.unit * it.qtd, 2), round(coalesce(public._custo_produto(it.product_id), 0) * it.qtd, 2),
          nullif(left(trim(coalesce(p_motivo, '')), 160), ''), nullif(left(trim(coalesce(p_quem, '')), 120), ''), nullif(left(trim(coalesce(p_nome, '')), 80), ''));
  update tab_items set unit = 0, obs = left('Cortesia' || coalesce(' · ' || nullif(trim(p_motivo), ''), '') || coalesce(' · ' || obs, ''), 200) where id = p_item;
  return 'ok';
end $$;

-- Pedido que voltou: sai do caixa (vira cancelado com o motivo) e entra nos prejuízos.
-- A comida já tinha sido feita: o estoque devolvido pelo cancelamento é baixado de novo como perda.
create or replace function public.pedido_devolver(p_pedido uuid, p_motivo text, p_nome text default null)
returns text language plpgsql security definer set search_path = public as $$
declare o record; it record; v_custo numeric := 0; v_saldo numeric;
begin
  select * into o from orders where id = p_pedido;
  if o.id is null then return 'nao_encontrado'; end if;
  if not public.is_member(public.store_org(o.store_id)) then return 'sem_permissao'; end if;
  if o.status = 'cancelado' then return 'ja_cancelado'; end if;
  for it in select product_id, qtd from order_items where order_id = o.id and product_id is not null loop
    v_custo := v_custo + public._custo_produto(it.product_id) * it.qtd;
  end loop;
  update orders set status = 'cancelado', cancelado_motivo = left('Devolvido' || coalesce(': ' || nullif(trim(p_motivo), ''), ''), 200) where id = o.id;
  -- o cancelamento devolveu ao estoque o que a venda tinha tirado; como a comida foi feita, tira de novo como perda
  for it in select insumo_id, sum(qtd) as q from estoque_movimentos where order_id = o.id and tipo = 'estorno' group by insumo_id having sum(qtd) > 0 loop
    update insumos set estoque = estoque - it.q where id = it.insumo_id and estoque is not null returning estoque into v_saldo;
    if found then
      insert into estoque_movimentos (store_id, insumo_id, tipo, qtd, saldo, order_id, obs) values (o.store_id, it.insumo_id, 'perda', -it.q, v_saldo, o.id, 'Devolução do pedido #' || o.numero);
    end if;
  end loop;
  insert into prejuizos (store_id, tipo, descricao, order_id, qtd, valor_venda, custo, motivo, lancado_por)
  values (o.store_id, 'devolucao', 'Pedido #' || o.numero, o.id, 1, coalesce(o.total, 0), round(v_custo, 2), nullif(left(trim(coalesce(p_motivo, '')), 160), ''), nullif(left(trim(coalesce(p_nome, '')), 80), ''));
  return 'ok';
end $$;

revoke execute on function public._custo_produto(uuid), public._prejuizo_baixa(uuid, uuid, uuid, numeric, text, uuid) from public, anon, authenticated;
grant execute on function public.prejuizo_lancar(uuid, text, uuid, uuid, numeric, text, text, text), public.item_cortesia(uuid, text, text, text), public.pedido_devolver(uuid, text, text) to authenticated;
