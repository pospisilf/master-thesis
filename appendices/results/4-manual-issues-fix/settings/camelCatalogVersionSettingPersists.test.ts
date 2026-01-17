import { VSBrowser, WebDriver, EditorView, Workbench, SettingsEditor, TextEditor } from 'vscode-extension-tester';
import { expect } from 'chai';

describe('settings - camelCatalogVersionSettingPersists', () => {
    let driver: WebDriver;
    let workbench: Workbench;
    let originalValue: string | undefined;
    let newValue: string | undefined;

    before(async function () {
        this.timeout(30000);
        driver = VSBrowser.instance.driver;
        workbench = new Workbench();
    });

    it('Edits \'Camel catalog version\' in Settings and verifies the value persists and is reflected in settings.json.', async function () {
        this.timeout(60000);

        const settingsEditor: SettingsEditor = await workbench.openSettings();
        await driver.sleep(1000);

        const catalogSetting = await settingsEditor.findSetting("Camel catalog version", "Camel");
        expect(catalogSetting).to.not.be.undefined;

        originalValue = String(await catalogSetting.getValue() ?? '');
        newValue = originalValue === '3.20.5' ? '3.20.6' : '3.20.5';

        await catalogSetting.setValue(newValue);
        await driver.sleep(1500);

        const updatedValue = String(await catalogSetting.getValue() ?? '');
        expect(updatedValue).to.equal(newValue);

        await new EditorView().closeEditor('Settings');

        const reopenedSettings: SettingsEditor = await workbench.openSettings();
        await driver.sleep(1000);

        const persistedSetting = await reopenedSettings.findSetting("Camel catalog version", "Camel");
        expect(persistedSetting).to.not.be.undefined;

        const persistedValue = String(await persistedSetting.getValue() ?? '');
        expect(persistedValue).to.equal(newValue);

        await new EditorView().closeEditor('Settings');

        await workbench.executeCommand('Preferences: Open User Settings (JSON)');
        await driver.sleep(2000);

        const editorView = new EditorView();
        const jsonEditor = await editorView.openEditor('settings.json') as TextEditor;
        const jsonContent = await jsonEditor.getText();
        const escapedValue = newValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const valuePattern = new RegExp(`"camel\\.Camel catalog version"\\s*:\\s*"${escapedValue}"`);
        expect(valuePattern.test(jsonContent)).to.be.true;
        
        await editorView.closeEditor('settings.json');
        await driver.sleep(2000);
    });

    after(async function () {
        this.timeout(30000);
        await new EditorView().closeAllEditors();

        if (originalValue !== undefined && newValue !== undefined && originalValue !== newValue) {
            await workbench.executeCommand('Preferences: Open Settings (UI)');
            const settingsEditor: SettingsEditor = await workbench.openSettings();

            const catalogSetting = await settingsEditor.findSetting("Camel catalog version", "Camel");
            await catalogSetting.setValue(originalValue);
            await new EditorView().closeAllEditors();
        };
    });
});
