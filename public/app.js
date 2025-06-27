// Todo App - Vanilla JavaScript with Bun API and Authentication
class TodoApp {
    constructor() {
        this.todos = [];
        this.currentFilter = 'all';
        this.user = null;
        this.init();
    }

    // Initialize the application
    async init() {
        await this.checkAuthentication();
        this.bindEvents();
        this.loadTodos();
    }

    // Check authentication status
    async checkAuthentication() {
        try {
            // First check localStorage for cached user info
            const cachedUser = localStorage.getItem('user');
            if (cachedUser) {
                this.user = JSON.parse(cachedUser);
                this.updateUserUI();
            }

            // Verify with server
            const response = await fetch('/api/auth/me', {
                credentials: 'include'
            });

            if (!response.ok) {
                // Not authenticated, redirect to auth page
                localStorage.removeItem('user');
                window.location.href = '/auth.html';
                return;
            }

            const data = await response.json();
            this.user = data.user;
            localStorage.setItem('user', JSON.stringify(this.user));
            this.updateUserUI();

        } catch (error) {
            console.error('Authentication check failed:', error);
            localStorage.removeItem('user');
            window.location.href = '/auth.html';
        }
    }

    // Update UI with user information
    updateUserUI() {
        if (!this.user) return;

        const userAvatar = document.getElementById('userAvatar');
        const userName = document.getElementById('userName');
        const userEmail = document.getElementById('userEmail');
        const welcomeMessage = document.getElementById('welcomeMessage');

        if (userAvatar) {
            userAvatar.textContent = this.user.username.charAt(0).toUpperCase();
        }
        if (userName) {
            userName.textContent = this.user.username;
        }
        if (userEmail) {
            userEmail.textContent = this.user.email;
        }
        if (welcomeMessage) {
            welcomeMessage.textContent = `Welcome back, ${this.user.username}! Manage your personal todos below.`;
        }
    }

    // Handle logout
    async handleLogout() {
        try {
            const response = await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include'
            });

