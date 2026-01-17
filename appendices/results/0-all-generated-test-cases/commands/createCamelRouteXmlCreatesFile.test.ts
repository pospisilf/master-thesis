import { VSBrowser, WebDriver, EditorView, Workbench, ActivityBar, SideBarView, QuickOpenBox, InputBox, TextEditor } from 'vscode-extension-tester';
import { expect } from 'chai';
import { promises as fs } from 'fs';

describe('commands - createCamelRouteXmlCreatesFile', () => {
    let driver: WebDriver;
    let workbench: Workbench;
    let createdFilePath: string | undefined;

    const waitForInputBox = async (timeout: number): Promise<InputBox | undefined> => {
        try {
            await driver.wait(async () => {
                try {
                    await InputBox.create();
                    return true;
                } catch {
                    return false;
                }
            }, timeout);
            return await InputBox.create();
        } catch {
            return undefined;
        }
    };

    before(async function() {
        this.timeout(30000);
        driver = VSBrowser.instance.driver;
        workbench = new Workbench();
        await workbench.getTitleBar().getTitle();
    });

    it('Runs \'Create a Camel Route using XML DSL\' and verifies a new XML route file is created and opened.', async function() {
        this.timeout(120000);

        const activityBar = new ActivityBar();
        const explorerControl = await activityBar.getViewControl('Explorer');
        if (explorerControl) {
            await explorerControl.openView();
        }
        const sideBar = new SideBarView();
        await sideBar.getContent();

        const editorView = new EditorView();
        await editorView.closeAllEditors();

        const fileName = `camel-route-${Date.now()}.xml`;

        const quickOpen = await VSBrowser.instance.openCommandPrompt() as QuickOpenBox;
        await quickOpen.setText('Create a Camel Route using XML DSL');
        await driver.wait(async () => (await quickOpen.getQuickPicks()).length > 0, 10000, 'No matching command found in Command Palette for Camel XML route creation');

        const quickPicks = await quickOpen.getQuickPicks();
        let commandPick;
        for (const pick of quickPicks) {
            const label = await pick.getLabel();
            if (label.toLowerCase().includes('create a camel route using xml dsl')) {
                commandPick = pick;
                break;
            }
        }
        expect(commandPick, 'Expected command pick for "Create a Camel Route using XML DSL"').to.not.be.undefined;
        await commandPick!.click();

        const nameInput = await waitForInputBox(10000);
        expect(nameInput, 'Expected input box prompting for the new Camel XML route file name').to.not.be.undefined;
        await nameInput!.setText(fileName);
        await nameInput!.confirm();

        await driver.sleep(500);
        const locationInput = await waitForInputBox(5000);
        if (locationInput) {
            const locationPicks = await locationInput.getQuickPicks();
            if (locationPicks.length > 0) {
                await locationPicks[0].click();
            } else {
                await locationInput.confirm();
            }
        }

        await driver.wait(async () => {
            const titles = await editorView.getOpenEditorTitles();
            return titles.some(title => title.includes(fileName));
        }, 30000, `Expected the new Camel XML route editor (${fileName}) to be opened`);

        const textEditor = await editorView.openEditor(fileName) as TextEditor;
        const documentText = await textEditor.getText();
        expect(documentText.trim().length, 'Newly generated Camel XML route should contain template content').to.be.greaterThan(0);

        const filePath = await textEditor.getFilePath();
        createdFilePath = filePath;
        expect(filePath, 'Expected the opened editor to have an associated file path').to.not.be.undefined;

        if (filePath) {
            let fileExists = false;
            try {
                await fs.stat(filePath);
                fileExists = true;
            } catch {
                fileExists = false;
            }
            expect(fileExists, `Expected generated Camel XML route file to exist at ${filePath}`).to.be.true;
        }

        await textEditor.save();
    });

    after(async () => {
        const editorView = new EditorView();
        await editorView.closeAllEditors();
        if (createdFilePath) {
            try {
                await fs.unlink(createdFilePath);
            } catch {
                // ignore cleanup errors
            }
        }
    });
});