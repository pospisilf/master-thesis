import { VSBrowser, WebDriver, Workbench, InputBox } from 'vscode-extension-tester';
import { expect } from 'chai';

describe('commands - projectCreationQuarkusCommandAvailable', () => {
    let driver: WebDriver;
    let workbench: Workbench;

    before(async function() {
        this.timeout(60000);
        driver = VSBrowser.instance.driver;
        workbench = new Workbench();
    });

    it('Confirms \'Create a Camel Quarkus project\' is available in the Command Palette and triggers its flow.', async function() {
        this.timeout(60000);

        const commandPrompt = await workbench.openCommandPrompt();
        await commandPrompt.setText('Create a Camel Quarkus project');

        await driver.wait(async () => {
            const picks = await commandPrompt.getQuickPicks();
            return picks.length > 0;
        }, 10000, 'Command Palette did not populate any entries');

        const picks = await commandPrompt.getQuickPicks();
        let found = false;
        for (const pick of picks) {
            const label = await pick.getLabel();
            if (label.toLowerCase().includes('create a camel quarkus project')) {
                found = true;
                break;
            }
        }
        expect(found, '\'Create a Camel Quarkus project\' command should be listed in the Command Palette').to.be.true;

        await commandPrompt.selectQuickPick('Create a Camel Quarkus project');

        await driver.wait(async () => {
            try {
                const wizard = await InputBox.create();
                return await wizard.isDisplayed();
            } catch {
                return false;
            }
        }, 15000, 'Camel Quarkus project creation flow did not open');

        const wizard = await InputBox.create();
        expect(await wizard.isDisplayed(), 'The Camel Quarkus project wizard input should be visible').to.be.true;

        await wizard.cancel();
    });

    after(async () => {
        try {
            const residual = await InputBox.create();
            await residual.cancel();
        } catch {
            // No input boxes left open; nothing to clean up
        }
    });
});