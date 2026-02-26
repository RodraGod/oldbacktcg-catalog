const WA_NUMBER = "54911XXXXXXXX"; // <-- poné tu número con 54 + 9 + área + número
const CURRENCY = "USD";           // solo para texto
const DATA_URL = "./cards.json";

let cards = [];
let filtered = [];
let cart = new Map(); // id -> card

const $ = (id) => document.getElementById(id);

function formatUSD(n) {
  // Evita cosas raras tipo 2.5000001
  const v = Math.round(n * 100) / 100;
  return `${v.toFixed(v % 1 ? 2 : 0)} USD`;
}

function uniqueSets(list) {
  return ["(Todos)"].concat([...new Set(list.map(c => c.set))].sort());
}

function uniqueConds(list) {
  const order = ["NM","LP","MP","HP","DMG"];
  const conds = [...new Set(list.map(c => c.condition))];
  conds.sort((a,b) => (order.indexOf(a) - order.indexOf(b)));
  return ["(Todas)"].concat(conds);
}

function setOptions(selectEl, options) {
  selectEl.innerHTML = "";
  for (const o of options) {
    const opt = document.createElement("option");
    opt.value = o;
    opt.textContent = o;
    selectEl.appendChild(opt);
  }
}

function getFilters() {
  return {
    q: $("q").value.trim().toLowerCase(),
    set: $("set").value,
    cond: $("cond").value,
    sort: $("sort").value
  };
}

function applyFilters() {
  const { q, set, cond, sort } = getFilters();

  filtered = cards.filter(c => c.stock > 0);

  if (q) {
    filtered = filtered.filter(c =>
      (c.name + " " + c.set + " " + c.condition + " " + c.id + " " + (c.notes || ""))
        .toLowerCase()
        .includes(q)
    );
  }
  if (set && set !== "(Todos)") filtered = filtered.filter(c => c.set === set);
  if (cond && cond !== "(Todas)") filtered = filtered.filter(c => c.condition === cond);

  if (sort === "price_asc") filtered.sort((a,b) => a.price_usd - b.price_usd);
  if (sort === "price_desc") filtered.sort((a,b) => b.price_usd - a.price_usd);
  if (sort === "name_asc") filtered.sort((a,b) => a.name.localeCompare(b.name));
  if (sort === "set_asc") filtered.sort((a,b) => a.set.localeCompare(b.set));

  render();
}

function render() {
  $("countBadge").textContent = filtered.length;
  $("status").textContent = `Mostrando ${filtered.length} carta(s) en stock`;

  const grid = $("grid");
  grid.innerHTML = "";

  for (const c of filtered) {
    const el = document.createElement("div");
    el.className = "card";

    const img = document.createElement("img");
    img.className = "thumb";
    img.loading = "lazy";
    img.alt = `${c.name} ${c.id}`;
    img.src = c.img;

    const pad = document.createElement("div");
    pad.className = "pad";

    const name = document.createElement("div");
    name.className = "name";
    name.textContent = `${c.name}`;

    const meta = document.createElement("div");
    meta.className = "meta";
    meta.innerHTML = `
      <span class="pill">${c.id}</span>
      <span class="pill">${c.set}</span>
      <span class="pill">${c.condition}</span>
    `;

    const price = document.createElement("div");
    price.className = "price";
    price.textContent = formatUSD(c.price_usd);

    const actions = document.createElement("div");
    actions.className = "actions";

    const add = document.createElement("button");
    add.textContent = cart.has(c.id) ? "Agregado" : "Agregar";
    add.onclick = () => {
      cart.set(c.id, c);
      updateCartUI();
      applyFilters(); // refresca botones
    };

    const view = document.createElement("button");
    view.textContent = "Ver";
    view.onclick = () => window.open(c.img, "_blank");

    actions.appendChild(add);
    actions.appendChild(view);

    pad.appendChild(name);
    pad.appendChild(meta);
    if (c.notes) {
      const notes = document.createElement("div");
      notes.className = "small";
      notes.textContent = c.notes;
      pad.appendChild(notes);
    }
    pad.appendChild(price);
    pad.appendChild(actions);

    el.appendChild(img);
    el.appendChild(pad);
    grid.appendChild(el);
  }

  updateCartUI();
}

