import { VSBrowser, WebDriver, Workbench, QuickOpenBox, QuickPickItem, InputBox, ActivityBar, SideBarView, ContextMenuItem, TreeItem } from 'vscode-extension-tester';
import { expect } from 'chai';

describe('commands - camelNewFileEnablementRequiresResource', () => {
    let driver: WebDriver;
    let workbench: Workbench;

    before(async function () {
        this.timeout(30000);
        driver = VSBrowser.instance.driver;
        workbench = new Workbench();
    });

    it('Ensures \'New Camel File\' command is not available in the Command Palette without a selected resource and only accessible through the submenu entries.', async function () {
        this.timeout(90000);

        // Verify command palette does not expose the "New Camel File" command without a resource selection
        const commandPalette = await workbench.openCommandPrompt() as QuickOpenBox;
        await commandPalette.setText('>New Camel File');
        await driver.sleep(1000);
        const palettePicks = await commandPalette.getQuickPicks();
        const paletteLabels = await Promise.all(palettePicks.map(async pick => await pick.getLabel()));
        expect(paletteLabels.some(label => /New Camel File/i.test(label)), 'Command palette should not list "New Camel File" without a selected resource').to.be.false;
        await commandPalette.cancel();

        // Trigger "File: New File..." picker and ensure "New Camel File" is not offered
        const newFileCommandPalette = await workbench.openCommandPrompt() as QuickOpenBox;
        await newFileCommandPalette.setText('>File: New File...');
        await driver.sleep(1000);
        const newFileCommands = await newFileCommandPalette.getQuickPicks();
        let fileNewCommand: QuickPickItem | undefined;
        for (const pick of newFileCommands) {
            const label = await pick.getLabel();
            if (label.includes('File: New File...')) {
                fileNewCommand = pick;
                break;
            }
        }
        expect(fileNewCommand, 'Expected to find "File: New File..." command in the command palette').to.not.be.undefined;
        await fileNewCommand!.select();

        await driver.wait(async () => {
            try {
                await InputBox.create();
                return true;
            } catch (err) {
                return false;
            }
        }, 5000, 'New File quick pick did not open');

        const newFilePicker = await InputBox.create();
        await driver.sleep(500);
        const newFileOptions = await newFilePicker.getQuickPicks();
        const newFileLabels = await Promise.all(newFileOptions.map(async option => await option.getLabel()));
        expect(newFileLabels.some(label => /New Camel File/i.test(label)), '"New Camel File" should not appear in the File > New File picker without a selected resource').to.be.false;
        await newFilePicker.cancel();

        // Select a resource in the explorer to enable submenu entries
        const explorerControl = await new ActivityBar().getViewControl('Explorer');
        expect(explorerControl, 'Explorer view control not found').to.not.be.undefined;
        await explorerControl!.openView();

        const sideBar = new SideBarView();
        const content = await sideBar.getContent();
        const sections = await content.getSections();

        let selectedResource: TreeItem | undefined;
        for (const section of sections) {
            const title = await section.getTitle();
            if (title === 'Open Editors') {
                continue;
            }
            const items = await section.getVisibleItems();
            if (items.length === 0) {
                continue;
            }
            selectedResource = items[0];
            break;
        }
        expect(selectedResource, 'No resource item was found in the explorer to test submenu entries').to.not.be.undefined;
        await selectedResource!.select();

        const contextMenu = await selectedResource!.openContextMenu();
        const contextItems = await contextMenu.getItems();
        let newCamelFileItem: ContextMenuItem | undefined;
        for (const item of contextItems) {
            const label = await item.getLabel();
            if (label === 'New Camel File') {
                newCamelFileItem = item as ContextMenuItem;
                break;
            }
        }
        expect(newCamelFileItem, '"New Camel File" submenu should be present in the explorer context menu').to.not.be.undefined;
        expect(await newCamelFileItem!.hasSubmenu(), '"New Camel File" entry should expose submenu items').to.be.true;

        const camelSubmenu = await newCamelFileItem!.openSubmenu();
        expect(camelSubmenu, 'Failed to open the "New Camel File" submenu').to.not.be.undefined;

        const submenuItems = await camelSubmenu!.getItems();
        const submenuLabels = await Promise.all(submenuItems.map(async submenuItem => await submenuItem.getLabel()));
        expect(submenuLabels).to.include.members([
            'Create a Camel Route using YAML DSL',
            'Create a Camel Route using Java DSL',
            'Create a Camel Route using XML DSL'
        ]);

        await camelSubmenu!.close();
        await contextMenu.close();
    });

    after(async () => {
        // Cleanup if required
    });
});