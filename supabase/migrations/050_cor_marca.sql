-- 050 · Aparência da loja: cor da marca do restaurante na loja online.
alter table public.stores add column if not exists cor_marca text;
do $$ begin
  alter table public.stores add constraint stores_cor_marca_ok check (cor_marca is null or cor_marca ~ '^#[0-9a-fA-F]{6}$');
exception when duplicate_object then null; end $$;
