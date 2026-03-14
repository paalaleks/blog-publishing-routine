#!/usr/bin/env tsx

/**
 * Blog Publisher (multi-blog, TypeScript)
 *
 * Usage:
 *   blog-publish --list
 *   blog-publish --blog <key> --publish <file.md> [--image <path>]
  blog-publish --blog <key> --update <slug>
 *   blog-publish --blog <key> --remove <slug>
 *
 * Required env vars:
 *   GITHUB_TOKEN   - GitHub fine-grained token (Contents: read & write)
 *
 * Blog targets configured in blogs.config.json (same directory as this script).
 */

import { Octokit } from "@octokit/rest";
import * as dotenv from "dotenv";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import path from "path";

dotenv.config();

// ─── Types ────────────────────────────────────────────────────────────────────

interface BlogConfig {
  label: string;
  github_owner: string;
  github_repo: string;
  github_branch: string;
  blog_dir: string;
  image_dir: string;
  author: string;
}

interface BlogsConfig {
  blogs: Record<string, BlogConfig>;
}

interface PublishResult {
  filePath: string;
  commitUrl: string;
  fileUrl: string;
}

interface ParsedArgs {
  action: "list" | "init" | "publish" | "update" | "fetch" | "remove" | "add-image";
  blogKey?: string;
  contentFile?: string;
  imagePath?: string;
  slug?: string;
}

// ─── Load blog config ─────────────────────────────────────────────────────────

function loadBlogs(): Record<string, BlogConfig> {
  const configPath = path.join(process.cwd(), "blogs.config.json");
  if (!existsSync(configPath)) {
    console.error("❌ blogs.config.json not found in current directory");
    console.error("   Run this command from your project root.");
    process.exit(1);
  }
  try {
    const raw = readFileSync(configPath, "utf-8");
    return (JSON.parse(raw) as BlogsConfig).blogs;
  } catch {
    console.error("❌ Could not parse blogs.config.json");
    process.exit(1);
  }
}

// ─── CLI args ─────────────────────────────────────────────────────────────────

function parseArgs(): ParsedArgs {
  const args = process.argv.slice(2);

  if (args.includes("--list")) return { action: "list" };
  if (args.includes("init")) return { action: "init" };

  const blogIdx = args.indexOf("--blog");
  const publishIdx = args.indexOf("--publish");
  const removeIdx = args.indexOf("--remove");
  const imageIdx = args.indexOf("--image");

  if (blogIdx === -1 || !args[blogIdx + 1]) {
    printUsage();
    process.exit(1);
  }

  const blogKey = args[blogIdx + 1];

  // --fetch mode
  const fetchIdx = args.indexOf("--fetch");
  if (fetchIdx !== -1) {
    const slug = args[fetchIdx + 1];
    if (!slug) {
      console.error(
        "❌ Provide a slug: blog-publish --blog <key> --fetch <slug>",
      );
      process.exit(1);
    }
    return { action: "fetch", blogKey, slug };
  }

  // --update mode
  const updateIdx = args.indexOf("--update");
  if (updateIdx !== -1) {
    const slug = args[updateIdx + 1];
    if (!slug) {
      console.error(
        "❌ Provide a slug: blog-publish --blog <key> --update <slug>",
      );
      process.exit(1);
    }
    return { action: "update", blogKey, slug };
  }

  // --remove mode
  if (removeIdx !== -1) {
    const slug = args[removeIdx + 1];
    if (!slug) {
      console.error(
        "❌ Provide a slug: blog-publish --blog <key> --remove <slug>",
      );
      process.exit(1);
    }
    return { action: "remove", blogKey, slug };
  }

  // --add-image mode
  const addImageIdx = args.indexOf("--add-image");
  if (addImageIdx !== -1) {
    const slug = args[addImageIdx + 1];
    const imagePath = imageIdx !== -1 ? args[imageIdx + 1] : undefined;
    if (!slug) {
      console.error(
        "❌ Provide a slug: blog-publish --blog <key> --add-image <slug> --image <path>",
      );
      process.exit(1);
    }
    if (!imagePath || !existsSync(imagePath)) {
      console.error(
        `❌ Image file not found: ${imagePath ?? "(not provided)"}`,
      );
      process.exit(1);
    }
    return { action: "add-image", blogKey, slug, imagePath };
  }

  // --publish mode
  if (publishIdx !== -1) {
    const contentFile = args[publishIdx + 1];
    const imagePath = imageIdx !== -1 ? args[imageIdx + 1] : undefined;

    if (!contentFile || !existsSync(contentFile)) {
      console.error(
        `❌ Content file not found: ${contentFile ?? "(not provided)"}`,
      );
      process.exit(1);
    }
    if (imagePath && !existsSync(imagePath)) {
      console.error(`❌ Image file not found: ${imagePath}`);
      process.exit(1);
    }
    return { action: "publish", blogKey, contentFile, imagePath };
  }

  printUsage();
  process.exit(1);
}

