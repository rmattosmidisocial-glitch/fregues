-- 054 · Os planos passam a valer de verdade: limite de usuários e partes do sistema liberadas por plano.
-- Essencial: loja, pedidos, caixa, salão, cozinha, cardápio, mapa, fregueses, Pulso (até 3 usuários)
-- Completo: + atendimento com IA (e Copiloto), automações, formulários, links da bio (até 5 usuários)
-- Rede: tudo do Completo, usuários ilimitados, até 5 lojas

alter table public.plans
  add column if not exists usuarios int check (usuarios is null or usuarios > 0),
  add column if not exists lojas int check (lojas is null or lojas > 0),
  add column if not exists modulos text[] not null default '{}';

update public.plans set usuarios = 3, lojas = 1, modulos = '{}' where id = 'essencial';
update public.plans set usuarios = 5, lojas = 1, modulos = '{ia,automacoes,formularios,links}' where id = 'completo';
update public.plans set usuarios = null, lojas = 5, modulos = '{ia,automacoes,formularios,links}' where id = 'rede';

-- A organização tem essa parte do sistema no plano? (sem assinatura = sem limite, ex.: loja de demonstração)
create or replace function public.plano_tem(p_org uuid, p_modulo text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select p_modulo = any(p.modulos) from subscriptions s join plans p on p.id = s.plan_id where s.org_id = p_org), true);
$$;
grant execute on function public.plano_tem(uuid, text) to anon, authenticated;

-- Quantos usuários ainda cabem (null = ilimitado)
create or replace function public.plano_vagas(p_org uuid) returns int
language sql stable security definer set search_path = public as $$
  select case when p.usuarios is null then null else p.usuarios - (select count(*)::int from memberships m where m.org_id = p_org) end
  from subscriptions s join plans p on p.id = s.plan_id where s.org_id = p_org;
$$;
revoke all on function public.plano_vagas(uuid) from public, anon;
grant execute on function public.plano_vagas(uuid) to authenticated, service_role;

