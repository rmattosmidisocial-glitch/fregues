-- O administrador da plataforma (dono do Freguês) pode operar qualquer loja, como suporte:
-- abrir caixa, ver pedidos, salão etc. Clientes continuam vendo só a própria loja.
create or replace function public.is_member(p_org uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.memberships m where m.org_id = p_org and m.user_id = auth.uid())
      or exists (select 1 from public.platform_admins a where a.user_id = auth.uid());
$$;
