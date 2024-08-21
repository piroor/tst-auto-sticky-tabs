/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

import {
  configs,
  //log,
  TST_ID,
  WS_ID,
  callTSTAPI,
} from '/common/common.js';

const mPreviouslyActiveTabs = new Map();

async function registerToTST() {
  try {
    await callTSTAPI({
      type: 'register-self',
      name: browser.i18n.getMessage('extensionName'),
      //icons: browser.runtime.getManifest().icons,
      listeningTypes: [
        'sidebar-show',
        'try-scroll-to-activated-tab',
      ],
      allowBulkMessaging: true,
      lightTree: true,
    });
    const windows = await browser.windows.getAll({});
    await Promise.all(windows.map(async window => {
      const lastTabIds = await browser.sessions.setWindowValue(window.id, 'previously-active-tabs');
      if (!lastTabIds)
        return;
      mPreviouslyActiveTabs.set(window.id, lastTabIds);
      // We don't need to set states here, because we should not set previously-active state for restored windows.
      // This is just for cases when this addon is reloaded or updated while Firefox is running.
    }));
    updateAutoStickyActive();
    updateAutoStickyPreviouslyActive();
    updateAutoStickySoundPlaying();
    updateAutoStickySharing();
  }
  catch(_error) {
    // TST is not available
  }
}
configs.$loaded.then(registerToTST);

function updateAutoStickyActive(windowId) {
  if (configs.stickyActiveTab) {
    callTSTAPI({
      type:  'register-auto-sticky-states',
      windowId,
      state: 'active',
    });
  }
  else {
    callTSTAPI({
      type:  'unregister-auto-sticky-states',
      windowId,
      state: 'active',
    });
  }
}

function updateAutoStickyPreviouslyActive(windowId) {
  if (configs.stickyPreviouslyActiveTab) {
    callTSTAPI({
      type:  'register-auto-sticky-states',
      windowId,
      state: 'previously-active',
    });
  }
  else {
    callTSTAPI({
      type:  'unregister-auto-sticky-states',
      windowId,
      state: 'previously-active',
    });
  }
}

function updateAutoStickySoundPlaying(windowId) {
  if (configs.stickySoundPlayingTab) {
    callTSTAPI({
      type:  'register-auto-sticky-states',
      windowId,
      state: 'sound-playing',
    });
  }
  else {
    callTSTAPI({
      type:  'unregister-auto-sticky-states',
      windowId,
      state: 'sound-playing',
    });
  }
}

function updateAutoStickySharing(windowId) {
  if (configs.stickySharingTab) {
    callTSTAPI({
      type:  'register-auto-sticky-states',
      windowId,
      state: ['sharing-camera', 'sharing-microphone', 'sharing-screen'],
    });
  }
  else {
    callTSTAPI({
      type:  'unregister-auto-sticky-states',
      windowId,
      state: ['sharing-camera', 'sharing-microphone', 'sharing-screen'],
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
    case WS_ID:
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

        case 'try-scroll-to-activated-tab':
          if (!configs.allowScrollToActivatedStickedTab &&
              message.tab.states.includes('sticked')) {
            return Promise.resolve(true);
          }
          break;
      }
      break;
  }
}
browser.runtime.onMessageExternal.addListener(onMessageExternal);

browser.tabs.onActivated.addListener(async activeInfo => {
  const [newActiveTab, previousActiveTab] = await Promise.all([
    browser.tabs.get(activeInfo.tabId),
    browser.tabs.get(activeInfo.previousTabId),
  ]);
  const lastTabIds = mPreviouslyActiveTabs.get(activeInfo.windowId) || [];
  if (lastTabIds.length > 0 &&
      (!configs.stickyPreviouslyActiveTabExceptPinned ||
       !newActiveTab?.pinned)) {
    callTSTAPI({
      type:   'remove-tab-state',
      tabs:   [activeInfo.tabId, lastTabIds.shift()],
      states: ['previously-active'],
    });
  }
  mPreviouslyActiveTabs.set(activeInfo.windowId, lastTabIds);
  if (previousActiveTab?.pinned)
    return;
  lastTabIds.push(activeInfo.previousTabId);
  callTSTAPI({
    type:   'add-tab-state',
    tabs:   [activeInfo.previousTabId],
    states: ['previously-active'],
  });
  browser.sessions.setWindowValue(activeInfo.windowId, 'previously-active-tabs', lastTabIds);
});

browser.tabs.onRemoved.addListener((tabId, removeInfo) => {
  const lastTabIds = mPreviouslyActiveTabs.get(removeInfo.windowId);
  if (!lastTabIds)
    return;
  const index = lastTabIds.indexOf(tabId);
  if (index < 0)
    return;
  lastTabIds.splice(index, 1);
  mPreviouslyActiveTabs.set(removeInfo.windowId, lastTabIds);
});

browser.windows.onRemoved.addListener(windowId => {
  mPreviouslyActiveTabs.delete(windowId);
});
