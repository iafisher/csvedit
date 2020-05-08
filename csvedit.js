'use strict';

const electron = require('electron');

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
  const text = td.textContent;
  td.innerHTML = '';
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

const rows = electron.remote.getGlobal('sharedObject').rows;
const path = electron.remote.getGlobal('sharedObject').path;
populateTable(rows);
