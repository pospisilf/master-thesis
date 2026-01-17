import { expect } from 'chai';
import { Workbench, VSBrowser, QuickOpenBox } from 'vscode-extension-tester';

describe('Camel Quarkus project command availability', function () {
    this.timeout(120000);

    it('Command palette contains "Create a Camel Quarkus project"', async function () {
        const workbench = new Workbench();
        let input: QuickOpenBox | undefined;
        try {
            input = (await workbench.openCommandPrompt()) as QuickOpenBox;
            await input.setText('>Create a Camel Quarkus project');
            await VSBrowser.instance.driver.sleep(800);

            const picks = await input.getQuickPicks();
            const labels: string[] = [];
            for (const pick of picks) {
                labels.push(await pick.getLabel());
            }

            expect(labels.some((l) => l.includes('Create a Camel Quarkus project'))).to.be.true;
        } finally {
            if (input) {
                await input.cancel();
            }
        }
    });
});