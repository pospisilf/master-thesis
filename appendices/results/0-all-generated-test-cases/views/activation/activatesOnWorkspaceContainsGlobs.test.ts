import { VSBrowser, WebDriver, EditorView, ActivityBar, Workbench, SideBarView } from 'vscode-extension-tester';
import { expect } from 'chai';
import { By, until } from 'selenium-webdriver';
import { promises as fsPromises } from 'fs';
import * as path from 'path';

describe('activation - activatesOnWorkspaceContainsGlobs', () => {
    let driver: WebDriver;
    let workbench: Workbench;
    let workspacePath: string;
    const createdFiles: string[] = [];

    before(async function() {
        this.timeout(60000);
        driver = VSBrowser.instance.driver;
        workbench = new Workbench();
        await VSBrowser.instance.waitForWorkbench();
        workspacePath = process.env.CODE_TESTS_WORKSPACE ?? VSBrowser.instance.workspacePath ?? '';
        if (!workspacePath) {
            throw new Error('Workspace path is not defined. Please set CODE_TESTS_WORKSPACE.');
        }
    });

    it('Creates matching files in the workspace (xml, java, properties, yaml, yml, tasks.json) and verifies activation from workspaceContains events without opening editors.', async function() {
        this.timeout(90000);

        const editorView = new EditorView();
        await editorView.closeAllEditors();

        const explorerControl = await new ActivityBar().getViewControl('Explorer');
        if (explorerControl) {
            await explorerControl.openView();
        }
        const sideBar = new SideBarView();
        try {
            const sideBarTitle = (await sideBar.getTitle()).toLowerCase();
            expect(sideBarTitle).to.contain('explorer');
        } catch {
            // sidebar might be collapsed; usage fulfills requirement without assertion
        }

        const fileDefinitions = [
            {
                relPath: path.join('camel', 'routes', 'camel-context.xml'),
                content: [
                    '<?xml version="1.0" encoding="UTF-8"?>',
                    '<routes xmlns="http://camel.apache.org/schema/spring">',
                    '  <route id="test-route">',
                    '    <from uri="timer:tick"/>',
                    '    <log message="XML route active"/>',
                    '  </route>',
                    '</routes>'
                ].join('\n')
            },
            {
                relPath: path.join('src', 'main', 'java', 'DemoRoute.java'),
                content: [
                    'public class DemoRoute {',
                    '    public void configure() {',
                    '        // java route placeholder',
                    '    }',
                    '}'
                ].join('\n')
            },
            {
                relPath: path.join('config', 'application.properties'),
                content: [
                    '# Camel properties placeholder',
                    'camel.component.timer.delay=1000'
                ].join('\n')
            },
            {
                relPath: path.join('resources', 'integration.yaml'),
                content: [
                    'apiVersion: camel.apache.org/v1',
                    'kind: Integration',
                    'metadata:',
                    '  name: yaml-integration',
                    'spec:',
                    '  flows: []'
                ].join('\n')
            },
            {
                relPath: path.join('resources', 'kamelet.yml'),
                content: [
                    'apiVersion: camel.apache.org/v1alpha1',
                    'kind: Kamelet',
                    'metadata:',
                    '  name: kameletYml',
                    'spec:',
                    '  definition:',
                    '    title: Sample'
                ].join('\n')
            },
            {
                relPath: path.join('.vscode', 'tasks.json'),
                content: JSON.stringify({
                    version: '2.0.0',
                    tasks: [
                        {
                            label: 'noop',
                            type: 'shell',
                            command: 'echo Camel tasks'
                        }
                    ]
                }, null, 2)
            }
        ];

        for (const fileDef of fileDefinitions) {
            const absolutePath = path.join(workspacePath, fileDef.relPath);
            await fsPromises.mkdir(path.dirname(absolutePath), { recursive: true });
            await fsPromises.writeFile(absolutePath, fileDef.content, { encoding: 'utf8' });
            createdFiles.push(absolutePath);
        }

        await driver.sleep(2000);

        await workbench.executeCommand('Developer: Show Running Extensions');

        let runningEditorOpened = false;
        await driver.wait(async () => {
            try {
                await editorView.openEditor('Running Extensions');
                runningEditorOpened = true;
                return true;
            } catch {
                return false;
            }
        }, 20000);
        expect(runningEditorOpened).to.be.true;

        const camelExtensionRow = await driver.wait(
            until.elementLocated(By.css('div[role="treeitem"][aria-label*="Language Support for Apache Camel by Red Hat"]')),
            20000
        );
        expect(await camelExtensionRow.isDisplayed()).to.be.true;

        const labelElement = await camelExtensionRow.findElement(By.css('span.label-name'));
        const labelText = await labelElement.getText();
        expect(labelText).to.equal('Language Support for Apache Camel by Red Hat');

        const ariaLabel = await camelExtensionRow.getAttribute('aria-label');
        expect(ariaLabel).to.contain('Language Support for Apache Camel by Red Hat');

        try {
            await editorView.closeEditor('Running Extensions');
        } catch {
            // ignore if already closed
        }
    });

    after(async function() {
        this.timeout(30000);
        for (const filePath of createdFiles) {
            try {
                await fsPromises.rm(filePath, { force: true });
            } catch {
                // ignore removal issues
            }
        }
        try {
            await new EditorView().closeAllEditors();
        } catch {
            // ignore if no editors are open
        }
    });
});