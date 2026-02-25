/* --- CONFIGURATION --- */
const firebaseConfig = {
  apiKey: "AIzaSyAmfEn3l83k8kwndWPWaixN-XN76eg2MXI",
  authDomain: "samarpan-f1822.firebaseapp.com",
  databaseURL: "https://samarpan-f1822-default-rtdb.firebaseio.com",
  projectId: "samarpan-f1822",
  storageBucket: "samarpan-f1822.firebasestorage.app",
  messagingSenderId: "783942684395",
  appId: "1:783942684395:web:0eca1364f5e016c03438ae"
};

// Initialize Firebase using Compat mode to match your original coding style
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const auth = firebase.auth();

/* --- STATE & DOM --- */
let products = [];
let salesHistory = [];
let heldBills = [];
let cart = [];
let currentDiscount = 0; 

const barcodeInput = document.getElementById('barcodeInput');
const cartTableBody = document.getElementById('cartTableBody');

/* --- INIT & AUTH CHECK --- */
document.addEventListener('DOMContentLoaded', () => {
    // Check if user is logged in via Firebase Auth
    auth.onAuthStateChanged((user) => {
        if (user) {
            document.getElementById('loginSection').style.display = 'none';
            setupFirebaseListeners();
            if(barcodeInput) barcodeInput.focus();
        } else {
            document.getElementById('loginSection').style.display = 'flex';
        }
    });

    const todayFancy = new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    const dateEl = document.getElementById('currentDate');
    if(dateEl) dateEl.innerText = todayFancy;
    const loginDateEl = document.getElementById('loginDateDisplay');
    if(loginDateEl) loginDateEl.innerText = todayFancy;
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

    // Real Firebase Auth Sign In
    auth.signInWithEmailAndPassword(email, pass)
        .then(() => {
            errorMsg.style.display = 'none';
        })
        .catch((error) => {
            errorMsg.style.display = 'block';
            console.error("Login Error:", error.message);
        });
}

/* --- NAVIGATION --- */
function showSection(id) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active-section'));
    document.getElementById(id).classList.add('active-section');
    document.querySelectorAll('.sidebar li').forEach(l => l.classList.remove('active'));
    
    // Correct index matching for your sidebar
    const navItems = document.querySelectorAll('.sidebar li');
    if(id === 'billing' && navItems[0]) navItems[0].classList.add('active');
    if(id === 'inventory' && navItems[1]) navItems[1].classList.add('active');
    if(id === 'reports' && navItems[2]) navItems[2].classList.add('active');

    if(id === 'billing' && barcodeInput) setTimeout(() => barcodeInput.focus(), 100);
}

/* --- CALCULATIONS --- */
function calculateDailyStats() {
    const todayStr = new Date().toLocaleDateString('en-GB');
    const todaysSales = salesHistory.filter(s => s.date === todayStr);
    
    const totalRevenue = todaysSales.reduce((sum, sale) => sum + sale.total, 0);
    const totalItems = todaysSales.reduce((sum, sale) => sum + sale.items, 0);
    
    if(document.getElementById('dailyTotalDisplay')) document.getElementById('dailyTotalDisplay').innerText = `₹${totalRevenue.toFixed(2)}`;
    if(document.getElementById('dailyItemsDisplay')) document.getElementById('dailyItemsDisplay').innerText = totalItems;
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
        const stock = parseInt(document.getElementById('prodStock').value) || 0;
        
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
    document.getElementById('prodStock').value = ''; 
    document.getElementById('formTitle').innerText = 'Add New Item';
    const saveBtn = document.getElementById('saveBtn');
    saveBtn.innerText = 'Save Product';
    saveBtn.className = 'btn btn-success full-width';
    document.getElementById('cancelEditBtn').style.display = 'none';
}

function editProduct(id) {
    const p = products.find(x => x.id === id);
    if(!p) return;
    document.getElementById('editId').value = p.id;
    document.getElementById('prodName').value = p.name;
    document.getElementById('prodSize').value = p.size || '';
    document.getElementById('prodPrice').value = p.price;
    document.getElementById('prodStock').value = p.stock || 0; 
    document.getElementById('prodBarcode').value = p.barcode;
    document.getElementById('formTitle').innerText = 'Edit Item';
    const btn = document.getElementById('saveBtn');
    btn.innerText = 'Update Product';
    btn.className = 'btn btn-warning full-width';
    document.getElementById('cancelEditBtn').style.display = 'inline-block';
}

