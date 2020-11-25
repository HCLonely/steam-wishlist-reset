// ==UserScript==
// @name               Steam愿望单重置
// @namespace          steam-wishlist-reset
// @version            1.0.0
// @description        清空Steam愿望单 & 恢复Steam愿望单
// @author             HCLonely
// @license            MIT
// @iconURL            https://auto-task-test.hclonely.com/img/favicon.ico
// @homepage           https://auto-task-test.hclonely.com/img/favicon.ico
// @supportURL         https://auto-task-test.hclonely.com/img/favicon.ico
// @updateURL          https://auto-task-test.hclonely.com/img/favicon.ico
// @downloadURL        https://auto-task-test.hclonely.com/img/favicon.ico
// @include            *://store.steampowered.com/wishlist/profiles/*
// @require            https://cdn.jsdelivr.net/npm/sweetalert2@10.10.2/dist/sweetalert2.all.min.js
// @require            https://cdn.jsdelivr.net/npm/regenerator-runtime@0.13.5/runtime.min.js
// @grant              GM_setValue
// @grant              GM_getValue
// @grant              GM_deleteValue
// @grant              GM_xmlhttpRequest
// @grant              GM_registerMenuCommand
// @run-at             document-end
// ==/UserScript==
(function () {
  function clearWishlist() {
    Swal.fire({
      title: '正在获取愿望单列表',
      text: '请耐心等待...'
    });
    GM_xmlhttpRequest({
      method: 'GET',
      url: 'https://store.steampowered.com/dynamicstore/userdata/?id=' + g_AccountID + '&cc=CN&v=70',
      nocache: true,
      responseType: 'json',
      onload: async response => {
        console.log(response);

        if (response.status === 200 && response?.response?.rgWishlist) {
          if (response.response.rgWishlist.length > 0) {
            const list = GM_setValue('list')?.length > 0 ? GM_setValue('list') : [];
            const time = new Date().getTime();
            list.push(time);
            GM_setValue(time, response.response.rgWishlist);
            GM_setValue('list', list);

            for (const gameId of response.response.rgWishlist) {
              await removeFromWishlist(gameId);
            }

            Swal.fire({
              icon: 'success',
              title: '愿望单清空完成（忽略所有错误）'
            });
          } else {
            Swal.fire({
              icon: 'warning',
              title: '愿望单为空！'
            });
          }
        } else {
          Swal.fire({
            icon: 'error',
            title: '获取愿望单列表失败！'
          });
        }
      },
      ontimeout: e => {
        console.log(e);
        Swal.fire({
          icon: 'error',
          title: '获取愿望单列表失败！'
        });
      },
      onerror: () => {
        console.log(e);
        Swal.fire({
          icon: 'error',
          title: '获取愿望单列表失败！'
        });
      },
      onabort: () => {
        console.log(e);
        Swal.fire({
          icon: 'error',
          title: '获取愿望单列表失败！'
        });
      }
    });
  }

  function removeFromWishlist(gameId) {
    return new Promise(resolve => {
      Swal.update({
        title: '正在移除愿望单游戏',
        text: gameId
      });
      GM_xmlhttpRequest({
        url: 'https://store.steampowered.com/api/removefromwishlist',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
        },
        data: `sessionid=${g_sessionID}&appid=${gameId}`,
        responseType: 'json',
        onload: response => {
          console.log(response);
          resolve();
        },
        ontimeout: resolve,
        onerror: resolve,
        onabort: resolve
      });
    });
  }

  async function recoverWishlist() {
    Swal.fire({
      title: '正在读取愿望单列表',
      text: '请稍等...'
    });
    const list = GM_getValue('list');
    const games = list ? list[list.length - 1] : null;

    if (games) {
      const failedGames = [];

      for (const gameId of response.response.rgWishlist) {
        if (!(await addToWishlist(gameId))) failedGames.push(gameId);
      }

      console.log('恢复失败的游戏：', failedGames);
      Swal.fire({
        icon: 'success',
        title: '愿望单恢复完成，恢复失败的游戏：',
        text: JSON.stringify(failedGames)
      });
    } else {
      Swal.fire({
        icon: 'error',
        title: '没有读取到游戏列表'
      });
    }
  }

  function addToWishlist(gameId) {
    return new Promise(resolve => {
      Swal.update({
        title: '正在移除愿望单游戏',
        text: gameId
      });
      GM_xmlhttpRequest({
        url: 'https://store.steampowered.com/api/addtowishlist',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
        },
        data: `sessionid=${g_sessionID}&appid=${gameId}`,
        responseType: 'json',
        onload: response => {
          console.log(response);

          if (response.status === 200 && response.response?.success === true) {
            resolve(true);
          } else {
            resolve(false);
          }
        },
        ontimeout: () => {
          resolve(false);
        },
        onerror: () => {
          resolve(false);
        },
        onabort: () => {
          resolve(false);
        }
      });
    });
  }

  GM_registerMenuCommand('清空愿望单', clearWishlist);
  GM_registerMenuCommand('恢复愿望单', recoverWishlist);
})();
