import type { AttemptRecord, StudentRecord } from '../types.ts';
import { formatDurationUz } from './quizEngine.ts';

export function buildResultSummaryText(params: {
  student: StudentRecord;
  attempt: AttemptRecord;
  totalScore: number;
  deltaFromPrevious: number | null;
}): string {
  const { student, attempt, totalScore, deltaFromPrevious } = params;
  const deltaText =
    deltaFromPrevious === null
      ? 'Birinchi urinish'
      : deltaFromPrevious > 0
        ? `+${deltaFromPrevious}% o‘sish`
        : deltaFromPrevious < 0
          ? `${deltaFromPrevious}% o‘zgarish`
          : 'Oldingi natija bilan teng';

  return [
    `VocabCheck — Test natijasi`,
    `O‘quvchi: ${student.fullName} (${student.className})`,
    `Unit ${attempt.unitId}: ${attempt.unitTitle}`,
    `Natija: ${attempt.percentage}% (${attempt.correctCount}/${attempt.totalQuestions} to‘g‘ri)`,
    `Ushbu test bali: +${attempt.score} ball | Umumiy ball: ${totalScore} ball`,
    `Sarflangan vaqt: ${formatDurationUz(attempt.durationSeconds)}`,
    `Dinamika: ${deltaText}`,
  ].join('\n');
}

export function buildTelegramShareHref(text: string): string {
  const url = typeof window !== 'undefined' ? window.location.href : 'https://vocabcheck.app';
  return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
}

export function renderResultCardPng(params: {
  student: StudentRecord;
  attempt: AttemptRecord;
  totalScore: number;
  deltaFromPrevious: number | null;
}): string {
  const { student, attempt, totalScore, deltaFromPrevious } = params;
  const canvas = document.createElement('canvas');
  const width = 960;
  const height = 560;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Clean light editorial card canvas
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(0, 0, width, height);

  // Subtle decorative grid lines
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.08)';
  ctx.lineWidth = 1;
  for (let x = 40; x < width; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 40; y < height; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Main card container
  ctx.fillStyle = '#1E293B';
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(40, 40, width - 80, height - 80, 20);
  ctx.fill();
  ctx.stroke();

  // Top brand & class tag
  ctx.fillStyle = '#38BDF8';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('VOCABCHECK · ENGLISH VOCABULARY IN USE', 80, 95);

  ctx.fillStyle = '#94A3B8';
  ctx.font = '600 18px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`Sinf: ${student.className}`, width - 80, 95);
  ctx.textAlign = 'left';

  // Student Name & Unit
  ctx.fillStyle = '#F8FAFC';
  ctx.font = 'bold 34px sans-serif';
  ctx.fillText(student.fullName, 80, 150);

  ctx.fillStyle = '#CBD5E1';
  ctx.font = '600 22px sans-serif';
  ctx.fillText(`Unit ${attempt.unitId}: ${attempt.unitTitle}`, 80, 190);

  // Big percentage ring / block
  const passed = attempt.percentage >= 70;
  ctx.fillStyle = passed ? '#064E3B' : '#451A03';
  ctx.strokeStyle = passed ? '#10B981' : '#F59E0B';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(80, 230, 250, 175, 16);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = passed ? '#34D399' : '#FBBF24';
  ctx.font = 'bold 68px sans-serif';
  ctx.fillText(`${attempt.percentage}%`, 108, 322);

  ctx.fillStyle = '#E2E8F0';
  ctx.font = '600 18px sans-serif';
  ctx.fillText(`${attempt.correctCount} / ${attempt.totalQuestions} to‘g‘ri javob`, 108, 372);

  // Right stats tiles
  const stats = [
    { label: 'Ushbu test bali', value: `+${attempt.score} ball` },
    { label: 'Umumiy ball', value: `${totalScore} ball` },
    { label: 'Sarflangan vaqt', value: formatDurationUz(attempt.durationSeconds) },
    {
      label: 'Oldingi urinishga nisbatan',
      value:
        deltaFromPrevious === null
          ? 'Birinchi urinish'
          : deltaFromPrevious > 0
            ? `+${deltaFromPrevious}% o‘sish`
            : `${deltaFromPrevious}%`,
    },
  ];

  stats.forEach((st, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const bx = 360 + col * 265;
    const by = 230 + row * 94;

    ctx.fillStyle = '#0F172A';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(bx, by, 245, 80, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#94A3B8';
    ctx.font = '500 14px sans-serif';
    ctx.fillText(st.label, bx + 18, by + 28);

    ctx.fillStyle = '#F8FAFC';
    ctx.font = 'bold 21px sans-serif';
    ctx.fillText(st.value, bx + 18, by + 58);
  });

  // Footer
  ctx.fillStyle = '#64748B';
  ctx.font = '500 15px sans-serif';
  const dateLabel = new Date(attempt.completedAt).toLocaleString('uz-UZ');
  ctx.fillText(`Topshirilgan vaqt: ${dateLabel}`, 80, 472);

  return canvas.toDataURL('image/png');
}
