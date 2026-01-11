/* --- CONFIGURATION --- */
const firebaseConfig = {
  apiKey: "AIzaSyAHPndvsewwM0GDXQyrsf_LBeUW5RrHcZk",
  authDomain: "samarpan-pos.firebaseapp.com",
  databaseURL: "https://samarpan-pos-default-rtdb.firebaseio.com",
  projectId: "samarpan-pos",
  storageBucket: "samarpan-pos.firebasestorage.app",
  messagingSenderId: "974955463172",
  appId: "1:974955463172:web:711317e66399b1a1bd6b51"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

/* --- STATE & DOM --- */
let products = [];
let salesHistory = [];
let heldBills = [];
let cart = [];
let currentDiscount = 0; // NEW: Track discount percentage

const barcodeInput = document.getElementById('barcodeInput');
const cartTableBody = document.getElementById('cartTableBody');

/* --- INIT --- */
document.addEventListener('DOMContentLoaded', () => {
    setupFirebaseListeners();
    const todayFancy = new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    const dateEl = document.getElementById('currentDate');
    if(dateEl) dateEl.innerText = todayFancy;
    const loginDateEl = document.getElementById('loginDateDisplay');
    if(loginDateEl) loginDateEl.innerText = todayFancy;
    renderInventory();
    renderHistory();
    calculateDailyStats();
    updateHeldCount();
    if(barcodeInput) barcodeInput.focus();
});

/* --- FIREBASE LOGIC --- */
function setupFirebaseListeners() {
    db.ref('products').on('value', (snapshot) => {
        const data = snapshot.val();
        products = data ? Object.values(data) : [];
        renderInventory();
    });
    db.ref('sales').on('value', (snapshot) => {
        const data = snapshot.val();
        salesHistory = data ? Object.values(data) : [];
        const todayStr = new Date().toLocaleDateString('en-GB');
        const cleanHistory = salesHistory.filter(s => s.date === todayStr);
        salesHistory = cleanHistory; 
        renderHistory();
        calculateDailyStats();
    });
    db.ref('heldBills').on('value', (snapshot) => {
        const data = snapshot.val();
        heldBills = data ? Object.values(data) : [];
        updateHeldCount();
    });
}

function saveData() { db.ref('products').set(products); }
function saveSales() { db.ref('sales').set(salesHistory); }
function saveHeldBills() { db.ref('heldBills').set(heldBills); }

/* --- LOGIN LOGIC --- */
function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const pass = document.getElementById('loginPass').value;
    const errorMsg = document.getElementById('loginError');
    if (email === "admin@gmail.com" && pass === "admin@123") {
        document.getElementById('loginSection').style.display = 'none';
        if(barcodeInput) barcodeInput.focus();
    } else {
        errorMsg.style.display = 'block';
    }
}

/* --- NAVIGATION --- */
function showSection(id) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active-section'));
    document.getElementById(id).classList.add('active-section');
    document.querySelectorAll('.sidebar li').forEach(l => l.classList.remove('active'));
    const navIndex = id === 'billing' ? 0 : id === 'inventory' ? 1 : 2;
    const navItems = document.querySelectorAll('.sidebar li');
    if(navItems[navIndex]) navItems[navIndex].classList.add('active');
    if(id === 'billing' && barcodeInput) setTimeout(() => barcodeInput.focus(), 100);
}

/* --- CALCULATIONS --- */
function calculateDailyStats() {
    const totalRevenue = salesHistory.reduce((sum, sale) => sum + sale.total, 0);
    const totalItems = salesHistory.reduce((sum, sale) => sum + sale.items, 0);
    document.getElementById('dailyTotalDisplay').innerText = `₹${totalRevenue.toFixed(2)}`;
    document.getElementById('dailyItemsDisplay').innerText = totalItems;
}

/* --- INVENTORY FUNCTIONS --- */
function generateUniqueBarcode() {
    let code;
    let exists = true;
    while(exists) {
        code = Math.floor(10000000 + Math.random() * 90000000).toString();
        exists = products.some(p => p.barcode === code);
    }
    return code;
}
function generateRandomBarcode() {
    document.getElementById('prodBarcode').value = Math.floor(10000000 + Math.random() * 90000000);
}

