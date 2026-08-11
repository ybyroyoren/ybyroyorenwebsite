-- Product lead time (days notice required before a pickup date can be selected).
alter table products add column lead_time_days int not null default 0 check (lead_time_days >= 0);

-- More granular private-event inquiry statuses, alongside the original four.
alter table event_inquiries drop constraint event_inquiries_status_check;
alter table event_inquiries add constraint event_inquiries_status_check
  check (status in ('new', 'contacted', 'quoted', 'approved_unpaid', 'deposit_paid', 'paid_closed', 'closed'));
