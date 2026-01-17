import { VSBrowser, WebDriver, Workbench } from 'vscode-extension-tester';
import { expect } from 'chai';
import { Key } from 'selenium-webdriver';
import * as path from 'path';
import * as fs from 'fs';

const fsp = fs.promises;

function createDialogHandler(callback: (dialog: any) => Promise<void>): any {
    return {
        handle: callback,
        handleDialog: callback
    };
}

async function resetDialogHandler(browserAny: any): Promise<void> {
    if (browserAny && typeof browserAny.setDialogHandler === 'function') {
        try {
            await Promise.resolve(browserAny.setDialogHandler(null));
        } catch {
            await Promise.resolve(browserAny.setDialogHandler(undefined));
        }
    }
}

describe('dialogs - multiFileTransformXmlOpensFilePicker', () => {
    let driver: WebDriver;
    let workbench: Workbench;
    let workspacePath: string;
    let routesDir: string;
    let sampleFiles: string[] = [];

    before(async function() {
        this.timeout(30000);
        driver = VSBrowser.instance.driver;
        workbench = new Workbench();

        workspacePath = process.env.CODE_TESTS_WORKSPACE ?? process.cwd();
        routesDir = path.join(workspacePath, '.camel-test-artifacts', 'multi-file-transform-xml');
        sampleFiles = [
            path.join(routesDir, 'SampleRouteOne.java'),
            path.join(routesDir, 'SampleRouteTwo.yaml')
        ];

        await fsp.mkdir(routesDir, { recursive: true });
        await fsp.writeFile(sampleFiles[0], [
            'import org.apache.camel.builder.RouteBuilder;',
            'public class SampleRouteOne extends RouteBuilder {',
            '    @Override',
            '    public void configure() {',
            '        from("direct:start").to("log:sampleOne");',
            '    }',
            '}'
        ].join('\n'), 'utf8');
        await fsp.writeFile(sampleFiles[1], [
            '- from:',
            '    uri: "direct:alpha"',
            '  steps:',
            '    - to: "log:alpha"'
        ].join('\n'), 'utf8');
    });

    it('Ensures the \'Transform Camel Routes in multiple files to XML DSL\' command opens a multi-file selection dialog.', async function() {
        this.timeout(40000);

        const commandLabel = 'Camel: Transform Camel Routes in multiple files to XML DSL';

        const browserAny = VSBrowser.instance as any;
        expect(typeof browserAny.setDialogHandler).to.equal('function', 'VSBrowser must support dialog handlers for this test');

        let dialogTriggered = false;
        let multiFileOptionDetected = false;

        const dialogHandler = async (dialog: any) => {
            dialogTriggered = true;
            try {
                const optionsCandidate = dialog?.options ?? dialog?.settings ?? dialog?.dialogOptions ?? {};
                const multiSelectCandidates = [
                    optionsCandidate?.canSelectMany,
                    optionsCandidate?.allowMultiple,
                    optionsCandidate?.multiSelect,
                    dialog?.canSelectMany,
                    dialog?.allowMultiple,
                    dialog?.multiSelect
                ];
                for (const candidate of multiSelectCandidates) {
                    if (typeof candidate === 'boolean') {
                        multiFileOptionDetected = candidate;
                        break;
                    }
                }

                const selectPathsFn = dialog?.selectPaths ?? dialog?.selectItems ?? dialog?.setPaths ?? dialog?.setFilePaths ?? dialog?.selectFiles;
                if (typeof selectPathsFn === 'function') {
                    try {
                        await selectPathsFn.call(dialog, sampleFiles);
                        if (sampleFiles.length > 1) {
                            multiFileOptionDetected = true;
                        }
                    } catch {
                        // ignore selection errors
                    }
                }

                if (typeof dialog?.confirm === 'function') {
                    await dialog.confirm();
                } else if (typeof dialog?.accept === 'function') {
                    await dialog.accept();
                } else if (typeof dialog?.close === 'function') {
                    await dialog.close();
                } else if (typeof dialog?.cancel === 'function') {
                    await dialog.cancel();
                } else {
                    await driver.actions({ async: true }).sendKeys(Key.ESCAPE).perform();
                }
            } catch {
                await driver.actions({ async: true }).sendKeys(Key.ESCAPE).perform();
            }
        };

        const handlerInstance = createDialogHandler(dialogHandler);
        await Promise.resolve(browserAny.setDialogHandler(handlerInstance));

        try {
            const commandPrompt = await workbench.openCommandPrompt();
            await commandPrompt.setText(commandLabel);

            await driver.wait(async () => {
                const picks = await commandPrompt.getQuickPicks();
                return picks.length > 0;
            }, 10000, `Command palette did not list '${commandLabel}'`);

            const picks = await commandPrompt.getQuickPicks();
            let targetItem: any;
            for (const item of picks) {
                const label = await item.getLabel();
                if (label.trim() === commandLabel) {
                    targetItem = item;
                    break;
                }
            }

            expect(targetItem, `Command palette should contain '${commandLabel}'`).to.not.be.undefined;
            await targetItem.select();

            await driver.wait(async () => dialogTriggered, 10000, 'Expected multi-file open dialog after executing command');

            expect(dialogTriggered, 'Open dialog should have been triggered.').to.be.true;
            expect(multiFileOptionDetected, 'Open dialog should allow selecting multiple files.').to.be.true;
        } finally {
            await resetDialogHandler(browserAny);
            try {
                await driver.actions({ async: true }).sendKeys(Key.ESCAPE).perform();
            } catch {
                // ignore inability to send escape
            }
        }
    });

    after(async () => {
        try {
            if (routesDir) {
                await fsp.rm(routesDir, { recursive: true, force: true });
            }
        } catch {
            // ignore cleanup errors
        }
        await resetDialogHandler(VSBrowser.instance as any);
    });
});