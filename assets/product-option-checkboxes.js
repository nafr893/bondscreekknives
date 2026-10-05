/**
 * Product option checkboxes
 *
 * Writes the selected option(s) into a hidden line item property inside the
 * product form (so it shows on the cart line and the admin order), and blocks
 * add to cart until something is selected when the block is required.
 */
class ProductOptionCheckboxes extends HTMLElement {
  connectedCallback() {
    this.checkboxes = Array.from(this.querySelectorAll('input[type="checkbox"]'));
    this.errorEl = this.querySelector('[data-error]');
    this.required = this.hasAttribute('data-required');
    this.multiple = this.hasAttribute('data-multiple');

    this.form = document.getElementById(this.dataset.formId);
    if (!this.form) return;

    this.input = this.getOrCreateInput();

    this.addEventListener('change', this.onChange);
    // Capture phase on document runs before the theme's delegated submit handler.
    document.addEventListener('submit', this.onSubmit, true);

    this.sync();
  }

  disconnectedCallback() {
    this.removeEventListener('change', this.onChange);
    document.removeEventListener('submit', this.onSubmit, true);
    this.input?.remove();
    this.setMissing(false);
  }

  getOrCreateInput() {
    const selector = `input[data-option-checkboxes="${this.dataset.blockId}"]`;
    let input = this.form.querySelector(selector);
    if (!input) {
      input = document.createElement('input');
      input.type = 'hidden';
      input.dataset.optionCheckboxes = this.dataset.blockId;
      this.form.appendChild(input);
    }
    input.name = `properties[${this.dataset.propertyName}]`;
    return input;
  }

  /** @param {Event} event */
  onChange = (event) => {
    const target = event.target;
    if (!this.multiple && target instanceof HTMLInputElement && target.checked) {
      for (const checkbox of this.checkboxes) {
        if (checkbox !== target) checkbox.checked = false;
      }
    }
    this.sync();
  };

  /** @param {SubmitEvent} event */
  onSubmit = (event) => {
    if (event.target !== this.form || !this.isMissing()) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    this.showError();
  };

  sync() {
    const values = this.checkboxes.filter((c) => c.checked).map((c) => c.value);
    // Shopify drops blank properties, so nothing is added when nothing is selected.
    this.input.value = values.join(', ');

    const missing = this.isMissing();
    this.setMissing(missing);
    if (!missing) this.hideError();
  }

  isMissing() {
    return this.required && !this.checkboxes.some((c) => c.checked);
  }

  /** @param {boolean} missing */
  setMissing(missing) {
    const container = this.form?.closest('product-form-component');
    if (!container) return;
    container.toggleAttribute('data-required-options-missing', missing);
  }

  showError() {
    if (this.errorEl) this.errorEl.hidden = false;
    this.classList.add('product-option-checkboxes--error');
    this.scrollIntoView({ behavior: 'smooth', block: 'center' });
    this.checkboxes[0]?.focus({ preventScroll: true });
  }

  hideError() {
    if (this.errorEl) this.errorEl.hidden = true;
    this.classList.remove('product-option-checkboxes--error');
  }
}

if (!customElements.get('product-option-checkboxes')) {
  customElements.define('product-option-checkboxes', ProductOptionCheckboxes);
}
