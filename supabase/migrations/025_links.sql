-- 025: Links da bio de verdade — pedido que veio da página de links é marcado e somado no painel.

-- A loja chama logo depois de criar o pedido, se o cliente chegou pela bio.
-- Só marca pedido recém-criado e ainda com o canal padrão (não dá para mexer em pedido antigo).
create or replace function public.pedido_origem(p_id uuid, p_origem text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_origem <> 'Link da bio' then return; end if;
  update orders set canal = 'Link da bio'
   where id = p_id and canal = 'Loja própria' and created_at > now() - interval '15 minutes';
end $$;

-- Painel: pedidos e vendas que vieram da bio nos últimos 30 dias
create or replace function public.links_vendas(p_store uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select case when public.is_member(public.store_org(p_store)) then
    jsonb_build_object('pedidos', count(*), 'receita', coalesce(sum(total), 0)) end
  from orders
  where store_id = p_store and canal = 'Link da bio' and status <> 'cancelado' and created_at > now() - interval '30 days';
$$;

revoke all on function public.pedido_origem(uuid, text) from public;
revoke all on function public.links_vendas(uuid) from public, anon;
grant execute on function public.pedido_origem(uuid, text) to anon, authenticated;
grant execute on function public.links_vendas(uuid) to authenticated;
