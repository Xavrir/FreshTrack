create policy "Anyone authenticated can view active invites"
on household_invites
for select
to authenticated
using (revoked_at is null);