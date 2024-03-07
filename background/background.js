/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

import {
  configs,
  //log,
} from '/common/common.js';

const TST_ID = 'treestyletab@piro.sakura.ne.jp';

async function registerToTST() {
  try {
    await browser.runtime.sendMessage(TST_ID, {
      type: 'register-self',
      name: browser.i18n.getMessage('extensionName'),
      //icons: browser.runtime.getManifest().icons,
      listeningTypes: [
        'sidebar-show',
      ],
      allowBulkMessaging: true,
      lightTree: true,
    });
  }
  catch(_error) {
    // TST is not available
  }
}
configs.$loaded.then(registerToTST);

function updateAutoStickyActive(windowId) {
  if (configs.stickyActiveTab) {
    browser.runtime.sendMessage(TST_ID, {
      type:  'register-auto-sticky-states',
      windowId,
      state: 'active',
    });
  }
  else {
    browser.runtime.sendMessage(TST_ID, {
      type:  'unregister-auto-sticky-states',
      windowId,
      state: 'active',
    });
  }
}

function updateAutoStickyPreviouslyActive(windowId) {
  if (configs.stickyPreviouslyActiveTab) {
    browser.runtime.sendMessage(TST_ID, {
      type:  'register-auto-sticky-states',
      windowId,
      state: 'previously-active',
    });
  }
  else {
    browser.runtime.sendMessage(TST_ID, {
      type:  'unregister-auto-sticky-states',
      windowId,
      state: 'previously-active',
    });
  }
}

function updateAutoStickySoundPlaying(windowId) {
  if (configs.stickySoundPlayingTab) {
    browser.runtime.sendMessage(TST_ID, {
      type:  'register-auto-sticky-states',
      windowId,
      state: 'sound-playing',
    });
  }
  else {
    browser.runtime.sendMessage(TST_ID, {
      type:  'unregister-auto-sticky-states',
      windowId,
      state: 'sound-playing',
    });
  }
}

function updateAutoStickySharing(windowId) {
  if (configs.stickySharingTab) {
    browser.runtime.sendMessage(TST_ID, {
      type:   'register-auto-sticky-states',
      windowId,
      states: ['sharing-camera', 'sharing-microphone', 'sharing-screen'],
    });
  }
  else {
    browser.runtime.sendMessage(TST_ID, {
      type:   'unregister-auto-sticky-states',
      windowId,
      states: ['sharing-camera', 'sharing-microphone', 'sharing-screen'],
    });
  }
}

configs.$addObserver(key => {
  switch (key) {
    case 'stickyActiveTab':
      updateAutoStickyActive();
      break;

    case 'stickyPreviouslyActiveTab':
      updateAutoStickyPreviouslyActive();
      break;

    case 'stickySoundPlayingTab':
      updateAutoStickySoundPlaying();
      break;

    case 'stickySharingTab':
      updateAutoStickySharing();
      break;

    default:
      break;
  }
});

function onMessageExternal(message, sender) {
  switch (sender.id) {
    case TST_ID:
      if (message && message.messages) {
        for (const oneMessage of message.messages) {
          onMessageExternal(oneMessage, sender);
        }
        break;
      }
      switch (message.type) {
        case 'ready':
          registerToTST();
          break;

        case 'sidebar-show':
          updateAutoStickyActive(message.windowId);
          updateAutoStickyPreviouslyActive(message.windowId);
          updateAutoStickySoundPlaying(message.windowId);
          updateAutoStickySharing(message.windowId);
          break;
      }
      break;
  }
}
browser.runtime.onMessageExternal.addListener(onMessageExternal);

const mPreviouslyActiveTabs = new Map();

browser.tabs.onActivated.addListener(activeInfo => {
  const lastTabId = mPreviouslyActiveTabs.get(activeInfo.windowId);
  if (lastTabId) {
    browser.runtime.sendMessage(TST_ID, {
      type:   'remove-tab-state',
      tabs:   [lastTabId],
      states: ['previously-active'],
    });
  }
  mPreviouslyActiveTabs.set(activeInfo.windowId, activeInfo.previousTabId);
  browser.runtime.sendMessage(TST_ID, {
    type:   'add-tab-state',
    tabs:   [activeInfo.previousTabId],
    states: ['previously-active'],
  });
});

browser.windows.onRemoved.addListener(windowId => {
  mPreviouslyActiveTabs.delete(windowId);
});
