const { Plugin, PluginSettingTab, Setting, Modal, Notice } = require('obsidian');
const fs = require('fs');
const path = require('path');

let shell = null;
let clipboard = null;
let nativeImage = null;
try {
  const electron = require('electron');
  shell = electron.shell || null;
  clipboard = electron.clipboard || null;
  nativeImage = electron.nativeImage || null;
} catch (error) {
  shell = null;
  clipboard = null;
  nativeImage = null;
}

const DEFAULT_SETTINGS = {
  templateFolder: 'Projects/Video Projects/_TEMPLATE - New Video Project',
  projectsRoot: 'Projects/Video Projects',
  guestDatabaseNote: 'Notes/Podcast Guest Database.md',
  guestTemplatePath: 'Templates/Podcast Guest Template.md',
  openHubAfterCreate: true,
  openFolderAfterCreate: true,
  seedStarterPrompts: true,
  createAIPromptFile: true,
  copyAIPromptToClipboard: true,
};

const TYPE_PRESETS = {
  video: {
    key: 'video',
    label: 'Video',
    typeValue: 'youtube-video',
    placeholderTheme: 'Iran and the New Global Trade War\nhttps://source-link-or-reference-here',
  },
  livestream: {
    key: 'livestream',
    label: 'Livestream',
    typeValue: 'youtube-livestream',
    placeholderTheme: 'Live Update: What Happens Next?\nhttps://source-link-or-reference-here',
  },
  guest: {
    key: 'guest',
    label: 'Guest episode',
    typeValue: 'youtube-guest-episode',
    placeholderTheme: 'Guest Interview Topic\nhttps://source-link-or-reference-here',
  },
};

function getTypePreset(typeKey) {
  return TYPE_PRESETS[typeKey] || TYPE_PRESETS.video;
}

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function slugify(input) {
  return String(input)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'untitled';
}

function sanitizeWindowsFilename(input) {
  return String(input)
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '-')
    .replace(/[. ]+$/g, '')
    .trim();
}

function getVaultRoot(app) {
  return app?.vault?.adapter?.getBasePath?.() || app?.vault?.adapter?.basePath || '';
}

function toObsidianPath(vaultRoot, filePath) {
  return path.relative(vaultRoot, filePath).split(path.sep).join('/');
}

function stripDiacritics(input) {
  return String(input || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function escapeRegExp(input) {
  return String(input || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getGuestImageStem(guestName) {
  return stripDiacritics(String(guestName || ''))
    .replace(/[^a-z0-9]+/gi, '')
    .trim() || 'Guest';
}

function getGuestFacialReferencePath(vaultRoot, guestName) {
  return path.join(vaultRoot, 'Attachments', 'Facial References', `${getGuestImageStem(guestName)}.png`);
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('Could not read file.'));
    reader.readAsDataURL(file);
  });
}

function dataURLToPngBuffer(dataURL) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth || image.width;
        canvas.height = image.naturalHeight || image.height;
        const context = canvas.getContext('2d');
        if (!context) {
          reject(new Error('Could not create canvas context.'));
          return;
        }
        context.drawImage(image, 0, 0);
        canvas.toBlob(async (blob) => {
          if (!blob) {
            reject(new Error('Could not convert image to PNG.'));
            return;
          }
          const arrayBuffer = await blob.arrayBuffer();
          resolve(Buffer.from(arrayBuffer));
        }, 'image/png');
      } catch (error) {
        reject(error);
      }
    };
    image.onerror = () => reject(new Error('Could not load image for conversion.'));
    image.src = dataURL;
  });
}

async function fileToPngBuffer(file) {
  const dataURL = await readFileAsDataURL(file);
  return dataURLToPngBuffer(dataURL);
}

async function saveGuestFacialReferenceImage(vaultRoot, guestName, file) {
  if (!file) return null;
  const targetPath = getGuestFacialReferencePath(vaultRoot, guestName);
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });

  let buffer = null;
  try {
    buffer = await fileToPngBuffer(file);
  } catch (error) {
    if (file.path && nativeImage) {
      try {
        const image = nativeImage.createFromPath(file.path);
        if (image && !image.isEmpty()) {
          buffer = image.toPNG();
        }
      } catch (nativeError) {
        buffer = null;
      }
    }
  }

  if (!buffer) {
    if (file.path && /\.png$/i.test(file.path)) {
      buffer = fs.readFileSync(file.path);
    } else {
      throw new Error('Could not convert the dropped image to PNG. Please use a PNG/JPG/WebP image or save it manually.');
    }
  }

  fs.writeFileSync(targetPath, buffer);
  return targetPath;
}

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
    return;
  }

  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function replacePlaceholdersInMd(folder, replacements) {
  for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
    const full = path.join(folder, entry.name);
    if (entry.isDirectory()) {
      replacePlaceholdersInMd(full, replacements);
      continue;
    }
    if (!entry.name.toLowerCase().endsWith('.md')) continue;

    const original = fs.readFileSync(full, 'utf8');
    let updated = original;
    for (const [needle, value] of Object.entries(replacements)) {
      updated = updated.split(needle).join(value);
    }
    if (updated !== original) {
      fs.writeFileSync(full, updated, 'utf8');
    }
  }
}

