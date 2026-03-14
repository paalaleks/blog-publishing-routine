# Blog Publishing Routine

Publish blog posts to your GitHub-hosted Next.js blog from the command line — with or without AI.

Runs in **Claude Code** for a fully automatic workflow, or standalone from any terminal.

## Step 1 — Install the tool globally

Clone this repo (or download it), then link it:

```bash
git clone https://github.com/paalaleks/blog-publishing-routine.git blog-publisher
cd blog-publisher
npm install
npm link
```

This registers the `blog-publish` command globally.

## Step 2 — Create a GitHub token

Create a fine-grained personal access token at **github.com/settings/personal-access-tokens/new**:

| Setting             | Value                  |
| ------------------- | ---------------------- |
| Repository access   | Only your blog repo(s) |
| Contents permission | Read and Write         |

Keep the token handy — you'll paste it into `.env` in the next step.

## Step 3 — Set up your blog routine

From your project root:

```bash
cd path/to/your-blog-repo
blog-publish init
```

This creates two files:
- `blogs.config.json` — edit with your GitHub repo details
- `.env` — paste your GitHub token here

Then verify:

```bash
blog-publish --list
```

Add these to your `.gitignore`:
```
.env
drafts/
_published/
```

---

## Commands

Run all commands from your project root.

### List configured blogs

```bash
blog-publish --list
```

### Publish a new post

```bash
blog-publish --blog <key> --publish drafts/my-post.md
```

### Publish a new post with a hero image

```bash
blog-publish --blog <key> --publish drafts/my-post.md --image drafts/hero.png
```

### Update an existing post

Reads from the local `_published/` folder and commits the updated version to GitHub.

```bash
blog-publish --blog <key> --update <slug>
```

### Add or update a hero image on an existing post

```bash
blog-publish --blog <key> --add-image <slug> --image drafts/hero.png
```

### Fetch a post from GitHub

```bash
blog-publish --blog <key> --fetch <slug>
```

### Remove a post

```bash
blog-publish --blog <key> --remove <slug>
```

---

## Setting up a blog in your Next.js project

If your project doesn't have a blog yet, use `@use-this-blog-prompt-in-IDE.md` as a prompt in your IDE to scaffold the full blog infrastructure (routes, post library, frontmatter parsing, etc.).

---

## Optional — Install the Claude Code skill

If you use **Claude Code**, install the skill so Claude automatically knows how to draft and publish posts for you.

**Option A — Copy the file:**

```bash
mkdir -p ~/.claude/skills/blog-publisher
cp skill/SKILL.md ~/.claude/skills/blog-publisher/SKILL.md
```

**Option B — Symlink (stays in sync with the repo):**

```bash
mkdir -p ~/.claude/skills/blog-publisher
ln -s "$(pwd)/skill/SKILL.md" ~/.claude/skills/blog-publisher/SKILL.md
```

Once installed, Claude Code will pick up the skill automatically. Say _"let's write a blog post"_ and it handles the rest.

---

## Workflow

### Option 1 — Write it yourself

1. Copy `draft-template.md` into your project's `drafts/` folder
2. Fill in the frontmatter and write your content
3. Run the publish command above

### Option 2 — Draft with Claude Code

1. Open Claude Code and say _"Let's write a blog post about [topic]"_
2. Iterate on the draft in chat until happy
3. Say _"ship it"_ — Claude saves the file to `drafts/` and runs the publish command automatically

### Updating a post

1. Edit the local copy in `_published/`
2. Run `blog-publish --blog <key> --update <slug>`

---

## Folder structure

```
blog-publisher/               <- the tool (installed once, linked globally)
├── publish.ts
├── package.json
├── tsconfig.json
├── skill/
│   └── SKILL.md              <- Claude Code skill (copy to ~/.claude/skills/)
├── prompt/
│   └── use-this-blog-prompt-in-IDE.md
└── drafts/
    └── draft-template.md

your-blog-repo/               <- your Next.js project (run commands from here)
├── blogs.config.json         <- created by `blog-publish init`
├── .env                      <- created by `blog-publish init`
├── content/blog/             <- committed posts (on GitHub)
├── public/images/blog/       <- committed images (on GitHub)
├── drafts/                   <- work in progress (gitignored)
└── _published/               <- local copies of live posts (gitignored)
```
