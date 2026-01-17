import { VSBrowser, WebDriver, Workbench, QuickOpenBox, QuickPickItem } from 'vscode-extension-tester';
import { expect } from 'chai';

describe('commands - commandsHiddenWithoutWorkspace', () => {
    let driver: WebDriver;
    let workbench: Workbench;

    before(async function() {
        this.timeout(30000);
        driver = VSBrowser.instance.driver;
        workbench = new Workbench();
    });

    it('With no workspace open, confirms that workspace-scoped commands are not shown in the Command Palette.', async function() {
        this.timeout(40000);

        const quickOpen: QuickOpenBox = await workbench.openCommandPrompt();
        try {
            const commandsToCheck = [
                { id: 'camel.jbang.routes.yaml', title: 'Create a Camel Route using YAML DSL' },
                { id: 'camel.jbang.routes.java', title: 'Create a Camel Route using Java DSL' },
                { id: 'camel.jbang.routes.xml', title: 'Create a Camel Route using XML DSL' },
                { id: 'camel.jbang.routes.kamelet.yaml', title: 'Create a Kamelet using YAML DSL' },
                { id: 'camel.jbang.routes.pipe.yaml', title: 'Create a Custom Resource Pipe using YAML DSL' },
                { id: 'camel.jbang.routes.yaml.fromopenapi', title: 'Create a Camel route from OpenAPI using YAML DSL' }
            ];

            for (const command of commandsToCheck) {
                await quickOpen.setText(`> ${command.title}`);
                await driver.sleep(700);

                const picks: QuickPickItem[] = await quickOpen.getQuickPicks();
                const matchingPicks: QuickPickItem[] = [];

                for (const pick of picks) {
                    const label = await pick.getLabel();
                    if (label && label.trim() === command.title) {
                        matchingPicks.push(pick);
                    }
                }

                expect(
                    matchingPicks.length,
                    `Command ${command.id} should not appear in the Command Palette without an open workspace`
                ).to.equal(0);
            }
        } finally {
            await quickOpen.cancel();
        }
    });

    after(async () => {
        // Cleanup if required
    });
});