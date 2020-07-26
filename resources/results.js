(() => {
  const vscode = acquireVsCodeApi();

  // If we have a state, request the server to re-send the data, otherwise set the state so we can
  // restore it later
  const state = vscode.getState({panelId: "${panelId}"});
  if (state) {
    vscode.postMessage({
      command: 'restore',
    });
  } else {
    vscode.setState({panelId: "${panelId}"});
  }

  // Maintain a table...
  // - suitable for 1000s of rows
  // - added to as results are received from the server in batches
  // - with column widths initially set to the max of the widths of the first batch
  // - draggable handles to adjust the width
  var clusterize;
  var allData = [];
  var widths = [];
  var numRows = 0;
  var resultsEl = document.getElementById('results');

  var dragging = false;

  function newClusterize(fields) {
    resultsEl.insertAdjacentHTML('beforeend', '<div class="row row-header" id="row-header"><div class="cell cell-header"></div>' + 
      fields.map((field) => {
        return '<div class="cell cell-header">' + field.name + '</div>';
      }).join('')
    + '</div>');
    resultsEl.insertAdjacentHTML('beforeend', '<div id="scroll" class="scroll"><div id="content" class="content"></div></div>');

    const header = document.getElementById('row-header');
    const scroll = document.getElementById('scroll');

    return new Clusterize({
      rows: [],
      scrollId: 'scroll',
      contentId: 'content',
      keep_parity: false,
      callbacks: {
        scrollingProgress: (progress, scrollLeft) => {
          header.scrollLeft = scrollLeft;
        },
        clusterChanged: setAllWidths
      }
    });
  }

  function getMaxWidths() {
    return Array.from(document.querySelectorAll('.row-header .cell')).map((headerCell, i) => {
      const cells = Array.from(document.querySelectorAll('.cell:nth-child(' + (i + 1) + ')'));
      return Math.max(...cells.map((cell) => {
        return cell.clientWidth;
      }));
    })
  }

  function setWidth(i, width) {
    Array.from(document.querySelectorAll('.cell:nth-child(' + (i + 1) + ')')).forEach((cell) => {
      cell.style.width = width + 'px';
    });
  }

  function setAllWidths() {
    Array.from(document.querySelectorAll('.row-header .cell')).forEach((column, i) => setWidth(i, widths[i]));
  }

  window.addEventListener('message', event => {
    const message = event.data;

    if (message.summary) {
      resultsEl.innerHTML = message.summary;
      resultsEl.classList.add('error');
    }

    if (message.fields.length) {
      var firstMessage = !clusterize;
      if (firstMessage) {
        clusterize = new newClusterize(message.fields);;
      }
      clusterize.append(message.rows.map((row, i) => {
        return '<div class="row"><div class="cell">' + (numRows + i + 1) + '<div class="handle handle-left"></div><div class="handle handle-right"></div></div>' + row.map((value) => '<div class="cell">' + value + '<div class="handle handle-left"></div><div class="handle handle-right"></div></div>').join('') + '</div>';
      }));
      if (firstMessage) {
        widths = getMaxWidths();
        setAllWidths();
      }
    
      numRows += message.rows.length;
    }
  });
})();