// ==UserScript==
// @name               Steam愿望单重置
// @namespace          steam-wishlist-reset
// @version            1.0.1
// @description        清空Steam愿望单 & 恢复Steam愿望单
// @author             HCLonely
// @license            MIT
// @iconURL            https://auto-task-test.hclonely.com/img/favicon.ico
// @homepage           https://github.com/HCLonely/steam-wishlist-reset
// @supportURL         https://github.com/HCLonely/steam-wishlist-reset/issues
// @updateURL          https://github.com/HCLonely/steam-wishlist-reset/raw/master/steam-wishlist-reset.user.js
// @downloadURL        https://github.com/HCLonely/steam-wishlist-reset/raw/master/steam-wishlist-reset.user.js

// @include            *://store.steampowered.com/wishlist/profiles/*

// @require            https://cdn.jsdelivr.net/npm/sweetalert2@10.10.2/dist/sweetalert2.all.min.js
// @require            https://cdn.jsdelivr.net/npm/regenerator-runtime@0.13.5/runtime.min.js

// @grant              GM_setValue
// @grant              GM_getValue
// @grant              GM_deleteValue
// @grant              GM_addStyle
// @grant              GM_xmlhttpRequest
// @grant              GM_registerMenuCommand

// @run-at             document-end
// ==/UserScript==

/* global GM_setValue,GM_getValue,GM_addStyle,GM_xmlhttpRequest,GM_registerMenuCommand,Swal,g_sessionID,g_AccountID,Blob,FileReader */

(function () {
  GM_addStyle('#swal2-title{color:#000!important;}#swal2-content a{color:#2f89bc!important;}')
  async function clearWishlist () {
    Swal.fire({
      title: '正在获取愿望单列表',
      text: '请耐心等待...'
    })
    const wishlistGames = await getWishlistFromServer()
    if (wishlistGames?.length > 0) {
      const list = GM_setValue('list')?.length > 0 ? GM_setValue('list') : []
      const time = new Date().getTime()
      list.push(time)
      GM_setValue(time, wishlistGames)
      GM_setValue('list', list)
      for (const gameId of wishlistGames) {
        await removeFromWishlist(gameId)
      }
      Swal.fire({
        icon: 'success',
        title: '愿望单清空完成（忽略所有错误）',
        confirmButtonText: '保存愿望单数据到本地',
        showCancelButton: true,
        cancelButtonText: '关闭'
      }).then(({ value }) => {
        if (value) {
          createAndDownloadFile('wishlists.json', JSON.stringify(wishlistGames))
        }
      })
    } else {
      Swal.fire({
        icon: 'warning',
        title: '愿望单为空！'
      })
    }
  }

  function removeFromWishlist (gameId) {
    return new Promise(resolve => {
      Swal.update({
        title: '正在移除愿望单游戏',
        text: gameId
      })
      GM_xmlhttpRequest({
        url: 'https://store.steampowered.com/api/removefromwishlist',
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
        data: `sessionid=${g_sessionID}&appid=${gameId}`,
        responseType: 'json',
        onload: response => {
          console.log(response)
          resolve()
        },
        ontimeout: resolve,
        onerror: resolve,
        onabort: resolve
      })
    })
  }

  async function recoverWishlist (games) {
    if (!games) {
      games = await getWishlistFromLocal()
    }
    if (games) {
      const failedGames = []
      for (const gameId of games) {
        if (!(await addToWishlist(gameId))) failedGames.push(gameId)
      }
      console.log('恢复失败的游戏：', failedGames)
      Swal.fire({
        icon: 'success',
        title: '愿望单恢复完成，恢复失败的游戏：',
        html: JSON.stringify(failedGames).replace(/[\d]+/g, function (gameId) {
          return `<a href=https://store.steampowered.com/app/${gameId} target="_blank">${gameId}</a>`
        }),
        confirmButtonText: '重新恢复失败的游戏',
        showCancelButton: true,
        cancelButtonText: '关闭'
      }).then(({ value }) => {
        if (value) {
          recoverWishlist(failedGames)
        }
      })
    } else {
      Swal.fire({
        icon: 'error',
        title: '没有读取到游戏列表'
      })
    }
  }
  function addToWishlist (gameId) {
    return new Promise(resolve => {
      Swal.update({
        title: '正在恢复愿望单游戏',
        text: gameId
      })
      GM_xmlhttpRequest({
        url: 'https://store.steampowered.com/api/addtowishlist',
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
        data: `sessionid=${g_sessionID}&appid=${gameId}`,
        responseType: 'json',
        onload: response => {
          console.log(response)
          if (response.status === 200 && response.response?.success === true) {
            resolve(true)
          } else {
            resolve(false)
          }
        },
        ontimeout: () => {
          resolve(false)
        },
        onerror: () => {
          resolve(false)
        },
        onabort: () => {
          resolve(false)
        }
      })
    })
  }
  function createAndDownloadFile (fileName, content) {
    const aTag = document.createElement('a')
    const blob = new Blob([content])
    aTag.download = fileName
    aTag.href = URL.createObjectURL(blob)
    aTag.click()
    URL.revokeObjectURL(blob)
  }
  function getWishlistFromServer () {
    return new Promise(resolve => {
      GM_xmlhttpRequest({
        method: 'GET',
        url: 'https://store.steampowered.com/dynamicstore/userdata/?id=' + g_AccountID + '&cc=CN&v=70',
        nocache: true,
        responseType: 'json',
        onload: async response => {
          console.log(response)
          if (response.status === 200 && response?.response?.rgWishlist) {
            resolve(response.response.rgWishlist)
          } else {
            Swal.fire({
              icon: 'error',
              title: '获取愿望单列表失败！'
            })
            resolve(false)
          }
        },
        ontimeout: e => {
          console.log(e)
          Swal.fire({
            icon: 'error',
            title: '获取愿望单列表失败！'
          })
          resolve(false)
        },
        onerror: e => {
          console.log(e)
          Swal.fire({
            icon: 'error',
            title: '获取愿望单列表失败！'
          })
          resolve(false)
        },
        onabort: e => {
          console.log(e)
          Swal.fire({
            icon: 'error',
            title: '获取愿望单列表失败！'
          })
          resolve(false)
        }
      })
    })
  }
  async function getWishlistFromLocal () {
    let games
    const type = await Swal.fire({
      confirmButtonText: '从缓存中读取',
      showDenyButton: true,
      denyButtonText: '从文件中读取'
    }).then(result => {
      if (result.isConfirmed) {
        return 'cache'
      } else if (result.isDenied) {
        return 'file'
      }
    })
    if (type === 'cache') {
      Swal.fire({
        title: '正在读取愿望单列表',
        text: '请稍等...'
      })
      const list = GM_getValue('list')
      const listId = list ? list[list.length - 1] : null
      games = listId ? GM_getValue(listId) : null
    } else if (type === 'file') {
      const { value: file } = await Swal.fire({
        title: '请选择要读取的文件',
        input: 'file',
        inputAttributes: {
          accept: 'application/json',
          'aria-label': '上传你的愿望单列表'
        }
      })

      if (file) {
        Swal.fire({
          title: '正在读取愿望单列表',
          text: '如果长时间没反应，请打开控制台查看报错'
        })
        games = await new Promise(resolve => {
          const reader = new FileReader()
          reader.onload = e => {
            resolve(JSON.parse(e.target.result))
          }
          reader.onerror = e => {
            resolve(false)
          }
          reader.readAsText(file)
        })
      }
    }
    return games
  }
  GM_registerMenuCommand('清空愿望单', clearWishlist)
  GM_registerMenuCommand('恢复愿望单', recoverWishlist)
})()