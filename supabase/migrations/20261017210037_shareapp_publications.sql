-- Store editable publication copy alongside each existing attribution link.
-- Existing links and attribution history remain valid.
alter table public.shareapp_links add column body text not null default '' check (length(body) <= 5000);
alter table public.shareapp_links add column updated_at timestamptz not null default now();
create index shareapp_links_history_idx on public.shareapp_links(store_id,member_id,created_at desc);
