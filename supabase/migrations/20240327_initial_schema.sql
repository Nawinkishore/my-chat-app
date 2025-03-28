-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create users table (extends Supabase auth.users)
create table if not exists public.users (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create friends table
create table if not exists public.friends (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users on delete cascade not null,
  friend_id uuid references public.users on delete cascade not null,
  status text check (status in ('pending', 'accepted')) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, friend_id)
);

-- Create conversations table
create table if not exists public.conversations (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create conversation_participants table
create table if not exists public.conversation_participants (
  conversation_id uuid references public.conversations on delete cascade not null,
  user_id uuid references public.users on delete cascade not null,
  primary key (conversation_id, user_id)
);

-- Create messages table
create table if not exists public.messages (
  id uuid default uuid_generate_v4() primary key,
  conversation_id uuid references public.conversations on delete cascade not null,
  sender_id uuid references public.users on delete cascade not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Drop existing view if it exists
drop view if exists public.conversations_with_last_message;

-- Create view for conversations with last message
create view public.conversations_with_last_message as
select 
  c.id,
  c.created_at,
  cp.user_id as current_user_id,
  json_agg(
    json_build_object(
      'id', p.id,
      'email', p.email,
      'full_name', p.full_name,
      'avatar_url', p.avatar_url
    )
  ) as participants,
  (
    select json_build_object(
      'id', m.id,
      'content', m.content,
      'created_at', m.created_at,
      'sender_id', m.sender_id
    )
    from public.messages m
    where m.conversation_id = c.id
    order by m.created_at desc
    limit 1
  ) as last_message
from public.conversations c
join public.conversation_participants cp on c.id = cp.conversation_id
join public.users p on cp.user_id = p.id
group by c.id, c.created_at, cp.user_id;

-- Set up Row Level Security (RLS)
alter table public.users enable row level security;
alter table public.friends enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;

-- Drop existing policies if they exist
drop policy if exists "Users can view their own profile" on public.users;
drop policy if exists "Users can update their own profile" on public.users;
drop policy if exists "Users can view their friends" on public.friends;
drop policy if exists "Users can add friends" on public.friends;
drop policy if exists "Users can update their friend requests" on public.friends;
drop policy if exists "Users can delete their friend requests" on public.friends;
drop policy if exists "Users can view their conversations" on public.conversations;
drop policy if exists "Users can create conversations" on public.conversations;
drop policy if exists "Users can view conversation participants" on public.conversation_participants;
drop policy if exists "Users can add conversation participants" on public.conversation_participants;
drop policy if exists "Users can view messages" on public.messages;
drop policy if exists "Users can send messages" on public.messages;

-- Create policies
create policy "Users can view their own profile"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.users for update
  using (auth.uid() = id);

create policy "Users can view their friends"
  on public.friends for select
  using (auth.uid() = user_id);

create policy "Users can add friends"
  on public.friends for insert
  with check (auth.uid() = user_id);

create policy "Users can update their friend requests"
  on public.friends for update
  using (auth.uid() = user_id);

create policy "Users can delete their friend requests"
  on public.friends for delete
  using (auth.uid() = user_id);

create policy "Users can view their conversations"
  on public.conversations for select
  using (
    exists (
      select 1 from public.conversation_participants
      where conversation_id = id
      and user_id = auth.uid()
    )
  );

create policy "Users can create conversations"
  on public.conversations for insert
  with check (
    exists (
      select 1 from public.friends
      where (user_id = auth.uid() and friend_id = conversation_participants.user_id)
      or (user_id = conversation_participants.user_id and friend_id = auth.uid())
    )
  );

create policy "Users can view conversation participants"
  on public.conversation_participants for select
  using (
    exists (
      select 1 from public.conversation_participants
      where conversation_id = conversation_id
      and user_id = auth.uid()
    )
  );

create policy "Users can add conversation participants"
  on public.conversation_participants for insert
  with check (
    exists (
      select 1 from public.friends
      where (user_id = auth.uid() and friend_id = user_id)
      or (user_id = user_id and friend_id = auth.uid())
    )
  );

create policy "Users can view messages"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversation_participants
      where conversation_id = conversation_id
      and user_id = auth.uid()
    )
  );

create policy "Users can send messages"
  on public.messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.conversation_participants
      where conversation_id = conversation_id
      and user_id = auth.uid()
    )
  );

-- Add foreign key relationships for PostgREST
alter table public.conversation_participants
  add constraint conversation_participants_conversation_id_fkey
  foreign key (conversation_id)
  references public.conversations(id)
  on delete cascade;

alter table public.conversation_participants
  add constraint conversation_participants_user_id_fkey
  foreign key (user_id)
  references public.users(id)
  on delete cascade;

alter table public.messages
  add constraint messages_conversation_id_fkey
  foreign key (conversation_id)
  references public.conversations(id)
  on delete cascade;

alter table public.messages
  add constraint messages_sender_id_fkey
  foreign key (sender_id)
  references public.users(id)
  on delete cascade;

-- Grant necessary permissions
grant usage on schema public to postgres, anon, authenticated, service_role;
grant all on all tables in schema public to postgres;
grant all on all sequences in schema public to postgres;
grant all on all functions in schema public to postgres;
grant select on all tables in schema public to anon, authenticated;
grant select on all sequences in schema public to anon, authenticated;
grant select on all functions in schema public to anon, authenticated;
grant insert, update, delete on all tables in schema public to authenticated;
grant insert, update, delete on all sequences in schema public to authenticated;
grant insert, update, delete on all functions in schema public to authenticated;

-- Create indexes for better performance
create index if not exists idx_conversation_participants_user_id on public.conversation_participants(user_id);
create index if not exists idx_conversation_participants_conversation_id on public.conversation_participants(conversation_id);
create index if not exists idx_messages_conversation_id on public.messages(conversation_id);
create index if not exists idx_messages_sender_id on public.messages(sender_id);
create index if not exists idx_friends_user_id on public.friends(user_id);
create index if not exists idx_friends_friend_id on public.friends(friend_id); 