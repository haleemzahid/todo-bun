// Profile Management - Vanilla JavaScript
class ProfileManager {
    constructor() {
        this.user = null;
        this.init();
    }

    // Initialize the profile manager
    async init() {
        await this.checkAuthentication();
        this.bindEvents();
        this.loadUserData();
    }

    // Check authentication status
    async checkAuthentication() {
        try {
            const response = await fetch('/api/auth/me', {
                credentials: 'include'
            });

            if (!response.ok) {
                // Not authenticated, redirect to auth page
                window.location.href = '/auth.html';
                return;
            }

            const data = await response.json();
            this.user = data.user;
        } catch (error) {
            console.error('Authentication check failed:', error);
            window.location.href = '/auth.html';
        }
    }

    // Load user data into the form
    loadUserData() {
        if (!this.user) return;

        document.getElementById('newUsername').value = this.user.username;
        document.getElementById('userEmail').value = this.user.email;
        
        // Update profile avatar
        this.updateProfileAvatar();
        
        // Load saved profile picture if exists
        this.loadProfilePicture();
    }

    // Update profile avatar display
    updateProfileAvatar() {
        const initial = this.user.username.charAt(0).toUpperCase();
        document.getElementById('profileInitialDisplay').textContent = initial;
    }

    // Load profile picture from localStorage or server
    async loadProfilePicture() {
        try {
            // First try to get from server
            const response = await fetch('/api/profile/picture', {
                credentials: 'include'
            });

            if (response.ok) {
                const blob = await response.blob();
                if (blob.size > 0) {
                    const imageUrl = URL.createObjectURL(blob);
                    this.displayProfileImage(imageUrl);
                }
            }
        } catch (error) {
            console.log('No profile picture found on server');
            // Try localStorage as fallback
            const savedImage = localStorage.getItem(`profileImage_${this.user.id}`);
            if (savedImage) {
                this.displayProfileImage(savedImage);
            }
        }
    }

    // Display profile image
    displayProfileImage(imageUrl) {
        const imageElement = document.getElementById('profileImageDisplay');
        const initialElement = document.getElementById('profileInitialDisplay');
        const removeBtn = document.getElementById('removeProfilePicBtn');

        imageElement.src = imageUrl;
        imageElement.classList.remove('hidden');
        initialElement.classList.add('hidden');
        removeBtn.classList.remove('hidden');
    }

    // Hide profile image and show initials
    hideProfileImage() {
        const imageElement = document.getElementById('profileImageDisplay');
        const initialElement = document.getElementById('profileInitialDisplay');
        const removeBtn = document.getElementById('removeProfilePicBtn');

        imageElement.classList.add('hidden');
        initialElement.classList.remove('hidden');
        removeBtn.classList.add('hidden');
    }

    // Bind event listeners
    bindEvents() {
        // Profile picture change
        document.getElementById('changeProfilePicBtn').addEventListener('click', () => {
            document.getElementById('profileImageInput').click();
        });

        document.getElementById('profileImageInput').addEventListener('change', (e) => {
            this.handleImageUpload(e);
        });

        document.getElementById('removeProfilePicBtn').addEventListener('click', () => {
            this.removeProfilePicture();
        });

        // Username form
        document.getElementById('usernameForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateUsername();
        });

