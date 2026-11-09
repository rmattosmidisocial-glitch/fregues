-- FREGUÊS · loja de demonstração (Brasa Burger) e usuário de demonstração

create or replace function public.seed_demo()
returns text language plpgsql security definer set search_path = public, extensions as $$
declare
  v_org uuid; v_store uuid; v_cat uuid; v_prod uuid; v_g uuid;
  v_z1 uuid; v_z2 uuid; v_z3 uuid;
  nomes text[] := array['Carlos','Ana','João','Mariana','Rafael','Juliana','Bruno','Camila','Diego','Fernanda','Thiago','Larissa','Rodrigo','Patrícia','Lucas','Aline','Felipe','Bianca','Gustavo','Renata','Marcelo','Tatiane','André','Priscila','Leandro','Vanessa','Wellington','Jéssica','Matheus','Daniela','Vinícius','Gabriela','Paulo','Carolina','Igor','Natália','Eduardo','Luana','Fábio','Amanda'];
  sobrenomes text[] := array['Silva','Santos','Oliveira','Souza','Lima','Pereira','Costa','Rodrigues','Almeida','Nascimento','Carvalho','Gomes','Martins','Araújo','Ribeiro','Barbosa','Rocha','Freitas','Moreira','Mendes'];
  z1 text[] := array['Vila da Penha','Vista Alegre','Irajá','Vicente de Carvalho','Vila Kosmos','Brás de Pina'];
  z2 text[] := array['Penha','Penha Circular','Cordovil','Colégio','Olaria','Rocha Miranda','Engenho da Rainha','Tomás Coelho'];
  z3 text[] := array['Madureira','Ramos','Vaz Lobo','Turiaçu','Coelho Neto','Parada de Lucas','Vigário Geral','Jardim América'];
  bairros_peso text[];
  prods uuid[]; precos numeric[]; pnomes text[];
  i int; k int; n int; v_cli uuid; v_int int; v_dias int; v_t timestamptz; v_fav int; v_ord uuid; v_sub numeric; v_q int; v_p int;
  v_bairro text; v_zona uuid; v_taxa numeric; v_tel text;
