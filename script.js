const yearSpans = document.querySelectorAll('#year');
yearSpans.forEach((span) => {
  span.textContent = new Date().getFullYear();
});

const menuToggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.site-nav');

if (menuToggle && nav) {
  menuToggle.addEventListener('click', () => {
    nav.classList.toggle('open');
  });
}

const forms = document.querySelectorAll('form');
forms.forEach((form) => {
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
      const initial = submitBtn.textContent;
      submitBtn.textContent = 'Отправлено ✓';
      submitBtn.disabled = true;
      setTimeout(() => {
        submitBtn.textContent = initial;
        submitBtn.disabled = false;
        form.reset();
      }, 1400);
    }
  });
});
