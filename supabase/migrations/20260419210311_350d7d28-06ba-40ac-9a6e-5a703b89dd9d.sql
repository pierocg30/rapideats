create extension if not exists pgcrypto;

create type order_status as enum (
  'created','payment_pending','payment_processed','restaurant_confirmed',
  'matched','picked_up','in_transit','delivered','cancelled','refunded'
);
create type saga_status as enum ('running','completed','failed','compensated');
create type circuit_status as enum ('closed','open','half_open');

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  restaurant_name text not null,
  items jsonb not null default '[]'::jsonb,
  total numeric(10,2) not null default 0,
  status order_status not null default 'created',
  driver_id uuid,
  pickup_lat double precision default 19.4326,
  pickup_lng double precision default -99.1332,
  dropoff_lat double precision default 19.4400,
  dropoff_lng double precision default -99.1500,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.drivers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  available boolean not null default true,
  current_lat double precision default 19.4326,
  current_lng double precision default -99.1332,
  created_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  topic text not null,
  aggregate_id uuid,
  payload jsonb not null default '{}'::jsonb,
  headers jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index events_topic_created_idx on public.events (topic, created_at desc);
create index events_agg_idx on public.events (aggregate_id);

create table public.processed_events (
  event_id uuid not null,
  consumer text not null,
  processed_at timestamptz not null default now(),
  primary key (event_id, consumer)
);

create table public.dlq (
  id uuid primary key default gen_random_uuid(),
  event_id uuid,
  topic text not null,
  consumer text not null,
  payload jsonb not null,
  error text,
  attempts int not null default 0,
  next_retry_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.circuit_state (
  service text primary key,
  status circuit_status not null default 'closed',
  failures int not null default 0,
  successes int not null default 0,
  window_start timestamptz not null default now(),
  opened_at timestamptz,
  updated_at timestamptz not null default now()
);

create table public.matching_state (
  order_id uuid primary key,
  payment_done boolean not null default false,
  restaurant_done boolean not null default false,
  expires_at timestamptz not null default (now() + interval '10 minutes'),
  matched_at timestamptz
);

create table public.saga_executions (
  id uuid primary key default gen_random_uuid(),
  saga_type text not null,
  order_id uuid,
  status saga_status not null default 'running',
  current_step int not null default 0,
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.saga_steps (
  id uuid primary key default gen_random_uuid(),
  saga_id uuid not null references public.saga_executions(id) on delete cascade,
  step_index int not null,
  name text not null,
  status text not null,
  output jsonb,
  error text,
  created_at timestamptz not null default now()
);

create table public.gps_pings (
  id bigserial primary key,
  order_id uuid not null,
  driver_id uuid,
  lat double precision not null,
  lng double precision not null,
  created_at timestamptz not null default now()
);
create index gps_order_idx on public.gps_pings (order_id, created_at desc);

alter table public.orders enable row level security;
alter table public.drivers enable row level security;
alter table public.events enable row level security;
alter table public.processed_events enable row level security;
alter table public.dlq enable row level security;
alter table public.circuit_state enable row level security;
alter table public.matching_state enable row level security;
alter table public.saga_executions enable row level security;
alter table public.saga_steps enable row level security;
alter table public.gps_pings enable row level security;

do $$
declare t text;
begin
  for t in select unnest(array['orders','drivers','events','processed_events','dlq','circuit_state','matching_state','saga_executions','saga_steps','gps_pings'])
  loop
    execute format('create policy "demo_all_%s" on public.%I for all using (true) with check (true);', t, t);
  end loop;
end$$;

alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.events;
alter publication supabase_realtime add table public.gps_pings;
alter publication supabase_realtime add table public.dlq;
alter publication supabase_realtime add table public.circuit_state;
alter publication supabase_realtime add table public.saga_executions;
alter publication supabase_realtime add table public.matching_state;

insert into public.drivers (name, current_lat, current_lng) values
  ('Ana Torres', 19.4330, -99.1340),
  ('Bruno Díaz', 19.4310, -99.1320),
  ('Carla Ruiz', 19.4350, -99.1310);