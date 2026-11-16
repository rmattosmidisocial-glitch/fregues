-- 052 · Formulários: a equipe pode preencher pelo cliente e dar o "ok" nas respostas
-- (reserva de aniversário, evento, mesa). Quem responde com nome + WhatsApp continua entrando em Fregueses.

-- formulário que precisa do ok da equipe (reserva, aniversário, evento)
alter table public.forms add column if not exists confirmar boolean not null default false;
update public.forms set confirmar = true where not confirmar and nome ~* '(reserva|anivers|evento|festa)';

alter table public.form_respostas
  add column if not exists situacao text,
  add column if not exists origem text not null default 'cliente',
  add column if not exists telefone text,
  add column if not exists decidido_em timestamptz;
do $$ begin
  alter table public.form_respostas add constraint form_respostas_situacao_ck check (situacao is null or situacao in ('nova', 'confirmada', 'recusada'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.form_respostas add constraint form_respostas_origem_ck check (origem in ('cliente', 'equipe'));
exception when duplicate_object then null; end $$;
-- respostas antigas de formulários que pedem ok entram como novas
update public.form_respostas r set situacao = 'nova' from public.forms f where f.id = r.form_id and f.confirmar and r.situacao is null;

-- Grava a resposta (cliente ou equipe): confere obrigatórios e, com nome + WhatsApp, cria/atualiza o freguês.
create or replace function public.form_gravar(p_form uuid, p_valores jsonb, p_origem text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_form forms;
  v_store stores;
  c jsonb;
  v_val text;
  v_nome text;
  v_tel text;
  v_aniv date;
  v_id uuid;
begin
  select * into v_form from forms where id = p_form;
  if v_form.id is null then raise exception 'Formulário não encontrado'; end if;
  select * into v_store from stores where id = v_form.store_id;
  if jsonb_typeof(p_valores) <> 'object' or length(p_valores::text) > 6000 then raise exception 'Resposta inválida'; end if;

  for c in select * from jsonb_array_elements(v_form.campos) loop
    v_val := btrim(coalesce(p_valores->>(c->>'id'), ''));
    if coalesce((c->>'obrigatorio')::boolean, false) and v_val = '' then
      raise exception 'Falta responder: %', c->>'rotulo';
    end if;
    if v_val <> '' then
      if c->>'tipo' = 'nome' and v_nome is null then v_nome := left(v_val, 80); end if;
      if c->>'tipo' = 'telefone' and v_tel is null then v_tel := public.so_digitos(v_val); end if;
      if c->>'tipo' = 'data' and v_aniv is null and (c->>'rotulo') ~* '(aniv|nasc)' then
        begin v_aniv := v_val::date; exception when others then v_aniv := null; end;
      end if;
    end if;
  end loop;
  if v_tel is not null and length(v_tel) = 13 and v_tel like '55%' then v_tel := substr(v_tel, 3); end if;

  insert into form_respostas (form_id, store_id, cliente, valores, origem, telefone, situacao, decidido_em)
  values (v_form.id, v_form.store_id, v_nome, p_valores, p_origem, v_tel,
          case when v_form.confirmar then case when p_origem = 'equipe' then 'confirmada' else 'nova' end end,
          case when v_form.confirmar and p_origem = 'equipe' then now() end)
  returning id into v_id;

  if v_nome is not null and length(coalesce(v_tel, '')) between 10 and 11 then
    insert into customers (org_id, nome, telefone, aniversario, canal_origem)
    values (v_store.org_id, v_nome, v_tel, v_aniv, case when p_origem = 'equipe' then 'Balcão' else 'Formulário' end)
    on conflict (org_id, telefone) do update set
      -- a equipe pode corrigir o aniversário; o cliente só preenche se ainda não tinha
      aniversario = case when p_origem = 'equipe' then coalesce(excluded.aniversario, customers.aniversario) else coalesce(customers.aniversario, excluded.aniversario) end;
  end if;

  return jsonb_build_object('ok', true, 'id', v_id, 'obrigado', v_form.obrigado);
end $$;
revoke all on function public.form_gravar(uuid, jsonb, text) from public, anon, authenticated;

-- Cliente responde pelo link (só formulário no ar)
create or replace function public.form_responder(p_slug text, p_id uuid, p_valores jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  select f.id into v_id from forms f join stores s on s.id = f.store_id where s.slug = p_slug and f.id = p_id and f.estado = 'no ar';
  if v_id is null then raise exception 'Este formulário não está aceitando respostas'; end if;
  return public.form_gravar(v_id, p_valores, 'cliente');
end $$;
revoke all on function public.form_responder(text, uuid, jsonb) from public;
grant execute on function public.form_responder(text, uuid, jsonb) to anon, authenticated;

-- Equipe preenche pelo cliente (mesmo com o formulário pausado ou em rascunho); já entra confirmada
create or replace function public.form_responder_equipe(p_id uuid, p_valores jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_store uuid;
begin
  select store_id into v_store from forms where id = p_id;
  if v_store is null or not public.is_member(public.store_org(v_store)) then raise exception 'Sem acesso a este formulário'; end if;
  return public.form_gravar(p_id, p_valores, 'equipe');
end $$;
revoke all on function public.form_responder_equipe(uuid, jsonb) from public;
grant execute on function public.form_responder_equipe(uuid, jsonb) to authenticated;