function printUsage(): void {
  console.error(`
Usage:
  blog-publish init
  blog-publish --list
  blog-publish --blog <key> --publish <file.md> [--image <path>]
  blog-publish --blog <key> --update <slug>
  blog-publish --blog <key> --remove <slug>
  blog-publish --blog <key> --fetch <slug>
  blog-publish --blog <key> --add-image <slug> --image <path>
  `);
}

// ─── Init ─────────────────────────────────────────────────────────────────────

function initProject(): void {
  const configPath = path.join(process.cwd(), "blogs.config.json");
  const envPath = path.join(process.cwd(), ".env");

  if (existsSync(configPath)) {
    console.log("blogs.config.json already exists — skipping.");
  } else {
    const template = JSON.stringify(
      {
        blogs: {
          personal: {
            label: "My Blog",
            github_owner: "your-username",
            github_repo: "your-blog-repo",
            github_branch: "master",
            blog_dir: "content/blog",
            image_dir: "public/images/blog",
            author: "Your Name",
          },
        },
      },
      null,
      2,
    );
    writeFileSync(configPath, template, "utf-8");
    console.log("Created blogs.config.json");
  }

  if (existsSync(envPath)) {
    console.log(".env already exists — skipping.");
  } else {
    writeFileSync(envPath, "GITHUB_TOKEN=github_pat_YOUR_TOKEN_HERE\n", "utf-8");
    console.log("Created .env");
  }

  console.log("\nNext steps:");
  console.log("  1. Edit blogs.config.json with your GitHub repo details");
  console.log("  2. Add your GitHub token to .env");
  console.log("  3. Run: blog-publish --list");
}

// ─── Validate env ─────────────────────────────────────────────────────────────

function validateEnv(): void {
  if (!process.env.GITHUB_TOKEN) {
    console.error("❌ Missing GITHUB_TOKEN in .env");
    process.exit(1);
  }
}

// ─── Parse slug from frontmatter ─────────────────────────────────────────────

function parseSlugFromFile(filePath: string): string {
  const content = readFileSync(filePath, "utf-8");
  const match = content.match(/^slug:\s*["']?([^"'\n]+)["']?/m);
  if (match) return match[1].trim();
  return path.basename(filePath, ".md").replace(/^\d{4}-\d{2}-\d{2}-/, "");
}

// ─── Upload image to GitHub ───────────────────────────────────────────────────

