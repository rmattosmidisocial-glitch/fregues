-- 063: resumo dos prejuízos pelo custo (CMV), para o Caixa. Qualquer pessoa da equipe vê só os totais.
create or replace function public.prejuizo_resumo(p_store uuid, p_desde timestamptz)
returns jsonb language sql stable security definer set search_path = public as $$
  select case when public.is_member(public.store_org(p_store)) then jsonb_build_object(
    'total', coalesce(sum(custo), 0),
    'devolucao', coalesce(sum(custo) filter (where tipo = 'devolucao'), 0),
    'desperdicio', coalesce(sum(custo) filter (where tipo = 'desperdicio'), 0),
    'cortesia', coalesce(sum(custo) filter (where tipo = 'cortesia'), 0),
    'n', count(*)
  ) end
  from prejuizos where store_id = p_store and criado_em >= p_desde
$$;
grant execute on function public.prejuizo_resumo(uuid, timestamptz) to authenticated;
