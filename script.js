(function () {
  var cards = document.querySelectorAll('.card');
  var lightbox = document.getElementById('lightbox');
  var lightboxImg = document.getElementById('lightbox-img');
  var lightboxStage = document.getElementById('lightbox-stage');
  var lightboxLoader = document.getElementById('lightbox-loader');
  var counterEl = document.getElementById('counter');
  var zoomOutBtn = document.getElementById('zoom-out');
  var zoomInBtn = document.getElementById('zoom-in');
  var closeBtn = lightbox.querySelector('.lightbox-close');
  var bgOverlay = lightbox.querySelector('.lightbox-bg');

  var tabs = document.querySelectorAll('.tab-btn');
  var panels = document.querySelectorAll('.tab-panel');

  var totalImages = cards.length;
  var imageSrcs = [];
  cards.forEach(function (c) {
    imageSrcs.push(c.querySelector('img').getAttribute('src'));
  });

  var currentIndex = 0;
  var currentScale = 1;
  var panX = 0;
  var panY = 0;
  var swipeX = 0;
  var isOpen = false;
  var isAnimating = false;

  var touchStartX = 0;
  var touchStartY = 0;
  var touchStartTime = 0;
  var touchMoved = false;
  var touchStartPanX = 0;
  var touchStartPanY = 0;
  var touchStartScale = 1;
  var touchStartDistance = 0;
  var isPinching = false;
  var isSwiping = false;

  var mouseDown = false;
  var mouseStartX = 0;
  var mouseStartY = 0;
  var mousePanStartX = 0;
  var mousePanStartY = 0;
  var mouseDragged = false;

  var dblClickPending = false;

  tabs.forEach(function (btn) {
    btn.addEventListener('click', function () {
      tabs.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');

      var tab = btn.getAttribute('data-tab');
      panels.forEach(function (p) { p.classList.remove('active'); });
      var panel = document.getElementById('panel-' + tab);
      panel.classList.add('active');

      if (tab === 'desserts') {
        var dessertCards = panel.querySelectorAll('.card');
        dessertCards.forEach(function (card) {
          if (!card.classList.contains('revealed')) {
            observer.observe(card);
          }
        });
      }
    });
  });

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var card = entry.target;
          var index = parseInt(card.getAttribute('data-index'));
          setTimeout(function () {
            card.classList.add('revealed');
          }, (index % 7) * 80);
          observer.unobserve(card);
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px 40px 0px' }
  );

  cards.forEach(function (card) {
    observer.observe(card);
  });

  function setTransform(scale, px, py, swX, animate) {
    var parts = [];
    if (swX !== undefined && swX !== 0) {
      parts.push('translateX(' + swX + 'px)');
    }
    parts.push('translate(' + (px || 0) + 'px, ' + (py || 0) + 'px)');
    parts.push('translate(-50%, -50%)');
    if (scale !== undefined) {
      parts.push('scale(' + scale + ')');
    }
    lightboxImg.style.transition = animate
      ? 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)'
      : 'none';
    lightboxImg.style.transform = parts.join(' ');
  }

  function resetTransform(animate) {
    currentScale = 1;
    panX = 0;
    panY = 0;
    swipeX = 0;
    setTransform(1, 0, 0, 0, animate);
    updateZoomButtons();
  }

  function getScaledDimensions() {
    var naturalW = lightboxImg.naturalWidth;
    var naturalH = lightboxImg.naturalHeight;
    if (!naturalW || !naturalH) {
      return { w: lightboxStage.clientWidth, h: lightboxStage.clientHeight };
    }
    var cw = lightboxStage.clientWidth;
    var ch = lightboxStage.clientHeight;
    var fit = Math.min(cw / naturalW, ch / naturalH, 1);
    return { w: naturalW * fit * currentScale, h: naturalH * fit * currentScale };
  }

  function clampPan() {
    var d = getScaledDimensions();
    var cw = lightboxStage.clientWidth;
    var ch = lightboxStage.clientHeight;
    var mx = Math.max(0, (d.w - cw) / 2);
    var my = Math.max(0, (d.h - ch) / 2);
    panX = Math.max(-mx, Math.min(mx, panX));
    panY = Math.max(-my, Math.min(my, panY));
  }

  function updateZoomButtons() {
    zoomOutBtn.disabled = currentScale <= 1;
    zoomInBtn.disabled = currentScale >= 3;
  }

  function loadImage(index, callback) {
    lightboxLoader.classList.add('active');
    lightboxImg.classList.add('loading');
    var img = new Image();
    img.onload = function () {
      lightboxImg.src = imageSrcs[index];
      lightboxLoader.classList.remove('active');
      lightboxImg.classList.remove('loading');
      if (callback) callback();
    };
    img.onerror = function () {
      lightboxImg.src = imageSrcs[index];
      lightboxLoader.classList.remove('active');
      lightboxImg.classList.remove('loading');
      if (callback) callback();
    };
    img.src = imageSrcs[index];
  }

  function preloadAdjacent() {
    var p = (currentIndex - 1 + totalImages) % totalImages;
    var n = (currentIndex + 1) % totalImages;
    [p, n].forEach(function (i) {
      var img = new Image();
      img.src = imageSrcs[i];
    });
  }

  function openLightbox(index) {
    if (isOpen || isAnimating) return;
    isOpen = true;
    currentIndex = index;
    currentScale = 1;
    panX = 0;
    panY = 0;
    swipeX = 0;

    document.body.classList.add('lightbox-open');
    lightbox.setAttribute('aria-hidden', 'false');
    lightbox.classList.add('open');

    counterEl.textContent = (currentIndex + 1) + ' / ' + totalImages;
    updateZoomButtons();

    lightboxImg.style.transition = 'none';
    lightboxImg.style.transform = 'translate(-50%, -50%) scale(1)';
    lightboxImg.style.opacity = '1';

    loadImage(currentIndex, function () {
      preloadAdjacent();
    });
  }

  function closeLightbox() {
    if (!isOpen) return;
    isOpen = false;
    isAnimating = false;

    lightbox.classList.remove('open');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('lightbox-open');

    setTimeout(function () {
      if (!isOpen) {
        lightboxImg.src = '';
        resetTransform(false);
        lightboxLoader.classList.remove('active');
        lightboxImg.classList.remove('loading');
      }
    }, 350);
  }

  function navigate(dir, fromSwipeX) {
    if (!isOpen || isAnimating) return;
    if (currentScale > 1) {
      resetTransform(true);
      return;
    }

    var ni = currentIndex + dir;
    if (ni < 0) ni = totalImages - 1;
    if (ni >= totalImages) ni = 0;
    if (ni === currentIndex) return;

    isAnimating = true;
    var sw = lightboxStage.clientWidth;

    swipeX = fromSwipeX !== undefined ? fromSwipeX : 0;
    lightboxImg.style.transition = 'none';
    lightboxImg.style.opacity = '1';
    setTransform(1, 0, 0, swipeX, false);

    lightboxStage.offsetHeight;

    swipeX = dir > 0 ? -sw : sw;
    lightboxImg.style.transition = 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)';
    setTransform(1, 0, 0, swipeX, true);

    setTimeout(function () {
      currentIndex = ni;
      swipeX = 0;
      currentScale = 1;
      panX = 0;
      panY = 0;
      counterEl.textContent = (currentIndex + 1) + ' / ' + totalImages;
      updateZoomButtons();

      loadImage(currentIndex, function () {
        lightboxImg.style.transition = 'none';
        lightboxImg.style.opacity = '1';
        setTransform(1, 0, 0, 0, false);
        preloadAdjacent();
        isAnimating = false;
      });
    }, 350);
  }

  function applyZoom(ns, cx, cy) {
    var os = currentScale;
    ns = Math.max(1, Math.min(3, ns));
    if (ns === os) return;

    if (cx !== undefined && cy !== undefined && os > 0) {
      var r = ns / os;
      panX = cx - (cx - panX) * r;
      panY = cy - (cy - panY) * r;
    }

    currentScale = ns;
    clampPan();
    updateZoomButtons();

    if (currentScale <= 1) {
      currentScale = 1;
      panX = 0;
      panY = 0;
    }
  }

  function getRel(e) {
    var r = lightboxStage.getBoundingClientRect();
    var x = e.touches ? e.touches[0].clientX : e.clientX;
    var y = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: x - r.left - r.width / 2, y: y - r.top - r.height / 2 };
  }

  function td(t) { return t.length < 2 ? 0 : Math.sqrt((t[0].clientX - t[1].clientX) ** 2 + (t[0].clientY - t[1].clientY) ** 2); }

  function tm(t) { return { x: (t[0].clientX + t[1].clientX) / 2, y: (t[0].clientY + t[1].clientY) / 2 }; }

  lightboxStage.addEventListener('touchstart', function (e) {
    if (!isOpen || isAnimating) return;
    touchMoved = false;
    isPinching = false;
    isSwiping = false;

    if (e.touches.length === 2) {
      isPinching = true;
      touchStartDistance = td(e.touches);
      touchStartScale = currentScale;
      var mid = tm(e.touches);
      var r = lightboxStage.getBoundingClientRect();
      touchStartPanX = panX;
      touchStartPanY = panY;
      touchStartMidX = mid.x - r.left - r.width / 2;
      touchStartMidY = mid.y - r.top - r.height / 2;
      e.preventDefault();
      return;
    }

    if (e.touches.length === 1) {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touchStartTime = Date.now();
      touchStartPanX = panX;
      touchStartPanY = panY;
    }
  }, { passive: false });

  lightboxStage.addEventListener('touchmove', function (e) {
    if (!isOpen || isAnimating) return;

    if (e.touches.length === 2 && isPinching) {
      e.preventDefault();
      var dist = td(e.touches);
      var mid = tm(e.touches);
      var r = lightboxStage.getBoundingClientRect();
      var rx = mid.x - r.left - r.width / 2;
      var ry = mid.y - r.top - r.height / 2;
      var ns = touchStartScale * (dist / touchStartDistance);
      var rat = ns / currentScale;
      panX = rx - (rx - touchStartPanX) * rat;
      panY = ry - (ry - touchStartPanY) * rat;
      currentScale = Math.max(1, Math.min(3, ns));
      clampPan();
      updateZoomButtons();
      if (currentScale <= 1) { currentScale = 1; panX = 0; panY = 0; }
      setTransform(currentScale, panX, panY, swipeX, false);
      return;
    }

    if (e.touches.length === 1 && !isPinching) {
      var dx = e.touches[0].clientX - touchStartX;
      var dy = e.touches[0].clientY - touchStartY;

      if (!touchMoved && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) touchMoved = true;
      if (!touchMoved) return;

      if (currentScale > 1) {
        e.preventDefault();
        panX = touchStartPanX + dx;
        panY = touchStartPanY + dy;
        clampPan();
        setTransform(currentScale, panX, panY, swipeX, false);
        isSwiping = false;
      } else if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 5) {
        e.preventDefault();
        isSwiping = true;
        var maxSwipe = lightboxStage.clientWidth * 0.5;
        swipeX = Math.max(-maxSwipe, Math.min(maxSwipe, dx * 0.55));
        setTransform(1, 0, 0, swipeX, false);
      }
    }
  }, { passive: false });

  lightboxStage.addEventListener('touchend', function (e) {
    if (!isOpen || isAnimating) return;

    if (isPinching) {
      isPinching = false;
      if (currentScale <= 1) { currentScale = 1; panX = 0; panY = 0; updateZoomButtons(); }
      clampPan();
      setTransform(currentScale, panX, panY, swipeX, true);
      return;
    }

    if (isSwiping && currentScale <= 1) {
      var th = lightboxStage.clientWidth * 0.25;
      if (swipeX > th) { navigate(-1, swipeX); }
      else if (swipeX < -th) { navigate(1, swipeX); }
      else { swipeX = 0; setTransform(1, 0, 0, 0, true); }
      isSwiping = false;
      return;
    }

    if (touchMoved && currentScale > 1) { clampPan(); setTransform(currentScale, panX, panY, swipeX, true); }

    if (!touchMoved && Date.now() - touchStartTime < 300) {
      var rect = lightboxStage.getBoundingClientRect();
      var tx = e.changedTouches[0].clientX - rect.left;
      var tz = rect.width * 0.3;
      if (tx < tz) { navigate(-1); } else if (tx > rect.width - tz) { navigate(1); }
    }

    touchMoved = false;
    isSwiping = false;
  });

  lightboxStage.addEventListener('dblclick', function (e) {
    if (!isOpen || isAnimating) return;
    e.preventDefault();
    dblClickPending = true;
    setTimeout(function () { dblClickPending = false; }, 250);
    if (currentScale > 1) { resetTransform(true); }
    else { var rel = getRel(e); applyZoom(2.5, rel.x, rel.y); setTransform(currentScale, panX, panY, swipeX, true); }
  });

  lightboxStage.addEventListener('wheel', function (e) {
    if (!isOpen || isAnimating) return;
    e.preventDefault();
    var rel = getRel(e);
    applyZoom(currentScale * (e.deltaY < 0 ? 1.3 : 1 / 1.3), rel.x, rel.y);
    setTransform(currentScale, panX, panY, swipeX, true);
  }, { passive: false });

  lightboxStage.addEventListener('mousedown', function (e) {
    if (!isOpen || isAnimating) return;
    if (e.button !== 0) return;
    mouseDown = true;
    mouseDragged = false;
    mouseStartX = e.clientX;
    mouseStartY = e.clientY;
    mousePanStartX = panX;
    mousePanStartY = panY;
  });

  window.addEventListener('mousemove', function (e) {
    if (!mouseDown || !isOpen || isAnimating) return;
    var dx = e.clientX - mouseStartX;
    var dy = e.clientY - mouseStartY;
    if (!mouseDragged && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) mouseDragged = true;
    if (!mouseDragged) return;
    if (currentScale > 1) {
      panX = mousePanStartX + dx;
      panY = mousePanStartY + dy;
      clampPan();
      setTransform(currentScale, panX, panY, swipeX, false);
    }
  });

  window.addEventListener('mouseup', function (e) {
    if (!mouseDown) return;
    mouseDown = false;
    if (mouseDragged && currentScale > 1) { clampPan(); setTransform(currentScale, panX, panY, swipeX, true); }

    if (!mouseDragged && isOpen && !isAnimating && !dblClickPending && currentScale <= 1) {
      var sr = lightboxStage.getBoundingClientRect();
      var cx = e.clientX - sr.left;
      var tz = sr.width * 0.2;
      if (cx < tz) { navigate(-1); } else if (cx > sr.width - tz) { navigate(1); }
    }
    mouseDragged = false;
  });

  cards.forEach(function (card) {
    card.addEventListener('click', function () {
      openLightbox(parseInt(card.getAttribute('data-index')));
    });
  });

  closeBtn.addEventListener('click', function (e) { e.stopPropagation(); closeLightbox(); });

  bgOverlay.addEventListener('click', function (e) {
    if (e.target === bgOverlay || e.target === lightbox.querySelector('.lightbox-stage')) closeLightbox();
  });

  zoomOutBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    if (currentScale <= 1) return;
    applyZoom(currentScale / 1.5);
    setTransform(currentScale, panX, panY, swipeX, true);
  });

  zoomInBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    if (currentScale >= 3) return;
    applyZoom(currentScale * 1.5);
    setTransform(currentScale, panX, panY, swipeX, true);
  });

  document.addEventListener('keydown', function (e) {
    if (!isOpen || isAnimating) return;
    switch (e.key) {
      case 'Escape': closeLightbox(); break;
      case 'ArrowLeft': e.preventDefault(); navigate(-1); break;
      case 'ArrowRight': e.preventDefault(); navigate(1); break;
      case '+': case '=': e.preventDefault(); if (currentScale < 3) { applyZoom(currentScale * 1.5); setTransform(currentScale, panX, panY, swipeX, true); } break;
      case '-': e.preventDefault(); if (currentScale > 1) { applyZoom(currentScale / 1.5); setTransform(currentScale, panX, panY, swipeX, true); } break;
      case '0': e.preventDefault(); resetTransform(true); break;
    }
  });

  if (typeof window.GestureEvent !== 'undefined') {
    document.addEventListener('gesturestart', function (e) { if (isOpen) e.preventDefault(); });
    document.addEventListener('gesturechange', function (e) { if (isOpen) e.preventDefault(); });
    document.addEventListener('gestureend', function (e) { if (isOpen) e.preventDefault(); });
  }
})();
