-- Atendimento real (fase 1): conversas da loja online salvas e visíveis no painel.
-- A resposta automática é calculada no navegador com os dados da casa e gravada aqui.

-- Resposta da atendente automática numa conversa (chamada pela loja, com o token do visitante)
create or replace function public.chat_ia(p_token uuid, p_texto text, p_equipe boolean, p_humor text, p_titulo text, p_bairro text default null)
returns text language plpgsql security definer set search_path = public as $$
declare conv public.conversations; v_bairro text;
begin
  select * into conv from public.conversations where token = p_token;
  if conv.id is null then raise exception 'Conversa não encontrada'; end if;
  if conv.status = 'equipe' then return 'equipe'; end if;  -- a equipe assumiu: a automática fica quieta
  if p_texto is null or length(trim(p_texto)) = 0 or length(p_texto) > 1500 then raise exception 'Resposta inválida'; end if;
  if (select count(*) from public.messages where conversation_id = conv.id and autor = 'ia' and criado_em > now() - interval '1 minute') >= 20 then
    raise exception 'Muitas respostas seguidas';
  end if;
  select id into v_bairro from public.geo_bairros where nome = p_bairro limit 1;
  insert into public.messages (conversation_id, autor, texto) values (conv.id, 'ia', trim(p_texto));
  if p_equipe then
    insert into public.messages (conversation_id, autor, texto) values (conv.id, 'sistema', 'A conversa foi passada para a equipe da loja.');
  end if;
  update public.conversations set
    status = case when p_equipe then 'equipe' else 'ia' end,
    humor = case when p_humor in ('positivo','negativo') then p_humor else humor end,
    titulo = case when coalesce(p_titulo, '') in ('', 'Saudação', 'Agradecimento') and titulo <> 'Nova conversa' then titulo else left(coalesce(nullif(p_titulo, ''), titulo), 80) end,
    bairro_id = coalesce(v_bairro, bairro_id),
    nao_lida = true, atualizado_em = now()
  where id = conv.id;
  return case when p_equipe then 'equipe' else 'ia' end;
end $$;

-- Jeito da atendente (nome, tom, emojis) para a loja pública
create or replace function public.chat_config(p_slug text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('nome', coalesce(a.nome_atendente, 'Bia'), 'tom', coalesce(a.tom, 'amigavel'), 'emojis', coalesce(a.emojis, true),
    'recomendar', coalesce(a.recomendar, true), 'passar_reclamacao', coalesce(a.passar_reclamacao, true))
  from public.stores s left join public.ai_settings a on a.store_id = s.id where s.slug = p_slug and s.publicada;
$$;

-- O cliente vê também o nome da atendente e se a equipe assumiu
create or replace function public.chat_status(p_token uuid) returns text
language sql stable security definer set search_path = public as $$
  select status from public.conversations where token = p_token;
$$;

revoke execute on function public.chat_ia(uuid, text, boolean, text, text, text), public.chat_config(text), public.chat_status(uuid) from public;
grant execute on function public.chat_ia(uuid, text, boolean, text, text, text), public.chat_config(text), public.chat_status(uuid) to anon, authenticated;

do $$ begin
  alter publication supabase_realtime add table public.conversations, public.messages;
exception when undefined_object then null; when duplicate_object then null; end $$;
