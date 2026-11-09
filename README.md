# Freguês

CRM + loja com cardápio digital + entrega por bairro, para a gastronomia do Rio.
Uma solução MMATTOS Assessoria de MKT.

## O que tem aqui

- `src/` — o app (React + Vite + Tailwind). Site de vendas, painel do dono e loja do cliente.
- `supabase/migrations/` — o banco de dados completo (rode em ordem):
  - `001_schema.sql` — tabelas (lojas, cardápio, zonas de entrega, clientes, pedidos) com PostGIS
  - `002_seguranca_e_funcoes.sql` — segurança por linha (RLS) e funções: `place_order`, `resolve_delivery`, `pulse_summary`, `customer_pulse`
  - `003_geo.sql` — carga dos 92 municípios do RJ (IBGE 2024) e dos 1.509 bairros oficiais de 31 municípios (IBGE, Censo 2022)
  - `004_demo.sql` — loja de demonstração Brasa Burger e usuário de demonstração
  - `005_rotina_demo.sql` — recria a demonstração toda madrugada (se o pg_cron estiver ativo)
  - `006_crescer.sql` — automações, atendimento com IA (conversas e mensagens), formulários e links da bio
- `supabase/local-shim.sql` — só para testar num Postgres local; não roda no Supabase.

## Como funciona sem banco

Sem as variáveis de ambiente, o app abre em **modo demonstração**: tudo funciona com dados fictícios na memória do navegador.

## Ligando no Supabase

1. Crie o projeto (região São Paulo, `sa-east-1`).
2. Rode as migrações de `001` a `006`, em ordem.
3. No SQL Editor:
   ```sql
   create extension if not exists http with schema extensions;
   select public.importar_geo_da_internet('https://ENDERECO-DO-APP.vercel.app');
   select public.criar_usuario_demo('demo@fregues.app', 'brasa2026');
   select public.seed_demo();
   select public.seed_crescer();
   ```
4. Copie a URL do projeto e a chave pública (anon/publishable).

## Publicando na Vercel

Variáveis de ambiente:

```
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-publica
```

Comandos: `npm install` e `npm run build` (saída em `dist/`). Framework: Vite.

## Testar localmente

```
npm install
npm run dev
```

## O que ainda depende de contas suas

- **WhatsApp**: precisa de um número na API oficial da Meta (WhatsApp Cloud API).
- **Pix de verdade**: precisa de uma conta em um gateway (Mercado Pago, Asaas ou Efí). Hoje o Pix da loja de demonstração tem um botão "simular pagamento".
- **Municípios sem bairros oficiais** (61 dos 92, como Magé, Maricá e Petrópolis): o dono atende o município inteiro ou desenha as próprias zonas.
