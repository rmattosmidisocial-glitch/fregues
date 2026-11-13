-- Taxa de serviço (10%) e couvert opcionais na mesa e no balcão.
-- Couvert da mesa = valor por pessoa x pessoas da comanda. No balcão = valor total informado.

alter table public.tabs add column if not exists couvert numeric(10,2) not null default 0 check (couvert >= 0);
alter table public.orders add column if not exists servico numeric(10,2) not null default 0;
alter table public.orders add column if not exists couvert numeric(10,2) not null default 0;

create or replace function public.fechar_comanda(p_comanda uuid, p_pagamentos jsonb, p_telefone text default null, p_nome text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  t public.tabs; v_org uuid; v_sub numeric; v_serv numeric; v_couv numeric; v_total numeric; v_pags jsonb;
  v_tel text := public.so_digitos(p_telefone); v_cli uuid; v_ped uuid; v_forma text; v_mesa int;
begin
  select * into t from public.tabs where id = p_comanda and status in ('aberta','conta') for update;
  if t.id is null then raise exception 'Comanda já fechada'; end if;
  v_org := public.store_org(t.store_id);
  if not public.is_member(v_org) then raise exception 'Sem permissão'; end if;
  select coalesce(sum(qtd * unit), 0) into v_sub from public.tab_items where tab_id = t.id and status <> 'cancelado';
  if v_sub <= 0 then raise exception 'Comanda sem itens. Para liberar a mesa, cancele a comanda.'; end if;
  v_serv := round(v_sub * t.taxa_servico / 100, 2);
  v_couv := round(coalesce(t.couvert, 0) * t.pessoas, 2);
  v_total := greatest(0, v_sub + v_serv + v_couv - t.desconto);
  v_pags := public._normalizar_pagamentos(p_pagamentos, v_total);
  select e->>'forma' into v_forma from jsonb_array_elements(v_pags) e order by (e->>'valor')::numeric desc limit 1;

  if v_tel is not null and length(v_tel) >= 10 then
    insert into public.customers (org_id, nome, telefone) values (v_org, coalesce(nullif(trim(p_nome), ''), 'Cliente do salão'), v_tel)
    on conflict (org_id, telefone) do update set nome = coalesce(nullif(nullif(trim(excluded.nome), ''), 'Cliente do salão'), public.customers.nome)
    returning id into v_cli;
  end if;

  select numero into v_mesa from public.dining_tables where id = t.table_id;
  insert into public.orders (store_id, customer_id, status, modo, mesa, subtotal, desconto, total, pagamento, pago, canal, pagamentos, caixa_id, observacao, servico, couvert)
  values (t.store_id, coalesce(v_cli, t.customer_id), 'entregue', 'mesa', v_mesa::text, v_sub, t.desconto, v_total, coalesce(v_forma, 'maquininha'), true, 'Salão', v_pags,
          public._caixa_aberto(t.store_id), nullif(concat_ws(' · ', case when v_serv > 0 then 'Serviço ' || t.taxa_servico || '%: ' || v_serv end,
            case when v_couv > 0 then 'Couvert ' || t.pessoas || 'x ' || t.couvert || ': ' || v_couv end), ''), v_serv, v_couv)
  returning id into v_ped;
  insert into public.order_items (order_id, product_id, nome, qtd, unit, obs)
  select v_ped, product_id, nome, qtd, unit, obs from public.tab_items where tab_id = t.id and status <> 'cancelado';
  update public.tabs set status = 'fechada', fechada_em = now(), pagamentos = v_pags, order_id = v_ped,
    customer_id = coalesce(v_cli, customer_id), telefone = coalesce(v_tel, telefone), cliente_nome = coalesce(nullif(trim(p_nome), ''), cliente_nome)
  where id = t.id;
  update public.table_calls set atendido_em = now() where table_id = t.table_id and atendido_em is null;
  return v_ped;
end $$;

drop function if exists public.venda_balcao(uuid, jsonb, jsonb, text, text, numeric);
create or replace function public.venda_balcao(p_store uuid, p_itens jsonb, p_pagamentos jsonb, p_telefone text default null, p_nome text default null, p_desconto numeric default 0,
  p_servico numeric default 0, p_couvert numeric default 0)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_org uuid := public.store_org(p_store); v_caixa uuid; i jsonb; pr public.products; v_sub numeric := 0; v_total numeric; v_serv numeric; v_couv numeric;
  v_tel text := public.so_digitos(p_telefone); v_cli uuid; v_ped uuid; v_num int; v_pags jsonb; v_forma text;
begin
  if not public.is_member(v_org) then raise exception 'Sem permissão'; end if;
  v_caixa := public._caixa_aberto(p_store);
  if v_caixa is null then raise exception 'Abra o caixa antes de vender'; end if;
  if jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) = 0 then raise exception 'Venda sem itens'; end if;
  for i in select * from jsonb_array_elements(p_itens) loop
    select * into pr from public.products where id = (i->>'produto')::uuid and store_id = p_store;
    if pr.id is null then raise exception 'Produto não está no cardápio'; end if;
    if pr.esgotado then raise exception '% acabou hoje', pr.nome; end if;
    v_sub := v_sub + coalesce(pr.preco_promo, pr.preco) * least(50, greatest(1, coalesce((i->>'qtd')::int, 1)));
  end loop;
  if coalesce(p_servico, 0) not between 0 and 30 then raise exception 'Serviço deve ser entre 0%% e 30%%'; end if;
  v_serv := round(v_sub * coalesce(p_servico, 0) / 100, 2);
  v_couv := round(greatest(0, coalesce(p_couvert, 0)), 2);
  v_total := greatest(0, v_sub + v_serv + v_couv - coalesce(p_desconto, 0));
  v_pags := public._normalizar_pagamentos(p_pagamentos, v_total);
  select e->>'forma' into v_forma from jsonb_array_elements(v_pags) e order by (e->>'valor')::numeric desc limit 1;

  if v_tel is not null and length(v_tel) >= 10 then
    insert into public.customers (org_id, nome, telefone) values (v_org, coalesce(nullif(trim(p_nome), ''), 'Cliente do balcão'), v_tel)
    on conflict (org_id, telefone) do update set nome = coalesce(nullif(nullif(trim(excluded.nome), ''), 'Cliente do balcão'), public.customers.nome)
    returning id into v_cli;
  end if;

  insert into public.orders (store_id, customer_id, status, modo, subtotal, desconto, total, pagamento, pago, canal, pagamentos, caixa_id, observacao, servico, couvert)
  values (p_store, v_cli, 'novo', 'balcao', v_sub, coalesce(p_desconto, 0), v_total, coalesce(v_forma, 'dinheiro'), true, 'Balcão', v_pags, v_caixa, nullif(trim(p_nome), ''), v_serv, v_couv)
  returning id, numero into v_ped, v_num;
  insert into public.order_items (order_id, product_id, nome, qtd, unit, obs)
  select v_ped, p.id, p.nome, least(50, greatest(1, coalesce((x->>'qtd')::int, 1))), coalesce(p.preco_promo, p.preco), left(nullif(trim(x->>'obs'), ''), 200)
  from jsonb_array_elements(p_itens) x join public.products p on p.id = (x->>'produto')::uuid;
  return jsonb_build_object('id', v_ped, 'numero', v_num, 'total', v_total, 'troco',
    round((select coalesce(sum((e->>'valor')::numeric), 0) from jsonb_array_elements(p_pagamentos) e) - v_total, 2));
end $$;

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
    'couvert', coalesce(t.couvert, 0), 'pessoas', coalesce(t.pessoas, 1),
    'itens', coalesce((select jsonb_agg(jsonb_build_object('nome', nome, 'qtd', qtd, 'unit', unit, 'status', status) order by criado_em)
                       from public.tab_items where tab_id = t.id and status <> 'cancelado'), '[]'::jsonb)
  );
end $$;

grant execute on function public.venda_balcao(uuid, jsonb, jsonb, text, text, numeric, numeric, numeric), public.fechar_comanda(uuid, jsonb, text, text) to authenticated;
revoke execute on function public.venda_balcao(uuid, jsonb, jsonb, text, text, numeric, numeric, numeric) from public, anon;
