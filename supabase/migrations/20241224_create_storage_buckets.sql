-- Create storage buckets if they don't exist
insert into storage.buckets (id, name, public)
values ('videos', 'videos', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public)
values ('audio', 'audio', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public)
values ('images', 'images', true) on conflict (id) do nothing;
-- Ensure public access policies exist
create policy "Public Access Videos" on storage.objects for
select using (bucket_id = 'videos');
create policy "Public Access Audio" on storage.objects for
select using (bucket_id = 'audio');
create policy "Public Access Images" on storage.objects for
select using (bucket_id = 'images');
-- Ensure authenticated upload policies exist
create policy "Authenticated Upload Videos" on storage.objects for
insert to authenticated with check (bucket_id = 'videos');
create policy "Authenticated Upload Audio" on storage.objects for
insert to authenticated with check (bucket_id = 'audio');
create policy "Authenticated Upload Images" on storage.objects for
insert to authenticated with check (bucket_id = 'images');