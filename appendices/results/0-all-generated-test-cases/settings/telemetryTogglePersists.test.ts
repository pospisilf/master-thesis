import { VSBrowser, WebDriver, Workbench, SettingsEditor } from 'vscode-extension-tester';
import { expect } from 'chai';
import { By, WebElement, until } from 'selenium-webdriver';

describe('settings - telemetryTogglePersists', () => {
    let driver: WebDriver;
    let workbench: Workbench;

    const settingKey = 'redhat.telemetry.enabled';
    const searchTerm = 'redhat.telemetry.enabled';
    const settingRowLocator = By.css(`div.setting-item[data-key="${settingKey}"]`);
    const checkboxLocator = By.css('[role="checkbox"]');

    type SettingState = 'true' | 'false' | 'mixed';

    before(async function() {
        this.timeout(30000);
        driver = VSBrowser.instance.driver;
        workbench = new Workbench();
    });

    async function locateVisibleRow(): Promise<WebElement> {
        await driver.wait(async () => {
            const rows = await driver.findElements(settingRowLocator);
            for (const row of rows) {
                try {
                    if (await row.isDisplayed()) {
                        return true;
                    }
                } catch {
                    // ignore stale elements
                }
            }
            return false;
        }, 5000);
        const rows = await driver.findElements(settingRowLocator);
        for (const row of rows) {
            try {
                if (await row.isDisplayed()) {
                    return row;
                }
            } catch {
                // ignore stale elements
            }
        }
        throw new Error('Telemetry setting row not found');
    }

    async function openSettingRow(editor: SettingsEditor, tab: 'User' | 'Workspace'): Promise<WebElement> {
        await editor.selectTab(tab);
        await editor.clearSearch();
        await editor.searchText(searchTerm);
        await driver.sleep(500);
        const row = await locateVisibleRow();
        await driver.executeScript('arguments[0].scrollIntoView({block: "center"});', row);
        await driver.wait(until.elementIsVisible(row), 5000);
        return row;
    }

    async function getToggleFromRow(row: WebElement): Promise<WebElement> {
        let toggles = await row.findElements(checkboxLocator);
        if (toggles.length === 0) {
            toggles = await row.findElements(By.css('input[type="checkbox"]'));
        }
        if (toggles.length === 0) {
            toggles = await row.findElements(By.css('.monaco-switch'));
        }
        if (toggles.length === 0) {
            throw new Error('Telemetry toggle control not found');
        }
        const toggle = toggles[0];
        await driver.executeScript('arguments[0].scrollIntoView({block: "center"});', toggle);
        await driver.wait(until.elementIsVisible(toggle), 5000);
        return toggle;
    }

    async function getToggleState(toggle: WebElement): Promise<SettingState> {
        const aria = await toggle.getAttribute('aria-checked');
        if (aria === 'true' || aria === 'false' || aria === 'mixed') {
            return aria;
        }
        const pressed = await toggle.getAttribute('aria-pressed');
        if (pressed === 'true' || pressed === 'false') {
            return pressed;
        }
        const checked = await toggle.getAttribute('checked');
        if (checked !== null) {
            return checked === 'true' || checked === 'checked' ? 'true' : 'false';
        }
        const classAttr = await toggle.getAttribute('class');
        if (classAttr && classAttr.includes('checked')) {
            return 'true';
        }
        const selected = await toggle.isSelected();
        return selected ? 'true' : 'false';
    }

    async function getSettingState(editor: SettingsEditor, tab: 'User' | 'Workspace'): Promise<SettingState> {
        const row = await openSettingRow(editor, tab);
        const toggle = await getToggleFromRow(row);
        return getToggleState(toggle);
    }

    async function setSettingState(editor: SettingsEditor, tab: 'User' | 'Workspace', desired: 'true' | 'false'): Promise<void> {
        let row = await openSettingRow(editor, tab);
        let toggle = await getToggleFromRow(row);
        let state = await getToggleState(toggle);
        if (state === desired) {
            return;
        }
        try {
            await driver.wait(until.elementIsEnabled(toggle), 5000);
        } catch {
            // ignore if not applicable to element
        }
        await driver.executeScript('arguments[0].click();', toggle);
        await driver.sleep(200);
        await driver.wait(async () => {
            try {
                state = await getToggleState(toggle);
                if (state === desired) {
                    return true;
                }
            } catch {
                // element might have been refreshed
            }
            try {
                row = await locateVisibleRow();
                toggle = await getToggleFromRow(row);
                state = await getToggleState(toggle);
                return state === desired;
            } catch {
                return false;
            }
        }, 5000, 'Telemetry setting did not reach desired toggle state');
    }

    async function resetSetting(editor: SettingsEditor, tab: 'User' | 'Workspace'): Promise<void> {
        let row = await openSettingRow(editor, tab);
        let resetTriggers = await row.findElements(By.css('.setting-item-reset-button, .codicon.codicon-reset'));
        if (resetTriggers.length === 0) {
            const gearButtons = await row.findElements(By.css('.codicon.codicon-gear'));
            if (gearButtons.length > 0) {
                await driver.executeScript('arguments[0].click();', gearButtons[0]);
                const resetActionLocator = By.css('.context-view .codicon.codicon-reset, .context-view [aria-label="Reset Setting"]');
                const resetAction = await driver.wait(until.elementLocated(resetActionLocator), 3000);
                await driver.executeScript('arguments[0].click();', resetAction);
            } else {
                throw new Error('Reset control for telemetry setting not found');
            }
        } else {
            const resetButton = resetTriggers[0];
            await driver.executeScript('arguments[0].scrollIntoView({block: "center"});', resetButton);
            await driver.wait(until.elementIsVisible(resetButton), 3000);
            await driver.executeScript('arguments[0].click();', resetButton);
        }
        await driver.sleep(200);
        await driver.wait(async () => {
            try {
                row = await locateVisibleRow();
                const toggle = await getToggleFromRow(row);
                const state = await getToggleState(toggle);
                return state === 'mixed';
            } catch {
                return false;
            }
        }, 5000, 'Telemetry setting did not reset to default');
    }

    async function getScopeLabel(editor: SettingsEditor, tab: 'User' | 'Workspace'): Promise<string> {
        const row = await openSettingRow(editor, tab);
        try {
            const metadata = await row.findElement(By.css('.setting-item-metadata'));
            return (await metadata.getText()).trim();
        } catch {
            return '';
        }
    }

    async function restoreSetting(value: SettingState): Promise<void> {
        const editor = await workbench.openSettings();
        try {
            if (value === 'mixed') {
                await resetSetting(editor, 'User');
            } else {
                await setSettingState(editor, 'User', value);
            }
        } finally {
            await editor.close();
        }
    }

    it('Toggles Red Hat telemetry on/off and verifies the setting is saved at window scope.', async function() {
        this.timeout(60000);
        const initialEditor = await workbench.openSettings();
        let initialState: SettingState | undefined;
        let targetState: 'true' | 'false' | undefined;
        try {
            const scopeText = await getScopeLabel(initialEditor, 'User');
            expect(scopeText.toLowerCase()).to.contain('window');

            initialState = await getSettingState(initialEditor, 'User');
            const nextState: 'true' | 'false' = initialState === 'true' ? 'false' : 'true';
            targetState = nextState;

            await setSettingState(initialEditor, 'User', nextState);
            const appliedState = await getSettingState(initialEditor, 'User');
            expect(appliedState).to.equal(nextState);
        } finally {
            await initialEditor.close();
        }

        if (!targetState || initialState === undefined) {
            throw new Error('Failed to determine telemetry setting state for verification.');
        }

        let verificationEditor: SettingsEditor | undefined;
        try {
            verificationEditor = await workbench.openSettings();

            const persistedUserState = await getSettingState(verificationEditor, 'User');
            expect(persistedUserState).to.equal(targetState);

            const userScope = await getScopeLabel(verificationEditor, 'User');
            expect(userScope.toLowerCase()).to.contain('window');

            const workspaceScope = await getScopeLabel(verificationEditor, 'Workspace');
            expect(workspaceScope.toLowerCase()).to.contain('window');

            const workspaceState = await getSettingState(verificationEditor, 'Workspace');
            if (workspaceState !== 'mixed') {
                expect(workspaceState).to.equal(targetState);
            }
        } finally {
            if (verificationEditor) {
                try {
                    if (initialState === 'mixed') {
                        await resetSetting(verificationEditor, 'User');
                    } else {
                        await setSettingState(verificationEditor, 'User', initialState);
                    }
                } finally {
                    await verificationEditor.close();
                }
            } else if (initialState !== undefined) {
                await restoreSetting(initialState);
            }
        }
    });

    after(async () => {
        // Cleanup if required
    });
});