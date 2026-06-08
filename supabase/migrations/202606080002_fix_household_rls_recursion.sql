create or replace function public.is_household_member(target_household_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.household_members hm
    where hm.household_id = target_household_id
      and hm.user_id = auth.uid()
  );
$$;

create or replace function public.is_household_owner(target_household_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.household_members hm
    where hm.household_id = target_household_id
      and hm.user_id = auth.uid()
      and hm.role = 'owner'
  );
$$;

revoke all on function public.is_household_member(uuid) from public;
revoke all on function public.is_household_owner(uuid) from public;
grant execute on function public.is_household_member(uuid) to authenticated;
grant execute on function public.is_household_owner(uuid) to authenticated;

drop policy if exists "Users can view their own household" on households;
drop policy if exists "Owners can view created households" on households;
drop policy if exists "Users can view members of their household" on household_members;
drop policy if exists "Owner can delete members" on household_members;
drop policy if exists "Members can view invites" on household_invites;
drop policy if exists "Owner can manage invites" on household_invites;
drop policy if exists "Owners can delete invites" on household_invites;
drop policy if exists "Members can manage barcode mappings" on barcode_mappings;
drop policy if exists "Members can manage inventory" on inventory_batches;
drop policy if exists "Members can manage events" on inventory_events;
drop policy if exists "Members can view settings" on household_settings;
drop policy if exists "Owner can update settings" on household_settings;
drop policy if exists "Owners can insert settings" on household_settings;
drop policy if exists "Users can view household history" on inventory_history;
drop policy if exists "Users can insert history" on inventory_history;

create policy "Users can view their own household"
on households
for select
to authenticated
using (owner_user_id = auth.uid() or public.is_household_member(id));

create policy "Users can view members of their household"
on household_members
for select
to authenticated
using (user_id = auth.uid() or public.is_household_member(household_id));

create policy "Owner can delete members"
on household_members
for delete
to authenticated
using (public.is_household_owner(household_id));

create policy "Members can view invites"
on household_invites
for select
to authenticated
using (revoked_at is null or public.is_household_member(household_id));

create policy "Owner can manage invites"
on household_invites
for all
to authenticated
using (public.is_household_owner(household_id))
with check (public.is_household_owner(household_id));

create policy "Members can manage barcode mappings"
on barcode_mappings
for all
to authenticated
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id));

create policy "Members can manage inventory"
on inventory_batches
for all
to authenticated
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id));

create policy "Members can manage events"
on inventory_events
for all
to authenticated
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id));

create policy "Members can view settings"
on household_settings
for select
to authenticated
using (public.is_household_member(household_id));

create policy "Owner can update settings"
on household_settings
for update
to authenticated
using (public.is_household_owner(household_id))
with check (public.is_household_owner(household_id));

create policy "Owners can insert settings"
on household_settings
for insert
to authenticated
with check (public.is_household_owner(household_id));

create policy "Users can view household history"
on inventory_history
for select
to authenticated
using (public.is_household_member(household_id));

create policy "Users can insert history"
on inventory_history
for insert
to authenticated
with check (public.is_household_member(household_id));
