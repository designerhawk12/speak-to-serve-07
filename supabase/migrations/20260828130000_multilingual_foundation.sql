-- Multilingual presentation foundation. Source text remains authoritative.
alter table public.grievances
  add column original_language text not null default 'und';

alter table public.grievances
  add constraint grievances_original_language_bcp47_check
  check (original_language ~ '^[a-z]{2,3}(-[A-Z][a-z]{3})?(-[A-Z]{2}|-[0-9]{3})?$');

comment on column public.grievances.original_language is
  'Best-effort BCP 47 language tag detected at filing time. und means unknown; it never replaces original_text.';
