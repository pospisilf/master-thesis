import { VSBrowser, WebDriver, EditorView, ActivityBar, Workbench, SideBarView, DefaultTreeSection, DefaultTreeItem, InputBox } from 'vscode-extension-tester';
import { expect } from 'chai';

describe('menus - camelSubmenuOrderingIsCorrect', () => {
    let driver: WebDriver;
    let workbench: Workbench;
    let createdFileName: string | undefined;
    let createdFileItem: DefaultTreeItem | undefined;

    before(async function() {
        this.timeout(30000);
        driver = VSBrowser.instance.driver;
        workbench = new Workbench();
    });

    it('Validates the order of submenu items based on group indices (1 to 9).', async function() {
        this.timeout(40000);

        const activityBar = new ActivityBar();
        const explorerControl = await activityBar.getViewControl('Explorer');
        if (explorerControl) {
            await explorerControl.openView();
        }

        const sideBar: SideBarView = await workbench.getSideBar();
        const content = await sideBar.getContent();
        const sections = await content.getSections();

        let resourceSection: DefaultTreeSection | undefined;
        let workspaceRoot: DefaultTreeItem | undefined;

        for (const section of sections) {
            const treeSection = section as DefaultTreeSection;
            const items = await treeSection.getVisibleItems();
            if (items.length > 0) {
                resourceSection = treeSection;
                workspaceRoot = items[0] as DefaultTreeItem;
                break;
            }
        }

        if (!resourceSection || !workspaceRoot) {
            throw new Error('Unable to locate workspace root in explorer view');
        }

        createdFileName = `camel-ordering-${Date.now()}.txt`;
        const rootContext = await workspaceRoot.openContextMenu();
        const newFileAction = await rootContext.getItem('New File');
        expect(newFileAction, 'The "New File" action was not available in the explorer context menu.').to.not.be.undefined;
        await newFileAction!.select();

        const input = await InputBox.create();
        await input.setText(createdFileName);
        await input.confirm();

        await driver.wait(async () => {
            try {
                await resourceSection!.findItem(createdFileName!);
                return true;
            } catch {
                return false;
            }
        }, 5000, 'The created file did not appear in the explorer.');

        createdFileItem = await resourceSection.findItem(createdFileName) as DefaultTreeItem;

        const fileContextMenu = await createdFileItem.openContextMenu();
        const camelMenuItem = await fileContextMenu.getItem('New Camel File');
        expect(camelMenuItem, 'Expected "New Camel File" submenu when right-clicking on a file.').to.not.be.undefined;
        const camelFileSubmenu = await camelMenuItem!.getSubmenu();
        await driver.sleep(300);
        const fileSubmenuItems = await camelFileSubmenu!.getItems();
        const fileLabels: string[] = [];
        for (const item of fileSubmenuItems) {
            fileLabels.push((await item.getLabel()).trim());
        }
        await camelFileSubmenu!.close();
        await fileContextMenu.close();

        const expectedFileOrder = [
            'Create a Camel Route using YAML DSL',
            'Create a Camel Route using Java DSL',
            'Create a Camel Route using XML DSL',
            'Create a Kamelet using YAML DSL',
            'Create a Custom Resource Pipe using YAML DSL',
            'Create a Camel route from OpenAPI using YAML DSL',
            'Transform a Camel Route to YAML DSL',
            'Transform a Camel Route to XML DSL'
        ];
        expect(fileLabels).to.deep.equal(expectedFileOrder);

        workspaceRoot = (await resourceSection.getVisibleItems())[0] as DefaultTreeItem;
        const folderContextMenu = await workspaceRoot.openContextMenu();
        const camelMenuItemFolder = await folderContextMenu.getItem('New Camel File');
        expect(camelMenuItemFolder, 'Expected "New Camel File" submenu when right-clicking on the workspace folder.').to.not.be.undefined;
        const camelFolderSubmenu = await camelMenuItemFolder!.getSubmenu();
        await driver.sleep(300);
        const folderSubmenuItems = await camelFolderSubmenu!.getItems();
        const folderLabels: string[] = [];
        for (const item of folderSubmenuItems) {
            folderLabels.push((await item.getLabel()).trim());
        }
        await camelFolderSubmenu!.close();
        await folderContextMenu.close();

        const expectedFolderOrder = [
            'Create a Camel Route using YAML DSL',
            'Create a Camel Route using Java DSL',
            'Create a Camel Route using XML DSL',
            'Create a Kamelet using YAML DSL',
            'Create a Custom Resource Pipe using YAML DSL',
            'Create a Camel route from OpenAPI using YAML DSL',
            'Transform any Camel Route in a specified folder to YAML DSL',
            'Transform any Camel Route in a specified folder to XML DSL'
        ];
        expect(folderLabels).to.deep.equal(expectedFolderOrder);
    });

    after(async () => {
        try {
            await new EditorView().closeAllEditors();
        } catch {
            // ignore cleanup errors
        }
    });
});