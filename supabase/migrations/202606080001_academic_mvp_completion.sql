alter table inventory_history
  drop constraint if exists inventory_history_action_check;

alter table inventory_history
  add constraint inventory_history_action_check
  check (action in ('add', 'edit', 'consume', 'waste', 'delete'));

alter table inventory_history
  add column if not exists reason text;

create policy "Owners can insert settings"
on household_settings
for insert
to authenticated
with check (
  household_id in (
    select household_id
    from household_members
    where user_id = auth.uid()
    and role = 'owner'
  )
);

create policy "Owners can delete invites"
on household_invites
for delete
to authenticated
using (
  household_id in (
    select household_id
    from household_members
    where user_id = auth.uid()
    and role = 'owner'
  )
);
