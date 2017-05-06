const { shell, clipboard } = require('electron'); // eslint-disable-line
/**
 * opens a clicked link in the user's default browser
 * @param  {String} url clicked url
 */
const openLinkInBrowser = (url) => {
  shell.openExternal(url);
};
/**
 * copies a string to the clipboard
 * @param  {String} string to copy
 */
const copyToClipBoard = (text) => {
  clipboard.writeText(text);
};

module.exports = {
  copyToClipBoard,
  openLinkInBrowser,
};
