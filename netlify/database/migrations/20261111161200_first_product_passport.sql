INSERT INTO product_passports (id, code, title, collection, category, story, encouragement, production_status)
VALUES (1, 'DRZ-000001', 'VANITY FLEX', 'DREAMZ × VANITY FLEX', 'footwear',
'Good design begins by listening. VANITY FLEX is a DREAMZ footwear project shaped around the person who will wear it: their everyday journey, their preferences and the details that make a piece feel personal.

From the design conversation to the branding now in progress, this passport documents the work behind the product. It will grow with confirmed materials, finished photographs, care guidance and support throughout its use.',
'Your journey deserves thoughtful steps. Keep building, keep moving, and give your dream room to become real.', 'In production')
ON CONFLICT (code) DO NOTHING;
SELECT setval(pg_get_serial_sequence('product_passports', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM product_passports), 1), true);
