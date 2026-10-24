-- Point the site hero at the supplied "Boot of Many Colours" photography,
-- replacing the AI-generated man-in-black-suit hero image, wherever the
-- setting still references the old file.
UPDATE "settings"
SET "value" = jsonb_set(
        "value",
        '{heroImage}',
        '"/img/hero-boot-of-many-colours.jpg"'::jsonb
    ),
    "updated_at" = now()
WHERE "key" = 'site'
  AND "value" ->> 'heroImage' = '/img/hero.jpg';
