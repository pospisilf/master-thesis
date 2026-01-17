import { VSBrowser, WebDriver, Workbench, InputBox, EditorView } from 'vscode-extension-tester';
import { expect } from 'chai';
import * as path from 'path';
import * as fs from 'fs-extra';

describe('commands - transformRoutesInFolderToXml', () => {
    let driver: WebDriver;
    let workbench: Workbench;
    let routesFolderPath = '';
    const folderName = 'camel-transform-folder';
    const javaFileName = 'SampleJavaRoute.java';
    const yamlFileName = 'sample-yaml-route.yaml';
    const expectedBases = ['SampleJavaRoute', 'sample-yaml-route'];

    before(async function() {
        this.timeout(60000);
        driver = VSBrowser.instance.driver;
        workbench = new Workbench();

        const workspace = process.env.CODE_TESTS_WORKSPACE;
        if (!workspace) {
            throw new Error('CODE_TESTS_WORKSPACE environment variable is not defined.');
        }
        routesFolderPath = path.join(workspace, folderName);
        await fs.remove(routesFolderPath);
        await fs.ensureDir(routesFolderPath);

        const javaSource = `import org.apache.camel.builder.RouteBuilder;

public class SampleJavaRoute extends RouteBuilder {
    @Override
    public void configure() throws Exception {
        from("direct:java").log("From Java");
    }
}
`;
        const yamlSource = `- from:
    uri: "direct:yaml"
    steps:
      - log: "From YAML"
`;
        await fs.writeFile(path.join(routesFolderPath, javaFileName), javaSource, 'utf8');
        await fs.writeFile(path.join(routesFolderPath, yamlFileName), yamlSource, 'utf8');

        await new EditorView().closeAllEditors();
    });

    it('Runs Transform any Camel Route in a specified folder to XML DSL and verifies XML files are created for each supported route source in the folder.', async function() {
        this.timeout(180000);

        const initialXmlFiles = (await fs.readdir(routesFolderPath)).filter((name) => name.toLowerCase().endsWith('.xml'));

        await workbench.executeCommand('Camel: Transform any Camel Route in a specified folder to XML DSL');

        const folderSelection = await InputBox.create();
        let quickPickHandled = false;
        try {
            await folderSelection.selectQuickPick(folderName);
            quickPickHandled = true;
        } catch (err) {
            quickPickHandled = false;
        }
        if (!quickPickHandled) {
            const folderPathForInput = process.platform === 'win32' ? routesFolderPath.replace(/\\/g, '\\\\') : routesFolderPath;
            await folderSelection.setText(folderPathForInput);
        }
        await folderSelection.confirm();

        for (let attempt = 0; attempt < 2; attempt++) {
            await driver.sleep(500);
            let subsequentPrompt: InputBox | undefined;
            try {
                subsequentPrompt = await InputBox.create(2000);
            } catch (error) {
                subsequentPrompt = undefined;
            }
            if (!subsequentPrompt) {
                break;
            }
            try {
                await subsequentPrompt.selectQuickPick(folderName);
            } catch (err) {
                const folderPathForInput = process.platform === 'win32' ? routesFolderPath.replace(/\\/g, '\\\\') : routesFolderPath;
                await subsequentPrompt.setText(folderPathForInput);
            }
            await subsequentPrompt.confirm();
        }

        const expectedXmlCount = initialXmlFiles.length + expectedBases.length;
        await driver.wait(async () => {
            const currentFiles = await fs.readdir(routesFolderPath);
            const xmlFiles = currentFiles.filter((name) => name.toLowerCase().endsWith('.xml'));
            return xmlFiles.length >= expectedXmlCount;
        }, 120000, 'XML transformation did not produce the expected number of files.');

        const resultingFiles = await fs.readdir(routesFolderPath);
        const xmlResults = resultingFiles.filter((name) => name.toLowerCase().endsWith('.xml'));
        const newXmlFiles = xmlResults.filter((name) => !initialXmlFiles.includes(name));

        expect(newXmlFiles.length).to.be.at.least(expectedBases.length);

        for (const baseName of expectedBases) {
            const matching = xmlResults.find((name) => name.toLowerCase().includes(baseName.toLowerCase()));
            expect(matching, `Expected XML output for ${baseName}`).to.not.be.undefined;
            if (matching) {
                const xmlContent = await fs.readFile(path.join(routesFolderPath, matching), 'utf8');
                expect(xmlContent.toLowerCase()).to.include('<route');
                expect(xmlContent.toLowerCase()).to.include('direct:');
            }
        }

        await new EditorView().closeAllEditors();
    });

    after(async () => {
        try {
            await new EditorView().closeAllEditors();
        } catch (err) {
            // ignore
        }
        if (routesFolderPath) {
            await fs.remove(routesFolderPath);
        }
    });
});