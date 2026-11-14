-- 049 · Conversa sobre o pedido pelo site: o cliente fala com a loja na tela de acompanhamento,
-- e a conversa chega no Atendimento do painel com o nome dele e o número do pedido.
create or replace function public.chat_pedido(p_slug text, p_order uuid, p_token uuid default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare s public.stores; o public.orders; conv public.conversations; v_nome text;
begin
  select * into s from public.stores where slug = p_slug;
  if s.id is null then raise exception 'Loja não encontrada'; end if;
  select * into o from public.orders where id = p_order and store_id = s.id;
  if o.id is null then raise exception 'Pedido não encontrado'; end if;
  if o.created_at < now() - interval '2 days' then raise exception 'Pedido antigo: fale com a loja pelos contatos dela'; end if;
  select nome into v_nome from public.customers where id = o.customer_id;

  if p_token is not null then
    select * into conv from public.conversations where token = p_token and store_id = s.id;
  end if;
  if conv.id is null then
    select * into conv from public.conversations where pedido_id = o.id order by criado_em desc limit 1;
  end if;
  if conv.id is null then
    insert into public.conversations (store_id, customer_id, cliente_nome, titulo, status, pedido_id)
    values (s.id, o.customer_id, coalesce(v_nome, 'Cliente do pedido'), 'Pedido #' || o.numero, 'equipe', o.id) returning * into conv;
    insert into public.messages (conversation_id, autor, texto) values (conv.id, 'sistema', 'Conversa sobre o pedido #' || o.numero || '. A equipe da loja responde por aqui.');
  elsif conv.pedido_id is distinct from o.id then
    update public.conversations set pedido_id = o.id, customer_id = coalesce(customer_id, o.customer_id),
      cliente_nome = coalesce(v_nome, cliente_nome), titulo = 'Pedido #' || o.numero, status = 'equipe', atualizado_em = now()
    where id = conv.id returning * into conv;
    insert into public.messages (conversation_id, autor, texto) values (conv.id, 'sistema', 'Conversa sobre o pedido #' || o.numero || '. A equipe da loja responde por aqui.');
  end if;
  return jsonb_build_object('token', conv.token, 'status', conv.status);
end $$;
revoke all on function public.chat_pedido(text, uuid, uuid) from public;
grant execute on function public.chat_pedido(text, uuid, uuid) to anon, authenticated;
