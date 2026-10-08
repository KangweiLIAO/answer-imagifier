import base from './base.css';
import components from './components.css';
import typography from './typography.css';
import widgets from './widgets.css';

// Keep the established cascade order when composing Shadow DOM styles.
export default base + components + typography + widgets;
