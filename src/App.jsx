import { useState } from 'react'
import emailjs from '@emailjs/browser'
import './App.css'

// ── EmailJS config ─────────────────────────────────────────────
// Sign up free at https://www.emailjs.com, connect your email,
// create a template, then paste your IDs here.
const EMAILJS_PUBLIC_KEY  = 'jCTfKd70TfDuSFQ2F'   // Account > API Keys
const EMAILJS_SERVICE_ID  = 'service_6c0wy79'     // Email Services
const EMAILJS_TEMPLATE_ID = 'template_w1budbe'    // Email Templates
// ──────────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: 'produce',   label: 'Produce',       emoji: '🥦' },
  { id: 'dairy',     label: 'Dairy & Eggs',  emoji: '🥛' },
  { id: 'meat',      label: 'Meat & Fish',   emoji: '🥩' },
  { id: 'bakery',    label: 'Bakery',        emoji: '🍞' },
  { id: 'frozen',    label: 'Frozen',        emoji: '🧊' },
  { id: 'beverages', label: 'Beverages',     emoji: '🥤' },
  { id: 'snacks',    label: 'Snacks',        emoji: '🍫' },
  { id: 'pantry',    label: 'Pantry',        emoji: '🥫' },
  { id: 'household', label: 'Household',     emoji: '🧴' },
  { id: 'other',     label: 'Other',         emoji: '📦' },
]

const INITIAL_PRODUCTS = [
  { id: 1, name: 'Apples',       category: 'produce',   status: 'pending' },
  { id: 2, name: 'Whole Milk',   category: 'dairy',     status: 'pending' },
  { id: 3, name: 'Sourdough',    category: 'bakery',    status: 'pending' },
  { id: 4, name: 'Chicken Breast', category: 'meat',   status: 'pending' },
]

function getCategoryMeta(id) {
  return CATEGORIES.find(c => c.id === id) || CATEGORIES[CATEGORIES.length - 1]
}

