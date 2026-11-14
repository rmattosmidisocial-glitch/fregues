-- 037: cor própria de um bairro no mapa (no lugar da cor da zona).
alter table public.zone_bairros add column if not exists cor text check (cor is null or cor ~ '^#[0-9a-fA-F]{6}$');
