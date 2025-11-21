CREATE TABLE
   `ideas` (
      `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      `title` text NOT NULL,
      `content` text,
      `tags` text,
      `urls` text,
      `archived` integer DEFAULT false,
      `created_at` integer NOT NULL,
      `updated_at` integer NOT NULL
   );