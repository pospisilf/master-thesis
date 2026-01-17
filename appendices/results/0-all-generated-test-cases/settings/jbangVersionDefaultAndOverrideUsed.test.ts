import { VSBrowser, WebDriver, EditorView, Workbench, InputBox, SettingsEditor, Setting, NotificationType } from 'vscode-extension-tester';
import { expect } from 'chai';

describe('settings - jbangVersionDefaultAndOverrideUsed', () => {
    let driver: WebDriver;
    let workbench: Workbench;
    let originalVersion = '4.15.0';

    before(async function() {
        this.timeout(30000);
        driver = VSBrowser.instance.driver;
        workbench = new Workbench();
    });

    it('Verifies the default JBang version is 4.15.0, then overrides it and runs a command to ensure it continues to execute without error.', async function() {
        this.timeout(60000);

        const editorView = new EditorView();
        await editorView.closeAllEditors();

        const settingsEditor = await workbench.openSettings() as SettingsEditor;
        await settingsEditor.clearSearch();
        await settingsEditor.search('Camel JBang Version');

        const jbangSetting = await settingsEditor.findSetting('Language Support: JBang Version', 'Camel') as Setting;
        const currentValue = (await jbangSetting.getValue()) as string;
        originalVersion = currentValue;
        expect(currentValue).to.equal('4.15.0');

        const overriddenVersion = '4.16.0';
        await jbangSetting.setValue(overriddenVersion);
        await driver.wait(async () => (await jbangSetting.getValue()) === overriddenVersion, 5000, 'Unable to override JBang version setting');
        expect(await jbangSetting.getValue()).to.equal(overriddenVersion);

        await settingsEditor.close();
        await editorView.closeAllEditors();

        let commandInput: InputBox | undefined;
        try {
            commandInput = await workbench.openCommandPrompt();
            await commandInput.setText('>Camel: Create a Camel Route using YAML DSL');
            await driver.wait(async () => {
                const picks = await commandInput!.getQuickPicks();
                return picks.length > 0;
            }, 5000, 'Camel command did not appear in the command palette');
            await commandInput.selectQuickPick('Camel: Create a Camel Route using YAML DSL');

            await driver.wait(async () => {
                const placeholder = await commandInput!.getPlaceHolder();
                return placeholder !== undefined && !placeholder.toLowerCase().includes('command to run');
            }, 10000, 'Camel route creation flow did not prompt for further input after overriding JBang version');

            const followUpPlaceholder = await commandInput.getPlaceHolder();
            expect(followUpPlaceholder).to.not.be.undefined;
            expect(followUpPlaceholder!.toLowerCase()).to.not.include('command to run');
        } finally {
            if (commandInput) {
                try {
                    await commandInput.cancel();
                } catch (err) {
                    // ignore cleanup issues with command input
                }
            }
        }

        const notificationCenter = await workbench.openNotificationsCenter();
        let jbangError = false;
        for (const notification of await notificationCenter.getNotifications(NotificationType.Error)) {
            const message = (await notification.getMessage()).toLowerCase();
            if (message.includes('jbang')) {
                jbangError = true;
                break;
            }
        }
        await notificationCenter.close();
        expect(jbangError).to.be.false;
    });

    after(async () => {
        try {
            const editorView = new EditorView();
            await editorView.closeAllEditors();
            const settingsEditor = await workbench.openSettings() as SettingsEditor;
            await settingsEditor.clearSearch();
            await settingsEditor.search('Camel JBang Version');
            const jbangSetting = await settingsEditor.findSetting('Language Support: JBang Version', 'Camel') as Setting;
            if ((await jbangSetting.getValue()) !== originalVersion) {
                await jbangSetting.setValue(originalVersion);
                await driver.sleep(300);
            }
            await settingsEditor.close();
        } catch (err) {
            // ignore cleanup errors
        }
    });
});