function extractThemeInfo(themeText) {
  const lines = String(themeText || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const title = lines[0] || 'Untitled Theme';
  const referenceLines = lines.slice(1);
  const references = referenceLines.length ? referenceLines : ['- None provided'];
  const referenceBlock = references.map((line) => (line.startsWith('-') ? line : `- ${line}`)).join('\n');

  return {
    title,
    references,
    referenceBlock,
    compactTitle: title,
    slug: slugify(title),
    themeBlock: [
      `- Subject: ${title}`,
      referenceLines.length ? '- References:' : '- References: None provided',
      ...references.map((line) => (line.startsWith('-') ? line : `  - ${line}`)),
    ].join('\n'),
  };
}

function parseGuestDatabaseNames(dbText) {
  const names = [];
  const rows = String(dbText || '').split(/\r?\n/);
  for (const row of rows) {
    const match = row.match(/^\|\|\s*([^|]+?)\s*\|/);
    if (!match) continue;
    const name = match[1].trim();
    if (!name || name.toLowerCase() === 'guest') continue;
    if (!names.includes(name)) names.push(name);
  }
  names.sort((a, b) => a.localeCompare(b));
  return names;
}

function readTextIfExists(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    return '';
  }
}

function collectGuestNamesFromVault(vaultRoot) {
  const names = new Set();
  const seenFiles = new Set(['Podcast Guest Database.md', 'Podcast Guest Template.md']);
  const categoryMarker = /\[\[Podcast guests\]\]/i;

  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!entry.name.toLowerCase().endsWith('.md')) continue;
      if (seenFiles.has(entry.name)) continue;
      const text = readTextIfExists(full);
      if (!categoryMarker.test(text)) continue;
      if (/template/i.test(entry.name)) continue;
      names.add(path.basename(entry.name, '.md'));
    }
  }

  walk(path.join(vaultRoot, 'Notes'));
  walk(path.join(vaultRoot, 'Templates'));
  walk(path.join(vaultRoot, 'Categories'));
  return Array.from(names).sort((a, b) => a.localeCompare(b));
}

function normalizeGuestImageStem(guestName) {
  return String(guestName || '').replace(/[^a-z0-9]/gi, '');
}

