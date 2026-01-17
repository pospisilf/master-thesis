import { VSBrowser, WebDriver, EditorView, Workbench, TextEditor, QuickOpenBox } from 'vscode-extension-tester';
import { expect } from 'chai';
import * as fs from 'fs';
import * as path from 'path';

describe('activation - activatesOnPropertiesLanguagesOpen', () => {
    let driver: WebDriver;
    let workbench: Workbench;
    let workspacePath: string;
    const propsFolder = 'camel-props';
    const propsFile = 'camel.properties';

    before(async function() {
        this.timeout(30000);
        driver = VSBrowser.instance.driver;
        workbench = new Workbench();
        workspacePath = (VSBrowser.instance as any).workspacePath ?? process.cwd();
        const fullFolder = path.join(workspacePath, propsFolder);
        if (!fs.existsSync(fullFolder)) {
            fs.mkdirSync(fullFolder, { recursive: true });
        }
        const fullFile = path.join(fullFolder, propsFile);
        if (!fs.existsSync(fullFile)) {
            fs.writeFileSync(fullFile, 'camel.component.timer.delay=1000\ncamel.component.timer.repeatCount=10\n');
        }
    });

    async function setLanguageMode(languageName: string): Promise<void> {
        const commandPrompt = await workbench.openCommandPrompt();
        await commandPrompt.setText('>Change Language Mode');
        await commandPrompt.selectQuickPick('Change Language Mode');
        await commandPrompt.setText(languageName);
        await commandPrompt.selectQuickPick(languageName);
        // give VS Code a moment to apply the mode
        await driver.sleep(1000);
    }

    it('Opens files with Properties, Spring Boot Properties, and Quarkus Properties language modes and confirms activation.', async function() {
        this.timeout(20000);

        // Open the prepared .properties file via Quick Open
        const quickOpen: QuickOpenBox = await workbench.openQuickOpen();
        await quickOpen.setText(`${propsFolder}/${propsFile}`);
        await quickOpen.confirm();
        await driver.sleep(1000);

        const editorView = new EditorView();
        const textEditor = await editorView.openEditor(propsFile) as TextEditor;

        // Change to Properties language mode
        await setLanguageMode('Properties');
        expect(await textEditor.getLanguage()).to.equal('Properties');

        // Change to Spring Boot Properties language mode
        await setLanguageMode('Spring Boot Properties');
        expect(await textEditor.getLanguage()).to.equal('Spring Boot Properties');

        // Change to Quarkus Properties language mode
        await setLanguageMode('Quarkus Properties');
        expect(await textEditor.getLanguage()).to.equal('Quarkus Properties');

        // Confirm extension activation by ensuring a Camel command is available
        const commandPrompt = await workbench.openCommandPrompt();
        await commandPrompt.setText('>Camel: Create a Camel Route using YAML DSL');
        const camelCommand = await commandPrompt.findQuickPick('Camel: Create a Camel Route using YAML DSL');
        expect(camelCommand).to.not.be.undefined;
        await commandPrompt.cancel();
    });

    after(async () => {
        await new EditorView().closeAllEditors();
    });
});