begin
  delete from organizations where id in (select org_id from stores where slug = 'brasa-burger');

  insert into organizations (nome) values ('Brasa Burger') returning id into v_org;
  insert into stores (org_id, slug, nome, bairro, localizacao, nota, avaliacoes, horario, demonstracao)
  values (v_org, 'brasa-burger', 'Brasa Burger', 'Vila da Penha', st_setsrid(st_makepoint(-43.3115, -22.8405), 4326), 4.8, 1284, 'Hoje, 18h às 23h30', true)
  returning id into v_store;

  -- Zonas
  insert into delivery_zones (store_id, nome, cor, taxa, tempo_min, tempo_max, pedido_minimo, gratis_acima, ordem)
  values (v_store, 'Vizinhança', '#ff5b1f', 4.90, 25, 35, 25, 80, 1) returning id into v_z1;
  insert into delivery_zones (store_id, nome, cor, taxa, tempo_min, tempo_max, pedido_minimo, ordem)
  values (v_store, 'Ao redor', '#ffc03a', 6.90, 35, 45, 30, 2) returning id into v_z2;
  insert into delivery_zones (store_id, nome, cor, taxa, tempo_min, tempo_max, pedido_minimo, ordem)
  values (v_store, 'Mais longe', '#2f7d77', 9.90, 45, 60, 40, 3) returning id into v_z3;
  insert into zone_bairros (zone_id, bairro_id, store_id) select v_z1, id, v_store from geo_bairros where municipio_nome = 'Rio de Janeiro' and nome = any(z1);
  insert into zone_bairros (zone_id, bairro_id, store_id) select v_z2, id, v_store from geo_bairros where municipio_nome = 'Rio de Janeiro' and nome = any(z2);
  insert into zone_bairros (zone_id, bairro_id, store_id) select v_z3, id, v_store from geo_bairros where municipio_nome = 'Rio de Janeiro' and nome = any(z3);

  -- Cardápio
  insert into categories (store_id, nome, ordem) values
    (v_store, 'Smash', 1), (v_store, 'Da casa', 2), (v_store, 'Combos', 3), (v_store, 'Porções', 4), (v_store, 'Bebidas', 5), (v_store, 'Sobremesas', 6);

  insert into products (store_id, category_id, codigo, nome, descricao, preco, preco_promo, arte, tags, esgotado, mais_pedido, ordem)
  select v_store, c.id, x.codigo, x.nome, x.descricao, x.preco, x.promo, x.arte, x.tags, x.esgotado, x.mais, x.ordem
  from (values
    ('p1','Smash','Smash da Penha','Dois smash de 70g, queijo prato derretido, picles e molho da casa no pão brioche.',27.90,null::numeric,'smash','{}'::text[],false,true,1),
    ('p2','Smash','Smash Bacon','Dois smash de 70g, cheddar, bacon crocante e cebola roxa.',31.90,null,'smash','{}',false,false,2),
    ('p3','Smash','Triplo Brasa','Três smash, três fatias de cheddar e maionese defumada. Para quem chegou com fome.',36.90,null,'duplo','{"Bem servido"}',false,false,3),
    ('p4','Da casa','X-Bacon Duplo','Dois blends de 150g, bacon, cheddar, alface, tomate e molho barbecue.',39.90,null,'duplo','{}',false,true,1),
    ('p5','Da casa','Brasa Clássico','Blend de 180g na brasa, queijo prato, alface, tomate e maionese verde.',32.90,null,'smash','{}',false,false,2),
    ('p6','Da casa','Frango Crocante','Sobrecoxa empanada no panko, coleslaw e maionese de limão.',29.90,null,'frango','{}',false,false,3),
    ('p7','Da casa','Vila Verde','Burger de grão-de-bico e cogumelos, queijo coalho, rúcula e tomate confit.',30.90,null,'veg','{"Vegetariano"}',false,false,4),
    ('p8','Combos','Combo Smash','Smash da Penha, batata média e bebida.',42.90,38.90,'combo','{}',false,false,1),
    ('p9','Combos','Combo Casal','Dois X-Bacon Duplo, batata grande com cheddar e bacon e duas bebidas.',104.90,94.90,'combo','{"Serve 2"}',false,false,2),
    ('p10','Porções','Batata rústica','Com páprica defumada e maionese da casa.',18.90,null,'batata','{}',false,false,1),
    ('p11','Porções','Batata cheddar e bacon','Batata frita coberta de cheddar cremoso e bacon.',26.90,null,'batata','{}',false,true,2),
    ('p12','Porções','Onion rings','Anéis de cebola empanados, com molho barbecue.',21.90,null,'onion','{}',true,false,3),
    ('p13','Bebidas','Refrigerante lata','Guaraná, Coca-Cola ou Coca Zero.',6.50,null,'refri','{}',false,false,1),
    ('p14','Bebidas','Suco de maracujá','Feito na hora, 400ml.',10.90,null,'suco','{}',false,false,2),
    ('p15','Bebidas','Milk-shake de Ovomaltine','500ml, cremoso de verdade.',19.90,null,'shake','{}',false,false,3),
    ('p16','Sobremesas','Brownie com sorvete','Brownie quente de chocolate meio amargo com bola de creme.',17.90,null,'brownie','{}',false,false,1)
  ) as x(codigo, cat, nome, descricao, preco, promo, arte, tags, esgotado, mais, ordem)
  join categories c on c.store_id = v_store and c.nome = x.cat;

  -- Complementos
  for v_prod in select id from products where store_id = v_store and codigo in ('p1','p2','p3','p4','p5','p6','p8') loop
    insert into option_groups (product_id, nome, min, max, ordem) values (v_prod, 'Turbine seu burger', 0, 4, 2) returning id into v_g;
    insert into options (group_id, nome, preco, ordem) values (v_g, 'Bacon crocante', 5, 1), (v_g, 'Cheddar cremoso extra', 4, 2), (v_g, 'Ovo na chapa', 3, 3), (v_g, 'Cebola caramelizada', 3.5, 4);
  end loop;
  for v_prod in select id from products where store_id = v_store and codigo in ('p4','p5') loop
    insert into option_groups (product_id, nome, min, max, ordem) values (v_prod, 'Ponto da carne', 1, 1, 1) returning id into v_g;
    insert into options (group_id, nome, preco, ordem) values (v_g, 'Ao ponto', 0, 1), (v_g, 'Ao ponto para mais', 0, 2), (v_g, 'Bem passado', 0, 3);
  end loop;
  for v_prod in select id from products where store_id = v_store and codigo in ('p8','p9') loop
    insert into option_groups (product_id, nome, min, max, ordem) values (v_prod, 'Bebida do combo', 1, 1, 1) returning id into v_g;
    insert into options (group_id, nome, preco, ordem) values (v_g, 'Guaraná lata', 0, 1), (v_g, 'Coca-Cola lata', 0, 2), (v_g, 'Suco de maracujá', 3, 3);
  end loop;

  select array_agg(id order by codigo::text), array_agg(coalesce(preco_promo, preco) order by codigo::text), array_agg(nome order by codigo::text)
    into prods, precos, pnomes from products where store_id = v_store and not esgotado;

  -- Clientes e histórico de 12 meses
  bairros_peso := z1 || z1 || z1 || z1 || z1 || z2 || z2 || z2 || z3;
  perform setseed(0.42);
  for i in 1..300 loop
    v_tel := '2199' || lpad((floor(random() * 9999999))::int::text, 7, '0');
    v_bairro := bairros_peso[1 + floor(random() * array_length(bairros_peso, 1))::int];
    insert into customers (org_id, nome, telefone, bairro_id, aceita_marketing, aceita_marketing_em, canal_origem, aniversario, created_at)
    values (v_org, nomes[1 + floor(random() * 40)::int] || ' ' || sobrenomes[1 + floor(random() * 20)::int], v_tel,
            (select id from geo_bairros where nome = v_bairro and municipio_nome = 'Rio de Janeiro'), random() < 0.85, now(),
            (array['Loja própria','Loja própria','WhatsApp','Salão'])[1 + floor(random() * 4)::int],
            case when random() < 0.4 then date '1990-01-01' + (floor(random() * 365))::int end, now() - interval '400 days')
    on conflict (org_id, telefone) do nothing
    returning id into v_cli;
    continue when v_cli is null;

    v_int := 5 + floor(random() * 25)::int;
    v_dias := greatest(1, round(v_int * case when random() < 0.62 then random() * 1.2 when random() < 0.55 then 1.3 + random() * 0.6 else 2.1 + random() * 3 end))::int;
    v_fav := 1 + floor(random() * array_length(prods, 1))::int;
    v_t := now() - make_interval(days => v_dias) - make_interval(hours => floor(random() * 3)::int);
    v_zona := (select zone_id from zone_bairros where store_id = v_store and bairro_id = (select bairro_id from customers where id = v_cli));
    v_taxa := coalesce((select taxa from delivery_zones where id = v_zona), 0);
    n := 0;
    while v_t > now() - interval '365 days' and n < 60 loop
      v_t := date_trunc('day', v_t) + make_interval(hours => 18 + floor(random() * 5)::int, mins => floor(random() * 60)::int);
      insert into orders (store_id, customer_id, status, modo, bairro_id, zone_id, subtotal, taxa_entrega, total, pagamento, pago, created_at, updated_at)
      values (v_store, v_cli, 'entregue', 'entrega', (select bairro_id from customers where id = v_cli), v_zona, 0, v_taxa, 0,
              (array['pix','pix','cartao','dinheiro'])[1 + floor(random() * 4)::int], true, v_t, v_t)
      returning id into v_ord;
      v_sub := 0;
      for k in 1..(1 + floor(random() * 3)::int) loop
        v_p := case when k = 1 and random() < 0.7 then v_fav else 1 + floor(random() * array_length(prods, 1))::int end;
        v_q := case when random() < 0.8 then 1 else 2 end;
        insert into order_items (order_id, product_id, nome, qtd, unit) values (v_ord, prods[v_p], pnomes[v_p], v_q, precos[v_p]);
        v_sub := v_sub + precos[v_p] * v_q;
      end loop;
      update orders set subtotal = v_sub, total = v_sub + v_taxa where id = v_ord;
      -- alguns fregueses tinham sumido e voltaram este mês
      if n = 0 and v_dias <= 8 and random() < 0.3 then
        v_t := v_t - make_interval(days => round(v_int * 2.6)::int);
      else
        v_t := v_t - make_interval(days => greatest(2, round(v_int * (0.7 + random() * 0.6)))::int);
      end if;
      n := n + 1;
    end loop;
  end loop;

  -- Pedidos acontecendo agora
  perform seed_demo_pedidos_ao_vivo(v_store);

  -- Procura de fora da área (últimos 30 dias)
  insert into out_of_area_leads (store_id, bairro_id, aceita_aviso, created_at)
  select v_store, b.id, true, now() - make_interval(days => floor(random() * 29)::int)
  from (values ('Bonsucesso', 31), ('Pavuna', 23), ('Acari', 14), ('Méier', 12), ('Cachambi', 9), ('Jardim Guanabara', 9), ('Inhaúma', 7)) d(nome, qtd)
  join geo_bairros b on b.nome = d.nome and b.municipio_nome = 'Rio de Janeiro'
  cross join lateral generate_series(1, d.qtd);

  -- Usuário de demonstração vira gerente da loja
  insert into memberships (org_id, user_id, role)
  select v_org, id, 'gerente' from auth.users where email = 'demo@fregues.app'
  on conflict do nothing;

  return 'Brasa Burger criada';
