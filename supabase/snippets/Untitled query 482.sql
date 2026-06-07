create policy "Owners can view created households"
on households
for select
to authenticated
using (
  owner_user_id = auth.uid()
);