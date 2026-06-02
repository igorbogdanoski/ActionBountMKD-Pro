export interface CertificateData {
  playerName: string;
  questTitle: string;
  score: number;
  maxScore?: number;
  date?: Date;
  watermark?: boolean;
  organization?: string;
}

const W = 1414;
const H = 1000;

async function ensureFont(): Promise<string> {
  const cursive = '"Pacifico", "Segoe Script", cursive';
  try {
    if (typeof document !== 'undefined' && 'fonts' in document) {
      if (!document.querySelector('link[data-cert-font]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=Pacifico&display=swap';
        link.setAttribute('data-cert-font', '1');
        document.head.appendChild(link);
      }
      await Promise.race([
        (document as any).fonts.load('40px "Pacifico"'),
        new Promise((res) => setTimeout(res, 1500)),
      ]);
    }
  } catch {
    return 'Georgia, serif';
  }
  return cursive;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  if (typeof (ctx as any).roundRect === 'function') {
    (ctx as any).roundRect(x, y, w, h, r);
    return;
  }
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
}

function drawText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, font: string, color: string, maxWidth?: number) {
  ctx.font = font;
  ctx.fillStyle = color;
  if (maxWidth) {
    let t = text;
    while (ctx.measureText(t).width > maxWidth && t.length > 4) {
      t = t.slice(0, -2);
    }
    if (t !== text) t = t.slice(0, -1) + '…';
    ctx.fillText(t, x, y);
  } else {
    ctx.fillText(text, x, y);
  }
}

async function renderCanvas(data: CertificateData): Promise<HTMLCanvasElement> {
  const cursive = await ensureFont();
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const cx = W / 2;

  const CORAL = '#e66c4f';
  const DARK = '#2a2522';

  // Background
  ctx.fillStyle = '#fbf8f0';
  ctx.fillRect(0, 0, W, H);

  // Outer coral border
  ctx.lineWidth = 14;
  ctx.strokeStyle = CORAL;
  ctx.beginPath();
  roundRect(ctx, 34, 34, W - 68, H - 68, 28);
  ctx.stroke();

  // Inner thin border
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#c9a98f';
  ctx.beginPath();
  roundRect(ctx, 60, 60, W - 120, H - 120, 18);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  // Brand
  drawText(ctx, 'Авантура', cx, 175, `64px ${cursive}`, CORAL);

  // Title
  drawText(ctx, 'СЕРТИФИКАТ', cx, 285, 'bold 70px Georgia, "Times New Roman", serif', DARK);
  drawText(ctx, 'за успешно завршена авантура', cx, 340, '28px Georgia, serif', '#6b5d52');

  // Divider
  ctx.strokeStyle = CORAL;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx - 90, 375);
  ctx.lineTo(cx + 90, 375);
  ctx.stroke();

  // Body
  drawText(ctx, 'Се потврдува дека', cx, 455, '30px Georgia, serif', '#6b5d52');
  drawText(ctx, data.playerName, cx, 545, 'bold 62px Georgia, serif', DARK, W - 280);

  drawText(ctx, 'успешно ја заврши авантурата', cx, 615, '30px Georgia, serif', '#6b5d52');
  drawText(ctx, `„${data.questTitle}“`, cx, 685, `italic bold 40px ${cursive}`, CORAL, W - 280);

  // Score pill
  const scoreLabel = data.maxScore && data.maxScore > 0
    ? `Освоени поени: ${data.score} / ${data.maxScore}`
    : `Освоени поени: ${data.score}`;
  ctx.font = 'bold 30px Georgia, serif';
  const pillW = ctx.measureText(scoreLabel).width + 80;
  ctx.fillStyle = DARK;
  ctx.beginPath();
  roundRect(ctx, cx - pillW / 2, 740, pillW, 64, 32);
  ctx.fill();
  drawText(ctx, scoreLabel, cx, 782, 'bold 30px Georgia, serif', '#ffffff');

  // Footer: date + org + url
  const d = data.date ?? new Date();
  const dateStr = d.toLocaleDateString('mk-MK', { year: 'numeric', month: 'long', day: 'numeric' });
  ctx.textAlign = 'left';
  drawText(ctx, `Датум: ${dateStr}`, 110, H - 105, '24px Georgia, serif', '#6b5d52');
  ctx.textAlign = 'right';
  drawText(ctx, data.organization || 'avantura.mismath.net', W - 110, H - 105, '24px Georgia, serif', '#6b5d52');
  ctx.textAlign = 'center';

  // Watermark (free plan)
  if (data.watermark) {
    ctx.save();
    ctx.translate(cx, H / 2);
    ctx.rotate(-Math.PI / 9);
    ctx.globalAlpha = 0.08;
    drawText(ctx, 'АВАНТУРА', 0, 0, 'bold 150px Georgia, serif', DARK);
    ctx.restore();
  }

  return canvas;
}

export async function downloadCertificate(data: CertificateData): Promise<void> {
  const canvas = await renderCanvas(data);
  const imgData = canvas.toDataURL('image/jpeg', 0.95);

  const { default: jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const pw = pdf.internal.pageSize.getWidth();
  const ph = pdf.internal.pageSize.getHeight();
  // Fit canvas (W:H) into page preserving aspect ratio
  const ratio = Math.min(pw / W, ph / H);
  const iw = W * ratio;
  const ih = H * ratio;
  pdf.addImage(imgData, 'JPEG', (pw - iw) / 2, (ph - ih) / 2, iw, ih);

  const safeName = (data.playerName || 'играч').replace(/[^\p{L}\p{N}_-]+/gu, '_').slice(0, 40);
  pdf.save(`Сертификат_${safeName}.pdf`);
}
