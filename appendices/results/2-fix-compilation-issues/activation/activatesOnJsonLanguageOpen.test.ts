import { VSBrowser, WebDriver, EditorView, Workbench, TextEditor } from 'vscode-extension-tester';
import { expect } from 'chai';

describe('activation - activatesOnJsonLanguageOpen', () => {
    let driver: WebDriver;
    let workbench: Workbench;

    before(async function() {
        this.timeout(60000);
        driver = VSBrowser.instance.driver;
        workbench = new Workbench();
    });

    it('Opens a JSON file and confirms the extension activates.', async function() {
        this.timeout(90000);

        const editorView = new EditorView();

        await workbench.executeCommand('Preferences: Open Settings (JSON)');
        await driver.sleep(2000);

        await workbench.executeCommand('Developer: Show Running Extensions');
        await driver.sleep(3000);

        const runningExtensionsEditor = await editorView.openEditor('Running Extensions') as TextEditor;
        const runningExtensionsText = (await runningExtensionsEditor.getText()).toLowerCase();

        expect(runningExtensionsText).to.include('redhat.vscode-apache-camel');

        await editorView.closeEditor('Running Extensions');
    });

    after(async () => {
        const editorView = new EditorView();
        await editorView.closeAllEditors();
    });
});