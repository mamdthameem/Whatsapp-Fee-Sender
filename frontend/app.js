// JavaScript Application for WhatsApp Fee Sender
class FeeSenderApp {
    constructor() {
        this.MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
        this.elements = this.initializeElements();
        this.attachEventListeners();
        this.setupDragAndDrop();
    }

    initializeElements() {
        return {
            form: document.getElementById('uploadForm'),
            phoneInput: document.getElementById('phoneNumber'),
            pdfInput: document.getElementById('pdfFile'),
            submitBtn: document.getElementById('submitBtn'),
            loading: document.getElementById('loading'),
            messageDiv: document.getElementById('message'),
            fileUploadArea: document.getElementById('fileUploadArea'),
            fileSelected: document.getElementById('fileSelected'),
            fileName: document.getElementById('fileName'),
            fileSize: document.getElementById('fileSize'),
            removeFileBtn: document.getElementById('removeFile')
        };
    }

    attachEventListeners() {
        this.elements.form.addEventListener('submit', (e) => this.handleSubmit(e));
        this.elements.phoneInput.addEventListener('input', (e) => this.formatPhoneNumber(e));
        this.elements.pdfInput.addEventListener('change', () => this.handleFileSelect());
        this.elements.removeFileBtn.addEventListener('click', () => this.removeFile());
    }

    setupDragAndDrop() {
        const area = this.elements.fileUploadArea;
        
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            area.addEventListener(eventName, (e) => this.preventDefaults(e), false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            area.addEventListener(eventName, () => {
                area.classList.add('dragover');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            area.addEventListener(eventName, () => {
                area.classList.remove('dragover');
            }, false);
        });

        area.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt ? dt.files : null;
            if (files && files.length > 0) {
                // Create a new FileList-like object
                const file = files[0];
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                this.elements.pdfInput.files = dataTransfer.files;
                // Trigger change event
                this.elements.pdfInput.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }, false);
    }

    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    async handleSubmit(e) {
        e.preventDefault();

        if (!this.validateInputs()) {
            return;
        }

        this.setLoadingState(true);

        try {
            const formData = new FormData();
            formData.append('phoneNumber', this.elements.phoneInput.value.trim());
            formData.append('pdf', this.elements.pdfInput.files[0]);

            const response = await fetch('/api/upload/send-pdf', {
                method: 'POST',
                body: formData
            });

            // Check if response is OK
            if (!response.ok) {
                const errorText = await response.text();
                let errorMessage = `Server error (${response.status})`;
                try {
                    const errorData = JSON.parse(errorText);
                    errorMessage = errorData.message || errorMessage;
                } catch (e) {
                    // If response is not JSON, use the text or default message
                    if (errorText && errorText.length < 200) {
                        errorMessage = errorText;
                    }
                }
                this.showError(errorMessage);
                console.error('API Error:', response.status, errorText);
                return;
            }

            // Parse JSON response
            const data = await response.json();

            if (data.success) {
                this.showSuccess(data);
                this.elements.form.reset();
                this.removeFile();
            } else {
                this.showError(data.message || 'Failed to send receipt');
            }
        } catch (error) {
            console.error('Request Error:', error);
            if (error.message && error.message.includes('JSON')) {
                this.showError('Invalid response from server. Please check if the API is deployed.');
            } else {
                this.showError('Network error. Please check your connection and try again.');
            }
        } finally {
            this.setLoadingState(false);
        }
    }

    validateInputs() {
        const phone = this.elements.phoneInput.value.trim();
        const file = this.elements.pdfInput.files?.[0];

        // Validate phone number
        if (!phone) {
            this.showError('Please enter a WhatsApp number');
            return false;
        }

        const cleanedPhone = phone.replace(/\D/g, '');
        if (cleanedPhone.length < 10 || cleanedPhone.length > 15) {
            this.showError('Invalid phone number format. Please enter 10-15 digits');
            return false;
        }

        // Validate file
        if (!file) {
            this.showError('Please select a PDF file');
            return false;
        }

        if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
            this.showError('Only PDF files are allowed');
            return false;
        }

        if (file.size > this.MAX_FILE_SIZE) {
            this.showError(`File size exceeds ${this.MAX_FILE_SIZE / (1024 * 1024)}MB limit`);
            return false;
        }

        return true;
    }

    formatPhoneNumber(e) {
        const target = e.target;
        let value = target.value.replace(/\D/g, '');
        if (value.length > 15) {
            value = value.substring(0, 15);
        }
        target.value = value;
    }

    handleFileSelect() {
        const file = this.elements.pdfInput.files?.[0];
        if (file) {
            this.elements.fileName.textContent = file.name;
            this.elements.fileSize.textContent = this.formatFileSize(file.size);
            this.elements.fileSelected.classList.add('active');
        } else {
            this.elements.fileSelected.classList.remove('active');
        }
    }

    removeFile() {
        this.elements.pdfInput.value = '';
        this.elements.fileSelected.classList.remove('active');
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    setLoadingState(isLoading) {
        this.elements.submitBtn.disabled = isLoading;
        if (isLoading) {
            this.elements.loading.classList.add('active');
            this.elements.messageDiv.innerHTML = '';
            this.elements.messageDiv.className = 'message';
        } else {
            this.elements.loading.classList.remove('active');
        }
    }

    showSuccess(data) {
        this.elements.messageDiv.innerHTML = `
            <div class="message-icon">
                <i class="fas fa-check-circle"></i>
            </div>
            <div class="message-title">Success!</div>
            <div class="message-text">
                Fee receipt sent successfully to ${data.phoneNumber || 'the recipient'}
            </div>
            ${data.messageId ? `
                <div class="message-details">
                    <i class="fas fa-hashtag"></i>
                    Message ID: ${data.messageId}
                </div>
            ` : ''}
        `;
        this.elements.messageDiv.className = 'message success';
        this.scrollToMessage();
    }

    showError(message) {
        this.elements.messageDiv.innerHTML = `
            <div class="message-icon">
                <i class="fas fa-exclamation-circle"></i>
            </div>
            <div class="message-title">Error</div>
            <div class="message-text">${message}</div>
        `;
        this.elements.messageDiv.className = 'message error';
        this.scrollToMessage();
    }

    scrollToMessage() {
        setTimeout(() => {
            this.elements.messageDiv.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'nearest' 
            });
        }, 100);
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new FeeSenderApp();
});
