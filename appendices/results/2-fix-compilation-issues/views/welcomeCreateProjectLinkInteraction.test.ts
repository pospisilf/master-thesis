import { VSBrowser, WebDriver, EditorView, ActivityBar, Workbench, SideBarView } from 'vscode-extension-tester';
import { expect } from 'chai';
import { By, until } from 'selenium-webdriver';

describe('views - welcomeCreateProjectLinkInteraction', () => {
    let driver: WebDriver;
    let workbench: Workbench;

    before(async function() {
        this.timeout(30000);
        driver = VSBrowser.instance.driver;
        workbench = new Workbench();
    });

    it("Clicks the welcome link 'Create a Camel project' and verifies the disabled command is handled gracefully (no crash, expected notification or no-op).", async function() {
        this.timeout(20000);

        try {
            await new EditorView().closeAllEditors();
        } catch {
            // ignore if no editors are open
        }

        const explorerControl = await new ActivityBar().getViewControl('Explorer');
        expect(explorerControl, 'Explorer view control should be available').to.not.be.undefined;

        const explorerView = await explorerControl!.openView();
        expect(explorerView).to.be.instanceOf(SideBarView);

        const welcomeLink = await driver.wait(
            until.elementLocated(By.xpath("//a[contains(@href,'command:camel.jbang.project.new')]")),
            10000
        );
        await driver.wait(until.elementIsVisible(welcomeLink), 5000);
        expect(await welcomeLink.getText()).to.contain('Create a Camel project');

        await welcomeLink.click();
        await driver.sleep(1000);

        // Try to open and close the Notifications Center to ensure the workbench remains responsive
        try {
            const center = await workbench.openNotificationsCenter();
            await center.close();
        } catch {
            // If opening notifications center fails, continue; the main check is that no crash occurred
        }

        // Validate VS Code is still responsive by checking the Explorer control again
        const explorerControlAfter = await new ActivityBar().getViewControl('Explorer');
        expect(explorerControlAfter, 'Workbench should remain responsive after clicking a disabled command link').to.not.be.undefined;
    });

    after(async () => {
        try {
            const center = await workbench.openNotificationsCenter();
            await center.close();
        } catch {
            // ignore if notifications center cannot be opened
        }
    });
});