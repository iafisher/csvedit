'use strict';
const electron = require('electron');

let activeInput = null;

function populateTable(rows) {
  const thead = document.querySelector('thead');
  const tbody = document.querySelector('tbody');

  const columnWidths = getColumnWidths(rows);
  const header = document.createElement('tr');
  for (let i = 0; i < rows[0].length; i++) {
    const th = document.createElement('th');
    th.textContent = rows[0][i];
    th.style.width = columnWidths[i] + "px";
    header.appendChild(th);
  }
  thead.appendChild(header);

  for (const row of rows.slice(1)) {
    const tr = document.createElement('tr');
    for (let i = 0; i < row.length; i++) {
      const td = document.createElement('td');
      td.textContent = row[i];
      td.style.width = columnWidths[i] + "px";
      td.addEventListener('click', onClick);
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }

  const win = electron.remote.getCurrentWindow();
  const table = document.querySelector('table');
  // win.setContentSize(table.offsetWidth, table.offsetHeight);
}

function onClick(event) {
  if (activeInput !== null) {
    if (activeInput === event.target) {
      return;
    }

    submitInput(activeInput);
  }

  const td = event.target;
  const text = td.textContent;
  td.innerHTML = "";
  const input = document.createElement('input');
  input.value = text;
  input.addEventListener('keyup', onKeyup);
  td.appendChild(input);
  activeInput = input;
}

function onKeyup(event) {
  if (event.keyCode === 13) {
    submitInput(event.target);
  }
}

function submitInput(input) {
  const td = input.parentElement;
  const text = input.value;
  td.innerHTML = "";
  td.textContent = text;
  activeInput = null;
}

function getColumnWidths(rows) {
  const columnWidths = [];
  for (let i = 0; i < rows[0].length; i++) {
    const width = getMaxWidth(rows, i);
    columnWidths.push(width);
  }
  return columnWidths;
}

function getMaxWidth(rows, colno) {
  let maxWidth = 0;
  for (const row of rows) {
    maxWidth = Math.max(getTextWidth(row[colno]), maxWidth);
  }
  return maxWidth;
}

function getTextWidth(text) {
  // This only works with a fixed-width font.
  return text.length * 8.5 + /* padding */ 15;
}

const rows = electron.remote.getGlobal('sharedObject').rows;
const path = electron.remote.getGlobal('sharedObject').path;
document.title = 'csvedit ' + path;
populateTable(rows);
