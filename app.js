/* global gsap, ScrollTrigger */

(function () {
  var sections = Array.prototype.slice.call(document.querySelectorAll('.offer-section'));
  var links = Array.prototype.slice.call(document.querySelectorAll('.toc-link'));
  var printState = null;
  var animatedPrintTargets = Array.prototype.slice.call(
    document.querySelectorAll('.hero-card, .intro-card, .sections-card, .offer-section')
  );

  var updatePrintMetadata = function () {
    var printDate = document.getElementById('printDate');
    var offerDate = document.getElementById('offerDate');
    if (printDate) {
      var dateText;
      try {
        dateText = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date());
      } catch (err) {
        dateText = new Date().toLocaleDateString('fr-FR');
      }
      printDate.textContent = dateText;
      if (offerDate) offerDate.textContent = dateText;
    } else if (offerDate) {
      offerDate.textContent = new Date().toLocaleDateString('fr-FR');
    }

    var printTocList = document.getElementById('printTocList');
    if (printTocList && printTocList.children.length === 0) {
      links.forEach(function (link) {
        var item = document.createElement('li');
        item.textContent = link.textContent.trim();
        printTocList.appendChild(item);
      });
    }
  };

  var setButtonLabel = null;

  var clearPrintBreaks = function () {
    sections.forEach(function (sec) {
      sec.classList.remove('print-page-break-before');
    });
  };

  var getOuterHeight = function (el) {
    if (!el) return 0;
    var rect = el.getBoundingClientRect();
    var style = window.getComputedStyle(el);
    var mt = parseFloat(style.marginTop) || 0;
    var mb = parseFloat(style.marginBottom) || 0;
    return rect.height + mt + mb;
  };

  var applyHeightBasedPrintBreaks = function () {
    clearPrintBreaks();
    if (!sections.length) return;

    var pageHeightPx = (297 - (12 * 2)) * (96 / 25.4);
    var leadNodes = [
      document.getElementById('hero'),
      document.querySelector('.intro-card')
    ];
    var leadHeight = leadNodes.reduce(function (sum, node) {
      return sum + getOuterHeight(node);
    }, 0);

    var running = leadHeight % pageHeightPx;

    sections.forEach(function (sec) {
      var sectionHeight = getOuterHeight(sec);
      var fitsPage = sectionHeight <= pageHeightPx;
      var wouldOverflow = running > 0 && (running + sectionHeight > pageHeightPx);

      if (fitsPage && wouldOverflow) {
        sec.classList.add('print-page-break-before');
        running = 0;
      }

      running += sectionHeight;
      if (running >= pageHeightPx) {
        running = sectionHeight >= pageHeightPx ? 0 : sectionHeight;
      }
    });
  };

  var prepareForPrint = function () {
    if (printState) return;
    printState = {
      sectionOpenStates: sections.map(function (d) { return d.open; }),
      hash: window.location.hash
    };

    sections.forEach(function (d) {
      d.open = true;
    });

    document.body.classList.add('print-mode');
    document.body.classList.add('pdf-export-mode');
    if (window.location.hash && window.history && window.history.replaceState) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
    animatedPrintTargets.forEach(function (el) {
      el.style.opacity = '';
      el.style.visibility = '';
      el.style.transform = '';
      el.style.filter = '';
    });
    // Ensure layout is fully updated before measuring heights.
    void document.body.offsetHeight;
    updatePrintMetadata();
    applyHeightBasedPrintBreaks();
    if (setButtonLabel) setButtonLabel();
  };

  var restoreAfterPrint = function () {
    if (!printState) return;
    var savedState = printState;

    sections.forEach(function (d, index) {
      d.open = !!savedState.sectionOpenStates[index];
    });
    clearPrintBreaks();

    printState = null;
    document.body.classList.remove('print-mode');
    document.body.classList.remove('pdf-export-mode');
    if (savedState.hash && window.history && window.history.replaceState) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search + savedState.hash);
    }
    if (setButtonLabel) setButtonLabel();
  };

  var logoutBtn = document.getElementById('logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function () {
      sessionStorage.removeItem('upsm_access');
      window.location.replace('login.html');
    });
  }
  var pdfBtn = document.getElementById('downloadPdf');
  if (pdfBtn) {
    pdfBtn.addEventListener('click', function (event) {
      event.preventDefault();
      prepareForPrint();
      window.setTimeout(function () {
        window.print();
      }, 40);
    });
  }

  var expandBtn = document.getElementById('expandAll');
  if (expandBtn && sections.length) {
    setButtonLabel = function () {
      var allOpen = sections.every(function (d) { return d.open; });
      expandBtn.textContent = allOpen ? 'Tout replier' : 'Tout d\u00E9plier';
    };

    setButtonLabel();

    expandBtn.addEventListener('click', function () {
      var allOpen = sections.every(function (d) { return d.open; });
      sections.forEach(function (d) {
        d.open = !allOpen;
      });
      setButtonLabel();
    });

    sections.forEach(function (d) {
      d.addEventListener('toggle', setButtonLabel);
    });
  }

  var progress = document.getElementById('readProgress');
  if (progress) {
    var onScroll = function () {
      var doc = document.documentElement;
      var max = doc.scrollHeight - doc.clientHeight;
      var pct = max > 0 ? (window.scrollY / max) * 100 : 0;
      progress.style.width = Math.max(0, Math.min(100, pct)) + '%';
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  if (links.length && 'IntersectionObserver' in window) {
    var byId = {};
    links.forEach(function (link) {
      var id = link.getAttribute('href').replace('#', '');
      byId[id] = link;
    });

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var id = entry.target.getAttribute('id');
        links.forEach(function (l) { l.classList.remove('active'); });
        if (byId[id]) byId[id].classList.add('active');
      });
    }, { rootMargin: '-35% 0px -55% 0px', threshold: 0.01 });

    sections.forEach(function (sec) { observer.observe(sec); });
  }

  window.addEventListener('beforeprint', prepareForPrint);
  window.addEventListener('afterprint', restoreAfterPrint);

  if (window.matchMedia) {
    var printMedia = window.matchMedia('print');
    if (printMedia.addEventListener) {
      printMedia.addEventListener('change', function (event) {
        if (!event.matches) restoreAfterPrint();
      });
    } else if (printMedia.addListener) {
      printMedia.addListener(function (event) {
        if (!event.matches) restoreAfterPrint();
      });
    }
  }

  updatePrintMetadata();

  if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    gsap.from('.hero-card, .intro-card', {
      opacity: 0,
      y: 24,
      duration: 0.7,
      stagger: 0.12,
      ease: 'power2.out'
    });

    gsap.utils.toArray('.offer-section').forEach(function (section) {
      gsap.from(section, {
        opacity: 0,
        y: 18,
        duration: 0.55,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: section,
          start: 'top 86%'
        }
      });
    });
  }
})();
