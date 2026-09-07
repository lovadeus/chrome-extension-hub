-- ENUMS
CREATE TYPE public.app_role AS ENUM ('admin','cliente');
CREATE TYPE public.plan_type AS ENUM ('diario','mensal','anual');
CREATE TYPE public.order_status AS ENUM ('pending','paid','failed','refunded','canceled');
CREATE TYPE public.payment_method AS ENUM ('pix','card');
CREATE TYPE public.license_status AS ENUM ('active','inactive','expired','blocked');

-- UPDATED AT helper
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- USER ROLES
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'cliente',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin');
$$;

CREATE POLICY "profiles_select_own_or_admin" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_admin());
CREATE POLICY "profiles_update_own_or_admin" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_admin()) WITH CHECK (id = auth.uid() OR public.is_admin());
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "user_roles_select_own_or_admin" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- signup trigger
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'phone')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'cliente')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- PLANS
CREATE TABLE public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  type public.plan_type NOT NULL,
  price_cents integer NOT NULL DEFAULT 0,
  duration_days integer NOT NULL DEFAULT 30,
  device_limit integer NOT NULL DEFAULT 1,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  highlighted boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.plans TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plans TO authenticated;
GRANT ALL ON public.plans TO service_role;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plans_public_read" ON public.plans FOR SELECT TO anon, authenticated USING (active OR public.is_admin());
CREATE POLICY "plans_admin_write" ON public.plans FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER plans_updated_at BEFORE UPDATE ON public.plans FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- COUPONS
CREATE TABLE public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  discount_percent integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  max_uses integer,
  used_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coupons TO authenticated;
