// TypeScript Application for WhatsApp Fee Sender
interface FormElements {
    form: HTMLFormElement;
    phoneInput: HTMLInputElement;
    pdfInput: HTMLInputElement;
    submitBtn: HTMLButtonElement;
    loading: HTMLElement;
    messageDiv: HTMLElement;
    fileUploadArea: HTMLElement;
    fileSelected: HTMLElement;
    fileName: HTMLElement;
    fileSize: HTMLElement;
    removeFileBtn: HTMLButtonElement;
}

interface ApiResponse {
    success: boolean;
    message?: string;
    phoneNumber?: string;
    messageId?: string;
}

class FeeSenderApp {
    private elements: FormElements;
    private readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

    constructor() {
        this.elements = this.initializeElements();
        this.attachEventListeners();
        this.setupDragAndDrop();
    }

    private initializeElements(): FormElements {
        return {
            form: document.getElementById('uploadForm') as HTMLFormElement,
            phoneInput: document.getElementById('phoneNumber') as HTMLInputElement,
            pdfInput: document.getElementById('pdfFile') as HTMLInputElement,
            submitBtn: document.getElementById('submitBtn') as HTMLButtonElement,
            loading: document.getElementById('loading') as HTMLElement,
            messageDiv: document.getElementById('message') as HTMLElement,
            fileUploadArea: document.getElementById('fileUploadArea') as HTMLElement,
            fileSelected: document.getElementById('fileSelected') as HTMLElement,
            fileName: document.getElementById('fileName') as HTMLElement,
            fileSize: document.getElementById('fileSize') as HTMLElement,
            removeFileBtn: document.getElementById('removeFile') as HTMLButtonElement
        };
    }

    private attachEventListeners(): void {
        this.elements.form.addEventListener('submit', (e) => this.handleSubmit(e));
        this.elements.phoneInput.addEventListener('input', (e) => this.formatPhoneNumber(e));
        this.elements.pdfInput.addEventListener('change', () => this.handleFileSelect());
        this.elements.removeFileBtn.addEventListener('click', () => this.removeFile());
    }

    private setupDragAndDrop(): void {
        const area = this.elements.fileUploadArea;
        
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            area.addEventListener(eventName, this.preventDefaults, false);
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

        area.addEventListener('drop', (e: DragEvent) => {
            const dt = e.dataTransfer;
            const files = dt?.files;
            if (files && files.length > 0) {
                this.elements.pdfInput.files = files;
                this.handleFileSelect();
            }
        }, false);
    }

    private preventDefaults(e: Event): void {
        e.preventDefault();
        e.stopPropagation();
    }

    private async handleSubmit(e: Event): Promise<void> {
        e.preventDefault();

        if (!this.validateInputs()) {
            return;
        }

        this.setLoadingState(true);

        try {
            const formData = new FormData();
            formData.append('phoneNumber', this.elements.phoneInput.value.trim());
            formData.append('pdf', this.elements.pdfInput.files![0]);

            const response = await fetch('/api/upload/send-pdf', {
                method: 'POST',
                body: formData
            });

            const data: ApiResponse = await response.json();

            if (data.success) {
                this.showSuccess(data);
                this.elements.form.reset();
            } else {
                this.showError(data.message || 'Failed to send receipt');
            }
        } catch (error) {
            this.showError('Network error. Please try again.');
            console.error('Error:', error);
        } finally {
            this.setLoadingState(false);
        }
    }

    private validateInputs(): boolean {
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

    private formatPhoneNumber(e: Event): void {
        const target = e.target as HTMLInputElement;
        let value = target.value.replace(/\D/g, '');
        if (value.length > 15) {
            value = value.substring(0, 15);
        }
        target.value = value;
    }

    private handleFileSelect(): void {
        const file = this.elements.pdfInput.files?.[0];
        if (file) {
            this.elements.fileName.textContent = file.name;
            this.elements.fileSize.textContent = this.formatFileSize(file.size);
            this.elements.fileSelected.classList.add('active');
        } else {
            this.elements.fileSelected.classList.remove('active');
        }
    }

    private removeFile(): void {
        this.elements.pdfInput.value = '';
        this.elements.fileSelected.classList.remove('active');
    }

    private formatFileSize(bytes: number): string {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    private setLoadingState(isLoading: boolean): void {
        this.elements.submitBtn.disabled = isLoading;
        if (isLoading) {
            this.elements.loading.classList.add('active');
            this.elements.messageDiv.innerHTML = '';
            this.elements.messageDiv.className = 'message';
        } else {
            this.elements.loading.classList.remove('active');
        }
    }

    private showSuccess(data: ApiResponse): void {
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

    private showError(message: string): void {
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

    private scrollToMessage(): void {
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
