-- When a new auth user is created, mirror into profiles with role=customer
create or replace function public.handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'customer')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_auth_users_to_profiles on auth.users;
create trigger trg_auth_users_to_profiles after insert on auth.users
  for each row execute function public.handle_new_user();
