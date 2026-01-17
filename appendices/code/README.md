# ExTester Test Generator

Generate, run, and heal VS Code UI tests with the ExTester (vscode-extension-tester) stack without leaving the editor. The extension brings together OpenAI models, ExTester CLI automation, and rich progress reporting to help you design reliable UI suites for VS Code extensions.

## Highlights

- **AI-backed proposal engine** – analyses the workspace `package.json` and asks `gpt-5` for structured UI test ideas grouped by category.
- **One-click test authoring** – feeds each proposal into `gpt-5-codex` to emit runnable ExTester TypeScript files under `src/ui-test/<category>/<test-name>.test.ts`, falling back to a stub when generation fails.
- **Automated healing loops** – parses ExTester/Mocha/TypeScript output, classifies failures, and drafts fixes that are written back to disk and re-run.
- **Task-aware execution** – wraps `npx extest setup-and-run <compiled-test.js>` inside VS Code tasks, capturing stdout/stderr for later parsing and for showing warnings in the integrated terminal.
- **Workspace integration** – exposes commands in the "ExTester Test Generator" activity bar view and logs everything to a dedicated output channel for easy auditing.

## How the plugin works

1. **Generate Test Proposals** (`extester-test-generator.generateTestProposals`)
   - Loads the workspace `package.json`, extracts commands/activation events/settings, and builds a manifest summary.
   - Sends a proposal prompt to ChatGPT and parses the JSON response into `TestProposal` objects.
   - Creates `/src/ui-test/<category>/` folders, applies the optional `maxGeneratedTests` limit, and streams per-file progress while generating content via Codex.
2. **Fix Compilation Issues** (`extester-test-generator.fixCompilationIssues`)
   - Runs the workspace `ui-test` script (falls back to `test`) with `npm run <script> --silent` and `CI=1`.
   - Uses `parseTestOutputForFailures` to detect TypeScript or Mocha compilation errors and the associated files via `extractTestFilesFromFailures`.
   - Crafts a targeted fix prompt that includes the failing output, current file content, and manifest facts, writes the AI response to disk, and re-runs the suite.
3. **Fix Runtime Failures** (`extester-test-generator.fixRuntimeFailures`)
   - Discovers every `**/ui-test/**/*.ts` file, then runs each one individually through `RunFileTask`, which transpiles the `.ts` path to its compiled `.js` twin in the configured `extesterRunner.outputFolder` (default `out`).
   - Parses each execution, classifies failures (`runtime` vs `compilation`), and uses the runtime-specific prompt that injects waits/retries/navigation guidance.
   - Applies fixes per test file, immediately re-runs the file to verify, and keeps track of which files are passing or still unresolved.

Supporting modules live under `src/utils/` and `src/tasks/` and include prompt builders, OpenAI wrappers, manifest parsers, glob-based discovery, and structured logging.

## Requirements

- **VS Code** 1.99.0 or newer.
- **Node.js** 18+ with npm to run workspace scripts.
- An **OpenAI API key** with access to `gpt-5` and `gpt-5-codex` models. Store it in the VS Code setting `extester-test-generator.apiKey`.
- A **workspace package.json** that defines either an `ui-test` or `test` npm script that drives ExTester (usually `extest setup-and-run` or `vscode-extension-tester`).
- The **ExTester CLI** available through `npx extest` and a compiled output folder (default `out/`) that holds transpiled `.js` tests matching the `.ts` sources under `src/ui-test`.
- Optional but recommended: the `extesterRunner` configuration block (from the ExTester Runner extension) in your VS Code settings so the `RunFileTask` knows which VS Code build, temp storage, and additional CLI flags to use.

## Installation

### From the packaged VSIX

1. Download `extester-test-generator-0.1.0.vsix` from this repository (or a release).
2. In VS Code run the command palette → `Extensions: Install from VSIX...` and pick the downloaded file.
3. Reload VS Code when prompted.

### From source

1. Clone the repository and run `npm install`.
2. Use `npm run watch` during development or `npm run compile` for a one-off build (esbuild bundles to `dist/`).
3. Press `F5` in VS Code to launch an Extension Development Host that loads this project.
4. Optionally, run `npm run vscode:prepublish` to produce the optimized `dist/extension.js` before packaging.

## Configuration

### Extension settings (`extester-test-generator`)

