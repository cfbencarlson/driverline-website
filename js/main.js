/**
 * DriverLine Main JavaScript
 * Handles navigation, form validation, and UI interactions
 */

(function () {
  'use strict';

  // ===========================================
  // DOM Elements
  // ===========================================

  const header = document.getElementById('header');
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const mobileNav = document.getElementById('mobile-nav');
  const contactForm = document.getElementById('contact-form');

  // ===========================================
  // Header Scroll Effect
  // ===========================================

  function initHeaderScroll() {
    if (!header) return;

    let lastScrollY = window.scrollY;
    let ticking = false;

    function updateHeader() {
      const scrollY = window.scrollY;

      if (scrollY > 10) {
        header.classList.add('header--scrolled');
      } else {
        header.classList.remove('header--scrolled');
      }

      lastScrollY = scrollY;
      ticking = false;
    }

    function onScroll() {
      if (!ticking) {
        window.requestAnimationFrame(updateHeader);
        ticking = true;
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });

    // Initial check
    updateHeader();
  }

  // ===========================================
  // Mobile Navigation
  // ===========================================

  function initMobileNav() {
    if (!mobileMenuBtn || !mobileNav) return;

    let isOpen = false;

    function toggleMenu() {
      isOpen = !isOpen;

      mobileMenuBtn.setAttribute('aria-expanded', isOpen.toString());
      mobileNav.classList.toggle('mobile-nav--open', isOpen);

      // Update button icon
      const icon = mobileMenuBtn.querySelector('.mobile-menu-btn__icon');
      if (icon) {
        if (isOpen) {
          icon.innerHTML = `
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          `;
        } else {
          icon.innerHTML = `
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
          `;
        }
      }

      // Prevent body scroll when menu is open
      document.body.style.overflow = isOpen ? 'hidden' : '';
    }

    function closeMenu() {
      if (isOpen) {
        isOpen = false;
        mobileMenuBtn.setAttribute('aria-expanded', 'false');
        mobileNav.classList.remove('mobile-nav--open');

        const icon = mobileMenuBtn.querySelector('.mobile-menu-btn__icon');
        if (icon) {
          icon.innerHTML = `
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
          `;
        }

        document.body.style.overflow = '';
      }
    }

    mobileMenuBtn.addEventListener('click', toggleMenu);

    // Close menu on link click
    const mobileNavLinks = mobileNav.querySelectorAll('.mobile-nav__link');
    mobileNavLinks.forEach((link) => {
      link.addEventListener('click', closeMenu);
    });

    // Close menu on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isOpen) {
        closeMenu();
        mobileMenuBtn.focus();
      }
    });

    // Close menu on window resize (if switching to desktop)
    window.addEventListener('resize', () => {
      if (window.innerWidth >= 768 && isOpen) {
        closeMenu();
      }
    });
  }

  // ===========================================
  // Form Validation
  // ===========================================

  function initContactForm() {
    if (!contactForm) return;

    const submitBtn = document.getElementById('submit-btn');
    const submitText = document.getElementById('submit-text');
    const submitSpinner = document.getElementById('submit-spinner');
    const formSuccess = document.getElementById('form-success');

    // Validation rules
    const validators = {
      firstName: {
        required: true,
        minLength: 2,
        message: 'Please enter your first name (at least 2 characters)',
      },
      lastName: {
        required: true,
        minLength: 2,
        message: 'Please enter your last name (at least 2 characters)',
      },
      company: {
        required: true,
        minLength: 2,
        message: 'Please enter your company name',
      },
      email: {
        required: true,
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        message: 'Please enter a valid email address',
      },
      phone: {
        required: true,
        pattern: /^[\d\s\-\(\)\+\.]{10,}$/,
        message: 'Please enter a valid phone number',
      },
      businessType: {
        required: true,
        message: 'Please select your business type',
      },
      locations: {
        required: true,
        message: 'Please select the number of locations',
      },
    };

    function validateField(field) {
      const name = field.name;
      const value = field.value.trim();
      const validator = validators[name];
      const errorElement = document.getElementById(`${name}-error`);

      if (!validator) return true;

      let isValid = true;
      let errorMessage = '';

      // Required check
      if (validator.required && !value) {
        isValid = false;
        errorMessage = validator.message;
      }

      // Min length check
      if (isValid && validator.minLength && value.length < validator.minLength) {
        isValid = false;
        errorMessage = validator.message;
      }

      // Pattern check
      if (isValid && validator.pattern && !validator.pattern.test(value)) {
        isValid = false;
        errorMessage = validator.message;
      }

      // Update UI
      if (errorElement) {
        errorElement.textContent = isValid ? '' : errorMessage;
      }

      field.classList.toggle('form-input--error', !isValid);
      field.setAttribute('aria-invalid', (!isValid).toString());

      return isValid;
    }

    function validateForm() {
      const fields = contactForm.querySelectorAll('input, select, textarea');
      let isFormValid = true;

      fields.forEach((field) => {
        if (!validateField(field)) {
          isFormValid = false;
        }
      });

      return isFormValid;
    }

    // Real-time validation on blur
    const formFields = contactForm.querySelectorAll('input, select');
    formFields.forEach((field) => {
      field.addEventListener('blur', () => validateField(field));

      // Clear error on input
      field.addEventListener('input', () => {
        const errorElement = document.getElementById(`${field.name}-error`);
        if (errorElement && errorElement.textContent) {
          field.classList.remove('form-input--error');
          errorElement.textContent = '';
        }
      });
    });

    // Form submission
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Validate all fields
      if (!validateForm()) {
        // Focus first invalid field
        const firstInvalid = contactForm.querySelector('.form-input--error');
        if (firstInvalid) {
          firstInvalid.focus();
        }
        return;
      }

      // Show loading state
      submitBtn.disabled = true;
      submitText.textContent = 'Submitting...';
      submitSpinner.style.display = 'inline-block';

      // Collect form data
      const formData = new FormData(contactForm);
      const data = Object.fromEntries(formData.entries());

      // Submit to Web3Forms
      try {
        const response = await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: { 'Accept': 'application/json' },
          body: formData,
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || 'Form submission failed');
        }

        // Analytics event (placeholder)
        if (window.dataLayer) {
          window.dataLayer.push({
            event: 'form_submission',
            form_name: 'contact_form',
            business_type: data.businessType,
            locations: data.locations,
          });
        }

        // Show success message
        contactForm.style.display = 'none';
        formSuccess.style.display = 'block';

        // Scroll to success message
        formSuccess.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch (error) {
        console.error('Form submission error:', error);

        // Reset button state
        submitBtn.disabled = false;
        submitText.textContent = 'Request Coverage';
        submitSpinner.style.display = 'none';

        // Show error (in production, show a proper error message)
        alert('There was an error submitting the form. Please try again or contact us directly.');
      }
    });
  }

  // ===========================================
  // Smooth Scrolling for Anchor Links
  // ===========================================

  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');

        // Skip if just "#"
        if (href === '#') return;

        const target = document.querySelector(href);
        if (target) {
          e.preventDefault();

          const headerHeight = header ? header.offsetHeight : 0;
          const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - headerHeight - 20;

          window.scrollTo({
            top: targetPosition,
            behavior: 'smooth',
          });

          // Update focus for accessibility
          target.setAttribute('tabindex', '-1');
          target.focus();
        }
      });
    });
  }

  // ===========================================
  // Intersection Observer for Animations
  // ===========================================

  function initScrollAnimations() {
    const animatedElements = document.querySelectorAll('.card, .step, .trust-item, .audience-card, .value-item');

    if (!animatedElements.length || !('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px',
      }
    );

    animatedElements.forEach((el) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(20px)';
      el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
      observer.observe(el);
    });
  }

  // ===========================================
  // Phone Number Formatting
  // ===========================================

  function initPhoneFormatting() {
    const phoneInput = document.getElementById('phone');
    if (!phoneInput) return;

    phoneInput.addEventListener('input', (e) => {
      let value = e.target.value.replace(/\D/g, '');

      if (value.length > 0) {
        if (value.length <= 3) {
          value = `(${value}`;
        } else if (value.length <= 6) {
          value = `(${value.slice(0, 3)}) ${value.slice(3)}`;
        } else {
          value = `(${value.slice(0, 3)}) ${value.slice(3, 6)}-${value.slice(6, 10)}`;
        }
      }

      e.target.value = value;
    });
  }

  // ===========================================
  // Calculator Query Params Handler
  // ===========================================

  function initCalculatorParams() {
    // Only run on contact page with the form
    if (!contactForm) return;

    // Parse query params from hash (format: #request-coverage?param=value)
    const hash = window.location.hash;
    if (!hash || !hash.includes('?')) return;

    const queryString = hash.split('?')[1];
    if (!queryString) return;

    const params = new URLSearchParams(queryString);

    // Populate hidden fields
    const monthlyTotal = params.get('monthly_total');
    const drivers = params.get('drivers');
    const vehicles = params.get('vehicles');

    if (monthlyTotal) {
      const monthlyTotalField = document.getElementById('calculatorMonthlyTotal');
      if (monthlyTotalField) monthlyTotalField.value = monthlyTotal;
    }

    if (drivers) {
      const driversField = document.getElementById('calculatorDrivers');
      if (driversField) driversField.value = drivers;
    }

    if (vehicles) {
      const vehiclesField = document.getElementById('calculatorVehicles');
      if (vehiclesField) vehiclesField.value = vehicles;
    }
  }

  // ===========================================
  // Initialize Everything
  // ===========================================

  function init() {
    initHeaderScroll();
    initMobileNav();
    initContactForm();
    initSmoothScroll();
    initScrollAnimations();
    initPhoneFormatting();
    initCalculatorParams();
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
