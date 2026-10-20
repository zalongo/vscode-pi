// @ts-check

/** @param {typeof import('vscode')} vscode */
function createLauncher(vscode) {
  /** @type {Map<string, import('vscode').Terminal>} */
  const terminals = new Map();
  // Remember the last project when focus moves from a document to Pi's terminal.
  /** @type {import('vscode').WorkspaceFolder | undefined} */
  let lastFolder;
  let opening = false;

  const closed = vscode.window.onDidCloseTerminal((terminal) => {
    for (const [key, value] of terminals) {
      if (value === terminal) terminals.delete(key);
    }
  });

  /** @param {import('vscode').Uri | undefined} uri */
  async function resolveFolder(uri) {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders?.length) {
      await vscode.window.showWarningMessage('Abre una carpeta o un proyecto antes de iniciar Pi.');
      return;
    }

    const activeUri = uri ?? vscode.window.activeTextEditor?.document.uri;
    const activeFolder = activeUri && vscode.workspace.getWorkspaceFolder(activeUri);
    if (activeFolder) return activeFolder;
    if (folders.length === 1) return folders[0];
    if (lastFolder && folders.some((folder) => folder.uri.toString() === lastFolder?.uri.toString())) {
      return lastFolder;
    }
    return vscode.window.showWorkspaceFolderPick({
      placeHolder: 'Selecciona el proyecto en el que se ejecutará Pi',
    });
  }

  return {
    /** @param {import('vscode').Uri} [uri] */
    async open(uri) {
      if (!vscode.workspace.isTrusted || opening) return;
      opening = true;
      try {
        const folder = await resolveFolder(uri);
        if (!folder) return;
        lastFolder = folder;
        const key = folder.uri.toString();
        const existing = terminals.get(key);
        if (existing && existing.exitStatus === undefined) {
          existing.show(false);
          return;
        }

        // Explicitly create a group on the right, even if the user configured
        // openSideBySideDirection to "down". No global settings are changed.
        await vscode.commands.executeCommand('workbench.action.newGroupRight');
        const terminal = vscode.window.createTerminal({
          name: `Pi — ${folder.name}`,
          cwd: folder.uri,
          location: { viewColumn: vscode.ViewColumn.Active, preserveFocus: false },
          iconPath: new vscode.ThemeIcon('terminal'),
        });
        terminals.set(key, terminal);
        terminal.show(false);
        // Use the user's normal shell: preserves PATH, aliases and Pi login setup.
        // cwd is passed through the API, never interpolated into a shell command.
        terminal.sendText('pi', true);
      } finally {
        opening = false;
      }
    },
    dispose() {
      closed.dispose();
      // Do not terminate a running Pi session on extension deactivation.
      terminals.clear();
    },
  };
}

module.exports = { createLauncher };
