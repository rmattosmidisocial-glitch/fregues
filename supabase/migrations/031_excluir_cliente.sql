-- 031: excluir um cliente de vez (loja, cardápio, pedidos, fregueses, faturas...).
-- Só o servidor chama (rota /api/admin/excluir, que confere se é o administrador).
-- Devolve os logins que eram só desta loja, para a rota apagar também.
create or replace function public.excluir_cliente_srv(p_org uuid)
returns table (user_id uuid) language plpgsql security definer set search_path = public as $$
declare v_users uuid[];
begin
  if not exists (select 1 from public.organizations where id = p_org) then raise exception 'Cliente não encontrado'; end if;
  if (select coalesce(demo, false) from public.organizations where id = p_org) then raise exception 'A loja de demonstração não pode ser excluída'; end if;
  select array_agg(m.user_id) into v_users from public.memberships m
   where m.org_id = p_org
     and not exists (select 1 from public.memberships x where x.user_id = m.user_id and x.org_id <> p_org)
     and not exists (select 1 from public.platform_admins a where a.user_id = m.user_id);
  delete from public.organizations where id = p_org;
  return query select unnest(coalesce(v_users, '{}'::uuid[]));
end $$;
revoke all on function public.excluir_cliente_srv(uuid) from public, anon, authenticated;
grant execute on function public.excluir_cliente_srv(uuid) to service_role;
