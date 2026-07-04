# Project Setup for Quiver Blog

This project is an Astro blog designed to display the markdown files in `src/content/posts`.

## Key Commands

- `npm run dev`: Start the development server.
- `npm run build`: Build the static site.
- `npm run preview`: Preview the build.

## Architecture

- **Framework**: Astro 5 (Content Collections).
- **Styling**: Tailwind CSS v4 + @tailwindcss/typography.
- **Content**: Markdown files located in `src/content/posts/<series-name>/`.
- **Scripts**:
    - `scripts/fix-frontmatter.mjs`: The main utility script. It ensures every markdown file has the correct frontmatter (`title`, `slug`, `series`, `seriesTitle`). It is safe to run repeatedly; it preserves existing titles but updates the `slug` and `series` based on the folder structure.
    - `scripts/refactor-frontmatter.mjs`: A specialized migration script used once to convert the initial "Quiver" blog post format (extracting H2 as title) to the new schema.

## How to Add a New Series

1. Create a new folder in `src/content/posts/` (e.g., `src/content/posts/my-new-app/`).
2. Add your markdown files there.
3. Run `node scripts/fix-frontmatter.mjs` to automatically generate the required frontmatter.
4. Start the server to see your new series card on the home page.

## Notes

- React has been removed. The project uses pure Astro + Tailwind.
- Code blocks have a "Copy" button added via client-side JavaScript in `src/layouts/Layout.astro`.
- The home page displays large cards for each Series found in the posts directory.

