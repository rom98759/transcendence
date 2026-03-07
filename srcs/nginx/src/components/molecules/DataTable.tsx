import React from 'react';

// ── Types ──────────────────────────────────────────────────────────────────

export interface ColDef<T> {
  /** Header label */
  header: string;
  /** Extract cell content from a row */
  cell: (row: T, index: number) => React.ReactNode;
  /** Optional Tailwind classes applied to both <th> and <td> */
  className?: string;
}

interface DataTableProps<T> {
  /** Table title shown inside the card */
  title: string;
  /** Column definitions */
  columns: ColDef<T>[];
  /** Row data */
  rows: T[];
  /** Unique key extractor */
  rowKey: (row: T) => string | number;
  /** Message shown when rows is empty */
  emptyMessage?: string;
}

// ── Desktop table ──────────────────────────────────────────────────────────

/**
 * DataTable — reusable white-card table for desktop.
 * Used by TournamentList, MatchHistory, PlayerStats.
 */
export function DataTable<T>({
  title,
  columns,
  rows,
  rowKey,
  emptyMessage = 'No data.',
}: DataTableProps<T>) {
  return (
    <div className="w-full max-w-5xl mx-auto my-8 px-4 md:px-0">
      <div className="bg-white/70 rounded-3xl shadow-2xl p-8 border border-cyan-300">
        <h2 className="text-2xl font-semibold text-center mb-6 text-gray-700 font-quantico">
          {title}
        </h2>
        <div className="overflow-hidden rounded-2xl">
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-left text-sm text-gray-500 border-b">
                {columns.map((col) => (
                  <th key={col.header} className={`py-4 px-4 ${col.className ?? ''}`}>
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={columns.length} className="py-10 text-center text-gray-500">
                    {emptyMessage}
                  </td>
                </tr>
              )}
              {rows.map((row, rowIndex) => (
                <tr
                  key={rowKey(row)}
                  className="hover:bg-gray-50/40 transition-colors border-t border-gray-100"
                >
                  {columns.map((col) => (
                    <td key={col.header} className={`py-4 px-4 ${col.className ?? ''}`}>
                      {col.cell(row, rowIndex)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Mobile card list ──────────────────────────────────────────────────────────

interface DataCardListProps<T> {
  rows: T[];
  rowKey: (row: T) => string | number;
  /** Render the card body for a single row */
  renderCard: (row: T, index: number) => React.ReactNode;
  emptyMessage?: string;
}

/**
 * DataCardList — reusable white-card list for mobile.
 */
export function DataCardList<T>({
  rows,
  rowKey,
  renderCard,
  emptyMessage = 'No data.',
}: DataCardListProps<T>) {
  if (rows.length === 0) return <p className="text-center text-gray-500 py-10">{emptyMessage}</p>;
  return (
    <div className="w-full max-w-5xl mx-auto px-4 md:px-0 py-4 space-y-4">
      {rows.map((row, index) => (
        <div
          key={rowKey(row)}
          className="w-full bg-white rounded-2xl p-4 shadow border border-cyan-100 flex flex-col gap-3"
        >
          {renderCard(row, index)}
        </div>
      ))}
    </div>
  );
}
