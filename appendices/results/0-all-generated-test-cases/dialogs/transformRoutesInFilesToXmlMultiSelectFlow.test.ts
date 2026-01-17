import { VSBrowser, WebDriver, EditorView, ActivityBar, Workbench, SideBarView, TreeSection, InputBox, QuickPickItem, TextEditor, NotificationType, NotificationCenter } from 'vscode-extension-tester';
import { expect } from 'chai';
import * as fs from 'fs';
import * as path from 'path';

describe('dialogs - transformRoutesInFilesToXmlMultiSelectFlow', () => {
    let driver: WebDriver;
    let workbench: Workbench;
    let workspaceRootPath: string | undefined;

    const determineWorkspaceRoot = async (): Promise<string> => {
        const explorerControl = await new ActivityBar().getViewControl('Explorer');
        const sideBar: SideBarView = await explorerControl.openView();
        const sections = await sideBar.getContent().getSections();
        let workspaceSection: TreeSection | undefined;

        for (const section of sections) {
            const title = await section.getTitle();
            if (!/open editors/i.test(title)) {
                workspaceSection = section as TreeSection;
                break;
            }
        }
        expect(workspaceSection, 'Workspace section not found in Explorer').to.not.be.undefined;

        const rootItems = await workspaceSection!.getVisibleItems();
        expect(rootItems.length, 'Workspace root item not visible').to.be.greaterThan(0);

        const rootItem = rootItems[0];
        let resourceUri = await rootItem.getAttribute('data-resource-uri');
        if (!resourceUri || resourceUri.trim().length === 0) {
            resourceUri = await rootItem.getTooltip();
        }
        expect(resourceUri, 'Unable to determine workspace URI').to.be.a('string');

        let fsPath = resourceUri!.trim();
        if (fsPath.startsWith('file://')) {
            fsPath = fsPath.replace('file://', '');
            if (process.platform === 'win32' && fsPath.startsWith('/')) {
                fsPath = fsPath.substring(1);
            }
            fsPath = decodeURIComponent(fsPath);
        } else {
            const match = fsPath.match(/([A-Za-z]:\\.*|\/.*)/);
            if (match) {
                fsPath = match[0];
            }
        }
        expect(fs.existsSync(fsPath), `Workspace path does not exist: ${fsPath}`).to.be.true;
        return fsPath;
    };

    const ensureRouteFile = async (relativePath: string, content: string) => {
        await workbench.executeCommand('Explorer: New File');
        const input = await InputBox.create();
        await input.setText(relativePath);
        await input.confirm();

        await driver.sleep(500);
        const editor = new TextEditor();
        await editor.setText(content);
        await editor.save();
        await editor.close();
        await new EditorView().closeEditor(path.basename(relativePath));
    };

    before(async function() {
        this.timeout(30000);
        driver = VSBrowser.instance.driver;
        workbench = new Workbench();
    });

    it("Invokes 'Transform Camel Routes in multiple files to XML DSL', ensures a multi-file selection flow appears, and verifies XML outputs are created.", async function() {
        this.timeout(180000);

        workspaceRootPath = await determineWorkspaceRoot();
        const routesFolder = path.join(workspaceRootPath, 'routes');
        if (fs.existsSync(routesFolder)) {
            for (const entry of fs.readdirSync(routesFolder)) {
                if (entry.startsWith('sourceOne') || entry.startsWith('sourceTwo')) {
                    fs.rmSync(path.join(routesFolder, entry), { recursive: true, force: true });
                }
            }
        }

        const routeOneContent = [
            '- from:',
            '    uri: "timer:sourceOne?period=1s"',
            '    steps:',
            '      - set-body:',
            '          constant: "Payload from sourceOne"',
            '      - to: "log:sourceOne"'
        ].join('\n');

        const routeTwoContent = [
            '- from:',
            '    uri: "timer:sourceTwo?period=1s"',
            '    steps:',
            '      - set-body:',
            '          constant: "Payload from sourceTwo"',
            '      - to: "log:sourceTwo"'
        ].join('\n');

        await ensureRouteFile('routes/sourceOne.yaml', routeOneContent);
        await ensureRouteFile('routes/sourceTwo.yaml', routeTwoContent);

        await new EditorView().closeAllEditors();

        await workbench.executeCommand('Transform Camel Routes in multiple files to XML DSL');

        const selectionQuickPick = await InputBox.create();
        await driver.wait(async () => {
            const picks = await selectionQuickPick.getQuickPicks();
            return picks.length >= 2;
        }, 10000, 'Expected at least two files listed for selection');

        const quickPicks = await selectionQuickPick.getQuickPicks();
        const selectedItems: QuickPickItem[] = [];
        for (const pick of quickPicks) {
            const label = await pick.getLabel();
            if (label.includes('sourceOne.yaml') || label.includes('sourceTwo.yaml')) {
                await pick.click();
                selectedItems.push(pick);
                await selectionQuickPick.getQuickPicks();
            }
        }
        expect(selectedItems.length).to.equal(2, 'Both YAML files should be selected for transformation');

        for (const selected of selectedItems) {
            const aria = await selected.getElement().getAttribute('aria-selected');
            expect(aria).to.equal('true', 'Selected quick pick item should remain selected in multi-select mode');
        }

        await selectionQuickPick.confirm();

        try {
            const followUp = await InputBox.create(2000);
            const followUpItems = await followUp.getQuickPicks();
            if (followUpItems.length > 0) {
                await followUpItems[0].click();
            }
            await followUp.confirm();
        } catch (err) {
            // No follow-up input appeared; proceed
        }

        let notificationAcknowledged = false;
        const notificationCenter: NotificationCenter = await workbench.openNotificationsCenter();
        const notifications = await notificationCenter.getNotifications(NotificationType.Any);
        for (const notification of notifications) {
            const message = (await notification.getMessage()).toLowerCase();
            if (message.includes('transform') && message.includes('xml')) {
                notificationAcknowledged = true;
            }
            await notification.dismiss();
        }
        await notificationCenter.close();

        expect(notificationAcknowledged, 'Expected a notification indicating transformation completion').to.be.true;

        expect(fs.existsSync(routesFolder)).to.be.true;
        const producedFiles = fs.readdirSync(routesFolder).filter(name => name.endsWith('.xml'));
        expect(producedFiles.some(name => name.includes('sourceOne'))).to.be.true;
        expect(producedFiles.some(name => name.includes('sourceTwo'))).to.be.true;

        for (const file of producedFiles) {
            if (file.includes('sourceOne') || file.includes('sourceTwo')) {
                const xmlContent = fs.readFileSync(path.join(routesFolder, file), 'utf8');
                expect(xmlContent.toLowerCase()).to.contain('<routes', `Expected XML content in ${file}`);
            }
        }
    });

    after(async () => {
        await new EditorView().closeAllEditors();
        if (workspaceRootPath) {
            const routesFolder = path.join(workspaceRootPath, 'routes');
            if (fs.existsSync(routesFolder)) {
                for (const entry of ['sourceOne.yaml', 'sourceTwo.yaml', 'sourceOne.xml', 'sourceTwo.xml', 'sourceOne.camel.xml', 'sourceTwo.camel.xml']) {
                    const candidate = path.join(routesFolder, entry);
                    if (fs.existsSync(candidate)) {
                        fs.rmSync(candidate, { force: true, recursive: true });
                    }
                }
            }
        }
    });
});