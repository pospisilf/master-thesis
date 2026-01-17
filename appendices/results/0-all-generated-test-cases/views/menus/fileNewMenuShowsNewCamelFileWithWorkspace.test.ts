import { VSBrowser, WebDriver, Workbench, InputBox, QuickPickItem, ModalDialog } from 'vscode-extension-tester';
import { expect } from 'chai';

describe('menus - fileNewMenuShowsNewCamelFileWithWorkspace', () => {
    let driver: WebDriver;
    let workbench: Workbench;

    before(async function () {
        this.timeout(30000);
        driver = VSBrowser.instance.driver;
        workbench = new Workbench();
    });

    it('Ensures File > New File includes \'New Camel File\' when a workspace folder is open and hides it otherwise.', async function () {
        this.timeout(120000);

        let storedRecentLabel: string | undefined;
        let storedRecentDescription: string | undefined;

        // Capture a recent workspace entry to reopen later
        const initialPalette = await workbench.openCommandPrompt();
        await initialPalette.setText('>Open Recent');
        await waitForQuickPickPopulation(initialPalette, driver);
        const initialCommandPicks = await initialPalette.getQuickPicks();
        let openRecentCommand: QuickPickItem | undefined;
        for (const pick of initialCommandPicks) {
            const label = (await pick.getLabel()).toLowerCase();
            if (label.includes('open recent')) {
                openRecentCommand = pick;
                break;
            }
        }
        expect(openRecentCommand, 'Unable to locate the Open Recent command').to.not.be.undefined;
        await openRecentCommand!.select();

        const recentBox = await waitForInputBox(driver);
        const recentItems = await waitForQuickPickItems(recentBox, driver);
        for (const item of recentItems) {
            const label = await item.getLabel();
            if (/clear recently opened/i.test(label) || /more/i.test(label)) {
                continue;
            }
            storedRecentLabel = label;
            storedRecentDescription = await safeGetDescription(item);
            break;
        }
        expect(storedRecentLabel, 'Failed to capture a recent workspace entry').to.be.a('string');
        await recentBox.cancel();
        await driver.sleep(500);

        // Verify New Camel File is available when workspace is open
        await workbench.executeCommand('File: New File...');
        const newFileBoxWithWorkspace = await waitForInputBox(driver);
        const newFileItems = await waitForQuickPickItems(newFileBoxWithWorkspace, driver);
        const newFileLabels = await Promise.all(newFileItems.map(item => item.getLabel()));
        expect(newFileLabels).to.include('New Camel File');
        await newFileBoxWithWorkspace.cancel();
        await driver.sleep(500);

        // Close the current workspace/folder
        const closePalette = await workbench.openCommandPrompt();
        await closePalette.setText('>Close');
        await waitForQuickPickPopulation(closePalette, driver);
        const closeCommandPicks = await closePalette.getQuickPicks();
        let closeCommand: QuickPickItem | undefined;
        for (const pick of closeCommandPicks) {
            const label = (await pick.getLabel()).toLowerCase();
            if (label.includes('close folder')) {
                closeCommand = pick;
                break;
            }
            if (label.includes('close workspace')) {
                closeCommand = pick;
                break;
            }
        }
        expect(closeCommand, 'Failed to locate Close Folder/Close Workspace command').to.not.be.undefined;
        await closeCommand!.select();
        await driver.sleep(1500);

        // Ensure New Camel File is not available without a workspace
        await workbench.executeCommand('File: New File...');
        const newFileBoxWithoutWorkspace = await waitForInputBox(driver);
        const newFileItemsWithoutWorkspace = await waitForQuickPickItems(newFileBoxWithoutWorkspace, driver);
        const labelsWithoutWorkspace = await Promise.all(newFileItemsWithoutWorkspace.map(item => item.getLabel()));
        expect(labelsWithoutWorkspace).to.not.include('New Camel File');
        await newFileBoxWithoutWorkspace.cancel();
        await driver.sleep(500);

        // Reopen the previously stored workspace entry
        expect(storedRecentLabel, 'No stored workspace label available for reopening').to.not.be.undefined;
        const reopenPalette = await workbench.openCommandPrompt();
        await reopenPalette.setText('>Open Recent');
        await waitForQuickPickPopulation(reopenPalette, driver);
        const reopenCommandPicks = await reopenPalette.getQuickPicks();
        let reopenCommand: QuickPickItem | undefined;
        for (const pick of reopenCommandPicks) {
            const label = (await pick.getLabel()).toLowerCase();
            if (label.includes('open recent')) {
                reopenCommand = pick;
                break;
            }
        }
        expect(reopenCommand, 'Unable to re-open the Open Recent command').to.not.be.undefined;
        await reopenCommand!.select();

        const reopenBox = await waitForInputBox(driver);
        const reopenItems = await waitForQuickPickItems(reopenBox, driver);
        let workspaceItemToReopen: QuickPickItem | undefined;
        for (const item of reopenItems) {
            const label = await item.getLabel();
            const description = await safeGetDescription(item);
            if (label === storedRecentLabel || (storedRecentLabel && label.includes(storedRecentLabel))) {
                if (!storedRecentDescription || storedRecentDescription === description) {
                    workspaceItemToReopen = item;
                    break;
                }
            }
        }
        if (!workspaceItemToReopen) {
            for (const item of reopenItems) {
                const label = await item.getLabel();
                if (label === storedRecentLabel) {
                    workspaceItemToReopen = item;
                    break;
                }
            }
        }
        expect(workspaceItemToReopen, 'Could not find stored workspace in Open Recent list').to.not.be.undefined;
        await workspaceItemToReopen!.select();
        await handleWorkspaceTrustDialog(driver);
        await driver.sleep(2000);

        // Confirm New Camel File returns after workspace is reopened
        await workbench.executeCommand('File: New File...');
        const newFileBoxAfterReopen = await waitForInputBox(driver);
        const newFileItemsAfterReopen = await waitForQuickPickItems(newFileBoxAfterReopen, driver);
        const finalLabels = await Promise.all(newFileItemsAfterReopen.map(item => item.getLabel()));
        expect(finalLabels).to.include('New Camel File');
        await newFileBoxAfterReopen.cancel();
    });

    after(async () => {
        // Cleanup if required
    });
});

