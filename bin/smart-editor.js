#!/usr/bin/env node
/**
 * Naver Smart Editor CLI
 * Usage: smart-editor <command> [options]
 *
 * Requires agent-browser autoconnect on CDP port (default 9223)
 */
import { connect } from '../src/index.js';
import { DOCUMENT_TOOLBAR, PROPERTY_TOOLBAR, COMMANDS } from '../src/modules/definitions.js';

const HELP = `
Naver Smart Editor CLI — control Smart Editor ONE via CDP

Usage:
  smart-editor connect                         Test connection
  smart-editor info                            Show editor state (title, components)
  smart-editor modules                         List all toolbar modules
  smart-editor commands                        List commandManager commands
  smart-editor title get                       Get document title
  smart-editor title set <text>                Set document title
  smart-editor text get                        Get plain text content
  smart-editor text write <text>               Write text at cursor
  smart-editor text break                      Insert line break
  smart-editor format <bold|italic|underline|strikethrough>  Toggle text style
  smart-editor align <left|center|right>       Change alignment
  smart-editor toolbar <data-name>             Click toolbar button by data-name
  smart-editor module <name>                   Run module action (photo, video, table, ...)
  smart-editor image url <url> [url...]         Insert image(s) by URL
  smart-editor document                        Export full document JSON
  smart-editor analyze                         Run deep analysis

  --- Save / Publish popup ---
  smart-editor save                            Click 저장 (draft save)
  smart-editor save drafts                     Open 임시저장 목록
  smart-editor publish open                    Open 발행 popup
  smart-editor publish state                   Read publish popup state
  smart-editor publish close                   Close publish popup (Esc)
  smart-editor publish categories              List blog categories
  smart-editor publish category <name>         Select category
  smart-editor publish tags <tag1,tag2,...>    Set tags
  smart-editor publish visibility <type>       public|neighbor|both_neighbor|private
  smart-editor publish option <name> <on|off>  comment|sympathy|search|scrap|outside|notice|setDefault
  smart-editor publish time <now|schedule>     Set publish time
  smart-editor publish confirm                 Click final 발행 button
  smart-editor publish config --json '{...}'   Configure popup (see README)

Environment:
  CDP_PORT=9223    Chrome DevTools port (agent-browser autoconnect)

Examples:
  smart-editor info
  smart-editor title set "My Blog Post"
  smart-editor text write "Hello World"
  smart-editor format bold
  smart-editor module photo
  smart-editor toolbar table
  smart-editor image url https://example.com/image.jpg
  smart-editor publish open
  smart-editor publish category 일상
  smart-editor publish tags "일상,메모"
  smart-editor publish visibility public
  smart-editor save
`;

const PUBLISH_OPTIONS = ['comment', 'sympathy', 'search', 'scrap', 'outside', 'notice', 'setDefault'];

const MODULE_ALIASES = {
  photo: 'photo',
  image: 'photo',
  mybox: 'mybox',
  video: 'video',
  sticker: 'sticker',
  quotation: 'quotation',
  quote: 'quotation',
  line: 'horizontalLine',
  'horizontal-line': 'horizontalLine',
  link: 'oglink',
  oglink: 'oglink',
  file: 'file',
  schedule: 'schedule',
  code: 'code',
  table: 'table',
  formula: 'formula',
  map: 'map',
  shopping: 'shoppingConnect',
  search: 'searchPanel',
  moment: 'momentPanel',
  library: 'libraryPanel',
  template: 'templatePanel',
};

