/**
 * Digitallab CV Creator - Main JavaScript File
 * Handles frontend interactions and UI enhancements
 */

// Global app configuration
const DigitallabCV = {
    config: {
        animationDuration: 300,
        toastDuration: 3000,
        debounceDelay: 500
    },

    // Initialize the application
    init() {
        console.log('Initializing Digitallab CV Creator...');
        this.setupEventListeners();
        this.initializeComponents();
        this.setupAnimations();
    },

    // Set up global event listeners
    setupEventListeners() {
        // Bootstrap tooltip initialization
        this.initializeTooltips();

        // Form validation
        this.setupFormValidation();

        // Copy to clipboard functionality
        this.setupClipboardActions();

        // Smooth scrolling
        this.setupSmoothScrolling();

        // Loading states
        this.setupLoadingStates();
    },

    // Initialize Bootstrap components
    initializeComponents() {
        // Initialize tooltips
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));

        // Initialize popovers
        const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
        popoverTriggerList.map(popoverTriggerEl => new bootstrap.Popover(popoverTriggerEl));
    },

    // Setup animations and transitions
    setupAnimations() {
        // Intersection Observer for scroll animations
        if ('IntersectionObserver' in window) {
            this.setupScrollAnimations();
        }

        // Page load animations
        this.animatePageLoad();
    },

    // Initialize tooltips
    initializeTooltips() {
        const tooltips = document.querySelectorAll('[title]');
        tooltips.forEach(tooltip => {
            tooltip.setAttribute('data-bs-toggle', 'tooltip');
            tooltip.setAttribute('data-bs-placement', 'top');
        });
    },

    // Setup form validation
    setupFormValidation() {
        const forms = document.querySelectorAll('form[data-validate="true"]');
        forms.forEach(form => {
            form.addEventListener('submit', this.validateForm.bind(this));
        });

        // Real-time validation
        const inputs = document.querySelectorAll('input[required], textarea[required]');
        inputs.forEach(input => {
            input.addEventListener('blur', this.validateField.bind(this));
            input.addEventListener('input', this.debounce(this.validateField.bind(this), this.config.debounceDelay));
        });
    },

    // Validate individual form field
    validateField(event) {
        const field = event.target;
        const value = field.value.trim();
        const type = field.type;

        // Remove existing validation classes
        field.classList.remove('is-valid', 'is-invalid');

        // Skip validation if field is empty and not required
        if (!value && !field.required) return;

        let isValid = true;

        // Basic validation rules
        if (field.required && !value) {
            isValid = false;
        } else if (type === 'email' && value) {
            isValid = this.validateEmail(value);
        } else if (type === 'url' && value) {
            isValid = this.validateURL(value);
        } else if (type === 'tel' && value) {
            isValid = this.validatePhone(value);
        }

        // Apply validation classes
        field.classList.add(isValid ? 'is-valid' : 'is-invalid');

        return isValid;
    },

    // Validate entire form
    validateForm(event) {
        const form = event.target;
        const fields = form.querySelectorAll('input[required], textarea[required]');
        let isFormValid = true;

        fields.forEach(field => {
            const fieldEvent = { target: field };
            if (!this.validateField(fieldEvent)) {
                isFormValid = false;
            }
        });

        if (!isFormValid) {
            event.preventDefault();
            this.showToast('Please fix the errors in the form.', 'error');
        }

        return isFormValid;
    },

    // Email validation
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    // URL validation
    validateURL(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    },

    // Phone validation
    validatePhone(phone) {
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        return phoneRegex.test(phone.replace(/\s+/g, ''));
    },

    // Setup clipboard copy functionality
    setupClipboardActions() {
        const copyButtons = document.querySelectorAll('[data-copy]');
        copyButtons.forEach(button => {
            button.addEventListener('click', this.copyToClipboard.bind(this));
        });
    },

    // Copy text to clipboard
    async copyToClipboard(event) {
        const button = event.currentTarget;
        const targetSelector = button.getAttribute('data-copy');
        const target = document.querySelector(targetSelector);

        if (!target) return;

        const text = target.value || target.textContent;

        try {
            await navigator.clipboard.writeText(text);
            this.showCopySuccess(button);
            this.showToast('Copied to clipboard!', 'success');
        } catch (err) {
            console.error('Failed to copy: ', err);
            this.showToast('Failed to copy to clipboard.', 'error');
        }
    },

    // Show copy success visual feedback
    showCopySuccess(button) {
        const originalHTML = button.innerHTML;
        const originalClasses = button.className;

        button.innerHTML = '<i class="fas fa-check"></i>';
        button.className = button.className.replace('btn-outline-primary', 'btn-success');

        setTimeout(() => {
            button.innerHTML = originalHTML;
            button.className = originalClasses;
        }, 2000);
    },

    // Setup smooth scrolling
    setupSmoothScrolling() {
        const links = document.querySelectorAll('a[href^="#"]');
        links.forEach(link => {
            link.addEventListener('click', this.smoothScroll.bind(this));
        });
    },

    // Smooth scroll to target
    smoothScroll(event) {
        event.preventDefault();
        const targetId = event.currentTarget.getAttribute('href');
        const target = document.querySelector(targetId);

        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    },

    // Setup loading states for forms
    setupLoadingStates() {
        const forms = document.querySelectorAll('form');
        forms.forEach(form => {
            form.addEventListener('submit', this.showLoadingState.bind(this));
        });
    },

    // Show loading state on form submission
    showLoadingState(event) {
        const form = event.target;
        const submitButton = form.querySelector('button[type="submit"]');

        if (submitButton) {
            submitButton.classList.add('loading');
            submitButton.disabled = true;

            const originalText = submitButton.textContent;
            submitButton.textContent = 'Processing...';

            // Reset after 30 seconds (fallback)
            setTimeout(() => {
                submitButton.classList.remove('loading');
                submitButton.disabled = false;
                submitButton.textContent = originalText;
            }, 30000);
        }
    },

    // Setup scroll animations
    setupScrollAnimations() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('fade-in');
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });

        const elements = document.querySelectorAll('.feature-card, .cv-card, .pricing-card');
        elements.forEach(el => observer.observe(el));
    },

    // Animate page load
    animatePageLoad() {
        document.body.style.opacity = '0';

        window.addEventListener('load', () => {
            document.body.style.transition = 'opacity 0.5s ease';
            document.body.style.opacity = '1';
        });
    },

    // Show toast notification
    showToast(message, type = 'info') {
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
        toast.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';

        toast.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        document.body.appendChild(toast);

        // Auto remove after duration
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, this.config.toastDuration);
    },

    // Debounce function
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Utility: Format phone number
    formatPhoneNumber(phone) {
        const cleaned = phone.replace(/\D/g, '');
        const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
        if (match) {
            return '(' + match[1] + ') ' + match[2] + '-' + match[3];
        }
        return phone;
    },

    // Utility: Validate file upload
    validateFileUpload(file, maxSize = 5 * 1024 * 1024, allowedTypes = ['image/jpeg', 'image/png', 'image/gif']) {
        if (file.size > maxSize) {
            this.showToast('File size must be less than 5MB.', 'error');
            return false;
        }

        if (!allowedTypes.includes(file.type)) {
            this.showToast('File type not supported. Please use JPG, PNG, or GIF.', 'error');
            return false;
        }

        return true;
    },

    // CV Preview functionality
    updateCVPreview(formData) {
        const preview = document.getElementById('cvPreview');
        if (!preview) return;

        // Basic preview template
        const previewHTML = `
            <div class="cv-preview-content">
                ${formData.title ? `<h6 class="text-primary fw-bold mb-2">${formData.title}</h6>` : ''}
                ${formData.fullName ? `<h5 class="fw-bold mb-1">${formData.fullName}</h5>` : ''}
                ${formData.email ? `<p class="text-muted small mb-1"><i class="fas fa-envelope me-1"></i>${formData.email}</p>` : ''}
                ${formData.phone ? `<p class="text-muted small mb-1"><i class="fas fa-phone me-1"></i>${formData.phone}</p>` : ''}
                ${formData.address ? `<p class="text-muted small mb-3"><i class="fas fa-map-marker-alt me-1"></i>${formData.address}</p>` : ''}
                
                ${formData.summary ? `
                    <div class="mb-3">
                        <h6 class="fw-bold text-primary">Summary</h6>
                        <p class="small">${formData.summary.substring(0, 100)}${formData.summary.length > 100 ? '...' : ''}</p>
                    </div>
                ` : ''}
                
                <div class="text-center mt-3">
                    <div class="bg-light p-2 rounded">
                        <i class="fas fa-qrcode fa-2x text-primary"></i>
                        <p class="small text-muted mb-0 mt-1">QR Code will appear here</p>
                    </div>
                </div>
            </div>
        `;

        preview.innerHTML = previewHTML;
    }
};