async function uploadImageToGitHub(
  imagePath: string,
  slug: string,
  blogConfig: BlogConfig,
  octokit: Octokit,
): Promise<string> {
  const {
    github_owner: owner,
    github_repo: repo,
    github_branch: branch,
    image_dir,
  } = blogConfig;
  const date = new Date().toISOString().split("T")[0];
  const ext = path.extname(imagePath);
  const repoImagePath = `${image_dir}/${date}-${slug}${ext}`;

  console.log(`🖼️  Uploading image → ${repoImagePath}`);

  let sha: string | undefined;
  try {
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path: repoImagePath,
      ref: branch,
    });
    sha = (data as { sha: string }).sha;
  } catch (e: unknown) {
    if ((e as { status?: number }).status !== 404) throw e;
  }

  await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: repoImagePath,
    message: `blog: add image for "${slug}"`,
    content: readFileSync(imagePath).toString("base64"),
    branch,
    ...(sha ? { sha } : {}),
  });

  return repoImagePath;
}

// ─── Commit .md to GitHub ─────────────────────────────────────────────────────

async function commitMarkdown(
  slug: string,
  markdown: string,
  blogConfig: BlogConfig,
  octokit: Octokit,
): Promise<PublishResult> {
  const {
    github_owner: owner,
    github_repo: repo,
    github_branch: branch,
    blog_dir,
  } = blogConfig;
  const date = new Date().toISOString().split("T")[0];
  const filePath = `${blog_dir}/${date}-${slug}.md`;

  console.log(`📤 Committing → ${owner}/${repo}/${filePath}`);

  let sha: string | undefined;
  try {
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path: filePath,
      ref: branch,
    });
    sha = (data as { sha: string }).sha;
    console.log("⚠️  File exists — updating.");
  } catch (e: unknown) {
    if ((e as { status?: number }).status !== 404) throw e;
  }

  const { data } = await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: filePath,
    message: `blog: publish "${slug}" [${date}]`,
    content: Buffer.from(markdown, "utf-8").toString("base64"),
    branch,
    ...(sha ? { sha } : {}),
  });

  return {
    filePath,
    commitUrl: (data.commit as { html_url: string }).html_url,
    fileUrl: `https://github.com/${owner}/${repo}/blob/${branch}/${filePath}`,
  };
}

// ─── Add/update image on existing post ───────────────────────────────────────

async function addImageToPost(
  slug: string,
  imagePath: string,
  blogConfig: BlogConfig,
  octokit: Octokit,
): Promise<void> {
  const {
    github_owner: owner,
    github_repo: repo,
    github_branch: branch,
    blog_dir,
  } = blogConfig;

  // Find the post file by slug
  console.log(`\n🔍 Looking for post with slug: ${slug}`);

  const { data: tree } = await octokit.git.getTree({
    owner,
    repo,
    tree_sha: branch,
    recursive: "true",
  });

  const match = tree.tree.find((f) => {
    if (!f.path?.startsWith(blog_dir) || !f.path?.endsWith(".md")) return false;
    const filename = path.basename(f.path, ".md");
    return (
      filename === slug || filename.replace(/^\d{4}-\d{2}-\d{2}-/, "") === slug
    );
  });

  if (!match?.path) {
    console.error(`❌ No post found with slug: "${slug}"`);
    process.exit(1);
  }

  // Upload the image
  const imageRepoPath = await uploadImageToGitHub(
    imagePath,
    slug,
    blogConfig,
    octokit,
  );

  // Fetch the existing post content
  const { data: fileData } = await octokit.repos.getContent({
    owner,
    repo,
    path: match.path,
    ref: branch,
  });

  const existingMarkdown = Buffer.from(
    (fileData as { content: string }).content,
    "base64",
  ).toString("utf-8");

  // Update or inject image fields in frontmatter
  let updatedMarkdown = existingMarkdown;
  const imageLine = `image: "/${imageRepoPath}"`;
  const altLine = `image_alt: "Hero image for ${slug}"`;

  if (updatedMarkdown.match(/^image:\s*.*/m)) {
    updatedMarkdown = updatedMarkdown.replace(/^image:\s*.*/m, imageLine);
  } else {
    updatedMarkdown = updatedMarkdown.replace(/^(---\n)/, `$1${imageLine}\n`);
  }

  if (updatedMarkdown.match(/^image_alt:\s*.*/m)) {
    updatedMarkdown = updatedMarkdown.replace(/^image_alt:\s*.*/m, altLine);
  } else {
    updatedMarkdown = updatedMarkdown.replace(
      /^image:\s*.*/m,
      `${imageLine}\n${altLine}`,
    );
  }

  // Commit the updated post
  await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: match.path,
    message: `blog: add image to "${slug}"`,
    content: Buffer.from(updatedMarkdown, "utf-8").toString("base64"),
    sha: (fileData as { sha: string }).sha,
    branch,
  });

  // Update local copy frontmatter with image path
  updateLocalCopy(
    slug,
    (md) => {
      const imageLine = `image: "/${imageRepoPath}"`;
      const altLine = `image_alt: "Hero image for ${slug}"`;
      if (md.match(/^image:\s*.*/m)) {
        md = md.replace(/^image:\s*.*/m, imageLine);
      } else {
        md = md.replace(/^(---\n)/, `$1${imageLine}\n`);
      }
      if (md.match(/^image_alt:\s*.*/m)) {
        md = md.replace(/^image_alt:\s*.*/m, altLine);
      } else {
        md = md.replace(/^image:\s*.*/m, `${imageLine}\n${altLine}`);
      }
      return md;
    },
  );

  console.log(`\n🎉 Image added!`);
  console.log(`   Post:  ${match.path}`);
  console.log(`   Image: ${imageRepoPath}`);

  console.log(`\n__RESULT_JSON__`);
  console.log(
    JSON.stringify({
      action: "add-image",
      slug,
      imageRepoPath,
      blog: blogConfig.label,
    }),
  );
}

