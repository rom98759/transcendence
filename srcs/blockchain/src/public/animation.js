const el = document.querySelector('.scramble');
// const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';//₿
const chars = '₿𖢻❄£$ᝰ.€';
const random = () => chars[Math.floor(Math.random() * chars.length)];

el.addEventListener('mouseover', () => {
  const text = el.dataset.text;
  let i = 0;

  const interval = setInterval(() => {
    el.textContent = text
      .split('')
      .map((char, index) => (index < i ? char : random()))
      .join('');
    i++;
    if (i > text.length) clearInterval(interval);
  }, 150);
});
