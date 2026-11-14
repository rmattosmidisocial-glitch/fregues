-- 038: Pix do próprio restaurante (o cliente paga direto na conta da loja).
alter table public.stores add column if not exists pix_chave text;
alter table public.stores add column if not exists pix_nome text;
alter table public.stores add column if not exists pix_cidade text;