// ─── Update existing post from _published/ ───────────────────────────────────

async function updatePost(
  slug: string,
  blogConfig: BlogConfig,
  octokit: Octokit,
): Promise<void> {
  const dir = publishedDir();
  const { readdirSync } = require("fs");
  const files = readdirSync(dir) as string[];
  const match = files.find((f: string) => {
    const name = path.basename(f, ".md");
    return name === slug || name.replace(/^\d{4}-\d{2}-\d{2}-/, "") === slug;
  });

  if (!match) {
    console.error(`❌ No local copy found for slug: "${slug}"`);
    console.error(`   Looked in: ${dir}`);
    console.error(`   Use --publish to publish a new draft instead.`);
    process.exit(1);
  }

  const filePath = path.join(dir, match);
  const markdown = readFileSync(filePath, "utf-8");
  const parsedSlug = parseSlugFromFile(filePath);

  console.log(`\n📝 Updating from local copy: _published/${match}`);

  const result = await commitMarkdown(
    parsedSlug,
    markdown,
    blogConfig,
    octokit,
  );

  console.log(`\n🎉 Updated!`);
  console.log(`   File:   ${result.filePath}`);
  console.log(`   Commit: ${result.commitUrl}`);
  console.log(`   View:   ${result.fileUrl}`);

  console.log(`\n__RESULT_JSON__`);
  console.log(
    JSON.stringify({
      action: "update",
      slug: parsedSlug,
      blog: blogConfig.label,
      fileUrl: result.fileUrl,
      commitUrl: result.commitUrl,
    }),
  );
}

// ─── Remove post from GitHub ──────────────────────────────────────────────────

