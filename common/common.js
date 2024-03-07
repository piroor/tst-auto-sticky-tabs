/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

import Configs from '/extlib/Configs.js';

export const configs = new Configs({
  stickyActiveTab: true,
  stickyPreviouslyActiveTab: false,
  stickySoundPlayingTab: true,
  stickySharingTab: true,

  debug: false,
}, {
  localKeys: [
    'debug',
  ]
});

export function log(...args)
{
  if (!configs.debug)
    return;

  const message = args.shift();

  args = args.map(arg => typeof arg == 'function' ? arg() : arg);

  const nest = (new Error()).stack.split('\n').length;
  let indent = '';
  for (let i = 0; i < nest; i++) {
    indent += ' ';
  }

  const line = `${indent}${message}`;
  console.log(line, ...args);
}
