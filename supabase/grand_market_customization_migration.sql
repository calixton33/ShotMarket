-- Run this once in Supabase SQL Editor for an existing ShotMarket database.

alter table public.market_settings
add column if not exists grand_market_title text;

update public.market_settings
set grand_market_title = coalesce(
  nullif(grand_market_title, ''),
  'Will ' || tracked_person_name || ' drink ' || trim(to_char(grand_line, 'FM999999999.##')) || ' shots of alcohol?'
)
where id = 1;

alter table public.market_settings
alter column grand_market_title set default 'Will Jia Xuan drink 100 shots of alcohol?',
alter column grand_market_title set not null;

alter table public.events
add column if not exists counts_toward_grand boolean not null default true;
