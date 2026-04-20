
-- Restaurants catalog
CREATE TABLE public.restaurants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL,
  rating numeric NOT NULL DEFAULT 4.5,
  delivery_minutes int NOT NULL DEFAULT 30,
  delivery_fee numeric NOT NULL DEFAULT 15,
  image_url text,
  lat double precision NOT NULL DEFAULT 19.4326,
  lng double precision NOT NULL DEFAULT -99.1332,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "demo_all_restaurants" ON public.restaurants FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price numeric NOT NULL,
  image_url text,
  category text NOT NULL DEFAULT 'main',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "demo_all_products" ON public.products FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_products_restaurant ON public.products(restaurant_id);

-- Extra fields on orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_address text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS eta_minutes int;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS restaurant_id uuid;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS notes text;

-- Seed restaurants
INSERT INTO public.restaurants (id, name, category, rating, delivery_minutes, delivery_fee, image_url, lat, lng) VALUES
('11111111-1111-1111-1111-111111111111','La Pizzería di Marco','Italiana',4.8,25,15,'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800',19.4326,-99.1332),
('22222222-2222-2222-2222-222222222222','Sushi Zen','Japonesa',4.7,35,20,'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800',19.4290,-99.1400),
('33333333-3333-3333-3333-333333333333','Tacos El Güero','Mexicana',4.9,20,12,'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800',19.4350,-99.1380),
('44444444-4444-4444-4444-444444444444','Burger House','Hamburguesas',4.6,30,18,'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800',19.4280,-99.1290),
('55555555-5555-5555-5555-555555555555','Green Bowl','Saludable',4.5,25,15,'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800',19.4310,-99.1450),
('66666666-6666-6666-6666-666666666666','Café Aroma','Cafetería',4.7,15,10,'https://images.unsplash.com/photo-1521017432531-fbd92d768814?w=800',19.4340,-99.1360);

-- Seed products
INSERT INTO public.products (restaurant_id, name, description, price, image_url, category) VALUES
('11111111-1111-1111-1111-111111111111','Pizza Margherita','Salsa de tomate, mozzarella fresca, albahaca',180,'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600','Pizzas'),
('11111111-1111-1111-1111-111111111111','Pizza Pepperoni','Mozzarella y pepperoni italiano',210,'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=600','Pizzas'),
('11111111-1111-1111-1111-111111111111','Lasagna Bolognese','Pasta al horno con ragú de res',195,'https://images.unsplash.com/photo-1619895092538-128341789043?w=600','Pastas'),
('11111111-1111-1111-1111-111111111111','Tiramisú','Postre clásico italiano',95,'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=600','Postres'),
('11111111-1111-1111-1111-111111111111','Limonada Fresca','500ml',45,'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600','Bebidas'),

('22222222-2222-2222-2222-222222222222','Sushi Roll California','8 piezas con cangrejo y aguacate',185,'https://images.unsplash.com/photo-1611143669185-af224c5e3252?w=600','Rolls'),
('22222222-2222-2222-2222-222222222222','Nigiri Salmón','5 piezas',220,'https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?w=600','Nigiris'),
('22222222-2222-2222-2222-222222222222','Ramen Tonkotsu','Caldo de cerdo, huevo, chashu',195,'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600','Calientes'),
('22222222-2222-2222-2222-222222222222','Edamame','Vainas al vapor con sal de mar',65,'https://images.unsplash.com/photo-1564834744159-ff0ea41ba4b9?w=600','Entradas'),
('22222222-2222-2222-2222-222222222222','Té Verde','Caliente o frío',35,'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600','Bebidas'),

('33333333-3333-3333-3333-333333333333','Tacos al Pastor (4)','Tortilla de maíz, piña, cebolla',95,'https://images.unsplash.com/photo-1599974579688-8dbdd335c77f?w=600','Tacos'),
('33333333-3333-3333-3333-333333333333','Quesadilla de Suadero','Queso oaxaca derretido',75,'https://images.unsplash.com/photo-1628824851399-7e7707de9c5d?w=600','Quesadillas'),
('33333333-3333-3333-3333-333333333333','Gringa de Pastor','Tortilla de harina con queso',110,'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=600','Especiales'),
('33333333-3333-3333-3333-333333333333','Agua de Horchata','500ml',35,'https://images.unsplash.com/photo-1546173159-315724a31696?w=600','Bebidas'),
('33333333-3333-3333-3333-333333333333','Guacamole con totopos','Recién hecho',85,'https://images.unsplash.com/photo-1600335895229-6e75511892c8?w=600','Entradas'),

('44444444-4444-4444-4444-444444444444','Classic Cheeseburger','200g, queso cheddar, pickles',165,'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600','Burgers'),
('44444444-4444-4444-4444-444444444444','BBQ Bacon Burger','Salsa BBQ, tocino crocante',195,'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=600','Burgers'),
('44444444-4444-4444-4444-444444444444','Papas Rústicas','Con romero y parmesano',75,'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600','Acompañamientos'),
('44444444-4444-4444-4444-444444444444','Onion Rings','Rebozados crujientes',65,'https://images.unsplash.com/photo-1639024471283-03518883512d?w=600','Acompañamientos'),
('44444444-4444-4444-4444-444444444444','Malteada de Chocolate','Servida fría',85,'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600','Bebidas'),

('55555555-5555-5555-5555-555555555555','Bowl Buddha','Quinoa, garbanzos, vegetales',155,'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600','Bowls'),
('55555555-5555-5555-5555-555555555555','Bowl Pollo Teriyaki','Arroz integral, brócoli',165,'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600','Bowls'),
('55555555-5555-5555-5555-555555555555','Ensalada César','Pollo grillé, parmesano',135,'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=600','Ensaladas'),
('55555555-5555-5555-5555-555555555555','Smoothie Verde','Espinaca, manzana, jengibre',75,'https://images.unsplash.com/photo-1610970881699-44a5587cabec?w=600','Bebidas'),
('55555555-5555-5555-5555-555555555555','Wrap de Hummus','Vegetales asados',125,'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=600','Wraps'),

('66666666-6666-6666-6666-666666666666','Cappuccino','Espresso doble con leche vaporizada',55,'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=600','Café'),
('66666666-6666-6666-6666-666666666666','Latte Vainilla','Con jarabe natural',65,'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=600','Café'),
('66666666-6666-6666-6666-666666666666','Croissant de Mantequilla','Recién horneado',45,'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600','Panadería'),
('66666666-6666-6666-6666-666666666666','Cheesecake','Porción individual',85,'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=600','Postres'),
('66666666-6666-6666-6666-666666666666','Sandwich de Pollo','Pan rústico con vegetales',115,'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600','Sandwiches');
