'use strict';

const electron = require('electron');
const fs = require('fs');
const path = require('path');
const tmp = require('tmp');
const Papa = require('papaparse');


let ROWS = electron.remote.getGlobal('sharedObject').rows;
let TABLE_HEIGHT = 0;
let TABLE_WIDTH = 0;
let LAST_SAVED = stringifyRows(ROWS);
const ORIGINAL_PATH = electron.remote.getGlobal('sharedObject').path;


/**
 * Renders the spreadsheet initially with the CSV file's content.
 */
function populateTable(rows) {
  const thead = document.querySelector('thead');
  const tbody = document.querySelector('tbody');

  TABLE_HEIGHT = Math.max(rows.length, 100);
  TABLE_WIDTH = Math.max(maxRowLength(rows), 26);

  for (let i = 0; i < TABLE_HEIGHT; i++) {
    const tr = document.createElement('tr');
    const childType = i === 0 ? 'th' : 'td';
    const number = document.createElement(childType);
    number.classList.add('number');
    if (i > 0) {
      number.textContent = '' + i;
    }
    tr.appendChild(number);

    for (let j = 0; j < TABLE_WIDTH; j++) {
      const td = document.createElement(childType);
      td.setAttribute("data-row", i);
      td.setAttribute("data-column", j);
      td.setAttribute("tabindex", 0);
      if (i < rows.length && j < rows[i].length) {
        td.textContent = rows[i][j];
      }
      tr.appendChild(td);
    }

    if (i === 0) {
      thead.appendChild(tr);
    } else {
      tbody.appendChild(tr);
    }
  }

  document.body.addEventListener('click', onClick);
  document.body.addEventListener('keyup', onKeyup);
}


let activeInput = null;
/**
 * Handles click events for table cells.
 */
function onClick(event) {
  if (activeInput !== null) {
    if (activeInput === event.target) {
      return;
    }

    submitInput(activeInput);
  }

  const td = event.target;
  if (td.tagName !== 'TD' && td.tagName != 'TH') {
    return;
  }
  if (td.classList.contains("number")) {
    return;
  }
  switchToCell(td);
}


/**
 * Switches the input focus to the given cell.
 */
function switchToCell(td) {
  const text = td.textContent;
  td.innerHTML = '';
  const input = document.createElement('input');
  input.setAttribute('data-original', text);
  input.value = text;
  input.addEventListener('input', onInput);
  td.appendChild(input);
  activeInput = input;
  activeInput.focus();
}


/**
 * Submits the cell's input.
 */
function submitInput(input) {
  setValue(input);
  save();
  const td = input.parentElement;
  const text = input.value.trim();
  td.innerHTML = "";
  td.textContent = text;
  activeInput = null;
}


/**
 * Handles keyboard events.
 */
function onKeyup(event) {
  if (activeInput) {
    handleInsertModeKeystroke(event);
  } else {
    handleNormalModeKeystroke(event);
  }
}


/**
 * Handles keyboard events while in normal mode.
 *
 * Normal mode is when no cell is being edited (analogous to vim's normal mode).
 */
function handleNormalModeKeystroke(event) {
  if (event.keyCode === 13) {
    // Enter: Edit the currently focused cell.
    const cell = document.activeElement;
    if (cell.tagName !== "TD" && cell.tagName !== "TH") {
      return;
    }
    switchToCell(cell);
  } else if (event.keyCode === 65 && event.shiftKey) {
    // Shift + A: Edit first cell in next empty row.
    let lastNonEmptyRow = ROWS.length - 1;
    while (lastNonEmptyRow >= 1 && ROWS[lastNonEmptyRow][0] === '') {
      lastNonEmptyRow--;
    }

    if (lastNonEmptyRow >= 1) {
      switchToCell(getCell(lastNonEmptyRow + 1, 0));
    }
  }
}


/**
 * Handles keyboard events while in insert mode.
 */
function handleInsertModeKeystroke(event) {
  const row = getRow(activeInput.parentElement);
  const column = getColumn(activeInput.parentElement);

  if (event.keyCode === 13) {
    // Enter: Finish editing and save the value of the cell.
    submitInput(activeInput);
  } else if (event.keyCode === 27) {
    // Esc: Finish editing and restore the original value of the cell.
    const originalData = activeInput.getAttribute('data-original');
    if (originalData !== "") {
      activeInput.value = originalData;
    }
    submitInput(activeInput);
  } else if (event.keyCode === 38) {
    // Up: Edit the cell above.
    if (row > 0) {
      submitInput(activeInput);
      switchToCell(getCell(row - 1, column));
    }
  } else if (event.keyCode === 40) {
    // Down: Edit the cell below.
    if (row + 1 < TABLE_HEIGHT) {
      submitInput(activeInput);
      switchToCell(getCell(row + 1, column));
    }
  } else if (event.keyCode === 37 && event.shiftKey) {
    // Shift + Left: Edit the cell to the left.
    if (column > 0) {
      submitInput(activeInput);
      switchToCell(getCell(row, column - 1));
    }
  } else if (event.keyCode === 39 && event.shiftKey) {
    // Shift + Right: Edit the cell to the left.
    if (column + 1 < TABLE_WIDTH) {
      submitInput(activeInput);
      switchToCell(getCell(row, column + 1));
    }
  }
}


