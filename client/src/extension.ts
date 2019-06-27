/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as path from 'path';
import {
	workspace,
	ExtensionContext,
	commands,
	window,
	extensions,
	ConfigurationTarget } from 'vscode';

import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	TransportKind
} from 'vscode-languageclient';

let client: LanguageClient;

export function activate(ctx: ExtensionContext) {
	// The server is implemented in Go
	let serverModule = ctx.asAbsolutePath(
		path.join('gosvr', 'propls')
	);
	// The debug options for the server
	// --inspect=6009: runs the server in Node's Inspector mode so VS Code can attach to the server for debugging
	let debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] };

	// If the extension is launched in debug mode then the debug server options are used
	// Otherwise the run options are used
	let serverOptions: ServerOptions = {
		run: { command: serverModule, transport: TransportKind.stdio },
		debug: { command: serverModule, transport: TransportKind.stdio }
		// ,
		// run: {
		// 	command: serverModule,
		// 	transport: {
		// 		kind: TransportKind.socket,
		// 		port: 8888
		// 	}
		// },
		// debug: {
		// 	command: serverModule,
		// 	transport: {
		// 		kind: TransportKind.socket,
		// 		port: 8888
		// 	}
		// 	// transport: TransportKind.stdio, //,
		// 	// options: debugOptions
		// }

	};

	// Options to control the language client
	let clientOptions: LanguageClientOptions = {
		// Register the server for plain text documents
		documentSelector: [
			// { scheme: 'file', language: 'plaintext' },
			{ scheme: 'file', language: 'adl' },
			{ scheme: 'file', language: 'tron' },
			{ scheme: 'file', language: 'tron.mod' },
			{ scheme: 'file', language: 'tron.sum' }
		],
		// synchronize: {
		// 	// Notify the server about file changes to '.clientrc files contained in the workspace
		// 	fileEvents: workspace.createFileSystemWatcher('**/.clientrc')
		// }
	};

	// Create the language client and start the client.
	client = new LanguageClient(
		'tron',
		'TRON Language Server',
		serverOptions,
		clientOptions
	);

	// Start the client. This will also launch the server
	let languageServerDisposable = client.start();
	ctx.subscriptions.push(languageServerDisposable);

	// ctx.subscriptions.push(commands.registerCommand('tron.languageserver.restart', async () => {
	// 	console.log("stopping..");
	// 	await client.stop();
	// 	console.log("stoped..");
	// 	languageServerDisposable.dispose();
	// 	console.log("disposed..");
	// 	languageServerDisposable = client.start();
	// 	console.log("restarted..");
	// 	ctx.subscriptions.push(languageServerDisposable);
	// }));

	ctx.subscriptions.push(commands.registerCommand('tron.includes', async () => {
		commands.executeCommand('workbench.action.openWorkspaceSettings');
		const currentDocument = window.activeTextEditor.document;
		const configuration = workspace.getConfiguration('', currentDocument.uri);
		const currentValue = configuration.get('tron.includes', {});
		await configuration.update('tron.includes', currentValue, ConfigurationTarget.WorkspaceFolder);
		commands.executeCommand('settings.switchToJSON');

		// if (window.activeTextEditor) {
		// 	const currentDocument = window.activeTextEditor.document;
		// 	// 1) Get the configuration for the current document
		// 	const configuration = workspace.getConfiguration('', currentDocument.uri);
		// 	// 2) Get the configuration value
		// 	const currentValue = configuration.get('tron.includes', {});
		// 	const target = workspace.workspaceFolders ? ConfigurationTarget.WorkspaceFolder : ConfigurationTarget.Global;
		// 	await configuration.update('tron.includes', ["path here"], target);
		// }
	}));

	ctx.subscriptions.push(commands.registerCommand('tron.show.commands', () => {
		const extCommands = getExtensionCommands();
		window.showQuickPick(extCommands.map(x => x.title)).then(cmd => {
			const selectedCmd = extCommands.find(x => x.title === cmd);
			if (selectedCmd) {
				commands.executeCommand(selectedCmd.command);
			}
		});
	}));



	commands.registerCommand('config.commands.configureEmptyLastLineFiles', async () => {
		// 1) Getting the value
		const value = await window.showInputBox({ prompt: 'Provide glob pattern of files to have empty last line.' });
		if (workspace.workspaceFolders) {
			// 2) Getting the target
			const target = await window.showQuickPick([
					{ label: 'Application', description: 'User Settings', target: ConfigurationTarget.Global },
					{ label: 'Workspace', description: 'Workspace Settings', target: ConfigurationTarget.Workspace },
					{ label: 'Workspace Folder', description: 'Workspace Folder Settings', target: ConfigurationTarget.WorkspaceFolder }
				],
				{ placeHolder: 'Select the target to which this setting should be applied' });
			if (value && target) {
				if (target.target === ConfigurationTarget.WorkspaceFolder) {
					// 3) Getting the workspace folder
					let workspaceFolder = await window.showWorkspaceFolderPick({ placeHolder: 'Pick Workspace Folder to which this setting should be applied' });
					if (workspaceFolder) {
						// 4) Get the configuration for the workspace folder
						const configuration = workspace.getConfiguration('', workspaceFolder.uri);
						// 5) Get the current value
						const currentValue = configuration.get('conf.resource.insertEmptyLastLine');
						const newValue = { ...currentValue, ...{ [value]: true } };
						// 6) Update the configuration value
						await configuration.update('conf.resource.insertEmptyLastLine', newValue, target.target);
					}
				} else {
					// 3) Get the configuration
					const configuration = workspace.getConfiguration();
					// 4) Get the current value
					const currentValue = configuration.get('conf.resource.insertEmptyLastLine');
					const newValue = { ...currentValue, ...(value ? { [value]: true } : {}) };
					// 3) Update the value in the target
					await workspace.getConfiguration().update('conf.resource.insertEmptyLastLine', newValue, target.target);
				}
			}
		} else {
			// 2) Get the configuration
			const configuration = workspace.getConfiguration();
			// 3) Get the current value
			const currentValue = configuration.get('conf.resource.insertEmptyLastLine');
			const newValue = { ...currentValue, ...(value ? { [value]: true } : {}) };
			// 4) Update the value in the User Settings
			await workspace.getConfiguration().update('conf.resource.insertEmptyLastLine', newValue, ConfigurationTarget.Global);
		}
	});


}

export function getExtensionCommands(): any[] {
	const pkgJSON = extensions.getExtension("wxio.tron").packageJSON;
	if (!pkgJSON.contributes || !pkgJSON.contributes.commands) {
		return;
	}
	const extensionCommands: any[] = extensions.getExtension("wxio.tron").packageJSON.contributes.commands.filter((x: any) => x.command !== 'go.show.commands');
	return extensionCommands;
}

export function deactivate(): Thenable<void> | undefined {
	if (!client) {
		return undefined;
	}
	return client.stop();
}
