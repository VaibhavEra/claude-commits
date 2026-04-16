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

// ✅ FIX #1: Quote file paths so `(auth)` folders don't break the shell
// ✅ FIX #2: Add --unified=0 to ensure @@ chunk headers are always present
function getDiffForFile(file: string): string {
  try {
    return execSync(`git diff --cached --unified=0 -- "${file}"`, {
      encoding: "utf-8",
    });
  } catch {
    return "";
  }
}

function getGitLogAllDetailed(): string {
  try {
    return execSync(
      `git log --pretty=format:"%h%n%ad%n%B%n----------------------" --date=short`,
      { encoding: "utf-8" },
    );
  } catch {
    return "No commits found.";
  }
}

function getGitLogRecent(n = 5): string {
  try {
    return execSync(
      `git log -n ${n} --pretty=format:"%ad%n%B%n----------------------" --date=short`,
      { encoding: "utf-8" },
    );
  } catch {
    return "No previous commits found.";
  }
}

function detectFileType(filePath: string): string {
  if (!fs.existsSync(filePath)) return "deleted";
  const addedFiles = execSync(`git diff --cached --diff-filter=A --name-only`, {
    encoding: "utf-8",
  });
  return addedFiles.includes(filePath) ? "new" : "modified";
}

function parseChangedLines(diff: string): string {
  const chunks: string[] = [];
  const chunkHeaders = diff.match(/@@[^@@]+@@/g) || [];
  for (const header of chunkHeaders) {
    // Extract line number ranges like +10,5 or +10
    const match = header.match(/\+(\d+)(?:,(\d+))?/);
    if (match) {
      const start = parseInt(match[1]);
      const count = match[2] !== undefined ? parseInt(match[2]) : 1;
      chunks.push(count <= 1 ? `${start}` : `${start}–${start + count - 1}`);
    }
  }
  return chunks.length ? chunks.join(", ") : "N/A";
}

function buildPrompt() {
  ensureContextFolder();

  const files = getStagedFiles();
  const gitLogRecent = getGitLogRecent();
  const gitLogAll = getGitLogAllDetailed();
  const changeBlocks: string[] = [];

  for (const file of files) {
    const type = detectFileType(file);
    const diff = getDiffForFile(file);
    const lines = parseChangedLines(diff);

    changeBlocks.push(
      [
        `File: ${file}`,
        `Lines: ${lines}`,
        `Description: [${type === "new" ? "New file added" : type === "deleted" ? "File deleted" : "Modified file"}]`,
        `Code:\n\`\`\`diff\n${diff.trim()}\n\`\`\``,
      ].join("\n"),
    );
  }

  const instructions = `## Instructions for Claude

I need help writing high-quality Git commit messages following industry best practices.
Using the information I provide below, please:

1. Generate complete, structured commit messages following the template format
2. Break down large changes into multiple atomic commits when appropriate
3. Maintain context between sessions using the project information and previous commits
4. Analyze the specific line changes to understand the nature of the modifications
5. Focus on explaining the "what" and "why" rather than the "how" in commit messages
6. Follow all rules specified in the template regarding format, length, and style

If I provide multiple unrelated changes, suggest how to break them down into separate
commits with individual messages. When I start a new chat, I'll include previous commits
to re-establish context.`;

  const commitTemplate = `## Commit Message Template

### Format

\`\`\`
<type>(<optional scope>): <subject>

<body>

<footer>
\`\`\`

### Rules

1. **Type**: Must be one of the following:
   - \`feat\`: A new feature
   - \`fix\`: A bug fix
   - \`docs\`: Documentation changes
   - \`style\`: Changes that don't affect code meaning (formatting, etc.)
   - \`refactor\`: Code changes that neither fix bugs nor add features
   - \`perf\`: Performance improvements
   - \`test\`: Adding or fixing tests
   - \`chore\`: Changes to build process, dependencies, etc.

2. **Subject Line**:
   - Limited to 50 characters
   - Use imperative mood ("Add" not "Added" or "Adds")
   - Capitalize first letter
   - No period at the end
   - Be specific and clear about what changed

3. **Body**:
   - Separated from subject by a blank line
   - Wrapped at 72 characters
   - Explain the "what" and "why" not the "how"
   - Use multiple paragraphs if needed, separated by blank lines

4. **Footer** (Optional):
   - Reference issue trackers, PRs, breaking changes
   - Format for issues: \`Closes #123, #456\`
   - Format for breaking changes: \`BREAKING CHANGE: <description>\`

### Examples of Good Commit Messages

**Simple change (subject line only):**
\`\`\`
fix(auth): correct password validation logic
\`\`\`

**Feature with explanation:**
\`\`\`
feat(search): implement fuzzy search algorithm

Improve search results by implementing fuzzy matching that tolerates
minor typos and spelling variations. This addresses user feedback
about search being too strict and missing relevant results.

Closes #142
\`\`\`

**Bug fix with detailed explanation:**
\`\`\`
fix(payment): prevent duplicate transaction submissions

Add deduplication check based on transaction fingerprinting to
prevent users from accidentally submitting payment multiple times
when experiencing network lag.

Previously the system would process each click as a new transaction,
potentially causing multiple charges. This implementation adds a
5-second cooldown while maintaining UX responsiveness.

Closes #389
\`\`\`

**Breaking change:**
\`\`\`
refactor(api): simplify authentication endpoints

Consolidate the three different auth endpoints into a single
unified endpoint that handles all authentication methods.

BREAKING CHANGE: The /login, /oauth, and /sso endpoints are
removed in favor of the new /auth endpoint.

Closes #567
\`\`\`

## Guidelines for Breaking Down Large Changes

If changes span multiple files or contain multiple logical changes:

1. Group related changes into cohesive, atomic commits
2. Each commit should implement exactly one logical change
3. Sequence commits in a way that tells a story about the implementation
4. Consider separating refactoring from feature additions
5. When in doubt, make more smaller commits rather than fewer larger ones`;

  const prompt = `# Git Commit Message Template & Project Context Prompt

${instructions}

---

## Project Context

\`\`\`
Project Name: [PROJECT_NAME]
Tech Stack: [TECHNOLOGIES_USED]
Repository: [REPO_URL]
Special Conventions: [ANY_PROJECT_SPECIFIC_CONVENTIONS]
\`\`\`

---

## Previous Commits (For Context Restoration)

> Generated with:
> \`git log --pretty=format:"%ad%n%B%n----------------------" > commit_log.txt\`

\`\`\`
${gitLogRecent}
\`\`\`

---

## Changes Made

\`\`\`
${changeBlocks.join("\n\n")}
\`\`\`

---

${commitTemplate}

---

> Generated: ${new Date().toISOString()}`;

  fs.writeFileSync(PROMPT_FILE, prompt);
  fs.writeFileSync(
    COMMITS_FILE,
    `# Commit History\n\n> Generated with:\n> \`git log --pretty=format:"%ad%n%B%n----------------------" > commit_log.txt\`\n\n\`\`\`\n${gitLogAll}\n\`\`\``,
  );

  console.log(`✅ Claude prompt generated at: ${PROMPT_FILE}`);
  console.log(`✅ Commit history saved at: ${COMMITS_FILE}`);
}

buildPrompt();
