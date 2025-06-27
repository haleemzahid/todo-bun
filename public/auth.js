// Authentication App - Vanilla JavaScript
class AuthApp {
    constructor() {
        this.currentTab = 'login';
        this.init();
    }

    init() {
        this.bindEvents();
        this.checkExistingAuth();
    }

    bindEvents() {
        // Tab switching
        document.getElementById('loginTab').addEventListener('click', () => this.switchTab('login'));
        document.getElementById('registerTab').addEventListener('click', () => this.switchTab('register'));

        // Form submissions
        document.getElementById('loginForm').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('registerForm').addEventListener('submit', (e) => this.handleRegister(e));
    }

    switchTab(tab) {
        this.currentTab = tab;
        
        const loginTab = document.getElementById('loginTab');
        const registerTab = document.getElementById('registerTab');
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');

        if (tab === 'login') {
            loginTab.className = 'flex-1 py-2 px-4 text-center font-medium rounded-l-lg bg-primary text-white';
            registerTab.className = 'flex-1 py-2 px-4 text-center font-medium rounded-r-lg bg-gray-200 text-gray-700 hover:bg-gray-300';
            loginForm.classList.remove('hidden');
            registerForm.classList.add('hidden');
        } else {
            loginTab.className = 'flex-1 py-2 px-4 text-center font-medium rounded-l-lg bg-gray-200 text-gray-700 hover:bg-gray-300';
            registerTab.className = 'flex-1 py-2 px-4 text-center font-medium rounded-r-lg bg-primary text-white';
            loginForm.classList.add('hidden');
            registerForm.classList.remove('hidden');
        }

        this.hideMessages();
    }

    async handleLogin(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const email = formData.get('email');
        const password = formData.get('password');

        if (!email || !password) {
            this.showError('Please fill in all fields');
            return;
        }

        this.showLoading(true);
        this.hideMessages();

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
                credentials: 'include'
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Login failed');
            }

            this.showSuccess('Login successful! Redirecting...');
            
            // Store user info and redirect
            localStorage.setItem('user', JSON.stringify(data.user));
            
            setTimeout(() => {
                window.location.href = '/';
            }, 1000);

        } catch (error) {
            this.showError(error.message);
        } finally {
            this.showLoading(false);
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const username = formData.get('username');
        const email = formData.get('email');
        const password = formData.get('password');
        const confirmPassword = formData.get('confirmPassword');

        // Validation
        if (!username || !email || !password || !confirmPassword) {
            this.showError('Please fill in all fields');
            return;
        }

        if (password !== confirmPassword) {
            this.showError('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            this.showError('Password must be at least 6 characters long');
            return;
        }

        this.showLoading(true);
        this.hideMessages();

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, email, password }),
                credentials: 'include'
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Registration failed');
            }

            this.showSuccess('Account created successfully! Redirecting...');
            
            // Store user info and redirect
            localStorage.setItem('user', JSON.stringify(data.user));
            
            setTimeout(() => {
                window.location.href = '/';
            }, 1000);

        } catch (error) {
            this.showError(error.message);
        } finally {
            this.showLoading(false);
        }
    }

    async checkExistingAuth() {
        try {
            const response = await fetch('/api/auth/me', {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('user', JSON.stringify(data.user));
                window.location.href = '/';
            }
        } catch (error) {
            // User not authenticated, stay on auth page
        }
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
        
        setTimeout(() => this.hideError(), 5000);
    }

    showSuccess(message) {
        const successDiv = document.getElementById('success');
        const successMessage = document.getElementById('successMessage');
        successMessage.textContent = message;
        successDiv.style.display = 'block';
    }

    hideError() {
        const errorDiv = document.getElementById('error');
        errorDiv.style.display = 'none';
    }

    hideSuccess() {
        const successDiv = document.getElementById('success');
        successDiv.style.display = 'none';
    }

    hideMessages() {
        this.hideError();
        this.hideSuccess();
    }
}

// Initialize the auth app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AuthApp();
});
