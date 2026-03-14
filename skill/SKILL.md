---
name: blog-publisher
description: >
  Publishes blog posts to the user's GitHub-hosted Next.js blog.
  Use this skill when the user wants to work on a blog post — drafting,
  iterating, or publishing. Triggers on phrases like "write a blog post about X",
  "let's work on a blog post", "draft a post about X", "publish my blog post",
  "post this to my blog", or any combination of blog + content creation/publishing.
  Always use this skill for anything blog related.
---

# Blog Publishing Routine

Runs in **Claude Code only**. Claude can read and write files directly on the
user's machine.

**CLI:** `blog-publish` (global command — run from the project root)

**Prerequisite:** The project root must contain `blogs.config.json` and `.env`.

**Blog images always go to:** `public/images/blog/` in the repo
**Frontmatter image field:** `/images/blog/filename.jpg`

---

## Phase 1 — Draft & Iterate

### Step 1 — Understand what the user wants

Ask if not already clear:
- What's the topic / angle?
- Any specific tone, audience, or length?

### Step 2 — Write the draft in chat

Write the full post as a markdown code block with frontmatter:

```markdown
---
title: "Post Title"
date: "YYYY-MM-DD"
slug: "url-friendly-slug"
description: "SEO description under 160 chars"
author: "Your Name"
image: ""
image_alt: ""
tags:
  - tag1
  - tag2
draft: false
---

Post content here...
```

**Do NOT publish yet.** Iterate until the user is happy.

---

## Phase 2 — Publish

When the user approves ("ship it", "publish it", "looks good", etc.):

### Step 1 — Save draft to file

Write the final markdown directly to:
```
drafts/blog-draft.md
```

If the user wants a hero image, ask them to save it to `drafts/` (e.g. `drafts/blog-hero.jpg`).
If the user provides a path to an image file already on disk, use that path directly.

### Step 2 — Run publish command

Without image:
```bash
blog-publish --blog personal --publish drafts/blog-draft.md
```

With image:
```bash
blog-publish --blog personal --publish drafts/blog-draft.md --image drafts/blog-hero.jpg
```

### Step 3 — Report back

Parse `__RESULT_JSON__` from stdout and confirm:

> **[Post Title]** is live on **[Blog Label]**
> [View file on GitHub](<fileUrl>)
> [View commit](<commitUrl>)

---

## Adding an image to an existing post

When the user wants to add a hero image to a post:

### Step 1 — Identify the slug

If not clear from the message, ask:
> "Which post should I add this image to?"

### Step 2 — Get the image file

Ask the user to save the image to the `drafts/` folder:
> "Save your image to `drafts/` (e.g. `drafts/blog-hero.jpg`) and tell me the filename."

If the user provides a path to an image file already on disk, use that path directly.

### Step 3 — Run the command

```bash
blog-publish --blog personal --add-image <slug> --image drafts/blog-hero.jpg
```

### Step 4 — Report back

> Image added to **[slug]** on **[Blog Label]**
> [View commit](<commitUrl>)

---

## Updating an existing post

When the user wants to edit or update an already-published post:

1. Edit the file in `_published/` in the project folder
2. Run:

```bash
blog-publish --blog personal --update <slug>
```

The script reads from `_published/` and commits the updated version to GitHub.
No need to copy to `drafts/` first.

---

## Removing a post

When the user says "remove", "delete", or "unpublish":

```bash
blog-publish --blog personal --remove <slug>
```

Ask for the slug if not provided. Confirm with the commit URL.

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| `blogs.config.json not found in current directory` | Run `blog-publish` from the project root |
| `Missing GITHUB_TOKEN in .env` | Add `.env` with `GITHUB_TOKEN=github_pat_...` to project root |
| `401 Unauthorized` | GitHub token expired or wrong scope |
| `Content file not found` | Draft file path is wrong |
| `Branch not found` | Check `github_branch` in blogs.config.json |
