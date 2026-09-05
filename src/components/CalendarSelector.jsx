import React from 'react';

export const PSYCHOONKOLOGIA_SUBCALENDAR_ID = '15520558';
export const PSYCHOONKOLOGIA_SUBCALENDAR_NAME = 'Koła Naukowe > 07 🎗️ SKN Psychoonkologii';

export default function CalendarSelector({
  selectedSubcalendar = PSYCHOONKOLOGIA_SUBCALENDAR_ID,
  onSubcalendarChange,
  className = '',
}) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Podkalendarz:</span>
      <select
        value={PSYCHOONKOLOGIA_SUBCALENDAR_ID}
        onChange={e => onSubcalendarChange && onSubcalendarChange(PSYCHOONKOLOGIA_SUBCALENDAR_ID)}
        className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-300 cursor-pointer shadow-2xs"
        title="Dedykowany podkalendarz SKN Psychoonkologii"
      >
        <option value={PSYCHOONKOLOGIA_SUBCALENDAR_ID}>
          {PSYCHOONKOLOGIA_SUBCALENDAR_NAME}
        </option>
      </select>
    </div>
  );
}
