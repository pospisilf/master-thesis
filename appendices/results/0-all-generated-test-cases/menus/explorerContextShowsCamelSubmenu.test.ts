import { VSBrowser, WebDriver, EditorView, ActivityBar, Workbench, SideBarView, DefaultTreeSection, TreeItem, ContextMenu, MenuItem } from 'vscode-extension-tester';
import { expect } from 'chai';

describe('menus - explorerContextShowsCamelSubmenu', () => {
    let driver: WebDriver;
    let workbench: Workbench;

    before(async function() {
        this.timeout(30000);
        driver = VSBrowser.instance.driver;
        await VSBrowser.instance.waitForWorkbench();
        workbench = new Workbench();
    });

    it('Right-click in Explorer and verify the \'New Camel File\' submenu appears when a workspace is open.', async function() {
        this.timeout(20000);

        const explorerControl = await new ActivityBar().getViewControl('Explorer');
        expect(explorerControl, 'Explorer view control should be available').to.not.be.undefined;

        const sideBar: SideBarView = await explorerControl!.openView();
        const content = await sideBar.getContent();
        const sections = await content.getSections();

        let workspaceSection: DefaultTreeSection | undefined;
        for (const section of sections) {
            if (section instanceof DefaultTreeSection) {
                const title = (await section.getTitle()).toLowerCase();
                if (title !== 'open editors') {
                    workspaceSection = section;
                    break;
                }
            }
        }

        expect(workspaceSection, 'Workspace section should exist indicating an opened workspace').to.not.be.undefined;

        await workspaceSection!.expand();
        const items: TreeItem[] = await workspaceSection!.getVisibleItems();
        expect(items.length, 'Workspace should contain at least one visible item').to.be.greaterThan(0);

        const targetItem = items[0];
        await targetItem.select();
        await driver.sleep(500);

        const contextMenu: ContextMenu = await targetItem.openContextMenu();
        const menuItems: MenuItem[] = await contextMenu.getItems();
        const labels = await Promise.all(menuItems.map(async item => (await item.getLabel()).trim()));
        const hasCamelSubmenu = labels.some(label => label.startsWith('New Camel File'));

        expect(hasCamelSubmenu, 'Explorer context menu should include the "New Camel File" submenu').to.be.true;

        await contextMenu.close();
    });

    after(async () => {
        // Cleanup if required
    });
});