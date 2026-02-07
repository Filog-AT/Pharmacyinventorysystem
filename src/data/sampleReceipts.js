const MEDS = [
  { id: '1', name: 'Amoxicillin', price: 12.99 },
  { id: '2', name: 'Ibuprofen', price: 8.5 },
  { id: '3', name: 'Lisinopril', price: 15.75 },
  { id: '4', name: 'Metformin', price: 22.0 },
  { id: '5', name: 'Cetirizine', price: 9.25 },
  { id: '6', name: 'Omeprazole', price: 18.5 },
];

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(array, n) {
  const copy = array.slice();
  const out = [];
  const k = Math.min(n, copy.length);
  for (let i = 0; i < k; i++) {
    const idx = randInt(0, copy.length - 1);
    out.push(copy[idx]);
    copy.splice(idx, 1);
  }
  return out;
}

export function generateSampleReceipts(months = 9) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
  const receipts = [];
  let idCounter = 1;
  for (let d = new Date(start); d <= now; d.setDate(d.getDate() + 1)) {
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    const count = isWeekend ? randInt(0, 2) : randInt(1, 4);
    for (let i = 0; i < count; i++) {
      const when = new Date(d.getFullYear(), d.getMonth(), d.getDate(), randInt(9, 18), randInt(0, 59));
      const itemsCount = randInt(1, 3);
      const meds = pick(MEDS, itemsCount);
      const items = meds.map(m => {
        const q = randInt(1, 4);
        return { medicineId: m.id, name: m.name, quantity: q, price: m.price };
      });
      const subtotal = items.reduce((s, it) => s + (it.price * it.quantity), 0);
      receipts.push({
        id: `SAMP-${String(idCounter).padStart(4, '0')}`,
        timestamp: when,
        customerName: ['Walk-in', 'John Doe', 'Jane Smith'][randInt(0, 2)],
        items,
        subtotal,
        tax: 0,
        grandTotal: subtotal,
        userId: ['u-1', 'u-2', 'u-3'][randInt(0, 2)],
        userName: ['Cashier 1', 'Cashier 2', 'Cashier 3'][randInt(0, 2)],
      });
      idCounter += 1;
    }
  }
  // Sort newest first to mimic Firestore query order
  receipts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  return receipts;
}

export const sampleReceipts = generateSampleReceipts(9);
