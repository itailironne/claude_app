import { useState, useEffect } from 'react'
import emailjs from '@emailjs/browser'
import './App.css'

// ── EmailJS config ─────────────────────────────────────────────
const EMAILJS_PUBLIC_KEY  = 'jCTfKd70TfDuSFQ2F'
const EMAILJS_SERVICE_ID  = 'service_6c0wy79'
const EMAILJS_TEMPLATE_ID = 'template_cv9uvuk'
// ──────────────────────────────────────────────────────────────

const DEFAULT_CATEGORIES = [
  { id: 'produce',   label: 'פירות וירקות',  emoji: '🥦' },
  { id: 'dairy',     label: 'חלב וביצים',    emoji: '🥛' },
  { id: 'meat',      label: 'בשר ודגים',     emoji: '🥩' },
  { id: 'bakery',    label: 'מאפייה',         emoji: '🍞' },
  { id: 'frozen',    label: 'קפוא',           emoji: '🧊' },
  { id: 'beverages', label: 'משקאות',         emoji: '🥤' },
  { id: 'snacks',    label: 'חטיפים',         emoji: '🍫' },
  { id: 'pantry',    label: 'מזווה',          emoji: '🥫' },
  { id: 'household', label: 'ניקיון ובית',   emoji: '🧹' },
  { id: 'personal',  label: 'טיפוח אישי',    emoji: '🧴' },
  { id: 'other',     label: 'אחר',            emoji: '📦' },
]

async function categorizeWithLLM(productNames, currentCategories) {
  const res = await fetch('/api/categorize', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ products: productNames, categories: currentCategories }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Categorization failed')
  }
  const { result } = await res.json()
  return result // array of { name, category_id, category_label, category_emoji, is_new }
}