/**
 * Returns the table cell at the given position.
 */
function getCell(i, j) {
  if (i === 0) {
    return document.querySelector('thead').children[0].children[j + 1];
  } else {
    return document.querySelector('tbody').children[i - 1].children[j + 1];
  }
}


/**
 * Returns the row number of the table cell.
 */
function getRow(cell) {
  return parseInt(cell.getAttribute('data-row'));
}


/**
 * Returns the column number of the table cell.
 */
function getColumn(cell) {
  return parseInt(cell.getAttribute('data-column'));
}


let saveTimeoutId = null;
/**
 * Handles input to table cells.
 */
function onInput(event) {
  setValue(event.target);
  if (saveTimeoutId !== null) {
    clearTimeout(saveTimeoutId);
  }
  saveTimeoutId = setTimeout(save, 500);
}


/**
 * Sets the value of the cell in the in-memory copy, ROWS.
 */
function setValue(input) {
  const row = getRow(input.parentElement);
  const column = getColumn(input.parentElement);

  // Expand the table if necessary.
  while (row >= ROWS.length) {
    ROWS.push([]);
  }

  while (column >= ROWS[row].length) {
    ROWS[row].push('');
  }

  ROWS[row][column] = input.value.trim();
}


/**
 * Saves the table to the original CSV file.
 */
function save() {
  const data = stringifyRows(ROWS);
  console.log(data);
  console.log(LAST_SAVED)
  if (data === LAST_SAVED) {
    console.log('Skipping save as contents of table have not changed.');
    return;
  }

  return;

  tmp.file({ postfix: '.csv' }, (err, tmppath, fd, cleanupCallback) => {
    if (err) throw err;

    const basename = path.basename(ORIGINAL_PATH, '.csv');
    const backupPath = "/tmp/" + basename + "-" + Date.now() + ".csv";
    console.log('Saving backup to ' + backupPath);
    fs.copyFile(ORIGINAL_PATH, backupPath, err => {
      if (err) throw err;

      console.log('Saving to ' + tmppath);
      fs.write(fd, data + '\n', 0, 'utf8', err => {
        if (err) throw err;

        console.log('Overwriting ' + ORIGINAL_PATH);
        fs.rename(tmppath, ORIGINAL_PATH, err => {
          if (err) throw err;

          LAST_SAVED = data;
        });
      });
    });
  });
}


/**
 * Converts the rows into a string, to be written to a file.
 */
function stringifyRows(rows) {
  if (rows.length === 0) {
    return "";
  }

  // Skip past trailing empty rows.
  let i = rows.length - 1;
  while (i >= 0 && rows[i].every(cell => cell.trim() === "")) {
    i--;
  }

  if (i < 0) {
    return "";
  }

  // Remove any trailing empty cells beyond the end of the header row.
  const width = getRowWidth(rows[0]);
  let nonEmptyRows = [];
  while (i >= 0) {
    let row = resizeRow(rows[i], width);
    nonEmptyRows.push(row);
    i--;
  }
  nonEmptyRows.reverse();
  return Papa.unparse(nonEmptyRows, { newline: '\n' }).trim();
}


/**
 * Return the width of the row, not counting empty cells at the end.
 */
function getRowWidth(row) {
  let i = row.length - 1;
  while (i >= 0 && row[i].trim() === "") {
    i--;
  }
  return i + 1;
}


/**
 * Returns a new row extended or truncated to match the given width.
 *
 * Only empty cells will be truncated, so if the original row has non-empty cells past
 * the `width`'th column, then the returned row will be longer than `width`.
 *
 * Additionally, leading and trailing whitespace is removed from each cell.
 */
function resizeRow(row, width) {
  const realWidth = getRowWidth(row);
  // Remove trailing empty cells.
  const newRow = row.slice(0, realWidth);
  // Add empty cells at the end to bring `newRow` up to `width`.
  while (newRow.length < width) {
    newRow.push("");
  }
  return newRow;
}


/**
 * Returns the length of the longest row.
 */
function maxRowLength(rows) {
  let max = 0;
  for (const row of rows) {
    max = Math.max(row.length, max);
  }
  return max;
}


populateTable(ROWS);
