import { VSBrowser, WebDriver, EditorView, ActivityBar, Workbench, SideBarView, InputBox, DefaultTreeSection } from 'vscode-extension-tester';
import { expect } from 'chai';

describe('menus - camelSubmenuVisibilityForFileSelection', () => {
    let driver: WebDriver;
    let workbench: Workbench;

    before(async function() {
        this.timeout(30000);
        driver = VSBrowser.instance.driver;
        workbench = new Workbench();
    });

    it('Selecting a file shows single-file transform commands and hides folder-only transforms.', async function() {
        this.timeout(40000);

        const fileName = `camel-submenu-${Date.now()}.xml`;

        await workbench.executeCommand('workbench.action.files.newFile');
        const input = await InputBox.create();
        await input.setText(fileName);
        await input.confirm();
        try {
            await input.hide();
        } catch (err) {
            // Input might already be closed; ignore
        }

        await driver.sleep(1000);

        const explorerControl = await new ActivityBar().getViewControl('Explorer');
        expect(explorerControl, 'Explorer view control should be available').to.not.be.undefined;

        const explorerView: SideBarView = await explorerControl!.openView();
        const content = await explorerView.getContent();
        const sections = await content.getSections();

        let workspaceSection: DefaultTreeSection | undefined;
        for (const section of sections) {
            if (section instanceof DefaultTreeSection) {
                const title = await section.getTitle();
                if (!/open editors/i.test(title)) {
                    workspaceSection = section;
                    break;
                }
            }
        }
        expect(workspaceSection, 'Workspace section was not found in Explorer tree').to.not.be.undefined;

        await workspaceSection!.expand();
        const fileItem = await workspaceSection!.findItem(fileName, true);
        expect(fileItem, `File ${fileName} should exist in the workspace`).to.not.be.undefined;

        const contextMenu = await fileItem!.openContextMenu();
        const submenuEntry = await contextMenu.getItem('New Camel File');
        expect(submenuEntry, '"New Camel File" submenu should be available for file selection').to.not.be.undefined;

        expect(await submenuEntry!.hasSubmenu(), '"New Camel File" entry should expose a submenu').to.be.true;
        const submenu = await submenuEntry!.getSubmenu();
        expect(submenu, '"New Camel File" submenu instance should be retrievable').to.not.be.undefined;

        const submenuItems = await submenu!.getItems();
        const labels = await Promise.all(submenuItems.map(async item => await item.getLabel()));

        expect(labels).to.include('Transform a Camel Route to YAML DSL', 'Single-file YAML transform command should be visible');
        expect(labels).to.include('Transform a Camel Route to XML DSL', 'Single-file XML transform command should be visible');
        expect(labels).to.not.include('Transform any Camel Route in a specified folder to YAML DSL', 'Folder YAML transform command should be hidden for file selection');
        expect(labels).to.not.include('Transform any Camel Route in a specified folder to XML DSL', 'Folder XML transform command should be hidden for file selection');

        try {
            await submenu!.close();
        } catch (err) {
            // submenu might already be closed
        }
        try {
            await contextMenu.close();
        } catch (err) {
            // context menu might already be closed
        }

        const editorView = new EditorView();
        try {
            await editorView.closeEditor(fileName);
        } catch (err) {
            // Editor may already be closed
        }
    });

    after(async () => {
        // Cleanup if required
    });
});