function cartTotal() {
  let total = 0;
  for (const c of cart.values()) total += (c.price_usd || 0);
  return Math.round(total * 100) / 100;
}

function updateCartUI() {
  const n = cart.size;
  $("cartCount").textContent = n;
  $("cartTotal").textContent = formatUSD(cartTotal());

  const list = $("cartList");
  list.innerHTML = "";

  for (const c of cart.values()) {
    const row = document.createElement("div");
    row.className = "item";
    row.innerHTML = `
      <img src="${c.img}" alt="${c.name}">
      <div class="info">
        <div class="t">${c.name} <span class="pill">${c.id}</span></div>
        <div class="s">${c.set} • ${c.condition} • ${formatUSD(c.price_usd)}</div>
      </div>
    `;
    const rm = document.createElement("button");
    rm.className = "rm";
    rm.textContent = "Sacar";
    rm.onclick = () => {
      cart.delete(c.id);
      updateCartUI();
      applyFilters();
    };
    row.appendChild(rm);
    list.appendChild(row);
  }

  $("sheetSummary").textContent = `${n} item(s) — Total ${formatUSD(cartTotal())}`;
}

function buildWhatsAppText() {
  const items = [...cart.values()].map(c =>
    `- ${c.id} | ${c.name} | ${c.set} | ${c.condition} | ${formatUSD(c.price_usd)}`
  );
  const total = formatUSD(cartTotal());
  const header = `Hola! Quiero armar pedido:\n`;
  const body = items.length ? items.join("\n") : "(pedido vacío)";
  const footer = `\n\nTotal: ${total}\nConfirmame disponibilidad y formas de pago/envío.`;
  return header + body + footer;
}

function sendWhatsApp() {
  const text = buildWhatsAppText();
  const url = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank");
}

function openCart() { $("modal").style.display = "flex"; }
function closeCart() { $("modal").style.display = "none"; }

async function init() {
  setOptions($("sort"), [
    { v: "default", t: "Orden: por defecto" },
    { v: "price_asc", t: "Precio: menor a mayor" },
    { v: "price_desc", t: "Precio: mayor a menor" },
    { v: "name_asc", t: "Nombre: A-Z" },
    { v: "set_asc", t: "Set: A-Z" }
  ].map(o => o.t));

  // Hack simple: guardar value real en data
  // Re-armo sort select bien:
  const sort = $("sort");
  sort.innerHTML = "";
  for (const o of [
    ["default","Orden: por defecto"],
    ["price_asc","Precio: menor a mayor"],
    ["price_desc","Precio: mayor a menor"],
    ["name_asc","Nombre: A-Z"],
    ["set_asc","Set: A-Z"]
  ]) {
    const opt = document.createElement("option");
    opt.value = o[0];
    opt.textContent = o[1];
    sort.appendChild(opt);
  }

  const res = await fetch(DATA_URL, { cache: "no-store" });
  cards = await res.json();

  setOptions($("set"), uniqueSets(cards));
  setOptions($("cond"), uniqueConds(cards));

  $("q").addEventListener("input", applyFilters);
  $("set").addEventListener("change", applyFilters);
  $("cond").addEventListener("change", applyFilters);
  $("sort").addEventListener("change", applyFilters);

  $("openCart").onclick = openCart;
  $("closeCart").onclick = closeCart;
  $("modal").addEventListener("click", (e) => { if (e.target.id === "modal") closeCart(); });

  $("sendWA").onclick = sendWhatsApp;
  $("sendWA2").onclick = sendWhatsApp;
  $("clearCart").onclick = () => { cart.clear(); updateCartUI(); applyFilters(); };

  applyFilters();
}

init().catch(err => {
  console.error(err);
  $("status").textContent = "Error cargando cards.json (revisá el JSON).";
});