const addForm = document.getElementById('addProductForm');
if(addForm) {
    addForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('editId').value;
        const name = document.getElementById('prodName').value;
        const size = document.getElementById('prodSize').value;
        const price = parseFloat(document.getElementById('prodPrice').value);
        const stock = 100;
        let barcode = document.getElementById('prodBarcode').value;
        if(!barcode) barcode = generateUniqueBarcode();
        if(id) {
            const index = products.findIndex(p => p.id == id);
            if(index !== -1) products[index] = { id: parseInt(id), name, size, price, stock, barcode };
        } else {
            if(products.find(p => p.barcode == barcode)) { alert('Barcode already exists!'); return; }
            products.push({ id: Date.now(), name, size, price, stock, barcode });
        }
        saveData();
        resetForm();
    });
}

function resetForm() {
    document.getElementById('addProductForm').reset();
    document.getElementById('editId').value = '';
    document.getElementById('formTitle').innerText = 'Add New Item';
    document.getElementById('saveBtn').innerText = 'Save Product';
    document.getElementById('saveBtn').classList.replace('btn-warning', 'btn-success');
    document.getElementById('cancelEditBtn').style.display = 'none';
}

function editProduct(id) {
    const p = products.find(x => x.id === id);
    if(!p) return;
    document.getElementById('editId').value = p.id;
    document.getElementById('prodName').value = p.name;
    document.getElementById('prodSize').value = p.size || '';
    document.getElementById('prodPrice').value = p.price;
    document.getElementById('prodBarcode').value = p.barcode;
    document.getElementById('formTitle').innerText = 'Edit Item';
    const btn = document.getElementById('saveBtn');
    btn.innerText = 'Update Product';
    btn.classList.replace('btn-success', 'btn-warning');
    document.getElementById('cancelEditBtn').style.display = 'inline-block';
}

function renderInventory() {
    const tbody = document.getElementById('inventoryTableBody');
    if(!tbody) return;
    tbody.innerHTML = '';
    const term = document.getElementById('inventorySearch').value.toLowerCase();
    const filtered = products.filter(p => p.name.toLowerCase().includes(term) || p.barcode.includes(term) || (p.size && p.size.toLowerCase().includes(term)));
    filtered.forEach(p => {
        tbody.innerHTML += `
            <tr style="${p.stock < 5 ? 'background:#fee2e2' : ''}">
                <td><small class="text-muted">${p.barcode}</small></td>
                <td><strong>${p.name}</strong></td>
                <td>${p.size || '-'}</td>
                <td>₹${p.price}</td>
                <td>${p.stock}</td>
                <td>
                    <button class="btn btn-warning" style="padding:6px 10px" onclick="editProduct(${p.id})"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn btn-danger" style="padding:6px 10px" onclick="deleteProduct(${p.id})"><i class="fa-solid fa-trash"></i></button>
                    <button class="btn btn-primary" style="padding:6px 10px" onclick="printLabels(${p.id})"><i class="fa-solid fa-print"></i></button>
                </td>
            </tr>`;
    });
}
function deleteProduct(id) { 
    if(confirm('Delete this product?')) { 
        products = products.filter(p => p.id !== id); 
        saveData(); 
    } 
}

/* --- POS & CART --- */
if(barcodeInput) {
    barcodeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && barcodeInput.value.trim()) {
            addToCart(barcodeInput.value.trim());
            barcodeInput.value = '';
        }
    });
}

function addToCart(code) {
    const product = products.find(p => p.barcode == code);
    if (!product) { alert('Product not found!'); return; }
    const existing = cart.find(i => i.barcode == code);
    if (existing) existing.qty++;
    else cart.push({ ...product, qty: 1 });
    renderCart();
}

