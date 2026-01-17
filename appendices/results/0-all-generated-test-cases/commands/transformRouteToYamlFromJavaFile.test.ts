import { VSBrowser, WebDriver, EditorView, ActivityBar, Workbench, InputBox, NotificationType, Notification, TreeSection, TreeItem, TextEditor } from 'vscode-extension-tester';
import { expect } from 'chai';
import { promises as fs } from 'fs';
import * as path from 'path';

const skippedDirectories = new Set(['.git', '.github', '.vscode', 'node_modules', 'target', 'build', 'out', 'bin', 'dist']);
let generatedYamlPath: string | undefined;

describe('commands - transformRouteToYamlFromJavaFile', () => {
    let driver: WebDriver;
    let workbench: Workbench;

    before(async function() {
        this.timeout(60000);
        driver = VSBrowser.instance.driver;
        workbench = new Workbench();
    });

    it("On a selected .java route file, runs 'Transform a Camel Route to YAML DSL' and verifies a YAML file is produced.", async function() {
        this.timeout(240000);

        const browserInstance: any = VSBrowser.instance;
        const workspacePath: string = browserInstance.workspacePath || browserInstance.getWorkspacePath?.() || process.env['EXTESTER_WORKSPACE'] || process.cwd();
        expect(workspacePath, 'Workspace path should be resolvable').to.be.a('string');
        expect(path.isAbsolute(workspacePath), 'Workspace path must be absolute').to.be.true;

        const javaRouteFile = await findCamelJavaRouteFile(workspacePath);
        expect(javaRouteFile, 'A Camel Java route file is required for this test').to.not.be.undefined;
        const javaFilePath = path.normalize(javaRouteFile!);
        const javaFileTitle = path.basename(javaFilePath);
        const workspaceName = path.basename(workspacePath);

        await new EditorView().closeAllEditors();

        const explorerControl = await new ActivityBar().getViewControl('Explorer');
        expect(explorerControl, 'Explorer view control should be available').to.not.be.undefined;
        const explorerView = await explorerControl!.openView();
        const explorerContent = explorerView.getContent();
        const workspaceSection = await explorerContent.getSection(workspaceName) as TreeSection;
        expect(workspaceSection, `Could not locate workspace section ${workspaceName}`).to.not.be.undefined;

        const relativeJavaPath = path.relative(workspacePath, javaFilePath);
        const pathSegments = relativeJavaPath.split(path.sep).filter(Boolean);
        const javaTreeItem = await workspaceSection.findItem(pathSegments) as TreeItem;
        expect(javaTreeItem, `Unable to find Java route file in explorer: ${relativeJavaPath}`).to.not.be.undefined;

        await javaTreeItem.select();
        await javaTreeItem.open();
        await sleep(1500);

        const editorView = new EditorView();
        const textEditor = await editorView.openEditor(javaFileTitle) as TextEditor;
        expect(await textEditor.getTitle(), 'Java route editor should be opened').to.equal(javaFileTitle);

        const yamlBaselineList = await collectAllYamlFiles(workspacePath);
        const yamlBaseline = new Set(yamlBaselineList.map((file) => path.normalize(file)));

        const commandInput = await workbench.openCommandPrompt();
        await commandInput.setText('Camel: Transform a Camel Route to YAML DSL');
        await sleep(800);
        try {
            await commandInput.selectQuickPick('Camel: Transform a Camel Route to YAML DSL');
        } catch {
            // Fallback to confirming if quick pick selection is not available
        }
        await commandInput.confirm();

        await sleep(1000);
        await handleFollowupInputBoxes();

        const newYaml = await waitForNewYamlFile(workspacePath, yamlBaseline, 90000);
        expect(newYaml, 'The transform command should create a new YAML file').to.not.be.undefined;
        generatedYamlPath = path.normalize(newYaml!);

        await sleep(2000);
        const openEditors = await editorView.getOpenEditorTitles();
        expect(openEditors, 'Generated YAML editor should be opened automatically').to.include(path.basename(generatedYamlPath));

        const yamlContent = await fs.readFile(generatedYamlPath, 'utf8');
        expect(yamlContent.trim().length, 'Generated YAML should contain content').to.be.greaterThan(0);
        expect(/route|from\s*:|steps\s*:/.test(yamlContent), 'YAML content should resemble a Camel route').to.be.true;

        const notificationCenter = await workbench.openNotificationsCenter();
        const notifications = await notificationCenter.getNotifications();
        const errorNotifications: string[] = [];
        for (const note of notifications as Notification[]) {
            const noteType = await note.getType();
            if (noteType === NotificationType.Error) {
                errorNotifications.push(await note.getMessage());
            }
        }
        expect(errorNotifications, `No error notifications expected during transform, but found: ${errorNotifications.join('; ')}`).to.be.empty;
        await notificationCenter.clearAllNotifications();
        await notificationCenter.close();
    });

    after(async () => {
        await new EditorView().closeAllEditors();
        if (generatedYamlPath) {
            await fs.unlink(generatedYamlPath).catch(() => undefined);
            generatedYamlPath = undefined;
        }
    });
});

async function findCamelJavaRouteFile(root: string): Promise<string | undefined> {
    try {
        const entries = await fs.readdir(root, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.isDirectory()) {
                if (skippedDirectories.has(entry.name)) {
                    continue;
                }
                const nested = await findCamelJavaRouteFile(path.join(root, entry.name));
                if (nested) {
                    return nested;
                }
            } else if (entry.isFile() && entry.name.endsWith('.java')) {
                const filePath = path.join(root, entry.name);
                try {
                    const content = await fs.readFile(filePath, 'utf8');
                    if (/RouteBuilder/.test(content) || /from\s*\(/.test(content)) {
                        return filePath;
                    }
                } catch {
                    // Ignore unreadable files
                }
            }
        }
    } catch {
        // Ignore directories that cannot be read
    }
    return undefined;
}

async function collectAllYamlFiles(root: string): Promise<string[]> {
    const result: string[] = [];
    await traverse(root);
    return result;

    async function traverse(current: string): Promise<void> {
        let entries: { name: string; isDirectory(): boolean; isFile(): boolean; }[];
        try {
            entries = await fs.readdir(current, { withFileTypes: true }) as unknown as { name: string; isDirectory(): boolean; isFile(): boolean; }[];
        } catch {
            return;
        }
        for (const entry of entries) {
            if (entry.isDirectory()) {
                if (skippedDirectories.has(entry.name)) {
                    continue;
                }
                await traverse(path.join(current, entry.name));
            } else if (entry.isFile()) {
                const lower = entry.name.toLowerCase();
                if (lower.endsWith('.yaml') || lower.endsWith('.yml')) {
                    result.push(path.normalize(path.join(current, entry.name)));
                }
            }
        }
    }
}

async function waitForNewYamlFile(root: string, baseline: Set<string>, timeout: number): Promise<string | undefined> {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
        const currentFiles = await collectAllYamlFiles(root);
        for (const file of currentFiles) {
            const normalized = path.normalize(file);
            if (!baseline.has(normalized)) {
                return normalized;
            }
        }
        await sleep(2000);
    }
    return undefined;
}

async function handleFollowupInputBoxes(): Promise<void> {
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            const input = await InputBox.create(2000);
            const quickPicks = await input.getQuickPicks();
            if (quickPicks.length > 0) {
                await quickPicks[0].select();
            }
            await input.confirm();
            await sleep(700);
        } catch {
            break;
        }
    }
}

function sleep(milliseconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
}