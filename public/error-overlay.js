/* ===== KHUNG BÁO LỖI (giữ nguyên): hiện lỗi thay vì trang trắng, kể cả lỗi cú pháp của các script khác ===== */
(function () {
  var messages = []
  function show(text) {
    if (messages.indexOf(text) === -1 && messages.length < 4) messages.push(text)
    var box = document.getElementById('app-error')
    if (!box) {
      box = document.createElement('div')
      box.id = 'app-error'
      ;(document.body || document.documentElement).appendChild(box)
    }
    box.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;padding:16px;background:#FBEAEA;color:#9E2C2C;border-bottom:4px solid #D64545;font:14px/1.5 system-ui,sans-serif;white-space:pre-wrap'
    box.textContent = 'Trang gặp lỗi nên chưa chạy được. Hãy chụp màn hình khung này gửi cho trợ lý. Lỗi đầu tiên là lỗi gốc.\n\n' + messages.map(function (m, i) { return (i + 1) + '. ' + m }).join('\n')
  }
  window.addEventListener('error', function (e) {
    var file = e.filename ? e.filename.split('/').pop() : ''
    var where = file || e.lineno ? ' (' + [file, e.lineno ? 'dòng ' + e.lineno : ''].filter(Boolean).join(', ') + ')' : ''
    show((e.message || 'Lỗi không rõ') + where)
  })
  window.addEventListener('unhandledrejection', function (e) {
    show('Lỗi chưa được xử lý: ' + ((e.reason && e.reason.message) || e.reason))
  })
  setTimeout(function () {
    if (!window.__appReady && !document.getElementById('app-error')) show('Trang không khởi động được (không có thông báo lỗi cụ thể).')
  }, 4000)
})()
