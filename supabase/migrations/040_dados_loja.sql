-- 040: dados da loja editáveis pelo dono (aparecem na loja online).
alter table public.stores add column if not exists descricao text;
alter table public.stores add column if not exists whatsapp text;
alter table public.stores add column if not exists instagram text;
alter table public.stores add column if not exists logo_url text;
alter table public.stores add column if not exists capa_url text;
