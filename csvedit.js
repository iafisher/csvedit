'use strict';

const electron = require('electron');

let ROWS = electron.remote.getGlobal('sharedObject').rows;
let PATH = electron.remote.getGlobal('sharedObject').path;

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
      td.setAttribute("data-i", i);
      td.setAttribute("data-j", j);
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

  // const win = electron.remote.getCurrentWindow();
  // const table = document.querySelector('table');
  // win.setContentSize(table.offsetWidth, table.offsetHeight);
}

let activeInput = null;

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
  switchToInput(td);
}

function switchToInput(td) {
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

function submitInput(input) {
  setValue(input);
  save();
  const td = input.parentElement;
  const text = input.value.trim();
  td.innerHTML = "";
  td.textContent = text;
  activeInput = null;
}

function onKeyup(event) {
  if (event.keyCode === 13) {
    submitInput(event.target);
  }
}

function globalOnKeyup(event) {
  if (event.keyCode === 27) {
    /* Esc */
    if (activeInput) {
      // Restore the original value of the cell.
      activeInput.value = activeInput.getAttribute('data-original');
      submitInput(activeInput);
    }
  }
}

let saveTimeoutId = null;

function onInput(event) {
  setValue(event.target);
  if (saveTimeoutId !== null) {
    clearTimeout(saveTimeoutId);
  }
  saveTimeoutId = setTimeout(save, 500);
}

function setValue(input) {
  const i = parseInt(input.parentElement.getAttribute('data-i'));
  const j = parseInt(input.parentElement.getAttribute('data-j'));

  // Expand the table if necessary.
  while (i >= ROWS.length) {
    ROWS.push([]);
  }

  while (j >= ROWS[i].length) {
    ROWS[i].push('');
  }

  ROWS[i][j] = input.value.trim();
}

function save() {
  console.log(ROWS);
}

populateTable(ROWS);
