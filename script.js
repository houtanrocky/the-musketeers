/* The Musketeers — navigation, scroll progress, reveals & card spotlight */
(function () {
'use strict';

var root = document.documentElement;
var reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
var prefersReducedMotion = reduceMotionQuery.matches;

var header = document.querySelector('.site-header');
var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav-link'));

if (reduceMotionQuery.addEventListener) {
reduceMotionQuery.addEventListener('change', function (event) {
prefersReducedMotion = event.matches;
});
}

/* ---------------------------------------------------------------- helpers */
function headerOffset() {
return header ? header.offsetHeight + 8 : 0;
}

function scrollToSection(target) {
var top = target.getBoundingClientRect().top + window.pageYOffset - headerOffset();
window.scrollTo({
top: Math.max(top, 0),
behavior: prefersReducedMotion ? 'auto' : 'smooth'
});
}

/* ------------------------------------------------------- smooth scrolling */
document.addEventListener('click', function (event) {
var link = event.target.closest ? event.target.closest('a[href^="#"]') : null;
if (!link) return;

var id = link.getAttribute('href');
if (!id || id === '#') return;

var target = document.querySelector(id);
if (!target) return;

event.preventDefault();
scrollToSection(target);

if (history.pushState) {
history.pushState(null, '', id);
} else {
window.location.hash = id;
}
});

/* ------------------------------------------- active nav link on scroll */
var sections = Array.prototype.slice
.call(document.querySelectorAll('main section[id]'))
.filter(function (section) {
return navLinks.some(function (link) {
return link.getAttribute('href') === '#' + section.id;
});
});

if ('IntersectionObserver' in window && sections.length) {
var navObserver = new IntersectionObserver(
function (entries) {
entries.forEach(function (entry) {
if (!entry.isIntersecting) return;
var activeId = '#' + entry.target.id;
navLinks.forEach(function (link) {
link.classList.toggle('is-active', link.getAttribute('href') === activeId);
});
});
},
{ rootMargin: '-45% 0px -50% 0px', threshold: 0 }
);

sections.forEach(function (section) { navObserver.observe(section); });
}

/* ------------------------------------------------------ scroll progress */
var progressBar = document.getElementById('scrollProgress');
var progressTicking = false;

function updateProgress() {
progressTicking = false;
if (!progressBar) return;

var doc = document.documentElement;
var scrollable = doc.scrollHeight - window.innerHeight;
var ratio = scrollable > 0 ? window.pageYOffset / scrollable : 0;

progressBar.style.width = (Math.min(Math.max(ratio, 0), 1) * 100) + '%';
}

function requestProgress() {
if (progressTicking) return;
progressTicking = true;
window.requestAnimationFrame(updateProgress);
}

window.addEventListener('scroll', requestProgress, { passive: true });
window.addEventListener('resize', requestProgress);
updateProgress();

/* ------------------------------------------------------ reveal on scroll */
var revealItems = Array.prototype.slice.call(document.querySelectorAll('.reveal'));

if (prefersReducedMotion || !('IntersectionObserver' in window)) {
revealItems.forEach(function (item) { item.classList.add('is-visible'); });
} else if (revealItems.length) {
var revealObserver = new IntersectionObserver(
function (entries) {
entries.forEach(function (entry) {
if (!entry.isIntersecting) return;
entry.target.classList.add('is-visible');
revealObserver.unobserve(entry.target);
});
},
{ rootMargin: '0px 0px -12% 0px', threshold: 0.12 }
);

revealItems.forEach(function (item) { revealObserver.observe(item); });
}

/* -------------------------------------------- pointer spotlight on cards */
var canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
var cards = Array.prototype.slice.call(document.querySelectorAll('.card'));

if (canHover && cards.length) {
cards.forEach(function (card) {
card.addEventListener('pointermove', function (event) {
var rect = card.getBoundingClientRect();
var x = ((event.clientX - rect.left) / rect.width) * 100;
var y = ((event.clientY - rect.top) / rect.height) * 100;
card.style.setProperty('--mx', x.toFixed(2) + '%');
card.style.setProperty('--my', y.toFixed(2) + '%');
});

card.addEventListener('pointerleave', function () {
card.style.setProperty('--mx', '50%');
card.style.setProperty('--my', '0%');
});
});
}

/* ------------------------------------------------------------ footer year */
var yearEl = document.getElementById('year');
if (yearEl) {
yearEl.textContent = String(new Date().getFullYear());
}

/* Safety net: make sure nothing stays hidden if something above failed */
window.setTimeout(function () {
revealItems.forEach(function (item) { item.classList.add('is-visible'); });
}, 2500);

root.classList.remove('no-js');
})();