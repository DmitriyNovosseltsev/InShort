document.addEventListener('DOMContentLoaded', () => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------
     1. Поддержка команды: синхронизация с Vercel KV + конфетти
     --------------------------------------------------------- */
  const KEY_VOTED = 'inshort_has_voted';
  const ballots = document.querySelectorAll('[data-vote]');
  const countDisplays = document.querySelectorAll('[data-vote-count]');
  const status = document.querySelector('[data-vote-status]');

  let hasVoted = localStorage.getItem(KEY_VOTED) === 'true';

  function updateUI(count) {
    countDisplays.forEach(el => {
      el.textContent = count;
    });
    ballots.forEach(ballot => {
      ballot.classList.toggle('is-voted', hasVoted);
      ballot.setAttribute('aria-pressed', String(hasVoted));
      const label = ballot.querySelector('[data-vote-label]');
      if (label) {
        label.textContent = hasVoted ? 'Вы поддержали команду' : 'Поддержать команду';
      }
    });
  }

  // Получаем актуальный счёт из облачной базы
  async function fetchVotes() {
    try {
      const res = await fetch('/api/vote');
      if (res.ok) {
        const data = await res.json();
        updateUI(data.count);
      }
    } catch (e) {
      console.warn('Оффлайн-режим счётчика:', e);
    }
  }

  function celebrate(button, big) {
    if (typeof confetti !== 'function') return;
    const rect = button.getBoundingClientRect();
    const origin = {
      x: (rect.left + rect.width / 2) / window.innerWidth,
      y: (rect.top + rect.height / 2) / window.innerHeight
    };
    const colors = ['#4a6784', '#a9c3a5', '#d9c08f', '#e1e9ef', '#1f2e42'];
    const base = { origin, colors, disableForReducedMotion: true };

    if (big) {
      confetti({ ...base, particleCount: 80, spread: 70, startVelocity: 42 });
      setTimeout(() => confetti({ ...base, particleCount: 50, spread: 120, startVelocity: 28 }), 120);
    } else {
      confetti({ ...base, particleCount: 30, spread: 60, startVelocity: 30 });
    }
  }

  ballots.forEach((ballot) => {
    ballot.addEventListener('click', async () => {
      if (!hasVoted) {
        hasVoted = true;
        localStorage.setItem(KEY_VOTED, 'true');
        celebrate(ballot, true);
        if (status) status.textContent = 'Спасибо! Вы поддержали команду.';

        try {
          const res = await fetch('/api/vote', { method: 'POST' });
          if (res.ok) {
            const data = await res.json();
            updateUI(data.count);
          }
        } catch (e) {
          console.error('Ошибка отправки голоса:', e);
        }
      } else {
        celebrate(ballot, false);
      }
    });
  });

  fetchVotes();

  /* ---------------------------------------------------------
     2. Мобильное меню
     --------------------------------------------------------- */
  const nav = document.querySelector('.nav');
  const toggle = nav.querySelector('.nav__toggle');

  function setMenu(open) {
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
  }

  toggle.addEventListener('click', () => setMenu(!nav.classList.contains('is-open')));
  nav.querySelectorAll('.nav__links a').forEach((link) => link.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

  /* ---------------------------------------------------------
     3. Портрет: запасной вариант без фото и лёгкий 3D-наклон
     --------------------------------------------------------- */
  const portrait = document.querySelector('.portrait');
  const photo = portrait.querySelector('.portrait__img');
  const stage = portrait.querySelector('.portrait__stage');

  const showFallback = () => portrait.classList.add('no-photo');
  photo.addEventListener('error', showFallback);
  if (photo.complete && photo.naturalWidth === 0) showFallback();

  const canTilt = window.matchMedia('(hover: hover) and (pointer: fine)').matches && !reduceMotion;

  if (canTilt) {
    portrait.addEventListener('mousemove', (e) => {
      const rect = portrait.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      stage.style.setProperty('--ry', `${x * 6}deg`);
      stage.style.setProperty('--rx', `${y * -6}deg`);
    });

    portrait.addEventListener('mouseleave', () => {
      stage.style.setProperty('--ry', '0deg');
      stage.style.setProperty('--rx', '0deg');
    });
  }
});