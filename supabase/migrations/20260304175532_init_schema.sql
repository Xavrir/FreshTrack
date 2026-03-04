CREATE TABLE households (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE household_members (
  household_id uuid REFERENCES households(id) ON DELETE CASCADE,
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'member')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

CREATE TABLE household_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now(),
  revoked_at timestamptz
);

CREATE TABLE barcode_mappings (
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  barcode text NOT NULL,
  name text NOT NULL,
  brand text,
  source text NOT NULL CHECK (source IN ('off', 'manual')),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (household_id, barcode)
);

CREATE TABLE inventory_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  barcode text,
  name text NOT NULL,
  brand text,
  quantity numeric NOT NULL,
  unit text NOT NULL,
  expiry_date date,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE inventory_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES inventory_batches(id) ON DELETE CASCADE,
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  actor_user_id uuid NOT NULL REFERENCES auth.users(id),
  event_type text NOT NULL CHECK (event_type IN ('consumed', 'wasted', 'adjust')),
  amount numeric NOT NULL,
  unit text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE household_settings (
  household_id uuid PRIMARY KEY REFERENCES households(id) ON DELETE CASCADE,
  reminder_time_local text NOT NULL DEFAULT '09:00',
  lead_days int[] NOT NULL DEFAULT ARRAY[7, 3, 0],
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE barcode_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own household"
ON households FOR SELECT
USING (id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can view members of their household"
ON household_members FOR SELECT
USING (household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can join household if they have invite"
ON household_members FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner can delete members"
ON household_members FOR DELETE
USING (auth.uid() IN (SELECT owner_user_id FROM households WHERE id = household_id));

CREATE POLICY "Members can view invites"
ON household_invites FOR SELECT
USING (household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid()));

CREATE POLICY "Owner can manage invites"
ON household_invites FOR ALL
USING (household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid() AND role = 'owner'));

CREATE POLICY "Members can manage barcode mappings"
ON barcode_mappings FOR ALL
USING (household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid()));

CREATE POLICY "Members can manage inventory"
ON inventory_batches FOR ALL
USING (household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid()));

CREATE POLICY "Members can manage events"
ON inventory_events FOR ALL
USING (household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid()));

CREATE POLICY "Members can view settings"
ON household_settings FOR SELECT
USING (household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid()));

CREATE POLICY "Owner can update settings"
ON household_settings FOR UPDATE
USING (household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid() AND role = 'owner'));