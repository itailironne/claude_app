import { useState } from 'react'
import './App.css'

function App() {
  const [todos, setTodos] = useState([
    { id: 1, text: 'Buy groceries', completed: false },
    { id: 2, text: 'Walk the dog', completed: true },
  ])
  const [input, setInput] = useState('')
  const [filter, setFilter] = useState('all')

  const addTodo = () => {
    const trimmed = input.trim()
    if (!trimmed) return
    setTodos([...todos, { id: Date.now(), text: trimmed, completed: false }])
    setInput('')
  }

  const toggleTodo = (id) => {
    setTodos(todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t))
  }

  const deleteTodo = (id) => {
    setTodos(todos.filter(t => t.id !== id))
  }

  const clearCompleted = () => {
    setTodos(todos.filter(t => !t.completed))
  }

  const filtered = todos.filter(t => {
    if (filter === 'active') return !t.completed
    if (filter === 'completed') return t.completed
    return true
  })

  const remaining = todos.filter(t => !t.completed).length

  return (
    <div className="app">
      <div className="card">
        <h1>Todo List</h1>

        <div className="input-row">
          <input
            type="text"
            placeholder="What needs to be done?"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTodo()}
          />
          <button className="add-btn" onClick={addTodo}>Add</button>
        </div>

        <div className="filters">
          {['all', 'active', 'completed'].map(f => (
            <button
              key={f}
              className={filter === f ? 'active' : ''}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        <ul className="todo-list">
          {filtered.length === 0 && (
            <li className="empty">No tasks here!</li>
          )}
          {filtered.map(todo => (
            <li key={todo.id} className={todo.completed ? 'done' : ''}>
              <input
                type="checkbox"
                checked={todo.completed}
                onChange={() => toggleTodo(todo.id)}
              />
              <span>{todo.text}</span>
              <button className="delete-btn" onClick={() => deleteTodo(todo.id)}>✕</button>
            </li>
          ))}
        </ul>

        <div className="footer">
          <span>{remaining} item{remaining !== 1 ? 's' : ''} left</span>
          {todos.some(t => t.completed) && (
            <button className="clear-btn" onClick={clearCompleted}>Clear completed</button>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
