import { VSBrowser, WebDriver, EditorView, Workbench, InputBox } from 'vscode-extension-tester';
import { expect } from 'chai';

describe('commands - projectCreationSpringBootCommandAvailable', () => {
    let driver: WebDriver;
    let workbench: Workbench;

    before(async function() {
        this.timeout(30000);
        driver = VSBrowser.instance.driver;
        workbench = new Workbench();
        await new EditorView().closeAllEditors();
    });

    it("Confirms 'Create a Camel on SpringBoot project' is available in the Command Palette and triggers its flow.", async function() {
        this.timeout(60000);

        const commandPrompt = await workbench.openCommandPrompt();
        const initialPlaceholder = (await commandPrompt.getPlaceHolder()) ?? '';

        await commandPrompt.setText('Create a Camel on SpringBoot project');

        await driver.wait(async () => {
            const picks = await commandPrompt.getQuickPicks();
            for (const pick of picks) {
                const label = await pick.getLabel();
                if (label === 'Create a Camel on SpringBoot project') {
                    return true;
                }
            }
            return false;
        }, 15000, "Command 'Create a Camel on SpringBoot project' was not found in the Command Palette");

        const picks = await commandPrompt.getQuickPicks();
        let targetPick;
        for (const pick of picks) {
            const label = await pick.getLabel();
            if (label === 'Create a Camel on SpringBoot project') {
                targetPick = pick;
                break;
            }
        }

        expect(targetPick, 'Unable to locate the SpringBoot project command in the quick picks').to.not.be.undefined;

        await targetPick!.click();

        const wizardInput = await InputBox.create();

        await driver.wait(async () => {
            try {
                const placeholder = await wizardInput.getPlaceHolder();
                if (placeholder && placeholder !== initialPlaceholder) {
                    return true;
                }
                const title = await wizardInput.getTitle();
                if (title && title.trim().length > 0 && title !== 'Command Palette') {
                    return true;
                }
                const wizardPicks = await wizardInput.getQuickPicks();
                return wizardPicks.length > 0;
            } catch {
                return false;
            }
        }, 15000, 'The Camel on SpringBoot project creation flow did not start');

        const flowPlaceholder = await wizardInput.getPlaceHolder();
        const flowTitle = await wizardInput.getTitle();
        const wizardPicks = await wizardInput.getQuickPicks();
        const quickPickLabels: string[] = [];
        for (const item of wizardPicks.slice(0, 5)) {
            quickPickLabels.push(await item.getLabel());
        }

        const aggregatedText = [flowPlaceholder ?? '', flowTitle ?? '', ...quickPickLabels].join(' ').trim();

        expect(aggregatedText.length, 'Wizard prompt returned empty content').to.be.greaterThan(0);
        expect(aggregatedText.toLowerCase()).to.satisfy(
            (text: string) => text.includes('camel') || text.includes('spring') || text.includes('project'),
            'Wizard prompt did not reflect the Camel on SpringBoot project flow'
        );

        await wizardInput.cancel();
    });

    after(async () => {
        try {
            const remainingInput = await InputBox.create(1000);
            await remainingInput.cancel();
        } catch {
            // ignore if no input is present
        }
        try {
            const notifications = await workbench.openNotificationsCenter();
            await notifications.clearAll();
            await notifications.close();
        } catch {
            // ignore if notifications center is unavailable
        }
    });
});