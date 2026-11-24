/* =========================================================
   Body Scent — script.js
   ไฟล์เดียวใช้ร่วมกันทุกหน้า: เมื่อโหลดแล้วจะตรวจว่าหน้านั้นมี element
   ของฟีเจอร์ไหนอยู่ แล้วทำงานเฉพาะส่วนนั้น

   1. product.html  →  #filter-bar, #product-list
   2. order.html    →  #orderForm, #customerName, #contact, #items, #total, #note
   3. admin.html    →  #ordersTable tbody
   ========================================================= */
(function () {
  'use strict';

  /* ---------- Config ---------- */
  const PRODUCTS_URL = 'products.json';
  const ORDER_PAGE = 'order.html';

  const ORDER_ENDPOINT =
    'https://script.google.com/macros/s/AKfycbxm40bnMoaEksoDXJg9ugto_f1VuPKRer3K4iZoekuPsb5WW2FaWffzqV_wlTI8fdZE3A/exec';

  const ORDERS_CSV_URL =
    'https://docs.google.com/spreadsheets/d/e/2PACX-1vR9Wki3-WisWYKStogrBJoLPzqRfYHHyvgxqj6utcv0ESRkuUGhTtAxQHjREoaHjAFWbshqHd9KuvTr/pub?gid=0&single=true&output=csv';

  // ปุ่มกรองตาม mood (key ต้องตรงกับ field mood ใน products.json)
  const FILTERS = [
    { key: 'all', label: 'ทั้งหมด' },
    { key: 'fresh', label: 'Fresh' },
    { key: 'sweet', label: 'Sweet' },
    { key: 'confident', label: 'Confident' },
    { key: 'romance', label: 'Romance' }
  ];

  /* ---------- Helpers ---------- */
  // สร้าง element โดยใส่ข้อความด้วย textContent เสมอ (ไม่ใช้ innerHTML กับข้อมูลภายนอก)
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function formatPrice(value) {
    return Number(value).toLocaleString('en-US') + ' บาท';
  }

  function moodLabel(key) {
    const found = FILTERS.find(function (f) { return f.key === key; });
    return found ? found.label : key;
  }

  /* =========================================================
     1. หน้าสินค้า (product.html)
     ========================================================= */
  function initProductPage() {
    const filterBar = document.getElementById('filter-bar');
    const list = document.getElementById('product-list');
    if (!filterBar || !list) return;

    list.classList.add('product-grid');
    showListMessage(list, 'กำลังโหลดสินค้า...');

    fetch(PRODUCTS_URL)
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (products) {
        list.textContent = '';
        products.forEach(function (p) {
          list.appendChild(createProductCard(p));
        });

        renderFilterBar(filterBar, list);

        // ?mood=xxx → กรองอัตโนมัติ (ค่าที่ไม่รู้จักจะแสดงทั้งหมด)
        const param = (new URLSearchParams(window.location.search).get('mood') || '')
          .trim()
          .toLowerCase();
        const valid = FILTERS.some(function (f) { return f.key === param; });
        applyFilter(valid ? param : 'all', filterBar, list);
      })
      .catch(function (error) {
        console.error(error);
        showListMessage(list, 'โหลดข้อมูลสินค้าไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
      });
  }

  function showListMessage(list, message) {
    list.textContent = '';
    const p = el('p', 'text-center', message);
    p.style.gridColumn = '1 / -1';
    list.appendChild(p);
  }

  function createProductCard(p) {
    const card = el('article', 'product-card');
    card.dataset.mood = p.mood; // ใช้ทั้งกรองสินค้า และกำหนดสีจุด mood ผ่าน CSS

    // รูป
    const media = el('div', 'product-card__media');
    const img = el('img');
    img.src = p.image;
    img.alt = p.name;
    img.loading = 'lazy';
    img.addEventListener('error', function () { img.remove(); }); // ไม่มีรูป → เหลือพื้นครีม
    media.appendChild(img);
    card.appendChild(media);

    const body = el('div', 'product-card__body');

    // จุด mood + ชื่อ mood
    const mood = el('div', 'product-card__mood');
    mood.appendChild(el('span', 'mood-dot'));
    mood.appendChild(el('span', null, moodLabel(p.mood)));
    body.appendChild(mood);

    // ชื่อ + ไซส์ (โรลออนที่ไม่มี size จะไม่แสดงบรรทัดไซส์)
    body.appendChild(el('h3', 'product-card__name', p.name));
    if (p.size) body.appendChild(el('p', 'product-card__meta', p.size));

    // ราคา + ปุ่มสั่งซื้อ
    const footer = el('div', 'product-card__footer');
    footer.appendChild(el('span', 'product-card__price', formatPrice(p.price)));

    const itemName = p.size ? p.name + ' ' + p.size : p.name;
    const orderLink = el('a', 'btn btn--small', 'สั่งซื้อ');
    orderLink.href =
      ORDER_PAGE +
      '?item=' + encodeURIComponent(itemName) +
      '&price=' + encodeURIComponent(p.price);
    footer.appendChild(orderLink);

    body.appendChild(footer);
    card.appendChild(body);
    return card;
  }

  function renderFilterBar(filterBar, list) {
    filterBar.textContent = '';
    filterBar.classList.add('filters');
    filterBar.setAttribute('role', 'group');
    filterBar.setAttribute('aria-label', 'กรองตามกลิ่น');

    FILTERS.forEach(function (f) {
      const btn = el('button', 'filter-btn');
      btn.type = 'button';
      btn.dataset.filter = f.key;
      if (f.key !== 'all') {
        btn.dataset.mood = f.key; // ให้จุดข้างหน้าได้สี mood
        btn.appendChild(el('span', 'mood-dot'));
      }
      btn.appendChild(document.createTextNode(f.label));
      btn.addEventListener('click', function () {
        applyFilter(f.key, filterBar, list);
      });
      filterBar.appendChild(btn);
    });
  }

  function applyFilter(mood, filterBar, list) {
    list.querySelectorAll('.product-card').forEach(function (card) {
      card.hidden = mood !== 'all' && card.dataset.mood !== mood;
    });

    filterBar.querySelectorAll('.filter-btn').forEach(function (btn) {
      const active = btn.dataset.filter === mood;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', String(active));
    });
  }

  /* =========================================================
     2. หน้าสั่งซื้อ (order.html)
     ========================================================= */
  function initOrderPage() {
    const form = document.getElementById('orderForm');
    if (!form) return;

    // เติมข้อมูลจาก URL parameter ลงฟอร์มทันที (ทั้ง items และ total)
    const params = new URLSearchParams(window.location.search);
    const item = params.get('item');
    const price = params.get('price');
    const itemsField = document.getElementById('items');
    const totalField = document.getElementById('total');

    if (item && itemsField) itemsField.value = item;
    if (price && totalField) totalField.value = price;

    function fieldValue(id) {
      const field = document.getElementById(id);
      return field ? field.value.trim() : '';
    }

    form.addEventListener('submit', function (event) {
      event.preventDefault();

      const payload = {
        customerName: fieldValue('customerName'),
        contact: fieldValue('contact'),
        items: fieldValue('items'),
        total: fieldValue('total'),
        note: fieldValue('note')
      };

      // กันกดซ้ำระหว่างส่ง
      const submitBtn = form.querySelector('[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      fetch(ORDER_ENDPOINT, {
        method: 'POST',
        body: JSON.stringify(payload)
      })
        .then(() => { window.location.href = 'thankyou.html'; })
        .catch(error => {
          console.error(error);
          alert('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
          if (submitBtn) submitBtn.disabled = false;
        });
    });
  }

  /* =========================================================
     3. หน้า admin (admin.html)
     คอลัมน์ในชีตที่คาดไว้ (ตามลำดับ):
     วันเวลา, ชื่อลูกค้า, เบอร์โทร/Line, รายการสินค้า, จำนวนเงินรวม, หมายเหตุ
     โดยแถวแรกเป็นหัวตาราง
     ========================================================= */
  const ORDER_COLUMNS = 6;

  // parse CSV เอง: รองรับ "..." ที่มี comma / ขึ้นบรรทัดใหม่ / "" (เครื่องหมายคำพูดที่ escape)
  function parseCSV(text) {
    const rows = [];
    let row = [];
    let field = '';
    let inQuotes = false;

    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // ตัด BOM

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];

      if (inQuotes) {
        if (ch === '"') {
          if (text[i + 1] === '"') {
            field += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          field += ch;
        }
      } else if (ch === '"' && field === '') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(field);
        field = '';
      } else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
      } else {
        field += ch;
      }
    }

    if (field !== '' || row.length > 0) {
      row.push(field);
      rows.push(row);
    }
    return rows;
  }

  function showTableMessage(tbody, message) {
    tbody.textContent = '';
    const tr = el('tr');
    const td = el('td', 'text-center', message);
    td.colSpan = ORDER_COLUMNS;
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  function initAdminPage() {
    const tbody = document.querySelector('#ordersTable tbody');
    if (!tbody) return;

    showTableMessage(tbody, 'กำลังโหลดข้อมูล...');

    fetch(ORDERS_CSV_URL, { cache: 'no-store' })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.text();
      })
      .then(function (text) {
        const orders = parseCSV(text)
          .slice(1) // ข้ามแถวหัวตาราง
          .filter(function (r) {
            return r.some(function (cell) { return cell.trim() !== ''; });
          })
          .reverse(); // ชีตเพิ่มแถวต่อท้ายตามเวลา → กลับด้านให้ล่าสุดขึ้นก่อน

        if (orders.length === 0) {
          showTableMessage(tbody, 'ยังไม่มีรายการสั่งซื้อ');
          return;
        }

        tbody.textContent = '';
        orders.forEach(function (r) {
          const tr = el('tr');
          for (let c = 0; c < ORDER_COLUMNS; c++) {
            tr.appendChild(el('td', null, (r[c] || '').trim())); // textContent กัน XSS จากข้อมูลลูกค้า
          }
          tbody.appendChild(tr);
        });
      })
      .catch(function (error) {
        console.error(error);
        showTableMessage(tbody, 'โหลดข้อมูลไม่สำเร็จ กรุณารีเฟรชหน้าอีกครั้ง');
      });
  }

  /* ---------- Init ---------- */
  function init() {
    initProductPage();
    initOrderPage();
    initAdminPage();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
