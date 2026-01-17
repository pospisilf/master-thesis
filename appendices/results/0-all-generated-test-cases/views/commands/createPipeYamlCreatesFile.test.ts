import { VSBrowser, WebDriver, EditorView, Workbench, InputBox, TextEditor } from 'vscode-extension-tester';
import { expect } from 'chai';

describe('commands - createPipeYamlCreatesFile', () => {
    let driver: WebDriver;
    let workbench: Workbench;

    before(async function() {
        this.timeout(30000);
        driver = VSBrowser.instance.driver;
        workbench = new Workbench();
    });

    it("Runs 'Create a Custom Resource Pipe using YAML DSL' and verifies a new Pipe YAML file is created and opened.", async function() {
        this.timeout(60000);
        const commandTitle = 'Camel: Create a Custom Resource Pipe using YAML DSL';
        const fileBaseName = `custom-pipe-${Date.now()}`;

        const commandPrompt = await workbench.openCommandPrompt();
        await commandPrompt.setText(commandTitle);
        await commandPrompt.confirm();

        let input: InputBox;
        try {
            input = await InputBox.create();
        } catch (error) {
            throw new Error('Expected an input box to prompt for the new custom pipe file name.');
        }

        let awaitingName = true;
        while (awaitingName && input) {
            const quickPicks = await input.getQuickPicks();
            if (quickPicks.length > 0 && (await input.getText()) === '') {
                const firstPickLabel = await quickPicks[0].getLabel();
                await input.selectQuickPick(firstPickLabel);
                await driver.sleep(500);
                try {
                    input = await InputBox.create();
                    continue;
                } catch {
                    input = undefined;
                    awaitingName = false;
                    break;
                }
            }

            if (input) {
                await input.setText(fileBaseName);
                await driver.sleep(200);
                await input.confirm();
            }
            awaitingName = false;
        }

        const editorView = new EditorView();
        const nameFragment = fileBaseName.toLowerCase();
        await driver.wait(async () => {
            const titles = await editorView.getOpenEditorTitles();
            return titles.some(title => title.toLowerCase().includes(nameFragment));
        }, 30000, `Expected a new pipe YAML editor to open for ${fileBaseName}`);

        const openTitles = await editorView.getOpenEditorTitles();
        const createdEditorTitle = openTitles.find(title => title.toLowerCase().includes(nameFragment));
        expect(createdEditorTitle, 'Expected to locate the newly created pipe YAML editor').to.not.be.undefined;
        expect(createdEditorTitle!.toLowerCase()).to.match(/\.ya?ml$/, 'Expected the created pipe file to use the YAML extension');

        const textEditor: TextEditor = await editorView.openEditor(createdEditorTitle!);
        const documentContent = await textEditor.getText();
        expect(documentContent.trim().length).to.be.greaterThan(0, 'Expected the generated pipe YAML file to contain starter content');
    });

    after(async () => {
        try {
            await new EditorView().closeAllEditors();
        } catch {
            // ignore cleanup failures
        }
    });
});