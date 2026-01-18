# ExTester Test Generator for VS Code (Master's Thesis)

Master's thesis repository with a VS Code extension that uses generative AI to propose, generate, run, and repair ExTester UI tests for VS Code extensions.

## Abstract

This master thesis focuses on the use of generative artificial intelligence for automating the testing of user interfaces for extensions in the Visual Studio Code editor. The aim of the thesis was to design and implement a prototype tool in the form of a Visual Studio Code extension that combines the existing ExTester testing framework with generative language models and can automatically generate user interface tests for a given extension. The proposed solution includes a user interface in the Visual Studio Code sidebar, loading the manifest of the tested extension to obtain context, and integrating a cloud AI service to generate test scenarios and test source code. The ExTester framework is then used to run the generated tests and analyze their results. The tool can also automatically suggest fixes when tests fail. Developed plugin expands the capabilities of the ExTester framework and indicates the direction of future development of software testing tools.

## Public Repository

The extension implementation is maintained as a public repository for ongoing development, issue tracking, and reuse outside the thesis snapshot. Use this repo if you want the latest version, to build from source, or to follow updates:
<https://github.com/pospisilf/extester-code-generator>

Example project for trying the extension:
<https://github.com/pospisilf/extester-code-generator-example>

## Project Overview

This repository contains:

- Thesis PDF (Czech) and review documents
- Source code for the ExTester Test Generator VS Code extension
- Packaged VSIX for quick installation
- Experimental results from the evaluation

## Project Goals

- Automate UI test proposal generation from a VS Code extension manifest
- Generate runnable ExTester tests with LLM assistance
- Run tests and iteratively fix compilation and runtime failures
- Evaluate the approach on real extensions and document the outcomes

## Repository Structure

```
.
├── thesis.pdf (Czech)
├── supervisor_review.pdf (Czech)
├── opponent_review.pdf (Czech)
└── appendices
    ├── README.md (Czech)
    ├── code
    │   ├── README.md (English)
    │   └── ... (VS Code extension source)
    ├── vsix
    │   └── extester-test-generator-0.1.0.vsix
    └── results
        ├── 0-all-generated-test-cases
        ├── 1-selected-generated-tests
        ├── 2-fix-compilation-issues
        ├── 3-fix-runtime-issues
        └── 4-manual-issues-fix
```

## Thesis Documentation

The thesis is written in Czech and covers:

- Introduction: motivation and project goals
- Related technologies: VS Code extension API, ExTester, and generative AI for UI testing
- Design: architecture and workflow
- Implementation: extension features and integration details
- Testing and evaluation: validation process and experimental outcomes
- Conclusion: results and future work

## Reviews

Both the opponent and supervisor reviews were graded A (the highest grade in the ECTS A–F scale). The review PDFs are available in this repository:

- `opponent_review.pdf` (Czech)
- `supervisor_review.pdf` (Czech)

## Technical Details

This repository captures the state at the time of thesis submission. The actively maintained open-source extension lives in the public repository ([extester-code-generator](https://github.com/pospisilf/extester-code-generator)); consider this repo a thesis backup/snapshot rather than the authoritative implementation.

### Dependencies

- [VS Code 1.99+](https://code.visualstudio.com) and [Node.js 18+](https://nodejs.org)
- [VS Code Extension Tester (ExTester)](https://github.com/redhat-developer/vscode-extension-tester)
- [OpenAI API key](https://platform.openai.com/settings/organization/api-keys)
- Optional: [ExTester Runner](https://github.com/redhat-developer/vscode-extension-tester/tree/main/packages/extester-runner) settings for single-test runs

### Key Components

- `src/extension.ts`: command orchestration, progress reporting, and AI workflow
- `src/utils/openAiUtils.ts`: OpenAI requests and error handling
- `src/utils/prompts.ts`: prompt templates for proposals and fixes
- `src/utils/testRunner.ts`: suite execution and result normalization
- `src/tasks/RunFileTask.ts`: single-test execution via `npx extest`
- `src/utils/testFailureParser.ts`: failure parsing and classification

## Features

- **AI-backed test proposals**: derive UI test ideas from the extension manifest
- **Automated test authoring**: generate runnable ExTester TypeScript tests
- **Self-healing loops**: suggest fixes for compilation and runtime failures
- **VS Code integration**: sidebar UI, progress reporting, and output logs

## Author

**Filip Pospisil**
Institution: [Mendel University in Brno](https://mendelu.cz/en/) (Open Informatics study program, Faculty of Business and Economics)

## License

The extension implementation and example projects are licensed under the Apache License 2.0 (see `appendices/code/LICENSE.md` and the public repositories). The thesis PDFs are provided for academic use per MENDELU guidelines.

## Contributing

Contributions are handled in the main repository:
<https://github.com/pospisilf/extester-code-generator>

For questions or suggestions related to this thesis snapshot, please contact the author.

## References

- [ExTester](https://github.com/redhat-developer/vscode-extension-tester)
- [ExTester Runner](https://github.com/redhat-developer/vscode-extension-tester/tree/main/packages/extester-runner)
- [OpenAI](https://platform.openai.com/docs)
- [ExTester Code Generator](https://github.com/pospisilf/extester-code-generator)
- [ExTester Code Generator Example](https://github.com/pospisilf/extester-code-generator-example)

---

*This repository contains both the implementation code and the complete master's thesis documentation in Czech.*
