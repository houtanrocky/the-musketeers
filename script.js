/* Maktab Sharif Group 3 — smooth scrolling + small UI niceties */
(function () {
'use strict';

var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var header = document.querySelector('.site-header');
var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav-link'));

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

/* Smooth scrolling for all in-page navigation links */
document.addEventListener('click', function (event) {
var link = event.target.closest('a[href^="#"]');
if (!link) return;

var id = link.getAttribute('href');
if (!id || id === '#') return;

var target = document.querySelector(id);
if (!target) return;

event.preventDefault();
scrollToSection(target);

/* Keep the URL shareable without causing a jump */
if (history.pushState) {
history.pushState(null, '', id);
} else {
window.location.hash = id;
}
});

/* Highlight the nav link for the section currently in view */
var sections = Array.prototype.slice
.call(document.querySelectorAll('main section[id]'))
.filter(function (section) {
return navLinks.some(function (link) {
return link.getAttribute('href') === '#' + section.id;
});
});

if ('IntersectionObserver' in window && sections.length) {
var observer = new IntersectionObserver(
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

sections.forEach(function (section) { observer.observe(section); });
}

/* Footer year */
var yearEl = document.getElementById('year');
if (yearEl) {
yearEl.textContent = String(new Date().getFullYear());
}
})();