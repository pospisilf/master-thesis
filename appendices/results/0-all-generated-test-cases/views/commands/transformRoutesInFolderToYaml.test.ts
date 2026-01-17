import { VSBrowser, WebDriver, EditorView, ActivityBar, Workbench, SideBarView, InputBox, QuickPickItem } from 'vscode-extension-tester';
import { expect } from 'chai';
import * as path from 'path';
import { promises as fsPromises } from 'fs';

const routesFolderName = 'camel-routes-source';
const javaRouteFileName = 'SampleRoute.java';
const xmlRouteFileName = 'sample-route.xml';

const javaRouteContent = `package com.example;

import org.apache.camel.builder.RouteBuilder;

public class SampleRoute extends RouteBuilder {
    @Override
    public void configure() throws Exception {
        from("timer:java?period=2000")
            .setBody(constant("Hello from Java"))
            .to("log:java");
    }
}
`;

const xmlRouteContent = `<?xml version="1.0" encoding="UTF-8"?>
<routes xmlns="http://camel.apache.org/schema/spring">
    <route id="xmlRoute">
        <from uri="timer:xml?period=1000"/>
        <setBody>
            <constant>Hello from XML</constant>
        </setBody>
        <to uri="log:xml"/>
    </route>
</routes>
`;

let driver: WebDriver;
let workbench: Workbench;
let workspaceFolder: string;
let routesFolder: string;

describe('commands - transformRoutesInFolderToYaml', () => {
    before(async function() {
        this.timeout(60000);
        driver = VSBrowser.instance.driver;
        workbench = new Workbench();
        workspaceFolder = process.env.CODE_TESTS_WORKSPACE ?? path.resolve(__dirname, '..', '..', '..', 'testFixture');
        routesFolder = path.join(workspaceFolder, routesFolderName);

        await ensureFolderClean(routesFolder);
        await fsPromises.writeFile(path.join(routesFolder, javaRouteFileName), javaRouteContent, 'utf8');
        await fsPromises.writeFile(path.join(routesFolder, xmlRouteFileName), xmlRouteContent, 'utf8');
        await driver.sleep(1000);
    });

    it("Runs 'Transform any Camel Route in a specified folder to YAML DSL' and verifies YAML files are created for each supported route source in the folder.", async function() {
        this.timeout(240000);

        const supportedSourceFiles = [javaRouteFileName, xmlRouteFileName];

        const explorerControl = await new ActivityBar().getViewControl('Explorer');
        if (explorerControl) {
            await explorerControl.openView();
        }
        await new SideBarView().getContent();

        const initialYamlFiles = await listYamlFiles(routesFolder);
        const initialCount = initialYamlFiles.length;

        const commandPrompt = await workbench.openCommandPrompt();
        await commandPrompt.setText('Transform any Camel Route in a specified folder to YAML DSL');
        await commandPrompt.selectQuickPick("Camel: Transform any Camel Route in a specified folder to YAML DSL");

        const folderInput = await driver.wait(async () => {
            try {
                const input = await InputBox.create();
                const picks = await input.getQuickPicks();
                return picks.length > 0 ? input : false;
            } catch (err) {
                return false;
            }
        }, 30000, 'Folder selector did not appear') as InputBox;

        await folderInput.setText(routesFolderName);
        const quickPicks = await folderInput.getQuickPicks();
        let targetItem: QuickPickItem | undefined;
        for (const item of quickPicks) {
            const label = await item.getLabel();
            if (label.includes(routesFolderName) || label.includes(path.basename(routesFolder))) {
                targetItem = item;
                break;
            }
        }
        expect(targetItem, 'The routes folder should be listed in the folder selection quick pick').to.not.be.undefined;
        await targetItem!.select();
        await folderInput.confirm();

        await driver.wait(async () => {
            try {
                await InputBox.create(200);
                return false;
            } catch {
                return true;
            }
        }, 15000).catch(() => undefined);

        await driver.wait(async () => {
            const currentYaml = await listYamlFiles(routesFolder);
            return currentYaml.length >= initialCount + supportedSourceFiles.length;
        }, 180000, 'Timed out waiting for YAML transformation results');

        const resultingYaml = await listYamlFiles(routesFolder);
        const newYamlFiles = resultingYaml.filter(file => !initialYamlFiles.includes(file));

        expect(newYamlFiles.length).to.be.at.least(supportedSourceFiles.length, 'Should create at least one YAML per supported source');
        const javaYaml = newYamlFiles.find(file => file.toLowerCase().includes('sampleroute'));
        const xmlYaml = newYamlFiles.find(file => file.toLowerCase().includes('sample-route'));
        expect(javaYaml, 'Java route should produce a YAML file').to.not.be.undefined;
        expect(xmlYaml, 'XML route should produce a YAML file').to.not.be.undefined;

        for (const file of newYamlFiles) {
            const stats = await fsPromises.stat(file);
            expect(stats.size, `${path.basename(file)} should not be empty`).to.be.greaterThan(0);
            const content = await fsPromises.readFile(file, 'utf8');
            expect(content.toLowerCase()).to.contain('from', `${path.basename(file)} should contain a from definition`);
        }

        await new EditorView().closeAllEditors();
    });

    after(async () => {
        await new EditorView().closeAllEditors();
        if (routesFolder && await pathExists(routesFolder)) {
            await fsPromises.rm(routesFolder, { recursive: true, force: true });
        }
    });
});

async function listYamlFiles(dir: string): Promise<string[]> {
    if (!(await pathExists(dir))) {
        return [];
    }
    const entries = await fsPromises.readdir(dir, { withFileTypes: true });
    const result: string[] = [];
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            const nested = await listYamlFiles(fullPath);
            result.push(...nested);
        } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.yaml')) {
            result.push(fullPath);
        }
    }
    return result;
}

async function ensureFolderClean(dir: string): Promise<void> {
    await fsPromises.rm(dir, { recursive: true, force: true }).catch(() => undefined);
    await fsPromises.mkdir(dir, { recursive: true });
}

async function pathExists(target: string): Promise<boolean> {
    try {
        await fsPromises.access(target);
        return true;
    } catch {
        return false;
    }
}