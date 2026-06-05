// Curbside Social Co. — main.js
// Add interactive features here as the site grows

// Smooth nav background on scroll
window.addEventListener('scroll', () => {
  const nav = document.querySelector('nav');
  if (window.scrollY > 60) {
    nav.style.background = 'rgba(10,10,8,0.97)';
  } else {
    nav.style.background = 'linear-gradient(to bottom, rgba(10,10,8,0.95), transparent)';
  }
});
