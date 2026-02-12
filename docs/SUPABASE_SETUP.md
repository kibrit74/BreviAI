# Supabase Kurulum Talimatları

Supabase entegrasyonunu tamamlamak için lütfen aşağıdaki adımları izleyin:

1. **Supabase Dashboard'a Gidin**
   - [Supabase Projenizi](https://supabase.com/dashboard) açın.
   - Sol menüden **SQL Editor** kısmına gidin.

2. **Tabloyu Oluşturun**
   - Yeni bir sorgu (New Query) oluşturun.
   - Aşağıdaki SQL kodunu yapıştırın ve **Run** butonuna basın:

```sql
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

-- Create policy to allow insert/update for seeding
create policy "Allow public insert/update for seeding"
  on public.templates
  for insert
  with check (true);
```

3. **Uygulamayı Çalıştırın**
   - Uygulamanızı yeniden başlatın (`npx expo start -c`).
   - "Kütüphane" (Template Library) ekranına gidin.
   - Uygulama otomatik olarak veritabanını kontrol edecek, eğer boşsa mevcut şablonları Supabase'e yükleyecektir (Seeding).
   - İşlem tamamlandığında ekranda başarılı mesajı göreceksiniz.
