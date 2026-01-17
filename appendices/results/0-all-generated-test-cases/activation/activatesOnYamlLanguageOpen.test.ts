import * as fs from 'fs';
import * as path from 'path';
import { VSBrowser, WebDriver, EditorView, ActivityBar, Workbench, SideBarView, TextEditor } from 'vscode-extension-tester';
import { expect } from 'chai';
import { By, Key, until } from 'selenium-webdriver';

describe('activation - activatesOnYamlLanguageOpen', () => {
    let driver: WebDriver;
    let workbench: Workbench;
    let workspacePath: string;
    let activationDir: string;
    let yamlFilePath: string;
    let ymlFilePath: string;

    before(async function() {
        this.timeout(60000);
        driver = VSBrowser.instance.driver;
        workbench = new Workbench();
        workspacePath = process.env.CODE_TESTS_WORKSPACE || '';
        expect(workspacePath, 'CODE_TESTS_WORKSPACE environment variable must be defined').to.not.be.empty;

        activationDir = path.join(workspacePath, 'camel-activation');
        if (!fs.existsSync(activationDir)) {
            fs.mkdirSync(activationDir, { recursive: true });
        }

        yamlFilePath = path.join(activationDir, 'activation-probe.yaml');
        ymlFilePath = path.join(activationDir, 'activation-probe.yml');

        fs.writeFileSync(yamlFilePath, [
            'apiVersion: v1',
            'kind: ConfigMap',
            'metadata:',
            '  name: camel-activation-test',
            'data:',
            '  demo-key: yaml',
            ''
        ].join('\n'), { encoding: 'utf8' });

        fs.writeFileSync(ymlFilePath, [
            'apiVersion: v1',
            'kind: ConfigMap',
            'metadata:',
            '  name: camel-activation-test-yml',
            'data:',
            '  demo-key: yml',
            ''
        ].join('\n'), { encoding: 'utf8' });

        await VSBrowser.instance.waitForWorkbench();
    });

    it('Opens a YAML/YML file and confirms the extension activates.', async function() {
        this.timeout(90000);

        const editorView = new EditorView();

        const yamlEditor = await VSBrowser.instance.openResources('camel-activation', 'activation-probe.yaml');
        expect(await yamlEditor.getTitle()).to.equal('activation-probe.yaml');
        await driver.sleep(1000);

        const ymlEditor = await VSBrowser.instance.openResources('camel-activation', 'activation-probe.yml');
        expect(await ymlEditor.getTitle()).to.equal('activation-probe.yml');
        await driver.sleep(1000);

        await workbench.executeCommand('Extensions: Show Running Extensions');
        const extensionsControl = await new ActivityBar().getViewControl('Extensions');
        expect(extensionsControl).to.not.be.undefined;
        await extensionsControl!.openView();

        const sideBar = new SideBarView();
        await driver.wait(async () => {
            const title = await sideBar.getTitle();
            return title.toLowerCase().includes('extensions');
        }, 10000, 'Extensions view did not become active');

        const searchBoxInput = await driver.wait(
            until.elementLocated(By.css('.extensions-viewlet .search-box .monaco-inputbox input')),
            10000
        );
        const queryValue = await searchBoxInput.getAttribute('value');
        expect(queryValue).to.contain('@running');

        const camelRowLocator = By.css('.extensions-viewlet .monaco-list-row[data-extension-id="redhat.vscode-apache-camel"]');
        const camelRow = await driver.wait(
            until.elementLocated(camelRowLocator),
            20000,
            'Camel extension not listed among running extensions'
        );
        await driver.wait(until.elementIsVisible(camelRow), 5000);
        await driver.executeScript('arguments[0].scrollIntoView({block:"center"});', camelRow);

        const extensionId = await camelRow.getAttribute('data-extension-id');
        expect(extensionId).to.equal('redhat.vscode-apache-camel');

        const camelRowText = (await camelRow.getText()).toLowerCase();
        expect(camelRowText).to.contain('apache camel');
        expect(camelRowText).to.contain('red hat');

        await editorView.closeEditor(await yamlEditor.getTitle()).catch(() => undefined);
        await editorView.closeEditor(await ymlEditor.getTitle()).catch(() => undefined);
    });

    after(async () => {
        try {
            await new EditorView().closeAllEditors();
        } catch (err) {
            // ignore cleanup errors
        }

        if (activationDir && fs.existsSync(activationDir)) {
            fs.rmSync(activationDir, { recursive: true, force: true });
        }
    });
});