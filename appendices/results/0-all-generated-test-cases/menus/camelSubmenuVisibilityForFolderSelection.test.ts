import { VSBrowser, WebDriver, EditorView, ActivityBar, Workbench, SideBarView, DefaultTreeSection, InputBox, ContextMenu } from 'vscode-extension-tester';
import { expect } from 'chai';
import { Key } from 'selenium-webdriver';

describe('menus - camelSubmenuVisibilityForFolderSelection', () => {
    let driver: WebDriver;
    let workbench: Workbench;

    before(async function() {
        this.timeout(60000);
        driver = VSBrowser.instance.driver;
        workbench = new Workbench();
        try {
            await new EditorView().closeAllEditors();
        } catch {
            // ignore if no editors are open
        }
    });

    it('Selecting a folder shows folder transform commands and hides single-file transforms.', async function() {
        this.timeout(60000);

        const folderName = `camel-folder-${Date.now()}`;
        const explorerControl = await new ActivityBar().getViewControl('Explorer');
        expect(explorerControl, 'Explorer view control not found').to.not.be.undefined;

        const sideBar = await explorerControl!.openView() as SideBarView;
        const content = sideBar.getContent();
        const sections = await content.getSections();

        let workspaceSection: DefaultTreeSection | undefined;
        for (const section of sections) {
            const title = await section.getTitle();
            if (!title || title.trim().toLowerCase() === 'open editors') {
                continue;
            }
            workspaceSection = section as DefaultTreeSection;
            break;
        }
        expect(workspaceSection, 'Workspace section not found in Explorer view').to.not.be.undefined;

        await workspaceSection!.expand();

        const sectionMenu = await workspaceSection!.openContextMenu();
        expect(sectionMenu, 'Context menu for workspace section not available').to.not.be.undefined;

        let newFolderItem = await sectionMenu!.getItem('New Folder');
        if (!newFolderItem) {
            newFolderItem = await sectionMenu!.getItem('New Folder...');
        }
        expect(newFolderItem, '"New Folder" action not found in workspace context menu').to.not.be.undefined;
        await newFolderItem!.select();

        const nameInput = await InputBox.create();
        await nameInput.setText(folderName);
        await nameInput.confirm();
        await nameInput.waitForClosed();

        await driver.sleep(1000);

        const folderItem = await workspaceSection!.findItem(folderName, 0);
        expect(folderItem, `Folder "${folderName}" not created in Explorer`).to.not.be.undefined;

        await folderItem!.select();
        const folderContextMenu = await folderItem!.openContextMenu() as ContextMenu;
        expect(folderContextMenu, 'Unable to open context menu for created folder').to.not.be.undefined;

        const camelMenuItem = await folderContextMenu.getItem('New Camel File');
        expect(camelMenuItem, '"New Camel File" submenu entry not found').to.not.be.undefined;
        const hasSubmenu = await camelMenuItem!.hasSubmenu();
        expect(hasSubmenu, '"New Camel File" entry does not expose a submenu').to.be.true;

        const camelSubmenu = await camelMenuItem!.getSubmenu();
        expect(camelSubmenu, 'Failed to open "New Camel File" submenu').to.not.be.undefined;

        const submenuItems = await camelSubmenu!.getItems();
        const submenuLabels = await Promise.all(submenuItems.map(async item => (await item.getLabel()).trim()));

        expect(submenuLabels, 'Folder transform YAML command is not visible').to.include('Transform any Camel Route in a specified folder to YAML DSL');
        expect(submenuLabels, 'Folder transform XML command is not visible').to.include('Transform any Camel Route in a specified folder to XML DSL');
        expect(submenuLabels, 'Single-file YAML transform command should be hidden for folder selection').to.not.include('Transform a Camel Route to YAML DSL');
        expect(submenuLabels, 'Single-file XML transform command should be hidden for folder selection').to.not.include('Transform a Camel Route to XML DSL');

        await camelSubmenu!.close();
        await folderContextMenu.close();
        await driver.actions().sendKeys(Key.ESCAPE).perform();
    });

    after(async () => {
        // Cleanup handled implicitly; nothing to do
    });
});