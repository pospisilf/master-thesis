import { expect } from 'chai';
import {
    ActivityBar,
    ContextMenu,
    SideBarView,
    VSBrowser,
    ViewSection,
    TitleBar
} from 'vscode-extension-tester';

describe('menus - camelSubmenuOrderingIsCorrect', function () {
    this.timeout(90000);

    before(async function () {
        // Ensure workbench (window) is ready
        await new TitleBar().getTitle();
    });

    it('Validates the order of submenu items based on group indices (1 to 9).', async function () {
        const driver = VSBrowser.instance.driver;

        // Open Explorer view
        const explorerControl = await new ActivityBar().getViewControl('Explorer');
        expect(explorerControl, 'Explorer view control should be available').to.not.be.undefined;
        const explorerView = await explorerControl!.openView() as SideBarView;

        // Wait for a workspace section (not "Open Editors") to be present
        const section = await waitForWorkspaceSection(explorerView, 20000);
        expect(section, 'Workspace section should be present in Explorer').to.not.be.undefined;

        // Open the context menu on the workspace section with small retry
        const menu = await openContextMenuWithRetry(section!, 3, 1000);
        expect(menu, 'Explorer context menu should open').to.not.be.undefined;

        // Find the "New Camel File" submenu entry
        const menuItem = await findMenuItemByLabel(menu!, 'New Camel File', 5000);
        expect(menuItem, '"New Camel File" should be present in Explorer context menu').to.not.be.undefined;

        // Open and read the submenu
        const submenu = await waitForSubMenu(menuItem!, 5000);
        expect(submenu, '"New Camel File" submenu should open').to.not.be.undefined;

        const labels = (await submenu!.getItems()).map(async i => (await i.getLabel()).trim());
        const resolvedLabels = (await Promise.all(labels)).filter(l => l.length > 0);

        // For debugging purposes (in case of flakiness), ensure we actually got items
        expect(resolvedLabels.length, 'Submenu should contain items').to.be.greaterThan(0);

        const expectedOrder = [
            'Create a Camel Route using YAML DSL',
            'Create a Camel Route using Java DSL',
            'Create a Camel Route using XML DSL',
            'Create a Kamelet using YAML DSL',
            'Create a Custom Resource Pipe using YAML DSL',
            'Create a Camel route from OpenAPI using YAML DSL',
            'Transform any Camel Route in a specified folder to YAML DSL',
            'Transform any Camel Route in a specified folder to XML DSL'
        ];

        const indices = expectedOrder.map(expected =>
            findIndexCaseInsensitive(resolvedLabels, expected)
        );

        // Verify all expected entries exist (some environments can localize, but we assume English here)
        indices.forEach((idx, i) => {
            expect(idx, `Expected submenu item not found: "${expectedOrder[i]}"`).to.be.greaterThan(-1);
        });

        // Verify ascending order of found indices
        for (let i = 1; i < indices.length; i++) {
            expect(indices[i], `Menu item "${expectedOrder[i]}" should appear after "${expectedOrder[i - 1]}"`).to.be.greaterThan(indices[i - 1]);
        }
    });
});

function findIndexCaseInsensitive(haystack: string[], needle: string): number {
    const n = needle.toLowerCase();
    return haystack.findIndex(h => h.toLowerCase() === n);
}

async function waitForWorkspaceSection(view: SideBarView, timeout = 15000): Promise<ViewSection | undefined> {
    const start = Date.now();
    while (Date.now() - start < timeout) {
        const content = await view.getContent();
        const sections = await content.getSections();
        for (const s of sections) {
            const title = (await s.getTitle()).trim();
            // The workspace root section is typically not "Open Editors"
            if (title.toLowerCase() !== 'open editors' && title.length > 0) {
                return s;
            }
        }
        await VSBrowser.instance.driver.sleep(300);
    }
    return undefined;
}

async function openContextMenuWithRetry(section: any, retries = 2, delayMs = 500): Promise<ContextMenu | undefined> {
    let lastError: any;
    for (let i = 0; i <= retries; i++) {
        try {
            // Try to open context menu on the section header
            const menu = await section.openContextMenu();
            if (menu) {
                return menu;
            }
        } catch (err) {
            lastError = err;
        }
        await VSBrowser.instance.driver.sleep(delayMs);
    }
    if (lastError) {
        throw lastError;
    }
    return undefined;
}

async function findMenuItemByLabel(menu: ContextMenu, label: string, timeout = 5000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
        const items = await menu.getItems();
        for (const item of items) {
            const itemLabel = (await item.getLabel()).trim();
            if (itemLabel.toLowerCase() === label.toLowerCase()) {
                return item;
            }
        }
        await VSBrowser.instance.driver.sleep(250);
    }
    return undefined;
}

async function waitForSubMenu(menuItem: any, timeout = 5000): Promise<ContextMenu | undefined> {
    const start = Date.now();
    while (Date.now() - start < timeout) {
        try {
            const submenu = await menuItem.getSubmenu();
            if (submenu) {
                return submenu;
            }
        } catch {
            // ignore and retry
        }
        await VSBrowser.instance.driver.sleep(200);
    }
    return undefined;
}