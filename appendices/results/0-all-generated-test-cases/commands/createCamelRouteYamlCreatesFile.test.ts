import { VSBrowser, WebDriver, Workbench, EditorView, InputBox, TextEditor } from 'vscode-extension-tester';
import { expect } from 'chai';
import * as path from 'path';
import * as fs from 'fs';

describe('commands - createCamelRouteYamlCreatesFile', () => {
    let driver: WebDriver;
    let workbench: Workbench;
    let workspaceRoot: string;
    let createdRouteFilePath: string | undefined;

    const findFileRecursively = (dir: string, fileName: string): string | undefined => {
        let entries: fs.Dirent[];
        try {
            entries = fs.readdirSync(dir, { withFileTypes: true });
        } catch {
            return undefined;
        }
        for (const entry of entries) {
            if (entry.name === '.git' || entry.name === 'node_modules') {
                continue;
            }
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                const nested = findFileRecursively(fullPath, fileName);
                if (nested) {
                    return nested;
                }
            } else if (entry.name === fileName) {
                return fullPath;
            }
        }
        return undefined;
    };

    before(async function () {
        this.timeout(30000);
        driver = VSBrowser.instance.driver;
        workbench = new Workbench();
        workspaceRoot = process.env.CODE_TESTS_WORKSPACE
            ? path.resolve(process.env.CODE_TESTS_WORKSPACE)
            : process.cwd();
    });

    it('Runs \'Create a Camel Route using YAML DSL\' and verifies a new YAML route file is created and opened.', async function () {
        this.timeout(60000);
        const editorView = new EditorView();
        try {
            await editorView.closeAllEditors();
        } catch {
            // ignore if no editors are open
        }

        const routeFileName = `camel-route-${Date.now()}.yaml`;

        await workbench.executeCommand('Create a Camel Route using YAML DSL');

        let input: InputBox | undefined;
        try {
            input = await InputBox.create(5000);
        } catch {
            input = undefined;
        }

        if (input) {
            for (let step = 0; step < 3; step++) {
                let quickPickCount = 0;
                try {
                    quickPickCount = (await input.getItems()).length;
                } catch {
                    quickPickCount = 0;
                }

                if (quickPickCount > 0) {
                    await input.selectQuickPick(0);
                    await input.confirm();
                    try {
                        input = await InputBox.create(5000);
                        continue;
                    } catch {
                        input = undefined;
                        break;
                    }
                } else {
                    await input.setText(routeFileName);
                    await input.confirm();
                    break;
                }
            }
        }

        await driver.wait(async () => {
            const titles = await editorView.getOpenEditorTitles();
            return titles.some((title) => title.toLowerCase().includes(routeFileName.toLowerCase()));
        }, 20000, `Editor for ${routeFileName} was not opened`);

        await editorView.openEditor(routeFileName);
        const editor = new TextEditor();

        const editorContent = await editor.getText();
        expect(editorContent.trim().length).to.be.greaterThan(0, 'New route file should contain scaffold content');

        let editorFilePath: string | undefined;
        try {
            editorFilePath = await editor.getFilePath();
        } catch {
            editorFilePath = undefined;
        }

        if (editorFilePath && editorFilePath.endsWith(routeFileName)) {
            createdRouteFilePath = path.normalize(editorFilePath);
        } else {
            await driver.wait(async () => {
                const located = findFileRecursively(workspaceRoot, routeFileName);
                if (located) {
                    createdRouteFilePath = located;
                    return true;
                }
                return false;
            }, 20000, `Could not locate ${routeFileName} on disk`);
        }

        expect(createdRouteFilePath, 'The Camel YAML route file was not found on disk').to.not.be.undefined;
        expect(createdRouteFilePath && fs.existsSync(createdRouteFilePath)).to.be.true;
        expect(path.extname(createdRouteFilePath!)).to.equal('.yaml');
    });

    after(async () => {
        try {
            await new EditorView().closeAllEditors();
        } catch {
            // ignore cleanup errors
        }
        if (createdRouteFilePath && fs.existsSync(createdRouteFilePath)) {
            try {
                fs.unlinkSync(createdRouteFilePath);
            } catch {
                // ignore cleanup errors
            }
        }
    });
});