            localStorage.removeItem('user');
            window.location.href = '/auth.html';

        } catch (error) {
            console.error('Logout failed:', error);
            // Force redirect even if logout request fails
            localStorage.removeItem('user');
            window.location.href = '/auth.html';
        }
    }

    // Bind event listeners
    bindEvents() {
        // Form submission for adding todos
        const todoForm = document.getElementById('todoForm');
        todoForm.addEventListener('submit', (e) => this.handleAddTodo(e));

        // Filter buttons
        const filterButtons = document.querySelectorAll('.filter-btn');
        filterButtons.forEach(btn => {
            btn.addEventListener('click', (e) => this.handleFilterChange(e));
        });

        // User menu events
        const userMenuBtn = document.getElementById('userMenuBtn');
        const userDropdown = document.getElementById('userDropdown');
        const logoutBtn = document.getElementById('logoutBtn');

        if (userMenuBtn && userDropdown) {
            userMenuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                userDropdown.classList.toggle('hidden');
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', () => {
                userDropdown.classList.add('hidden');
            });

            userDropdown.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }
    }

    // API Methods
    async apiCall(url, options = {}) {
        try {
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                credentials: 'include', // Include cookies for authentication
                ...options
            });

            if (response.status === 401) {
                // Unauthorized - redirect to login
                localStorage.removeItem('user');
                window.location.href = '/auth.html';
                return;
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Request failed');
            }

            return await response.json();
        } catch (error) {
            if (error.message.includes('fetch')) {
                // Network error
                this.showError('Network error. Please check your connection.');
            } else {
                this.showError(error.message);
            }
            throw error;
        }
    }

    async loadTodos() {
        this.showLoading(true);
        try {
            this.todos = await this.apiCall('/api/todos');
            this.renderTodos();
            this.updateStats();
        } catch (error) {
            console.error('Failed to load todos:', error);
        } finally {
            this.showLoading(false);
        }
    }

    async addTodo(text) {
        try {
            const newTodo = await this.apiCall('/api/todos', {
                method: 'POST',
                body: JSON.stringify({ text })
            });
            
            this.todos.unshift(newTodo); // Add to beginning of array
            this.renderTodos();
            this.updateStats();
            return newTodo;
        } catch (error) {
            console.error('Failed to add todo:', error);
            throw error;
        }
    }

    async updateTodo(id, text, completed) {
        try {
            const updatedTodo = await this.apiCall(`/api/todos/${id}`, {
                method: 'PUT',
                body: JSON.stringify({ text, completed })
            });
            
            const index = this.todos.findIndex(todo => todo.id === id);
            if (index !== -1) {
                this.todos[index] = updatedTodo;
                this.renderTodos();
                this.updateStats();
            }
            return updatedTodo;
        } catch (error) {
            console.error('Failed to update todo:', error);
            throw error;
        }
    }

    async toggleTodo(id) {
        try {
            const updatedTodo = await this.apiCall(`/api/todos/${id}/toggle`, {
                method: 'PATCH'
            });
            
            const index = this.todos.findIndex(todo => todo.id === id);
            if (index !== -1) {
                this.todos[index] = updatedTodo;
                this.renderTodos();
                this.updateStats();
            }
            return updatedTodo;
        } catch (error) {
            console.error('Failed to toggle todo:', error);
            throw error;
        }
    }

    async deleteTodo(id) {
        try {
            await this.apiCall(`/api/todos/${id}`, {
                method: 'DELETE'
            });
            
            this.todos = this.todos.filter(todo => todo.id !== id);
            this.renderTodos();
            this.updateStats();
        } catch (error) {
            console.error('Failed to delete todo:', error);
            throw error;
        }
    }

    // Event Handlers
    async handleAddTodo(e) {
        e.preventDefault();
        const input = document.getElementById('todoInput');
        const text = input.value.trim();
        
        if (!text) return;

        try {
            await this.addTodo(text);
            input.value = '';
            this.hideError();
        } catch (error) {
            // Error already handled in addTodo
        }
    }

    handleFilterChange(e) {
        // Update active filter button
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active', 'bg-primary', 'text-white');
            btn.classList.add('border-gray-300', 'hover:bg-gray-100');
        });
        
        e.target.classList.add('active', 'bg-primary', 'text-white');
        e.target.classList.remove('border-gray-300', 'hover:bg-gray-100');
        
        this.currentFilter = e.target.dataset.filter;
        this.renderTodos();
    }

    async handleToggleTodo(id) {
        try {
            await this.toggleTodo(id);
        } catch (error) {
            // Error already handled in toggleTodo
        }
    }

    async handleDeleteTodo(id) {
        if (confirm('Are you sure you want to delete this todo?')) {
            try {
                await this.deleteTodo(id);
            } catch (error) {
                // Error already handled in deleteTodo
            }
        }
    }

    async handleEditTodo(id, newText) {
        const todo = this.todos.find(t => t.id === id);
        if (!todo) return;

        try {
            await this.updateTodo(id, newText, todo.completed);
        } catch (error) {
            // Error already handled in updateTodo
        }
    }

    // UI Methods
    renderTodos() {
        const todoList = document.getElementById('todoList');
        const emptyState = document.getElementById('emptyState');
        
        const filteredTodos = this.getFilteredTodos();
        
        if (filteredTodos.length === 0) {
            todoList.innerHTML = '';
            emptyState.style.display = 'block';
            return;
        }
        
        emptyState.style.display = 'none';
        todoList.innerHTML = filteredTodos.map(todo => this.createTodoHTML(todo)).join('');
        
        // Bind events for todo items
        this.bindTodoEvents();
    }

    createTodoHTML(todo) {
        const formattedDate = new Date(todo.created_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        return `
            <div class="todo-item p-4 hover:bg-gray-50 transition-colors duration-200" data-id="${todo.id}">
                <div class="flex items-center justify-between">
                    <div class="flex items-center flex-1 min-w-0">
                        <input 
                            type="checkbox" 
                            class="todo-checkbox h-5 w-5 text-primary rounded focus:ring-primary mr-3"
                            ${todo.completed ? 'checked' : ''}
                        >
                        <div class="flex-1 min-w-0">
                            <p class="todo-text text-gray-900 ${todo.completed ? 'line-through text-gray-500' : ''} break-words">
                                ${this.escapeHtml(todo.text)}
                            </p>
                            <p class="text-xs text-gray-500 mt-1">
                                Created: ${formattedDate}
                            </p>
                        </div>
                    </div>
                    <div class="flex items-center ml-4 space-x-2">
                        <button class="edit-btn text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition-colors duration-200" title="Edit">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                            </svg>
                        </button>
                        <button class="delete-btn text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 transition-colors duration-200" title="Delete">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1H8a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    bindTodoEvents() {
        // Checkbox toggle events
        document.querySelectorAll('.todo-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const todoItem = e.target.closest('.todo-item');
                const id = parseInt(todoItem.dataset.id);
                this.handleToggleTodo(id);
            });
        });

        // Delete button events
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const todoItem = e.target.closest('.todo-item');
                const id = parseInt(todoItem.dataset.id);
                this.handleDeleteTodo(id);
            });
        });

        // Edit button events
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const todoItem = e.target.closest('.todo-item');
                const id = parseInt(todoItem.dataset.id);
                this.startEditing(id);
            });
        });
    }

    startEditing(id) {
        const todo = this.todos.find(t => t.id === id);
        if (!todo) return;

        const todoItem = document.querySelector(`[data-id="${id}"]`);
        const textElement = todoItem.querySelector('.todo-text');
        
        const input = document.createElement('input');
        input.type = 'text';
        input.value = todo.text;
        input.className = 'w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary';
        
        const saveEdit = async () => {
            const newText = input.value.trim();
            if (newText && newText !== todo.text) {
                await this.handleEditTodo(id, newText);
            } else {
                this.renderTodos(); // Revert changes
            }
        };

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                saveEdit();
            } else if (e.key === 'Escape') {
                this.renderTodos(); // Cancel edit
            }
        });

        input.addEventListener('blur', saveEdit);

        textElement.replaceWith(input);
        input.focus();
        input.select();
    }

    getFilteredTodos() {
        switch (this.currentFilter) {
            case 'completed':
                return this.todos.filter(todo => todo.completed);
            case 'pending':
                return this.todos.filter(todo => !todo.completed);
            default:
                return this.todos;
        }
    }

    updateStats() {
        const total = this.todos.length;
        const completed = this.todos.filter(todo => todo.completed).length;
        const pending = total - completed;

        document.getElementById('totalCount').textContent = total;
        document.getElementById('completedCount').textContent = completed;
        document.getElementById('pendingCount').textContent = pending;
    }

    showLoading(show = true) {
        const loading = document.getElementById('loading');
        loading.style.display = show ? 'block' : 'none';
    }

    showError(message) {
        const errorDiv = document.getElementById('error');
        const errorMessage = document.getElementById('errorMessage');
        errorMessage.textContent = message;
        errorDiv.style.display = 'block';
        
        // Auto-hide error after 5 seconds
        setTimeout(() => this.hideError(), 5000);
    }

    hideError() {
        const errorDiv = document.getElementById('error');
        errorDiv.style.display = 'none';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new TodoApp();
});

// Add some global styling for active filter button
const style = document.createElement('style');
style.textContent = `
    .filter-btn.active {
        background-color: #3b82f6 !important;
        color: white !important;
        border-color: #3b82f6 !important;
    }
`;
document.head.appendChild(style);
