const escapeHTML = require('escape-html');
const emailRe = require('email-regex');
const path = require('path');
const urlRegex = require('./url-regex');

const emailRegex = emailRe({ exact: true });


const fileRegex = /(\/\w+)+/g;

const buildRowHTML = (urlsFound, cwd) => urlsFound.map((row, key) => getRowHtml(row, key));

const getRowHtml = ({ match, text, type }, key) => {
  switch (type) {
    case 'email':
      return `<a href="mailto:${match}" data-id="${key}" type=${type}>${text}</a>`;
    case 'file':
      return `<a href="${match}" data-id="${key}" type=${type}>${text}</a>`;
    case 'url':
      return `<a href="${match.indexOf('//') === 0 ? `http${match}` : match}" data-id="${key}" type=${type}>${text}</a>`;
  }
};

const getAllRows = (rowNode, rowArray) => {
  // Recursively loop through row node and collect siblings into a single array
  const previousSibling = rowNode.previousSibling;
  rowArray.unshift(rowNode);

  if (rowNode.children.length > 1
      || !previousSibling
      || !previousSibling.getAttribute('line-overflow')) return rowArray;

  return getAllRows(previousSibling, rowArray);
};

const formatMatch = (text, regex, type) => {
  const matches = text.match(regex);
  return matches ? matches.map(match => ({ match, text, type })) : null;
};

const findUrls = (text) => {
  const urls = [];
  return urls.concat(formatMatch(text, emailRegex, 'email'))
             .concat(formatMatch(text, fileRegex, 'file'))
             .concat(formatMatch(text, urlRegex, 'url'))
             .filter(url => !!url);
};

module.exports = (Screen, cwd) => {
  // replaceNodeWithSpan(Screen);
  const allRows = getAllRows(Screen.cursorRowNode_, []);

  // Join all rows' textcontents to get the final text content
  const textContent = allRows.map(r => r.lastChild.textContent).join('');

  const urlsFound = findUrls(textContent);

  const rowHTML = buildRowHTML(urlsFound, cwd);
  console.log('row html!', rowHTML);

  allRows.forEach((row, key) => {
    if (!rowHTML[key]) return;
    row.lastChild.innerHTML = rowHTML[key];
  });
};
