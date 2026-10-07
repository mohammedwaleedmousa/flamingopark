-- Defense-in-depth: public image URLs are intentional, but the uploads bucket must not accept arbitrary files or oversized objects.
alter table storage.buckets enable row level security;

update storage.buckets
set
  file_size_limit = 1048576,
  allowed_mime_types = array['image/jpeg','image/png','image/webp','image/avif']::text[]
where id = 'uploads';
