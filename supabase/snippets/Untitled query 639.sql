create policy "Users can view members of their household"
on household_members
for select
using (
  exists (
    select 1
    from household_members hm
    where hm.user_id = auth.uid()
      and hm.household_id = household_members.household_id
  )
);