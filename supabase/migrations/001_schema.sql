-- FREGUÊS · esquema principal
create extension if not exists postgis with schema extensions;
create extension if not exists pgcrypto with schema extensions;

-- ============ Geografia ============
create table public.geo_municipios (
  cod_ibge text primary key,
  nome text not null,
  uf text not null default 'RJ',
  geom extensions.geometry(MultiPolygon, 4326) not null
);
create index geo_municipios_geom_idx on public.geo_municipios using gist (geom);

create table public.geo_bairros (
  id text primary key,                 -- ex.: rio-13
  nome text not null,
  municipio_cod text references public.geo_municipios(cod_ibge),
  municipio_nome text not null,
  regiao text,
  fonte text not null,                 -- data_rio | ibge_2022 | osm | desenhado_pela_loja
  fonte_data date,
  geom extensions.geometry(MultiPolygon, 4326) not null
);
create index geo_bairros_geom_idx on public.geo_bairros using gist (geom);
create index geo_bairros_nome_idx on public.geo_bairros (nome);

-- ============ Organização e acesso ============
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  created_at timestamptz not null default now()
);

create table public.memberships (
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null,
  role text not null default 'dono' check (role in ('dono','gerente','caixa','cozinha','garcom','entregador')),
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,60}$'),
  nome text not null,
  bairro text,
  cidade text default 'Rio de Janeiro',
  localizacao extensions.geometry(Point, 4326),
  nota numeric(2,1) default 5.0,
  avaliacoes int default 0,
  horario text,
  aberta boolean not null default true,
  publicada boolean not null default true,
  comissao_marketplace numeric(5,4) not null default 0.12,
  cashback_percentual numeric(5,4) not null default 0.05,
  created_at timestamptz not null default now()
);

-- ============ Cardápio ============
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  nome text not null,
  ordem int not null default 0
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  codigo text,
  nome text not null,
  descricao text,
  preco numeric(10,2) not null check (preco >= 0),
  preco_promo numeric(10,2) check (preco_promo is null or preco_promo >= 0),
  arte text not null default 'smash',
  tags text[] not null default '{}',
  esgotado boolean not null default false,
  mais_pedido boolean not null default false,
  ordem int not null default 0
);
create index products_store_idx on public.products(store_id);

create table public.option_groups (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  nome text not null,
  min int not null default 0,
  max int not null default 1,
  ordem int not null default 0,
  check (min >= 0 and max >= 1 and min <= max)
);

create table public.options (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.option_groups(id) on delete cascade,
  nome text not null,
  preco numeric(10,2) not null default 0,
  ordem int not null default 0
);

-- ============ Entrega ============
create table public.delivery_zones (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  nome text not null,
  cor text not null default '#ff5b1f',
  taxa numeric(10,2) not null default 0,
  tempo_min int not null default 30,
  tempo_max int not null default 45,
  pedido_minimo numeric(10,2) not null default 0,
  gratis_acima numeric(10,2),
  ordem int not null default 0
);

create table public.zone_bairros (
  zone_id uuid not null references public.delivery_zones(id) on delete cascade,
  bairro_id text not null references public.geo_bairros(id),
  store_id uuid not null references public.stores(id) on delete cascade,
  primary key (zone_id, bairro_id),
  unique (store_id, bairro_id)          -- um bairro fica em uma zona por loja
);

create table public.zone_municipios (
  zone_id uuid not null references public.delivery_zones(id) on delete cascade,
  municipio_cod text not null references public.geo_municipios(cod_ibge),
  store_id uuid not null references public.stores(id) on delete cascade,
  primary key (zone_id, municipio_cod),
  unique (store_id, municipio_cod)
);

-- ============ Clientes e pedidos ============
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  nome text not null,
  telefone text not null,
  bairro_id text references public.geo_bairros(id),
  aniversario date,
  aceita_marketing boolean not null default false,
  aceita_marketing_em timestamptz,
  canal_origem text default 'Loja própria',
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (org_id, telefone)
);

create sequence public.order_number_seq start 1001;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  numero int not null default nextval('public.order_number_seq'),
  customer_id uuid references public.customers(id) on delete set null,
  status text not null default 'novo' check (status in ('novo','preparo','pronto','rota','entregue','cancelado')),
  modo text not null check (modo in ('entrega','retirada','mesa')),
  mesa text,
  bairro_id text references public.geo_bairros(id),
  zone_id uuid references public.delivery_zones(id) on delete set null,
  endereco jsonb,
  ponto extensions.geometry(Point, 4326),
  subtotal numeric(10,2) not null,
  taxa_entrega numeric(10,2) not null default 0,
  desconto numeric(10,2) not null default 0,
  total numeric(10,2) not null,
  pagamento text not null check (pagamento in ('pix','cartao','dinheiro','maquininha')),
  pago boolean not null default false,
  troco_para numeric(10,2),
  motoboy text,
  observacao text,
  canal text not null default 'Loja própria',
  utm jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_store_created_idx on public.orders(store_id, created_at desc);
create index orders_customer_idx on public.orders(customer_id, created_at desc);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  nome text not null,
  qtd int not null check (qtd between 1 and 50),
  unit numeric(10,2) not null,
  escolhas jsonb not null default '[]',
  obs text
);
create index order_items_order_idx on public.order_items(order_id);

create table public.out_of_area_leads (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  bairro_id text references public.geo_bairros(id),
  telefone text,
  aceita_aviso boolean not null default false,
  ponto extensions.geometry(Point, 4326),
  created_at timestamptz not null default now()
);

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
create trigger orders_touch before update on public.orders for each row execute function public.touch_updated_at();