function renderCart() {
    if(!cartTableBody) return;
    cartTableBody.innerHTML = '';
    if(cart.length === 0) document.getElementById('emptyCartMsg').style.display = 'block'; 
    else {
        document.getElementById('emptyCartMsg').style.display = 'none';
        cart.forEach((item, i) => {
            cartTableBody.innerHTML += `
                <tr>
                    <td><input value="${item.name}" onchange="updateItem(${i}, 'name', this.value)"></td>
                    <td>${item.size || '-'}</td>
                    <td><input type="number" value="${item.price}" onchange="updateItem(${i}, 'price', this.value)"></td>
                    <td>
                        <div class="qty-group"><button class="qty-btn" onclick="changeQty(${i}, -1)">-</button><span>${item.qty}</span><button class="qty-btn" onclick="changeQty(${i}, 1)">+</button></div>
                    </td>
                    <td>₹${(item.price * item.qty).toFixed(2)}</td>
                    <td><button class="btn btn-danger" style="padding:4px 8px;" onclick="removeFromCart(${i})"><i class="fa-solid fa-times"></i></button></td>
                </tr>`;
        });
    }
    calculateTotals();
}

function updateItem(i, f, v) { if(f==='price') cart[i].price=parseFloat(v); if(f==='name') cart[i].name=v; renderCart(); }
function changeQty(i, d) { cart[i].qty += d; if(cart[i].qty <= 0) cart.splice(i, 1); renderCart(); }
function removeFromCart(i) { cart.splice(i, 1); renderCart(); }
function clearCart() { cart = []; renderCart(); }

/* --- NEW: DISCOUNT & TOTALS LOGIC --- */
function setDiscount(val) {
    if(val === 'custom') {
        let input = prompt("Enter Discount Percentage (0-100):");
        if(input === null) return; 
        val = parseFloat(input);
        if(isNaN(val) || val < 0) val = 0;
    }
    currentDiscount = parseFloat(val);
    calculateTotals();
}

function calculateTotals() {
    // 1. Calculate Subtotal
    const subTotal = cart.reduce((acc, i) => acc + (i.price * i.qty), 0);
    
    // 2. Calculate Discount
    const discountAmt = subTotal * (currentDiscount / 100);
    
    // 3. Final Total
    const finalTotal = subTotal - discountAmt;

    // 4. Update UI
    document.getElementById('grandTotal').innerText = `₹${finalTotal.toFixed(2)}`;
    
    const discLabel = document.getElementById('discountLabel');
    if(discLabel) discLabel.innerText = `₹${discountAmt.toFixed(2)} (${currentDiscount}%)`;
    
    // 5. Check change (if cash entered)
    calculateChange();
}

function calculateChange() {
    // This is removed visually in the HTML per your request, 
    // but function is kept to avoid errors if referenced elsewhere
    const paid = parseFloat(document.getElementById('amountPaid')?.value) || 0;
    const totalText = document.getElementById('grandTotal').innerText.replace('₹', '');
    const total = parseFloat(totalText);
    // Logic remains in case you re-enable cash inputs
}

/* --- BILL FUNCTIONS --- */
function holdBill() {
    if(cart.length === 0) { alert("Cart is empty!"); return; }
    const custName = document.getElementById('custName').value || 'Guest';
    const total = parseFloat(document.getElementById('grandTotal').innerText.replace('₹', ''));
    
    // We also save subTotal/Discount in held bill just in case
    const subTotal = cart.reduce((acc, i) => acc + (i.price * i.qty), 0);
    const discountAmt = subTotal * (currentDiscount / 100);

    heldBills.push({
        id: Date.now(),
        time: new Date().toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit'}),
        customer: custName,
        total: total,
        cartData: [...cart],
        discountPct: currentDiscount, // Save discount state
        custData: { name: document.getElementById('custName').value, mobile: document.getElementById('custMobile').value }
    });
    saveHeldBills(); 
    clearCart();
    // Reset Discount
    currentDiscount = 0;
    calculateTotals();
    
    document.getElementById('custName').value = '';
    document.getElementById('custMobile').value = '';
    alert("Bill Parked Successfully!");
}

