import { VSBrowser, WebDriver, Workbench, EditorView, InputBox, TextEditor } from 'vscode-extension-tester';
import { expect } from 'chai';
import * as fs from 'fs';
import * as path from 'path';

describe('dialogs - createRouteFromOpenApiYamlPromptsAndCreates', () => {
    let driver: WebDriver;
    let workbench: Workbench;
    let workspacePath: string;
    let openApiSpecPath: string;

    const collectYamlFiles = (dir: string): string[] => {
        if (!fs.existsSync(dir)) {
            return [];
        }
        const results: string[] = [];
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                results.push(...collectYamlFiles(fullPath));
            } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.yaml')) {
                results.push(fullPath);
            }
        }
        return results;
    };

    before(async function() {
        this.timeout(60000);
        driver = VSBrowser.instance.driver;
        workbench = new Workbench();

        const browserAny = VSBrowser.instance as any;
        workspacePath =
            process.env['CAMEL_TEST_WORKSPACE'] ||
            process.env['CODE_TESTS_WORKSPACE'] ||
            browserAny.workspacePath ||
            (browserAny.options ? browserAny.options.workspacePath : undefined) ||
            path.resolve(process.cwd(), 'test-workspace');

        if (!fs.existsSync(workspacePath)) {
            fs.mkdirSync(workspacePath, { recursive: true });
        }

        openApiSpecPath = path.join(workspacePath, 'petstore-openapi.yaml');
        if (!fs.existsSync(openApiSpecPath)) {
            const openApiContent = [
                'openapi: 3.0.0',
                'info:',
                '  title: Sample Petstore',
                "  version: '1.0.0'",
                'paths:',
                '  /pets:',
                '    get:',
                '      operationId: listPets',
                '      responses:',
                "        '200':",
                '          description: A paged array of pets',
                'components:',
                '  schemas:',
                '    Pet:',
                '      type: object',
                '      properties:',
                '        id:',
                '          type: integer',
                '        name:',
                '          type: string'
            ].join('\n');
            fs.writeFileSync(openApiSpecPath, openApiContent, { encoding: 'utf8' });
        }

        await new EditorView().closeAllEditors();
        await driver.sleep(1000);
    });

    it("Invokes 'Create a Camel route from OpenAPI using YAML DSL', ensures a file selection/input prompt appears for the OpenAPI spec, and verifies a YAML route is generated.", async function() {
        this.timeout(120000);

        const initialYamlFiles = collectYamlFiles(workspacePath);

        await workbench.executeCommand('Camel: Create a Camel route from OpenAPI using YAML DSL');

        const openApiPrompt = await InputBox.create();
        const placeholderText = ((await openApiPrompt.getPlaceHolder()) || '').toLowerCase();
        const messageText = ((await openApiPrompt.getMessage()) || '').toLowerCase();
        expect(`${placeholderText} ${messageText}`.trim()).to.contain('openapi');
        await openApiPrompt.setText(openApiSpecPath);
        await openApiPrompt.confirm();

        try {
            await driver.wait(async () => !(await openApiPrompt.isDisplayed()), 5000);
        } catch (err) {
            // ignore if input box already disposed
        }

        let explicitRouteFilePath: string | undefined;
        await driver.sleep(500);
        try {
            const routePrompt = await InputBox.create(4000);
            const placeholder2 = ((await routePrompt.getPlaceHolder()) || '').toLowerCase();
            const message2 = ((await routePrompt.getMessage()) || '').toLowerCase();
            expect(`${placeholder2} ${message2}`.trim()).to.satisfy((text: string) =>
                text.includes('name') || text.includes('file') || text.includes('route') || text.includes('target')
            );
            const routeFileName = 'generated-openapi-route.yaml';
            explicitRouteFilePath = path.join(workspacePath, routeFileName);
            await routePrompt.setText(routeFileName);
            await routePrompt.confirm();
            try {
                await driver.wait(async () => !(await routePrompt.isDisplayed()), 5000);
            } catch (err) {
                // ignore
            }
        } catch (err) {
            explicitRouteFilePath = undefined;
        }

        let generatedRoutePath: string | undefined = explicitRouteFilePath && fs.existsSync(explicitRouteFilePath) ? explicitRouteFilePath : undefined;

        await driver.wait(() => {
            const currentYamlFiles = collectYamlFiles(workspacePath);
            const newYamlFiles = currentYamlFiles.filter(file => !initialYamlFiles.includes(file) && file !== openApiSpecPath);
            if (!generatedRoutePath && newYamlFiles.length > 0) {
                generatedRoutePath = newYamlFiles[0];
            }
            return !!generatedRoutePath && fs.existsSync(generatedRoutePath);
        }, 30000, 'Failed to identify a generated YAML route file');

        expect(generatedRoutePath, 'Generated route path should be determined').to.not.be.undefined;

        const routeContent = fs.readFileSync(generatedRoutePath!, 'utf8');
        expect(routeContent.trim().length).to.be.greaterThan(0);
        const normalizedContent = routeContent.toLowerCase();
        expect(normalizedContent).to.include('route');
        expect(normalizedContent).to.match(/from\s*:/);

        const expectedEditorTitle = path.basename(generatedRoutePath!);
        let editorText: string | undefined;
        try {
            await driver.wait(async () => {
                const titles = await new EditorView().getOpenEditorTitles();
                return titles.includes(expectedEditorTitle);
            }, 8000);
            const editor = await new TextEditor();
            editorText = await editor.getText();
        } catch (err) {
            editorText = undefined;
        }

        if (editorText !== undefined) {
            expect(editorText.trim().length).to.be.greaterThan(0);
            expect(editorText.toLowerCase()).to.include('from');
        }
    });

    after(async () => {
        await new EditorView().closeAllEditors();
    });
});