GRANT ALL ON public.coupons TO service_role;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coupons_admin_all" ON public.coupons FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER coupons_updated_at BEFORE UPDATE ON public.coupons FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ORDERS
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES public.plans(id) ON DELETE SET NULL,
  coupon_id uuid REFERENCES public.coupons(id) ON DELETE SET NULL,
  amount_cents integer NOT NULL DEFAULT 0,
  discount_cents integer NOT NULL DEFAULT 0,
  status public.order_status NOT NULL DEFAULT 'pending',
  payment_method public.payment_method NOT NULL DEFAULT 'pix',
  provider text NOT NULL DEFAULT 'mercadopago',
  provider_payment_id text,
  pix_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX orders_user_idx ON public.orders(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders_select_own_or_admin" ON public.orders FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "orders_insert_own" ON public.orders FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "orders_admin_update" ON public.orders FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "orders_admin_delete" ON public.orders FOR DELETE TO authenticated USING (public.is_admin());
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- LICENSES
CREATE TABLE public.licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_key text NOT NULL UNIQUE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  plan_id uuid REFERENCES public.plans(id) ON DELETE SET NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  status public.license_status NOT NULL DEFAULT 'active',
  device_limit integer NOT NULL DEFAULT 1,
  activated_at timestamptz,
  expires_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX licenses_user_idx ON public.licenses(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.licenses TO authenticated;
GRANT ALL ON public.licenses TO service_role;
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "licenses_select_own_or_admin" ON public.licenses FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "licenses_admin_all" ON public.licenses FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER licenses_updated_at BEFORE UPDATE ON public.licenses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ACTIVATIONS
CREATE TABLE public.license_activations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id uuid NOT NULL REFERENCES public.licenses(id) ON DELETE CASCADE,
  device_id text NOT NULL,
  device_label text,
  active boolean NOT NULL DEFAULT true,
  activated_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (license_id, device_id)
);
GRANT SELECT, DELETE ON public.license_activations TO authenticated;
GRANT ALL ON public.license_activations TO service_role;
ALTER TABLE public.license_activations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "activations_select_own_or_admin" ON public.license_activations FOR SELECT TO authenticated
  USING (public.is_admin() OR EXISTS (SELECT 1 FROM public.licenses l WHERE l.id = license_id AND l.user_id = auth.uid()));
CREATE POLICY "activations_delete_own_or_admin" ON public.license_activations FOR DELETE TO authenticated
  USING (public.is_admin() OR EXISTS (SELECT 1 FROM public.licenses l WHERE l.id = license_id AND l.user_id = auth.uid()));

-- EVENTS
CREATE TABLE public.license_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id uuid REFERENCES public.licenses(id) ON DELETE CASCADE,
  event text NOT NULL,
  detail text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.license_events TO authenticated;
GRANT ALL ON public.license_events TO service_role;
ALTER TABLE public.license_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "events_select_own_or_admin" ON public.license_events FOR SELECT TO authenticated
  USING (public.is_admin() OR EXISTS (SELECT 1 FROM public.licenses l WHERE l.id = license_id AND l.user_id = auth.uid()));

-- TUTORIALS
CREATE TABLE public.tutorials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  summary text,
  content text NOT NULL DEFAULT '',
  video_url text,
  sort_order integer NOT NULL DEFAULT 0,
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.tutorials TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tutorials TO authenticated;
GRANT ALL ON public.tutorials TO service_role;
ALTER TABLE public.tutorials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tutorials_public_read" ON public.tutorials FOR SELECT TO anon, authenticated USING (published OR public.is_admin());
CREATE POLICY "tutorials_admin_write" ON public.tutorials FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER tutorials_updated_at BEFORE UPDATE ON public.tutorials FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- SETTINGS
CREATE TABLE public.settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_public boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.settings TO authenticated;
GRANT ALL ON public.settings TO service_role;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings_public_read" ON public.settings FOR SELECT TO anon, authenticated USING (is_public OR public.is_admin());
CREATE POLICY "settings_admin_write" ON public.settings FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER settings_updated_at BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- SUPPORT
CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'aberto',
  admin_reply text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tickets_select_own_or_admin" ON public.support_tickets FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "tickets_insert_own" ON public.support_tickets FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "tickets_admin_update" ON public.support_tickets FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER tickets_updated_at BEFORE UPDATE ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ADMIN LOGS
CREATE TABLE public.admin_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.admin_logs TO authenticated;
GRANT ALL ON public.admin_logs TO service_role;
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "logs_admin_read" ON public.admin_logs FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "logs_admin_insert" ON public.admin_logs FOR INSERT TO authenticated WITH CHECK (public.is_admin());

-- DEMO DATA
INSERT INTO public.plans (slug, name, description, type, price_cents, duration_days, device_limit, features, highlighted, sort_order) VALUES
('diario','Plano Diário','[DEMO] Acesso completo por 24 horas.','diario',990,1,1,'["Acesso por 24 horas","1 dispositivo","Suporte por e-mail","Atualizações automáticas"]'::jsonb,false,1),
('mensal','Plano Mensal','[DEMO] O mais escolhido por quem usa todo dia.','mensal',4990,30,2,'["Acesso por 30 dias","2 dispositivos","Suporte prioritário","Atualizações automáticas","Tutoriais exclusivos"]'::jsonb,true,2),
('anual','Plano Anual','[DEMO] Melhor custo-benefício, 12 meses.','anual',39900,365,5,'["Acesso por 365 dias","5 dispositivos","Suporte VIP no WhatsApp","Atualizações automáticas","Tutoriais exclusivos","2 meses grátis"]'::jsonb,false,3);

INSERT INTO public.coupons (code, discount_percent, active, max_uses) VALUES
('DEMO10',10,true,100),('LOVADEUS20',20,true,50);

INSERT INTO public.tutorials (title, slug, summary, content, sort_order) VALUES
('Como instalar a extensão','instalar','[DEMO] Passo a passo para instalar no Google Chrome.','1. Baixe o arquivo .zip na sua área de cliente.\n2. Abra chrome://extensions no Chrome.\n3. Ative o "Modo do desenvolvedor".\n4. Clique em "Carregar sem compactação" e selecione a pasta extraída.\n5. Fixe a extensão na barra do Chrome.',1),
('Como ativar sua licença','ativar-licenca','[DEMO] Use sua chave para liberar o acesso.','1. Copie a chave de licença na sua área de cliente.\n2. Abra a extensão e clique em "Ativar".\n3. Cole a chave e confirme.\n4. Pronto: o status ficará como Ativa.',2),
('Resolvendo problemas comuns','problemas','[DEMO] Erros frequentes e como corrigir.','- Licença expirada: renove o plano na área de cliente.\n- Limite de dispositivos atingido: remova um dispositivo antigo.\n- Extensão não abre: reinstale seguindo o tutorial de instalação.',3);

INSERT INTO public.settings (key, value, is_public) VALUES
('brand','{"name":"LOVADEUS","tagline":"A extensão do Chrome que acelera o seu trabalho","support_email":"suporte@lovadeus.demo","whatsapp":"+55 11 90000-0000"}'::jsonb,true),
('extension','{"version":"1.0.0-demo","download_url":"https://example.com/lovadeus-extension-demo.zip","chrome_store_url":"","min_chrome":"110","changelog":"[DEMO] Versão inicial de demonstração."}'::jsonb,true),
('payments','{"provider":"mercadopago","pix_enabled":true,"card_enabled":true,"mode":"demo"}'::jsonb,true);