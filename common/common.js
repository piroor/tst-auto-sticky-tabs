/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

import Configs from '/extlib/Configs.js';

export const configs = new Configs({
  stickyActiveTab: true,
  stickyPreviouslyActiveTab: true,
  stickyPreviouslyActiveTabExceptPinned: true,
  stickySoundPlayingTab: true,
  stickySharingTab: true,
  allowScrollToActivatedStickedTab: false,

  TSTID: null,

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


export const TST_ID = 'treestyletab@piro.sakura.ne.jp';
export const WS_ID  = 'sidebar@waterfox.net';

export async function ensureTSTDetected() {
  try {
    if (await browser.runtime.sendMessage(TST_ID, { type: 'ping' })) {
      configs.TSTID = TST_ID;
      return;
    }
  }
  catch(_error) {
  }
  try {
    if (await browser.runtime.sendMessage(WS_ID, { type: 'ping' })) {
      configs.TSTID = WS_ID;
      return;
    }
  }
  catch(_error) {
  }
  throw new Error('Missing dependency: you need to install Tree Style Tab addon also');
}

export async function callTSTAPI(message) {
  if (!configs.TSTID)
    await ensureTSTDetected();

  try {
    return browser.runtime.sendMessage(configs.TSTID, message);
  }
  catch(error) {
    configs.TSTID = null;
    throw error;
  }
}

const RTL_LANGUAGES = new Set([
  'ar',
  'he',
  'fa',
  'ur',
  'ps',
  'sd',
  'ckb',
  'prs',
  'rhg',
]);

export function isRTL() {
  const lang = (
    navigator.language ||
    navigator.userLanguage ||
    //(new Intl.DateTimeFormat()).resolvedOptions().locale ||
    ''
  ).split('-')[0];
  return RTL_LANGUAGES.has(lang);
}
