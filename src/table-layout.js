// Allocate space to compact columns before wrapping longer descriptions. Measure
// export fonts rather than copying widths from the ChatGPT page.
export function prepareTableLayouts(card, measureText) {
  const canvas = card.ownerDocument.createElement('canvas');
  const context = measureText ? null : canvas.getContext('2d');
  const measure = measureText || ((text, style) => {
    context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    return context.measureText(text).width;
  });
  const plans = [];
  for (const table of card.querySelectorAll('.answer-content table')) {
    const rows = [...table.rows];
    const count = rows[0]?.cells.length || 0;
    // Spanning cells and authored column widths need their original layout.
    if (!count || table.querySelector('colgroup,col') || rows.some(row => row.cells.length !== count ||
        [...row.cells].some(cell => cell.colSpan > 1 || cell.rowSpan > 1 || cell.style.width))) continue;
    const font = parseFloat(getComputedStyle(table).fontSize);
    const columns = Array.from({length:count}, (_, index) => {
      const cells = rows.map(row => row.cells[index]);
      const widths = cells.map(cell => measure(cell.textContent.trim().replace(/\s+/g, ' '), getComputedStyle(cell)));
      const maximum = Math.max(...widths);
      const compact = maximum <= font * 16 && !cells.some(cell => cell.querySelector('br') || cell.querySelectorAll('p').length > 1);
      const desired = Math.ceil((compact ? maximum : Math.max(Math.min(widths[0],font * 16),font * 14)) + 20);
      return {cells, compact, desired};
    });
    const group = card.ownerDocument.createElement('colgroup');
    for (const column of columns) {
      column.col = card.ownerDocument.createElement('col');
      group.append(column.col);
    }
    table.prepend(group);
    table.setAttribute('data-export-table-layout', '');
    plans.push({table, columns, width:columns.reduce((sum,column)=>sum+column.desired,0)});
  }
  return plans;
}

export function applyTableLayouts(plans) {
  for (const {table, columns, width} of plans) {
    const available = table.getBoundingClientRect().width;
    const longColumns = columns.filter(column=>!column.compact).length;
    const extra = Math.max(0, available-width);
    const total = Math.max(width,available);
    for (const column of columns) {
      const share = column.desired + (longColumns ? (column.compact ? 0 : extra/longColumns) : extra/columns.length);
      column.col.style.width = `${share/total*100}%`;
    }
  }
}

export function hasCrampedTableColumns(plans) {
  return plans.some(({columns})=>columns.some(column=>column.compact &&
    column.cells[0].getBoundingClientRect().width + 1 < column.desired));
}
