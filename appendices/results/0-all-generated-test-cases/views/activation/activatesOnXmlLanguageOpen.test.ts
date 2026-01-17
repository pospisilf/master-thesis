import { VSBrowser, WebDriver, EditorView, ActivityBar, Workbench, SideBarView, TreeItem, TextEditor } from 'vscode-extension-tester';
import { expect } from 'chai';
import { By, until } from 'selenium-webdriver';
import { promises as fs } from 'fs';
import * as path from 'path';

describe('activation - activatesOnXmlLanguageOpen', () => {
    let driver: WebDriver;
    let workbench: Workbench;
    let xmlFilePath: string;
    let workspacePath: string;

    before(async function() {
        this.timeout(60000);
        driver = VSBrowser.instance.driver;
        workbench = new Workbench();

        workspacePath = VSBrowser.instance.getWorkspacePath();
        xmlFilePath = path.join(workspacePath, 'camel-activation.xml');
        await fs.writeFile(xmlFilePath, '<camel id="activation"/>\n', { encoding: 'utf8' });
    });

    it('Opens an XML file and confirms the extension activates.', async function() {
        this.timeout(60000);

        const explorerControl = await new ActivityBar().getViewControl('Explorer');
        if (explorerControl) {
            await explorerControl.openView();
        }
        const sideBar = new SideBarView();
        const content = sideBar.getContent();
        const sections = await content.getSections();

        let fileItem: TreeItem | undefined;
        for (const section of sections) {
            await section.expand();
            try {
                const candidate = await section.findItem('camel-activation.xml');
                if (candidate) {
                    fileItem = candidate;
                    break;
                }
            } catch (err) {
                continue;
            }
        }

        expect(fileItem).to.not.equal(undefined, 'Expected camel-activation.xml to be present in the explorer');
        await fileItem!.select();
        await fileItem!.open();

        const editorView = new EditorView();
        const editor = await editorView.openEditor('camel-activation.xml') as TextEditor;
        expect(editor).to.not.equal(undefined, 'XML editor failed to open');

        await driver.sleep(1000);
        const languageId = await driver.executeScript<string | null>(`
            const monaco = (window as any).monaco;
            if (!monaco || !monaco.editor) { return null; }
            const models = monaco.editor.getModels();
            if (!models || models.length === 0) { return null; }
            const match = models.find(m => m.uri.path.endsWith('/camel-activation.xml'));
            return match ? match.getLanguageId() : models[models.length - 1].getLanguageId();
        `);
        expect(languageId).to.equal('xml', 'The opened file was not detected as XML');

        const commandPrompt = await workbench.openCommandPrompt();
        await commandPrompt.setText('>Developer: Show Running Extensions');
        await driver.sleep(1000);
        await commandPrompt.select(0);

        const runningRow = await driver.wait(
            until.elementLocated(By.css('.monaco-list-row[aria-label*="redhat.vscode-apache-camel"]')),
            15000
        );
        const ariaLabel = (await runningRow.getAttribute('aria-label')).toLowerCase();
        expect(ariaLabel).to.contain('redhat.vscode-apache-camel', 'Running extensions view did not list the Camel extension');
        expect(
            ariaLabel.includes('active') || ariaLabel.includes('activated'),
            'Camel extension entry did not indicate an active state'
        ).to.be.true;
    });

    after(async () => {
        const editorView = new EditorView();
        await editorView.closeAllEditors();
        await fs.unlink(xmlFilePath).catch(() => undefined);
    });
});