function updateHeldCount() {
    const el = document.getElementById('heldCount');
    if(el) el.innerText = heldBills.length;
}

function openHeldModal() {
    const modal = document.getElementById('heldBillsModal');
    const tbody = document.getElementById('heldBillsBody');
    tbody.innerHTML = '';
    if(heldBills.length === 0) {
        document.getElementById('noHeldMsg').style.display = 'block';
    } else {
        document.getElementById('noHeldMsg').style.display = 'none';
        heldBills.forEach((bill, i) => {
            tbody.innerHTML += `
                <tr>
                    <td>${bill.time}</td>
                    <td>${bill.customer}</td>
                    <td>₹${bill.total.toFixed(2)}</td>
                    <td>
                        <button class="btn btn-sm btn-info" onclick="restoreBill(${i})">Restore</button>
                        <button class="btn btn-sm btn-danger" onclick="deleteHeldBill(${i})"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>`;
        });
    }
    modal.style.display = 'flex';
}

function closeHeldModal() { document.getElementById('heldBillsModal').style.display = 'none'; }
function restoreBill(index) {
    if(cart.length > 0) { if(!confirm("Current cart will be cleared. Continue?")) return; }
    const bill = heldBills[index];
    cart = bill.cartData;
    currentDiscount = bill.discountPct || 0; // Restore discount
    
    document.getElementById('custName').value = bill.custData.name;
    document.getElementById('custMobile').value = bill.custData.mobile;
    heldBills.splice(index, 1);
    saveHeldBills();
    renderCart(); // This calls calculateTotals which uses currentDiscount
    closeHeldModal();
}
function deleteHeldBill(index) {
    if(confirm("Delete this held bill?")) {
        heldBills.splice(index, 1);
        saveHeldBills();
    }
}

function processSale(type) {
    if(cart.length === 0) { alert('Cart is Empty!'); return; }
    
    // Recalculate Logic to be safe
    const subTotal = cart.reduce((acc, i) => acc + (i.price * i.qty), 0);
    const discountAmt = subTotal * (currentDiscount / 100);
    const finalTotal = subTotal - discountAmt;
    
    const dateObj = new Date();
    const dateStr = dateObj.toLocaleDateString('en-GB'); 
    const serialNo = salesHistory.length + 1; 
    const uniqueId = 'BILL-' + Date.now().toString().slice(-6);
    
    const cName = document.getElementById('custName').value || 'Guest';
    const cMobile = document.getElementById('custMobile').value || '';
    
    // Save to History
    salesHistory.unshift({ 
        id: uniqueId, 
        serial: serialNo, 
        date: dateStr, 
        items: cart.length, 
        subTotal: subTotal,     // Saved
        discount: discountAmt,  // Saved
        total: finalTotal, 
        customer: cName, 
        mobile: cMobile, 
        details: [...cart] 
    });
    saveSales();
    
    // Receipt Data Filling
    document.getElementById('r-id').innerText = `SR No. ${serialNo}`;
    document.getElementById('r-date').innerText = dateStr;
    document.getElementById('r-cust-name').innerText = cName ? `Customer: ${cName}` : '';
    document.getElementById('r-cust-mobile').innerText = cMobile ? `Mo: ${cMobile}` : '';
    
    const body = document.getElementById('r-body');
    body.innerHTML = '';
    cart.forEach(i => {
        body.innerHTML += `<tr><td class="text-left">${i.name}</td><td class="text-center">${i.size || ''}</td><td class="text-center">${i.qty}</td><td class="text-right">${i.price}</td><td class="text-right">${(i.price*i.qty).toFixed(2)}</td></tr>`;
    });
    
    // UPDATED RECEIPT TOTALS
    if(document.getElementById('r-subtotal')) document.getElementById('r-subtotal').innerText = '₹' + subTotal.toFixed(2);
    if(document.getElementById('r-discount')) document.getElementById('r-discount').innerText = '₹' + discountAmt.toFixed(2);
    document.getElementById('r-total').innerText = '₹' + finalTotal.toFixed(2);
    
    try { JsBarcode("#r-barcode", uniqueId, { format: "CODE128", displayValue: true, height: 40, fontSize: 14 }); } catch(e) {}
    
    setTimeout(() => {
        window.print();
        clearCart();
        currentDiscount = 0; // Reset Discount
        calculateTotals();
        document.getElementById('custName').value = '';
        document.getElementById('custMobile').value = '';
    }, 300);
}

