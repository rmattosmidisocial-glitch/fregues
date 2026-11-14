-- 023: Formulários de verdade — salvos no banco, link público por loja, respostas gravadas,
-- e quem responde com nome + WhatsApp entra em Fregueses.

create table if not exists public.forms (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  nome text not null,
  descricao text not null default '',
  estado text not null default 'rascunho' check (estado in ('no ar', 'pausado', 'rascunho')),
  cor text not null default '#ff5b1f',
  obrigado text not null default 'Obrigado! Recebemos sua resposta.',
  campos jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists forms_store_idx on public.forms (store_id);

create table if not exists public.form_respostas (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.forms(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  cliente text,
  valores jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists form_respostas_idx on public.form_respostas (form_id, created_at desc);

alter table public.forms enable row level security;
alter table public.form_respostas enable row level security;
drop policy if exists forms_membro on public.forms;
create policy forms_membro on public.forms for all to authenticated
  using (public.is_member(public.store_org(store_id))) with check (public.is_member(public.store_org(store_id)));
drop policy if exists form_resp_membro on public.form_respostas;
create policy form_resp_membro on public.form_respostas for all to authenticated
  using (public.is_member(public.store_org(store_id))) with check (public.is_member(public.store_org(store_id)));

-- Página pública: só formulários "no ar" da própria loja
create or replace function public.form_publico(p_slug text, p_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', f.id, 'nome', f.nome, 'descricao', f.descricao, 'cor', f.cor, 'obrigado', f.obrigado,
                            'campos', f.campos, 'loja', s.nome)
  from forms f join stores s on s.id = f.store_id
  where s.slug = p_slug and f.id = p_id and f.estado = 'no ar';
$$;

-- Cliente responde. Confere obrigatórios, limita tamanho e, se tiver nome + WhatsApp, cria/atualiza o freguês.
create or replace function public.form_responder(p_slug text, p_id uuid, p_valores jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_form forms;
  v_store stores;
  c jsonb;
  v_val text;
  v_nome text;
  v_tel text;
  v_aniv date;
begin
  select f.* into v_form from forms f join stores s on s.id = f.store_id where s.slug = p_slug and f.id = p_id and f.estado = 'no ar';
  if v_form.id is null then raise exception 'Este formulário não está aceitando respostas'; end if;
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

  insert into form_respostas (form_id, store_id, cliente, valores) values (v_form.id, v_form.store_id, v_nome, p_valores);

  if v_nome is not null and length(coalesce(v_tel, '')) between 10 and 11 then
    insert into customers (org_id, nome, telefone, aniversario, canal_origem)
    values (v_store.org_id, v_nome, v_tel, v_aniv, 'Formulário')
    on conflict (org_id, telefone) do update set
      aniversario = coalesce(customers.aniversario, excluded.aniversario);
  end if;

  return jsonb_build_object('ok', true, 'obrigado', v_form.obrigado);
end $$;

revoke all on function public.form_publico(text, uuid) from public;
revoke all on function public.form_responder(text, uuid, jsonb) from public;
grant execute on function public.form_publico(text, uuid) to anon, authenticated;
grant execute on function public.form_responder(text, uuid, jsonb) to anon, authenticated;
