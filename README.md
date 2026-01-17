# ExTester Test Generator for VS Code (Master's Thesis)

Master's thesis repository with a VS Code extension that uses generative AI to propose, generate, run, and repair ExTester UI tests for VS Code extensions.

## Abstract

This master thesis focuses on the use of generative artificial intelligence for automating the testing of user interfaces for extensions in the Visual Studio Code editor. The aim of the thesis was to design and implement a prototype tool in the form of a Visual Studio Code extension that combines the existing ExTester testing framework with generative language models and can automatically generate user interface tests for a given extension. The proposed solution includes a user interface in the Visual Studio Code sidebar, loading the manifest of the tested extension to obtain context, and integrating a cloud AI service to generate test scenarios and test source code. The ExTester framework is then used to run the generated tests and analyze their results. The tool can also automatically suggest fixes when tests fail. Developed plugin expands the capabilities of the ExTester framework and indicates the direction of future development of software testing tools.

## Public Repository

The extension implementation is maintained as a public repository for ongoing development, issue tracking, and reuse outside the thesis snapshot. Use this repo if you want the latest version, to build from source, or to follow updates:
https://github.com/pospisilf/extester-code-generator

Example project for trying the extension:
https://github.com/pospisilf/extester-code-generator-example

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
├── thesis.pdf
├── supervisor_review.pdf
├── opponent_review.pdf
└── appendices
    ├── README.md
    ├── code
    │   ├── README.md
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
