import { VSBrowser, WebDriver, EditorView, Workbench, QuickOpenBox, QuickPickItem, InputBox, TextEditor } from 'vscode-extension-tester';
import { expect } from 'chai';

describe('commands - transformRouteCommandsPaletteVisibilityDependsOnActiveEditor', () => {
    let driver: WebDriver;
    let workbench: Workbench;

    before(async function() {
        this.timeout(30000);
        driver = VSBrowser.instance.driver;
        workbench = new Workbench();
        await driver.sleep(1500);
    });

    it('Opens different file types and verifies transform commands appear in the Command Palette only when the active editor filename matches allowed extensions.', async function() {
        this.timeout(120000);

        const commandYaml = 'Camel: Transform a Camel Route to YAML DSL';
        const commandXml = 'Camel: Transform a Camel Route to XML DSL';
        const suffix = Date.now();
        const plainFile = `transform-command-plain-${suffix}.txt`;
        const javaFile = `transform-command-route-${suffix}.java`;
        const xmlFile = `transform-command-route-${suffix}.xml`;
        const yamlFile = `transform-command-route-${suffix}.yaml`;

        const runCommandFromPalette = async (label: string): Promise<void> => {
            const quickOpen: QuickOpenBox = await workbench.openCommandPrompt();
            await quickOpen.setText(`>${label}`);
            await driver.sleep(600);
            const picks: QuickPickItem[] = await quickOpen.getQuickPicks();
            for (const pick of picks) {
                const pickLabel = (await pick.getLabel()).trim();
                if (pickLabel === label) {
                    await pick.select();
                    await driver.sleep(600);
                    return;
                }
            }
            await quickOpen.cancel();
            throw new Error(`Quick pick with label "${label}" not found`);
        };

        const createFileWithContent = async (fileName: string, content: string): Promise<void> => {
            await runCommandFromPalette('File: New File');
            await driver.sleep(500);
            const editor = new TextEditor();
            await editor.setText(content);
            await runCommandFromPalette('File: Save As...');
            const saveInput = await InputBox.create();
            await saveInput.setText(fileName);
            await saveInput.confirm();
            await driver.sleep(800);
            await new EditorView().openEditor(fileName);
            await driver.sleep(400);
        };

        const isCommandVisible = async (commandLabel: string): Promise<boolean> => {
            const quickOpen: QuickOpenBox = await workbench.openCommandPrompt();
            await quickOpen.setText(`>${commandLabel}`);
            await driver.sleep(900);
            const picks: QuickPickItem[] = await quickOpen.getQuickPicks();
            let found = false;
            for (const pick of picks) {
                const label = (await pick.getLabel()).trim();
                if (label === commandLabel) {
                    found = true;
                    break;
                }
            }
            await quickOpen.cancel();
            return found;
        };

        await createFileWithContent(plainFile, 'Plain text content for command visibility validation.');
        expect(await isCommandVisible(commandYaml)).to.be.false;
        expect(await isCommandVisible(commandXml)).to.be.false;

        await createFileWithContent(javaFile, `// Sample Camel Route Java file
import org.apache.camel.builder.RouteBuilder;
public class SampleRoute extends RouteBuilder {
    @Override
    public void configure() {
        from("timer:tick").to("log:info");
    }
}`);
        expect(await isCommandVisible(commandYaml)).to.be.true;
        expect(await isCommandVisible(commandXml)).to.be.true;

        await new EditorView().openEditor(plainFile);
        await driver.sleep(500);
        expect(await isCommandVisible(commandYaml)).to.be.false;
        expect(await isCommandVisible(commandXml)).to.be.false;

        await createFileWithContent(xmlFile, `<routes xmlns="http://camel.apache.org/schema/spring">
    <route id="xmlRoute">
        <from uri="direct:start"/>
        <to uri="log:xml"/>
    </route>
</routes>`);
        expect(await isCommandVisible(commandYaml)).to.be.true;
        expect(await isCommandVisible(commandXml)).to.be.true;

        await new EditorView().openEditor(plainFile);
        await driver.sleep(500);
        expect(await isCommandVisible(commandYaml)).to.be.false;
        expect(await isCommandVisible(commandXml)).to.be.false;

        await createFileWithContent(yamlFile, `- route:
    id: yamlRoute
    from:
      uri: direct:start
    steps:
      - to: log:yaml`);
        expect(await isCommandVisible(commandYaml)).to.be.true;
        expect(await isCommandVisible(commandXml)).to.be.true;

        await new EditorView().openEditor(plainFile);
        await driver.sleep(500);
        expect(await isCommandVisible(commandYaml)).to.be.false;
        expect(await isCommandVisible(commandXml)).to.be.false;
    });

    after(async () => {
        const editorView = new EditorView();
        await editorView.closeAllEditors();
    });
});