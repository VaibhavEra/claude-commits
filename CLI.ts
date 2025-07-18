// 📁 Script: generate-claude-context.ts
// Description: CLI tool to generate Claude-ready prompt file with staged Git changes + full commit history

import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const CONTEXT_DIR = ".context";
const PROMPT_FILE = path.join(CONTEXT_DIR, "claude_prompt.md");
const COMMITS_FILE = path.join(CONTEXT_DIR, "commit_history.md");

function ensureContextFolder() {
  if (!fs.existsSync(CONTEXT_DIR)) {
    fs.mkdirSync(CONTEXT_DIR);
  }
}

function getStagedFiles(): string[] {
  const output = execSync("git diff --cached --name-only", {
    encoding: "utf-8",
  });
  return output.split("\n").filter(Boolean);
}

function getDiffForFile(file: string): string {
  try {
    return execSync(`git diff --cached -- ${file}`, { encoding: "utf-8" });
  } catch {
    return "";
  }
}

function getGitLogAllDetailed(): string {
  try {
    return execSync(
      `git log --pretty=format:"%h%n%ad%n%B%n----------------------" --date=short`,
      { encoding: "utf-8" }
    );
  } catch {
    return "No commits found.";
  }
}

function getGitLogRecent(n = 5): string {
  try {
    return execSync(`git log -n ${n} --pretty=format:"%h %s"`, {
      encoding: "utf-8",
    });
  } catch {
    return "No previous commits found.";
  }
}

function detectFileType(filePath: string): string {
  if (!fs.existsSync(filePath)) return "deleted";
  const isNew = execSync(`git diff --cached --diff-filter=A --name-only`, {
    encoding: "utf-8",
  }).includes(filePath);
  return isNew ? "new" : "modified";
}

function buildPrompt() {
  ensureContextFolder();

  const files = getStagedFiles();
  const gitLogRecent = getGitLogRecent();
  const gitLogAll = getGitLogAllDetailed();
  const summary: string[] = [];
  const details: string[] = [];

  for (const file of files) {
    const type = detectFileType(file);
    const diff = getDiffForFile(file);

    summary.push(
      `| ${file} | ${type} | ${diff.match(/@@/g)?.length || 0} chunks |`
    );
    details.push(
      `### ${file} _(${type})_\n\n\`\`\`diff\n${diff.trim()}\n\`\`\`\n`
    );
  }

  const instructions = `## 📝 Instructions for Claude

Please generate clear, conventional Git commit messages from the changes above.

Follow this format:

\\<type>(\\<optional scope>): \\<subject>

\\<body>

\\<footer>

### Allowed types:
- feat: New feature
- fix: Bug fix
- docs: Docs-only changes
- style: Code formatting (no logic change)
- refactor: Code restructuring
- perf: Performance improvement
- test: Tests added or updated
- chore: Tooling or build changes

### Subject line rules:
- Max 50 characters
- Use imperative mood (“Add”, not “Added”)
- No period at the end

### Body:
- Explain what and why, not how
- Wrap lines at ~72 characters
- Use multiple paragraphs if needed

### Footer (optional):
- References: Closes #123
- Breaking changes: BREAKING CHANGE: description

### Examples:

**fix(auth): correct password validation logic**

**feat(search): implement fuzzy search**

Improve results with fuzzy matching to handle typos and increase recall.

Closes #142

**refactor(api): simplify auth routes**

BREAKING CHANGE: Consolidates /login, /oauth, and /sso into /auth

Closes #567

Split unrelated changes into multiple commits if necessary.`;

  const prompt = `# 💡 Git Commit Assistant — Claude Edition

## 🛠️ Project Context

- **Project**: YOUR_PROJECT_NAME
- **Tech Stack**: YOUR_TECH_STACK
- **Special Conventions**: YOUR_CONVENTIONS

---

## 🧾 Previous Commits

\`\`\`text
${gitLogRecent}
\`\`\`

---

## 📂 File Changes Summary

| Filepath | Type | Diff Chunks |
|----------|------|--------------|
${summary.join("\n")}

---

## 🔍 Detailed Changes

${details.join("\n---\n\n")}

---

${instructions}

---

## 🧠 Context ID

> _Generated: ${new Date().toISOString()}_`;

  fs.writeFileSync(PROMPT_FILE, prompt);
  fs.writeFileSync(
    COMMITS_FILE,
    `# 🖊️ Commit History\n\n\`\`\`\n${gitLogAll}\n\`\`\``
  );
  console.log(`✅ Claude prompt generated at: ${PROMPT_FILE}`);
  console.log(`✅ Commit history saved at: ${COMMITS_FILE}`);
}

buildPrompt();
