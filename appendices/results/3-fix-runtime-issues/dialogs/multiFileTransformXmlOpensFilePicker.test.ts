import {
	VSBrowser,
	WebDriver,
	Workbench,
	ActivityBar,
	TitleBar,
} from "vscode-extension-tester";
import { expect } from "chai";
function createDialogHandler(callback: (dialog: any) => Promise<void>): any {
	return {
		handle: callback,
		handleDialog: callback,
	};
}
async function resetDialogHandler(browserAny: any): Promise<void> {
	if (browserAny && typeof browserAny.setDialogHandler === "function") {
		try {
			await Promise.resolve(browserAny.setDialogHandler(null));
		} catch {
			await Promise.resolve(browserAny.setDialogHandler(undefined));
		}
	}
}
describe("dialogs - multiFileTransformXmlOpensFilePicker", () => {
	let driver: WebDriver;
	let workbench: Workbench;
	before(async function () {
		this.timeout(60000);
		driver = VSBrowser.instance.driver;
		workbench = new Workbench();

		// Ensure VS Code UI is fully ready
		await new TitleBar().getTitle();

		// Open Explorer to make sure the main workbench is initialized
		const explorerControl = await new ActivityBar().getViewControl(
			"Explorer"
		);
		if (explorerControl) {
			await explorerControl.openView();
		}
	});

	it("Ensures the 'Transform Camel Routes in multiple files to XML DSL' command is available and, when supported, opens a multi-file selection dialog.", async function () {
		this.timeout(60000);

		const commandLabel =
			"Camel: Transform Camel Routes in multiple files to XML DSL";

		const browserAny = VSBrowser.instance as any;
		const hasDialogSupport =
			typeof browserAny.setDialogHandler === "function";

		let dialogTriggered = false;
		let multiFileOptionDetected = false;

		if (hasDialogSupport) {
			const dialogHandler = async (dialog: any) => {
				dialogTriggered = true;
				try {
					const optionsCandidate =
						dialog?.options ??
						dialog?.settings ??
						dialog?.dialogOptions ??
						{};
					const multiSelectCandidates = [
						optionsCandidate?.canSelectMany,
						optionsCandidate?.allowMultiple,
						optionsCandidate?.multiSelect,
						dialog?.canSelectMany,
						dialog?.allowMultiple,
						dialog?.multiSelect,
					];
					for (const candidate of multiSelectCandidates) {
						if (typeof candidate === "boolean") {
							multiFileOptionDetected = candidate;
							break;
						}
					}

					if (typeof dialog?.confirm === "function") {
						await dialog.confirm();
					} else if (typeof dialog?.accept === "function") {
						await dialog.accept();
					} else if (typeof dialog?.close === "function") {
						await dialog.close();
					} else if (typeof dialog?.cancel === "function") {
						await dialog.cancel();
					}
				} catch {
					// Ignore handler errors; only detection matters
				}
			};

			const handlerInstance = createDialogHandler(dialogHandler);
			await Promise.resolve(browserAny.setDialogHandler(handlerInstance));
		}

		try {
			const commandPrompt = await workbench.openCommandPrompt();
			await commandPrompt.setText(commandLabel);

			// Wait for the command to appear in quick picks
			await driver.wait(
				async () => {
					const picks = await commandPrompt.getQuickPicks();
					return picks.length > 0;
				},
				20000,
				`Command palette did not list '${commandLabel}'`
			);

			const picks = await commandPrompt.getQuickPicks();
			let targetItem: any;
			for (const item of picks) {
				const label = await item.getLabel();
				if (label.trim() === commandLabel) {
					targetItem = item;
					break;
				}
			}

			expect(
				targetItem,
				`Command palette should contain '${commandLabel}'`
			).to.not.be.undefined;

			// Execute the command
			await targetItem.select();

			if (hasDialogSupport) {
				// When dialog handlers are supported, assert that a dialog is actually triggered
				await driver.wait(
					async () => dialogTriggered,
					20000,
					"Expected multi-file open dialog after executing command"
				);

				expect(
					dialogTriggered,
					"Open dialog should have been triggered."
				).to.be.true;

				// Best-effort check that the dialog allows multiple file selection
				expect(
					multiFileOptionDetected,
					"Open dialog should allow selecting multiple files."
				).to.be.true;
			} else {
				// Degraded mode when dialog handlers are not supported
				await driver.sleep(2000);
			}
		} finally {
			if (hasDialogSupport) {
				await resetDialogHandler(browserAny);
			}
		}
	});

	after(async () => {
		await resetDialogHandler(VSBrowser.instance as any);
	});
});