export default function App() {
  const [products, setProducts] = useState(() => {
    try {
      const saved = localStorage.getItem('grocery-list')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })
  const [categories, setCategories] = useState(() => {
    try {
      const saved = localStorage.getItem('grocery-categories-v2')
      return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES
    } catch {
      return DEFAULT_CATEGORIES
    }
  })
  const [mode, setMode]         = useState('edit')
  const [name, setName]         = useState('')
  const [category, setCategory] = useState('produce')
  const [bulkMode, setBulkMode] = useState(false)
  const [bulkText, setBulkText] = useState('')
  const [categorizing, setCategorizing] = useState(false)
  const [aiError, setAiError]           = useState(null)
  const [wifeEmail, setWifeEmail]       = useState(() => localStorage.getItem('wife-email') || '')
  const [emailStatus, setEmailStatus]   = useState(null)
  const [editingId, setEditingId]       = useState(null)
  const [editingName, setEditingName]   = useState('')

  useEffect(() => {
    localStorage.setItem('grocery-list', JSON.stringify(products))
  }, [products])

  useEffect(() => {
    localStorage.setItem('grocery-categories-v2', JSON.stringify(categories))
  }, [categories])

  useEffect(() => {
    localStorage.setItem('wife-email', wifeEmail)
  }, [wifeEmail])

  const getCategoryMeta = (id) =>
    categories.find(c => c.id === id) || categories[categories.length - 1]

  // Merge new categories returned by LLM into state
  const mergeNewCategories = (llmResults) => {
    const newCats = llmResults
      .filter(r => r.is_new)
      .map(r => ({ id: r.category_id, label: r.category_label, emoji: r.category_emoji }))
    if (newCats.length === 0) return
    setCategories(prev => {
      const existingIds = new Set(prev.map(c => c.id))
      // Insert new categories before the last "other" category
      const filtered = newCats.filter(c => !existingIds.has(c.id))
      if (filtered.length === 0) return prev
      const withoutOther = prev.filter(c => c.id !== 'other')
      const other = prev.find(c => c.id === 'other')
      return other
        ? [...withoutOther, ...filtered, other]
        : [...prev, ...filtered]
    })
  }

  // ── Edit mode actions ──────────────────────────────────────────
  const addProduct = async () => {
    const trimmed = name.trim()
    if (!trimmed) return
    setCategorizing(true)
    setAiError(null)
    try {
      const results = await categorizeWithLLM([trimmed], categories)
      const r = results[0]
      mergeNewCategories(results)
      setProducts(prev => [
        ...prev,
        { id: Date.now(), name: trimmed, category: r.category_id, status: 'pending' },
      ])
      setName('')
      setCategory(r.category_id)
    } catch (err) {
      console.error('LLM categorization failed:', err)
      setAiError('AI categorization failed — item added to current category.')
      // Fallback: add with current selected category
      setProducts(prev => [
        ...prev,
        { id: Date.now(), name: trimmed, category, status: 'pending' },
      ])
      setName('')
    } finally {
      setCategorizing(false)
    }
  }

  const addBulk = async () => {
    const lines = bulkText
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0)
    if (lines.length === 0) return
    setCategorizing(true)
    setAiError(null)
    try {
      const results = await categorizeWithLLM(lines, categories)
      mergeNewCategories(results)
      const newProducts = results.map((r, i) => ({
        id: Date.now() + i,
        name: r.name,
        category: r.category_id,
        status: 'pending',
      }))
      setProducts(prev => [...prev, ...newProducts])
      setBulkText('')
      setBulkMode(false)
    } catch (err) {
      console.error('LLM bulk categorization failed:', err)
      setAiError('AI categorization failed — items added to "Other".')
      // Fallback: add all as 'other'
      const newProducts = lines.map((line, i) => ({
        id: Date.now() + i,
        name: line,
        category: 'other',
        status: 'pending',
      }))
      setProducts(prev => [...prev, ...newProducts])
      setBulkText('')
      setBulkMode(false)
    } finally {
      setCategorizing(false)
    }
  }

  const deleteProduct = (id) => setProducts(products.filter(p => p.id !== id))

  const startEditing = (product) => {
    setEditingId(product.id)
    setEditingName(product.name)
  }

  const commitEdit = () => {
    const trimmed = editingName.trim()
    if (trimmed) {
      setProducts(prev => prev.map(p => p.id === editingId ? { ...p, name: trimmed } : p))
    }
    setEditingId(null)
    setEditingName('')
  }

  const resetList = () => setProducts(products.map(p => ({ ...p, status: 'pending' })))

  // ── Shopping mode actions ──────────────────────────────────────
  const setStatus = (id, status) =>
    setProducts(products.map(p => p.id === id ? { ...p, status } : p))

  // ── Group products by category ─────────────────────────────────
  const grouped = categories
    .map(cat => ({
      ...cat,
      items: products.filter(p => p.category === cat.id),
    }))
    .filter(cat => cat.items.length > 0)

  // ── Stats ──────────────────────────────────────────────────────
  const total    = products.length
  const inBag    = products.filter(p => p.status === 'in_bag').length
  const notFound = products.filter(p => p.status === 'not_found').length
  const pending  = total - inBag - notFound

  const sendReport = async () => {
    if (!wifeEmail.trim()) { alert('אנא הכנס את כתובת האימייל של אשתך.'); return }
    if (EMAILJS_PUBLIC_KEY === 'YOUR_PUBLIC_KEY') { alert('Please configure your EmailJS credentials in App.jsx first.'); return }

    const date         = new Date().toLocaleString()
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
                  onChange={e => setName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !categorizing && addProduct()}
                  disabled={categorizing}
                />
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  disabled={categorizing}
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>
                  ))}
                </select>
                <button
                  className="add-btn"
                  onClick={addProduct}
                  disabled={categorizing || !name.trim()}
                >
                  {categorizing ? '🤖 …' : 'Add'}
                </button>
              </div>
            ) : (
              <div className="bulk-form">
                <textarea
                  placeholder={"One product per line, e.g.:\nמלפפון\nחלב\nלחם\nchicken\nolive oil"}
                  value={bulkText}
                  onChange={e => setBulkText(e.target.value)}
                  rows={5}
                  disabled={categorizing}
                />
                <button
                  className="add-btn bulk-add-btn"
                  onClick={addBulk}
                  disabled={categorizing || !bulkText.trim()}
                >
                  {categorizing ? '🤖 Categorizing…' : 'Add All'}
                </button>
              </div>
            )}

            {categorizing && (
              <p className="ai-label">🤖 AI is categorizing your product…</p>
            )}
            {aiError && (
              <p className="ai-error">⚠️ {aiError}</p>
            )}
          </div>
        )}

        {/* ── Shopping progress bar ── */}
        {mode === 'shopping' && total > 0 && (
          <div className="progress-wrap">
            <div className="progress-bar">
              <div className="bar-bag"  style={{ width: `${(inBag    / total) * 100}%` }} />
              <div className="bar-miss" style={{ width: `${(notFound / total) * 100}%` }} />
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
                  {mode === 'edit' && editingId === product.id ? (
                    <input
                      className="inline-edit"
                      value={editingName}
                      onChange={e => setEditingName(e.target.value)}
                      onBlur={commitEdit}
                      onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditingId(null) }}
                      autoFocus
                    />
                  ) : (
                    <span
                      className="product-name"
                      onClick={() => mode === 'edit' && startEditing(product)}
                      title={mode === 'edit' ? 'Click to edit' : undefined}
                    >{product.name}</span>
                  )}

                  {mode === 'edit' && editingId !== product.id && (
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
