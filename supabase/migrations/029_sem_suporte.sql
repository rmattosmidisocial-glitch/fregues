-- 029: só quem tem o login da loja abre o painel dela. Desfaz o acesso de suporte do 027:
-- o administrador do Freguês cuida da carteira (Admin), mas não entra no painel dos clientes.
create or replace function public.is_member(p_org uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.memberships m where m.org_id = p_org and m.user_id = auth.uid());
$$;

-- Editar o cadastro do cliente pelo Admin.
create or replace function public.admin_editar_cliente(
  p_org uuid, p_empresa text, p_loja text, p_slug text, p_bairro text,
  p_responsavel text, p_telefone text, p_email text
) returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.exigir_admin();
  if coalesce(trim(p_empresa), '') = '' or coalesce(trim(p_loja), '') = '' then raise exception 'Preencha empresa e nome da loja'; end if;
  if p_slug !~ '^[a-z0-9-]{3,60}$' then raise exception 'Endereço inválido: use letras minúsculas, números e hífen'; end if;
  if exists (select 1 from public.stores where slug = p_slug and org_id <> p_org) then raise exception 'Esse endereço já está em uso'; end if;
  update public.organizations set nome = trim(p_empresa) where id = p_org;
  if not found then raise exception 'Cliente não encontrado'; end if;
  update public.stores set nome = trim(p_loja), slug = p_slug, bairro = trim(p_bairro) where org_id = p_org;
  update public.subscriptions set responsavel = trim(p_responsavel), telefone = trim(p_telefone),
    email = lower(trim(p_email)), atualizado_em = now() where org_id = p_org;
  perform public.registrar_auditoria(p_org, 'editou cadastro', jsonb_build_object('slug', p_slug));
end $$;
revoke all on function public.admin_editar_cliente(uuid, text, text, text, text, text, text, text) from public, anon;
grant execute on function public.admin_editar_cliente(uuid, text, text, text, text, text, text, text) to authenticated;
