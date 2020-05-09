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
  document.body.addEventListener('keyup', globalOnKeyup);
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
  input.addEventListener('keyup', onKeyup);
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
 * Handles keyboard events for cell inputs.
 */
function onKeyup(event) {
  if (event.keyCode === 13) {
    submitInput(event.target);
  }
}


/**
 * Handles keyboard events globally.
 */
function globalOnKeyup(event) {
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

  if (event.keyCode === 27) {
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
  } else if (event.keyCode === 9) {
    if (event.shiftKey) {
      // Shift + Tab: Edit the cell to the left.
      if (column > 0) {
        submitInput(activeInput);
        switchToCell(getCell(row, column - 1));
      }
    } else {
      // Tab: Edit the cell to the right.
      if (column + 1 < TABLE_WIDTH) {
        submitInput(activeInput);
        switchToCell(getCell(row, column + 1));
      }
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
  if (data === LAST_SAVED) {
    console.log('Skipping save as contents of table have not changed.');
    return;
  }

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
  // Remove empty cells from the end of each row, and empty rows from the end of the
  // table. Empty rows that are between non-empty rows are not removed.
  let nonEmptyRows = [];
  for (let i = rows.length - 1; i >= 0; i--) {
    let row = removeTrailingEmptyCells(rows[i]);
    if (row.length > 0 || nonEmptyRows.length > 0) {
      nonEmptyRows.push(row);
    }
  }
  nonEmptyRows.reverse();
  return Papa.unparse(nonEmptyRows, { newline: '\n' }).trim();
}


/**
 * Returns a new row with any empty cells at the end removed.
 *
 * Additionally, leading and trailing whitespace is removed from each cell.
 */
function removeTrailingEmptyCells(row) {
  const newRow = [];
  for (let i = row.length - 1; i >= 0; i--) {
    const value = row[i].trim();
    if (newRow.length > 0 || value !== '') {
      newRow.push(value);
    }
  }
  newRow.reverse();
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
