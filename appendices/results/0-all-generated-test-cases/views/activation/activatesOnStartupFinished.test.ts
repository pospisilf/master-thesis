import { VSBrowser, WebDriver, Workbench, BottomBarPanel } from 'vscode-extension-tester';
import { expect } from 'chai';

describe('activation - activatesOnStartupFinished', () => {
    let driver: WebDriver;
    let workbench: Workbench;
    let bottomBar: BottomBarPanel;

    before(async function() {
        this.timeout(60000);
        driver = VSBrowser.instance.driver;
        workbench = new Workbench();
        bottomBar = new BottomBarPanel();
        await driver.sleep(2000);
    });

    it('Verifies the extension activates automatically once VS Code startup is finished.', async function() {
        this.timeout(60000);

        const outputView = await bottomBar.openOutputView();
        const channel = await outputView.getChannel('Log (Extension Host)');
        await channel.select();
        await driver.sleep(1000);

        await driver.wait(async () => {
            const text = await channel.getText();
            return text.includes('redhat.vscode-apache-camel');
        }, 30000, 'Extension activation logs were not found for redhat.vscode-apache-camel');

        const logText = await channel.getText();
        expect(logText).to.match(/Activating extension 'redhat\.vscode-apache-camel'.*onStartupFinished/i);
        expect(logText).to.include('onStartupFinished');
        expect(logText).to.match(/Extension 'redhat\.vscode-apache-camel'.*activated/i);
    });

    after(async () => {
        const cleanupBar = new BottomBarPanel();
        try {
            await cleanupBar.toggle(false);
        } catch (err) {
            // ignore cleanup errors
        }
    });
});