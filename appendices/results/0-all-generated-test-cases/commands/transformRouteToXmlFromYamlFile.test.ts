import { VSBrowser, WebDriver, EditorView, Workbench, TextEditor, QuickOpenBox } from 'vscode-extension-tester';
import { expect } from 'chai';
import * as path from 'path';
import { promises as fsPromises } from 'fs';

describe('commands - transformRouteToXmlFromYamlFile', () => {
    let driver: WebDriver;
    let workbench: Workbench;
    const createdFiles: string[] = [];

    before(async function() {
        this.timeout(30000);
        driver = VSBrowser.instance.driver;
        workbench = new Workbench();
    });

    it("On a selected .yaml route file, runs 'Transform a Camel Route to XML DSL' and verifies an XML file is produced.", async function() {
        this.timeout(180000);

        const workspacePath = process.env.CODE_TESTS_WORKSPACE;
        expect(workspacePath, 'CODE_TESTS_WORKSPACE environment variable must be defined').to.be.a('string').and.not.empty;

        const yamlFileName = 'transform-route-to-xml.yaml';
        const xmlFileName = 'transform-route-to-xml.xml';
        const yamlFilePath = path.join(workspacePath!, yamlFileName);
        const xmlFilePath = path.join(workspacePath!, xmlFileName);

        createdFiles.push(yamlFilePath, xmlFilePath);

        try {
            await fsPromises.unlink(xmlFilePath);
        } catch (_) {
            // ignore if file does not exist
        }

        const yamlRouteContent = `- route:
    id: yaml-to-xml
    from:
      uri: "direct:start"
      steps:
        - log:
            message: "Hello from YAML"
`;

        await fsPromises.writeFile(yamlFilePath, yamlRouteContent, 'utf8');

        await VSBrowser.instance.openResources([yamlFileName]);
        const editor = new TextEditor();
        expect(await editor.getTitle()).to.equal(yamlFileName);
        expect((await editor.getText()).includes('yaml-to-xml')).to.be.true;

        const commandPrompt = await workbench.openCommandPrompt() as QuickOpenBox;
        await commandPrompt.setText('Transform a Camel Route to XML DSL');
        await driver.sleep(500);
        const quickPicks = await commandPrompt.getQuickPicks();
        const labels = await Promise.all(quickPicks.map(pick => pick.getLabel()));
        expect(labels).to.include('Camel: Transform a Camel Route to XML DSL');

        await commandPrompt.selectQuickPick('Camel: Transform a Camel Route to XML DSL');

        let xmlExists = false;
        for (let attempt = 0; attempt < 90; attempt++) {
            try {
                await fsPromises.stat(xmlFilePath);
                xmlExists = true;
                break;
            } catch {
                await driver.sleep(1000);
            }
        }

        expect(xmlExists, 'Expected transformed XML file to be created').to.be.true;

        const xmlContent = await fsPromises.readFile(xmlFilePath, 'utf8');
        expect(xmlContent).to.contain('<route');
        expect(xmlContent).to.contain('id="yaml-to-xml"');

        await VSBrowser.instance.openResources([xmlFileName]);
        const xmlEditor = new TextEditor();
        expect(await xmlEditor.getTitle()).to.equal(xmlFileName);

        await new EditorView().closeAllEditors();
    });

    after(async () => {
        await new EditorView().closeAllEditors();
        for (const filePath of createdFiles) {
            try {
                await fsPromises.unlink(filePath);
            } catch {
                // ignore missing files
            }
        }
    });
});