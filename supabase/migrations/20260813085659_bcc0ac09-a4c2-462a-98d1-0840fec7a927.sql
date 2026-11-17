CREATE TABLE public.matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  seed bigint NOT NULL,
  status text NOT NULL DEFAULT 'waiting',
  p1_id text NOT NULL,
  p1_name text NOT NULL DEFAULT 'Player 1',
  p1_score integer NOT NULL DEFAULT 0,
  p1_alive boolean NOT NULL DEFAULT true,
  p1_ready boolean NOT NULL DEFAULT false,
  p2_id text,
  p2_name text NOT NULL DEFAULT 'Player 2',
  p2_score integer NOT NULL DEFAULT 0,
  p2_alive boolean NOT NULL DEFAULT true,
  p2_ready boolean NOT NULL DEFAULT false,
  start_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.matches TO anon, authenticated;
GRANT ALL ON public.matches TO service_role;

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read matches" ON public.matches FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can create matches" ON public.matches FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can update matches" ON public.matches FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.matches REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