end $$;

create or replace function public.seed_demo_pedidos_ao_vivo(p_store uuid)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare
  r record; v_cli uuid; v_ord uuid; v_tel text;
begin
  for r in select * from (values
    ('Larissa Gomes','Vista Alegre','novo','entrega','pix',true,1,array['p1','p1','p10','p13','p13'],null::text,null::text),
    ('Rodrigo Martins','Penha','novo','entrega','cartao',true,3,array['p8'],null,null),
    ('Mesa 4','Vila da Penha','preparo','mesa','maquininha',false,6,array['p5','p15'],null,null),
    ('Ana Paula Ribeiro','Vista Alegre','preparo','entrega','pix',true,9,array['p9'],'Sem cebola em um dos burgers',null),
    ('Felipe Araújo','Irajá','pronto','entrega','dinheiro',false,14,array['p3','p11'],null,null),
    ('Bianca Rocha','Vila da Penha','pronto','retirada','pix',true,17,array['p6','p6'],null,null),
    ('Thiago Freitas','Olaria','rota','entrega','cartao',true,24,array['p4','p14'],null,'Marquinhos'),
    ('Juliana Costa','Vicente de Carvalho','rota','entrega','pix',true,29,array['p2','p16'],null,'Dudu'),
    ('Marcelo Souza','Brás de Pina','entregue','entrega','pix',true,41,array['p8'],null,'Marquinhos')
  ) x(nome, bairro, status, modo, pag, pago, minutos, itens, obs, moto) loop
    v_tel := '2198' || lpad((floor(random() * 9999999))::int::text, 7, '0');
    insert into customers (org_id, nome, telefone, bairro_id)
    values (store_org(p_store), r.nome, v_tel, (select id from geo_bairros where nome = r.bairro and municipio_nome = 'Rio de Janeiro'))
    returning id into v_cli;
    insert into orders (store_id, customer_id, status, modo, mesa, bairro_id, zone_id, subtotal, taxa_entrega, total, pagamento, pago,
                        observacao, motoboy, created_at, endereco)
    select p_store, v_cli, r.status, r.modo, case when r.modo = 'mesa' then '4' end, b.id, zb.zone_id, 0,
           case when r.modo = 'entrega' then coalesce(z.taxa, 0) else 0 end, 0, r.pag, r.pago, r.obs, r.moto,
           now() - make_interval(mins => r.minutos),
           case when r.modo = 'entrega' then jsonb_build_object('rua', 'Rua de exemplo', 'numero', '120', 'bairro', r.bairro) end
    from geo_bairros b left join zone_bairros zb on zb.bairro_id = b.id and zb.store_id = p_store left join delivery_zones z on z.id = zb.zone_id
    where b.nome = r.bairro and b.municipio_nome = 'Rio de Janeiro'
    returning id into v_ord;
    insert into order_items (order_id, product_id, nome, qtd, unit)
    select v_ord, p.id, p.nome, count(*), coalesce(p.preco_promo, p.preco)
    from unnest(r.itens) c join products p on p.codigo = c and p.store_id = p_store group by p.id;
    update orders o set subtotal = s.sub, total = s.sub + o.taxa_entrega
    from (select sum(qtd * unit) sub from order_items where order_id = v_ord) s where o.id = v_ord;
  end loop;
end $$;

-- Recria a demonstração do zero (pode rodar toda madrugada)
create or replace function public.resetar_demo() returns text language sql security definer set search_path = public as $$
  select public.seed_demo();
$$;

-- Usuário de demonstração (só no Supabase, onde a tabela auth.users existe de verdade)
create or replace function public.criar_usuario_demo(p_email text, p_senha text)
returns uuid language plpgsql security definer set search_path = public, extensions, auth as $$
declare v_id uuid;
begin
  select id into v_id from auth.users where email = p_email;
  if v_id is null then
    v_id := gen_random_uuid();
    insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
                            created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
    values (v_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', p_email, crypt(p_senha, gen_salt('bf')), now(),
            '{"provider":"email","providers":["email"]}', '{"nome":"Demonstração"}', now(), now(), '', '', '', '');
    insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (v_id::text, v_id, jsonb_build_object('sub', v_id::text, 'email', p_email, 'email_verified', true), 'email', now(), now(), now());
  end if;
  return v_id;
end $$;

revoke execute on function public.seed_demo(), public.seed_demo_pedidos_ao_vivo(uuid), public.resetar_demo(), public.criar_usuario_demo(text, text) from public, anon, authenticated;
