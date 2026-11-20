-- 059: ficha técnica e CMV. A loja cadastra os insumos com o preço de compra (por kg, litro ou
-- unidade) e monta a receita de cada prato. O painel calcula o custo, o CMV (%) e o lucro de cada
-- prato. Custo é informação do dono: só dono e gerente leem e editam.

create table if not exists public.insumos (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  nome text not null check (char_length(trim(nome)) between 1 and 80),
  unidade text not null default 'kg' check (unidade in ('kg', 'l', 'un')),
  custo numeric(12,4) not null default 0 check (custo >= 0),
  criado_em timestamptz not null default now()
);
create index if not exists insumos_loja on public.insumos (store_id);

-- qtd: gramas (insumo em kg), mililitros (insumo em litro) ou unidades
create table if not exists public.fichas_tecnicas (
  product_id uuid not null references public.products(id) on delete cascade,
  insumo_id uuid not null references public.insumos(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  qtd numeric(10,3) not null check (qtd > 0),
  primary key (product_id, insumo_id)
);
create index if not exists fichas_loja on public.fichas_tecnicas (store_id);

alter table public.insumos enable row level security;
alter table public.fichas_tecnicas enable row level security;
drop policy if exists insumos_gestor on public.insumos;
create policy insumos_gestor on public.insumos for all to authenticated
  using (public.meu_papel(public.store_org(store_id)) in ('dono', 'gerente'))
  with check (public.meu_papel(public.store_org(store_id)) in ('dono', 'gerente'));
drop policy if exists fichas_gestor on public.fichas_tecnicas;
create policy fichas_gestor on public.fichas_tecnicas for all to authenticated
  using (public.meu_papel(public.store_org(store_id)) in ('dono', 'gerente'))
  with check (public.meu_papel(public.store_org(store_id)) in ('dono', 'gerente')
              and exists (select 1 from public.products p where p.id = product_id and p.store_id = fichas_tecnicas.store_id)
              and exists (select 1 from public.insumos i where i.id = insumo_id and i.store_id = fichas_tecnicas.store_id));

-- Exemplo pronto nas lojas de demonstração (só se ainda não tiverem insumos)
do $$
declare s record;
begin
  for s in select id from public.stores where demonstracao and not exists (select 1 from public.insumos i where i.store_id = stores.id) loop
    insert into public.insumos (store_id, nome, unidade, custo) values
      (s.id, 'Blend bovino', 'kg', 42), (s.id, 'Pão brioche', 'un', 1.6), (s.id, 'Queijo prato', 'kg', 48),
      (s.id, 'Cheddar fatiado', 'kg', 52), (s.id, 'Bacon', 'kg', 46), (s.id, 'Molho da casa', 'kg', 18),
      (s.id, 'Alface e tomate', 'kg', 12), (s.id, 'Batata congelada', 'kg', 16), (s.id, 'Embalagem', 'un', 1.2),
      (s.id, 'Refrigerante lata', 'un', 3.1);
    insert into public.fichas_tecnicas (product_id, insumo_id, store_id, qtd)
    select p.id, i.id, s.id, f.qtd
    from (values
      ('Smash da Penha', 'Blend bovino', 140), ('Smash da Penha', 'Pão brioche', 1), ('Smash da Penha', 'Queijo prato', 40), ('Smash da Penha', 'Molho da casa', 20), ('Smash da Penha', 'Embalagem', 1),
      ('Smash Bacon', 'Blend bovino', 140), ('Smash Bacon', 'Pão brioche', 1), ('Smash Bacon', 'Cheddar fatiado', 40), ('Smash Bacon', 'Bacon', 40), ('Smash Bacon', 'Embalagem', 1),
      ('X-Bacon Duplo', 'Blend bovino', 300), ('X-Bacon Duplo', 'Pão brioche', 1), ('X-Bacon Duplo', 'Bacon', 50), ('X-Bacon Duplo', 'Cheddar fatiado', 40), ('X-Bacon Duplo', 'Alface e tomate', 40), ('X-Bacon Duplo', 'Embalagem', 1),
      ('Batata rústica', 'Batata congelada', 300), ('Batata rústica', 'Molho da casa', 30), ('Batata rústica', 'Embalagem', 1),
      ('Refrigerante lata', 'Refrigerante lata', 1)
    ) as f(prato, insumo, qtd)
    join public.products p on p.store_id = s.id and p.nome = f.prato
    join public.insumos i on i.store_id = s.id and i.nome = f.insumo
    on conflict do nothing;
  end loop;
end $$;
