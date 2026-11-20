-- 057: troca automática entre os dois cardápios pelo horário (hora de Brasília).
-- cardapio_horas = [início do cardápio 1, início do cardápio 2], ex.: {"06:00","18:00"}.
alter table public.stores add column if not exists cardapio_auto boolean not null default false;
alter table public.stores add column if not exists cardapio_horas text[] not null default array['06:00', '18:00'];
alter table public.stores drop constraint if exists stores_cardapio_horas_chk;
alter table public.stores add constraint stores_cardapio_horas_chk check (array_length(cardapio_horas, 1) = 2);