const CATEGORY_KEYWORDS = {
  produce: [
    'apple','apples','banana','bananas','tomato','tomatoes','lettuce','carrot','carrots',
    'onion','onions','potato','potatoes','cucumber','cucumbers','pepper','peppers','spinach',
    'broccoli','zucchini','eggplant','celery','garlic','ginger','lemon','lemons','lime','limes',
    'orange','oranges','grape','grapes','strawberry','strawberries','blueberry','blueberries',
    'mango','watermelon','melon','pear','pears','peach','peaches','plum','plums',
    'cherry','cherries','avocado','avocados','corn','mushroom','mushrooms','cabbage',
    'cauliflower','kale','arugula','cilantro','parsley','mint','basil','fruit','vegetable',
    'vegetables','salad','fresh',
    // Hebrew
    'תפוח','תפוחים','בננה','בננות','עגבניה','עגבניות','חסה','גזר','גזרים',
    'בצל','בצלים','תפוח אדמה','תפוחי אדמה','מלפפון','מלפפונים','פלפל','פלפלים',
    'תרד','ברוקולי','קישוא','קישואים','חצילים','חציל','סלרי','שום','לימון','לימונים',
    'תפוז','תפוזים','ענבים','ענב','תות','תותים','אוכמניות','מנגו','אבטיח','מלון',
    'אגס','אגסים','אפרסק','שזיף','שזיפים','דובדבן','דובדבנים','אבוקדו','תירס',
    'פטריות','פטריה','כרוב','כרובית','קייל','כוסברה','פטרוזיליה','נענע','בזיליקום',
    'פרי','פירות','ירק','ירקות','סלט','טרי','טריים',
  ],
  dairy: [
    'milk','cheese','yogurt','butter','cream','egg','eggs','cottage','mozzarella','cheddar',
    'parmesan','feta','brie','gouda','ricotta','kefir','dairy',
    // Hebrew
    'חלב','גבינה','גבינות','יוגורט','חמאה','שמנת','ביצה','ביצים','קוטג','שמנת חמוצה',
    'מוצרלה','פרמזן','פטה','גאודה','ריקוטה','קצפת','קפיר','מוצרי חלב','לבן',
  ],
  meat: [
    'chicken','beef','pork','fish','salmon','tuna','shrimp','turkey','lamb','veal',
    'steak','sausage','bacon','ham','duck','cod','tilapia','sardine','sardines',
    'anchovy','anchovies','crab','lobster','meat','minced',
    // Hebrew
    'עוף','חזה עוף','כנפיים','שוקיים','בקר','חזיר','דג','דגים','סלמון','טונה',
    'שרימפס','הודו','כבש','עגל','סטייק','טחון','נקניק','בייקון','ברווז','בשר',
  ],
  bakery: [
    'bread','roll','rolls','bun','buns','bagel','bagels','croissant','muffin','muffins',
    'cake','pastry','pastries','cookie','cookies','pita','tortilla','sourdough','rye',
    'baguette','ciabatta','focaccia','pretzel','pretzels','donut','donuts',
    // Hebrew
    'לחם','לחמניה','לחמניות','כיכר','בגל','קרואסון','מאפין','עוגה','עוגות',
    'מאפה','מאפים','עוגייה','עוגיות','פיתה','פיתות','טורטייה','שיפון','באגט',
    'פרצל','סופגניה','סופגניות',
  ],
  frozen: [
    'frozen','ice cream','popsicle','gelato','sorbet',
    // Hebrew
    'קפוא','קפואים','גלידה','ארטיק','סורבה',
  ],
  beverages: [
    'juice','water','soda','cola','coffee','tea','beer','wine','smoothie',
    'lemonade','sparkling','drink','beverage',
    // Hebrew
    'מיץ','מים','סודה','קולה','קפה','תה','בירה','יין','סמוזי',
    'לימונדה','מים מוגזים','מים מינרלים','משקה','שתייה',
  ],
  snacks: [
    'chips','chocolate','candy','nuts','popcorn','crackers','granola','snack',
    'gummy','gummies','trail mix','dried fruit',
    // Hebrew
    'שוקולד','ממתק','ממתקים','אגוזים','פופקורן','קרקר','קרקרים',
    'גרנולה','חטיף','חטיפים','גומי','פירות יבשים',
  ],
  pantry: [
    'pasta','rice','flour','sugar','salt','oil','vinegar','sauce','ketchup','mustard',
    'mayonnaise','canned','beans','lentils','chickpeas','cereal','oats','honey','jam',
    'peanut butter','tahini','hummus','spice','spices','cumin','paprika','oregano',
    'olive oil',
    // Hebrew
    'פסטה','אורז','קמח','סוכר','מלח','שמן','חומץ','רוטב','קטשופ','חרדל',
    'מיונז','שימורים','שעועית','עדשים','קורנפלקס','שיבולת שועל','דבש','ריבה',
    'חמאת בוטנים','טחינה','תבלין','תבלינים','כמון','פפריקה','אורגנו','שמן זית',
  ],
  household: [
    'soap','shampoo','conditioner','toothpaste','toothbrush','toilet paper','paper towel',
    'detergent','bleach','sponge','trash bag','dish soap','deodorant','razor','lotion',
    'sunscreen','medicine','vitamin',
    // Hebrew
    'סבון','שמפו','מרכך','משחת שיניים','מברשת שיניים','נייר טואלט','מגבת נייר',
    'אבקת כביסה','אקונומיקה','ספוג','שקית אשפה','נייר כסף','נוזל כלים',
    'מרכך בד','דאודורנט','קרם','קרם הגנה','תרופה','ויטמין',
  ],
}

function detectCategory(productName) {
  const lower = productName.toLowerCase().trim()
  if (!lower) return null
  for (const [catId, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lower.includes(keyword.toLowerCase())) {
        return catId
      }
    }
  }
  return null
}

