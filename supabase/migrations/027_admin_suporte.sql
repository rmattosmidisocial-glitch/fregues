-- 027: o administrador do Freguês (suporte) pode abrir e configurar o painel de qualquer loja.
-- Clientes continuam vendo só a própria loja. (Mesmo conteúdo do 010, que não tinha sido aplicado.)
create or replace function public.is_member(p_org uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.memberships m where m.org_id = p_org and m.user_id = auth.uid())
      or exists (select 1 from public.platform_admins a where a.user_id = auth.uid());
$$;
