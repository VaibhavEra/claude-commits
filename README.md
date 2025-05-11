# Git Commit Message Template & Project Context Prompt

## Instructions for Claude

I need help writing high-quality Git commit messages following industry best practices. Using the information I provide below, please:

1. Generate complete, structured commit messages following the template format
2. Break down large changes into multiple atomic commits when appropriate
3. Maintain context between sessions using the project information and previous commits
4. Analyze the specific line changes to understand the nature of the modifications
5. Focus on explaining the "what" and "why" rather than the "how" in commit messages
6. Follow all rules specified in the template regarding format, length, and style

If I provide multiple unrelated changes, suggest how to break them down into separate commits with individual messages. When I start a new chat, I'll include previous commits to re-establish context.

## Project Context

```
Project Name: [PROJECT_NAME]
Tech Stack: [TECHNOLOGIES_USED]
Repository: [REPO_URL]
Special Conventions: [ANY_PROJECT_SPECIFIC_CONVENTIONS]
```

## Previous Commits (For Context Restoration)

```
[PASTE_PREVIOUS_COMMITS_HERE_WHEN_STARTING_NEW_CHAT]
```

## Changes Made

```
File: [FILENAME]
Lines: [LINE_NUMBERS]
Description: [BRIEF_DESCRIPTION_OF_CHANGES]

[REPEAT_FOR_EACH_FILE]
```

## Commit Message Template

### Format

```
<type>(<optional scope>): <subject>

<body>

<footer>
```

### Rules:

1. **Type**: Must be one of the following:

   - `feat`: A new feature
   - `fix`: A bug fix
   - `docs`: Documentation changes
   - `style`: Changes that don't affect code meaning (formatting, etc.)
   - `refactor`: Code changes that neither fix bugs nor add features
   - `perf`: Performance improvements
   - `test`: Adding or fixing tests
   - `chore`: Changes to build process, dependencies, etc.

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
   - Format for issues: `Closes #123, #456`
   - Format for breaking changes: `BREAKING CHANGE: <description>`

### Examples of Good Commit Messages:

**Simple change (subject line only):**

```
fix(auth): correct password validation logic
```

**Feature with explanation:**

```
feat(search): implement fuzzy search algorithm

Improve search results by implementing fuzzy matching that tolerates
minor typos and spelling variations. This addresses user feedback
about search being too strict and missing relevant results.

Closes #142
```

**Bug fix with detailed explanation:**

```
fix(payment): prevent duplicate transaction submissions

Add deduplication check based on transaction fingerprinting to
prevent users from accidentally submitting payment multiple times
when experiencing network lag.

Previously the system would process each click as a new transaction,
potentially causing multiple charges. This implementation adds a
5-second cooldown while maintaining UX responsiveness.

Closes #389
```

**Breaking change:**

```
refactor(api): simplify authentication endpoints

Consolidate the three different auth endpoints into a single
unified endpoint that handles all authentication methods.

BREAKING CHANGE: The /login, /oauth, and /sso endpoints are
removed in favor of the new /auth endpoint.

Closes #567
```

## Guidelines for Breaking Down Large Changes:

If changes span multiple files or contain multiple logical changes:

1. Group related changes into cohesive, atomic commits
2. Each commit should implement exactly one logical change
3. Sequence commits in a way that tells a story about the implementation
4. Consider separating refactoring from feature additions
5. When in doubt, make more smaller commits rather than fewer larger ones
