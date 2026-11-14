-- 034: o dono coloca a loja no ar (ou tira) pelo painel. Loja suspensa ou cancelada não volta por aqui.
create or replace function public.loja_publicar(p_store uuid, p_no_ar boolean)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_org uuid; v_status text;
begin
  select org_id into v_org from public.stores where id = p_store;
  if v_org is null or not public.is_member(v_org) then raise exception 'Sem acesso a esta loja'; end if;
  select status into v_status from public.subscriptions where org_id = v_org;
  if p_no_ar and coalesce(v_status, 'teste') not in ('teste', 'ativa', 'atrasada') then
    raise exception 'A assinatura está %. Fale com a equipe do Freguês para reativar.', v_status;
  end if;
  update public.stores set publicada = p_no_ar where id = p_store;
  return p_no_ar;
end $$;
revoke all on function public.loja_publicar(uuid, boolean) from public, anon;
grant execute on function public.loja_publicar(uuid, boolean) to authenticated;
