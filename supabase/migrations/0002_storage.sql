-- Storage bucket for generated deliverables. Private - served through app/report/[jobId]
-- and app/verify/[jobId], which use the service-role client server-side. No public bucket
-- policy is added; anonymous/anon-key access stays blocked by default bucket privacy.

insert into storage.buckets (id, name, public)
values ('deliverables', 'deliverables', false)
on conflict (id) do nothing;
