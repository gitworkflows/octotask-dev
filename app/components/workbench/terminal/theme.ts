import type { ITheme } from '@xterm/xterm';

const style = getComputedStyle(document.documentElement);
const cssVar = (token: string) => style.getPropertyValue(token) || undefined;

export function getTerminalTheme(overrides?: ITheme): ITheme {
  return {
    cursor: cssVar('--octotask-elements-terminal-cursorColor'),
    cursorAccent: cssVar('--octotask-elements-terminal-cursorColorAccent'),
    foreground: cssVar('--octotask-elements-terminal-textColor'),
    background: cssVar('--octotask-elements-terminal-backgroundColor'),
    selectionBackground: cssVar('--octotask-elements-terminal-selection-backgroundColor'),
    selectionForeground: cssVar('--octotask-elements-terminal-selection-textColor'),
    selectionInactiveBackground: cssVar('--octotask-elements-terminal-selection-backgroundColorInactive'),

    // ansi escape code colors
    black: cssVar('--octotask-elements-terminal-color-black'),
    red: cssVar('--octotask-elements-terminal-color-red'),
    green: cssVar('--octotask-elements-terminal-color-green'),
    yellow: cssVar('--octotask-elements-terminal-color-yellow'),
    blue: cssVar('--octotask-elements-terminal-color-blue'),
    magenta: cssVar('--octotask-elements-terminal-color-magenta'),
    cyan: cssVar('--octotask-elements-terminal-color-cyan'),
    white: cssVar('--octotask-elements-terminal-color-white'),
    brightBlack: cssVar('--octotask-elements-terminal-color-brightBlack'),
    brightRed: cssVar('--octotask-elements-terminal-color-brightRed'),
    brightGreen: cssVar('--octotask-elements-terminal-color-brightGreen'),
    brightYellow: cssVar('--octotask-elements-terminal-color-brightYellow'),
    brightBlue: cssVar('--octotask-elements-terminal-color-brightBlue'),
    brightMagenta: cssVar('--octotask-elements-terminal-color-brightMagenta'),
    brightCyan: cssVar('--octotask-elements-terminal-color-brightCyan'),
    brightWhite: cssVar('--octotask-elements-terminal-color-brightWhite'),

    ...overrides,
  };
}