| Setting             | Description                                                                                                                                                 |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apiKey`            | OpenAI API key. Required before any AI action is attempted. Missing keys show an in-editor error notification.                                              |
| `maxGeneratedTests` | Optional numeric limit (per run) applied to the ordered proposal list before test files are generated. Leave unset to process everything the model returns. |

### ExTester runner settings

`RunFileTask` reads `extesterRunner.*` settings from the workspace to prepare `npx extest setup-and-run` invocations. Example:

```jsonc
{
  "extesterRunner": {
    "outputFolder": "out",
    "rootFolder": "src/ui-test",
    "tempFolder": "/tmp/extester",
    "visualStudioCode": {
      "Version": "stable",
      "Type": "insiders",
    },
    "additionalArgs": ["--install-deps"],
  },
}
```

When unset, the defaults are `out/` for compiled JS and no extra arguments.

### Workspace layout

- Generated files live inside `src/ui-test/<category>/<test-name>.test.ts`.
- Categories map directly to folders; names are camelCase and include `.test.ts`.
- When AI cannot emit a valid file, the extension creates a placeholder Mocha test with TODO comments.
- Compiled output is expected under `out/` (TypeScript → JavaScript). Ensure your project compiles TypeScript tests before running ExTester.

## Commands and Generator View

The extension contributes an _activity bar container_ named **ExTester Test Generator view** with a single tree (`generator-view`). Each node triggers a command:

| Tree item                 | Command                                         | What it does                                                                                                                                                               |
| ------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Generate Test Proposals` | `extester-test-generator.generateTestProposals` | Full AI generation pipeline described above. Shows a progress notification, logs every step to the output channel, and surfaces success/failure via toast messages.        |
| `Fix Compilation Issues`  | `extester-test-generator.fixCompilationIssues`  | Runs the default workspace UI test script, parses compiler output, applies one AI fix at a time, and re-runs the suite.                                                    |
| `Fix Runtime Failures`    | `extester-test-generator.fixRuntimeFailures`    | Iterates through all discovered tests, re-runs each individually through `npx extest setup-and-run`, applies runtime-focused fixes, and verifies the fix before moving on. |

You can also bind these commands to keyboard shortcuts or call them from the Command Palette.

## Typical workflow

1. Open the VS Code extension project whose UI should be covered and ensure `npm install` succeeded.
2. Configure `extester-test-generator.apiKey` and (optionally) `maxGeneratedTests`.
3. Click the activity bar icon → run **Generate Test Proposals**. Inspect `src/ui-test/` to review generated files.
4. Run your UI test script manually if desired, then execute **Fix Compilation Issues** to heal any TypeScript or import errors the run reported.
5. Once tests compile, use **Fix Runtime Failures**. Watch the output channel to see which tests passed, which were fixed, and which still need manual intervention.
6. Commit the new/updated tests and iterate.

## Architecture notes

- `src/extension.ts` wires up the commands, progress reporters, and the tree provider. It is also where the logic for cleaning AI responses, choosing prompts, and orchestrating run/fix loops lives.
- `src/utils/openAiUtils.ts` wraps the OpenAI SDK to send prompts to `gpt-5` and `gpt-5-codex`, logging token usage and surfacing user-friendly error messages when the key is missing.
- `src/utils/prompts.ts` keeps the prompt templates for proposal generation, file generation, runtime fixes, and compilation fixes so they can evolve independently of the command code.
- `src/utils/testRunner.ts` handles everything related to running tests via npm scripts, discovering UI test files with `glob`, and normalizing results into the `TestRunResult` interface.
- `src/tasks/RunFileTask.ts` extends a shared `TestRunner` base class to execute a single compiled test file through `npx extest setup-and-run`, capturing stdout/stderr via a temporary file so the subsequent parser has reliable data.
- `src/utils/testFailureParser.ts` is a lightweight parser tuned for Mocha/ExTester output; it strips ANSI codes, identifies TypeScript compiler errors, stack traces, and classifies each failure (`runtime` vs `compilation`).
- `src/utils/testFileUtils.ts` is responsible for creating directories, placeholder files, and AI-generated TypeScript content based on the proposals.
- Tests under `src/test/` cover the OpenAI utilities and activation surface using the `@vscode/test-electron` harness invoked by `npm test`.

## Troubleshooting

- **"OpenAI API key missing"** – set `extester-test-generator.apiKey` in either User or Workspace settings and retry.
- **No UI tests found** – ensure your tests live under `src/ui-test/` (or adjust the folder structure to match the discovery glob) and that the files end with `.ts`.
- **`npm run ui-test` fails before ExTester launches** – run the script manually in a terminal to confirm dependencies and VS Code downloads, then re-run the command from the generator view.
- **Fix command writes to the wrong place** – if the failure output does not contain a path, the extension prompts you for a destination. Provide a path relative to the workspace root (folder or file) so the fix can be saved.
- **`npx extest` not found** – install `extest` or add it as a dev dependency so `npx` can resolve it. The runtime fix command shells out to that binary for every test file.

## Development

- `npm run lint` / `npm run check-types` keep the TypeScript sources clean.
- `npm run compile-tests` builds the `src/test` suite into `out/` for VS Code's test runner; `npm run test` launches `@vscode/test-electron`.
- `npm run format` applies Prettier across the codebase.
- When contributing, update `CHANGELOG.md` and package version numbers as needed.

## License

This project is licensed under the [Apache License 2.0](LICENSE.md).