-- O painel pergunta o que o plano libera
create or replace function public.meu_plano(p_org uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare r jsonb;
begin
  if not public.is_member(p_org) then raise exception 'Sem acesso'; end if;
  select jsonb_build_object('plano', p.id, 'nome', p.nome, 'usuarios_max', p.usuarios, 'lojas_max', p.lojas, 'modulos', to_jsonb(p.modulos),
                            'usuarios', (select count(*) from memberships m where m.org_id = p_org))
    into r from subscriptions s join plans p on p.id = s.plan_id where s.org_id = p_org;
  return coalesce(r, jsonb_build_object('plano', null, 'modulos', '["ia","automacoes","formularios","links"]'::jsonb, 'usuarios', (select count(*) from memberships m where m.org_id = p_org)));
end $$;
revoke all on function public.meu_plano(uuid) from public, anon;
grant execute on function public.meu_plano(uuid) to authenticated;

-- Equipe: não passa do limite de usuários do plano (trocar a função de quem já é da equipe continua livre)
create or replace function public.equipe_vincular_srv(p_org uuid, p_user uuid, p_papel text) returns void
language plpgsql security definer set search_path = public as $$
declare v_vagas int;
begin
  if not exists (select 1 from memberships where org_id = p_org and user_id = p_user) then
    v_vagas := public.plano_vagas(p_org);
    if v_vagas is not null and v_vagas <= 0 then
      raise exception 'LIMITE_USUARIOS: o seu plano já usa todos os usuários. Para cadastrar mais pessoas, mude de plano.';
    end if;
  end if;
  insert into memberships (org_id, user_id, role) values (p_org, p_user, p_papel)
  on conflict (org_id, user_id) do update set role = excluded.role where memberships.role <> 'dono';
end $$;
revoke all on function public.equipe_vincular_srv(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.equipe_vincular_srv(uuid, uuid, text) to service_role;

-- Formulários: só abrem para o cliente se o plano tiver formulários
create or replace function public.form_publico(p_slug text, p_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', f.id, 'nome', f.nome, 'descricao', f.descricao, 'cor', f.cor, 'obrigado', f.obrigado,
                            'campos', f.campos, 'loja', s.nome, 'confirmar', f.confirmar)
  from forms f join stores s on s.id = f.store_id
  where s.slug = p_slug and f.id = p_id and f.estado = 'no ar' and public.plano_tem(s.org_id, 'formularios');
$$;
revoke all on function public.form_publico(text, uuid) from public;
grant execute on function public.form_publico(text, uuid) to anon, authenticated;

create or replace function public.form_responder(p_slug text, p_id uuid, p_valores jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  select f.id into v_id from forms f join stores s on s.id = f.store_id
  where s.slug = p_slug and f.id = p_id and f.estado = 'no ar' and public.plano_tem(s.org_id, 'formularios');
  if v_id is null then raise exception 'Este formulário não está aceitando respostas'; end if;
  return public.form_gravar(v_id, p_valores, 'cliente');
end $$;
revoke all on function public.form_responder(text, uuid, jsonb) from public;
grant execute on function public.form_responder(text, uuid, jsonb) to anon, authenticated;

create or replace function public.form_responder_equipe(p_id uuid, p_valores jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_store uuid;
begin
  select store_id into v_store from forms where id = p_id;
  if v_store is null or not public.is_member(public.store_org(v_store)) then raise exception 'Sem acesso a este formulário'; end if;
  if not public.plano_tem(public.store_org(v_store), 'formularios') then raise exception 'Formulários não fazem parte do seu plano'; end if;
  return public.form_gravar(p_id, p_valores, 'equipe');
end $$;
revoke all on function public.form_responder_equipe(uuid, jsonb) from public;
grant execute on function public.form_responder_equipe(uuid, jsonb) to authenticated;

-- Links da bio: a página pública só aparece no plano que tem links
drop policy if exists links_publico on public.link_pages;
create policy links_publico on public.link_pages for select to anon, authenticated
  using (public.store_visivel(store_id) and public.plano_tem(public.store_org(store_id), 'links'));

-- Automações: a fila de mensagens só existe no plano que tem automações
create or replace function public.automacao_liberada(p_store uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.plano_tem(public.store_org(p_store), 'automacoes');
$$;
grant execute on function public.automacao_liberada(uuid) to authenticated;

-- Atendimento com IA: sem IA no plano, a conversa vai direto para a equipe (a loja continua conversando com o cliente)
create or replace function public.chat_ia(p_token uuid, p_texto text, p_equipe boolean, p_humor text, p_titulo text, p_bairro text default null)
returns text language plpgsql security definer set search_path = public as $$
declare conv public.conversations; v_bairro text;
begin
  select * into conv from public.conversations where token = p_token;
  if conv.id is null then raise exception 'Conversa não encontrada'; end if;
  if conv.status = 'equipe' then return 'equipe'; end if;  -- a equipe assumiu: a automática fica quieta
  if not public.plano_tem(public.store_org(conv.store_id), 'ia') then
    if not exists (select 1 from public.messages where conversation_id = conv.id and autor = 'sistema') then
      insert into public.messages (conversation_id, autor, texto) values (conv.id, 'sistema', 'Recebemos sua mensagem. A equipe da loja responde por aqui.');
    end if;
    update public.conversations set status = 'equipe', nao_lida = true, atualizado_em = now() where id = conv.id;
    return 'equipe';
  end if;
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
revoke execute on function public.chat_ia(uuid, text, boolean, text, text, text) from public;
grant execute on function public.chat_ia(uuid, text, boolean, text, text, text) to anon, authenticated;

-- Admin define os acessos de cada plano (o texto de recursos continua sendo só a vitrine)
create or replace function public.admin_plano_limites(p_id text, p_usuarios int, p_lojas int, p_modulos text[]) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.exigir_admin();
  if p_usuarios is not null and p_usuarios < 1 then raise exception 'Usuários: no mínimo 1 (deixe vazio para ilimitado)'; end if;
  if p_lojas is not null and p_lojas < 1 then raise exception 'Lojas: no mínimo 1 (deixe vazio para ilimitado)'; end if;
  if exists (select 1 from unnest(coalesce(p_modulos, '{}')) m where m not in ('ia', 'automacoes', 'formularios', 'links')) then raise exception 'Acesso desconhecido'; end if;
  update public.plans set usuarios = p_usuarios, lojas = p_lojas, modulos = coalesce(p_modulos, '{}') where id = p_id;
  if not found then raise exception 'Plano não encontrado'; end if;
  perform public.registrar_auditoria(null, 'mudou os acessos do plano ' || p_id, jsonb_build_object('usuarios', p_usuarios, 'lojas', p_lojas, 'modulos', p_modulos));
end $$;
revoke all on function public.admin_plano_limites(text, int, int, text[]) from public, anon;
grant execute on function public.admin_plano_limites(text, int, int, text[]) to authenticated;
