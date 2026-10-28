'use strict';

// Stable IDs make saved selections independent of display names and ordering.
const products = [
  { id: 'country-loaf', name: 'North Star Country Sourdough', category: 'bread', price: '$8.50' },
  { id: 'rye-batard', name: 'Seeded Whole Rye Batard', category: 'bread', price: '$9.00' },
  { id: 'croissant', name: 'Butter Croissant', category: 'pastry', price: '$4.25' },
  { id: 'chocolate-pastry', name: 'Pain au Chocolat', category: 'pastry', price: '$4.75' },
  { id: 'vanilla-cake', name: 'Classic Vanilla Bean Sponge Cake', category: 'cake', price: 'From $32.00' },
  { id: 'lemon-cake', name: 'Meyer Lemon Olive Oil Cake', category: 'cake', price: '$28.00' }
];
const storageKey = 'northStarBakeryFavorites';
let favorites = [];
let storageAvailable = true;

function loadFavorites() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
    // Reject malformed, duplicate, and obsolete IDs before rendering.
    favorites = Array.isArray(saved)
      ? [...new Set(saved.filter(id => products.some(product => product.id === id)))]
      : [];
  } catch (error) {
    favorites = [];
    storageAvailable = false;
  }
}

function saveFavorites() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(favorites));
    storageAvailable = true;
  } catch (error) {
    storageAvailable = false;
  }
}

function renderFavorites(message = '') {
  const container = document.getElementById('favorite-products');
  const category = document.getElementById('product-category').value;
  container.replaceChildren();
  products.filter(product => category === 'all' || product.category === category).forEach(product => {
    const card = document.createElement('article');
    card.className = 'favorite-card';
    const heading = document.createElement('h3');
    heading.textContent = product.name;
    const price = document.createElement('p');
    price.textContent = product.price;
    const button = document.createElement('button');
    const selected = favorites.includes(product.id);
    button.type = 'button';
    button.dataset.productId = product.id;
    button.setAttribute('aria-pressed', String(selected));
    button.setAttribute('aria-label', `${selected ? 'Remove' : 'Save'} ${product.name}`);
    button.textContent = selected ? 'Saved — remove' : 'Save favorite';
    button.addEventListener('click', () => toggleFavorite(product.id));
    card.append(heading, price, button);
    container.append(card);
  });
  const list = document.getElementById('saved-favorites');
  list.replaceChildren();
  const selectedProducts = products.filter(product => favorites.includes(product.id));
  if (!selectedProducts.length) {
    const item = document.createElement('li');
    item.textContent = 'No favorites saved yet.';
    list.append(item);
  } else {
    selectedProducts.forEach(product => {
      const item = document.createElement('li');
      item.textContent = `${product.name} — ${product.price}`;
      list.append(item);
    });
  }
  document.getElementById('favorites-summary').textContent =
    `${message ? message + ' ' : ''}${favorites.length} favorite${favorites.length === 1 ? '' : 's'} saved.`;
  document.getElementById('storage-status').textContent = storageAvailable
    ? 'Saved favorites are remembered on this browser after a refresh.'
    : 'Browser storage is unavailable or unreadable. Favorites work for this visit but may not be remembered.';
  document.getElementById('clear-favorites').disabled = favorites.length === 0;
}

function toggleFavorite(id) {
  const wasSaved = favorites.includes(id);
  favorites = wasSaved ? favorites.filter(savedId => savedId !== id) : [...favorites, id];
  saveFavorites();
  renderFavorites(wasSaved ? 'Item removed.' : 'Item saved.');
  // Re-rendering replaces buttons; restore focus to the same product.
  document.querySelector(`[data-product-id="${id}"]`).focus();
}

function initFavorites() {
  if (!document.getElementById('favorite-products')) return;
  loadFavorites();
  renderFavorites(favorites.length ? 'Your favorites were restored.' : '');
  document.getElementById('product-category').addEventListener('change', () => renderFavorites());
  document.getElementById('clear-favorites').addEventListener('click', () => {
    favorites = [];
    saveFavorites();
    renderFavorites('Saved list cleared.');
    document.getElementById('product-category').focus();
  });
}

function localDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function updatePickupRequirement() {
  const type = document.getElementById('request-type').value;
  const date = document.getElementById('pickup-date');
  date.required = ['preorder', 'cake-order'].includes(type);
  const earliest = new Date();
  earliest.setDate(earliest.getDate() + (type === 'cake-order' ? 2 : 1));
  date.min = localDateString(earliest);
  return date.min;
}

function validationMessage(field) {
  const value = field.value.trim();
  if (field.required && !value) return field.id === 'pickup-date'
    ? 'Choose a pickup date for your order.' : 'This field is required.';
  if (!value) return '';
  if (field.id === 'customer-name' && value.length < 2) return 'Enter at least 2 characters for your name.';
  if (field.id === 'customer-email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Enter a valid email address, such as name@example.com.';
  if (field.id === 'customer-phone' && !/^\d{3}-\d{3}-\d{4}$/.test(value)) return 'Use the phone format 123-456-7890.';
  if (field.id === 'item-details' && value.length < 10) return 'Enter at least 10 characters describing your request.';
  if (field.id === 'pickup-date') {
    if (value < field.min) return `Choose ${field.min} or later; bread orders need 1 day and cakes need 2 days of notice.`;
    if (new Date(value + 'T12:00:00').getDay() === 1) return 'The bakery is closed on Mondays. Choose another day.';
  }
  if (!field.validity.valid) return 'Check this value and try again.';
  return '';
}

function showFieldError(field, message) {
  document.getElementById(field.id + '-error').textContent = message;
  field.setAttribute('aria-invalid', String(Boolean(message)));
}

function validateForm(fields) {
  updatePickupRequirement();
  const errors = fields.map(field => ({ field, message: validationMessage(field) }));
  errors.forEach(error => showFieldError(error.field, error.message));
  return errors.filter(error => error.message);
}

function initForm() {
  const form = document.getElementById('inquiry-form');
  if (!form) return;
  // Disable native popups only once the JavaScript validation is ready.
  form.noValidate = true;
  form.querySelector('button[type="submit"]').disabled = false;
  const fields = [...form.querySelectorAll('input, select, textarea')];
  fields.forEach(field => {
    const error = document.createElement('small');
    error.id = field.id + '-error';
    error.className = 'field-error';
    error.setAttribute('aria-live', 'polite');
    field.parentElement.append(error);
    field.setAttribute('aria-describedby', `${field.getAttribute('aria-describedby') || ''} ${error.id}`.trim());
    ['input', 'change'].forEach(event => field.addEventListener(event, () => {
      document.getElementById('request-review').replaceChildren();
      if (field.id === 'request-type') updatePickupRequirement();
      if (field.getAttribute('aria-invalid') === 'true') showFieldError(field, validationMessage(field));
      if (!form.querySelector('[aria-invalid="true"]')) document.getElementById('form-summary').textContent = '';
    }));
  });
  updatePickupRequirement();
  form.addEventListener('submit', event => {
    event.preventDefault();
    const errors = validateForm(fields);
    const summary = document.getElementById('form-summary');
    const review = document.getElementById('request-review');
    review.replaceChildren();
    if (errors.length) {
      summary.textContent = `Please correct ${errors.length} highlighted field${errors.length === 1 ? '' : 's'}. Your entries have been kept.`;
      errors[0].field.focus();
      return;
    }
    summary.textContent = 'Your entries passed validation.';
    const heading = document.createElement('h3');
    heading.textContent = 'Request ready for review';
    const text = document.createElement('p');
    text.textContent = 'This is a client-side demonstration. No request has been sent and no order has been placed. Contact the bakery directly to confirm availability.';
    review.append(heading, text);
  });
}

initFavorites();
initForm();
