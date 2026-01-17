import { VSBrowser, WebDriver, Workbench, SettingsEditor, EditorView, TextEditor } from 'vscode-extension-tester';
import { expect } from 'chai';
import { By, WebElement, until } from 'selenium-webdriver';

function stripJsonComments(content: string): string {
    let result = '';
    let inString = false;
    let inSingleLineComment = false;
    let inMultiLineComment = false;

    for (let i = 0; i < content.length; i++) {
        const current = content[i];
        const prev = i > 0 ? content[i - 1] : '';
        const next = i + 1 < content.length ? content[i + 1] : '';

        if (inSingleLineComment) {
            if (current === '\n' || current === '\r') {
                inSingleLineComment = false;
                result += current;
            }
            continue;
        }

        if (inMultiLineComment) {
            if (current === '*' && next === '/') {
                inMultiLineComment = false;
                i++;
            }
            continue;
        }

        if (current === '"' && prev !== '\\') {
            inString = !inString;
            result += current;
            continue;
        }

        if (!inString) {
            if (current === '/' && next === '/') {
                inSingleLineComment = true;
                i++;
                continue;
            }
            if (current === '/' && next === '*') {
                inMultiLineComment = true;
                i++;
                continue;
            }
        }

        result += current;
    }

    return result;
}

describe('settings - camelExtraComponentsArrayPersists', () => {
    let driver: WebDriver;
    let workbench: Workbench;
    let originalExtraComponents: string | undefined;

    before(async function() {
        this.timeout(60000);
        driver = VSBrowser.instance.driver;
        workbench = new Workbench();
    });

    async function openExtraComponentsSetting(): Promise<{ settingsEditor: SettingsEditor; textInput: WebElement; }> {
        const settingsEditor = await workbench.openSettings();
        const editorAny = settingsEditor as any;
        if (typeof editorAny.clearSearch === 'function') {
            await editorAny.clearSearch();
        }
        await settingsEditor.searchSetting('camel.extra-components');
        await driver.sleep(500);

        let container: WebElement | undefined;
        await driver.wait(async () => {
            const byDataId = await driver.findElements(By.css('.setting-item[data-id="camel.extra-components"]'));
            if (byDataId.length > 0) {
                container = byDataId[0];
                return true;
            }
            const bySettingId = await driver.findElements(By.css('.setting-item[data-setting-id="camel.extra-components"]'));
            if (bySettingId.length > 0) {
                container = bySettingId[0];
                return true;
            }
            return false;
        }, 10000, 'camel.extra-components setting not found');

        if (!container) {
            throw new Error('Unable to locate camel.extra-components setting');
        }

        await driver.executeScript('arguments[0].scrollIntoView({block: "center"});', container);

        let textInput: WebElement;
        try {
            textInput = await container.findElement(By.css('textarea'));
        } catch {
            textInput = await container.findElement(By.css('input[type="text"]'));
        }

        await driver.wait(until.elementIsVisible(textInput), 5000);

        return { settingsEditor, textInput };
    }

    it('Updates the \'extra-components\' array via Settings UI and confirms JSON persists and remains valid.', async function() {
        this.timeout(90000);

        const { settingsEditor, textInput } = await openExtraComponentsSetting();
        originalExtraComponents = (await textInput.getAttribute('value')) ?? '';
        const updatedValue = '[{"scheme":"extra-test","syntax":"extra-test:result","artifactId":"camel-extra-test","groupId":"org.apache.camel","version":"1.0.0"}]';

        await driver.executeScript(
            `const element = arguments[0]; const value = arguments[1];
             element.value = value;
             element.dispatchEvent(new Event('input', { bubbles: true }));
             element.dispatchEvent(new Event('change', { bubbles: true }));`,
            textInput,
            updatedValue
        );

        await driver.wait(async () => {
            const current = (await textInput.getAttribute('value')) ?? '';
            return current.trim() === updatedValue;
        }, 5000, 'Updated value did not persist in the UI input');

        const uiValue = ((await textInput.getAttribute('value')) ?? '').trim();
        expect(uiValue).to.equal(updatedValue);

        await settingsEditor.close();

        await workbench.executeCommand('Preferences: Open Settings (JSON)');
        await driver.sleep(1000);
        const editorView = new EditorView();
        const jsonEditorTab = await editorView.openEditor('settings.json');
        const jsonEditor = new TextEditor(jsonEditorTab);
        const jsonContent = await jsonEditor.getText();
        const sanitized = stripJsonComments(jsonContent).trim();
        const jsonSource = sanitized.length ? sanitized : '{}';

        let parsedSettings: any;
        expect(() => {
            parsedSettings = JSON.parse(jsonSource);
        }).to.not.throw();

        const expectedArray = JSON.parse(updatedValue);
        expect(parsedSettings).to.have.property('camel.extra-components');
        expect(parsedSettings['camel.extra-components']).to.be.an('array');
        expect(parsedSettings['camel.extra-components']).to.deep.equal(expectedArray);

        await editorView.closeEditor('settings.json');

        const { settingsEditor: reopenedEditor, textInput: reopenedInput } = await openExtraComponentsSetting();
        const persistedUiValue = ((await reopenedInput.getAttribute('value')) ?? '').trim();
        expect(persistedUiValue).to.equal(updatedValue);
        await reopenedEditor.close();
    });

    after(async () => {
        if (typeof originalExtraComponents === 'undefined') {
            return;
        }
        const { settingsEditor, textInput } = await openExtraComponentsSetting();
        const targetValue = originalExtraComponents;
        await driver.executeScript(
            `const element = arguments[0]; const value = arguments[1];
             element.value = value;
             element.dispatchEvent(new Event('input', { bubbles: true }));
             element.dispatchEvent(new Event('change', { bubbles: true }));`,
            textInput,
            targetValue
        );
        await driver.wait(async () => {
            const current = (await textInput.getAttribute('value')) ?? '';
            return current.trim() === targetValue.trim();
        }, 5000);
        await settingsEditor.close();
    });
});