// @ts-check
const vscode = require('vscode');
const { createLauncher } = require('./launcher');

/** @param {import('vscode').ExtensionContext} context */
function activate(context) {
  const launcher = createLauncher(vscode);
  context.subscriptions.push(
    launcher,
    vscode.window.registerTreeDataProvider('pi.launcher', {
      getTreeItem: () => new vscode.TreeItem('Pi'),
      getChildren: () => [],
    }),
    vscode.commands.registerCommand('pi.open', async (uri) => {
      try {
        await launcher.open(uri);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await vscode.window.showErrorMessage(`No se pudo abrir Pi: ${message}`);
      }
    }),
  );
}

module.exports = { activate };
