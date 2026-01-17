import { VSBrowser, WebDriver, EditorView, Workbench, SettingsEditor, InputSetting, TextEditor } from 'vscode-extension-tester';
import { expect } from 'chai';

describe('settings - camelCatalogVersionSettingPersists', () => {
    let driver: WebDriver;
    let workbench: Workbench;
    let originalValue: string | undefined;
    let newValue: string | undefined;

    before(async function () {
        this.timeout(60000);
        driver = VSBrowser.instance.driver;
        workbench = new Workbench();
    });

    it('Edits \'Camel catalog version\' in Settings and verifies the value persists and is reflected in settings.json.', async function () {
        this.timeout(120000);

        const settingsEditor: SettingsEditor = await workbench.openSettings();
        await driver.sleep(500);
        await settingsEditor.search('Camel catalog version');
        const catalogSetting = await settingsEditor.findSetting('Camel catalog version', 'Language Support for Apache Camel') as InputSetting;

        originalValue = await catalogSetting.getValue();
        newValue = originalValue === '3.20.5' ? '3.20.6' : '3.20.5';

        await catalogSetting.setValue(newValue);
        await driver.sleep(1500);

        const updatedValue = await catalogSetting.getValue();
        expect(updatedValue).to.equal(newValue);

        await settingsEditor.close();

        const reopenedSettings: SettingsEditor = await workbench.openSettings();
        await driver.sleep(500);
        await reopenedSettings.search('Camel catalog version');
        const persistedSetting = await reopenedSettings.findSetting('Camel catalog version', 'Language Support for Apache Camel') as InputSetting;
        const persistedValue = await persistedSetting.getValue();
        expect(persistedValue).to.equal(newValue);
        await reopenedSettings.close();

        await workbench.executeCommand('Preferences: Open Settings (JSON)');
        await driver.sleep(2000);

        const editorView = new EditorView();
        const jsonEditor = await editorView.openEditor('settings.json') as TextEditor;
        const jsonContent = await jsonEditor.getText();

        const escapedValue = newValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const valuePattern = new RegExp(`"camel\\.Camel catalog version"\\s*:\\s*"${escapedValue}"`);
        expect(valuePattern.test(jsonContent)).to.be.true;

        await jsonEditor.close();
    });

    after(async () => {
        try {
            if (originalValue !== undefined && newValue !== undefined && originalValue !== newValue) {
                const settingsEditor: SettingsEditor = await workbench.openSettings();
                await driver.sleep(500);
                await settingsEditor.search('Camel catalog version');
                const catalogSetting = await settingsEditor.findSetting('Camel catalog version', 'Language Support for Apache Camel') as InputSetting;
                await catalogSetting.setValue(originalValue);
                await driver.sleep(500);
                await settingsEditor.close();
            }
        } finally {
            await new EditorView().closeAllEditors();
        }
    });
});