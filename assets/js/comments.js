/* ── Comments Widget ── */
(function () {
  'use strict';

  var container = document.getElementById('comments-section');
  if (!container) return;

  /* page key: normalise path */
  var pageKey = location.pathname.replace(/\/index\.html$/, '/');

  /* ── Generate math CAPTCHA ── */
  var captchaA, captchaB, captchaAnswer;
  function newCaptcha() {
    captchaA = Math.floor(Math.random() * 20) + 1;
    captchaB = Math.floor(Math.random() * 20) + 1;
    captchaAnswer = captchaA + captchaB;
    var q = container.querySelector('.captcha-question');
    if (q) q.textContent = captchaA + ' + ' + captchaB + ' = ?';
    var inp = container.querySelector('.captcha-input');
    if (inp) inp.value = '';
  }

  /* ── Build HTML ── */
  container.innerHTML =
    '<div class="comments-section">' +
      '<div class="comments-heading">Comments</div>' +

      /* form */
      '<form class="comment-form" autocomplete="off">' +
        '<div class="comment-form-row">' +
          '<input class="comment-input" name="name" placeholder="\u59d3\u540d" required>' +
          '<input class="comment-input" name="email" type="email" placeholder="\u90ae\u7bb1" required>' +
        '</div>' +
        '<textarea class="comment-textarea" name="content" placeholder="\u5199\u70b9\u4ec0\u4e48\u2026" required></textarea>' +
        '<div class="captcha-row">' +
          '<span>\u9a8c\u8bc1\u4f60\u4e0d\u662f\u673a\u5668\u4eba\uff1a</span>' +
          '<span class="captcha-question"></span>' +
          '<input class="captcha-input" name="captcha" placeholder="?" required>' +
        '</div>' +
        '<button class="comment-submit" type="submit">\u63d0\u4ea4\u8bc4\u8bba</button>' +
        '<div class="comment-status" aria-live="polite"></div>' +
      '</form>' +

      /* list */
      '<div class="comment-list"></div>' +
    '</div>';

  newCaptcha();

  var form    = container.querySelector('.comment-form');
  var status  = container.querySelector('.comment-status');
  var list    = container.querySelector('.comment-list');

  /* ── Render one comment ── */
  function renderComment(data) {
    var card = document.createElement('div');
    card.className = 'comment-card';

    var ts = data.timestamp;
    var dateStr = '';
    if (ts && ts.toDate) {
      dateStr = ts.toDate().toLocaleString('zh-CN');
    } else if (ts) {
      dateStr = new Date(ts).toLocaleString('zh-CN');
    }

    card.innerHTML =
      '<div class="comment-meta">' +
        '<span class="comment-author">' + escapeHtml(data.name) + '</span>' +
        '<span class="comment-time">' + escapeHtml(dateStr) + '</span>' +
      '</div>' +
      '<div class="comment-body">' + escapeHtml(data.content) + '</div>';
    return card;
  }

  function escapeHtml(s) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(s || ''));
    return div.innerHTML;
  }

  /* ── Load comments ── */
  function loadComments() {
    if (typeof db === 'undefined') {
      list.innerHTML = '<div class="comment-empty">\u8bc4\u8bba\u529f\u80fd\u5c1a\u672a\u914d\u7f6e\uff08\u9700\u8981\u8bbe\u7f6e Firebase\uff09</div>';
      return;
    }
    db.collection('comments')
      .where('page', '==', pageKey)
      .get()
      .then(function (snap) {
        list.innerHTML = '';
        if (snap.empty) {
          list.innerHTML = '<div class="comment-empty">\u8fd8\u6ca1\u6709\u8bc4\u8bba\uff0c\u6765\u5199\u7b2c\u4e00\u6761\u5427</div>';
          return;
        }
        var docs = [];
        snap.forEach(function (doc) { docs.push(doc.data()); });
        docs.sort(function (a, b) {
          var ta = a.timestamp ? (a.timestamp.toMillis ? a.timestamp.toMillis() : +new Date(a.timestamp)) : 0;
          var tb = b.timestamp ? (b.timestamp.toMillis ? b.timestamp.toMillis() : +new Date(b.timestamp)) : 0;
          return ta - tb;
        });
        docs.forEach(function (d) { list.appendChild(renderComment(d)); });
      })
      .catch(function (err) {
        console.warn('Comments load error:', err);
        list.innerHTML = '<div class="comment-empty">\u8bc4\u8bba\u52a0\u8f7d\u5931\u8d25</div>';
      });
  }

  loadComments();

  /* ── Submit ── */
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    status.textContent = '';
    status.className = 'comment-status';

    var name    = form.name.value.trim();
    var email   = form.email.value.trim();
    var content = form.content.value.trim();
    var answer  = parseInt(form.captcha.value, 10);

    if (!name || !email || !content) {
      status.textContent = '\u8bf7\u586b\u5199\u6240\u6709\u5b57\u6bb5';
      status.classList.add('error');
      return;
    }
    if (answer !== captchaAnswer) {
      status.textContent = '\u9a8c\u8bc1\u7b54\u6848\u4e0d\u5bf9\uff0c\u8bf7\u91cd\u8bd5';
      status.classList.add('error');
      newCaptcha();
      return;
    }

    if (typeof db === 'undefined') {
      status.textContent = 'Firebase \u672a\u914d\u7f6e\uff0c\u65e0\u6cd5\u63d0\u4ea4';
      status.classList.add('error');
      return;
    }

    var btn = form.querySelector('.comment-submit');
    btn.disabled = true;
    btn.textContent = '\u63d0\u4ea4\u4e2d\u2026';

    db.collection('comments').add({
      page:      pageKey,
      name:      name,
      email:     email,
      content:   content,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }).then(function () {
      status.textContent = '\u8bc4\u8bba\u5df2\u63d0\u4ea4\uff01';
      status.classList.add('success');
      form.reset();
      newCaptcha();
      loadComments();
    }).catch(function (err) {
      console.error('Comment submit error:', err);
      status.textContent = '\u63d0\u4ea4\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u518d\u8bd5';
      status.classList.add('error');
    }).finally(function () {
      btn.disabled = false;
      btn.textContent = '\u63d0\u4ea4\u8bc4\u8bba';
    });
  });
})();
