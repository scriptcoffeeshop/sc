ALTER TABLE public.coffee_orders
  ADD COLUMN IF NOT EXISTS status_note TEXT DEFAULT '';
