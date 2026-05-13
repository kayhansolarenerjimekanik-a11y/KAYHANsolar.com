-- Custom product labels — marketing badges managed by admin

CREATE TABLE IF NOT EXISTS product_labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  color text NOT NULL CHECK (color IN ('lime','red','yellow','blue','purple','gray')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_label_assignments (
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  label_id uuid NOT NULL REFERENCES product_labels(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (product_id, label_id)
);

CREATE INDEX IF NOT EXISTS idx_pla_product ON product_label_assignments(product_id);
CREATE INDEX IF NOT EXISTS idx_pla_label ON product_label_assignments(label_id);
