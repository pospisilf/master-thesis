import { VSBrowser, WebDriver, EditorView, Workbench, TextEditor } from 'vscode-extension-tester';
import { expect } from 'chai';
import * as fs from 'fs';
import * as path from 'path';

describe('activation - activatesOnJsonLanguageOpen', () => {
    let driver: WebDriver;
    let workbench: Workbench;
    let workspacePath: string;
    let tasksJsonPath: string;
    let createdTasksFile = false;

    before(async function() {
        this.timeout(60000);
        driver = VSBrowser.instance.driver;
        workbench = new Workbench();

        workspacePath = process.env.CODE_TESTS_WORKSPACE || VSBrowser.instance.workspacePath || '';
        if (!workspacePath) {
            throw new Error('Workspace path is not defined.');
        }

        tasksJsonPath = path.join(workspacePath, 'tasks.json');
        if (!fs.existsSync(tasksJsonPath)) {
            const tasksContent = {
                version: '2.0.0',
                tasks: [
                    {
                        label: 'Sample',
                        type: 'shell',
                        command: 'echo "Camel Activation Test"'
                    }
                ]
            };
            fs.writeFileSync(tasksJsonPath, JSON.stringify(tasksContent, null, 2));
            createdTasksFile = true;
        }
    });

    it('Opens a JSON file and confirms the extension activates.', async function() {
        this.timeout(60000);

        const editorView = new EditorView();

        await VSBrowser.instance.openResources('tasks.json');
        const jsonEditor = await editorView.openEditor('tasks.json') as TextEditor;
        expect(await jsonEditor.getTitle()).to.equal('tasks.json');

        await workbench.executeCommand('Developer: Show Running Extensions');
        await driver.sleep(3000);

        const runningExtensionsEditor = await editorView.openEditor('Running Extensions') as TextEditor;
        const runningExtensionsText = (await runningExtensionsEditor.getText()).toLowerCase();

        expect(runningExtensionsText).to.include('redhat.vscode-apache-camel');
        await runningExtensionsEditor.close();
    });

    after(async () => {
        const editorView = new EditorView();
        await editorView.closeAllEditors();

        if (createdTasksFile && tasksJsonPath && fs.existsSync(tasksJsonPath)) {
            fs.unlinkSync(tasksJsonPath);
        }
    });
});