async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];

  if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') {
    console.log(HELP);
    return;
  }

  if (cmd === 'modules-list') {
    console.log('Document Toolbar:');
    for (const [k, v] of Object.entries(DOCUMENT_TOOLBAR)) {
      console.log(`  ${k.padEnd(20)} ${v.label.padEnd(10)} [data-name=${v.dataName}]`);
    }
    console.log('\nProperty Toolbar:');
    for (const [k, v] of Object.entries(PROPERTY_TOOLBAR)) {
      console.log(`  ${k.padEnd(20)} ${v.label.padEnd(10)} [data-name=${v.dataName}]`);
    }
    console.log('\nCommands:', Object.values(COMMANDS).join(', '));
    return;
  }

  const session = await connect();
  const { editor, modules, publish, disconnect } = session;

  try {
    switch (cmd) {
      case 'connect':
        console.log(JSON.stringify({ ok: true, url: session.page.url() }, null, 2));
        break;

      case 'info': {
        const [title, text, comps, empty] = await Promise.all([
          editor.getTitle(),
          editor.getContentText(),
          editor.getComponents(),
          editor.isEmpty(),
        ]);
        console.log(JSON.stringify({ title, contentPreview: text?.slice(0, 200), components: comps, isEmpty: empty }, null, 2));
        break;
      }

      case 'modules':
        console.log(JSON.stringify({
          document: modules.listDocumentModules(),
          property: modules.listPropertyModules(),
        }, null, 2));
        break;

      case 'commands': {
        const cmds = await editor.listCommands();
        console.log(JSON.stringify(cmds, null, 2));
        break;
      }

      case 'title':
        if (args[1] === 'get') {
          console.log(await editor.getTitle());
        } else if (args[1] === 'set') {
          const title = args.slice(2).join(' ');
          await editor.setTitle(title);
          console.log(JSON.stringify({ ok: true, title }));
        } else {
          console.error('Usage: smart-editor title get|set <text>');
          process.exit(1);
        }
        break;

      case 'text':
        if (args[1] === 'get') {
          console.log(await editor.getContentText());
        } else if (args[1] === 'write') {
          const text = args.slice(2).join(' ');
          await editor.writeText(text);
          console.log(JSON.stringify({ ok: true, written: text.slice(0, 100) }));
        } else if (args[1] === 'break') {
          await editor.lineBreak();
          console.log(JSON.stringify({ ok: true }));
        } else {
          console.error('Usage: smart-editor text get|write|break');
          process.exit(1);
        }
        break;

      case 'format': {
        const style = args[1];
        if (!style) { console.error('Usage: smart-editor format <bold|italic|underline|strikethrough>'); process.exit(1); }
        await editor.toggleStyle(style);
        console.log(JSON.stringify({ ok: true, style }));
        break;
      }

      case 'align': {
        const align = args[1];
        if (!align) { console.error('Usage: smart-editor align <left|center|right>'); process.exit(1); }
        await editor.changeAlign(align);
        console.log(JSON.stringify({ ok: true, align }));
        break;
      }

      case 'toolbar': {
        const dataName = args[1];
        if (!dataName) { console.error('Usage: smart-editor toolbar <data-name>'); process.exit(1); }
        const result = await editor.clickToolbar(dataName);
        console.log(JSON.stringify(result, null, 2));
        break;
      }

      case 'module': {
        const name = args[1];
        if (!name) { console.error('Usage: smart-editor module <name>'); process.exit(1); }
        const method = MODULE_ALIASES[name];
        if (!method || typeof modules[method] !== 'function') {
          console.error(`Unknown module: ${name}. Available: ${Object.keys(MODULE_ALIASES).join(', ')}`);
          process.exit(1);
        }
        const variant = parseInt(args[2]) || 0;
        const fn = modules[method];
        const result = fn.length > 0 ? await fn.call(modules, variant) : await fn.call(modules);
        console.log(JSON.stringify({ ok: true, module: name, result }, null, 2));
        break;
      }

      case 'image':
        if (args[1] === 'url') {
          const urls = args.slice(2);
          if (!urls.length) { console.error('Usage: smart-editor image url <url> [url...]'); process.exit(1); }
          await modules.insertImageUrls(urls);
          console.log(JSON.stringify({ ok: true, urls }));
        } else {
          console.error('Usage: smart-editor image url <url> [url...]');
          process.exit(1);
        }
        break;

      case 'document': {
        const data = await editor.getDocumentData();
        console.log(JSON.stringify(data, null, 2));
        break;
      }

      case 'analyze': {
        const { execSync } = await import('child_process');
        const script = new URL('../scripts/analyze-editor.js', import.meta.url).pathname;
        execSync(`node "${script}"`, { stdio: 'inherit' });
        break;
      }

      case 'save':
        if (args[1] === 'drafts') {
          console.log(JSON.stringify(await publish.openDraftList(), null, 2));
        } else {
          console.log(JSON.stringify(await publish.save(), null, 2));
        }
        break;

      case 'publish': {
        const sub = args[1];
        if (!sub) { console.error('Usage: smart-editor publish <open|state|close|categories|category|tags|visibility|option|time|confirm|config>'); process.exit(1); }

        switch (sub) {
          case 'open':
            console.log(JSON.stringify(await publish.openPublish(), null, 2));
            break;
          case 'state':
            if (!(await publish.isPublishOpen())) await publish.openPublish();
            console.log(JSON.stringify(await publish.getState(), null, 2));
            break;
          case 'close':
            console.log(JSON.stringify({ closed: await publish.closePublish() }, null, 2));
            break;
          case 'categories':
            console.log(JSON.stringify(await publish.listCategories(), null, 2));
            break;
          case 'category': {
            const name = args.slice(2).join(' ');
            if (!name) { console.error('Usage: smart-editor publish category <name>'); process.exit(1); }
            console.log(JSON.stringify(await publish.selectCategory(name), null, 2));
            break;
          }
          case 'tags': {
            const tags = args.slice(2).join(' ');
            if (!tags) { console.error('Usage: smart-editor publish tags <tag1,tag2,...>'); process.exit(1); }
            console.log(JSON.stringify(await publish.setTags(tags.split(',').map(t => t.trim())), null, 2));
            break;
          }
          case 'visibility': {
            const type = args[2];
            if (!type) { console.error('Usage: smart-editor publish visibility <public|neighbor|both_neighbor|private>'); process.exit(1); }
            console.log(JSON.stringify(await publish.setOpenType(type), null, 2));
            break;
          }
          case 'option': {
            const name = args[2];
            const val = args[3];
            if (!name || !val) { console.error(`Usage: smart-editor publish option <${PUBLISH_OPTIONS.join('|')}> <on|off>`); process.exit(1); }
            console.log(JSON.stringify(await publish.setOption(name, val === 'on'), null, 2));
            break;
          }
          case 'time': {
            const mode = args[2];
            if (!mode) { console.error('Usage: smart-editor publish time <now|schedule>'); process.exit(1); }
            console.log(JSON.stringify(await publish.setPublishTime(mode), null, 2));
            break;
          }
          case 'confirm':
            console.log(JSON.stringify(await publish.confirmPublish(), null, 2));
            break;
          case 'config': {
            const jsonIdx = args.indexOf('--json');
            if (jsonIdx === -1) { console.error('Usage: smart-editor publish config --json \'{...}\''); process.exit(1); }
            const config = JSON.parse(args[jsonIdx + 1]);
            console.log(JSON.stringify(await publish.configure(config), null, 2));
            break;
          }
          default:
            console.error(`Unknown publish subcommand: ${sub}`);
            process.exit(1);
        }
        break;
      }

      default:
        console.error(`Unknown command: ${cmd}\nRun smart-editor help`);
        process.exit(1);
    }
  } finally {
    await disconnect();
  }
}

main().catch(err => {
  console.error(JSON.stringify({ error: err.message }));
  process.exit(1);
});
