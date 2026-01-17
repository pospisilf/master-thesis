import { VSBrowser, WebDriver, Workbench, EditorView, TextEditor, InputBox } from 'vscode-extension-tester';
import { expect } from 'chai';
import { existsSync, unlinkSync } from 'fs';

describe('commands - createCamelRouteJavaCreatesFile', () => {
    let driver: WebDriver;
    let workbench: Workbench;
    let createdFilePath: string | undefined;
    let createdFileName: string;
    let routeClassName: string;

    before(async function() {
        this.timeout(30000);
        driver = VSBrowser.instance.driver;
        workbench = new Workbench();
        await new EditorView().closeAllEditors();
    });

    it("Runs 'Create a Camel Route using Java DSL' and verifies a new Java route file is created and opened.", async function() {
        this.timeout(120000);

        const editorView = new EditorView();
        await editorView.closeAllEditors();

        routeClassName = `CamelRoute${Date.now()}`;
        createdFileName = `${routeClassName}.java`;

        await workbench.executeCommand('Camel: Create a Camel Route using Java DSL');

        let routeNameSet = false;

        for (let step = 0; step < 5; step++) {
            let input: InputBox;
            try {
                input = await InputBox.create();
            } catch (err) {
                break;
            }

            const picks = await input.getQuickPicks();
            if (picks.length > 0) {
                const label = await picks[0].getText();
                await input.selectQuickPick(label);
                await driver.sleep(500);
                continue;
            }

            if (!routeNameSet) {
                await input.setText(routeClassName);
                await input.confirm();
                routeNameSet = true;
                await driver.sleep(500);
                continue;
            }

            await input.confirm();
            await driver.sleep(500);
        }

        await driver.wait(async () => {
            const titles = await editorView.getOpenEditorTitles();
            return titles.includes(createdFileName);
        }, 60000);

        await editorView.openEditor(createdFileName);
        const textEditor = new TextEditor();

        const title = await textEditor.getTitle();
        expect(title).to.equal(createdFileName);

        const documentText = await textEditor.getText();
        expect(documentText).to.include('class');
        expect(documentText).to.include('extends RouteBuilder');
        expect(documentText).to.match(new RegExp(`class\\s+${routeClassName}`));

        createdFilePath = await textEditor.getFilePath();
        expect(createdFilePath).to.not.be.undefined;
        expect(existsSync(createdFilePath!)).to.be.true;
    });

    after(async () => {
        await new EditorView().closeAllEditors();
        if (createdFilePath && existsSync(createdFilePath)) {
            try {
                unlinkSync(createdFilePath);
            } catch (err) {
                // ignore cleanup errors
            }
        }
    });
});