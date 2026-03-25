import type { TournamentResult, ExtendedLeagueStanding, League } from './types';
import type { TranslationKey } from '../i18n/translations';
import { sanitizeFilename, formatDuration } from './format';

type TranslateFn = (key: TranslationKey, params?: Record<string, string | number>) => string;

/**
 * Generate and download a PDF with tournament results.
 * Uses dynamic import of jspdf + jspdf-autotable for code splitting.
 */
export async function exportTournamentResultAsPdf(
  result: TournamentResult,
  t: TranslateFn,
): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const autoTableModule = await import('jspdf-autotable');
  const autoTable = autoTableModule.default;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = 20;

  // --- Header: Tournament Title ---
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(result.name || t('pdf.title'), pageWidth / 2, y, { align: 'center' });
  y += 10;

  // --- Subtitle: Date ---
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  const dateStr = new Date(result.date).toLocaleDateString(undefined, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  doc.text(dateStr, pageWidth / 2, y, { align: 'center' });
  y += 12;

  // --- Tournament Info Block ---
  doc.setFontSize(10);
  doc.setTextColor(60);

  const infoLines: string[] = [];
  infoLines.push(`${t('finished.players')}: ${result.playerCount}`);
  infoLines.push(`${t('finished.buyIn')}: ${result.buyIn.toFixed(2)} \u20AC`);
  infoLines.push(`${t('finished.prizePool')}: ${result.prizePool.toFixed(2)} \u20AC`);
  if (result.rebuyPot && result.rebuyPot > 0) {
    infoLines.push(`Rebuy-Pot: ${result.rebuyPot.toFixed(2)} \u20AC`);
  }
  if (result.totalRebuys > 0) {
    infoLines.push(`Rebuys: ${result.totalRebuys}`);
  }
  if (result.totalAddOns > 0) {
    infoLines.push(`Add-Ons: ${result.totalAddOns}`);
  }
  if (result.elapsedSeconds > 0) {
    infoLines.push(`${t('stats.elapsed')}: ${formatDuration(result.elapsedSeconds)}`);
  }

  // Render info as two columns
  const colWidth = (pageWidth - margin * 2) / 2;
  const leftCol = infoLines.filter((_, i) => i % 2 === 0);
  const rightCol = infoLines.filter((_, i) => i % 2 === 1);
  const maxRows = Math.max(leftCol.length, rightCol.length);

  for (let i = 0; i < maxRows; i++) {
    const left = leftCol[i];
    const right = rightCol[i];
    if (left) doc.text(left, margin, y);
    if (right) doc.text(right, margin + colWidth, y);
    y += 5;
  }
  y += 6;

  // --- Standings Table ---
  doc.setTextColor(0);

  const tableHead = [
    [
      t('pdf.place'),
      t('pdf.playerName'),
      t('pdf.payout'),
      'Rebuys',
      'Add-On',
      'KO',
      t('finished.balance'),
    ],
  ];

  const tableBody = result.players.map((p) => {
    const placeStr = `${p.place}.`;
    return [
      placeStr,
      p.name,
      p.payout > 0 ? `${p.payout.toFixed(2)} \u20AC` : '-',
      p.rebuys > 0 ? String(p.rebuys) : '-',
      p.addOn ? 'Y' : '-',
      p.knockouts > 0 ? String(p.knockouts) : '-',
      `${p.netBalance >= 0 ? '+' : ''}${p.netBalance.toFixed(2)} \u20AC`,
    ];
  });

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: tableHead,
    body: tableBody,
    styles: {
      fontSize: 9,
      cellPadding: 2.5,
    },
    headStyles: {
      fillColor: [34, 34, 34],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 18 },
      2: { halign: 'right' },
      3: { halign: 'center', cellWidth: 16 },
      4: { halign: 'center', cellWidth: 16 },
      5: { halign: 'center', cellWidth: 12 },
      6: { halign: 'right' },
    },
  });

  // --- Footer ---
  // jspdf-autotable exposes finalY on the doc via previousAutoTable
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalY: number = (doc as any).previousAutoTable?.finalY ?? y + 50;
  const footerY = Math.max(finalY + 15, doc.internal.pageSize.getHeight() - 15);
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(t('pdf.generatedBy'), pageWidth / 2, footerY, { align: 'center' });

  // --- Download ---
  const filename = `${sanitizeFilename(result.name || 'tournament')}-results.pdf`;
  doc.save(filename);
}

/**
 * Generate and download a PDF with league standings.
 * Uses dynamic import of jspdf + jspdf-autotable for code splitting.
 */
export async function exportLeagueStandingsAsPdf(
  league: League,
  standings: ExtendedLeagueStanding[],
  currencySymbol: string,
  t: TranslateFn,
): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const autoTableModule = await import('jspdf-autotable');
  const autoTable = autoTableModule.default;

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = 20;

  // --- Header ---
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(league.name, pageWidth / 2, y, { align: 'center' });
  y += 8;

  // --- Subtitle ---
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  const dateStr = new Date().toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' });
  doc.text(`${t('league.tabs.standings')} — ${dateStr}`, pageWidth / 2, y, { align: 'center' });
  y += 12;

  // --- Standings Table ---
  doc.setTextColor(0);

  const tableHead = [[
    '#',
    t('league.standings.name'),
    t('league.standings.points'),
    t('league.standings.gameDays'),
    t('league.standings.wins'),
    t('league.standings.itm'),
    t('league.standings.avgPlace'),
    t('league.standings.cost'),
    t('league.standings.payout'),
    t('league.standings.balance'),
    t('league.standings.participation'),
  ]];

  const tableBody = standings.map((s) => [
    `${s.rank}.`,
    s.name,
    String(s.points),
    String(s.tournaments),
    String(s.wins),
    String(s.cashes),
    s.avgPlace.toString(),
    `${s.totalCost.toFixed(0)} ${currencySymbol}`,
    `${s.totalPayout.toFixed(0)} ${currencySymbol}`,
    `${s.netBalance >= 0 ? '+' : ''}${s.netBalance.toFixed(0)} ${currencySymbol}`,
    `${(s.participationRate * 100).toFixed(0)}%`,
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: tableHead,
    body: tableBody,
    styles: {
      fontSize: 9,
      cellPadding: 2.5,
    },
    headStyles: {
      fillColor: [34, 34, 34],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 12 },
      2: { halign: 'center', cellWidth: 16 },
      3: { halign: 'center', cellWidth: 16 },
      4: { halign: 'center', cellWidth: 14 },
      5: { halign: 'center', cellWidth: 14 },
      6: { halign: 'center', cellWidth: 18 },
      7: { halign: 'right' },
      8: { halign: 'right' },
      9: { halign: 'right' },
      10: { halign: 'center', cellWidth: 20 },
    },
  });

  // --- Footer ---
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalY: number = (doc as any).previousAutoTable?.finalY ?? y + 50;
  const footerY = Math.max(finalY + 15, doc.internal.pageSize.getHeight() - 15);
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(t('pdf.generatedBy'), pageWidth / 2, footerY, { align: 'center' });

  // --- Download ---
  const filename = `${sanitizeFilename(league.name)}-standings.pdf`;
  doc.save(filename);
}