// CV Form specific functionality
const CVForm = {
    init() {
        this.setupLivePreview();
        this.setupFieldFormatting();
    },

    setupLivePreview() {
        const form = document.getElementById('cvForm');
        if (!form) return;

        const inputs = form.querySelectorAll('input, textarea');
        inputs.forEach(input => {
            input.addEventListener('input', this.updatePreview.bind(this));
        });

        // Initial preview
        this.updatePreview();
    },

    updatePreview() {
        const formData = {
            title: document.getElementById('title')?.value || '',
            fullName: document.getElementById('full_name')?.value || '',
            email: document.getElementById('email')?.value || '',
            phone: document.getElementById('phone')?.value || '',
            address: document.getElementById('address')?.value || '',
            summary: document.getElementById('summary')?.value || ''
        };

        DigitallabCV.updateCVPreview(formData);
    },

    setupFieldFormatting() {
        // Phone number formatting
        const phoneInput = document.getElementById('phone');
        if (phoneInput) {
            phoneInput.addEventListener('input', (e) => {
                e.target.value = DigitallabCV.formatPhoneNumber(e.target.value);
            });
        }

        // URL validation for links
        const urlInputs = document.querySelectorAll('input[type="url"]');
        urlInputs.forEach(input => {
            input.addEventListener('blur', (e) => {
                let url = e.target.value.trim();
                if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
                    e.target.value = 'https://' + url;
                }
            });
        });
    }
};