async function waitForInputBox(driver: WebDriver, timeout: number = 10000): Promise<InputBox> {
    const start = Date.now();
    while (Date.now() - start < timeout) {
        try {
            return await InputBox.create();
        } catch {
            await driver.sleep(200);
        }
    }
    throw new Error('Input box did not appear within the expected time.');
}

async function waitForQuickPickItems(box: InputBox, driver: WebDriver, timeout: number = 10000): Promise<QuickPickItem[]> {
    const start = Date.now();
    while (Date.now() - start < timeout) {
        const picks = await box.getQuickPicks();
        if (picks.length > 0) {
            return picks;
        }
        await driver.sleep(200);
    }
    throw new Error('Quick pick items did not populate within the expected time.');
}

async function waitForQuickPickPopulation(box: InputBox, driver: WebDriver, timeout: number = 10000): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < timeout) {
        const picks = await box.getQuickPicks();
        if (picks.length > 0) {
            return;
        }
        await driver.sleep(200);
    }
    throw new Error('Command palette quick picks did not populate in time.');
}

async function safeGetDescription(item: QuickPickItem): Promise<string | undefined> {
    const getDescription = (item as any).getDescription;
    if (typeof getDescription === 'function') {
        try {
            return await getDescription.call(item);
        } catch {
            return undefined;
        }
    }
    return undefined;
}

async function handleWorkspaceTrustDialog(driver: WebDriver): Promise<void> {
    try {
        const dialog = await ModalDialog.create();
        const buttons = await dialog.getButtons();
        for (const button of buttons) {
            const text = await button.getText();
            if (/trust/i.test(text) || /yes/i.test(text)) {
                await button.click();
                await driver.sleep(500);
                return;
            }
        }
        if (buttons.length > 0) {
            await buttons[0].click();
            await driver.sleep(500);
        } else {
            await dialog.accept();
            await driver.sleep(500);
        }
    } catch {
        // No dialog to handle
    }
}