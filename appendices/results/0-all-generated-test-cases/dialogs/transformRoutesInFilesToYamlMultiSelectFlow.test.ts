import { VSBrowser, WebDriver, Workbench, InputBox, QuickPickItem } from 'vscode-extension-tester';
import { expect } from 'chai';
import * as path from 'path';
import { promises as fsPromises, existsSync } from 'fs';

describe('dialogs - transformRoutesInFilesToYamlMultiSelectFlow', () => {
    let driver: WebDriver;
    let workbench: Workbench;
    let workspacePath: string;
    let routesDir: string;

    const xmlRoutes = [
        {
            name: 'multi-route-one.xml',
            yamlName: 'multi-route-one.yaml',
            content: `<camelContext xmlns="http://camel.apache.org/schema/spring">
    <route id="sample-route-one">
        <from uri="timer:tick"/>
        <log message="Route one processed"/>
    </route>
</camelContext>`
        },
        {
            name: 'multi-route-two.xml',
            yamlName: 'multi-route-two.yaml',
            content: `<camelContext xmlns="http://camel.apache.org/schema/spring">
    <route id="sample-route-two">
        <from uri="timer:another"/>
        <log message="Route two processed"/>
    </route>
</camelContext>`
        }
    ];

    before(async function () {
        this.timeout(60000);
        driver = VSBrowser.instance.driver;
        workbench = new Workbench();

        workspacePath = process.env.CODE_TESTS_WORKSPACE || process.env.VSCODE_WORKSPACE || process.cwd();
        routesDir = path.join(workspacePath, 'camel-routes-multi-select');
        await fsPromises.mkdir(routesDir, { recursive: true });

        for (const route of xmlRoutes) {
            const filePath = path.join(routesDir, route.name);
            await fsPromises.writeFile(filePath, route.content, { encoding: 'utf-8' });
        }

        await driver.sleep(1000);
    });

    it("Invokes 'Transform Camel Routes in multiple files to YAML DSL', ensures a multi-file selection flow appears, and verifies YAML outputs are created.", async function () {
        this.timeout(180000);

        const commandPrompt = await workbench.openCommandPrompt();
        await commandPrompt.setText('Transform Camel Routes in multiple files to YAML DSL');
        await driver.sleep(800);

        let transformCommand: QuickPickItem | undefined;
        const commandPicks = await commandPrompt.getQuickPicks();
        for (const pick of commandPicks) {
            const label = await pick.getLabel();
            if (label.toLowerCase().includes('transform camel routes in multiple files to yaml dsl')) {
                transformCommand = pick;
                break;
            }
        }
        expect(transformCommand, 'Command palette entry for transformation not found').to.not.be.undefined;
        await transformCommand!.select();

        const fileSelector = await driver.wait<InputBox>(async () => {
            try {
                const picker = await InputBox.create();
                const picks = await picker.getQuickPicks();
                if (!picks || picks.length === 0) {
                    return undefined;
                }
                let matches = 0;
                for (const item of picks) {
                    const label = await item.getLabel();
                    if (xmlRoutes.some(route => label.includes(route.name))) {
                        matches++;
                    }
                }
                return matches === xmlRoutes.length ? picker : undefined;
            } catch {
                return undefined;
            }
        }, 20000, 'Multi-file selection quick pick did not appear');

        const availablePicks = await fileSelector.getQuickPicks();
        const toggled: string[] = [];
        for (const pick of availablePicks) {
            const label = await pick.getLabel();
            const routeMatch = xmlRoutes.find(route => label.includes(route.name));
            if (routeMatch) {
                if (typeof (pick as any).toggle === 'function') {
                    await (pick as any).toggle(true);
                } else {
                    await pick.select();
                }
                if (typeof (pick as any).isChecked === 'function') {
                    const checked = await (pick as any).isChecked();
                    expect(checked, `Quick pick for ${routeMatch.name} was not checked`).to.be.true;
                }
                toggled.push(routeMatch.name);
            }
        }
        expect(toggled.length).to.equal(xmlRoutes.length, 'Not all Camel route files were presented for selection');

        await fileSelector.confirm();

        await driver.wait(async () => {
            try {
                await InputBox.create();
                return false;
            } catch {
                return true;
            }
        }, 20000, 'File selection quick pick did not close after confirming');

        const yamlPaths = xmlRoutes.map(route => path.join(routesDir, route.yamlName));
        await driver.wait(async () => yamlPaths.every(filePath => existsSync(filePath)), 120000, 'YAML DSL transformation outputs were not created in time');

        for (const route of xmlRoutes) {
            const yamlFilePath = path.join(routesDir, route.yamlName);
            expect(existsSync(yamlFilePath), `Expected YAML output ${route.yamlName} was not found`).to.be.true;

            const content = await fsPromises.readFile(yamlFilePath, { encoding: 'utf-8' });
            expect(content.trim().length, `YAML output ${route.yamlName} is empty`).to.be.greaterThan(0);
        }
    });

    after(async () => {
        try {
            await fsPromises.rm(routesDir, { recursive: true, force: true });
        } catch (err) {
            // ignore cleanup errors
        }
    });
});