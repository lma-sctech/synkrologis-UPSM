/* global gsap, ScrollTrigger */

(function () {
  var sections = Array.prototype.slice.call(document.querySelectorAll('.offer-section'));
  var links = Array.prototype.slice.call(document.querySelectorAll('.toc-link'));
  var printState = null;
  var PRINT_PAGE_BUDGET = 4200;
  var PRINT_MIN_REMAINDER = 700;
  var animatedPrintTargets = Array.prototype.slice.call(
    document.querySelectorAll('.hero-card, .intro-card, .sections-card, .offer-section')
  );

  var updatePrintMetadata = function () {
    var printDate = document.getElementById('printDate');
    if (printDate) {
      var dateText;
      try {
        dateText = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date());
      } catch (err) {
        dateText = new Date().toLocaleDateString('fr-FR');
      }
      printDate.textContent = dateText;
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

  var getSectionPrintWeight = function (section) {
    var text = (section.textContent || '').replace(/\s+/g, ' ').trim();
    var weight = text.length;

    var rowCount = section.querySelectorAll('tr').length;
    if (rowCount) weight += rowCount * 220;

    var headingCount = section.querySelectorAll('h3, h4').length;
    if (headingCount) weight += headingCount * 90;

    var listItemCount = section.querySelectorAll('li').length;
    if (listItemCount) weight += listItemCount * 45;

    return weight;
  };

  var applySmartPrintBreaks = function () {
    sections.forEach(function (sec) {
      sec.classList.remove('print-page-break-before');
    });

    var leadWeight = 0;
    var hero = document.getElementById('hero');
    var intro = document.querySelector('.intro-card');
    if (hero) leadWeight += (hero.textContent || '').replace(/\s+/g, ' ').trim().length;
    if (intro) leadWeight += (intro.textContent || '').replace(/\s+/g, ' ').trim().length;

    var runningWeight = leadWeight;

    sections.forEach(function (sec) {
      var sectionWeight = getSectionPrintWeight(sec);
      var wouldOverflow = runningWeight > 0 && (runningWeight + sectionWeight > PRINT_PAGE_BUDGET);
      var remaining = PRINT_PAGE_BUDGET - runningWeight;

      if (wouldOverflow && remaining <= PRINT_MIN_REMAINDER) {
        sec.classList.add('print-page-break-before');
        runningWeight = 0;
      }

      runningWeight += sectionWeight;
      if (runningWeight > PRINT_PAGE_BUDGET) runningWeight = sectionWeight;
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
    if (window.location.hash && window.history && window.history.replaceState) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
    animatedPrintTargets.forEach(function (el) {
      el.style.opacity = '';
      el.style.visibility = '';
      el.style.transform = '';
      el.style.filter = '';
    });
    updatePrintMetadata();
    applySmartPrintBreaks();
    if (setButtonLabel) setButtonLabel();
  };

  var restoreAfterPrint = function () {
    if (!printState) return;
    var savedState = printState;

    sections.forEach(function (d, index) {
      d.open = !!savedState.sectionOpenStates[index];
      d.classList.remove('print-page-break-before');
    });

    printState = null;
    document.body.classList.remove('print-mode');
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