async function removePost(
  slug: string,
  blogConfig: BlogConfig,
  octokit: Octokit,
): Promise<void> {
  const {
    github_owner: owner,
    github_repo: repo,
    github_branch: branch,
    blog_dir,
  } = blogConfig;

  // Find the file — it may have any date prefix
  console.log(`\n🔍 Looking for post with slug: ${slug}`);

  const { data: tree } = await octokit.git.getTree({
    owner,
    repo,
    tree_sha: branch,
    recursive: "true",
  });

  const match = tree.tree.find((f) => {
    if (!f.path?.startsWith(blog_dir) || !f.path?.endsWith(".md")) return false;
    const filename = path.basename(f.path, ".md");
    // Exact match or strip date prefix e.g. 2026-03-13-my-slug → my-slug
    return (
      filename === slug || filename.replace(/^\d{4}-\d{2}-\d{2}-/, "") === slug
    );
  });

  if (!match?.path) {
    console.error(`❌ No post found with slug: "${slug}"`);
    console.error(`   Searched in: ${blog_dir}/`);
    process.exit(1);
  }

  console.log(`🗑️  Removing → ${owner}/${repo}/${match.path}`);

  // Get the file SHA needed for deletion
  const { data: fileData } = await octokit.repos.getContent({
    owner,
    repo,
    path: match.path,
    ref: branch,
  });

  const { data } = await octokit.repos.deleteFile({
    owner,
    repo,
    path: match.path,
    message: `blog: remove "${slug}"`,
    sha: (fileData as { sha: string }).sha,
    branch,
  });

  deleteLocalCopy(slug);

  console.log(`\n🎉 Removed!`);
  console.log(`   File:   ${match.path}`);
  console.log(`   Commit: ${(data.commit as { html_url: string }).html_url}`);

  console.log(`\n__RESULT_JSON__`);
  console.log(
    JSON.stringify({
      action: "remove",
      slug,
      blog: blogConfig.label,
      commitUrl: (data.commit as { html_url: string }).html_url,
    }),
  );
}

// ─── Local copy helpers (in CWD) ──────────────────────────────────────────────