function renderInventory() {
    const tbody = document.getElementById('inventoryTableBody');
    if(!tbody) return;
    tbody.innerHTML = '';
    const term = document.getElementById('inventorySearch').value.toLowerCase();
    const filtered = [...products].reverse().filter(p => p.name.toLowerCase().includes(term) || p.barcode.includes(term) || (p.size && p.size.toLowerCase().includes(term)));
    
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
                    <td><input value="${item.name}" onchange="updateItem(${i}, 'name', this.value)" style="width:100%; border:none; background:transparent;"></td>
                    <td>${item.size || '-'}</td>
                    <td><input type="number" value="${item.price}" onchange="updateItem(${i}, 'price', this.value)" style="width:70px; border:none; background:transparent;"></td>
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

function setDiscount(val) {
    if(val === 'custom') {
        let input = prompt("Enter Discount Percentage (0-100):");
        if(input === null) return; 
        val = parseFloat(input) || 0;
    }
    currentDiscount = parseFloat(val);
    calculateTotals();
}

function calculateTotals() {
    const subTotal = cart.reduce((acc, i) => acc + (i.price * i.qty), 0);
    const discountAmt = subTotal * (currentDiscount / 100);
    const finalTotal = subTotal - discountAmt;
    document.getElementById('grandTotal').innerText = `₹${finalTotal.toFixed(2)}`;
    const discLabel = document.getElementById('discountLabel');
    if(discLabel) discLabel.innerText = `₹${discountAmt.toFixed(2)} (${currentDiscount}%)`;
}

/* --- BILL FUNCTIONS --- */
function holdBill() {
    if(cart.length === 0) { alert("Cart is empty!"); return; }
    const custName = document.getElementById('custName').value || 'Guest';
    const total = parseFloat(document.getElementById('grandTotal').innerText.replace('₹', ''));
    const subTotal = cart.reduce((acc, i) => acc + (i.price * i.qty), 0);
    const discountAmt = subTotal * (currentDiscount / 100);

    heldBills.push({
        id: Date.now(),
        time: new Date().toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit'}),
        customer: custName,
        total: total,
        cartData: [...cart],
        discountPct: currentDiscount, 
        custData: { name: document.getElementById('custName').value, mobile: document.getElementById('custMobile').value }
    });
    saveHeldBills(); 
    clearCart();
    currentDiscount = 0;
    calculateTotals();
    document.getElementById('custName').value = '';
    document.getElementById('custMobile').value = '';
    alert("Bill Parked Successfully!");
    if(barcodeInput) barcodeInput.focus();
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
    const bill = heldBills[index];
    cart = bill.cartData;
    currentDiscount = bill.discountPct || 0; 
    document.getElementById('custName').value = bill.custData.name;
    document.getElementById('custMobile').value = bill.custData.mobile;
    heldBills.splice(index, 1);
    saveHeldBills();
    renderCart(); 
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
    const subTotal = cart.reduce((acc, i) => acc + (i.price * i.qty), 0);
    const discountAmt = subTotal * (currentDiscount / 100);
    const finalTotal = subTotal - discountAmt;
    
    const dateObj = new Date();
    const dateStr = dateObj.toLocaleDateString('en-GB'); 
    const serialNo = salesHistory.length + 1; 
    const uniqueId = 'BILL-' + Date.now().toString().slice(-6);
    
    const cName = document.getElementById('custName').value || 'Guest';
    const cMobile = document.getElementById('custMobile').value || '';
    
    salesHistory.unshift({ 
        id: uniqueId, 
        serial: serialNo, 
        date: dateStr, 
        items: cart.length, 
        subTotal: subTotal, 
        discount: discountAmt, 
        total: finalTotal, 
        customer: cName, 
        mobile: cMobile, 
        details: [...cart] 
    });
    saveSales();
    
    // UI Update for Receipt
    document.getElementById('r-id').innerText = `SR No. ${serialNo}`;
    document.getElementById('r-date').innerText = dateStr;
    document.getElementById('r-cust-name').innerText = cName ? `Customer: ${cName}` : '';
    document.getElementById('r-cust-mobile').innerText = cMobile ? `Mo: ${cMobile}` : '';
    
    const body = document.getElementById('r-body');
    body.innerHTML = '';
    cart.forEach(i => {
        body.innerHTML += `<tr><td class="text-left">${i.name}</td><td class="text-center">${i.size || ''}</td><td class="text-center">${i.qty}</td><td class="text-right">${i.price}</td><td class="text-right">${(i.price*i.qty).toFixed(2)}</td></tr>`;
    });
    
    if(document.getElementById('r-subtotal')) document.getElementById('r-subtotal').innerText = '₹' + subTotal.toFixed(2);
    if(document.getElementById('r-discount')) document.getElementById('r-discount').innerText = '₹' + discountAmt.toFixed(2);
    document.getElementById('r-total').innerText = '₹' + finalTotal.toFixed(2);
    
    try { JsBarcode("#r-barcode", uniqueId, { format: "CODE128", displayValue: true, height: 40, fontSize: 14 }); } catch(e) {}
    
    setTimeout(() => {
        window.print();
        clearCart();
        currentDiscount = 0; 
        calculateTotals();
        document.getElementById('custName').value = '';
        document.getElementById('custMobile').value = '';
        if(barcodeInput) barcodeInput.focus();
    }, 300);
}

function printLabels(id) {
    const p = products.find(x => x.id === id);
    if(!p) return;
    document.body.classList.add('printing-labels');
    const sheet = document.getElementById('label-sheet');
    sheet.innerHTML = `
        <div class="sticker">
            <h4>Samarpan Fashion</h4>
            <svg id="labelBarcode"></svg>
            <p>Size: ${p.size || 'Free'} | ₹${p.price}</p>
            <small>${p.name}</small>
        </div>`;
    
    JsBarcode("#labelBarcode", p.barcode, { width: 1.5, height: 30, fontSize: 12, displayValue: true, margin: 0 });
    
    setTimeout(() => {
        window.print();
        document.body.classList.remove('printing-labels');
    }, 500);
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
    document.getElementById('r-id').innerText = bill.serial ? `SR No. ${bill.serial}` : bill.id;
    document.getElementById('r-date').innerText = bill.date;
    document.getElementById('r-cust-name').innerText = bill.customer ? `Customer: ${bill.customer}` : '';
    document.getElementById('r-cust-mobile').innerText = bill.mobile ? `Mo: ${bill.mobile}` : '';
    const body = document.getElementById('r-body');
    body.innerHTML = '';
    bill.details.forEach(i => { body.innerHTML += `<tr><td class="text-left">${i.name}</td><td class="text-center">${i.size || ''}</td><td class="text-center">${i.qty}</td><td class="text-right">${i.price}</td><td class="text-right">${(i.price*i.qty).toFixed(2)}</td></tr>`; });
    
    if(document.getElementById('r-subtotal')) document.getElementById('r-subtotal').innerText = '₹' + (bill.subTotal || bill.total).toFixed(2);
    if(document.getElementById('r-discount')) document.getElementById('r-discount').innerText = '₹' + (bill.discount || 0).toFixed(2);
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
        alert("Data Restored!");
    }; 
    r.readAsText(input.files[0]); 
}
function downloadSample() {
    const csvContent = "Product Name,Size,Price,Stock,Barcode\nSample Shirt,L,599,100,";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "inventory_template.csv";
    link.click();
}
function importCSV(input) { 
    const reader = new FileReader();
    reader.onload = function(e) {
        const rows = e.target.result.split('\n').slice(1); 
        rows.forEach(row => {
            const cols = row.split(',');
            if(cols.length >= 3) {
                products.push({ id: Date.now() + Math.random(), name: cols[0], size: cols[1], price: parseFloat(cols[2]), stock: parseInt(cols[3]) || 0, barcode: cols[4] || generateUniqueBarcode() });
            }
        });
        saveData(); alert("Imported!");
    };
    reader.readAsText(input.files[0]);
}
function exportInventory() {
    let csv = "Name,Size,Price,Barcode,Stock\n";
    products.forEach(p => csv += `${p.name},${p.size},${p.price},${p.barcode},${p.stock}\n`);
    const link = document.createElement("a");
    link.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv);
    link.download = 'inventory.csv';
    link.click();
}
function exportReport() { 
    let csv = "ID,Date,Customer,Total\n";
    salesHistory.forEach(s => csv += `${s.id},${s.date},${s.customer},${s.total}\n`);
    const link = document.createElement("a");
    link.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv);
    link.download = 'sales_report.csv';
    link.click();
}