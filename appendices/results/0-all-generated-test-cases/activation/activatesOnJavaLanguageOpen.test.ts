import { VSBrowser, WebDriver, EditorView, Workbench, InputBox, TextEditor } from 'vscode-extension-tester';
import { expect } from 'chai';

describe('activation - activatesOnJavaLanguageOpen', () => {
    let driver: WebDriver;
    let workbench: Workbench;

    before(async function() {
        this.timeout(30000);
        driver = VSBrowser.instance.driver;
        workbench = new Workbench();
    });

    it('Opens a Java file and confirms the extension activates.', async function() {
        this.timeout(60000);

        const editorView = new EditorView();
        await editorView.closeAllEditors();

        await workbench.executeCommand('workbench.action.files.newUntitledFile');
        const javaEditor = await editorView.getActiveEditor() as TextEditor;
        await javaEditor.typeText('public class SampleCamelActivation {}');

        await workbench.executeCommand('workbench.action.editor.changeLanguageMode');
        const languagePicker = await InputBox.create();
        await languagePicker.setText('Java');
        await languagePicker.confirm();

        await driver.sleep(1500);

        await workbench.executeCommand('workbench.action.showRuntimeExtensions');
        await driver.sleep(1000);
        const runningEditor = await editorView.openEditor('Running Extensions') as TextEditor;

        const activationOutput = await driver.wait(async () => {
            const current = await runningEditor.getText();
            return current.includes('redhat.vscode-apache-camel') ? current : undefined;
        }, 15000);

        expect(activationOutput).to.contain('redhat.vscode-apache-camel');
    });

    after(async () => {
        const editorView = new EditorView();
        await editorView.closeAllEditors();
    });
});