function publishedDir(): string {
  const dir = path.join(process.cwd(), "_published");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

function draftsDir(): string {
  const dir = path.join(process.cwd(), "drafts");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

function saveLocalCopy(slug: string, markdown: string): string {
  const date = new Date().toISOString().split("T")[0];
  const filePath = path.join(publishedDir(), `${date}-${slug}.md`);
  writeFileSync(filePath, markdown, "utf-8");
  return filePath;
}

function updateLocalCopy(
  slug: string,
  updater: (content: string) => string,
): void {
  const dir = publishedDir();
  const { readdirSync } = require("fs");
  const files = readdirSync(dir) as string[];
  const match = files.find((f: string) => {
    const name = path.basename(f, ".md");
    return name === slug || name.replace(/^\d{4}-\d{2}-\d{2}-/, "") === slug;
  });
  if (!match) return;
  const filePath = path.join(dir, match);
  writeFileSync(filePath, updater(readFileSync(filePath, "utf-8")), "utf-8");
}

function deleteLocalCopy(slug: string): void {
  const dir = publishedDir();
  const { readdirSync, unlinkSync } = require("fs");
  const files = readdirSync(dir) as string[];
  const match = files.find((f: string) => {
    const name = path.basename(f, ".md");
    return name === slug || name.replace(/^\d{4}-\d{2}-\d{2}-/, "") === slug;
  });
  if (match) {
    unlinkSync(path.join(dir, match));
    console.log(`🗂️  Local copy removed: _published/${match}`);
  }
}

// ─── Fetch post from GitHub to drafts/ ───────────────────────────────────────

async function fetchPost(
  slug: string,
  blogConfig: BlogConfig,
  octokit: Octokit,
): Promise<void> {
  const {
    github_owner: owner,
    github_repo: repo,
    github_branch: branch,
    blog_dir,
  } = blogConfig;

  console.log(`\n🔍 Looking for post with slug: ${slug}`);

  const { data: tree } = await octokit.git.getTree({
    owner,
    repo,
    tree_sha: branch,
    recursive: "true",
  });

  const match = tree.tree.find((f) => {
    if (!f.path?.startsWith(blog_dir) || !f.path?.endsWith(".md")) return false;
    const filename = path.basename(f.path, ".md");
    return (
      filename === slug || filename.replace(/^\d{4}-\d{2}-\d{2}-/, "") === slug
    );
  });

  if (!match?.path) {
    console.error(`❌ No post found with slug: "${slug}"`);
    process.exit(1);
  }

  const { data: fileData } = await octokit.repos.getContent({
    owner,
    repo,
    path: match.path,
    ref: branch,
  });

  const markdown = Buffer.from(
    (fileData as { content: string }).content,
    "base64",
  ).toString("utf-8");

  // Save to drafts/ in CWD
  const dir = draftsDir();
  const filename = path.basename(match.path);
  const localPath = path.join(dir, filename);
  writeFileSync(localPath, markdown, "utf-8");

  console.log(`\n✅ Fetched: ${match.path}`);
  console.log(
    `   Saved to: ${path.relative(process.cwd(), localPath)}`,
  );

  console.log(`\n__RESULT_JSON__`);
  console.log(JSON.stringify({ action: "fetch", slug, localPath, filename }));
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = parseArgs();

  if (args.action === "init") {
    initProject();
    return;
  }

  const blogs = loadBlogs();

  if (args.action === "list") {
    console.log("\n📚 Configured blogs:\n");
    for (const [key, cfg] of Object.entries(blogs)) {
      console.log(
        `  ${key.padEnd(16)} ${cfg.label} → ${cfg.github_owner}/${cfg.github_repo}`,
      );
    }
    console.log();
    return;
  }

  validateEnv();

  const blogConfig = blogs[args.blogKey!];
  if (!blogConfig) {
    console.error(
      `❌ Unknown blog: "${args.blogKey}". Available: ${Object.keys(blogs).join(", ")}`,
    );
    process.exit(1);
  }

  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

  try {
    // ── FETCH ─────────────────────────────────────────────────────────────────
    if (args.action === "fetch") {
      await fetchPost(args.slug!, blogConfig, octokit);
      return;
    }

    // ── UPDATE ───────────────────────────────────────────────────────────────
    if (args.action === "update") {
      await updatePost(args.slug!, blogConfig, octokit);
      return;
    }

    // ── ADD IMAGE ─────────────────────────────────────────────────────────────
    if (args.action === "add-image") {
      await addImageToPost(args.slug!, args.imagePath!, blogConfig, octokit);
      return;
    }

    // ── REMOVE ────────────────────────────────────────────────────────────────
    if (args.action === "remove") {
      await removePost(args.slug!, blogConfig, octokit);
      return;
    }

    // ── PUBLISH ───────────────────────────────────────────────────────────────
    let markdown = readFileSync(args.contentFile!, "utf-8");
    const slug = parseSlugFromFile(args.contentFile!);

    console.log(`\n📄 Publishing: ${args.contentFile}`);
    console.log(`   Slug: ${slug}`);

    if (args.imagePath) {
      const imageRepoPath = await uploadImageToGitHub(
        args.imagePath,
        slug,
        blogConfig,
        octokit,
      );
      if (!markdown.includes("image:")) {
        markdown = markdown.replace(
          /^(---\n)/,
          `$1image: "/${imageRepoPath}"\nimage_alt: "Hero image for ${slug}"\n`,
        );
      }
      console.log(`✅ Image uploaded: ${imageRepoPath}`);
    }

    const result = await commitMarkdown(slug, markdown, blogConfig, octokit);

    const localCopy = saveLocalCopy(slug, markdown);
    console.log(`\n🎉 Published!`);
    console.log(`   File:   ${result.filePath}`);
    console.log(
      `   Local:  ${path.relative(process.cwd(), localCopy)}`,
    );
    console.log(`   Commit: ${result.commitUrl}`);
    console.log(`   View:   ${result.fileUrl}`);

    console.log(`\n__RESULT_JSON__`);
    console.log(
      JSON.stringify({
        slug,
        blog: blogConfig.label,
        fileUrl: result.fileUrl,
        commitUrl: result.commitUrl,
      }),
    );
  } catch (err: unknown) {
    console.error("\n❌ Error:", (err as Error).message);
    process.exit(1);
  }
}

main();
