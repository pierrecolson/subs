-- SubTrack Initial Schema
-- All tables include RLS. Every table has user_id FK to auth.users.

-- Payment Methods
create table public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  network text check (network in ('visa', 'mastercard', 'amex', 'other')),
  is_default boolean default false,
  created_at timestamptz default now()
);

alter table public.payment_methods enable row level security;
create policy "Users can view own payment methods" on public.payment_methods for select using (auth.uid() = user_id);
create policy "Users can insert own payment methods" on public.payment_methods for insert with check (auth.uid() = user_id);
create policy "Users can update own payment methods" on public.payment_methods for update using (auth.uid() = user_id);
create policy "Users can delete own payment methods" on public.payment_methods for delete using (auth.uid() = user_id);

-- Subscriptions
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  amount numeric not null,
  currency text not null default 'EUR',
  cycle text check (cycle in ('monthly', 'yearly', 'trial')),
  trial_end_date date,
  cancel_url text,
  start_date date not null,
  category text check (category in ('personal', 'work')),
  needs_expense boolean default false,
  payment_method_id uuid references public.payment_methods(id),
  status text check (status in ('active', 'cancelled', 'paused')) default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.subscriptions enable row level security;
create policy "Users can view own subscriptions" on public.subscriptions for select using (auth.uid() = user_id);
create policy "Users can insert own subscriptions" on public.subscriptions for insert with check (auth.uid() = user_id);
create policy "Users can update own subscriptions" on public.subscriptions for update using (auth.uid() = user_id);
create policy "Users can delete own subscriptions" on public.subscriptions for delete using (auth.uid() = user_id);

create index idx_subscriptions_user_id on public.subscriptions(user_id);
create index idx_subscriptions_status on public.subscriptions(status);
create index idx_subscriptions_cycle on public.subscriptions(cycle);

-- Detected Subscriptions (staging)
create table public.detected_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  raw_data jsonb,
  detected_name text,
  detected_amount numeric,
  detected_currency text,
  detected_cycle text,
  detected_trial_end date,
  gmail_account text,
  gmail_message_id text,
  status text default 'pending' check (status in ('pending', 'accepted', 'ignored')),
  created_at timestamptz default now()
);

alter table public.detected_subscriptions enable row level security;
create policy "Users can view own detected" on public.detected_subscriptions for select using (auth.uid() = user_id);
create policy "Users can insert own detected" on public.detected_subscriptions for insert with check (auth.uid() = user_id);
create policy "Users can update own detected" on public.detected_subscriptions for update using (auth.uid() = user_id);
create policy "Users can delete own detected" on public.detected_subscriptions for delete using (auth.uid() = user_id);

-- Push Subscriptions
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz default now()
);

alter table public.push_subscriptions enable row level security;
create policy "Users can view own push subs" on public.push_subscriptions for select using (auth.uid() = user_id);
create policy "Users can insert own push subs" on public.push_subscriptions for insert with check (auth.uid() = user_id);
create policy "Users can delete own push subs" on public.push_subscriptions for delete using (auth.uid() = user_id);

-- Connected Accounts (Gmail)
create table public.connected_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  email text not null,
  access_token text,
  refresh_token text not null,
  token_expiry timestamptz,
  last_polled_at timestamptz,
  history_id text,
  is_active boolean default true,
  created_at timestamptz default now()
);

alter table public.connected_accounts enable row level security;
create policy "Users can view own connected accounts" on public.connected_accounts for select using (auth.uid() = user_id);
create policy "Users can insert own connected accounts" on public.connected_accounts for insert with check (auth.uid() = user_id);
create policy "Users can update own connected accounts" on public.connected_accounts for update using (auth.uid() = user_id);
create policy "Users can delete own connected accounts" on public.connected_accounts for delete using (auth.uid() = user_id);

-- Notifications Log
create table public.notifications_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  type text,
  subscription_id uuid references public.subscriptions(id),
  title text,
  body text,
  sent_at timestamptz default now(),
  read_at timestamptz
);

alter table public.notifications_log enable row level security;
create policy "Users can view own notifications" on public.notifications_log for select using (auth.uid() = user_id);
create policy "Users can insert own notifications" on public.notifications_log for insert with check (auth.uid() = user_id);
create policy "Users can update own notifications" on public.notifications_log for update using (auth.uid() = user_id);

create index idx_notifications_user_id on public.notifications_log(user_id);
create index idx_notifications_read on public.notifications_log(read_at);

-- Exchange Rates (cache)
create table public.exchange_rates (
  base text not null,
  target text not null,
  rate numeric not null,
  updated_at timestamptz default now(),
  primary key (base, target)
);

-- Exchange rates are public read, service-role write
alter table public.exchange_rates enable row level security;
create policy "Anyone can read exchange rates" on public.exchange_rates for select using (true);

-- User Settings
create table public.user_settings (
  user_id uuid primary key references auth.users,
  home_currency text default 'EUR',
  notifications_enabled boolean default true,
  display_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.user_settings enable row level security;
create policy "Users can view own settings" on public.user_settings for select using (auth.uid() = user_id);
create policy "Users can insert own settings" on public.user_settings for insert with check (auth.uid() = user_id);
create policy "Users can update own settings" on public.user_settings for update using (auth.uid() = user_id);

-- Function to auto-update updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.handle_updated_at();

create trigger set_user_settings_updated_at
  before update on public.user_settings
  for each row execute function public.handle_updated_at();
