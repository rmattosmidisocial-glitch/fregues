-- Pedido feito pelo cliente no QR da mesa: o garçom confirma antes de ir para a cozinha.
-- A casa escolhe (stores.mesa_confirmar). Padrão: garçom confirma.

alter table public.stores add column if not exists mesa_confirmar boolean not null default true;
alter table public.tab_items drop constraint if exists tab_items_status_check;
alter table public.tab_items add constraint tab_items_status_check check (status in ('aguardando','novo','preparo','pronto','entregue','cancelado'));

create or replace function public._lancar(p_comanda uuid, p_itens jsonb, p_origem text)
returns int language plpgsql security definer set search_path = public as $$
declare t public.tabs; i jsonb; pr public.products; n int := 0; v_status text := 'novo';
begin
  select * into t from public.tabs where id = p_comanda and status in ('aberta','conta');
  if t.id is null then raise exception 'Comanda fechada ou inexistente'; end if;
  -- pedido feito pelo cliente no QR espera o garçom confirmar (se a casa quiser assim)
  if p_origem = 'cliente' and (select mesa_confirmar from public.stores where id = t.store_id) then v_status := 'aguardando'; end if;
  if jsonb_array_length(p_itens) > 40 then raise exception 'Itens demais de uma vez'; end if;
  for i in select * from jsonb_array_elements(p_itens) loop
    select * into pr from public.products where id = (i->>'produto')::uuid and store_id = t.store_id;
    if pr.id is null then raise exception 'Produto não está no cardápio'; end if;
    if pr.esgotado then raise exception '% acabou hoje', pr.nome; end if;
    insert into public.tab_items (tab_id, product_id, nome, qtd, unit, obs, origem, status)
    values (t.id, pr.id, pr.nome, least(50, greatest(1, coalesce((i->>'qtd')::int, 1))), coalesce(pr.preco_promo, pr.preco), left(nullif(trim(i->>'obs'), ''), 200), p_origem, v_status);
    n := n + 1;
  end loop;
  if t.status = 'conta' then update public.tabs set status = 'aberta' where id = t.id; end if;
  return n;
end $$;

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
  select coalesce(sum(qtd * unit), 0) into v_sub from public.tab_items where tab_id = t.id and status not in ('cancelado','aguardando');
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
  select v_ped, product_id, nome, qtd, unit, obs from public.tab_items where tab_id = t.id and status not in ('cancelado','aguardando');
  -- pedidos do QR que o garçom não confirmou não entram na conta
  update public.tab_items set status = 'cancelado' where tab_id = t.id and status = 'aguardando';
  update public.tabs set status = 'fechada', fechada_em = now(), pagamentos = v_pags, order_id = v_ped,
    customer_id = coalesce(v_cli, customer_id), telefone = coalesce(v_tel, telefone), cliente_nome = coalesce(nullif(trim(p_nome), ''), cliente_nome)
  where id = t.id;
  update public.table_calls set atendido_em = now() where table_id = t.table_id and atendido_em is null;
  return v_ped;
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
    'couvert', coalesce(t.couvert, 0), 'pessoas', coalesce(t.pessoas, 1), 'confirmar', s.mesa_confirmar,
    'itens', coalesce((select jsonb_agg(jsonb_build_object('nome', nome, 'qtd', qtd, 'unit', unit, 'status', status) order by criado_em)
                       from public.tab_items where tab_id = t.id and status <> 'cancelado'), '[]'::jsonb)
  );
end $$;
