-- Create the templates table
create table if not exists public.templates (
  id text primary key,
  title text not null,
  title_en text,
  description text not null,
  description_en text,
  category text not null,
  author text not null,
  downloads text default '0',
  tags text[] default '{}',
  template_json jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.templates enable row level security;

-- Create policy to allow read access for all users
create policy "Allow public read access"
  on public.templates
  for select
  using (true);

-- Create policy to allow insert/update for anon (if you want client-side seeding without auth)
-- WARNING: This allows anyone with the anon key to write. 
-- For production, you should restrict this to authenticated users or service roles.
-- Since this is a personal project/prototype, we'll allow it for now for seeding purposes.
create policy "Allow public insert/update for seeding"
  on public.templates
  for insert
  with check (true);

create policy "Allow public update for seeding"
  on public.templates
  for update
  using (true);
