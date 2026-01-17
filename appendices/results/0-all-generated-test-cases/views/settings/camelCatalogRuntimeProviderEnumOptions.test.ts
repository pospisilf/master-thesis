import { VSBrowser, WebDriver, Workbench, SettingsEditor, DropdownSetting, EditorView } from 'vscode-extension-tester';
import { expect } from 'chai';

describe('settings - camelCatalogRuntimeProviderEnumOptions', () => {
    let driver: WebDriver;
    let workbench: Workbench;
    let originalValue: string | undefined;
    let restoreNeeded = false;

    const normalizeOption = (value: string): string => {
        return value ? value.trim().replace(/\s|-/g, '').toUpperCase() : '';
    };

    const locateRuntimeProviderSetting = async (): Promise<{ editor: SettingsEditor; dropdown: DropdownSetting }> => {
        const settingsEditor = await workbench.openSettings() as SettingsEditor;
        await settingsEditor.clearSearch();
        await settingsEditor.search('Camel catalog runtime provider');
        await driver.sleep(1500);

        const labelCandidates = [
            'Camel: Camel Catalog Runtime Provider',
            'Camel Catalog Runtime Provider',
            'Camel › Camel Catalog: Runtime Provider',
            'Camel: Camel catalog runtime provider',
            'Camel Catalog: Runtime Provider'
        ];
        const categoryCandidates = ['Extensions', 'Apache Camel', 'Camel', ''];
        let dropdown: DropdownSetting | undefined;

        for (const category of categoryCandidates) {
            for (const label of labelCandidates) {
                try {
                    const found = category && category.length > 0
                        ? await settingsEditor.findSetting(label, category)
                        : await settingsEditor.findSetting(label);
                    if (found) {
                        dropdown = found as DropdownSetting;
                        break;
                    }
                } catch (err) {
                    continue;
                }
            }
            if (dropdown) {
                break;
            }
        }

        if (!dropdown) {
            throw new Error('Unable to locate "Camel catalog runtime provider" setting in Settings UI');
        }

        return { editor: settingsEditor, dropdown };
    };

    before(async function() {
        this.timeout(30000);
        driver = VSBrowser.instance.driver;
        workbench = new Workbench();
    });

    it('Validates the enum options (DEFAULT, SPRINGBOOT, QUARKUS) are presented and can be saved.', async function() {
        this.timeout(60000);

        const context = await locateRuntimeProviderSetting();
        const editor = context.editor;
        const dropdown = context.dropdown;

        const options = await dropdown.getOptions();
        expect(options, 'No options retrieved for runtime provider setting').to.be.an('array').that.is.not.empty;

        const normalizedOptions = options.map((opt) => normalizeOption(opt));
        expect(normalizedOptions).to.include('DEFAULT');
        expect(normalizedOptions).to.include('SPRINGBOOT');
        expect(normalizedOptions).to.include('QUARKUS');

        originalValue = await dropdown.getValue();
        const originalNormalizedValue = normalizeOption(originalValue ?? '');

        const targetKey = originalNormalizedValue === 'SPRINGBOOT' ? 'DEFAULT' : 'SPRINGBOOT';
        const targetOption = options.find((opt) => normalizeOption(opt) === targetKey);
        expect(targetOption, `Option matching ${targetKey} should be available`).to.not.be.undefined;

        restoreNeeded = true;
        await dropdown.setValue(targetOption!);
        await driver.wait(async () => normalizeOption(await dropdown.getValue()) === targetKey, 5000);

        await editor.close();
        await driver.sleep(500);

        const reopenedContext = await locateRuntimeProviderSetting();
        const reopenedDropdown = reopenedContext.dropdown;
        const savedValue = await reopenedDropdown.getValue();
        expect(normalizeOption(savedValue)).to.equal(targetKey);

        if (originalValue && originalNormalizedValue !== targetKey) {
            const reopenedOptions = await reopenedDropdown.getOptions();
            const originalOptionCandidate = reopenedOptions.find((opt) => normalizeOption(opt) === originalNormalizedValue) ?? originalValue;
            await reopenedDropdown.setValue(originalOptionCandidate);
            await driver.wait(async () => normalizeOption(await reopenedDropdown.getValue()) === originalNormalizedValue, 5000);
        }
        restoreNeeded = false;

        await reopenedContext.editor.close();
        await driver.sleep(500);
    });

    after(async function() {
        this.timeout(60000);
        try {
            if (restoreNeeded && originalValue) {
                const context = await locateRuntimeProviderSetting();
                await context.dropdown.setValue(originalValue);
                await driver.wait(async () => (await context.dropdown.getValue()) === originalValue, 5000);
                await context.editor.close();
            }
        } catch (err) {
            // ignore cleanup failures
        } finally {
            await new EditorView().closeAllEditors();
        }
    });
});