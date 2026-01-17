import { expect } from 'chai';
import { Workbench, QuickOpenBox } from 'vscode-extension-tester';

describe('Camel Quarkus project command availability', function () {
    this.timeout(120000);

    it('Command palette contains "Create a Camel Quarkus project"', async function () {
        let input: QuickOpenBox;
        
        input = await new Workbench().openCommandPrompt();

        await input.setText('>Create a Camel Quarkus project');
            
        const picks = await input.getQuickPicks();

        const labels: string[] = [];
        for (const pick of picks) {
            labels.push(await pick.getLabel());
        }

        expect(labels.some((l) => l.includes('Create a Camel Quarkus project'))).to.be.true;

        await input.cancel();
    });
});