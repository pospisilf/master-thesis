import { VSBrowser, WebDriver, Workbench, InputBox } from 'vscode-extension-tester';
import { expect } from 'chai';

describe('commands - projectCreationLegacyCommandHidden', () => {
    let driver: WebDriver;
    let workbench: Workbench;

    before(async function() {
        this.timeout(30000);
        driver = VSBrowser.instance.driver;
        workbench = new Workbench();
    });

    it("Verifies 'Create a Camel project' command is not surfaced anywhere since its enablement is false.", async function() {
        this.timeout(40000);

        let commandPalette: InputBox = await workbench.openCommandPrompt();
        await commandPalette.setText('Create a Camel Route using YAML DSL');
        await driver.sleep(1000);
        let picks = await commandPalette.getQuickPicks();
        const accessibleLabels: string[] = [];
        for (const pick of picks) {
            accessibleLabels.push((await pick.getLabel()).trim());
        }
        expect(accessibleLabels).to.contain('Create a Camel Route using YAML DSL');
        await commandPalette.cancel();

        commandPalette = await workbench.openCommandPrompt();
        await commandPalette.setText('Create a Camel project');
        await driver.sleep(1000);
        picks = await commandPalette.getQuickPicks();
        const legacyLabels: string[] = [];
        for (const pick of picks) {
            legacyLabels.push((await pick.getLabel()).trim());
        }
        expect(legacyLabels.includes('Create a Camel project')).to.be.false;
        await commandPalette.cancel();
    });

    after(async () => {
        // Cleanup if required
    });
});