type NormalizeOptions = {
  month: string;
};

const isHeadingLine = (line: string) => /^#{1,6}\s+/.test(line.trim());

const isSpaceShortcode = (line: string) => line.trim() === '{{< space >}}';

const isFaqHeading = (line: string) => /^#{1,6}\s*FAQ\b/i.test(line.trim());

const isLinkOnlyLine = (line: string) => /^\s*\[[^\]]+]\([^)]+\)\s*$/.test(line);

const isListItem = (line: string) => /^\s*[-*]\s+/.test(line);

const isShortcodeLine = (line: string) => line.trim().startsWith('{{<');

const isPanelBlockStart = (line: string) => line.trim().startsWith('[chart]');

const isBlockLine = (line: string) => {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (isHeadingLine(trimmed)) return true;
  if (isListItem(trimmed)) return true;
  if (isShortcodeLine(trimmed)) return true;
  if (trimmed.startsWith('[')) return true;
  if (trimmed.startsWith('>')) return true;
  if (trimmed.startsWith('```')) return true;
  return false;
};

const replaceTablePanelBlocks = (body: string, month: string) => {
  const lines = body.split('\n');
  const output: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (isPanelBlockStart(line)) {
      let j = i + 1;
      let hasTablePanel = false;
      for (; j < lines.length; j += 1) {
        const raw = lines[j];
        const trimmed = raw.trim();
        if (!trimmed) continue;
        if (!trimmed.startsWith('[') && !trimmed.includes('=')) break;
        if (trimmed.includes('table_panel')) hasTablePanel = true;
      }
      if (hasTablePanel) {
        output.push(`{{< itmarket_table type="compare" month="${month}" >}}`);
        i = j;
        continue;
      }
    }
    output.push(line);
    i += 1;
  }
  return output.join('\n');
};

const normalizeLinks = (body: string) => {
  return body.replace(/\]\(([^)]+)\)/g, (match, href) => {
    const trimmed = String(href).trim();
    if (!trimmed) return match;
    const lower = trimmed.toLowerCase();
    if (lower.startsWith('mailto:')) return match;
    if (lower === 'https://dietechrecruiter.de/jobs' || lower === 'https://dietechrecruiter.de/jobs/') {
      return `](https://dietechrecruiter.de/jobs#jobboard)`;
    }
    if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed)) {
      return `](mailto:${trimmed})`;
    }
    return match;
  });
};

const normalizeShortcodes = (body: string, month: string) => {
  const chartRegex = /\{\{<\s*chart_itmarket_all([^>]*)>\}\}/g;
  const tableRegex = /\{\{<\s*itmarket_table([^>]*)>\}\}/g;
  let output = body.replace(chartRegex, (_match, attrs) => {
    const hasTo = /to="[^"]*"/.test(attrs);
    const nextAttrs = hasTo ? attrs.replace(/to="[^"]*"/, `to="${month}"`) : `${attrs} to="${month}"`;
    return `{{< chart_itmarket_all${nextAttrs} >}}`;
  });
  output = output.replace(tableRegex, (match, attrs) => {
    if (!/type="compare"/.test(attrs)) return match;
    const hasMonth = /month="[^"]*"/.test(attrs);
    const nextAttrs = hasMonth ? attrs.replace(/month="[^"]*"/, `month="${month}"`) : `${attrs} month="${month}"`;
    return `{{< itmarket_table${nextAttrs} >}}`;
  });
  return output;
};

const mergeWrappedLines = (lines: string[]) => {
  const output: string[] = [];
  let inCodeBlock = false;

  for (let i = 0; i < lines.length; i += 1) {
    let line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      output.push(line);
      continue;
    }
    if (inCodeBlock) {
      output.push(line);
      continue;
    }
    if (!trimmed) {
      output.push(line);
      continue;
    }
    if (isBlockLine(line) || isLinkOnlyLine(line)) {
      output.push(line);
      continue;
    }

    while (i + 1 < lines.length) {
      const nextLine = lines[i + 1];
      const nextTrimmed = nextLine.trim();
      if (!nextTrimmed) break;
      if (isBlockLine(nextLine) || isLinkOnlyLine(nextLine)) break;
      if (line.endsWith('  ')) break;
      line = `${line.trim()} ${nextLine.trim()}`;
      i += 1;
    }

    output.push(line);
  }

  return output;
};

export const normalizeBody = (body: string, options: NormalizeOptions) => {
  const withPanels = replaceTablePanelBlocks(body, options.month);
  const lines = withPanels.split('\n');
  const normalizedLines: string[] = [];
  let inCodeBlock = false;

  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i];
    const trimmed = raw.trim();

    if (trimmed.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      normalizedLines.push(raw);
      continue;
    }
    if (inCodeBlock) {
      normalizedLines.push(raw);
      continue;
    }
    if (isFaqHeading(raw)) {
      continue;
    }

    if (trimmed.startsWith('# ') && !trimmed.startsWith('## ')) {
      normalizedLines.push(raw.replace(/^#\s+/, '## '));
      continue;
    }

    if (isSpaceShortcode(raw)) {
      let j = normalizedLines.length - 1;
      while (j >= 0 && !normalizedLines[j].trim()) j -= 1;
      if (j >= 0 && isHeadingLine(normalizedLines[j])) {
        continue;
      }
    }

    if (isLinkOnlyLine(raw) && !isListItem(raw)) {
      normalizedLines.push(`- ${raw.trim()}`);
      continue;
    }

    normalizedLines.push(raw);
  }

  const mergedLines = mergeWrappedLines(normalizedLines);
  const mergedBody = mergedLines.join('\n');
  const withLinks = normalizeLinks(mergedBody);
  const withShortcodes = normalizeShortcodes(withLinks, options.month);
  return withShortcodes.replace(/\n{3,}/g, '\n\n').trim();
};