export default function App() {
  const [products, setProducts] = useState(INITIAL_PRODUCTS)
  const [mode, setMode]         = useState('edit')   // 'edit' | 'shopping'
  const [name, setName]         = useState('')
  const [category, setCategory] = useState('produce')
  const [bulkMode, setBulkMode] = useState(false)
  const [bulkText, setBulkText] = useState('')
  const [wifeEmail, setWifeEmail]   = useState('')
  const [emailStatus, setEmailStatus] = useState(null) // null | 'sending' | 'sent' | 'error'

  // ── Edit mode actions ──────────────────────────────────────────
  const addProduct = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    setProducts([...products, { id: Date.now(), name: trimmed, category, status: 'pending' }])
    setName('')
  }

  const addBulk = () => {
    const lines = bulkText
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0)
    if (lines.length === 0) return
    const newProducts = lines.map((line, i) => ({
      id: Date.now() + i,
      name: line,
      category: detectCategory(line) || 'other',
      status: 'pending',
    }))
    setProducts([...products, ...newProducts])
    setBulkText('')
    setBulkMode(false)
  }

  const deleteProduct = (id) => setProducts(products.filter(p => p.id !== id))

  const resetList = () => setProducts(products.map(p => ({ ...p, status: 'pending' })))

  // ── Shopping mode actions ──────────────────────────────────────
  const setStatus = (id, status) =>
    setProducts(products.map(p => p.id === id ? { ...p, status } : p))

  // ── Group products by category, preserving CATEGORIES order ───
  const grouped = CATEGORIES
    .map(cat => ({
      ...cat,
      items: products.filter(p => p.category === cat.id),
    }))
    .filter(cat => cat.items.length > 0)

  // ── Stats ──────────────────────────────────────────────────────
  const total     = products.length
  const inBag     = products.filter(p => p.status === 'in_bag').length
  const notFound  = products.filter(p => p.status === 'not_found').length
  const pending   = total - inBag - notFound

  const sendReport = async () => {
    if (!wifeEmail.trim()) { alert('אנא הכנס את כתובת האימייל של אשתך.'); return }
    if (EMAILJS_PUBLIC_KEY === 'YOUR_PUBLIC_KEY') { alert('Please configure your EmailJS credentials in App.jsx first.'); return }

    const date    = new Date().toLocaleString()
    const inBagList    = products.filter(p => p.status === 'in_bag')
    const notFoundList = products.filter(p => p.status === 'not_found')
    const pendingList  = products.filter(p => p.status === 'pending')

    const lines = [
      `🛒 דוח קניות`,
      `תאריך: ${date}`,
      ``,
      `סיכום:`,
      `✅ נמצא: ${inBagList.length} פריטים`,
      `❌ לא נמצא: ${notFoundList.length} פריטים`,
      `⏳ לא נבדק: ${pendingList.length} פריטים`,
    ]

    if (inBagList.length > 0) {
      lines.push(``, `✅ בתיק:`)
      inBagList.forEach(p => lines.push(`  • ${p.name} (${getCategoryMeta(p.category).label})`))
    }
    if (notFoundList.length > 0) {
      lines.push(``, `❌ לא נמצא:`)
      notFoundList.forEach(p => lines.push(`  • ${p.name} (${getCategoryMeta(p.category).label})`))
    }
    if (pendingList.length > 0) {
      lines.push(``, `⏳ לא נבדק:`)
      pendingList.forEach(p => lines.push(`  • ${p.name} (${getCategoryMeta(p.category).label})`))
    }

    lines.push(``, `──────────────────────`)
    lines.push(`אהובתי, רציתי שתדעי שהשקעתי את כל הלב בקנייה הזו 💪`)
    lines.push(`עברתי על כל המדפים, חיפשתי בכל הפינות, ועשיתי הכל כדי להביא הביתה את מה שביקשת.`)
    lines.push(`אוהב אותך ❤️`)

    setEmailStatus('sending')
    try {
      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        { to_email: wifeEmail.trim(), subject: 'דוח קניות', message: lines.join('\n') },
        EMAILJS_PUBLIC_KEY,
      )
      setEmailStatus('sent')
    } catch (err) {
      console.error('EmailJS error:', err)
      setEmailStatus('error')
    }
  }

  const startShopping = () => {
    resetList()
    setMode('shopping')
  }

  return (
    <div className="app">
      <div className="card">

        {/* ── Header ── */}
        <div className="header">
          <h1>🛒 Grocery List</h1>
          {mode === 'edit' ? (
            <button
              className="mode-btn shop"
              onClick={startShopping}
              disabled={total === 0}
            >
              Start Shopping
            </button>
          ) : (
            <button className="mode-btn edit" onClick={() => setMode('edit')}>
              Edit List
            </button>
          )}
        </div>

        {/* ── Add form (edit mode only) ── */}
        {mode === 'edit' && (
          <div className="add-section">
            <div className="add-toggle">
              <button
                className={`toggle-btn ${!bulkMode ? 'active' : ''}`}
                onClick={() => setBulkMode(false)}
              >+ One item</button>
              <button
                className={`toggle-btn ${bulkMode ? 'active' : ''}`}
                onClick={() => setBulkMode(true)}
              >≡ Paste list</button>
            </div>

            {!bulkMode ? (
              <div className="add-form">
                <input
                  type="text"
                  placeholder="Product name…"
                  value={name}
                  onChange={e => {
                    setName(e.target.value)
                    const detected = detectCategory(e.target.value)
                    if (detected) setCategory(detected)
                  }}
                  onKeyDown={e => e.key === 'Enter' && addProduct()}
                />
                <select value={category} onChange={e => setCategory(e.target.value)}>
                  {CATEGORIES.map(c => (
                    <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>
                  ))}
                </select>
                <button className="add-btn" onClick={addProduct}>Add</button>
              </div>
            ) : (
              <div className="bulk-form">
                <textarea
                  placeholder={"One product per line, e.g.:\nמלפפון\nחלב\nלחם\nchicken\nolive oil"}
                  value={bulkText}
                  onChange={e => setBulkText(e.target.value)}
                  rows={5}
                />
                <button className="add-btn bulk-add-btn" onClick={addBulk}>
                  Add All
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Shopping progress bar ── */}
        {mode === 'shopping' && total > 0 && (
          <div className="progress-wrap">
            <div className="progress-bar">
              <div className="bar-bag"   style={{ width: `${(inBag    / total) * 100}%` }} />
              <div className="bar-miss"  style={{ width: `${(notFound / total) * 100}%` }} />
            </div>
            <div className="progress-labels">
              <span className="lbl-bag">✓ {inBag} in bag</span>
              <span className="lbl-pend">{pending} left</span>
              <span className="lbl-miss">✕ {notFound} not found</span>
            </div>
          </div>
        )}

        {/* ── Send report (shopping mode only) ── */}
        {mode === 'shopping' && (
          <div className="email-section">
            <input
              type="email"
              placeholder="Wife's email address…"
              value={wifeEmail}
              onChange={e => { setWifeEmail(e.target.value); setEmailStatus(null) }}
              className="email-input"
            />
            <button
              className="send-btn"
              onClick={sendReport}
              disabled={emailStatus === 'sending'}
            >
              {emailStatus === 'sending' ? 'Sending…' : '📧 Send Report'}
            </button>
            {emailStatus === 'sent'  && <span className="email-ok">✓ Report sent!</span>}
            {emailStatus === 'error' && <span className="email-err">✕ Failed to send. Check your EmailJS config.</span>}
          </div>
        )}

        {/* ── Empty state ── */}
        {total === 0 && (
          <p className="empty">Your list is empty. Add some products above!</p>
        )}

        {/* ── Grouped product list ── */}
        {grouped.map(cat => (
          <div key={cat.id} className="category-group">
            <div className="category-header">
              <span className="cat-emoji">{cat.emoji}</span>
              <span className="cat-label">{cat.label}</span>
              <span className="cat-count">{cat.items.length}</span>
            </div>

            <ul className="product-list">
              {cat.items.map(product => (
                <li
                  key={product.id}
                  className={`product-item status-${product.status}`}
                >
                  <span className="product-name">{product.name}</span>

                  {mode === 'edit' && (
                    <button
                      className="delete-btn"
                      onClick={() => deleteProduct(product.id)}
                      title="Remove"
                    >✕</button>
                  )}

                  {mode === 'shopping' && (
                    <div className="action-btns">
                      <button
                        className={`bag-btn ${product.status === 'in_bag' ? 'active' : ''}`}
                        onClick={() => setStatus(product.id, product.status === 'in_bag' ? 'pending' : 'in_bag')}
                        title="In bag"
                      >✓</button>
                      <button
                        className={`miss-btn ${product.status === 'not_found' ? 'active' : ''}`}
                        onClick={() => setStatus(product.id, product.status === 'not_found' ? 'pending' : 'not_found')}
                        title="Not found"
                      >✕</button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}

        {/* ── Footer ── */}
        {total > 0 && (
          <div className="footer">
            <span>{total} product{total !== 1 ? 's' : ''} on the list</span>
            {mode === 'edit' && (
              <button className="clear-btn" onClick={() => setProducts([])}>
                Clear all
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