        // Password form
        document.getElementById('passwordForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.changePassword();
        });

        // Sign out
        document.getElementById('signOutBtn').addEventListener('click', () => {
            this.signOut();
        });
    }

    // Handle image upload
    async handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            this.showError('Please select a valid image file.');
            return;
        }

        // Validate file size (5MB max)
        const maxSize = 5 * 1024 * 1024; // 5MB in bytes
        if (file.size > maxSize) {
            this.showError('Image file is too large. Please select an image smaller than 5MB.');
            return;
        }

        this.showLoading();

        try {
            // Create FormData for file upload
            const formData = new FormData();
            formData.append('profileImage', file);

            // Upload to server
            const response = await fetch('/api/profile/picture', {
                method: 'POST',
                credentials: 'include',
                body: formData
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to upload profile picture');
            }

            // Display the image
            const reader = new FileReader();
            reader.onload = (e) => {
                const imageUrl = e.target.result;
                this.displayProfileImage(imageUrl);
                
                // Save to localStorage as backup
                localStorage.setItem(`profileImage_${this.user.id}`, imageUrl);
                
                this.showSuccess('Profile picture updated successfully!');
            };
            reader.readAsDataURL(file);

        } catch (error) {
            console.error('Error uploading profile picture:', error);
            this.showError(error.message || 'Failed to upload profile picture. Please try again.');
        } finally {
            this.hideLoading();
        }
    }

    // Remove profile picture
    async removeProfilePicture() {
        this.showLoading();

        try {
            const response = await fetch('/api/profile/picture', {
                method: 'DELETE',
                credentials: 'include'
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to remove profile picture');
            }

            this.hideProfileImage();
            localStorage.removeItem(`profileImage_${this.user.id}`);
            this.showSuccess('Profile picture removed successfully!');

        } catch (error) {
            console.error('Error removing profile picture:', error);
            this.showError(error.message || 'Failed to remove profile picture. Please try again.');
        } finally {
            this.hideLoading();
        }
    }

    // Update username
    async updateUsername() {
        const newUsername = document.getElementById('newUsername').value.trim();
        
        if (!newUsername) {
            this.showError('Username cannot be empty.');
            return;
        }

        if (newUsername === this.user.username) {
            this.showError('New username must be different from current username.');
            return;
        }

        this.showLoading();

        try {
            const response = await fetch('/api/profile/username', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ username: newUsername })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to update username');
            }

            const data = await response.json();
            this.user.username = data.username;
            
            // Update localStorage
            localStorage.setItem('user', JSON.stringify(this.user));
            
            // Update UI
            this.updateProfileAvatar();
            
            this.showSuccess('Username updated successfully!');

        } catch (error) {
            console.error('Error updating username:', error);
            this.showError(error.message || 'Failed to update username. Please try again.');
        } finally {
            this.hideLoading();
        }
    }

    // Change password
    async changePassword() {
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        // Validation
        if (!currentPassword || !newPassword || !confirmPassword) {
            this.showError('All password fields are required.');
            return;
        }

        if (newPassword.length < 6) {
            this.showError('New password must be at least 6 characters long.');
            return;
        }

        if (newPassword !== confirmPassword) {
            this.showError('New password and confirmation do not match.');
            return;
        }

        if (currentPassword === newPassword) {
            this.showError('New password must be different from current password.');
            return;
        }

        this.showLoading();

        try {
            const response = await fetch('/api/profile/password', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ 
                    currentPassword, 
                    newPassword 
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to change password');
            }

            // Clear password fields
            document.getElementById('currentPassword').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmPassword').value = '';

            this.showSuccess('Password changed successfully!');

        } catch (error) {
            console.error('Error changing password:', error);
            this.showError(error.message || 'Failed to change password. Please try again.');
        } finally {
            this.hideLoading();
        }
    }

    // Sign out
    async signOut() {
        try {
            const response = await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include'
            });

            localStorage.removeItem('user');
            window.location.href = '/auth.html';
        } catch (error) {
            console.error('Error signing out:', error);
            // Force logout even if API call fails
            localStorage.removeItem('user');
            window.location.href = '/auth.html';
        }
    }

    // Show loading indicator
    showLoading() {
        document.getElementById('loading').classList.remove('hidden');
    }

    // Hide loading indicator
    hideLoading() {
        document.getElementById('loading').classList.add('hidden');
    }

    // Show success message
    showSuccess(message) {
        const successDiv = document.getElementById('profileSuccess');
        const messageElement = document.getElementById('profileSuccessMessage');
        
        messageElement.textContent = message;
        successDiv.classList.remove('hidden');
        
        // Hide error message if shown
        document.getElementById('profileError').classList.add('hidden');
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            successDiv.classList.add('hidden');
        }, 5000);
    }

    // Show error message
    showError(message) {
        const errorDiv = document.getElementById('profileError');
        const messageElement = document.getElementById('profileErrorMessage');
        
        messageElement.textContent = message;
        errorDiv.classList.remove('hidden');
        
        // Hide success message if shown
        document.getElementById('profileSuccess').classList.add('hidden');
        
        // Auto-hide after 8 seconds
        setTimeout(() => {
            errorDiv.classList.add('hidden');
        }, 8000);
    }
}

// Initialize the profile manager when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new ProfileManager();
});
