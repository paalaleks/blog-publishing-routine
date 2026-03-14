Build a Next.js App Router blog that reads from .md files in content/blog/.

## Frontmatter shape

---

title: "Post Title"
date: "2026-03-13"
slug: "post-slug"
description: "Short SEO description"
author: "Name"
image: "/images/blog/2026-03-13-post-slug.png"
image_alt: "Hero image description"
tags:

- tag1
- tag2
  draft: false

---

## Files to build

### 1. lib/posts.ts

- Post and PostMeta TypeScript interfaces (include image and image_alt as optional fields)
- getAllPosts(): reads all .md files from content/blog/, parses frontmatter with gray-matter, filters out draft: true, returns sorted by date descending
- getPostBySlug(slug): returns full post including markdown content body

### 2. app/blog/page.tsx

- Lists all posts (title, date, description, tags, optional thumbnail image)
- Each post links to /blog/[slug]
- Styled with Tailwind CSS

### 3. app/blog/[slug]/page.tsx

- Renders the full post
- Shows hero image at top using next/image if image field is present in frontmatter, with fallback if not
- Converts markdown body to HTML using remark + rehype
- Uses Tailwind prose plugin for typography
- generateStaticParams() for static generation
- generateMetadata() for SEO (title, description)

### 4. public/images/blog/.gitkeep

- Create this file so the directory is tracked by git
- Images committed here will be referenced as /images/blog/filename.png in Next.js

## Dependencies needed

gray-matter, remark, remark-html, @tailwindcss/typography

## Notes

- No database, no CMS — filesystem only
- next/image paths starting with /images/blog/ resolve to public/images/blog/
- image and image_alt are optional — all posts should render fine without them
