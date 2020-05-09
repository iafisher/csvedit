'use strict';

const electron = require('electron');


let ROWS = electron.remote.getGlobal('sharedObject').rows;
let PATH = electron.remote.getGlobal('sharedObject').path;


/**
 * Renders the spreadsheet initially with the CSV file's content.
 */
function populateTable(rows) {
  const thead = document.querySelector('thead');
  const tbody = document.querySelector('tbody');

  const nrows = Math.max(rows.length, 100);
  const ncols = Math.max(rows[0].length, 26);

  for (let i = 0; i < nrows; i++) {
    const tr = document.createElement('tr');
    const childType = i === 0 ? 'th' : 'td';
    const number = document.createElement(childType);
    number.classList.add('number');
    if (i > 0) {
      number.textContent = '' + i;
    }
    tr.appendChild(number);

    for (let j = 0; j < ncols; j++) {
      const td = document.createElement(childType);
      td.setAttribute("data-row", i);
      td.setAttribute("data-column", j);
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
  if (!activeInput) {
    return;
  }

  const row = getRow(activeInput.parentElement);
  const column = getColumn(activeInput.parentElement);

  if (event.keyCode === 27) {
    /* Esc */
    // Restore the original value of the cell.
    activeInput.value = activeInput.getAttribute('data-original');
    submitInput(activeInput);
  } else if (event.keyCode === 38) {
    /* Up */
    if (row > 0) {
      submitInput(activeInput);
      switchToCell(getCell(row - 1, column));
    }
  } else if (event.keyCode === 40) {
    /* Down */
    submitInput(activeInput);
    switchToCell(getCell(row + 1, column));
  } else if (event.keyCode === 9) {
    if (event.shiftKey) {
      /* Shift + Tab */
      if (column > 0) {
        submitInput(activeInput);
        switchToCell(getCell(row, column - 1));
      }
    } else {
      /* Tab */
      submitInput(activeInput);
      switchToCell(getCell(row, column + 1));
    }
  }
}


function getCell(i, j) {
  if (i === 0) {
    return document.querySelector('thead').children[0].children[j + 1];
  } else {
    return document.querySelector('tbody').children[i - 1].children[j + 1];
  }
}


function getRow(cell) {
  return parseInt(cell.getAttribute('data-row'));
}


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
  // TODO: Write ROWS to a temporary file using Papa.unparse, then move the temporary
  // file atomically to the original location.
  //
  // Temporary files: https://github.com/raszi/node-tmp
  // Papa.unparse will require { newline: '\n' }
}


populateTable(ROWS);