// === IMPROVED PRINT LABELS FUNCTION ===
// function printLabels(id) {
//     const p = products.find(x => x.id === id);
//     if(!p) return;
    
//     document.body.classList.add('printing-labels');
//     const sheet = document.getElementById('label-sheet');
//     sheet.innerHTML = '';
    
//     // Create 24 stickers
//     for(let i=0; i<24; i++) {
//         const svgId = `b-${id}-${i}`;
//         sheet.innerHTML += `
//             <div class="sticker">
//                 <h4>Samarpan Fashion</h4>
//                 <svg id="${svgId}"></svg>
//                 <p>Size: ${p.size || 'Free'} | ₹${p.price}</p>
//                 <small>${p.name}</small>
//             </div>`;
//     }

//     // Delay 1: Allow DOM to populate
//     setTimeout(() => {
//         for(let i=0; i<24; i++) {
//             const svgElement = document.getElementById(`b-${id}-${i}`);
//             if(svgElement) {
//                 try {
//                     JsBarcode(svgElement, p.barcode, { 
//                         format: "CODE128",
//                         height: 40,      // Matches CSS
//                         width: 1.8,      // Good thickness
//                         fontSize: 12,    
//                         displayValue: true,
//                         margin: 0
//                     });
//                 } catch(e) { console.error(e); }
//             }
//         }
        
//         // Delay 2: Allow SVG rendering (1 second)
//         setTimeout(() => {
//             window.print(); 
//             // Cleanup: remove class after print dialog closes/interacts
//             setTimeout(() => document.body.classList.remove('printing-labels'), 1000); 
//         }, 1000);
//     }, 100);
// }
// === UPDATED PRINT LABELS FUNCTION (Quantity Prompt + 50x25mm Support) ===
// === UPDATED PRINT LABELS (INSTANT PRINT 1 STICKER - NO POPUP) ===
function printLabels(id) {
    const p = products.find(x => x.id === id);
    if(!p) return;

    // --- CHANGE: REMOVED PROMPT, DEFAULT TO 1 ---
    let qty = 1; 
    
    document.body.classList.add('printing-labels');
    const sheet = document.getElementById('label-sheet');
    sheet.innerHTML = '';
    
    // Generate the single sticker
    for(let i=0; i<qty; i++) {
        const svgId = `b-${id}-${i}`;
        // Since it's only 1, we don't need the page-break style, but keeping logic safe
        const breakStyle = (i < qty - 1) ? 'style="page-break-after: always;"' : '';
        
        sheet.innerHTML += `
            <div class="sticker" ${breakStyle}>
                <h4>Samarpan Fashion</h4>
                <svg id="${svgId}"></svg>
                <p>Size: ${p.size || 'Free'} | ₹${p.price}</p>
            </div>`;
    }

    setTimeout(() => {
        for(let i=0; i<qty; i++) {
            const svgElement = document.getElementById(`b-${id}-${i}`);
            if(svgElement) {
                try {
                    JsBarcode(svgElement, p.barcode, { 
                        format: "CODE128",
                        width: 2.2,      // Thick Barcode
                        height: 40,      // Tall Barcode
                        fontSize: 14,    
                        displayValue: true,
                        margin: 0,
                        textMargin: 0
                    });
                } catch(e) { console.error(e); }
            }
        }
        
        setTimeout(() => {
            window.print(); 
            setTimeout(() => document.body.classList.remove('printing-labels'), 1000); 
        }, 500);
    }, 100);
}

