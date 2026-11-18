-- Dois cardápios por loja (ex.: restaurante de dia, hamburgueria à noite).
-- Cada categoria pertence ao cardápio 1, ao 2 ou aos dois (0); a loja escolhe qual está no ar.
alter table public.categories add column if not exists cardapio smallint not null default 1;
alter table public.categories drop constraint if exists categories_cardapio_chk;
alter table public.categories add constraint categories_cardapio_chk check (cardapio in (0, 1, 2));

alter table public.stores add column if not exists cardapios_duplos boolean not null default false;
alter table public.stores add column if not exists cardapio_ativo smallint not null default 1;
alter table public.stores add column if not exists cardapio_nomes text[] not null default array['Dia', 'Noite'];
alter table public.stores drop constraint if exists stores_cardapio_ativo_chk;
alter table public.stores add constraint stores_cardapio_ativo_chk check (cardapio_ativo in (1, 2));
alter table public.stores drop constraint if exists stores_cardapio_nomes_chk;
alter table public.stores add constraint stores_cardapio_nomes_chk check (array_length(cardapio_nomes, 1) = 2);
