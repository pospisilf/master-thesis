import { expect } from 'chai';
import { Workbench, EditorView, TextEditor, InputBox } from 'vscode-extension-tester';

describe('settings - camelCatalogVersionSettingPersists', function () {
    this.timeout(180000);

    it("Sets 'Camel catalog version' in settings.json and verifies the value persists.", async function () {
        const workbench = new Workbench();

        // Open User Settings (JSON)
        let editor = await openUserSettingsJsonViaCommandPalette(workbench);

        // Generate a unique value and write minimal JSON content
        const newValue = `9.9.${Date.now()}`;
        const json = `{
  "camel.Camel catalog version": "${newValue}"
}`;

        await editor.setText(json);
        await editor.save();

        // Ensure the change is reflected in the editor
        await waitFor(async () => {
            const content = await editor.getText();
            return content.includes(`"camel.Camel catalog version": "${newValue}"`);
        }, 15000, 500, 'User settings JSON did not contain the expected key/value after save');

        // Close and reopen to verify persistence
        const editorView = new EditorView();
        await editorView.closeAllEditors();

        editor = await openUserSettingsJsonViaCommandPalette(workbench);
        const reopenedText = await editor.getText();
        expect(reopenedText).to.include(`"camel.Camel catalog version": "${newValue}"`);
    });
});

/**
 * Opens User Settings (JSON) using the command palette and returns the active TextEditor.
 */
async function openUserSettingsJsonViaCommandPalette(workbench: Workbench): Promise<TextEditor> {
    const primary = 'Preferences: Open User Settings (JSON)';
    const fallback = 'Open User Settings (JSON)';

    // Try primary
    let input = await workbench.openCommandPrompt() as InputBox;
    await input.setText(primary);
    await input.confirm();

    try {
        await waitFor(async () => {
            try {
                const ed = new TextEditor();
                const title = await ed.getTitle();
                return /settings\.json/i.test(title);
            } catch {
                return false;
            }
        }, 8000, 250);
        return new TextEditor();
    } catch {
        // Retry with fallback label
        const editorView = new EditorView();
        await editorView.closeAllEditors();

        input = await workbench.openCommandPrompt() as InputBox;
        await input.setText(fallback);
        await input.confirm();

        await waitFor(async () => {
            try {
                const ed = new TextEditor();
                const title = await ed.getTitle();
                return /settings\.json/i.test(title);
            } catch {
                return false;
            }
        }, 15000, 250, 'Failed to open User Settings (JSON) via command palette');
        return new TextEditor();
    }
}

function delay(ms: number) {
    return new Promise(res => setTimeout(res, ms));
}

/**
 * Simple polling until condition returns true or timeout is reached.
 */
async function waitFor(cond: () => Promise<boolean>, timeout = 10000, interval = 200, failureMessage?: string) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
        if (await cond()) {
            return;
        }
        await delay(interval);
    }
    throw new Error(failureMessage ?? 'Timeout waiting for condition');
}