create table if not exists watchlists (
  id text primary key,
  user_id text not null,
  name text not null,
  created_at timestamptz not null default now()
);
create unique index if not exists watchlists_user_name on watchlists (user_id, name);
create index if not exists watchlists_user_id_idx on watchlists (user_id);

create table if not exists watchlist_items (
  id text primary key,
  watchlist_id text not null,
  user_id text not null,
  symbol text not null,
  note_price numeric,
  added_at timestamptz not null default now(),
  unique (watchlist_id, symbol)
);
create index if not exists watchlist_items_list_idx on watchlist_items (watchlist_id);

create table if not exists visit_snapshots (
  id text primary key,
  user_id text not null,
  watchlist_id text not null,
  captured_at timestamptz not null default now()
);
create index if not exists visit_snapshots_list_idx on visit_snapshots (user_id, watchlist_id, captured_at desc);

create table if not exists snapshot_legs (
  snapshot_id text not null,
  symbol text not null,
  price numeric not null,
  volume numeric,
  as_of timestamptz,
  source text,
  primary key (snapshot_id, symbol)
);

create table if not exists user_demo (
  user_id text primary key,
  tape_frame text not null default 't1',
  vendor_broken boolean not null default false,
  seeded boolean not null default false
);
