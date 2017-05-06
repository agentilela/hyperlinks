const { openLinkInBrowser, copyToClipBoard } = require('./util/clickHandlers');
const buildLinks = require('./util/linkBuilder');
const { exec } = require('child_process');
const styles = require('./styles');

const DEFAULT_CONFIG = {
  defaultBrowser: true,
  clickAction: 'open',
};

let cwd;
exports.middleware = store => next => (action) => {
  if (action.type === 'SESSION_SET_CWD') {
    cwd = action.cwd;
  }
  next(action);
};


exports.getTermProps = (uid, parentProps, props) => Object.assign(props, { uid });

exports.decorateTerm = (Term, { React }) => {
  class Hyperlinks extends React.Component {

    constructor(props) {
      super(props);

      this.openLinkInHyper = this.openLinkInHyper.bind(this);
      this.onLinkClick = this.onLinkClick.bind(this);
      this.onLinkMouseOver = this.onLinkMouseOver.bind(this);
      this.onLinkMouseOut = this.onLinkMouseOut.bind(this);
      this.onTerminal = this.onTerminal.bind(this);
      this.overrideScreen = this.overrideScreen.bind(this);

      this.config = null;
      this.term = null;
      this.id = 0;
    }

    onTerminal(term) {
      if (this.props.onTerminal) {
        this.props.onTerminal(term);
      }

      this.config = Object.assign({}, DEFAULT_CONFIG, window.config.getConfig().hyperlinks);
      this.term = term;

      const { onTerminalReady } = term;

      this.overrideScreen();

      term.onTerminalReady = () => {
        onTerminalReady.apply(this, arguments);

        const screenNode = term.scrollPort_.getScreenNode();
        screenNode.addEventListener('click', this.onLinkClick);
        screenNode.addEventListener('mouseover', this.onLinkMouseOver);
        screenNode.addEventListener('mouseout', this.onLinkMouseOut);
      };
    }

    onLinkClick(e) {
      if (e.target.nodeName !== 'A') return;

      if (e.target.type === 'file') {
        let editor;
        try {
          editor = window.config.getConfig().clicky.editor;
        } catch (err) {
          editor = 'atom';
        }
        exec(`${editor} ${e.target.pathname}`);
        return;
      }

      e.preventDefault();
      const { defaultBrowser, clickAction } = this.config;
      const url = e.target.href;
      const isMetaAction = e.metaKey;
      // If holding down the meta key we'll always open the link
      if (isMetaAction) {
        // if there is a custom click action invert the target when Meta Clicking.
        const target = clickAction !== 'open' ? !defaultBrowser : defaultBrowser;
        this.getLinkHandler(target, isMetaAction, url);
        return;
      }
      switch (clickAction) {
        case 'ignore':
          break;
        case 'copy':
          copyToClipBoard(url);
          break;
        default: // 'open'
          this.getLinkHandler(defaultBrowser, isMetaAction, url);

      }
    }

    onLinkMouseOver(e) {
      if (e.target.nodeName !== 'A') return;

      const { id } = e.target.dataset;
      for (const a of this.getAnchors(id)) {
        a.classList.add('hover');
      }
    }

    onLinkMouseOut(e) {
      if (e.target.nodeName !== 'A') return;

      const { id } = e.target.dataset;
      for (const a of this.getAnchors(id)) {
        a.classList.remove('hover');
      }
    }

    getAnchors(id) {
      const screenNode = this.term.scrollPort_.getScreenNode();
      return screenNode.querySelectorAll(`a[data-id="${id}"]`);
    }

    /**
     * Determines whether to open in the browser or Hyper
     * @param  {Boolean} defaultBrowser if clicked links open in browser
     * @param  {Boolean} isMeta If modifier key is pressed
     * @return {Function} Handler for the link
     */
    getLinkHandler(defaultBrowser, isMeta, url) {
      if (defaultBrowser === isMeta) { return this.openLinkInHyper(url); }
      return openLinkInBrowser(url);
    }

    /**
     * opens a clicked link in the hyper terminal
     * @param  {String} url clicked url
     */
    openLinkInHyper(url) {
      const { store, uid } = this.props;
      store.dispatch({
        type: 'SESSION_URL_SET',
        uid,
        url,
      });
    }

    overrideScreen() {
      const { constructor: Screen } = this.term.screen_;
      if (Screen._links) return;
      Screen._links = true;

      const { insertString } = Screen.prototype;

      Screen.prototype.insertString = function () {
        const result = insertString.apply(this, arguments);
        buildLinks(this, cwd);
        return result;
      };
    }

    render() {
      const props = Object.assign({}, this.props, {
        onTerminal: this.onTerminal,
        customCSS: styles + (this.props.customCSS || ''),
      });
      return React.createElement(Term, props);
    }
  }

  Hyperlinks.propTypes = {
    customCSS: React.PropTypes.object,
    onTerminal: React.PropTypes.func,
    store: React.PropTypes.object.isRequired,
    uid: React.PropTypes.string.isRequired,
  };

  Hyperlinks.defaultProps = {
    customCSS: null,
    onTerminal: null,
  };

  return Hyperlinks;
};
