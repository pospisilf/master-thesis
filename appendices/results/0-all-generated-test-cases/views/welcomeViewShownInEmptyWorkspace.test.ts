import { VSBrowser, WebDriver, EditorView, ActivityBar, Workbench, SideBarView } from 'vscode-extension-tester';
import { By, until } from 'selenium-webdriver';
import { expect } from 'chai';

describe('views - welcomeViewShownInEmptyWorkspace', () => {
    let driver: WebDriver;
    let workbench: Workbench;

    before(async function() {
        this.timeout(30000);
        driver = VSBrowser.instance.driver;
        workbench = new Workbench();
    });

    it('Opens an empty window and verifies the welcome view content and links are displayed.', async function() {
        this.timeout(40000);

        await new EditorView().closeAllEditors();

        const explorerControl = await new ActivityBar().getViewControl('Explorer');
        expect(explorerControl).to.not.be.undefined;
        await explorerControl!.openView();

        const sideBar = new SideBarView();
        await sideBar.getContent();

        const welcomeContainer = await driver.wait(
            until.elementLocated(By.css('#workbench\\.view\\.explorer .welcome-view-content')),
            20000,
            'Explorer welcome view content not found'
        );
        await driver.wait(until.elementIsVisible(welcomeContainer), 5000);

        const welcomeText = await welcomeContainer.getText();
        expect(welcomeText).to.contain('Create a new Camel project using the button below.');
        expect(welcomeText).to.contain('Learn more about Language Support for Apache Camel by Red Hat');

        const projectLink = await welcomeContainer.findElement(By.css('a[href="command:camel.jbang.project.new"]'));
        expect(await projectLink.getText()).to.contain('Create a Camel project');
        expect(await projectLink.getAttribute('href')).to.equal('command:camel.jbang.project.new');

        const documentationLink = await welcomeContainer.findElement(By.css('a[href="https://camel-tooling.github.io/camel-lsp-client-vscode/"]'));
        expect((await documentationLink.getText()).toLowerCase()).to.contain('documentation');
        expect(await documentationLink.getAttribute('href')).to.equal('https://camel-tooling.github.io/camel-lsp-client-vscode/');
    });

    after(async () => {
        await new EditorView().closeAllEditors();
    });
});