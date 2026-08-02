/**
 * Bosch §3.2 demo — pure rules engine.
 *
 * Everything in this folder is a pure function: no database, no fetch, no
 * framework imports, no ambient Date.now() inside a decision path. That is what
 * makes it exhaustively testable, and it is why the demo survives Bosch holding
 * up a label or QR code we have never seen.
 *
 * Rule: src/engine/** may not import from anywhere outside src/engine/.
 * There is an ESLint boundary rule enforcing this — do not disable it.
 */

export * from './types';
export * from './carrier-format';
export * from './location-cascade';
export * from './location-verify';
export * from './recipient-resolution';
