import { VSBrowser, WebDriver, EditorView, Workbench, ActivityBar, ExtensionsViewSection, ExtensionsViewItem, By } from 'vscode-extension-tester';
import { expect } from 'chai';
import * as pjson from '../../../package.json';

describe('activation - activatesOnJsonLanguageOpen', () => {
    let driver: WebDriver;
    let workbench: Workbench;

    before(async function() {
        this.timeout(60000);
        driver = VSBrowser.instance.driver;
        workbench = new Workbench();
    });

    it('Opens a JSON file and confirms the extension activates.', async function() {
        this.timeout(90000);

        await workbench.executeCommand('Preferences: Open Settings (JSON)');
        await driver.sleep(2000);
        
        const extensionsView = await (await new ActivityBar().getViewControl('Extensions'))?.openView();
        const marketplace = (await extensionsView?.getContent().getSection('Installed')) as ExtensionsViewSection;
        const item = (await marketplace.findItem(`@installed ${pjson.displayName}`)) as ExtensionsViewItem;
        const activationTime = await item.findElement(By.className('activationTime'));

        expect(activationTime).to.not.be.undefined;
    });

    after(async () => {
        const editorView = new EditorView();
        await editorView.closeAllEditors();
    });
});
