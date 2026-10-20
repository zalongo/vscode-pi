const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createLauncher } = require('../src/launcher');

function folder(path, name = path) {
  return { name, uri: { path, toString: () => `file://${path}` } };
}

function setup(folders = [folder('/project')]) {
  const created = [];
  const warnings = [];
  const commands = [];
  let onClose;
  let listenerDisposed = false;
  let picks = 0;
  const vscode = {
    ViewColumn: { Active: -1 },
    ThemeIcon: class { constructor(id) { this.id = id; } },
    commands: {
      async executeCommand(command) { commands.push(command); },
    },
    workspace: {
      isTrusted: true,
      workspaceFolders: folders,
      getWorkspaceFolder(uri) {
        return folders.filter((f) => uri.path === f.uri.path || uri.path.startsWith(`${f.uri.path}/`))
          .sort((a, b) => b.uri.path.length - a.uri.path.length)[0];
      },
    },
    window: {
      activeTextEditor: undefined,
      onDidCloseTerminal(listener) {
        onClose = listener;
        return { dispose() { listenerDisposed = true; } };
      },
      async showWarningMessage(message) { warnings.push(message); },
      async showWorkspaceFolderPick() { picks++; return folders[1]; },
      createTerminal(options) {
        assert.equal(commands.at(-1), 'workbench.action.newGroupRight');
        const terminal = {
          options, sent: [], shown: [], exitStatus: undefined,
          show(preserveFocus) { this.shown.push(preserveFocus); },
          sendText(text, newline) { this.sent.push({ text, newline }); },
        };
        created.push(terminal);
        return terminal;
      },
    },
  };
  const launcher = createLauncher(vscode);
  return {
    vscode, launcher, created, warnings, commands,
    close(terminal) { onClose(terminal); },
    get picks() { return picks; },
    get listenerDisposed() { return listenerDisposed; },
    active(path) { vscode.window.activeTextEditor = { document: { uri: { path } } }; },
  };
}

test('opens a right-hand editor terminal and sends pi exactly once', async () => {
  const s = setup();
  await s.launcher.open();
  assert.equal(s.created.length, 1);
  assert.equal(s.created[0].options.cwd.path, '/project');
  assert.deepEqual(s.created[0].options.location, { viewColumn: -1, preserveFocus: false });
  assert.deepEqual(s.commands, ['workbench.action.newGroupRight']);
  assert.deepEqual(s.created[0].sent, [{ text: 'pi', newline: true }]);
  assert.deepEqual(s.created[0].shown, [false]);
});

test('uses the active file workspace root, not its subdirectory', async () => {
  const s = setup([folder('/one'), folder('/two')]);
  s.active('/two/src/example.js');
  await s.launcher.open();
  assert.equal(s.created[0].options.cwd.path, '/two');
  assert.equal(s.picks, 0);
});

test('prefers the editor title URI over a previously active text editor', async () => {
  const s = setup([folder('/one'), folder('/two')]);
  s.active('/one/index.js');
  await s.launcher.open({ path: '/two/index.js' });
  assert.equal(s.created[0].options.cwd.path, '/two');
});

test('reuses the session without new groups or commands when clicked twice', async () => {
  const s = setup();
  await s.launcher.open();
  await s.launcher.open();
  assert.equal(s.created.length, 1);
  assert.equal(s.commands.length, 1);
  assert.equal(s.created[0].sent.length, 1);
  assert.equal(s.created[0].shown.length, 2);
});

test('creates separate terminals per workspace root and remembers the last folder', async () => {
  const s = setup([folder('/one'), folder('/two')]);
  s.active('/one/file.js');
  await s.launcher.open();
  s.active('/two/file.js');
  await s.launcher.open();
  s.vscode.window.activeTextEditor = undefined;
  await s.launcher.open();
  assert.equal(s.created.length, 2);
  assert.equal(s.created[1].shown.length, 2);
  assert.equal(s.picks, 0);
});

