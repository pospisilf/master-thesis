import { VSBrowser, WebDriver, Workbench, EditorView, InputBox, QuickPickItem } from 'vscode-extension-tester';
import { expect } from 'chai';
import { By, until } from 'selenium-webdriver';

describe('dialogs - multiFileTransformYamlOpensFilePicker', () => {
    let driver: WebDriver;
    let workbench: Workbench;

    before(async function() {
        this.timeout(30000);
        driver = VSBrowser.instance.driver;
        workbench = new Workbench();
    });

    it("Ensures the 'Transform Camel Routes in multiple files to YAML DSL' command opens a multi-file selection dialog.", async function() {
        this.timeout(60000);

        await new EditorView().closeAllEditors();

        const commandPrompt = await workbench.openCommandPrompt();
        await commandPrompt.setText('Transform Camel Routes in multiple files to YAML DSL');

        await driver.wait(async () => {
            const picks = await commandPrompt.getQuickPicks();
            for (const pick of picks) {
                const label = await pick.getLabel();
                if (label.includes('Transform Camel Routes in multiple files to YAML DSL')) {
                    return true;
                }
            }
            return false;
        }, 15000, "Unable to locate the 'Transform Camel Routes in multiple files to YAML DSL' command in the Command Palette");

        let targetItem: QuickPickItem | undefined;
        for (const pick of await commandPrompt.getQuickPicks()) {
            const label = await pick.getLabel();
            if (label.includes('Transform Camel Routes in multiple files to YAML DSL')) {
                targetItem = pick;
                break;
            }
        }

        expect(targetItem, "Command entry for transforming multiple files to YAML DSL was not found").to.not.be.undefined;
        await targetItem!.select();
        await driver.sleep(500);

        let multiPick: InputBox | undefined;
        try {
            await driver.wait(async () => {
                try {
                    const list = await driver.findElement(By.css('.quick-input-widget[aria-hidden="false"] .monaco-list[role="listbox"]'));
                    const attr = await list.getAttribute('aria-multiselectable');
                    return attr === 'true';
                } catch {
                    return false;
                }
            }, 15000, 'The multi-file quick pick list was not shown');

            multiPick = await InputBox.create();

            const textParts: string[] = [];

            try {
                const title = await multiPick.getTitle();
                if (title) {
                    textParts.push(title);
                }
            } catch {
                // title not available
            }

            try {
                const placeholder = await multiPick.getPlaceHolder();
                if (placeholder) {
                    textParts.push(placeholder);
                }
            } catch {
                // placeholder not available
            }

            try {
                const message = await multiPick.getMessage();
                if (message) {
                    textParts.push(message);
                }
            } catch {
                // message not available
            }

            const descriptiveText = textParts.join(' ').trim();
            expect(descriptiveText.length, 'Expected the multi-file picker to provide descriptive text').to.be.greaterThan(0);
            expect(descriptiveText.toLowerCase(), 'Expected the multi-file picker text to reference Camel routes or transformation').to.satisfy(
                (text: string) => text.includes('transform') || text.includes('camel') || text.includes('file')
            );

            const list = await driver.wait(
                until.elementLocated(By.css('.quick-input-widget[aria-hidden="false"] .monaco-list[role="listbox"]')),
                5000,
                'Quick pick list widget not available'
            );
            const multiSelectable = await list.getAttribute('aria-multiselectable');
            expect(multiSelectable).to.equal('true');
        } finally {
            if (multiPick) {
                try {
                    await multiPick.cancel();
                } catch {
                    // ignore if already closed
                }
            }
        }
    });

    after(async () => {
        // Cleanup if required
    });
});