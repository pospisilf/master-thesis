import { VSBrowser, WebDriver, EditorView, SideBarView, ViewItem } from 'vscode-extension-tester';
import { expect } from 'chai';
import path from 'path';

describe('menus - camelSubmenuOrderingIsCorrect', () => {
    let driver: WebDriver;

    before(async function () {
        this.timeout(30000);
        driver = VSBrowser.instance.driver;
        await VSBrowser.instance.openResources(path.resolve('src', 'ui-test', 'resources'));
    });

    it('Validates the order of submenu items based on group indices (1 to 9).', async function () {
        this.timeout(40000);

        const item = await (await new SideBarView().getContent().getSection('resources')).findItem(`empty-file.xml`) as ViewItem;

        await item.click();
        await item.select();
        await driver.sleep(2000);
        const fileContextMenu = await item.openContextMenu();

        expect(fileContextMenu, 'Expected "New Camel File" submenu when right-clicking on a file.').to.not.be.undefined;

        const newCamelFile = await fileContextMenu.select('New Camel File');
        expect(newCamelFile, 'Expected "New Camel File" to not be undefined.').to.not.be.undefined;

        const menuItems = await newCamelFile!.getItems();
        expect(menuItems, 'Expected submenu items for "New Camel File".').to.not.be.undefined;

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

        const menuItemTexts = await Promise.all(menuItems.map(item => item.getText()));
        expect(menuItemTexts).to.deep.equal(expectedFileOrder);

        // folder
        const item2 = await (await new SideBarView().getContent().getSection('resources')).findItem(`inside_folder`) as ViewItem;

        await item2.click();
        await item2.select();
        await driver.sleep(2000);
        const folderContextMenu = await item2.openContextMenu();

        expect(folderContextMenu, 'Expected "New Camel File" submenu when right-clicking on a folder.').to.not.be.undefined;

        const newCamelFile2 = await folderContextMenu.select('New Camel File');
        expect(newCamelFile2, 'Expected "New Camel File" to not be undefined.').to.not.be.undefined;

        const menuItems2 = await newCamelFile2!.getItems();
        expect(menuItems2, 'Expected submenu items for "New Camel File".').to.not.be.undefined;

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

        const menuItemTexts2 = await Promise.all(menuItems2.map(item => item.getText()));
        expect(menuItemTexts2).to.deep.equal(expectedFolderOrder);
    });

    after(async () => {
        try {
            await new EditorView().closeAllEditors();
        } catch {
            // ignore cleanup errors
        }
    });
});
