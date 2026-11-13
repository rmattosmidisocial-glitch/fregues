-- O caixa passa a contar também as entregas pagas na prestação de contas do entregador
-- (pedido feito antes de abrir o caixa, mas recebido com ele aberto: vem marcado com caixa_id).
create or replace function public.caixa_resumo(p_caixa uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare c public.cash_sessions; r jsonb;
begin
  select * into c from public.cash_sessions where id = p_caixa;
  if c.id is null or not public.is_member(public.store_org(c.store_id)) then raise exception 'Sem permissão'; end if;
  with ped as (
    select o.* from public.orders o
    where o.store_id = c.store_id and o.pago and o.status <> 'cancelado'
      and (o.caixa_id = c.id
        or (o.caixa_id is null and o.created_at >= c.aberto_em and o.created_at <= coalesce(c.fechado_em, now())))
  ), pg as (
    select x->>'forma' as forma, (x->>'valor')::numeric as valor from ped p, jsonb_array_elements(p.pagamentos) x where p.pagamentos is not null
    union all
    select pagamento, total from ped where pagamentos is null
  ), mv as (select tipo, sum(valor) v from public.cash_moves where session_id = c.id group by tipo)
  select jsonb_build_object(
    'vendas', (select count(*) from ped),
    'total', coalesce((select sum(total) from ped), 0),
    'por_forma', coalesce((select jsonb_object_agg(forma, v) from (select forma, sum(valor) v from pg group by forma) a), '{}'::jsonb),
    'por_canal', coalesce((select jsonb_object_agg(canal, v) from (select case modo when 'mesa' then 'Salão' when 'balcao' then 'Balcão' else 'Delivery' end canal, sum(total) v from ped group by 1) b), '{}'::jsonb),
    'retiradas', coalesce((select v from mv where tipo = 'retirada'), 0),
    'reforcos', coalesce((select v from mv where tipo = 'reforco'), 0),
    'valor_inicial', c.valor_inicial
  ) into r;
  return r || jsonb_build_object('dinheiro_esperado',
    c.valor_inicial + coalesce((r->'por_forma'->>'dinheiro')::numeric, 0) + (r->>'reforcos')::numeric - (r->>'retiradas')::numeric);
end $$;

