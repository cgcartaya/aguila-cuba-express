alter table public.alvarez_remittance_notifications
  add column manual_reserved_by uuid,
  add column manual_sent_by uuid;
