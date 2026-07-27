/**
 * Build a clean, branded Puurga post card image.
 * Avoids html2canvas CSS-variable issues (names often invisible/cut).
 */

export interface PostCaptureData {
  authorName: string;
  authorUsername?: string;
  authorAvatar?: string;
  content?: string;
  images?: string[];
  createdLabel?: string;
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!src) {
      resolve(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => {
      // Retry without CORS (may taint canvas — we still try)
      const fallback = new Image();
      fallback.onload = () => resolve(fallback);
      fallback.onerror = () => resolve(null);
      fallback.src = src;
    };
    img.src = src;
  });
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  _lineHeight: number,
  maxLines = 12
): string[] {
  const paragraphs = String(text || '')
    .replace(/\r\n/g, '\n')
    .split('\n');
  const lines: string[] = [];

  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) {
      lines.push('');
      if (lines.length >= maxLines) break;
      continue;
    }
    const words = paragraph.split(/\s+/);
    let current = '';
    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      if (ctx.measureText(test).width <= maxWidth) {
        current = test;
      } else {
        if (current) lines.push(current);
        // Hard-break very long words
        if (ctx.measureText(word).width > maxWidth) {
          let chunk = '';
          for (const ch of word) {
            const next = chunk + ch;
            if (ctx.measureText(next).width > maxWidth) {
              if (chunk) lines.push(chunk);
              chunk = ch;
            } else {
              chunk = next;
            }
          }
          current = chunk;
        } else {
          current = word;
        }
      }
      if (lines.length >= maxLines) break;
    }
    if (current && lines.length < maxLines) lines.push(current);
    if (lines.length >= maxLines) break;
  }

  if (lines.length >= maxLines) {
    const last = lines[maxLines - 1];
    lines[maxLines - 1] = last.length > 3 ? `${last.slice(0, -3)}…` : `${last}…`;
  }
  return lines;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawCircleImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | null,
  cx: number,
  cy: number,
  size: number,
  fallbackLetter: string,
  isDark: boolean
) {
  const r = size / 2;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  if (img) {
    // Cover-fit
    const scale = Math.max(size / img.width, size / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
  } else {
    ctx.fillStyle = isDark ? '#2a2d35' : '#e5e7eb';
    ctx.fillRect(cx - r, cy - r, size, size);
    ctx.fillStyle = isDark ? '#f3f4f6' : '#111827';
    ctx.font = `700 ${Math.round(size * 0.42)}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText((fallbackLetter || '?').slice(0, 1).toUpperCase(), cx, cy + 1);
  }
  ctx.restore();

  // Ring
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
  ctx.lineWidth = 2;
  ctx.stroke();
}

/**
 * Compose and download a high-quality post share image with clear author name.
 */
export async function downloadPostCapture(
  data: PostCaptureData,
  filename = 'puurga-post.png'
): Promise<void> {
  const isDark =
    document.documentElement.classList.contains('dark') ||
    window.matchMedia('(prefers-color-scheme: dark)').matches;

  const width = 720;
  const padX = 28;
  const padY = 28;
  const avatarSize = 52;
  const contentMaxWidth = width - padX * 2;

  const colors = isDark
    ? {
        bg: '#12141a',
        card: '#1a1d24',
        name: '#ffffff',
        username: '#9ca3af',
        body: '#e5e7eb',
        muted: '#6b7280',
        accent: '#f59e0b',
        border: 'rgba(255,255,255,0.08)',
        footer: '#0f1115',
      }
    : {
        bg: '#f3f4f6',
        card: '#ffffff',
        name: '#111827',
        username: '#6b7280',
        body: '#1f2937',
        muted: '#9ca3af',
        accent: '#d97706',
        border: 'rgba(0,0,0,0.08)',
        footer: '#e5e7eb',
      };

  const authorName = (data.authorName || data.authorUsername || 'Puurga user').trim();
  const username = (data.authorUsername || '').replace(/^@/, '').trim();
  const content = (data.content || '').trim();
  const imageUrls = (data.images || []).filter(Boolean).slice(0, 3);

  const [avatarImg, ...mediaImgs] = await Promise.all([
    loadImage(data.authorAvatar || ''),
    ...imageUrls.map((u) => loadImage(u)),
  ]);
  const loadedMedia = mediaImgs.filter(Boolean) as HTMLImageElement[];

  // Measure text height with a temp canvas
  const measure = document.createElement('canvas').getContext('2d')!;
  measure.font = `400 28px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  const textLines = content
    ? wrapText(measure, content, contentMaxWidth, 38, 14)
    : [];

  const headerH = avatarSize + 8;
  const textBlockH = textLines.length * 38;
  const gapAfterText = textLines.length ? 20 : 0;

  let mediaH = 0;
  const mediaLayouts: { img: HTMLImageElement; w: number; h: number }[] = [];
  if (loadedMedia.length === 1) {
    const img = loadedMedia[0];
    const maxH = 420;
    const scale = Math.min(contentMaxWidth / img.width, maxH / img.height, 1);
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    mediaLayouts.push({ img, w, h });
    mediaH = h;
  } else if (loadedMedia.length > 1) {
    const gap = 8;
    const cellW = Math.floor((contentMaxWidth - gap * (Math.min(loadedMedia.length, 2) - 1)) / Math.min(loadedMedia.length, 2));
    const cellH = Math.round(cellW * 0.75);
    loadedMedia.slice(0, 2).forEach((img) => mediaLayouts.push({ img, w: cellW, h: cellH }));
    mediaH = cellH;
    if (loadedMedia.length > 2) {
      // third image as strip note — skip for clean layout
    }
  }

  const footerH = 44;
  const cardInnerTop = padY;
  const height =
    cardInnerTop +
    headerH +
    18 +
    textBlockH +
    gapAfterText +
    mediaH +
    (mediaH ? 18 : 12) +
    footerH +
    padY;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = Math.max(height, 280);
  const ctx = canvas.getContext('2d')!;

  // Outer background
  ctx.fillStyle = colors.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Card
  const cardX = 16;
  const cardY = 16;
  const cardW = width - 32;
  const cardH = canvas.height - 32;
  roundRect(ctx, cardX, cardY, cardW, cardH, 24);
  ctx.fillStyle = colors.card;
  ctx.fill();
  ctx.strokeStyle = colors.border;
  ctx.lineWidth = 1;
  ctx.stroke();

  let y = cardY + padY;

  // Avatar
  const avatarCx = cardX + padX + avatarSize / 2;
  const avatarCy = y + avatarSize / 2;
  drawCircleImage(ctx, avatarImg, avatarCx, avatarCy, avatarSize, authorName, isDark);

  // Author name — large, solid color (never CSS vars)
  const textLeft = cardX + padX + avatarSize + 14;
  ctx.fillStyle = colors.name;
  ctx.font = `700 26px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const nameMaxW = cardW - padX * 2 - avatarSize - 14;
  let displayName = authorName;
  while (ctx.measureText(displayName).width > nameMaxW && displayName.length > 1) {
    displayName = `${displayName.slice(0, -2)}…`;
  }
  ctx.fillText(displayName, textLeft, y + 24);

  // @username + time
  ctx.fillStyle = colors.username;
  ctx.font = `500 18px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  const metaParts = [
    username ? `@${username}` : '',
    data.createdLabel || '',
  ].filter(Boolean);
  ctx.fillText(metaParts.join('  ·  '), textLeft, y + 48);

  y += headerH + 18;

  // Body text
  if (textLines.length) {
    ctx.fillStyle = colors.body;
    ctx.font = `400 28px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    ctx.textBaseline = 'top';
    for (const line of textLines) {
      ctx.fillText(line, cardX + padX, y);
      y += 38;
    }
    y += gapAfterText;
  }

  // Media
  if (mediaLayouts.length === 1) {
    const { img, w, h } = mediaLayouts[0];
    const x = cardX + padX + Math.floor((contentMaxWidth - w) / 2);
    roundRect(ctx, x, y, w, h, 16);
    ctx.save();
    ctx.clip();
    ctx.drawImage(img, x, y, w, h);
    ctx.restore();
    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 1;
    roundRect(ctx, x, y, w, h, 16);
    ctx.stroke();
    y += h + 18;
  } else if (mediaLayouts.length > 1) {
    const gap = 8;
    let x = cardX + padX;
    for (const { img, w, h } of mediaLayouts) {
      roundRect(ctx, x, y, w, h, 14);
      ctx.save();
      ctx.clip();
      // cover
      const scale = Math.max(w / img.width, h / img.height);
      const dw = img.width * scale;
      const dh = img.height * scale;
      ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
      ctx.restore();
      ctx.strokeStyle = colors.border;
      ctx.lineWidth = 1;
      roundRect(ctx, x, y, w, h, 14);
      ctx.stroke();
      x += w + gap;
    }
    y += mediaLayouts[0].h + 18;
  }

  // Footer brand strip
  const fy = cardY + cardH - footerH;
  ctx.fillStyle = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';
  ctx.fillRect(cardX, fy, cardW, footerH);

  ctx.fillStyle = colors.accent;
  ctx.font = `700 18px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('Puurga', cardX + padX, fy + footerH / 2);

  ctx.fillStyle = colors.muted;
  ctx.font = `500 15px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  ctx.textAlign = 'right';
  ctx.fillText('Shared from Puurga', cardX + cardW - padX, fy + footerH / 2);

  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b), 'image/png', 0.96)
  );
  if (!blob) throw new Error('Failed to create image');

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
