import { VSBrowser, WebDriver, EditorView, ActivityBar, Workbench, SideBarView, NotificationsCenter, Notification } from 'vscode-extension-tester';
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
        } catch (err) {
            // ignore if no editors are open
        }

        const explorerControl = await new ActivityBar().getViewControl('Explorer');
        expect(explorerControl, 'Explorer view control should be available').to.not.be.undefined;

        const explorerView = await explorerControl!.openView();
        expect(explorerView).to.be.instanceOf(SideBarView);

        let notificationsCenter: NotificationsCenter | undefined;
        try {
            notificationsCenter = await workbench.openNotificationsCenter();
            const existingNotifications = await notificationsCenter.getNotifications();
            for (const note of existingNotifications) {
                try {
                    await note.dismiss();
                } catch {
                    // ignore non-dismissible notifications
                }
            }
        } finally {
            if (notificationsCenter) {
                await notificationsCenter.close();
            }
        }

        const welcomeLink = await driver.wait(
            until.elementLocated(By.xpath("//a[contains(@href,'command:camel.jbang.project.new')]")),
            10000
        );
        await driver.wait(until.elementIsVisible(welcomeLink), 5000);
        expect(await welcomeLink.getText()).to.contain('Create a Camel project');

        await welcomeLink.click();
        await driver.sleep(1000);

        notificationsCenter = await workbench.openNotificationsCenter();
        const triggeredNotifications: Notification[] = await notificationsCenter.getNotifications();

        let handledGracefully = false;
        for (const notification of triggeredNotifications) {
            const message = (await notification.getMessage()) || '';
            if (/not enabled|not available|no handler|currently not enabled/i.test(message)) {
                handledGracefully = true;
            }
        }

        if (!handledGracefully && triggeredNotifications.length === 0) {
            handledGracefully = true;
        }

        expect(handledGracefully, 'Disabled command should be handled without throwing errors').to.be.true;

        await notificationsCenter.close();
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