function findGuestFacialReference(vaultRoot, guestName) {
  const stem = normalizeGuestImageStem(guestName);
  if (!stem) return null;
  const folder = path.join(vaultRoot, 'Attachments', 'Facial References');
  const extensions = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'avif'];
  for (const ext of extensions) {
    const candidate = path.join(folder, `${stem}.${ext}`);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

function toObsidianImageLink(vaultRoot, filePath) {
  if (!filePath) return '';
  return `![[${toObsidianPath(vaultRoot, filePath)}]]`;
}

function toObsidianLink(vaultRoot, filePath) {
  if (!filePath) return '';
  return `[[${toObsidianPath(vaultRoot, filePath)}]]`;
}

function buildStarterPrompts(preset, themeTitle, date, guestLabel, guestMode, references) {
  const core = [
    '## Starter prompts',
    `- Project type: ${preset.label}`,
    `- Theme: ${themeTitle}`,
    `- Date: ${date}`,
    `- Guest: ${guestLabel}`,
    `- Guest mode: ${guestMode}`,
    '',
    '### Core idea',
    '- What is the one-sentence thesis?',
    '- Why does this matter right now?',
    '- What does the audience want answered?',
    '',
    '### Angle and hook',
    '- What is the strongest angle?',
    '- What is the best opening line?',
    '- What is the most surprising fact or contrast?',
    '',
    '### References',
    ...references.map((line) => (line.startsWith('-') ? line : `- ${line}`)),
    '',
    '### Packaging',
    '- What are 3 title options?',
    '- What is the thumbnail concept?',
    '- What emotion should the packaging trigger?',
    '',
    '### CTA / outcome',
    '- What should the viewer do after watching?',
    '- What action should this content support?',
    '',
  ];

  if (preset.key === 'livestream') {
    core.push(
      '### Livestream-specific prompts',
      '- What is the live agenda?',
      '- What are the 3 breaking points or segments?',
      '- What audience questions should be collected live?',
      '- What is the moderator fallback if the news changes?',
      ''
    );
  } else if (preset.key === 'guest') {
    core.push(
      '### Guest-specific prompts',
      '- What is the guest\'s core credibility?',
      '- What claims need verification before recording?',
      '- What are the strongest follow-up questions?',
      '- What clip-worthy moments do we want?',
      ''
    );
  } else {
    core.push(
      '### Video-specific prompts',
      '- What are the strongest beats for the script?',
      '- Where can the story escalate visually?',
      '- What section should be cut into shorts?',
      ''
    );
  }

  core.push('### Notes', '-');
  return core.join('\n');
}

function buildAIPrompt({ preset, themeTitle, date, guestLabel, guestMode, guestDetailsBlock, guestFacialReferenceLink, references }) {
  const referenceBlock = references.length ? references.map((line) => (line.startsWith('-') ? line : `- ${line}`)).join('\n') : '- No references provided';
  const promptLines = [
    'You are an expert research, scripting, and packaging agent for a Portuguese-language YouTube channel focused on geopolitical analysis, urgent news, interviews, livestreams, and repurposing.',
    '',
    'Your job is to generate a full publish-ready content package from the inputs below and write concise, high-signal outputs only.',
    '',
    'Channel style:',
    '- Portuguese language',
    '- Analytical, urgent, journalistic, direct',
    '- Prefer strong hooks, clear framing, and high-utility packaging',
    '- Keep the description concise: target about 100 words max, not 200+',
    '- Make the title options sharp and clickable, not generic',
    '',
    'Inputs:',
    `- Project type: ${preset.label}`,
    `- Theme: ${themeTitle}`,
    `- Date: ${date}`,
    `- Guest: ${guestLabel}`,
    `- Guest mode: ${guestMode}`,
    guestDetailsBlock ? `- New guest details:\n${guestDetailsBlock}` : '- New guest details: None',
    `- Guest image: ${guestFacialReferenceLink || 'Not found yet'}`,
    `- References:\n${referenceBlock}`,
    '',
    'What to produce:',
    '1. A clear content angle and one-sentence thesis.',
    '2. Ten title options in Portuguese, ordered from strongest to safest.',
    '3. One final recommended title.',
    '4. A thumbnail concept with facial expression, background idea, and 3 short text options.',
    '5. A YouTube description of about 100 words max. Keep it tight and useful.',
    '6. 10 to 15 tags or keywords, plus 3 to 5 hashtags if appropriate.',
    '7. A hook / opening paragraph or run-of-show appropriate to the project type.',
    '8. If this is a guest project, add 10 core questions, 5 follow-ups, and 3 clip-worthy moments.',
    '9. If this is a livestream, add a segment outline with timing suggestions and live fallback prompts.',
    '10. If this is a solo video, add a short script skeleton with intro, middle, and ending.',
    '11. Produce a pinned comment draft.',
    '12. List any missing research gaps or risk flags.',
    '',
    'Rules:',
    '- Be concise and production-ready.',
    '- Use markdown headings.',
    '- Prefer practical outputs the creator can use immediately.',
    '- If a guest is new, include a short note recommending creation of a new guest note.',
    '- If the theme contains links, use them as references but do not repeat raw URLs unless useful.',
    '',
    'Output format:',
    '- Use headings for each deliverable.',
    '- Keep the answer short enough to paste back into the project folder.',
    '- Do not explain your process unless asked.',
  ];

  return promptLines.join('\n');
}

function appendStarterPromptsIfNeeded(targetDir, preset, themeTitle, date, guestLabel, guestMode, references) {
  const ideaPath = path.join(targetDir, '01 - Idea & Brief.md');
  if (!fs.existsSync(ideaPath)) return;

  const text = fs.readFileSync(ideaPath, 'utf8');
  const starterPrompts = buildStarterPrompts(preset, themeTitle, date, guestLabel, guestMode, references);
  if (text.includes('{{starter_prompts}}')) {
    fs.writeFileSync(ideaPath, text.split('{{starter_prompts}}').join(starterPrompts), 'utf8');
    return;
  }
  if (text.includes('## Starter prompts')) return;

  const seeded = `${text.trimEnd()}\n\n${starterPrompts}\n`;
  fs.writeFileSync(ideaPath, seeded, 'utf8');
}

function formatFacialReferenceFrontmatter(facialReferenceLink) {
  if (!facialReferenceLink) return 'facial_reference:';
  return `facial_reference: |\n  ${facialReferenceLink}`;
}

function updateGuestNoteWithImage(guestNotePath, facialReferenceLink) {
  if (!guestNotePath || !fs.existsSync(guestNotePath) || !facialReferenceLink) return;

  let text = fs.readFileSync(guestNotePath, 'utf8');
  const guestImageEmbed = facialReferenceLink.replace(/^\[\[/, '![[');

  const frontmatterTarget = /^facial_reference:[^\n]*(?:\n\s+.*)?/m;
  if (frontmatterTarget.test(text)) {
    text = text.replace(frontmatterTarget, formatFacialReferenceFrontmatter(facialReferenceLink));
  } else if (/^status:/m.test(text)) {
    text = text.replace(/^status:.*$/m, (match) => `${match}\n${formatFacialReferenceFrontmatter(facialReferenceLink)}`);
  } else {
    text = `${text.trimEnd()}\n${formatFacialReferenceFrontmatter(facialReferenceLink)}\n`;
  }

  if (/^- (Guest image|Facial reference):/m.test(text)) {
    text = text.replace(/^- (Guest image|Facial reference):.*$/m, `- Guest image: ${guestImageEmbed}`);
  } else if (/^## Research/m.test(text)) {
    text = text.replace(/^## Research/m, `- Guest image: ${guestImageEmbed}\n\n## Research`);
  } else if (/^## Snapshot/m.test(text)) {
    text = text.replace(/^## Snapshot\n/m, `## Snapshot\n- Guest image: ${guestImageEmbed}\n`);
  } else {
    text = `${text.trimEnd()}\n\n- Guest image: ${guestImageEmbed}\n`;
  }

  fs.writeFileSync(guestNotePath, text, 'utf8');
}

function createOrUpdateGuestNote(vaultRoot, guestDetails, settings, guestImagePath = null) {
  const guestName = String(guestDetails?.name || '').trim();
  const guestCountry = String(guestDetails?.country || '').trim() || 'TBD';
  const guestProfession = String(guestDetails?.profession || '').trim() || 'TBD';
  const guestLanguage = String(guestDetails?.language || '').trim() || 'TBD';
  const facialReferencePath = guestImagePath || findGuestFacialReference(vaultRoot, guestName);
  const facialReferenceLink = toObsidianLink(vaultRoot, facialReferencePath);
  const facialReferenceEmbed = facialReferenceLink ? facialReferenceLink.replace(/^\[\[/, '![[') : '';
  const safeGuestName = sanitizeWindowsFilename(guestName);
  const guestNotePath = path.join(vaultRoot, 'Notes', `${safeGuestName}.md`);
  const guestTemplatePath = path.join(vaultRoot, settings.guestTemplatePath);
  const frontmatter = [
    '---',
    'categories:',
    '  - "[[Podcast guests]]"',
    '  - "[[People]]"',
    'status: prospect',
    `country: ${guestCountry === 'TBD' ? '' : guestCountry}`,
    `language: ${guestLanguage === 'TBD' ? '' : guestLanguage}`,
    `profession: ${guestProfession === 'TBD' ? '' : guestProfession}`,
    formatFacialReferenceFrontmatter(facialReferenceLink),
    'podcast_fit: ',
    'last_contact: ',
    'next_episode: ',
    '---',
    '',
  ].join('\n');
  const snapshot = [
    `# ${guestName}`,
    '',
    '## Snapshot',
    `- Country: ${guestCountry}`,
    `- Language: ${guestLanguage}`,
    `- Profession: ${guestProfession}`,
    `- Guest image: ${facialReferenceEmbed || 'Not found yet'}`,
    '- Why this guest matters:',
    '- Best episode angle:',
    '- Trust level:',
    '- Contact:',
    '',
    '## Research',
    '- [ ] Bio checked',
    '- [ ] Recent interviews reviewed',
    '- [ ] Key opinions summarized',
    '- [ ] Controversies / risk flags noted',
    '- [ ] Visual cues / thumbnail cues noted',
    '',
    '## Interview prep',
    '- [ ] 10 core questions',
    '- [ ] 5 follow-up questions',
    '- [ ] 3 clip-worthy answers to hunt for',
    '- [ ] 1 opening question',
    '- [ ] 1 closing question',
    '- [ ] Guest-specific thumbnail idea',
    '',
    '## Post-episode',
    '- [ ] Thank-you message',
    '- [ ] Share links',
    '- [ ] Clip candidates',
    '- [ ] Follow-up invite',
    '',
  ].join('\n');

  if (fs.existsSync(guestNotePath)) {
    if (facialReferenceLink) {
      updateGuestNoteWithImage(guestNotePath, facialReferenceLink);
    }
    return guestNotePath;
  }

  if (fs.existsSync(guestTemplatePath)) {
    const templateText = fs.readFileSync(guestTemplatePath, 'utf8');
    const generated = templateText
      .split('{{Guest Name}}').join(guestName)
      .split('{{Country}}').join(guestCountry)
      .split('{{Profession}}').join(guestProfession)
      .split('{{Language}}').join(guestLanguage)
      .split('{{Facial Reference}}').join(facialReferenceLink)
      .split('{{Guest Image}}').join(facialReferenceEmbed)
      .split('{{country}}').join(guestCountry)
      .split('{{profession}}').join(guestProfession)
      .split('{{language}}').join(guestLanguage)
      .split('{{facial_reference}}').join(facialReferenceLink);
    fs.writeFileSync(guestNotePath, generated, 'utf8');
    return guestNotePath;
  }

  fs.writeFileSync(guestNotePath, `${frontmatter}\n${snapshot}`, 'utf8');
  return guestNotePath;
}

function appendGuestToDatabase(vaultRoot, guestDetails, settings) {
  const dbPath = path.join(vaultRoot, settings.guestDatabaseNote);
  if (!fs.existsSync(dbPath)) return;

  const guestName = String(guestDetails?.name || '').trim();
  if (!guestName) return;

  const original = fs.readFileSync(dbPath, 'utf8');
  const guestCountry = String(guestDetails?.country || '').trim() || 'TBD';
  const guestProfession = String(guestDetails?.profession || '').trim() || 'TBD';
  const guestLanguage = String(guestDetails?.language || '').trim() || 'TBD';
  const facialReferencePath = findGuestFacialReference(vaultRoot, guestName);
  const facialReferenceLink = facialReferencePath ? toObsidianImageLink(vaultRoot, facialReferencePath) : '—';
  const compiled = `- [[${guestName}]] | Country: ${guestCountry} | Profession: ${guestProfession} | Language: ${guestLanguage} | Guest image: ${facialReferenceLink} | Status: prospect | Next step: Review and enrich`;

  const existingBullet = new RegExp(`^- \\s*\\[\\[${escapeRegExp(guestName)}\\]\\].*$`, 'm');
  const existingRow = new RegExp(`^\\|\\s*${escapeRegExp(guestName)}\\s*\\|.*$`, 'm');

  if (existingBullet.test(original)) {
    const updated = original.replace(existingBullet, compiled);
    fs.writeFileSync(dbPath, updated, 'utf8');
    return;
  }

  if (existingRow.test(original)) {
    const updated = original.replace(existingRow, `| ${guestName} | prospect | ${guestCountry === 'TBD' ? '' : guestCountry} | ${facialReferenceLink} | ${guestProfession} | Review and enrich |`);
    fs.writeFileSync(dbPath, updated, 'utf8');
    return;
  }

  const insertAfter = '## Guest pipeline';
  if (original.includes(insertAfter)) {
    const nextHeadingIndex = original.indexOf('## Guest note links');
    if (nextHeadingIndex !== -1) {
      const before = original.slice(0, nextHeadingIndex).trimEnd();
      const after = original.slice(nextHeadingIndex).trimStart();
      const updated = `${before}\n${compiled}\n\n${after}`;
      fs.writeFileSync(dbPath, updated, 'utf8');
      return;
    }
  }

  fs.writeFileSync(dbPath, `${original.trimEnd()}\n\n${compiled}\n`, 'utf8');
}

function addGuestLinkToDatabase(vaultRoot, guestName, settings) {
  const dbPath = path.join(vaultRoot, settings.guestDatabaseNote);
  if (!fs.existsSync(dbPath)) return;

  let text = fs.readFileSync(dbPath, 'utf8');
  const link = `- [[${guestName}]]`;
  if (text.includes(link)) return;

  const heading = '## Guest note links';
  const idx = text.indexOf(heading);
  if (idx === -1) {
    fs.writeFileSync(dbPath, `${text.trimEnd()}\n\n${heading}\n${link}\n`, 'utf8');
    return;
  }

  const afterHeading = text.indexOf('\n', idx);
  const insertAt = afterHeading === -1 ? text.length : afterHeading + 1;
  const before = text.slice(0, insertAt).trimEnd();
  const after = text.slice(insertAt).trimStart();
  const updated = `${before}\n${link}\n${after}`;
  fs.writeFileSync(dbPath, updated, 'utf8');
}

function appendGuestToCategoryNote(vaultRoot, guestDetails) {
  const guestName = String(guestDetails?.name || '').trim();
  if (!guestName) return;

  const categoryPath = path.join(vaultRoot, 'Categories', 'Podcast guests.md');
  if (!fs.existsSync(categoryPath)) return;

  const country = String(guestDetails?.country || '').trim() || 'TBD';
  const profession = String(guestDetails?.profession || '').trim() || 'TBD';
  const language = String(guestDetails?.language || '').trim() || 'TBD';
  const facialReferencePath = findGuestFacialReference(vaultRoot, guestName);
  const facialReferenceLink = facialReferencePath ? toObsidianImageLink(vaultRoot, facialReferencePath) : '—';
  const line = `- [[${guestName}]] — Country: ${country} | Profession: ${profession} | Language: ${language} | Guest image: ${facialReferenceLink}`;

  let text = fs.readFileSync(categoryPath, 'utf8');
  const existingLine = new RegExp(`^- \\[\\[${escapeRegExp(guestName)}\\]\\].*$`, 'm');
  if (existingLine.test(text)) {
    text = text.replace(existingLine, line);
    fs.writeFileSync(categoryPath, text, 'utf8');
    return;
  }

  const heading = '## Recently added guests';
  if (!text.includes(heading)) {
    text = `${text.trimEnd()}\n\n${heading}\n${line}\n`;
    fs.writeFileSync(categoryPath, text, 'utf8');
    return;
  }

  const idx = text.indexOf(heading);
  const afterHeading = text.indexOf('\n', idx);
  const insertAt = afterHeading === -1 ? text.length : afterHeading + 1;
  const before = text.slice(0, insertAt).trimEnd();
  const after = text.slice(insertAt).trimStart();
  const updated = `${before}\n${line}\n${after}`;
  fs.writeFileSync(categoryPath, updated, 'utf8');
}

function buildGuestOptions(vaultRoot, settings) {
  const dbPath = path.join(vaultRoot, settings.guestDatabaseNote);
  const dbText = readTextIfExists(dbPath);
  const guestNames = new Set([
    ...parseGuestDatabaseNames(dbText),
    ...collectGuestNamesFromVault(vaultRoot),
  ]);
  return Array.from(guestNames).sort((a, b) => a.localeCompare(b));
}

class NewVideoProjectModal extends Modal {
  constructor(app, onSubmit, settings, defaultType = 'video') {
    super(app);
    this.onSubmit = onSubmit;
    this.settings = settings;
    this.typeValue = TYPE_PRESETS[defaultType] ? defaultType : 'video';
    this.themeValue = '';
    this.guestValue = 'none';
    this.newGuestNameValue = '';
    this.newGuestCountryValue = '';
    this.newGuestProfessionValue = '';
    this.newGuestLanguageValue = '';
    this.dateValue = localDateString();
    this.themeInput = null;
    this.newGuestNameInput = null;
    this.newGuestCountryInput = null;
    this.newGuestProfessionInput = null;
    this.newGuestLanguageInput = null;
    this.dateInput = null;
    this.guestDropdown = null;
    this.guestOptions = [];
    this.newGuestImageFile = null;
    this.newGuestImageLabel = 'No image selected';
    this.newGuestImageInput = null;
    this.newGuestImageStatus = null;
  }

  onOpen() {
    const { contentEl } = this;
    const preset = getTypePreset(this.typeValue);

    this.guestOptions = Array.from(new Set(['none', 'new', ...this.guestOptions]));

    contentEl.empty();
    contentEl.createEl('h2', { text: `Create New ${preset.label} Project` });
    contentEl.createEl('p', {
      text: 'Fill in the project type, theme, guest, and date. The plugin will create the full folder, seed the idea note, and generate an AI prompt file.',
    });

    new Setting(contentEl)
      .setName('Project type')
      .setDesc('Choose the default content format for this launch')
      .addDropdown((dropdown) => {
        dropdown
          .addOption('video', 'Video')
          .addOption('livestream', 'Livestream')
          .addOption('guest', 'Guest episode')
          .setValue(this.typeValue)
          .onChange((value) => {
            this.typeValue = value;
            const nextPreset = getTypePreset(value);
            if (this.themeInput) {
              this.themeInput.setPlaceholder(nextPreset.placeholderTheme);
            }
          });
      });

    new Setting(contentEl)
      .setName('Theme')
      .setDesc('Subject plus any reference links or notes')
      .addTextArea((text) => {
        text.setPlaceholder(preset.placeholderTheme);
        text.setValue(this.themeValue);
        text.inputEl.rows = 4;
        this.themeInput = text;
        text.onChange((value) => {
          this.themeValue = value;
        });
      });

    new Setting(contentEl)
      .setName('Guest')
      .setDesc('Choose none, an existing guest, or new to enter fresh details')
      .addDropdown((dropdown) => {
        this.guestDropdown = dropdown;
        dropdown.addOption('none', 'none');
        dropdown.addOption('new', 'new');
        for (const name of this.guestOptions) {
          if (name === 'none' || name === 'new') continue;
          dropdown.addOption(name, name);
        }
        dropdown.setValue(this.guestValue).onChange((value) => {
          this.guestValue = value;
        });
      });

    contentEl.createEl('h3', { text: 'New guest details' });
    contentEl.createEl('p', { text: 'Fill these fields only when Guest is set to new. The plugin will compile them into the new guest note and the project prompt.' });

    new Setting(contentEl)
      .setName('Name')
      .setDesc('Required when creating a new guest')
      .addText((text) => {
        text.setPlaceholder('New guest name');
        text.setValue(this.newGuestNameValue);
        this.newGuestNameInput = text;
        text.onChange((value) => {
          this.newGuestNameValue = value;
        });
      });

    new Setting(contentEl)
      .setName('Country')
      .setDesc('Country or region for the guest')
      .addText((text) => {
        text.setPlaceholder('Country');
        text.setValue(this.newGuestCountryValue);
        this.newGuestCountryInput = text;
        text.onChange((value) => {
          this.newGuestCountryValue = value;
        });
      });

    new Setting(contentEl)
      .setName('Profession')
      .setDesc('What the guest is known for')
      .addText((text) => {
        text.setPlaceholder('Profession');
        text.setValue(this.newGuestProfessionValue);
        this.newGuestProfessionInput = text;
        text.onChange((value) => {
          this.newGuestProfessionValue = value;
        });
      });

    new Setting(contentEl)
      .setName('Language')
      .setDesc('Primary language for the guest note')
      .addText((text) => {
        text.setPlaceholder('Language');
        text.setValue(this.newGuestLanguageValue);
        this.newGuestLanguageInput = text;
        text.onChange((value) => {
          this.newGuestLanguageValue = value;
        });
      });

    contentEl.createEl('h3', { text: 'Guest Image' });
    const guestImageDropzone = contentEl.createDiv({ cls: 'new-video-project-guest-image-dropzone' });
    guestImageDropzone.style.border = '2px dashed var(--background-modifier-border)';
    guestImageDropzone.style.borderRadius = '10px';
    guestImageDropzone.style.padding = '14px';
    guestImageDropzone.style.margin = '0 0 16px 0';
    guestImageDropzone.style.cursor = 'pointer';
    guestImageDropzone.style.textAlign = 'center';
    guestImageDropzone.style.background = 'var(--background-secondary)';

    const guestImageTitle = guestImageDropzone.createEl('div', { text: 'Drop image here or click to browse' });
    guestImageTitle.style.fontWeight = '600';
    guestImageTitle.style.marginBottom = '6px';
    const guestImageHint = guestImageDropzone.createEl('div', { text: 'This will be saved as PNG in Attachments/Facial References using the guest name.' });
    guestImageHint.style.opacity = '0.8';
    guestImageHint.style.fontSize = '0.9em';
    const guestImageStatus = guestImageDropzone.createEl('div', { text: this.newGuestImageLabel });
    guestImageStatus.style.marginTop = '8px';
    guestImageStatus.style.fontStyle = 'italic';
    this.newGuestImageStatus = guestImageStatus;

    const guestImageInput = guestImageDropzone.createEl('input');
    guestImageInput.type = 'file';
    guestImageInput.accept = 'image/*';
    guestImageInput.style.display = 'none';
    this.newGuestImageInput = guestImageInput;

    const setGuestImage = (file) => {
      if (!file) return;
      if (file.type && !file.type.startsWith('image/')) {
        new Notice('Please drop an image file for the guest photo.');
        return;
      }
      this.newGuestImageFile = file;
      this.newGuestImageLabel = file.name;
      if (this.newGuestImageStatus) {
        this.newGuestImageStatus.setText(`Selected: ${file.name}`);
      }
      new Notice(`Guest image selected: ${file.name}`);
    };

    guestImageDropzone.addEventListener('click', () => guestImageInput.click());
    guestImageInput.addEventListener('change', () => {
      const file = guestImageInput.files?.[0];
      if (file) setGuestImage(file);
    });
    guestImageDropzone.addEventListener('dragover', (event) => {
      event.preventDefault();
      guestImageDropzone.style.borderColor = 'var(--text-accent)';
      guestImageDropzone.style.background = 'var(--background-modifier-hover)';
    });
    guestImageDropzone.addEventListener('dragleave', () => {
      guestImageDropzone.style.borderColor = 'var(--background-modifier-border)';
      guestImageDropzone.style.background = 'var(--background-secondary)';
    });
    guestImageDropzone.addEventListener('drop', (event) => {
      event.preventDefault();
      guestImageDropzone.style.borderColor = 'var(--background-modifier-border)';
      guestImageDropzone.style.background = 'var(--background-secondary)';
      const file = event.dataTransfer?.files?.[0];
      if (file) setGuestImage(file);
    });

    new Setting(contentEl)
      .setName('Date')
      .setDesc('Choose a date from the calendar')
      .addText((text) => {
        this.dateInput = text;
        text.inputEl.type = 'date';
        text.setValue(this.dateValue);
        text.onChange((value) => {
          this.dateValue = value || localDateString();
        });
      });

    new Setting(contentEl)
      .addButton((button) => {
        button.setButtonText('Create project').setCta().onClick(() => {
          const theme = this.themeValue.trim();
          if (!theme) {
            new Notice('Please enter a theme first.');
            return;
          }

          const guestMode = this.guestValue;
          const newGuestName = this.newGuestNameValue.trim();
          const newGuestCountry = this.newGuestCountryValue.trim();
          const newGuestProfession = this.newGuestProfessionValue.trim();
          const newGuestLanguage = this.newGuestLanguageValue.trim();
          if (guestMode === 'new' && !newGuestName) {
            new Notice('Please enter the new guest name.');
            return;
          }

          this.close();
          this.onSubmit({
            theme,
            guestMode,
            newGuest: {
              name: newGuestName,
              country: newGuestCountry,
              profession: newGuestProfession,
              language: newGuestLanguage,
              imageFile: this.newGuestImageFile,
            },
            date: this.dateValue || localDateString(),
            typeKey: this.typeValue,
          });
        });
      })
      .addButton((button) => {
        button.setButtonText('Cancel').onClick(() => this.close());
      });
  }

  onClose() {
    this.contentEl.empty();
  }
}

class NewVideoProjectLauncherSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl('h2', { text: 'New Video Project Launcher' });

    new Setting(containerEl)
      .setName('Template folder')
      .setDesc('Folder copied for every new project')
      .addText((text) => {
        text.setValue(this.plugin.settings.templateFolder);
        text.onChange(async (value) => {
          this.plugin.settings.templateFolder = value.trim();
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName('Projects root')
      .setDesc('Parent folder where year folders are created')
      .addText((text) => {
        text.setValue(this.plugin.settings.projectsRoot);
        text.onChange(async (value) => {
          this.plugin.settings.projectsRoot = value.trim();
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName('Guest database note')
      .setDesc('Path to the guest database note used for the guest dropdown')
      .addText((text) => {
        text.setValue(this.plugin.settings.guestDatabaseNote);
        text.onChange(async (value) => {
          this.plugin.settings.guestDatabaseNote = value.trim();
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName('Guest template path')
      .setDesc('Template used when creating a new guest note')
      .addText((text) => {
        text.setValue(this.plugin.settings.guestTemplatePath);
        text.onChange(async (value) => {
          this.plugin.settings.guestTemplatePath = value.trim();
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName('Open project folder in explorer')
      .setDesc('Show the new folder in the system file explorer after creation')
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.openFolderAfterCreate);
        toggle.onChange(async (value) => {
          this.plugin.settings.openFolderAfterCreate = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName('Open hub note after create')
      .setDesc('Automatically open 00 - Project Hub.md after the folder is created')
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.openHubAfterCreate);
        toggle.onChange(async (value) => {
          this.plugin.settings.openHubAfterCreate = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName('Seed idea note with prompts')
      .setDesc('Add a starter prompt block to 01 - Theme & Brief.md')
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.seedStarterPrompts);
        toggle.onChange(async (value) => {
          this.plugin.settings.seedStarterPrompts = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName('Create AI prompt note')
      .setDesc('Generate 09 - AI Generation Prompt.md inside the project folder')
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.createAIPromptFile);
        toggle.onChange(async (value) => {
          this.plugin.settings.createAIPromptFile = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName('Copy AI prompt to clipboard')
      .setDesc('Copy the generated prompt so you can paste it into Hermes, Codex, or another agent')
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.copyAIPromptToClipboard);
        toggle.onChange(async (value) => {
          this.plugin.settings.copyAIPromptToClipboard = value;
          await this.plugin.saveSettings();
        });
      });
  }
}

module.exports = class NewVideoProjectLauncherPlugin extends Plugin {
  async onload() {
    await this.loadSettings();

    this.addRibbonIcon('video', 'Create New Video Project', () => {
      this.openLauncher('video');
    });

    this.addRibbonIcon('radio', 'Create New Livestream Project', () => {
      this.openLauncher('livestream');
    });

    this.addRibbonIcon('mic', 'Create New Guest Episode Project', () => {
      this.openLauncher('guest');
    });

    this.addCommand({
      id: 'create-new-video-project',
      name: 'Create New Video Project',
      callback: () => this.openLauncher('video'),
    });

    this.addCommand({
      id: 'create-new-livestream-project',
      name: 'Create New Livestream Project',
      callback: () => this.openLauncher('livestream'),
    });

    this.addCommand({
      id: 'create-new-guest-episode-project',
      name: 'Create New Guest Episode Project',
      callback: () => this.openLauncher('guest'),
    });

    this.addSettingTab(new NewVideoProjectLauncherSettingTab(this.app, this));
  }

  onunload() {}

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  openLauncher(defaultType = 'video') {
    const guestNames = buildGuestOptions(getVaultRoot(this.app), this.settings);
    const modal = new NewVideoProjectModal(this.app, async ({ theme, guestMode, newGuest, date, typeKey }) => {
      try {
        const preset = getTypePreset(typeKey);
        const vaultRoot = getVaultRoot(this.app);
        if (!vaultRoot) {
          new Notice('Could not find the vault root.');
          return;
        }

        const templateFolder = path.join(vaultRoot, this.settings.templateFolder);
        if (!fs.existsSync(templateFolder)) {
          new Notice(`Template folder not found: ${this.settings.templateFolder}`);
          return;
        }

        const themeInfo = extractThemeInfo(theme);
        const normalizedDate = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : localDateString();
        const year = normalizedDate.slice(0, 4);
        const projectsRoot = path.join(vaultRoot, this.settings.projectsRoot, year);
        fs.mkdirSync(projectsRoot, { recursive: true });

        const safeThemeTitle = sanitizeWindowsFilename(themeInfo.title);
        const projectSlug = slugify(safeThemeTitle);
        const baseName = `${normalizedDate} - ${projectSlug}`;
        let targetDir = path.join(projectsRoot, baseName);
        let suffix = 2;
        while (fs.existsSync(targetDir)) {
          targetDir = path.join(projectsRoot, `${baseName}-${suffix}`);
          suffix += 1;
        }

        copyRecursive(templateFolder, targetDir);

        const guestRawName = guestMode === 'new' ? String(newGuest?.name || '').trim() : guestMode;
        const guestCountry = guestMode === 'new' ? String(newGuest?.country || '').trim() || 'TBD' : '';
        const guestProfession = guestMode === 'new' ? String(newGuest?.profession || '').trim() || 'TBD' : '';
        const guestLanguage = guestMode === 'new' ? String(newGuest?.language || '').trim() || 'TBD' : '';
        const guestImageFile = guestMode === 'new' ? (newGuest?.imageFile || null) : null;
        let guestImagePath = null;
        if (guestMode === 'new' && guestImageFile) {
          guestImagePath = await saveGuestFacialReferenceImage(vaultRoot, guestRawName, guestImageFile);
        }
        const guestLabel = guestMode === 'new' ? guestRawName : guestMode;
        const guestFacialReferencePath = guestMode === 'new'
          ? (guestImagePath || findGuestFacialReference(vaultRoot, guestRawName))
          : guestMode === 'none'
            ? null
            : findGuestFacialReference(vaultRoot, guestMode);
        const guestFacialReferenceLink = guestFacialReferencePath ? toObsidianImageLink(vaultRoot, guestFacialReferencePath) : '—';
        const guestDetailsBlock = guestMode === 'new'
          ? [
              `- Name: ${guestRawName || 'TBD'}`,
              `- Country: ${guestCountry}`,
              `- Profession: ${guestProfession}`,
              `- Language: ${guestLanguage}`,
              `- Guest image: ${guestFacialReferenceLink}`,
            ].join('\n')
          : '';
        const guestNoteLink = guestMode === 'new' ? `[[${sanitizeWindowsFilename(guestRawName)}]]` : guestMode === 'none' ? 'none' : `[[${guestMode}]]`;
        const aiPrompt = buildAIPrompt({
          preset,
          themeTitle: themeInfo.title,
          date: normalizedDate,
          guestLabel,
          guestMode,
          guestDetailsBlock,
          guestFacialReferenceLink,
          references: themeInfo.references,
        });

        replacePlaceholdersInMd(targetDir, {
          '{{Video Title}}': safeThemeTitle,
          '{{project_name}}': safeThemeTitle,
          '{{theme}}': themeInfo.title,
          '{{theme_title}}': themeInfo.title,
          '{{theme_summary}}': themeInfo.title,
          '{{theme_block}}': themeInfo.themeBlock,
          '{{reference_links}}': themeInfo.referenceBlock,
          '{{date}}': normalizedDate,
          '{{type}}': preset.typeValue,
          '{{content_type}}': preset.typeValue,
          '{{content_type_label}}': preset.label,
          '{{project_type_label}}': preset.label,
          '{{project_kind}}': preset.key,
          '{{guest}}': guestLabel,
          '{{guest_label}}': guestLabel,
          '{{guest_mode}}': guestMode,
          '{{guest_note_link}}': guestNoteLink,
          '{{guest_details}}': guestDetailsBlock,
          '{{guest_facial_reference}}': guestFacialReferenceLink,
          '{{starter_prompts}}': buildStarterPrompts(preset, themeInfo.title, normalizedDate, guestLabel, guestMode, themeInfo.references),
          '{{ai_generation_prompt}}': aiPrompt,
        });

        if (this.settings.createAIPromptFile) {
          const aiPromptPath = path.join(targetDir, '09 - AI Generation Prompt.md');
          if (!fs.existsSync(aiPromptPath)) {
            fs.writeFileSync(aiPromptPath, `---\nstatus: draft\n---\n\n# AI Generation Prompt\n\n## Inputs\n- Project type: ${preset.label}\n- Theme: ${themeInfo.title}\n- Date: ${normalizedDate}\n- Guest: ${guestLabel}\n- Guest mode: ${guestMode}\n- References:\n${themeInfo.referenceBlock}\n\n## Ready-to-run prompt\n\n${aiPrompt}\n\n## Usage\n- Paste this into Hermes Agent, Codex, OpenCode, or another assistant.\n- Use the outputs to fill the project notes.\n- Keep the result saved here for future reference.\n`, 'utf8');
          }
        }

        appendStarterPromptsIfNeeded(targetDir, preset, themeInfo.title, normalizedDate, guestLabel, guestMode, themeInfo.references);

        if (guestMode === 'new') {
          createOrUpdateGuestNote(vaultRoot, newGuest, this.settings, guestImagePath);
          appendGuestToDatabase(vaultRoot, newGuest, this.settings);
          appendGuestToCategoryNote(vaultRoot, newGuest);
          addGuestLinkToDatabase(vaultRoot, newGuest.name, this.settings);
        }

        if (clipboard && this.settings.copyAIPromptToClipboard) {
          clipboard.writeText(aiPrompt);
        }

        new Notice(`Created project: ${baseName}`);
        if (this.settings.copyAIPromptToClipboard && clipboard) {
          new Notice('AI prompt copied to clipboard.');
        }

        if (this.settings.openFolderAfterCreate && shell?.showItemInFolder) {
          shell.showItemInFolder(targetDir);
        }

        if (this.settings.openHubAfterCreate) {
          const hubPath = path.join(targetDir, '00 - Project Hub.md');
          const relativeHubPath = toObsidianPath(vaultRoot, hubPath);
          const file = this.app.vault.getAbstractFileByPath(relativeHubPath);
          if (file) {
            const leaf = this.app.workspace.getLeaf(false);
            await leaf.openFile(file);
          }
        }
      } catch (error) {
        console.error(error);
        new Notice(`Failed to create project: ${error.message}`);
      }
    }, this.settings, defaultType);

    modal.guestOptions = guestNames;
    modal.open();
  }
};
