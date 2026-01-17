import { VSBrowser, WebDriver, EditorView, Workbench, InputBox, TextEditor } from 'vscode-extension-tester';
import { expect } from 'chai';
import * as fs from 'fs';
import * as path from 'path';

describe('commands - createKameletYamlCreatesFile', () => {
    let driver: WebDriver;
    let workbench: Workbench;
    let createdFilePath: string | undefined;

    const findKameletFile = (root: string, nameFragment: string): string | undefined => {
        const stack: string[] = [root];
        const visited = new Set<string>();

        while (stack.length > 0) {
            const current = stack.pop()!;
            if (visited.has(current)) {
                continue;
            }
            visited.add(current);

            let entries: fs.Dirent[];
            try {
                entries = fs.readdirSync(current, { withFileTypes: true });
            } catch {
                continue;
            }

            for (const entry of entries) {
                if (entry.name === '.' || entry.name === '..') {
                    continue;
                }
                const fullPath = path.join(current, entry.name);
                if (entry.isDirectory()) {
                    if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === '.vscode-test') {
                        continue;
                    }
                    stack.push(fullPath);
                } else if (entry.isFile()) {
                    if (entry.name.toLowerCase().endsWith('.yaml') && entry.name.includes(nameFragment)) {
                        return fullPath;
                    }
                }
            }
        }
        return undefined;
    };

    before(async function() {
        this.timeout(60000);
        driver = VSBrowser.instance.driver;
        workbench = new Workbench();
        await new EditorView().closeAllEditors();
    });

    it("Runs 'Create a Kamelet using YAML DSL' and verifies a new Kamelet YAML file is created and opened.", async function() {
        this.timeout(120000);

        const editorView = new EditorView();
        await editorView.closeAllEditors();
        const initialCount = (await editorView.getOpenEditors()).length;

        const targetCommandLabel = 'Camel: Create a Kamelet using YAML DSL';
        const kameletName = `sampleKamelet${Date.now()}`;

        const commandPrompt = await workbench.openCommandPrompt();
        await commandPrompt.setText(`>${targetCommandLabel}`);
        await driver.wait(async () => {
            const picks = await commandPrompt.getQuickPicks();
            return picks.length > 0;
        }, 5000).catch(() => {});
        let commandSelected = false;
        const commandPicks = await commandPrompt.getQuickPicks();
        for (const pick of commandPicks) {
            const label = await pick.getLabel();
            if (label === targetCommandLabel) {
                await commandPrompt.selectQuickPick(label);
                commandSelected = true;
                break;
            }
        }
        if (!commandSelected) {
            await commandPrompt.confirm();
        }

        let wizardAppeared = false;
        let nameProvided = false;
        for (let iteration = 0; iteration < 6; iteration++) {
            try {
                await driver.wait(async () => {
                    try {
                        await InputBox.create();
                        return true;
                    } catch {
                        return false;
                    }
                }, 5000);
            } catch {
                break;
            }

            let inputBox: InputBox;
            try {
                inputBox = await InputBox.create();
                wizardAppeared = true;
            } catch {
                break;
            }

            const quickPicks = await inputBox.getQuickPicks();
            if (quickPicks.length > 0) {
                let selectionLabel: string | undefined;
                for (const pick of quickPicks) {
                    const label = await pick.getLabel();
                    if (label && label.trim().length > 0 && !label.toLowerCase().includes('back')) {
                        selectionLabel = label;
                        break;
                    }
                }
                if (!selectionLabel) {
                    selectionLabel = await quickPicks[0].getLabel();
                }
                await inputBox.selectQuickPick(selectionLabel ?? '');
                await driver.sleep(400);
                continue;
            }

            if (!nameProvided) {
                await inputBox.setText(kameletName);
                await inputBox.confirm();
                nameProvided = true;
                await driver.wait(async () => {
                    try {
                        await InputBox.create();
                        return false;
                    } catch {
                        return true;
                    }
                }, 5000).catch(() => {});
                break;
            }
        }

        expect(wizardAppeared, 'The Kamelet creation wizard did not appear').to.be.true;
        expect(nameProvided, 'Failed to provide a Kamelet name in the wizard').to.be.true;

        let openedTitle: string | undefined;
        await driver.wait(async () => {
            const tabs = await editorView.getOpenEditors();
            for (const tab of tabs) {
                const title = await tab.getTitle();
                if (title.toLowerCase().includes(kameletName.toLowerCase()) && title.toLowerCase().includes('.yaml')) {
                    openedTitle = title;
                    return true;
                }
            }
            return false;
        }, 20000, 'Kamelet editor did not open');

        expect(openedTitle, 'Expected a Kamelet editor to be active').to.not.be.undefined;

        const finalEditors = await editorView.getOpenEditors();
        expect(finalEditors.length, 'Expected a new editor tab to open').to.be.greaterThan(initialCount);

        const openedEditor = await editorView.openEditor(openedTitle!);
        await openedEditor.select();
        const textEditor = new TextEditor();
        await textEditor.save();
        const documentText = await textEditor.getText();
        expect(documentText.toLowerCase()).to.contain('apiversion');
        expect(documentText.toLowerCase()).to.contain('kind');
        expect(documentText).to.contain(kameletName);

        const browserInstance = VSBrowser.instance as unknown as { workspacePath?: string };
        const workspaceRoot = browserInstance.workspacePath ?? process.cwd();
        createdFilePath = findKameletFile(workspaceRoot, kameletName);
        expect(createdFilePath, 'Expected kamelet YAML file to exist in workspace').to.not.be.undefined;
        expect(path.basename(createdFilePath!).toLowerCase().endsWith('.yaml')).to.be.true;
    });

    after(async () => {
        await new EditorView().closeAllEditors();
        if (createdFilePath && fs.existsSync(createdFilePath)) {
            await fs.promises.unlink(createdFilePath).catch(() => undefined);
        }
    });
});