function renderHistory() {
    const tbody = document.getElementById('salesHistoryBody');
    if(!tbody) return;
    tbody.innerHTML = '';
    salesHistory.slice(0,50).forEach((s, index) => { 
        const displayId = s.serial ? `SR No. ${s.serial}` : s.id;
        tbody.innerHTML += `
            <tr>
                <td>${displayId}</td>
                <td>${s.date}</td>
                <td>${s.customer || '-'}</td>
                <td>${s.items}</td>
                <td>₹${s.total.toFixed(2)}</td>
                <td><button class="btn btn-sm btn-secondary" onclick="reprintBill(${index})"><i class="fa-solid fa-print"></i></button></td>
            </tr>`; 
    });
}
function reprintBill(index) {
    const bill = salesHistory[index];
    if(!bill.details) { alert("Details not available for this old bill."); return; }
    document.getElementById('r-id').innerText = bill.serial ? `SR No. ${bill.serial}` : bill.id;
    document.getElementById('r-date').innerText = bill.date;
    document.getElementById('r-cust-name').innerText = bill.customer ? `Customer: ${bill.customer}` : '';
    document.getElementById('r-cust-mobile').innerText = bill.mobile ? `Mo: ${bill.mobile}` : '';
    const body = document.getElementById('r-body');
    body.innerHTML = '';
    bill.details.forEach(i => { body.innerHTML += `<tr><td class="text-left">${i.name}</td><td class="text-center">${i.size || ''}</td><td class="text-center">${i.qty}</td><td class="text-right">${i.price}</td><td class="text-right">${(i.price*i.qty).toFixed(2)}</td></tr>`; });
    
    // UPDATED FOR REPRINT
    const rSub = document.getElementById('r-subtotal');
    const rDisc = document.getElementById('r-discount');
    
    if(rSub) rSub.innerText = '₹' + (bill.subTotal || bill.total).toFixed(2);
    if(rDisc) rDisc.innerText = '₹' + (bill.discount || 0).toFixed(2);
    document.getElementById('r-total').innerText = '₹' + bill.total.toFixed(2);
    
    try { JsBarcode("#r-barcode", bill.id, { format: "CODE128", displayValue: true, height: 40, fontSize: 14 }); } catch(e) {}
    setTimeout(() => window.print(), 300);
}
function backupData() { const a = document.createElement('a'); a.href = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ products, sales: salesHistory })); a.download = "Samarpan_Backup.json"; a.click(); }
function restoreData(input) { 
    const r = new FileReader(); 
    r.onload = (e) => { 
        const d = JSON.parse(e.target.result); 
        products = d.products || [];
        salesHistory = d.sales || [];
        saveData(); saveSales(); 
        alert("Data Restored & Synced to Cloud!");
    }; 
    r.readAsText(input.files[0]); 
}
function downloadSample() {
    // 1. Define the CSV Content
    const csvContent = "Product Name,Size,Price,Barcode\nSample Shirt,L,599,";
    
    // 2. Create a Blob
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // 3. Create a temporary link to trigger download
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "inventory_template.csv");
    link.style.visibility = 'hidden';
    
    // 4. Append, Click, Remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
function importCSV(input) { 
    const file = input.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        const rows = text.split('\n').slice(1); 
        let addedCount = 0;
        rows.forEach(row => {
            const cols = row.split(',');
            if(cols.length >= 3) {
                const name = cols[0].trim();
                const size = cols[1].trim();
                const price = parseFloat(cols[2]);
                const isDuplicate = products.some(p => p.name.toLowerCase() === name.toLowerCase() && p.price === price);
                if (!isDuplicate && name && !isNaN(price)) {
                    let barcode = cols[3] ? cols[3].trim() : '';
                    if(!barcode || products.some(p => p.barcode === barcode)) barcode = generateUniqueBarcode(); 
                    products.push({ id: Date.now() + Math.random(), name, size, price, stock: 100, barcode }); 
                    addedCount++;
                }
            }
        });
        saveData(); 
        alert(`Imported ${addedCount} products!`);
        input.value = ''; 
    };
    reader.readAsText(file);
}
function exportReport() { /* Export Logic */ }