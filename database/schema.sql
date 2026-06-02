create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

create table if not exists clientes (
  id text primary key default gen_random_uuid()::text,
  nome varchar(160) not null,
  telefone varchar(30),
  email varchar(160),
  observacoes text,
  created_at timestamptz not null default now()
);

create table if not exists produtos (
  id text primary key,
  nome varchar(180) not null,
  quantidade integer not null default 0 check (quantidade >= 0),
  preco numeric(12, 2) not null check (preco >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists vendas (
  id text primary key default gen_random_uuid()::text,
  cliente_id text references clientes(id) on delete set null,
  forma_pagamento varchar(40) not null,
  total numeric(12, 2) not null check (total >= 0),
  created_at timestamptz not null default now()
);

create table if not exists venda_itens (
  id text primary key default gen_random_uuid()::text,
  venda_id text not null references vendas(id) on delete cascade,
  produto_id text not null references produtos(id),
  produto_nome varchar(180) not null,
  quantidade integer not null check (quantidade > 0),
  preco_unitario numeric(12, 2) not null check (preco_unitario >= 0),
  subtotal numeric(12, 2) not null check (subtotal >= 0)
);

create table if not exists financeiro (
  id text primary key default gen_random_uuid()::text,
  tipo varchar(20) not null check (tipo in ('entrada', 'saida')),
  descricao varchar(220) not null,
  valor numeric(12, 2) not null check (valor > 0),
  venda_id text references vendas(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_clientes_nome on clientes using gin (nome gin_trgm_ops);
create index if not exists idx_produtos_nome on produtos using gin (nome gin_trgm_ops);
create index if not exists idx_vendas_created_at on vendas (created_at desc);
create index if not exists idx_financeiro_created_at on financeiro (created_at desc);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists produtos_set_updated_at on produtos;
create trigger produtos_set_updated_at
before update on produtos
for each row execute function set_updated_at();

alter table clientes enable row level security;
alter table produtos enable row level security;
alter table vendas enable row level security;
alter table venda_itens enable row level security;
alter table financeiro enable row level security;

drop policy if exists "authenticated read clientes" on clientes;
drop policy if exists "authenticated write clientes" on clientes;
drop policy if exists "authenticated read produtos" on produtos;
drop policy if exists "authenticated write produtos" on produtos;
drop policy if exists "authenticated read vendas" on vendas;
drop policy if exists "authenticated write vendas" on vendas;
drop policy if exists "authenticated read venda_itens" on venda_itens;
drop policy if exists "authenticated write venda_itens" on venda_itens;
drop policy if exists "authenticated read financeiro" on financeiro;
drop policy if exists "authenticated write financeiro" on financeiro;

create policy "authenticated read clientes" on clientes for select to authenticated using (true);
create policy "authenticated write clientes" on clientes for all to authenticated using (true) with check (true);
create policy "authenticated read produtos" on produtos for select to authenticated using (true);
create policy "authenticated write produtos" on produtos for all to authenticated using (true) with check (true);
create policy "authenticated read vendas" on vendas for select to authenticated using (true);
create policy "authenticated write vendas" on vendas for all to authenticated using (true) with check (true);
create policy "authenticated read venda_itens" on venda_itens for select to authenticated using (true);
create policy "authenticated write venda_itens" on venda_itens for all to authenticated using (true) with check (true);
create policy "authenticated read financeiro" on financeiro for select to authenticated using (true);
create policy "authenticated write financeiro" on financeiro for all to authenticated using (true) with check (true);
