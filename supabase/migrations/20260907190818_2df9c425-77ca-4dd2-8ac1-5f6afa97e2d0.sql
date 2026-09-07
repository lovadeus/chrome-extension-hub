-- separate anon policies so anon never calls is_admin()
DROP POLICY "plans_public_read" ON public.plans;
CREATE POLICY "plans_anon_read" ON public.plans FOR SELECT TO anon USING (active);
CREATE POLICY "plans_auth_read" ON public.plans FOR SELECT TO authenticated USING (active OR public.is_admin());

DROP POLICY "tutorials_public_read" ON public.tutorials;
CREATE POLICY "tutorials_anon_read" ON public.tutorials FOR SELECT TO anon USING (published);
CREATE POLICY "tutorials_auth_read" ON public.tutorials FOR SELECT TO authenticated USING (published OR public.is_admin());

DROP POLICY "settings_public_read" ON public.settings;
CREATE POLICY "settings_anon_read" ON public.settings FOR SELECT TO anon USING (is_public);
CREATE POLICY "settings_auth_read" ON public.settings FOR SELECT TO authenticated USING (is_public OR public.is_admin());

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;