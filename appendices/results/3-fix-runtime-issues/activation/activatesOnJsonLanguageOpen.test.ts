import { expect } from 'chai';
import {
    Workbench,
    EditorView,
    QuickOpenBox,
    VSBrowser,
    By,
    until
} from 'vscode-extension-tester';

describe('activation - activatesOnJsonLanguageOpen', function () {
    this.timeout(120000);

    before(async function () {
        const workbench = new Workbench();
        await workbench.getTitleBar().getTitle();
        await new Promise(res => setTimeout(res, 500));
    });

    it('Opens a JSON file and confirms the extension activates.', async function () {
        await runCommandFromPaletteStable([
            'New Untitled File',
            'File: New Untitled File',
            'New Text File',
            'File: New Text File'
        ]);

        const editorView = new EditorView();
        await editorView.wait();

        await runCommandFromPaletteStable([
            'Change Language Mode',
            'Change Language Mode...'
        ]);

        await pickFromQuickInput(['JSON', 'json']);

        await runCommandFromPaletteStable([
            'Developer: Show Running Extensions',
            'Show Running Extensions'
        ]);

        const driver = VSBrowser.instance.driver;
        await driver.wait(
            until.elementLocated(By.xpath("//*[contains(@class,'editor') or contains(@class,'pane') or contains(@class,'composite')][.//*[(contains(text(),'Running Extensions') or @aria-label='Running Extensions')]]")),
            20000
        );

        const camelExtensionLocator = By.xpath("//*[contains(text(),'Language Support for Apache Camel') or contains(text(),'vscode-apache-camel') or contains(text(),'Apache Camel')]");
        const camelRunning = await driver.wait(until.elementLocated(camelExtensionLocator), 30000);
        expect(await camelRunning.isDisplayed()).to.equal(true);
    });
});

async function runCommandFromPaletteStable(possibleLabels: string[]): Promise<void> {
    const workbench = new Workbench();
    const qp = await workbench.openCommandPrompt() as QuickOpenBox;

    await safeSetText(qp, '>');
    for (let i = 0; i < possibleLabels.length; i++) {
        await safeSetText(qp, '>' + possibleLabels[i]);
        const picked = await clickFirstQuickPick(qp, (label: string) => {
            const needle = possibleLabels[i].toLowerCase().replace(/\.\.\.$/, '');
            return label.toLowerCase().includes(needle);
        });
        if (picked) {
            await new Promise(res => setTimeout(res, 500));
            return;
        }
    }

    await safeSetText(qp, '>');
    const pickedAny = await clickFirstQuickPick(qp);
    if (!pickedAny) {
        throw new Error(`Unable to find command from palette with labels: ${possibleLabels.join(', ')}`);
    }
}

async function pickFromQuickInput(possibleLabels: string[]): Promise<void> {
    const workbench = new Workbench();
    const qp = await workbench.openCommandPrompt() as QuickOpenBox;

    for (let i = 0; i < possibleLabels.length; i++) {
        await safeSetText(qp, possibleLabels[i]);
        const picked = await clickFirstQuickPick(qp, (label: string) => label.toLowerCase().includes(possibleLabels[i].toLowerCase()));
        if (picked) {
            await new Promise(res => setTimeout(res, 500));
            return;
        }
    }
    const pickedAny = await clickFirstQuickPick(qp);
    if (!pickedAny) {
        throw new Error(`Unable to pick from quick input using labels: ${possibleLabels.join(', ')}`);
    }
}

async function safeSetText(qp: QuickOpenBox, text: string): Promise<void> {
    for (let i = 0; i < 3; i++) {
        try {
            await qp.setText(text);
            await new Promise(res => setTimeout(res, 200));
            return;
        } catch {
            await new Promise(res => setTimeout(res, 200));
        }
    }
    await qp.setText(text);
}

async function clickFirstQuickPick(qp: QuickOpenBox, predicate?: (label: string) => boolean): Promise<boolean> {
    for (let attempt = 0; attempt < 10; attempt++) {
        const items = await qp.getQuickPicks();
        if (items.length > 0) {
            if (predicate) {
                for (const item of items) {
                    const label = await item.getLabel();
                    if (predicate(label)) {
                        await item.select();
                        return true;
                    }
                }
            } else {
                await items[0].select();
                return true;
            }
        }
        await new Promise(res => setTimeout(res, 300));
    }
    return false;
}