/**
 * Countdown timer
 *
 * Modes:
 * - "date": counts down to a fixed launch date/time (same for every visitor).
 * - "duration": evergreen timer; each visitor gets their own countdown of the
 *   configured length, remembered in localStorage.
 */
class CountdownTimer extends HTMLElement {
  connectedCallback() {
    this.units = {
      days: this.querySelector('[data-unit="days"]'),
      hours: this.querySelector('[data-unit="hours"]'),
      minutes: this.querySelector('[data-unit="minutes"]'),
      seconds: this.querySelector('[data-unit="seconds"]'),
    };
    this.timerEl = this.querySelector('[data-countdown-timer]');
    this.expiredEl = this.querySelector('[data-countdown-expired]');
    this.onExpire = this.dataset.onExpire || 'zeros';

    this.endTime = this.getEndTime();
    if (this.endTime === null) {
      this.showError();
      return;
    }

    this.tick();
  }

  disconnectedCallback() {
    clearTimeout(this.timeout);
  }

  /** @returns {number | null} end time in ms, or null if the settings are invalid */
  getEndTime() {
    if (this.dataset.mode === 'duration') return this.getDurationEndTime();

    const date = (this.dataset.date || '').trim();
    const time = (this.dataset.time || '00:00').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{1,2}:\d{2}$/.test(time)) return null;

    const [h, m] = time.split(':');
    const end = Date.parse(`${date}T${h.padStart(2, '0')}:${m}:00${this.dataset.offset || 'Z'}`);
    return Number.isNaN(end) ? null : end;
  }

  getDurationEndTime() {
    const length = Number(this.dataset.duration) || 0;
    if (length <= 0) return null;

    // Keyed by block id + length so changing the duration in the editor starts a fresh timer.
    const key = `countdown-timer:${this.dataset.blockId}:${length}`;
    const inEditor = window.Shopify && window.Shopify.designMode;

    if (!inEditor) {
      try {
        const stored = Number(localStorage.getItem(key));
        if (stored && (stored > Date.now() || this.onExpire !== 'restart')) return stored;
      } catch (e) {
        // Storage unavailable; fall through to a fresh timer.
      }
    }

    const end = Date.now() + length;
    if (!inEditor) {
      try {
        localStorage.setItem(key, String(end));
      } catch (e) {}
    }
    return end;
  }

  tick() {
    let remaining = this.endTime - Date.now();

    if (remaining <= 0) {
      if (this.dataset.mode === 'duration' && this.onExpire === 'restart') {
        this.endTime = Date.now() + Number(this.dataset.duration);
        try {
          localStorage.setItem(`countdown-timer:${this.dataset.blockId}:${this.dataset.duration}`, String(this.endTime));
        } catch (e) {}
        remaining = this.endTime - Date.now();
      } else {
        this.render(0);
        this.expire();
        return;
      }
    }

    this.render(remaining);
    // Re-sync to the next whole second so the display doesn't drift.
    this.timeout = setTimeout(() => this.tick(), (remaining % 1000) || 1000);
  }

  /** @param {number} ms */
  render(ms) {
    const total = Math.ceil(ms / 1000);
    const values = {
      days: Math.floor(total / 86400),
      // With days hidden, roll them into the hours count.
      hours: this.units.days ? Math.floor((total % 86400) / 3600) : Math.floor(total / 3600),
      minutes: Math.floor((total % 3600) / 60),
      seconds: total % 60,
    };

    for (const [unit, value] of Object.entries(values)) {
      const el = this.units[unit];
      if (!el) continue;
      const text = String(value).padStart(2, '0');
      if (el.textContent !== text) el.textContent = text;
    }
  }

  expire() {
    this.classList.add('countdown-timer--expired');
    if (this.onExpire === 'hide') {
      this.hidden = true;
    } else if (this.onExpire === 'message' && this.expiredEl) {
      if (this.timerEl) this.timerEl.hidden = true;
      this.expiredEl.hidden = false;
    }
  }

  showError() {
    if (window.Shopify && window.Shopify.designMode) {
      this.render(0);
      this.setAttribute('data-invalid', '');
    } else {
      this.hidden = true;
    }
  }
}

if (!customElements.get('countdown-timer')) {
  customElements.define('countdown-timer', CountdownTimer);
}
