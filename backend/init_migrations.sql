CREATE TABLE IF NOT EXISTS "SequelizeMeta" (
    "name" character varying(255) NOT NULL,
    CONSTRAINT "SequelizeMeta_pkey" PRIMARY KEY ("name")
);

INSERT INTO "SequelizeMeta" ("name") VALUES
('20231115_add_last_edited_to_posts.ts'),
('20231116_add_privacy_settings.ts'),
('20240318_add_profile_fields.ts'),
('20240319_create_notifications.ts')
ON CONFLICT ("name") DO NOTHING; 