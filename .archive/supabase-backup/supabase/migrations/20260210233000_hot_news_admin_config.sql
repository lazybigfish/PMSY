CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP POLICY IF EXISTS "Config read access" ON public.system_configs;
CREATE POLICY "Config read access" ON public.system_configs
FOR SELECT TO authenticated
USING (public.is_admin());

INSERT INTO public.system_configs (key, value, description)
VALUES ('hot_news_fetch_limit', '20', '每日热点抓取条数（最少 5）')
ON CONFLICT (key) DO NOTHING;