test('prompts for ambiguous workspaces without an active file', async () => {
  const s = setup([folder('/one'), folder('/two')]);
  await s.launcher.open();
  assert.equal(s.picks, 1);
  assert.equal(s.created[0].options.cwd.path, '/two');
});

test('cancelling the folder picker does not create a group or terminal', async () => {
  const s = setup([folder('/one'), folder('/two')]);
  s.vscode.window.showWorkspaceFolderPick = async () => undefined;
  await s.launcher.open();
  assert.equal(s.created.length, 0);
  assert.equal(s.commands.length, 0);
});

test('warns when no workspace is open', async () => {
  const s = setup([]);
  await s.launcher.open();
  assert.equal(s.warnings.length, 1);
  assert.equal(s.created.length, 0);
  assert.equal(s.commands.length, 0);
});

test('never launches in an untrusted workspace', async () => {
  const s = setup();
  s.vscode.workspace.isTrusted = false;
  await s.launcher.open();
  assert.equal(s.created.length, 0);
});

test('closing a terminal allows starting a new session', async () => {
  const s = setup();
  await s.launcher.open();
  s.close(s.created[0]);
  await s.launcher.open();
  assert.equal(s.created.length, 2);
});

test('replaces a terminal whose shell has exited', async () => {
  const s = setup();
  await s.launcher.open();
  s.created[0].exitStatus = { code: 0 };
  await s.launcher.open();
  assert.equal(s.created.length, 2);
});

test('passes special directory characters via cwd, never shell interpolation', async () => {
  const path = '/projects/with spaces; $(echo unsafe)';
  const s = setup([folder(path)]);
  await s.launcher.open();
  assert.equal(s.created[0].options.cwd.path, path);
  assert.deepEqual(s.created[0].sent, [{ text: 'pi', newline: true }]);
});

test('rapid clicks cannot launch duplicate terminals', async () => {
  const s = setup();
  await Promise.all([s.launcher.open(), s.launcher.open(), s.launcher.open()]);
  assert.equal(s.created.length, 1);
});

test('a failed group creation can be retried', async () => {
  const s = setup();
  s.vscode.commands.executeCommand = async () => { throw new Error('group failed'); };
  await assert.rejects(s.launcher.open(), /group failed/);
  s.vscode.commands.executeCommand = async (command) => { s.commands.push(command); };
  await s.launcher.open();
  assert.equal(s.created.length, 1);
});

test('dispose removes listeners without terminating sessions', async () => {
  const s = setup();
  await s.launcher.open();
  s.launcher.dispose();
  assert.equal(s.listenerDisposed, true);
  assert.equal(s.created.length, 1);
});

test('manifest exposes Pi icon in the editor title and command palette', () => {
  const manifest = require('../package.json');
  assert.equal(manifest.contributes.commands[0].command, 'pi.open');
  assert.equal(manifest.contributes.commands[0].icon.dark, 'media/pi.svg');
  assert.equal(manifest.contributes.menus['editor/title'][0].group, 'navigation@1');
  assert.equal(manifest.capabilities.untrustedWorkspaces.supported, false);
});

test('manifest exposes a Pi activity container even with no document open', () => {
  const { contributes } = require('../package.json');
  const container = contributes.viewsContainers.activitybar.find((item) => item.id === 'pi');
  assert.equal(container.title, 'Pi');
  assert.equal(container.icon, 'media/pi-activity.svg');
  assert.equal(contributes.views.pi[0].id, 'pi.launcher');
  assert.ok(contributes.viewsWelcome.some((item) =>
    item.view === 'pi.launcher' && item.contents.includes('(command:pi.open)')));
});

test('Explorer header provides a direct launch action independent of editor title', () => {
  const { contributes } = require('../package.json');
  const action = contributes.menus['view/title'].find((item) => item.command === 'pi.open');
  assert.ok(action.when.includes('workbench.explorer.fileView'));
  assert.ok(action.when.includes('pi.launcher'));
  assert.equal(action.group, 'navigation@1');
});
