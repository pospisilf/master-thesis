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
        const defaultPlaceholder = await commandPrompt.getPlaceHolder();
        const defaultTitle = await commandPrompt.getTitle();
        const defaultMessage = await commandPrompt.getMessage();

        await commandPrompt.setText('Create a Camel Quarkus project');

        await driver.wait(async () => {
            const picks = await commandPrompt.getQuickPicks();
            return picks.length > 0;
        }, 10000, 'Command Palette did not populate any entries');

        const picks = await commandPrompt.getQuickPicks();
        const quarkusCommandPick = await picks.reduce<Promise<boolean>>(async (accPromise, pick) => {
            if (await accPromise) {
                return true;
            }
            const label = await pick.getLabel();
            return label.includes('Create a Camel Quarkus project');
        }, Promise.resolve(false));

        expect(quarkusCommandPick, '\'Create a Camel Quarkus project\' command should be listed in the Command Palette').to.be.true;

        await commandPrompt.selectQuickPick('Create a Camel Quarkus project');

        await driver.wait(async () => {
            try {
                const wizard = await InputBox.create();
                const placeholder = await wizard.getPlaceHolder();
                const title = await wizard.getTitle();
                const message = await wizard.getMessage();
                const step = await wizard.getStep();
                const placeholderChanged = (placeholder !== defaultPlaceholder) || (!placeholder && !!defaultPlaceholder);
                const titleChanged = (title !== defaultTitle) || (!title && !!defaultTitle && defaultTitle.length > 0);
                const messageChanged = (message !== defaultMessage) || (!message && !!defaultMessage);
                const stepDefined = !!step && step.trim().length > 0;
                return placeholderChanged || titleChanged || messageChanged || stepDefined;
            } catch {
                return false;
            }
        }, 15000, 'Camel Quarkus project creation flow did not open');

        const wizard = await InputBox.create();
        expect(await wizard.isDisplayed(), 'The Camel Quarkus project wizard input should be visible').to.be.true;

        const wizardStep = await wizard.getStep();
        const wizardPlaceholder = await wizard.getPlaceHolder();
        const wizardTitle = await wizard.getTitle();
        const wizardMessage = await wizard.getMessage();

        const flowIndicators = [
            (wizardStep && wizardStep.trim().length > 0),
            (wizardPlaceholder && wizardPlaceholder !== defaultPlaceholder),
            (!wizardPlaceholder && !!defaultPlaceholder),
            (wizardTitle && wizardTitle !== defaultTitle),
            (wizardMessage && wizardMessage !== defaultMessage)
        ];

        expect(flowIndicators.some(Boolean), 'Camel Quarkus project creation flow should expose custom wizard information').to.be.true;

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