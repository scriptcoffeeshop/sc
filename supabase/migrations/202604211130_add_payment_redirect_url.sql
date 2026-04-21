ALTER TABLE public.coffee_orders
ADD COLUMN IF NOT EXISTS payment_redirect_url TEXT NOT NULL DEFAULT '';
