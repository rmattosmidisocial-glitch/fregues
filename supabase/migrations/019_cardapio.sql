-- 019: cadastro real do cardápio (foto do produto, salvar produto com complementos, fotos no Storage)

alter table public.products add column if not exists foto_url text;

-- Salva (cria ou edita) um produto com seus grupos de complementos, tudo de uma vez.
-- p = { id?, categoria, nome, descricao, preco, preco_promo, foto_url, mais_pedido, esgotado,
--       grupos: [{ nome, min, max, itens: [{ nome, preco }] }] }
create or replace function public.produto_salvar(p_store uuid, p jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cat uuid;
  v_id uuid := nullif(p->>'id', '')::uuid;
  v_nome text := btrim(coalesce(p->>'nome', ''));
  v_catnome text := btrim(coalesce(p->>'categoria', ''));
  v_preco numeric := (p->>'preco')::numeric;
  v_promo numeric := nullif(p->>'preco_promo', '')::numeric;
  v_g jsonb;
  v_o jsonb;
  v_gid uuid;
  v_gi int := 0;
  v_oi int;
  v_min int;
  v_max int;
begin
  if not public.is_member(public.store_org(p_store)) then raise exception 'Sem permissão para esta loja'; end if;
  if length(v_nome) < 2 then raise exception 'Dê um nome ao produto'; end if;
  if length(v_catnome) < 1 then raise exception 'Escolha uma categoria'; end if;
  if v_preco is null or v_preco < 0 then raise exception 'Preço inválido'; end if;
  if v_promo is not null and (v_promo < 0 or v_promo >= v_preco) then raise exception 'O preço promocional precisa ser menor que o preço normal'; end if;

  select id into v_cat from categories where store_id = p_store and lower(nome) = lower(v_catnome) limit 1;
  if v_cat is null then
    insert into categories (store_id, nome, ordem)
    values (p_store, v_catnome, coalesce((select max(ordem) + 1 from categories where store_id = p_store), 0))
    returning id into v_cat;
  end if;

  if v_id is null then
    insert into products (store_id, category_id, nome, descricao, preco, preco_promo, foto_url, arte, mais_pedido, esgotado, ordem)
    values (p_store, v_cat, v_nome, nullif(btrim(coalesce(p->>'descricao', '')), ''), v_preco, v_promo,
            nullif(p->>'foto_url', ''), 'sem', coalesce((p->>'mais_pedido')::boolean, false), coalesce((p->>'esgotado')::boolean, false),
            coalesce((select max(ordem) + 1 from products where store_id = p_store and category_id = v_cat), 0))
    returning id into v_id;
  else
    update products set
      category_id = v_cat,
      nome = v_nome,
      descricao = nullif(btrim(coalesce(p->>'descricao', '')), ''),
      preco = v_preco,
      preco_promo = v_promo,
      foto_url = nullif(p->>'foto_url', ''),
      mais_pedido = coalesce((p->>'mais_pedido')::boolean, false),
      esgotado = coalesce((p->>'esgotado')::boolean, false)
    where id = v_id and store_id = p_store;
    if not found then raise exception 'Produto não encontrado'; end if;
    delete from option_groups where product_id = v_id;
  end if;

  for v_g in select * from jsonb_array_elements(coalesce(p->'grupos', '[]'::jsonb)) loop
    if length(btrim(coalesce(v_g->>'nome', ''))) = 0 then continue; end if;
    v_min := greatest(coalesce((v_g->>'min')::int, 0), 0);
    v_max := greatest(coalesce((v_g->>'max')::int, 1), 1, v_min);
    insert into option_groups (product_id, nome, min, max, ordem)
    values (v_id, btrim(v_g->>'nome'), v_min, v_max, v_gi) returning id into v_gid;
    v_gi := v_gi + 1;
    v_oi := 0;
    for v_o in select * from jsonb_array_elements(coalesce(v_g->'itens', '[]'::jsonb)) loop
      if length(btrim(coalesce(v_o->>'nome', ''))) = 0 then continue; end if;
      insert into options (group_id, nome, preco, ordem)
      values (v_gid, btrim(v_o->>'nome'), greatest(coalesce(nullif(v_o->>'preco', '')::numeric, 0), 0), v_oi);
      v_oi := v_oi + 1;
    end loop;
  end loop;

  return v_id;
end $$;

revoke all on function public.produto_salvar(uuid, jsonb) from public, anon;
grant execute on function public.produto_salvar(uuid, jsonb) to authenticated;

-- Fotos dos produtos no Storage (bucket público para leitura; só a equipe da loja grava na pasta da loja)
do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public) values ('produtos', 'produtos', true) on conflict (id) do nothing;

    drop policy if exists produtos_ler on storage.objects;
    create policy produtos_ler on storage.objects for select using (bucket_id = 'produtos');

    drop policy if exists produtos_gravar on storage.objects;
    create policy produtos_gravar on storage.objects for insert to authenticated
      with check (bucket_id = 'produtos' and public.is_member(public.store_org(((storage.foldername(name))[1])::uuid)));

    drop policy if exists produtos_trocar on storage.objects;
    create policy produtos_trocar on storage.objects for update to authenticated
      using (bucket_id = 'produtos' and public.is_member(public.store_org(((storage.foldername(name))[1])::uuid)));

    drop policy if exists produtos_apagar on storage.objects;
    create policy produtos_apagar on storage.objects for delete to authenticated
      using (bucket_id = 'produtos' and public.is_member(public.store_org(((storage.foldername(name))[1])::uuid)));
  end if;
end $$;