// QR Code functionality
const QRCode = {
    downloadQR(imageElement) {
        if (!imageElement) return;

        const link = document.createElement('a');
        link.download = 'cv-qr-code.png';
        link.href = imageElement.src;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        DigitallabCV.showToast('QR Code downloaded successfully!', 'success');
    },

    shareCV(url, title) {
        if (navigator.share) {
            navigator.share({
                title: title,
                text: 'Check out my professional CV',
                url: url
            }).then(() => {
                DigitallabCV.showToast('CV shared successfully!', 'success');
            }).catch((error) => {
                console.log('Error sharing:', error);
                this.fallbackShare(url, title);
            });
        } else {
            this.fallbackShare(url, title);
        }
    },

    fallbackShare(url, title) {
        navigator.clipboard.writeText(`${title}\n${url}`).then(() => {
            DigitallabCV.showToast('CV link copied to clipboard!', 'success');
        }).catch(() => {
            DigitallabCV.showToast('Unable to share. Please copy the link manually.', 'error');
        });
    }
};

// Subscription management
const Subscription = {
    init() {
        this.setupPlanComparison();
        this.setupPaymentFlow();
    },

    setupPlanComparison() {
        const comparisonTable = document.querySelector('.table-responsive table');
        if (comparisonTable) {
            // Add hover effects to table rows
            const rows = comparisonTable.querySelectorAll('tbody tr');
            rows.forEach(row => {
                row.addEventListener('mouseenter', () => {
                    row.style.backgroundColor = '#f8f9fa';
                    row.style.transform = 'scale(1.01)';
                    row.style.transition = 'all 0.2s ease';
                });

                row.addEventListener('mouseleave', () => {
                    row.style.backgroundColor = '';
                    row.style.transform = 'scale(1)';
                });
            });
        }
    },

    setupPaymentFlow() {
        const paymentForms = document.querySelectorAll('form[action*="checkout"]');
        paymentForms.forEach(form => {
            form.addEventListener('submit', () => {
                DigitallabCV.showToast('Redirecting to secure payment...', 'info');
            });
        });
    }
};

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    DigitallabCV.init();
    CVForm.init();
    Subscription.init();
});

// Global utility functions
window.copyUrl = function () {
    const urlInput = document.getElementById('publicUrl');
    if (urlInput) {
        urlInput.select();
        urlInput.setSelectionRange(0, 99999);
        navigator.clipboard.writeText(urlInput.value).then(() => {
            DigitallabCV.showToast('URL copied to clipboard!', 'success');
        });
    }
};

window.downloadQR = function () {
    const qrImage = document.querySelector('img[alt="QR Code"]');
    if (qrImage) {
        QRCode.downloadQR(qrImage);
    } else {
        DigitallabCV.showToast('QR code not available for download.', 'error');
    }
};

window.shareCV = function () {
    const urlInput = document.getElementById('publicUrl');
    const title = document.querySelector('h1')?.textContent || 'Professional CV';

    if (urlInput) {
        QRCode.shareCV(urlInput.value, title);
    }
};

// Service Worker registration for PWA capabilities (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                console.log('SW registered: ', registration);
            })
            .catch((registrationError) => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}

// Export for use in other scripts
window.DigitallabCV = DigitallabCV;
window.CVForm = CVForm;
window.QRCode = QRCode;
window.Subscription = Subscription;
