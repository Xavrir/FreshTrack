  create policy "Users can view household history"
  on inventory_history
  for select
  using (
    household_id in (
      select household_id
      from household_members
      where user_id = auth.uid()
    )
  );

  create policy "Users can insert history"
  on inventory_history
  for insert
  with check (
    household_id in (
      select household_id
      from household_members
      where user_id = auth.uid()
    )
  );