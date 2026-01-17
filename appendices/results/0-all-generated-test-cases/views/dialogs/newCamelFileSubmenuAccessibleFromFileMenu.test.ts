import { VSBrowser, WebDriver, EditorView, ActivityBar, Workbench } from 'vscode-extension-tester';
import { Key } from 'selenium-webdriver';
import { expect } from 'chai';

describe('dialogs - newCamelFileSubmenuAccessibleFromFileMenu', () => {
    let driver: WebDriver;
    let workbench: Workbench;

    before(async function() {
        this.timeout(30000);
        driver = VSBrowser.instance.driver;
        workbench = new Workbench();

        const editorView = new EditorView();
        try {
            await editorView.closeAllEditors();
        } catch (err) {
            // ignore if there are no editors
        }

        const activityBar = new ActivityBar();
        const explorerControl = await activityBar.getViewControl('Explorer');
        if (explorerControl) {
            await explorerControl.openView();
        }
    });

    it("From File > New File, verifies clicking 'New Camel File' opens the Camel submenu and its items are clickable.", async function() {
        this.timeout(40000);

        const menu = await workbench.getMenu();
        const newFileMenu = await menu.openItem('File', 'New File');
        await driver.sleep(500);

        const newFileItems = await newFileMenu.getItems();
        const newFileLabels = await Promise.all(newFileItems.map(item => item.getLabel()));
        const camelMenuIndex = newFileLabels.findIndex(label => label === 'New Camel File');
        expect(camelMenuIndex, 'New Camel File submenu should be listed under File > New File').to.be.greaterThan(-1);

        const newCamelMenuItem = newFileItems[camelMenuIndex];
        expect(await newCamelMenuItem.isEnabled(), 'New Camel File submenu entry should be enabled').to.be.true;

        const camelSubMenu = await newFileMenu.openItem('New Camel File');
        await driver.sleep(500);

        const camelItems = await camelSubMenu.getItems();
        expect(camelItems.length, 'Camel submenu should contain at least one item').to.be.greaterThan(0);

        const camelLabels = await Promise.all(camelItems.map(item => item.getLabel()));
        const expectedCoreItems = [
            'Create a Camel Route using YAML DSL',
            'Create a Camel Route using Java DSL',
            'Create a Camel Route using XML DSL',
            'Create a Kamelet using YAML DSL',
            'Create a Custom Resource Pipe using YAML DSL',
            'Create a Camel route from OpenAPI using YAML DSL'
        ];

        expectedCoreItems.forEach(label => {
            expect(camelLabels, `Camel submenu should include ${label}`).to.include(label);
        });

        for (const label of expectedCoreItems) {
            const index = camelLabels.findIndex(l => l === label);
            if (index > -1) {
                const item = camelItems[index];
                expect(await item.isEnabled(), `Camel submenu item ${label} should be enabled`).to.be.true;
            }
        }

        const optionalItems = [
            'Transform a Camel Route to YAML DSL',
            'Transform a Camel Route to XML DSL',
            'Transform any Camel Route in a specified folder to YAML DSL',
            'Transform any Camel Route in a specified folder to XML DSL'
        ];

        for (const label of optionalItems) {
            const index = camelLabels.findIndex(l => l === label);
            if (index > -1) {
                const item = camelItems[index];
                expect(await item.isEnabled(), `Camel submenu item ${label} should be enabled when present`).to.be.true;
            }
        }

        await driver.actions({ bridge: true }).sendKeys(Key.ESCAPE).perform();
        await driver.sleep(200);
        await driver.actions({ bridge: true }).sendKeys(Key.ESCAPE).perform();
    });

    after(async () => {
        try {
            await VSBrowser.instance.driver.actions({ bridge: true }).sendKeys(Key.ESCAPE).perform();
        } catch (err) {
            // ignore cleanup errors
        }
    });
});