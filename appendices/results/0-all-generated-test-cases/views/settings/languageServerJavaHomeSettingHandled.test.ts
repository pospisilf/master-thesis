import { VSBrowser, WebDriver, Workbench, SettingsEditor, Setting, NotificationType } from 'vscode-extension-tester';
import { expect } from 'chai';
import { promises as fsPromises } from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('settings - languageServerJavaHomeSettingHandled', () => {
    let driver: WebDriver;
    let workbench: Workbench;
    let originalJdkValue: string | undefined;
    let originalValueWasEmpty = true;
    let settingModified = false;
    let fakeJdkDir: string | undefined;

    before(async function() {
        this.timeout(30000);
        driver = VSBrowser.instance.driver;
        workbench = new Workbench();
    });

    it('Sets \'camel.ls.java.home\' to a valid JDK path and verifies the language server restarts or remains functional without errors.', async function() {
        this.timeout(120000);

        fakeJdkDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'camel-jdk-'));
        const binDir = path.join(fakeJdkDir, 'bin');
        await fsPromises.mkdir(binDir, { recursive: true });
        const javaExecutable = path.join(binDir, process.platform === 'win32' ? 'java.exe' : 'java');
        await fsPromises.writeFile(javaExecutable, process.platform === 'win32' ? '' : '#!/bin/sh\n');
        if (process.platform !== 'win32') {
            await fsPromises.chmod(javaExecutable, 0o755);
        }
        await fsPromises.writeFile(path.join(fakeJdkDir, 'release'), 'JAVA_VERSION="17"\n');

        const settingsEditor: SettingsEditor = await workbench.openSettings();
        try {
            await settingsEditor.clearSearch();
            await settingsEditor.search('camel.ls.java.home');
            await driver.sleep(2000);

            const setting: Setting = await settingsEditor.findSetting('Camel \u203a Ls: Java Home');
            const currentValue = (await setting.getValue()) as string;
            originalJdkValue = currentValue;
            originalValueWasEmpty = currentValue.trim().length === 0;

            await setting.setValue(fakeJdkDir);
            settingModified = true;

            await driver.sleep(8000);

            const updatedValue = (await setting.getValue()) as string;
            expect(updatedValue).to.equal(fakeJdkDir);
        } finally {
            try {
                await settingsEditor.clearSearch();
            } catch {
                // ignore cleanup errors
            }
            try {
                await settingsEditor.close();
            } catch {
                // ignore cleanup errors
            }
        }

        await driver.sleep(10000);

        const notificationsCenter = await workbench.openNotificationsCenter();
        try {
            const errorNotifications = await notificationsCenter.getNotifications(NotificationType.Error);
            const camelErrors: string[] = [];
            for (const notification of errorNotifications) {
                const message = (await notification.getMessage()) || '';
                const source = (await notification.getSource()) || '';
                if (message.toLowerCase().includes('camel') || source.toLowerCase().includes('camel')) {
                    camelErrors.push(`${source}: ${message}`.trim());
                }
            }
            expect(camelErrors, 'Camel Language Server error notifications found after setting camel.ls.java.home').to.be.empty;
        } finally {
            await notificationsCenter.close();
        }
    });

    after(async function() {
        this.timeout(60000);
        if (settingModified) {
            let settingsEditor: SettingsEditor | undefined;
            try {
                settingsEditor = await workbench.openSettings();
                await settingsEditor.clearSearch();
                await settingsEditor.search('camel.ls.java.home');
                await driver.sleep(2000);

                const setting: Setting = await settingsEditor.findSetting('Camel \u203a Ls: Java Home');
                if (originalValueWasEmpty) {
                    await setting.reset();
                } else if (originalJdkValue !== undefined) {
                    await setting.setValue(originalJdkValue);
                }
                await driver.sleep(2000);
            } catch (error) {
                console.error('Failed to restore camel.ls.java.home setting', error);
            } finally {
                if (settingsEditor) {
                    try {
                        await settingsEditor.clearSearch();
                    } catch {
                        // ignore cleanup errors
                    }
                    try {
                        await settingsEditor.close();
                    } catch {
                        // ignore cleanup errors
                    }
                }
            }
            settingModified = false;
            originalJdkValue = undefined;
            originalValueWasEmpty = true;
        }

        if (fakeJdkDir) {
            try {
                await fsPromises.rm(fakeJdkDir, { recursive: true, force: true });
            } catch {
                // ignore cleanup errors
            }
            fakeJdkDir = undefined;
        }
    });
});