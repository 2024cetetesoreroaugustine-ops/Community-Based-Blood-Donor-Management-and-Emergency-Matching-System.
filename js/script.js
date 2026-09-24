// ============================================================
// PULSELINK — Fully Functional MySQL Connected
// All UI flow, field names, and design preserved exactly
// Enhanced validation per requirements
// ============================================================

const API_BASE = 'http://localhost/BloodDonorSystem/api';

function appConfirm(message, title = 'Please Confirm') {
    return new Promise((resolve) => {
        let overlay = document.getElementById('appConfirmOverlay');

        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'appConfirmOverlay';
            overlay.className = 'app-confirm-overlay';
            overlay.innerHTML = `
                <div class="app-confirm-box">
                    <div class="app-confirm-title" id="appConfirmTitle"></div>
                    <div class="app-confirm-msg" id="appConfirmMsg"></div>
                    <div class="app-confirm-actions">
                        <button type="button" class="app-confirm-btn app-confirm-cancel" id="appConfirmCancel">Cancel</button>
                        <button type="button" class="app-confirm-btn app-confirm-ok" id="appConfirmOk">OK</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);
        }

        const titleEl = document.getElementById('appConfirmTitle');
        const msgEl = document.getElementById('appConfirmMsg');
        const okBtn = document.getElementById('appConfirmOk');
        const cancelBtn = document.getElementById('appConfirmCancel');

        titleEl.textContent = title;
        msgEl.textContent = String(message || '');

        const cleanup = () => {
            overlay.style.display = 'none';
            okBtn.removeEventListener('click', onOk);
            cancelBtn.removeEventListener('click', onCancel);
            overlay.removeEventListener('click', onOverlay);
        };

        const onOk = () => { cleanup(); resolve(true); };
        const onCancel = () => { cleanup(); resolve(false); };
        const onOverlay = (e) => {
            if (e.target === overlay) {
                cleanup();
                resolve(false);
            }
        };

        okBtn.addEventListener('click', onOk);
        cancelBtn.addEventListener('click', onCancel);
        overlay.addEventListener('click', onOverlay);

        overlay.style.display = 'flex';
    });
}

window.appConfirm = appConfirm;

if (typeof window.appConfirm !== 'function') {
    window.appConfirm = async (message) => confirm(String(message || ''));
}

// ── Session ───────────────────────────────────────────────────
const session = {
    UserID:                   null,
    Username:                 null,
    ROLES_RoleID:             null,
    entityData:               null,
    admin_id:                 null,
    Hospital_id:              null,
    hospital_user_id:         null,
    donor_id:                 null,
    USERS_UserID_donor:       null,
    latestRequestBloodTypeId: null,
    latestRequestBarangayId:  null,
    latestRequestREQid:       null
};
window.session = session;


// ── Lookup Maps ───────────────────────────────────────────────
const bloodTypeMap = {
    "1":"A+","2":"A-","3":"B+","4":"B-",
    "5":"O+","6":"O-","7":"AB+","8":"AB-"
};
const barangayMap = {
    "1":"Apopong","2":"Baluan","3":"Bula","4":"Calumpang",
    "5":"City Heights","6":"Labangal","7":"Lagao","8":"San Isidro"
};

// ── Icons ─────────────────────────────────────────────────────
const ICONS = {
    home:    '<svg class="icon" viewBox="0 0 24 24"><path d="M3 11.5 12 4l9 7.5M5.5 10v9A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5v-9"/></svg>',
    donors:  '<svg class="icon" viewBox="0 0 24 24"><path d="M8 2.5h8a1 1 0 0 1 1 1V5H7V3.5a1 1 0 0 1 1-1Z"/><rect x="5" y="5" width="14" height="16.5" rx="2"/><path d="M9 11h6M9 14.5h6M9 18h4"/></svg>',
    requests:'<svg class="icon" viewBox="0 0 24 24"><path d="M12 3.5 2 20.5h20L12 3.5Z"/><path d="M12 10v4.2M12 17.2h.01"/></svg>',
    matched: '<svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></svg>',
    drives:  '<svg class="icon" viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="16" rx="2"/><path d="M4 9.5h16M8 3v3.5M16 3v3.5"/></svg>',
    users:   '<svg class="icon" viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.2"/><path d="M3.5 20c.7-3.4 3-5.3 5.5-5.3s4.8 1.9 5.5 5.3"/><circle cx="17" cy="8.5" r="2.6"/><path d="M15.5 14.9c2.2.3 3.9 2.1 4.5 5.1"/></svg>',
    reports: '<svg class="icon" viewBox="0 0 24 24"><path d="M4 20V10M10 20V4M16 20v-7M20 20H4"/></svg>',
    profile: '<svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4.5 20c1-4.2 3.8-6.5 7.5-6.5s6.5 2.3 7.5 6.5"/></svg>',
    bell:    '<svg class="icon" viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 5.5-2 7-2 7h16s-2-1.5-2-7"/><path d="M10.5 19a1.7 1.7 0 0 0 3 0"/></svg>'
};

// ── API Helpers ───────────────────────────────────────────────
async function apiGet(endpoint) {
    try {
        const r = await fetch(`${API_BASE}/${endpoint}`);
        return await r.json();
    } catch (err) {
        console.error('GET error:', endpoint, err);
        return { success: false, message: 'Network error. Check your connection.', data: null };
    }
}

async function apiPost(endpoint, data) {
    try {
        const r = await fetch(`${API_BASE}/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await r.json();
    } catch (err) {
        console.error('POST error:', endpoint, err);
        return { success: false, message: 'Network error. Check your connection.', data: null };
    }
}

async function apiPut(endpoint, data) {
    try {
        const r = await fetch(`${API_BASE}/${endpoint}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await r.json();
    } catch (err) {
        console.error('PUT error:', endpoint, err);
        return { success: false, message: 'Network error. Check your connection.', data: null };
    }
}

window.apiGet = apiGet;
window.apiPost = apiPost;
window.apiPut = apiPut;



// ── INIT ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    initEvents();
    initValidationListeners();
});

// ══════════════════════════════════════════════════════════════
// VALIDATION FUNCTIONS
// ══════════════════════════════════════════════════════════════

function showLoginError(message) {
    const errBox = document.getElementById('loginError');
    const errMsg = document.getElementById('loginErrorMsg');
    if (errBox && errMsg) {
        errMsg.textContent   = message;
        errBox.style.display = 'flex';
    }
}

function hideLoginError() {
    const errBox = document.getElementById('loginError');
    if (errBox) errBox.style.display = 'none';
}

function showValidationError(input, message) {
    if (!input) return;
    const parent = input.closest('.form-group') || input.parentElement;
    parent.querySelectorAll('small.dyn-error').forEach(e => e.remove());
    input.classList.remove('valid');
    input.classList.add('invalid');
    if (message) {
        const error = document.createElement('small');
        error.className  = 'error-message dyn-error';
        error.innerText  = message;
        parent.appendChild(error);
    }
}

function showValidationSuccess(input) {
    if (!input) return;
    const parent = input.closest('.form-group') || input.parentElement;
    parent.querySelectorAll('small.dyn-error').forEach(e => e.remove());
    input.classList.remove('invalid');
    input.classList.add('valid');
}

function clearValidation(input) {
    if (!input) return;
    input.classList.remove('invalid', 'valid');
    const parent = input.closest('.form-group') || input.parentElement;
    parent.querySelectorAll('small.dyn-error').forEach(e => e.remove());
}

function validateRequired(input, fieldName) {
    if (!input) return false;
    if (!input.value.trim()) {
        showValidationError(input, `${fieldName} is required.`);
        return false;
    }
    showValidationSuccess(input);
    return true;
}

// Name: only letters, spaces, hyphens, apostrophes — NO numbers
function validateNameField(input, fieldName, required = true) {
    if (!input) return false;
    const val = input.value.trim();
    if (!val && !required) { clearValidation(input); return true; }
    if (!val && required) {
        showValidationError(input, `${fieldName} is required.`);
        return false;
    }
    if (/\d/.test(val)) {
        showValidationError(input, `${fieldName} must not contain numbers.`);
        return false;
    }
    if (!/^[a-zA-ZÀ-ÿ\s'\-]+$/u.test(val)) {
        showValidationError(input, `${fieldName} must contain letters only.`);
        return false;
    }
    showValidationSuccess(input);
    return true;
}

// Email: must be @gmail.com
function validateEmailField(input, required = true) {
    if (!input) return false;
    const val = input.value.trim();
    if (!val && !required) { clearValidation(input); return true; }
    if (!val && required) {
        showValidationError(input, 'Email is required.');
        return false;
    }
    if (!/^[a-zA-Z0-9._%+\-]+@gmail\.com$/.test(val)) {
        showValidationError(input,
            'Email must be a valid @gmail.com address (e.g. name@gmail.com).');
        return false;
    }
    showValidationSuccess(input);
    return true;
}

// Phone: +63XXXXXXXXXX or 09XXXXXXXXX
function validatePhoneField(input, required = true) {
    if (!input) return false;
    const val = input.value.trim();
    if (!val && !required) { clearValidation(input); return true; }
    if (!val && required) {
        showValidationError(input, 'Phone number is required.');
        return false;
    }
    if (!/^(\+63[0-9]{10}|09[0-9]{9})$/.test(val)) {
        showValidationError(input,
            'Use Philippine format: +63XXXXXXXXXX (13 digits) or 09XXXXXXXXX (11 digits).');
        return false;
    }
    showValidationSuccess(input);
    return true;
}

// Password: min 8, uppercase, lowercase, number, special char
function validatePasswordField(input) {
    if (!input) return false;
    const val = input.value;
    if (!val) {
        showValidationError(input, 'Password is required.');
        return false;
    }
    if (val.length < 8) {
        showValidationError(input, 'Password must be at least 8 characters.');
        return false;
    }
    if (!/[A-Z]/.test(val)) {
        showValidationError(input,
            'Password must contain at least one uppercase letter (A-Z).');
        return false;
    }
    if (!/[a-z]/.test(val)) {
        showValidationError(input,
            'Password must contain at least one lowercase letter (a-z).');
        return false;
    }
    if (!/[0-9]/.test(val)) {
        showValidationError(input,
            'Password must contain at least one number (0-9).');
        return false;
    }
    if (!/[\W_]/.test(val)) {
        showValidationError(input,
            'Password must contain at least one special character (!@#$%^&*).');
        return false;
    }
    showValidationSuccess(input);
    return true;
}

// Password confirm match
function validatePasswordConfirm(passInput, confirmInput) {
    if (!passInput || !confirmInput) return false;
    if (confirmInput.value !== passInput.value) {
        showValidationError(confirmInput, 'Passwords do not match.');
        return false;
    }
    showValidationSuccess(confirmInput);
    return true;
}

// Username: alphanumeric + underscore, 3-30 chars
function validateUsernameField(input) {
    if (!input) return false;
    const val = input.value.trim();
    if (!val) {
        showValidationError(input, 'Username is required.');
        return false;
    }
    if (!/^[A-Z][a-zA-Z0-9_]{2,29}$/.test(val)) {
    showValidationError(input,
        'Username must be 3-30 characters, start with uppercase letter, and use letters, numbers, underscore only.');
    return false;
}
    showValidationSuccess(input);
    return true;
}

function normalizeUsernameInput(input) {
    if (!input) return;

    // Keep only letters, numbers, underscore
    let v = String(input.value || '').replace(/[^a-zA-Z0-9_]/g, '');

    // Max 30 chars
    v = v.slice(0, 30);

    // Auto uppercase first character if present
    if (v.length > 0) {
        v = v.charAt(0).toUpperCase() + v.slice(1);
    }

    input.value = v;
}

// Age: must be at least 17
function validateAgeField(input, minAge = 17) {
    if (!input) return false;
    const val = input.value;
    if (!val) {
        showValidationError(input, 'Birth date is required.');
        return false;
    }
    const bdt = new Date(val);
    const now  = new Date();
    let age    = now.getFullYear() - bdt.getFullYear();
    const m    = now.getMonth() - bdt.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < bdt.getDate())) age--;
    if (age < minAge) {
        showValidationError(input, `Donor must be at least ${minAge} years old.`);
        return false;
    }
    showValidationSuccess(input);
    return true;
}

// Auto-capitalize first letter of every word in name fields
function autoCapitalize(input) {
    if (!input) return;
    const pos = input.selectionStart;
    input.value = input.value.replace(/\b\w/g, c => c.toUpperCase());
    try { input.setSelectionRange(pos, pos); } catch(e) {}
}

// Password strength indicator
function updatePasswordStrength(password) {
    const fill  = document.getElementById('passStrengthFill');
    const label = document.getElementById('passStrengthLabel');
    if (!fill || !label) return;

    let score = 0;
    if (password.length >= 8)   score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[\W_]/.test(password)) score++;

    const levels = [
        { pct: '0%',   color: 'transparent', text: '' },
        { pct: '20%',  color: '#c62828',      text: 'Very Weak' },
        { pct: '40%',  color: '#e65100',      text: 'Weak' },
        { pct: '60%',  color: '#f9a825',      text: 'Fair' },
        { pct: '80%',  color: '#2e7d32',      text: 'Strong' },
        { pct: '100%', color: '#0e6e5b',      text: 'Very Strong' }
    ];

    const lvl             = levels[score];
    fill.style.width      = lvl.pct;
    fill.style.background = lvl.color;
    label.innerText       = lvl.text;
    label.style.color     = lvl.color;
}

// ── INIT VALIDATION LISTENERS ─────────────────────────────────
function initValidationListeners() {

    // Auto-capitalize all name fields
    const nameFields = [
        'choFirName','choLstName',
        'bhwFirName','bhwLstName',
        'selfDonorFirName','selfDonorMidName','selfDonorLstName',
        'regFirstName','regMiddleName','regLastName',
        'editProfileFirName','editProfileMidName','editProfileLstName'
    ];
    nameFields.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('input', () => autoCapitalize(el));
        el.addEventListener('blur',  () => {
            const optionalIds = [
                'selfDonorMidName','regMiddleName','editProfileMidName'
            ];
            const isOptional = optionalIds.includes(id);
            const labelEl = el.closest('.form-group')?.querySelector('label');
            const labelText = labelEl
                ? labelEl.innerText.replace('*','').replace('(optional)','').trim()
                : 'This field';
            validateNameField(el, labelText, !isOptional);
        });
    });

    // Phone validation on blur
    [
        'hospCttNumber','bhwCttNumber',
        'selfDonorPhone','regPhone','editProfilePhone'
    ].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('blur', () => validatePhoneField(el));
    });

    // Email validation on blur
    ['selfDonorEmail','regEmail','editProfileEmail'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('blur', () => {
                validateEmailField(el, false);
            });
        }
    });

    // Password strength on staffRegPass
    const staffRegPass = document.getElementById('staffRegPass');
    if (staffRegPass) {
        staffRegPass.addEventListener('input', () => {
            updatePasswordStrength(staffRegPass.value);
        });
        staffRegPass.addEventListener('blur', () => {
            validatePasswordField(staffRegPass);
        });
    }

    // Password strength on regDonorPassword
   const regDonorPass = document.getElementById('regDonorPassword');
if (regDonorPass) {
    regDonorPass.addEventListener('blur', () => {
        const v = String(regDonorPass.value || '').trim();
        if (!v) {
            showValidationError(regDonorPass, 'Temporary password is required.');
            return;
        }
        showValidationSuccess(regDonorPass);
    });
}

    // Password confirm on blur
    const staffConfirm = document.getElementById('staffRegPassConfirm');
    if (staffConfirm && staffRegPass) {
        staffConfirm.addEventListener('blur', () => {
            validatePasswordConfirm(staffRegPass, staffConfirm);
        });
    }

    // Username validation on blur
['staffRegUser','regDonorUsername','editUserUsername','editProfileUsername'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;

    el.addEventListener('input', () => normalizeUsernameInput(el));
    el.addEventListener('blur', () => validateUsernameField(el));
});
    // Birthdate age check on blur
    ['selfDonorBth','regBirthDate'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('blur', () => validateAgeField(el, 17));
    });

    // Set max date for birthdates (today = cannot be future)
    const todayStr = new Date().toISOString().split('T')[0];
    ['selfDonorBth','regBirthDate'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.setAttribute('max', todayStr);
    });

    // Set min date for request/drive dates (today = cannot be past)
    ['reqDate','driveDate','editDriveDate'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.setAttribute('min', todayStr);
    });

    // Toggle password visibility — all .toggle-pass-btn
    document.querySelectorAll('.toggle-pass-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.dataset.target;
            const input    = document.getElementById(targetId);
            if (input) {
                input.type = input.type === 'password' ? 'text' : 'password';
            }
        });
    });

    // Login password toggle
    const toggleLogin = document.getElementById('toggleLoginPass');
    const loginPass   = document.getElementById('initialLoginPassword');
    if (toggleLogin && loginPass) {
        toggleLogin.addEventListener('click', () => {
            loginPass.type = loginPass.type === 'password' ? 'text' : 'password';
        });
    }

    // Clear login error when user starts typing
    const loginUser = document.getElementById('initialLoginUsername');
    if (loginUser) {
        loginUser.addEventListener('input', hideLoginError);
    }
    if (loginPass) {
        loginPass.addEventListener('input', hideLoginError);
    }

    // Sequential field enforcement for registration
    initSequentialFields();
}

// ── SEQUENTIAL FIELD VALIDATION ───────────────────────────────
function initSequentialFields() {
    setupSequential([
        { id: 'regFirstName',  label: 'First Name',  required: true  },
        { id: 'regMiddleName', label: 'Middle Name', required: false },
        { id: 'regLastName',   label: 'Last Name',   required: true  }
    ]);

    setupSequential([
        { id: 'selfDonorFirName', label: 'First Name',  required: true  },
        { id: 'selfDonorMidName', label: 'Middle Name', required: false },
        { id: 'selfDonorLstName', label: 'Last Name',   required: true  }
    ]);

    setupSequential([
        { id: 'choFirName', label: 'First Name', required: true },
        { id: 'choLstName', label: 'Last Name',  required: true }
    ]);

    setupSequential([
        { id: 'bhwFirName', label: 'First Name', required: true },
        { id: 'bhwLstName', label: 'Last Name',  required: true }
    ]);
}

function setupSequential(fields) {
    fields.forEach((f, i) => {
        if (i === 0) return;
        const el = document.getElementById(f.id);
        if (!el) return;
        el.addEventListener('focus', () => {
            const prev   = fields[i - 1];
            const prevEl = document.getElementById(prev.id);
            if (prev.required && prevEl && !prevEl.value.trim()) {
                prevEl.focus();
                showValidationError(prevEl, `Please fill in ${prev.label} first.`);
            }
        });
    });
}

// ══════════════════════════════════════════════════════════════
// INIT EVENTS
// ══════════════════════════════════════════════════════════════
function initEvents() {

    // Open registration modal from login page (public signup disabled)
const publicRegisterLink = document.getElementById('linkOpenStaffRegister');
if (publicRegisterLink) {
    publicRegisterLink.addEventListener('click', e => {
        e.preventDefault();
        // disabled intentionally
    });
}
    // ── LOGIN ─────────────────────────────────────────────────
    document.getElementById('initialLoginForm')
        .addEventListener('submit', handleLogin);

    // ── LOGOUT ────────────────────────────────────────────────
    document.getElementById('btnLogoutNav')
        .addEventListener('click', handleLogout);

    // ── CLOSE MODALS ──────────────────────────────────────────
    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const modal = document.getElementById(btn.getAttribute('data-close'));
            if (modal) modal.style.display = 'none';
        });
    });

    // Close modal on backdrop click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', e => {
            if (e.target === modal) modal.style.display = 'none';
        });
    });

    // ── MODAL TRIGGERS ────────────────────────────────────────
    document.getElementById('btnBhwRegisterDonor')
        .addEventListener('click', () => {
            document.getElementById('formBhwRegisterDonor').reset();
            clearAllValidations('formBhwRegisterDonor');
            document.getElementById('bhwDonorRegisterModal').style.display = 'flex';
        });

    document.getElementById('btnReqModuleAdd')
        .addEventListener('click', () => {
            document.getElementById('formEmergencyRequest').reset();
            clearAllValidations('formEmergencyRequest');
            document.getElementById('reqDate').value =
                new Date().toISOString().split('T')[0];
            document.getElementById('requestModal').style.display = 'flex';
        });

    document.getElementById('btnDriveModuleAdd')
        .addEventListener('click', () => {
            document.getElementById('formBloodDrive').reset();
            clearAllValidations('formBloodDrive');
            document.getElementById('driveModal').style.display = 'flex';
        });

    document.getElementById('btnEditDonorProfile')
        .addEventListener('click', openEditDonorProfile);

    document.getElementById('btnAdminCreateAccount')
        .addEventListener('click', () => {
            document.getElementById('formStaffRegister').reset();
            clearAllValidations('formStaffRegister');
            updatePasswordStrength('');
            toggleRoleFormFields();
            document.getElementById('staffRegisterModal').style.display = 'flex';
        });

    // ── FORM SUBMISSIONS ──────────────────────────────────────
    document.getElementById('formStaffRegister')
        .addEventListener('submit', handleStaffRegister);
    document.getElementById('formBhwRegisterDonor')
        .addEventListener('submit', handleBhwRegister);
    document.getElementById('formEmergencyRequest')
        .addEventListener('submit', handleEmergencyRequest);
    document.getElementById('formBloodDrive')
        .addEventListener('submit', handleBloodDrive);
    document.getElementById('formEditUser')
        .addEventListener('submit', handleEditUser);
    document.getElementById('formEditDonorProfile')
        .addEventListener('submit', handleEditDonorProfile);
    document.getElementById('formEditDrive')
        .addEventListener('submit', handleEditDrive);

    // Barangay filter for matched donors
    const barangayFilter = document.getElementById('filterSameBarangay');
    if (barangayFilter) {
        barangayFilter.addEventListener('change', renderMatchedDonorsTable);
    }

    // Role change in registration form
    const staffRegRole = document.getElementById('staffRegRole');
    if (staffRegRole) {
        staffRegRole.addEventListener('change', () => {
            toggleRoleFormFields();
            clearAllValidations('formStaffRegister');
        });
    }
}

// ── CLEAR ALL VALIDATIONS IN A FORM ──────────────────────────
function clearAllValidations(formId) {
    const form = document.getElementById(formId);
    if (!form) return;
    form.querySelectorAll('.invalid,.valid').forEach(el => {
        el.classList.remove('invalid', 'valid');
    });
    form.querySelectorAll('small.dyn-error').forEach(e => e.remove());
}

// ══════════════════════════════════════════════════════════════
// LOGIN
// ══════════════════════════════════════════════════════════════
async function handleLogin(e) {
    e.preventDefault();

    const uInput = document.getElementById('initialLoginUsername');
    const pInput = document.getElementById('initialLoginPassword');

    if (!uInput || !pInput) {
        showLoginError('Page error: login fields not found. Please refresh.');
        return;
    }

    hideLoginError();
    clearValidation(uInput);
    clearValidation(pInput);

    const username = uInput.value.trim();
    const password = pInput.value;

    if (!username && !password) {
        showLoginError('All fields are required.');
        uInput.classList.add('invalid');
        pInput.classList.add('invalid');
        uInput.focus();
        return;
    }
    if (!username) {
        showLoginError('Username is required.');
        uInput.classList.add('invalid');
        uInput.focus();
        return;
    }
    if (!password) {
        showLoginError('Password is required.');
        pInput.classList.add('invalid');
        pInput.focus();
        return;
    }

    const btn = document.getElementById('btnLoginSubmit');
    btn.disabled  = true;
    btn.innerHTML = `<svg class="icon" viewBox="0 0 24 24" width="16" height="16"
        stroke="white"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83
        M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
        Logging in...`;

    const res = await apiPost('auth.php?action=login', {
        username: username,
        password: password
    });

    btn.disabled  = false;
    btn.innerHTML = `<svg class="icon" viewBox="0 0 24 24" width="16" height="16"
        stroke="white"><path d="M9 6.5 15 12l-6 5.5"/></svg> Log In`;

    if (!res || !res.success) {
        showLoginError(res?.message || 'Invalid username or password. Please try again.');
        pInput.classList.add('invalid');
        pInput.value = '';
        pInput.focus();
        return;
    }

    // ── FIX: Store ROLES_RoleID as-is (number from DB).
    // All role checks throughout the file use == loose equality,
    // so whether it arrives as number 1 or string "1" both work.
    session.UserID       = res.data.UserID;
    session.Username     = res.data.Username;
    session.ROLES_RoleID = res.data.ROLES_RoleID;   // no String() cast
    session.entityData   = res.data.entityData;

    if (session.ROLES_RoleID == 1) {
        session.admin_id = res.data.entityData?.admin_id || null;
    }
    if (session.ROLES_RoleID == 2) {
        session.Hospital_id      = res.data.entityData?.Hospital_id || null;
        session.hospital_user_id = res.data.UserID;
    }
    if (session.ROLES_RoleID == 4) {
        session.donor_id           = res.data.entityData?.donor_id || null;
        session.USERS_UserID_donor = res.data.UserID;
    }

    uInput.value = '';
    pInput.value = '';
    clearValidation(uInput);
    clearValidation(pInput);
    hideLoginError();

    document.getElementById('loginViewSection').style.display  = 'none';
    document.getElementById('mainDashboardView').style.display = 'block';
    renderHeaderAndMenu();
    switchView('viewHome');
}

// ── LOGOUT ────────────────────────────────────────────────────
function handleLogout() {
    Object.keys(session).forEach(k => session[k] = null);
    document.getElementById('mainDashboardView').style.display = 'none';
    document.getElementById('loginViewSection').style.display  = 'flex';
    document.getElementById('initialLoginForm').reset();
    clearAllValidations('initialLoginForm');
    hideLoginError();
}

// ══════════════════════════════════════════════════════════════
// TOGGLE ROLE FORM FIELDS
// ══════════════════════════════════════════════════════════════
function toggleRoleFormFields() {
    const groups = [
        'choFieldsGroup','hospitalFieldsGroup',
        'bhwFieldsGroup','donorFieldsGroup'
    ];
    groups.forEach(id => {
        const group = document.getElementById(id);
        if (group) {
            group.style.display = 'none';
            group.querySelectorAll('input,select').forEach(f => {
                f.required = false;
                clearValidation(f);
            });
        }
    });

    const role = document.getElementById('staffRegRole')?.value;
    if (!role) return;

    const map = {
        "1": "choFieldsGroup",
        "2": "hospitalFieldsGroup",
        "3": "bhwFieldsGroup",
        "4": "donorFieldsGroup"
    };

    if (map[role]) {
        const group = document.getElementById(map[role]);
        if (!group) return;
        group.style.display = 'block';
        group.querySelectorAll('input,select').forEach(f => {
            if (f.id === 'selfDonorMidName') return;
            f.required = true;
        });
    }
}

// ══════════════════════════════════════════════════════════════
// HEADER & SIDEBAR
// ══════════════════════════════════════════════════════════════
function renderHeaderAndMenu() {
    const roleBadge  = document.getElementById('roleBadge');
    const welcomeMsg = document.getElementById('welcomeUserMsg');
    const sidebar    = document.getElementById('sidebarMenu');
    sidebar.innerHTML = '';

    let roleName = '', badgeClass = '';

    const addMenuItem = (iconKey, label, viewId) => {
        const li = document.createElement('li');
        li.innerHTML      = `${ICONS[iconKey] || ''}<span>${label}</span>`;
        li.dataset.viewId = viewId;
        li.onclick = () => {
            switchView(viewId);
            sidebar.querySelectorAll('li').forEach(i => i.classList.remove('active'));
            li.classList.add('active');
        };
        sidebar.appendChild(li);
    };

    addMenuItem('home', 'Dashboard Home', 'viewHome');

    // ── FIX: all role checks use == loose equality ────────────
    if (session.ROLES_RoleID == 1) {
        roleName = 'CHO Admin'; badgeClass = 'role-admin';
        addMenuItem('donors',   'Verify Donor Records',    'viewDonors');
        addMenuItem('requests', 'View Emergency Requests', 'viewRequests');
        addMenuItem('matched',  'Matched Donors List',     'viewMatchedDonors');
        addMenuItem('drives',   'Manage Blood Drives',     'viewDrives');
        addMenuItem('users',    'Manage User Accounts',    'viewUsers');
        addMenuItem('bell',     'Manage Notifications',    'viewManageNotifications');
        addMenuItem('reports',  'Generate Reports',        'viewReports');
    } else if (session.ROLES_RoleID == 2) {
        roleName = 'Hospital Staff'; badgeClass = 'role-hospital';
        addMenuItem('requests', 'Emergency Requests',       'viewRequests');
        addMenuItem('matched',  'Matched Qualified Donors', 'viewMatchedDonors');
    } else if (session.ROLES_RoleID == 3) {
        roleName = 'BHW'; badgeClass = 'role-bhw';
        addMenuItem('donors',  'Donor Status & Register',  'viewDonors');
        addMenuItem('matched', 'View Qualified Donor List', 'viewMatchedDonors');
        addMenuItem('drives',  'Blood Drive Schedule',      'viewDrives');
    } else if (session.ROLES_RoleID == 4) {
        roleName = 'Volunteer Donor'; badgeClass = 'role-donor';
        addMenuItem('profile', 'My Profile & Alerts',  'viewMyProfile');
        addMenuItem('drives',  'Blood Drive Schedule', 'viewDrives');
    }

    sidebar.querySelector('li')?.classList.add('active');
    roleBadge.className  = `badge badge-role ${badgeClass}`;
    roleBadge.innerText  = roleName;
    welcomeMsg.innerText = `Logged in: ${session.Username}`;
}

function switchView(viewId) {
    document.querySelectorAll('.module-view').forEach(v => v.style.display = 'none');
    const view = document.getElementById(viewId);
    if (view) view.style.display = 'block';

    if (viewId === 'viewDonors')              renderDonorsTable();
    if (viewId === 'viewRequests')            renderRequestsTable();
    if (viewId === 'viewMatchedDonors')       renderMatchedDonorsTable();
    if (viewId === 'viewDrives')              renderDrivesTable();
    if (viewId === 'viewUsers')               renderUsersTable();
    if (viewId === 'viewMyProfile')           renderMyProfile();
    if (viewId === 'viewManageNotifications') renderManageNotifications();

    const bhwBtn   = document.getElementById('btnBhwRegisterDonor');
    const reqBtn   = document.getElementById('btnReqModuleAdd');
    const driveBtn = document.getElementById('btnDriveModuleAdd');

    // ── FIX: all role checks use == loose equality ────────────
    if (bhwBtn)   bhwBtn.style.display   =
        session.ROLES_RoleID == 3 ? 'inline-flex' : 'none';
    if (reqBtn)   reqBtn.style.display   =
        session.ROLES_RoleID == 2 ? 'inline-flex' : 'none';
    if (driveBtn) driveBtn.style.display =
        (session.ROLES_RoleID == 1 || session.ROLES_RoleID == 3)
            ? 'inline-flex' : 'none';
}

// ══════════════════════════════════════════════════════════════
// REGISTER ACCOUNT (Staff / Admin / Donor via modal)
// ══════════════════════════════════════════════════════════════
async function handleStaffRegister(e) {
    e.preventDefault();

    const roleVal   = document.getElementById('staffRegRole').value;
    const userInput = document.getElementById('staffRegUser');
    const passInput = document.getElementById('staffRegPass');
    const confInput = document.getElementById('staffRegPassConfirm');

    let valid = true;
    if (!validateUsernameField(userInput))                            valid = false;
    if (!validatePasswordField(passInput))                            valid = false;
    if (confInput && !validatePasswordConfirm(passInput, confInput)) valid = false;

    if (roleVal === '1') {
        if (!validateNameField(document.getElementById('choFirName'), 'First Name')) valid = false;
        if (!validateNameField(document.getElementById('choLstName'), 'Last Name'))  valid = false;
    }

    if (roleVal === '2') {
        if (!validateRequired(document.getElementById('hospName'), 'Hospital Name')) valid = false;
        if (!validatePhoneField(document.getElementById('hospCttNumber')))            valid = false;
    }

    if (roleVal === '3') {
        if (!validateNameField(document.getElementById('bhwFirName'), 'First Name')) valid = false;
        if (!validateNameField(document.getElementById('bhwLstName'), 'Last Name'))  valid = false;
        if (!validatePhoneField(document.getElementById('bhwCttNumber')))             valid = false;
    }

    if (roleVal === '4') {
        const fir   = document.getElementById('selfDonorFirName');
        const mid   = document.getElementById('selfDonorMidName');
        const lst   = document.getElementById('selfDonorLstName');
        const bth   = document.getElementById('selfDonorBth');
        const phone = document.getElementById('selfDonorPhone');
        const email = document.getElementById('selfDonorEmail');

        if (!validateNameField(fir, 'First Name'))                      valid = false;
        if (mid.value && !validateNameField(mid, 'Middle Name', false)) valid = false;
        if (!validateNameField(lst, 'Last Name'))                       valid = false;
        if (!validateAgeField(bth, 17))                                 valid = false;
        if (!validatePhoneField(phone))                                 valid = false;
        if (email.value && !validateEmailField(email, false))           valid = false;
    }

    if (!valid) return;

    const payload = {
        role_id:  parseInt(roleVal),
        username: userInput.value.trim(),
        password: passInput.value
    };

    if (roleVal === '1') {
        payload.FIR_name = document.getElementById('choFirName').value.trim();
        payload.LST_name = document.getElementById('choLstName').value.trim();
    } else if (roleVal === '2') {
        payload.Hospital_name       = document.getElementById('hospName').value.trim();
        payload.ADD_col             = document.getElementById('hospAdd').value.trim();
        payload.CTT_number          = document.getElementById('hospCttNumber').value.trim();
        payload.BARANGAY_BarangayID = parseInt(document.getElementById('hospBarangayId').value);
    } else if (roleVal === '3') {
        payload.FIR_name            = document.getElementById('bhwFirName').value.trim();
        payload.LST_name            = document.getElementById('bhwLstName').value.trim();
        payload.CTT_number          = document.getElementById('bhwCttNumber').value.trim();
        payload.BARANGAY_BarangayID = parseInt(document.getElementById('bhwBarangayId').value);
    } else if (roleVal === '4') {
        payload.FIR_name               = document.getElementById('selfDonorFirName').value.trim();
        payload.MID_NAME               = document.getElementById('selfDonorMidName').value.trim();
        payload.LST_name               = document.getElementById('selfDonorLstName').value.trim();
        payload.SEX                    = document.getElementById('selfDonorSex').value;
        payload.BTH_DTE                = document.getElementById('selfDonorBth').value;
        payload.phone_number           = document.getElementById('selfDonorPhone').value.trim();
        payload.email                  = document.getElementById('selfDonorEmail').value.trim();
        payload.ADD_col                = document.getElementById('selfDonorAdd').value.trim();
        payload.BARANGAY_BarangayID    = parseInt(document.getElementById('selfDonorBarangay').value);
        payload.BLOOD_TYPE_BloodTypeID = parseInt(document.getElementById('selfDonorBloodType').value);
    }

    const btn = e.submitter || e.target.querySelector('[type=submit]');
    if (btn) { btn.disabled = true; btn.innerText = 'Registering...'; }
    payload.creator_user_id = session.UserID;

    const res = await apiPost('auth.php?action=register', payload);

    if (btn) { btn.disabled = false; btn.innerText = 'Register Account'; }

    if (!res.success) {
        alert(`Registration failed: ${res.message}`);
        return;
    }

    alert(`✅ Account created successfully for "${userInput.value.trim()}"!\nYou can now log in with your username and password.`);
    document.getElementById('staffRegisterModal').style.display = 'none';
    document.getElementById('formStaffRegister').reset();
    updatePasswordStrength('');
    toggleRoleFormFields();

    // ── FIX: use == loose equality ────────────────────────────
    if (session.ROLES_RoleID == 1) renderUsersTable();
}

// ══════════════════════════════════════════════════════════════
// BHW ASSISTED DONOR REGISTRATION
// ══════════════════════════════════════════════════════════════
async function handleBhwRegister(e) {
    e.preventDefault();

    const fir   = document.getElementById('regFirstName');
    const mid   = document.getElementById('regMiddleName');
    const lst   = document.getElementById('regLastName');
    const bth   = document.getElementById('regBirthDate');
    const phone = document.getElementById('regPhone');
    const email = document.getElementById('regEmail');
    const uname = document.getElementById('regDonorUsername');
    const pass  = document.getElementById('regDonorPassword');

    let valid = true;
    if (!validateNameField(fir, 'First Name'))                      valid = false;
    if (mid.value && !validateNameField(mid, 'Middle Name', false)) valid = false;
    if (!validateNameField(lst, 'Last Name'))                       valid = false;
    if (!validateAgeField(bth, 17))                                 valid = false;
    if (!validatePhoneField(phone))                                 valid = false;
    if (email.value && !validateEmailField(email, false))           valid = false;
    if (!validateUsernameField(uname))                              valid = false;
    if (!pass.value.trim()) {
    showValidationError(pass, 'Temporary password is required.');
    valid = false;
} else {
    showValidationSuccess(pass);
}

    if (!valid) return;

    const payload = {
  FIR_name: fir.value.trim(),
  MID_NAME: mid.value.trim(),
  LST_name: lst.value.trim(),
  SEX: document.getElementById('regSex').value,
  BTH_DTE: bth.value,
  phone_number: phone.value.trim(),
  email: email.value.trim(),
  ADD_col: document.getElementById('regAdd').value.trim(),
  BARANGAY_BarangayID: parseInt(document.getElementById('regBarangay').value),
  BLOOD_TYPE_BloodTypeID: parseInt(document.getElementById('regBloodType').value),
  username: uname.value.trim(),
  password: pass.value,

  // IMPORTANT:
  creator_user_id: session.UserID
};

    const btn = e.submitter;
    if (btn) { btn.disabled = true; btn.innerText = 'Registering...'; }

    const res = await apiPost('donors.php?action=bhw_register', payload);
    console.log('BHW submit debug', {
  userId: session.UserID,
  role: session.ROLES_RoleID,
  payload
});

    if (btn) { btn.disabled = false; btn.innerText = 'Submit Donor Registration'; }

    if (!res.success) {
        alert(`Registration failed: ${res.message}`);
        return;
    }

    alert(`✅ Donor "${fir.value.trim()} ${lst.value.trim()}" registered successfully!\nStatus: Pending Verification by City Health Office Admin.\nThe donor can log in using the assigned username and password.`);
    document.getElementById('bhwDonorRegisterModal').style.display = 'none';
    document.getElementById('formBhwRegisterDonor').reset();
    clearAllValidations('formBhwRegisterDonor');
    renderDonorsTable();
}

// ══════════════════════════════════════════════════════════════
// DONORS TABLE
// ══════════════════════════════════════════════════════════════
async function renderDonorsTable() {
    const tbody = document.getElementById('donorTableBody');
    tbody.innerHTML = loadingRow(11);

    const res = await apiGet('donors.php');
    if (!res.success) {
        tbody.innerHTML = emptyRow(11, res.message);
        return;
    }

    const donors = res.data;
    if (!donors || !donors.length) {
        tbody.innerHTML = emptyRow(11, 'No donor records found.');
        return;
    }

    tbody.innerHTML = donors.map(d => {
        const btLabel  = d.BloodTypeName || bloodTypeMap[d.BLOOD_TYPE_BloodTypeID] || '-';
        const brLabel  = d.BarangayName  || barangayMap[d.BARANGAY_BarangayID]     || '-';
        const fullAddr = (d.ADD_col ? d.ADD_col + ', ' : '') + brLabel;

        // Normalize status
        const rawStatus = String(d.verificationStatus || 'Pending').trim();
        const statusNorm = rawStatus.toLowerCase();

        const verificationStatus =
            statusNorm === 'verified' ? 'Verified' :
            statusNorm === 'rejected' ? 'Rejected' : 'Pending';

        let actionBtn = '';

        const role = session.ROLES_RoleID;

        if (role == 1 && verificationStatus === 'Pending') {
            actionBtn = `<button onclick="verifyDonor(${d.donor_id})"
                class="btn-icon-sm btn-verify">
                <svg class="icon" viewBox="0 0 24 24" width="13" height="13" stroke="white">
                    <path d="M4.5 12.5 9.5 17.5 19.5 6.5"/></svg>
                Verify Donor</button>`;

        } else if (role == 1 && verificationStatus === 'Verified') {
            actionBtn = `<span class="status-pill verified">✓ Verified</span>
                <button onclick="rejectDonor(${d.donor_id})"
                class="btn-icon-sm btn-decline"
                style="margin-left:4px;font-size:0.68rem;padding:4px 8px;">
                <svg class="icon" viewBox="0 0 24 24" width="11" height="11" stroke="white">
                    <path d="M6 6l12 12M18 6 6 18"/></svg>
                Reject</button>`;

        } else if (role == 1 && verificationStatus === 'Rejected') {
            actionBtn = `<span class="status-pill inactive">Rejected</span>
                <button onclick="verifyDonor(${d.donor_id})"
                class="btn-icon-sm btn-verify"
                style="margin-left:4px;font-size:0.68rem;padding:4px 8px;">
                Re-verify</button>`;

        } else {
            const cls = verificationStatus === 'Verified' ? 'verified'
                      : verificationStatus === 'Rejected'  ? 'inactive'
                      : 'pending';
            actionBtn = `<span class="status-pill ${cls}">
                ${escapeHtml(rawStatus)}</span>`;
        }

        const vCls = verificationStatus === 'Verified' ? 'role-donor'
                   : verificationStatus === 'Rejected'  ? 'role-hospital'
                   : 'role-bhw';

        return `<tr>
            <td>${d.donor_id}</td>
            <td>${escapeHtml(d.FIR_name)}</td>
            <td>${escapeHtml(d.LST_name)}</td>
            <td>${escapeHtml(d.SEX)}</td>
            <td>${escapeHtml(d.phone_number)}</td>
            <td>${escapeHtml(d.email || '-')}</td>
            <td>${escapeHtml(fullAddr)}</td>
            <td><span class="blood-type-tag">${escapeHtml(btLabel)}</span></td>
            <td><span class="badge ${vCls}">${escapeHtml(rawStatus)}</span></td>
            <td>${escapeHtml(d.AVB_STU)}</td>
            <td>${actionBtn}</td>
        </tr>`;
    }).join('');
}

// ── VERIFY DONOR ──────────────────────────────────────────────
async function verifyDonor(donor_id) {
    if (!(await window.appConfirm(`Verify Donor ID #${donor_id}?\nThis will mark them as Verified and allow matching.`))) return;

    const res = await apiPut('donors.php?action=verify', {
        donor_id:           donor_id,
        verificationStatus: 'Verified',
        admin_id:           session.admin_id
    });

    if (!res.success) { alert(res.message); return; }
    alert(`✅ Donor ID #${donor_id} has been verified successfully!`);
    renderDonorsTable();
}

// ── REJECT DONOR ──────────────────────────────────────────────
async function rejectDonor(donor_id) {
    if (!(await window.appConfirm(`Reject Donor ID #${donor_id}?\nThis will mark them as Rejected.`))) return;

    const res = await apiPut('donors.php?action=verify', {
        donor_id:           donor_id,
        verificationStatus: 'Rejected',
        admin_id:           session.admin_id
    });

    if (!res.success) { alert(res.message); return; }
    alert(`Donor ID #${donor_id} has been marked as Rejected.`);
    renderDonorsTable();
}

// ══════════════════════════════════════════════════════════════
// EMERGENCY BLOOD REQUEST
// ══════════════════════════════════════════════════════════════
async function handleEmergencyRequest(e) {
    e.preventDefault();

    const patient   = document.getElementById('reqPatient');
    const qty       = document.getElementById('reqQty');
    const dateEl    = document.getElementById('reqDate');
    const bloodType = document.getElementById('reqBloodType');

    let valid = true;
    if (!validateRequired(patient, 'Patient Name')) valid = false;

    if (!qty.value || parseInt(qty.value) < 1) {
        showValidationError(qty, 'Quantity must be at least 1 blood bag.');
        valid = false;
    } else {
        showValidationSuccess(qty);
    }

    const today = new Date().toISOString().split('T')[0];
    if (!dateEl.value) {
        showValidationError(dateEl, 'Request date is required.');
        valid = false;
    } else if (dateEl.value < today) {
        showValidationError(dateEl, 'Request date cannot be in the past.');
        valid = false;
    } else {
        showValidationSuccess(dateEl);
    }

    if (!valid) return;

    const bloodTypeId = bloodType.value;
    const payload = {
        patient_name:             patient.value.trim(),
        QTY_NDD:                  parseInt(qty.value),
        REQ_DTE:                  dateEl.value,
        BLOOD_TYPE_BloodTypeID:   parseInt(bloodTypeId),
        BloodTypeName:            bloodTypeMap[bloodTypeId],
        Hospital_STF_Hospital_id: session.Hospital_id,
        hospital_user_id:         session.hospital_user_id
    };

    const btn = e.submitter;
    if (btn) { btn.disabled = true; btn.innerText = 'Searching...'; }

    const res = await apiPost('requests.php', payload);

    if (btn) { btn.disabled = false; btn.innerText = 'Search Matching Donors'; }

    if (!res.success) { alert(res.message); return; }

    session.latestRequestBloodTypeId = bloodTypeId;
    session.latestRequestBarangayId  = session.entityData?.BARANGAY_BarangayID
                                       ? String(session.entityData.BARANGAY_BarangayID)
                                       : null;
    session.latestRequestREQid       = res.data.REQ_id;

    const qc     = res.data.qualified_count;
    const brNote = session.latestRequestBarangayId
                   ? ` near ${barangayMap[session.latestRequestBarangayId]}` : '';

    if (qc === 0) {
        alert(`⚠️ NO MATCH FOUND\n\nNo qualified donors available for Blood Type ${bloodTypeMap[bloodTypeId]}${brNote}.\n\nRequest #${res.data.REQ_id} has been logged as "No Match Found".`);
    } else {
        alert(`✅ REQUEST SUBMITTED\n\nSystem found ${qc} qualified donor(s) for Blood Type: ${bloodTypeMap[bloodTypeId]}${brNote}.\n\nRequest ID: #${res.data.REQ_id}\n\nProceed to "Matched Qualified Donors" to dispatch alerts.`);
    }

    document.getElementById('requestModal').style.display = 'none';
    document.getElementById('formEmergencyRequest').reset();
    clearAllValidations('formEmergencyRequest');
    switchView('viewMatchedDonors');
}

// ══════════════════════════════════════════════════════════════
// REQUESTS TABLE
// ══════════════════════════════════════════════════════════════
async function renderRequestsTable() {
    const tbody     = document.getElementById('requestTableBody');
    const container = document.getElementById('viewRequests');
    tbody.innerHTML = loadingRow(8);

    // ── FIX: use == loose equality ────────────────────────────
    if (session.ROLES_RoleID == 2) {
        const nr = await apiGet(`notifications.php?user_id=${session.UserID}`);
        let hospNotifHTML = '';
        if (nr.success && nr.data && nr.data.length) {
    hospNotifHTML = `
        <div style="margin-bottom:10px;display:flex;justify-content:flex-end;">
            <button onclick="clearHospitalNotifications()"
                class="btn-icon-sm btn-decline">
                <svg class="icon" viewBox="0 0 24 24" width="13" height="13" stroke="white">
                    <path d="M6 6l12 12M18 6 6 18"/></svg>
                Clear All Notifications
            </button>
        </div>
        <div style="margin-bottom:20px;display:flex;flex-direction:column;gap:8px;">
            ${nr.data.map(n => {
                const isNoMatch = n.Message.includes('No qualified');
                return isNoMatch
                    ? `<div class="notice notice-warning">
                           <svg class="icon" viewBox="0 0 24 24">
                               <path d="M12 3.5 2 20.5h20L12 3.5Z"/>
                               <path d="M12 10v4.2M12 17.2h.01"/></svg>
                           <div><strong>NO MATCH ALERT:</strong>
                           ${escapeHtml(n.Message)}
                           <small>Date: ${n.SentDate}</small></div>
                       </div>`
                    : `<div class="notice notice-success">
                           <svg class="icon" viewBox="0 0 24 24">
                               <path d="M4.5 12.5 9.5 17.5 19.5 6.5"/></svg>
                           <div><strong>MATCH CONFIRMED:</strong>
                           ${escapeHtml(n.Message)}
                           <small>Date: ${n.SentDate}</small></div>
                       </div>`;
            }).join('')}
        </div>`;
}
        let box = document.getElementById('hospNotifBox');
        if (!box) {
            box    = document.createElement('div');
            box.id = 'hospNotifBox';
            container.insertBefore(box, container.firstChild);
        }
        box.innerHTML = hospNotifHTML;
    }

    const url = session.ROLES_RoleID == 2
        ? `requests.php?hospital_id=${session.Hospital_id}`
        : 'requests.php';

    const res = await apiGet(url);

    if (!res.success || !res.data || !res.data.length) {
        tbody.innerHTML = emptyRow(8, 'No emergency requests found.');
    } else {
        tbody.innerHTML = res.data.map(r => {
            const statusClass = r.REQ_STU === 'No Match Found'  ? 'role-bhw'
                              : r.REQ_STU === 'Fulfilled'        ? 'role-donor'
                              : r.REQ_STU === 'Matching Active'  ? 'role-admin'
                              : 'role-hospital';
            return `<tr>
                <td>${r.REQ_id}</td>
                <td>${escapeHtml(r.patient_name)}</td>
                <td>${r.Hospital_STF_Hospital_id ?? '-'}</td>
                <td><span class="blood-type-tag">${escapeHtml(r.BloodTypeName || '-')}</span></td>
                <td>${escapeHtml(r.hospital_barangay || 'Unknown')}</td>
                <td>${r.QTY_NDD} Bag(s)</td>
                <td>${r.REQ_DTE}</td>
                <td><span class="badge ${statusClass}">${escapeHtml(r.REQ_STU)}</span></td>
            </tr>`;
        }).join('');
    }

    const donationCard = document.getElementById('donationConfirmCard');
    const pendingBody  = document.getElementById('pendingDonationsBody');

    if (donationCard && pendingBody) {
        // ── FIX: use == loose equality ────────────────────────
        if (session.ROLES_RoleID == 2) {
            donationCard.style.display = 'block';
            const dr      = await apiGet(`donations.php?hospital_id=${session.Hospital_id}`);
            const pending = (dr.success && dr.data)
                ? dr.data.filter(d => d.status === 'Pending Confirmation')
                : [];

            if (!pending.length) {
                pendingBody.innerHTML = emptyRow(7, 'No donations awaiting confirmation.');
            } else {
                pendingBody.innerHTML = pending.map(dn => `<tr>
                    <td>${dn.donation_id}</td>
                    <td>${escapeHtml(dn.donor_name)}</td>
                    <td><span class="blood-type-tag">${escapeHtml(dn.BloodTypeName || '-')}</span></td>
                    <td>${dn.REQ_id || '-'}</td>
                    <td>${dn.don_date}</td>
                    <td><span class="status-pill pending">${escapeHtml(dn.status)}</span></td>
                    <td>
                        <button onclick="confirmDonation(${dn.donation_id})"
                            class="btn-icon-sm btn-confirm">
                            <svg class="icon" viewBox="0 0 24 24"
                                 width="13" height="13" stroke="white">
                                <path d="M4.5 12.5 9.5 17.5 19.5 6.5"/></svg>
                            Confirm Donation</button>
                    </td>
                </tr>`).join('');
            }
        } else {
            donationCard.style.display = 'none';
        }
    }
}

// ══════════════════════════════════════════════════════════════
// MATCHED DONORS ENGINE
// ══════════════════════════════════════════════════════════════
async function renderMatchedDonorsTable() {
    const tbody          = document.getElementById('matchedDonorTableBody');
    const tag            = document.getElementById('matchedFilterTag');
    const barangayFilter = document.getElementById('filterSameBarangay');
    tbody.innerHTML      = loadingRow(8);

    // ── FIX: Auto-load latest REQ_id if not set in session ───
    if (!session.latestRequestREQid && session.ROLES_RoleID == 2) {
        const rr = await apiGet(`requests.php?hospital_id=${session.Hospital_id}`);
        if (rr.success && rr.data && rr.data.length) {
            // Get the most recent active request
            const active = rr.data.find(r => r.REQ_STU === 'Matching Active') || rr.data[0];
            if (active) {
                session.latestRequestREQid       = active.REQ_id;
                session.latestRequestBloodTypeId = String(active.BLOOD_TYPE_BloodTypeID);
                session.latestRequestBarangayId  = active.hospital_barangay_id
                    ? String(active.hospital_barangay_id) : null;
            }
        }
    }

    const btid   = session.latestRequestBloodTypeId;
    const brid   = session.latestRequestBarangayId;
    const useBar = barangayFilter?.checked && brid;

    let tagText = 'All Verified & Available Donors';
    let url     = 'donors.php?action=match';

    if (btid) {
        url     += `&blood_type_id=${btid}`;
        tagText  = `Blood Type: ${bloodTypeMap[btid]}`;
    }
    if (useBar) {
        url     += `&barangay_id=${brid}`;
        tagText += ` · Barangay: ${barangayMap[brid]}`;
    } else if (brid) {
        tagText += ` · Hospital Barangay: ${barangayMap[brid]}`;
    }

    if (tag) tag.innerText = tagText;

    const res = await apiGet(url);
    if (!res.success || !res.data || !res.data.length) {
        tbody.innerHTML = emptyRow(8,
            'No matched donors found. Donors must be Verified by CHO Admin and set to Available.');
        return;
    }

    tbody.innerHTML = res.data.map(d => {
        let actionBtn = '';
        if (session.ROLES_RoleID == 2) {
            actionBtn = `<button onclick="sendNotificationToDonor(${d.donor_id},
                ${d.USERS_UserID || 'null'},
                '${escapeHtml(d.FIR_name)}')"
                class="btn-icon-sm btn-dispatch">
                <svg class="icon" viewBox="0 0 24 24" width="13" height="13" stroke="white">
                    <path d="M21 5 10.5 15.5M21 5l-7 16-3.5-7.5L3 10.5 21 5Z"/></svg>
                Dispatch Alert</button>`;
        } else {
            actionBtn = `<span class="status-pill verified">Qualified</span>`;
        }

        const btLabel = d.BloodTypeName || bloodTypeMap[d.BLOOD_TYPE_BloodTypeID] || '-';
        const brLabel = d.BarangayName  || barangayMap[d.BARANGAY_BarangayID]     || '-';

        return `<tr>
            <td>${d.donor_id}</td>
            <td>${escapeHtml(d.FIR_name)} ${escapeHtml(d.LST_name)}</td>
            <td>${escapeHtml(d.SEX)}</td>
            <td><span class="blood-type-tag">${escapeHtml(btLabel)}</span></td>
            <td>${escapeHtml(brLabel)}</td>
            <td>${escapeHtml(d.phone_number)}</td>
            <td>${escapeHtml(d.AVB_STU)}</td>
            <td>${actionBtn}</td>
        </tr>`;
    }).join('');
}

// ── DISPATCH ALERT ────────────────────────────────────────────
async function sendNotificationToDonor(donorId, donorUserId, donorName) {
    // ── FIX: Better null check for REQ_id ────────────────────
    if (!session.latestRequestREQid) {
        if (!(await window.appConfirm(`No active request selected.\n\nDo you want to dispatch an alert to ${donorName} anyway?\n\nNote: You should submit an Emergency Request first so the system can track this properly.`))) return;
    } else {
        if (!(await window.appConfirm(`Send emergency alert to donor: ${donorName}?`))) return;
    }

    if (!donorUserId || donorUserId === 'null') {
        alert('This donor does not have a linked user account and cannot receive notifications.');
        return;
    }

    const btName = bloodTypeMap[session.latestRequestBloodTypeId] || 'Unknown';
const reqId  = session.latestRequestREQid || 0;
const hospitalName = session.entityData?.Hospital_name || 'Hospital Staff';
const hospitalContact = session.entityData?.CTT_number || 'N/A';

const donorSmsMessage =
    `FOR SCHOOL DEMO ONLY - PULSELINK ALERT: A patient urgently needs ${btName} blood (Request #${reqId}). ` +
    `Open your PulseLink portal/account to ACCEPT or DECLINE. You may also call/text ${hospitalName} at ${hospitalContact}.`;

const res = await apiPut('notifications.php?action=dispatch', {
    Message:       donorSmsMessage,
    donor_user_id: donorUserId,
    REQ_id:        reqId,
    donor_id:      donorId
});

    if (!res.success) { alert(res.message); return; }
    alert(`✅ Emergency notification sent to donor: ${donorName}!\nThey will see it in their portal.`);
}
// ══════════════════════════════════════════════════════════════
// MY PROFILE (Donor Portal)
// ══════════════════════════════════════════════════════════════
async function renderMyProfile() {
    const notifCont   = document.getElementById('donorNotificationsContainer');
    const profileCont = document.getElementById('myProfileContent');

    const nr     = await apiGet(`notifications.php?user_id=${session.UserID}`);
    const notifs = (nr.success && nr.data) ? nr.data : [];

    if (!notifs.length) {
        notifCont.innerHTML = `<p style="color:var(--ink-faint);">
            No pending emergency blood requests right now.
            You will be notified here if matched.</p>`;
    } else {
        notifCont.innerHTML = notifs.map(n => `
            <div class="notice notice-warning"
                 style="flex-direction:column;align-items:stretch;margin-bottom:12px;">
                <div style="display:flex;gap:10px;align-items:flex-start;">
                    <svg class="icon" viewBox="0 0 24 24">
                        <path d="M12 3.5 2 20.5h20L12 3.5Z"/>
                        <path d="M12 10v4.2M12 17.2h.01"/></svg>
                    <div>
                        <strong>🚨 Emergency Alert — Notification #${n.NotificationID}</strong>
                        <p style="margin-top:4px;">${escapeHtml(n.Message)}</p>
                        <p style="margin-top:6px;font-size:0.82rem;">
                            <strong>Sent:</strong> ${n.SentDate}</p>
                    </div>
                </div>
                <div style="margin-top:12px;display:flex;gap:10px;">
                    <button onclick="respondToRequest(${n.NotificationID},
                        ${n.linked_req_id || 'null'}, 'Accepted')"
                        class="btn-icon-sm btn-accept">
                        <svg class="icon" viewBox="0 0 24 24" width="13" height="13" stroke="white">
                            <path d="M4.5 12.5 9.5 17.5 19.5 6.5"/></svg>
                        Accept Request</button>
                    <button onclick="respondToRequest(${n.NotificationID},
                        ${n.linked_req_id || 'null'}, 'Declined')"
                        class="btn-icon-sm btn-decline">
                        <svg class="icon" viewBox="0 0 24 24" width="13" height="13" stroke="white">
                            <path d="M6 6l12 12M18 6 6 18"/></svg>
                        Decline</button>
                </div>
            </div>
        `).join('');
    }

    const pr = session.entityData;
    if (!pr || !pr.donor_id) {
        profileCont.innerHTML = `<p style="color:var(--ink-faint);">
            No active donor record connected to this account.</p>`;
        return;
    }

    const statusCls = pr.verificationStatus === 'Verified' ? 'verified' : 'pending';
    const btLabel   = pr.BloodTypeName || bloodTypeMap[pr.BLOOD_TYPE_BloodTypeID] || '-';
    const brLabel   = pr.BarangayName  || barangayMap[pr.BARANGAY_BarangayID]     || '-';

    const drr   = await apiGet(`drives_par.php?donor_id=${pr.donor_id}`);
    const parts = (drr.success && drr.data) ? drr.data : [];

    let partHTML = `<p style="color:var(--ink-faint);margin-top:14px;font-size:0.85rem;">
        You haven't joined any blood drives yet.</p>`;

    if (parts.length) {
        partHTML = `<div style="margin-top:16px;display:flex;flex-direction:column;gap:8px;">
            ${parts.map(p => `
                <div class="profile-detail"
                     style="display:flex;justify-content:space-between;align-items:center;">
                    <span><strong>${escapeHtml(p.EVT_name)}</strong>
                          <span style="color:var(--ink-soft);font-size:0.82rem;">
                          — ${p.SHD} · ${escapeHtml(p.LOC)}</span></span>
                    <span class="status-pill verified">
                        ${escapeHtml(p.ParticipationStatus)}</span>
                </div>`).join('')}
        </div>`;
    }

    let availHTML = '';
  if (pr.AVB_STU === 'Reserved / Donating') {
    availHTML = `<span>${escapeHtml(pr.AVB_STU)}</span>
                 <span class="joined-tag" style="font-size:0.72rem;">Locked during active donation</span>`;
} else if (pr.AVB_STU === 'Cooldown') {
    availHTML = `<span>${escapeHtml(pr.AVB_STU)}</span>
                 <span class="joined-tag" style="font-size:0.72rem;">Locked until ${escapeHtml(pr.cooldown_until || '-')}</span>`;
} else {
    availHTML = `<span>${escapeHtml(pr.AVB_STU)}</span>
                 <button onclick="toggleDonorAvailability()"
                     class="btn-icon-sm ${pr.AVB_STU === 'Available' ? 'btn-toggle-off' : 'btn-toggle-on'}"
                     style="font-size:0.7rem;padding:5px 10px;">
                     ${pr.AVB_STU === 'Available' ? 'Mark Unavailable' : 'Mark Available'}
                 </button>`;
}
    profileCont.innerHTML = `
        <div class="profile-detail-grid">
            <div class="profile-detail">
                <div class="label">Donor ID</div>
                <div class="value">${pr.donor_id}</div>
            </div>
            <div class="profile-detail">
                <div class="label">Full Name</div>
                <div class="value">${escapeHtml(pr.FIR_name)}
                    ${pr.MID_NAME ? escapeHtml(pr.MID_NAME) + ' ' : ''}
                    ${escapeHtml(pr.LST_name)}</div>
            </div>
            <div class="profile-detail">
                <div class="label">Blood Type</div>
                <div class="value">
                    <span class="blood-type-tag">${escapeHtml(btLabel)}</span>
                </div>
            </div>
            <div class="profile-detail">
                <div class="label">Verification</div>
                <div class="value">
                    <span class="status-pill ${statusCls}">
                        ${escapeHtml(pr.verificationStatus)}</span>
                </div>
            </div>
            <div class="profile-detail">
                <div class="label">Availability</div>
                <div class="value"
                     style="display:flex;align-items:center;
                            justify-content:space-between;gap:8px;flex-wrap:wrap;">
                    ${availHTML}
                </div>
            </div>
            <div class="profile-detail">
                <div class="label">Address</div>
                <div class="value" style="font-size:0.85rem;">
                    ${escapeHtml(pr.ADD_col || '-')}
                </div>
            </div>
            <div class="profile-detail">
                <div class="label">Barangay</div>
                <div class="value">${escapeHtml(brLabel)}</div>
            </div>
            <div class="profile-detail">
                <div class="label">Contact</div>
                <div class="value" style="font-size:0.82rem;">
                    ${escapeHtml(pr.phone_number)}<br>
                    ${escapeHtml(pr.email || '-')}
                </div>
            </div>
        </div>
        <h4 style="margin-top:22px;font-size:0.82rem;color:var(--ink-soft);
                   text-transform:uppercase;letter-spacing:0.05em;">
            Blood Drive Participation History
        </h4>
        ${partHTML}
    `;
}

// ── OPEN EDIT DONOR PROFILE ───────────────────────────────────
async function openEditDonorProfile() {
    const pr = session.entityData;
    if (!pr?.donor_id) {
        alert('No active donor record connected to this account.');
        return;
    }

    document.getElementById('editProfileFirName').value  = pr.FIR_name      || '';
    document.getElementById('editProfileMidName').value  = pr.MID_NAME      || '';
    document.getElementById('editProfileLstName').value  = pr.LST_name      || '';
    document.getElementById('editProfilePhone').value    = pr.phone_number   || '';
    document.getElementById('editProfileEmail').value    = pr.email          || '';
    document.getElementById('editProfileAdd').value      = pr.ADD_col        || '';
    document.getElementById('editProfileBarangay').value = pr.BARANGAY_BarangayID || '1';
    document.getElementById('editProfileUsername').value = session.Username || '';

    clearAllValidations('formEditDonorProfile');
    document.getElementById('editDonorProfileModal').style.display = 'flex';
}

// ── SAVE DONOR PROFILE ────────────────────────────────────────
async function handleEditDonorProfile(e) {
    e.preventDefault();

    const pr = session.entityData;
    if (!pr) return;

    const fir   = document.getElementById('editProfileFirName');
    const mid   = document.getElementById('editProfileMidName');
    const lst   = document.getElementById('editProfileLstName');
    const phone = document.getElementById('editProfilePhone');
    const email = document.getElementById('editProfileEmail');
    const uname = document.getElementById('editProfileUsername');

    let valid = true;
    if (!validateNameField(fir, 'First Name'))                      valid = false;
    if (mid.value && !validateNameField(mid, 'Middle Name', false)) valid = false;
    if (!validateNameField(lst, 'Last Name'))                       valid = false;
    if (!validatePhoneField(phone))                                 valid = false;
    if (email.value && !validateEmailField(email, false))           valid = false;
    if (!validateUsernameField(uname)) valid = false;

    if (!valid) return;

    const payload = {
        donor_id:            pr.donor_id,
        Username: uname.value.trim(),
        FIR_name:            fir.value.trim(),
        MID_NAME:            mid.value.trim(),
        LST_name:            lst.value.trim(),
        phone_number:        phone.value.trim(),
        email:               email.value.trim(),
        ADD_col:             document.getElementById('editProfileAdd').value.trim(),
        BARANGAY_BarangayID: parseInt(document.getElementById('editProfileBarangay').value)
    };

    const res = await apiPut('donors.php?action=update_profile', payload);
    if (!res.success) { alert(res.message); return; }

    Object.assign(session.entityData, payload);
    session.entityData.BarangayName = barangayMap[payload.BARANGAY_BarangayID];

    session.Username = payload.Username;
const welcome = document.getElementById('welcomeUserMsg');
if (welcome) welcome.innerText = `Logged in: ${session.Username}`;

    alert('✅ Personal details updated successfully!');
    document.getElementById('editDonorProfileModal').style.display = 'none';
    renderMyProfile();
}

// ── TOGGLE DONOR AVAILABILITY ─────────────────────────────────
async function toggleDonorAvailability() {
    const pr = session.entityData;
    if (!pr) return;
    if (pr.AVB_STU === 'Cooldown') {
    const until = pr.cooldown_until ? ` until ${pr.cooldown_until}` : '';
    alert(`Your availability is locked during cooldown${until}.`);
    return;
}

  if (pr.AVB_STU === 'Reserved / Donating' || pr.AVB_STU === 'Cooldown') {
    alert('Your availability is locked while a donation or cooldown is active.');
    return;
}

    const newStatus = pr.AVB_STU === 'Available' ? 'Not Available' : 'Available';
    if (!(await window.appConfirm(`Change your availability to "${newStatus}"?`))) return;

    const res = await apiPut('donors.php?action=availability', {
        donor_id: pr.donor_id,
        AVB_STU:  newStatus
    });
    if (!res.success) { alert(res.message); return; }

    session.entityData.AVB_STU = newStatus;
    alert(`✅ Availability updated to: ${newStatus}`);
    renderMyProfile();
}

// ── RESPOND TO REQUEST ────────────────────────────────────────
async function respondToRequest(notifId, reqId, choice) {
    const pr = session.entityData;
    if (!pr) return;

    const confirmMsg = choice === 'Accepted'
        ? `Accept this emergency blood request?\n\nYour availability will be locked to "Reserved / Donating" until the donation is confirmed by the hospital.`
        : `Decline this emergency blood request?`;

    if (!(await window.appConfirm(confirmMsg))) return;

    let hospitalUserId = null;
    if (reqId && reqId !== 'null') {
        const rr  = await apiGet('requests.php');
        const req = (rr.success && rr.data)
            ? rr.data.find(r => r.REQ_id == reqId)
            : null;
        hospitalUserId = req ? req.hospital_user_id : null;
    }

    const hospitalMsg = choice === 'Accepted'
        ? `Donor ${pr.FIR_name} ${pr.LST_name} (${pr.BloodTypeName || bloodTypeMap[pr.BLOOD_TYPE_BloodTypeID]}) ACCEPTED emergency request #${reqId}. Contact: ${pr.phone_number}`
        : null;

  const res = await apiPut('notifications.php?action=respond', {
    NotificationID:   notifId,
    donor_id:         pr.donor_id,
    donor_user_id:    session.UserID,
    REQ_id:           reqId,
    choice:           choice,
    hospital_user_id: hospitalUserId,
    hospital_message: hospitalMsg
});

    if (!res.success) { alert(res.message); return; }

    if (choice === 'Accepted') {
        session.entityData.AVB_STU = 'Reserved / Donating';
        alert(`✅ You have ACCEPTED the emergency request!\n\nThe hospital staff will contact you shortly.\nYour availability is now locked until donation is confirmed.`);
    } else {
        alert(`Response submitted: DECLINED.`);
    }
    renderMyProfile();
}

// ══════════════════════════════════════════════════════════════
// CONFIRM DONATION (Hospital Staff)
// ══════════════════════════════════════════════════════════════
async function confirmDonation(donationId) {
    if (!(await window.appConfirm(`Confirm donation #${donationId}?\nThis will mark it as completed and free the donor.`))) return;

    const ur    = await apiGet('users.php');
    const admin = (ur.success && ur.data)
        ? ur.data.find(u => u.ROLES_RoleID == 1)
        : null;

    const res = await apiPut('donations.php', {
        donation_id:   donationId,
        admin_user_id: admin ? admin.UserID : null
    });

    if (!res.success) { alert(res.message); return; }
    alert(`✅ Donation #${donationId} confirmed successfully!\nDonor availability has been reset to Available.`);
    renderRequestsTable();
}

// ══════════════════════════════════════════════════════════════
// BLOOD DRIVES
// ══════════════════════════════════════════════════════════════
async function handleBloodDrive(e) {
    e.preventDefault();

    const evtName = document.getElementById('driveEvent');
    const loc     = document.getElementById('driveVenue');
    const shd     = document.getElementById('driveDate');

    let valid = true;
    if (!validateRequired(evtName, 'Event Name')) valid = false;
    if (!validateRequired(loc, 'Location'))       valid = false;

    if (!shd.value) {
        showValidationError(shd, 'Schedule date is required.');
        valid = false;
    } else {
        const today = new Date().toISOString().split('T')[0];
        if (shd.value < today) {
            showValidationError(shd, 'Schedule date cannot be in the past.');
            valid = false;
        } else {
            showValidationSuccess(shd);
        }
    }

    if (!valid) return;

    const payload = {
        EVT_name:                    evtName.value.trim(),
        LOC:                         loc.value.trim(),
        SHD:                         shd.value,
        BARANGAY_BarangayID:         parseInt(document.getElementById('driveBarangay').value),
        CIT_Health_OFF_ADM_admin_id: session.admin_id
    };

    const res = await apiPost('drives.php', payload);
    if (!res.success) { alert(res.message); return; }

    alert('✅ Blood Drive scheduled successfully!');
    document.getElementById('driveModal').style.display = 'none';
    document.getElementById('formBloodDrive').reset();
    clearAllValidations('formBloodDrive');
    renderDrivesTable();
}

async function renderDrivesTable() {
    const tbody = document.getElementById('driveTableBody');
    tbody.innerHTML = loadingRow(6);

    const res = await apiGet('drives.php');
    if (!res.success || !res.data || !res.data.length) {
        tbody.innerHTML = emptyRow(6, 'No scheduled blood drives.');
        return;
    }

    let myJoinedIds = [];
    // ── FIX: use == loose equality ────────────────────────────
    if (session.ROLES_RoleID == 4 && session.entityData?.donor_id) {
        const pr = await apiGet(`drives_par.php?donor_id=${session.entityData.donor_id}`);
        if (pr.success && pr.data) {
            myJoinedIds = pr.data.map(p => parseInt(p.Blood_Drive_Blood_Drive_id));
        }
    }

    tbody.innerHTML = res.data.map(drv => {
        const brLabel  = drv.BarangayName || barangayMap[drv.BARANGAY_BarangayID] || '-';
        const stuClass = drv.STU === 'Scheduled' ? 'role-admin'
                       : drv.STU === 'Ongoing'   ? 'role-donor'
                       : drv.STU === 'Completed' ? 'role-bhw'
                       : 'role-hospital';
        let actionCell = '';

        // ── FIX: use == loose equality ────────────────────────
       if (session.ROLES_RoleID == 4) {
    const joined = myJoinedIds.includes(parseInt(drv.Blood_Drive_id));
    if (joined) {
        if (['Completed','Cancelled'].includes(drv.STU)) {
            actionCell = `<span class="status-pill verified">✓ Joined</span>`;
        } else {
            actionCell = `<button onclick="cancelBloodDrive(${drv.Blood_Drive_id})"
                class="btn-icon-sm btn-decline">
                <svg class="icon" viewBox="0 0 24 24" width="13" height="13" stroke="white">
                    <path d="M6 6l12 12M18 6 6 18"/></svg>
                Cancel Join</button>`;
        }
    } else if (['Completed','Cancelled'].includes(drv.STU)) {
            } else if (['Completed','Cancelled'].includes(drv.STU)) {
                actionCell = `<span class="status-pill inactive">${escapeHtml(drv.STU)}</span>`;
            } else {
                actionCell = `<button onclick="joinBloodDrive(${drv.Blood_Drive_id})"
                    class="btn-icon-sm btn-join">
                    <svg class="icon" viewBox="0 0 24 24" width="13" height="13" stroke="white">
                        <path d="M12 5v14M5 12h14"/></svg>
                    Join Drive</button>`;
            }
        } else if (session.ROLES_RoleID == 1 || session.ROLES_RoleID == 3) {
    actionCell = `
        <button onclick="openEditDrive(${drv.Blood_Drive_id})"
            class="btn-icon-sm btn-edit">
            <svg class="icon" viewBox="0 0 24 24" width="13" height="13" stroke="white">
                <path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3Z"/></svg>
            Edit
        </button>
        <button onclick="deleteBloodDrive(${drv.Blood_Drive_id})"
            class="btn-icon-sm btn-decline" style="margin-left:6px;">
            <svg class="icon" viewBox="0 0 24 24" width="13" height="13" stroke="white">
                <path d="M6 6l12 12M18 6 6 18"/></svg>
            Delete
        </button>`;
}

        return `<tr>
            <td>${drv.Blood_Drive_id}</td>
            <td>${escapeHtml(drv.EVT_name)}
                <span class="badge ${stuClass}" style="margin-left:6px;font-size:0.68rem;">
                    ${escapeHtml(drv.STU)}</span></td>
            <td>${escapeHtml(drv.LOC)}</td>
            <td>${drv.SHD}</td>
            <td>${escapeHtml(brLabel)}</td>
            <td>${actionCell}</td>
        </tr>`;
    }).join('');
}

async function joinBloodDrive(driveId) {
    const pr = session.entityData;
    if (!pr?.donor_id) {
        alert('No donor record connected to this account.');
        return;
    }
    if (pr.verificationStatus !== 'Verified') {
        alert('Only verified donors can join blood drives. Please wait for CHO Admin verification.');
        return;
    }
    if (pr.AVB_STU !== 'Available') {
    alert('Only donors with "Available" status can join blood drives.');
    return;
}
    if (!(await window.appConfirm('Join this blood drive?'))) return;

    const res = await apiPost('drives_par.php', {
        Blood_Drive_id: driveId,
        donor_id:       pr.donor_id
    });

    if (!res.success) { alert(res.message); return; }
    alert('✅ You are now registered for this blood drive!');
    renderDrivesTable();
}

async function cancelBloodDrive(driveId) {
    const pr = session.entityData;
    if (!pr?.donor_id) {
        alert('No donor record connected to this account.');
        return;
    }

    if (!(await window.appConfirm('Cancel your blood drive participation?'))) return;

    const res = await apiPut('drives_par.php?action=cancel', {
        Blood_Drive_id: driveId,
        donor_id: pr.donor_id
    });

    if (!res.success) {
        alert(res.message);
        return;
    }

    alert('Participation cancelled successfully.');
    renderDrivesTable();
    if (document.getElementById('viewMyProfile')?.style.display !== 'none') {
        renderMyProfile();
    }
}

async function openEditDrive(driveId) {
    const res   = await apiGet('drives.php');
    const drive = (res.success && res.data)
        ? res.data.find(d => d.Blood_Drive_id == driveId)
        : null;
    if (!drive) { alert('Drive not found.'); return; }

    document.getElementById('editDriveId').value       = drive.Blood_Drive_id;
    document.getElementById('editDriveEvent').value    = drive.EVT_name;
    document.getElementById('editDriveVenue').value    = drive.LOC;
    document.getElementById('editDriveDate').value     = drive.SHD;
    document.getElementById('editDriveBarangay').value = drive.BARANGAY_BarangayID;
    document.getElementById('editDriveStatus').value   = drive.STU || 'Scheduled';

    clearAllValidations('formEditDrive');
    document.getElementById('editDriveModal').style.display = 'flex';
}

async function handleEditDrive(e) {
    e.preventDefault();

    const evtName = document.getElementById('editDriveEvent');
    const loc     = document.getElementById('editDriveVenue');
    let valid     = true;

    if (!validateRequired(evtName, 'Event Name')) valid = false;
    if (!validateRequired(loc, 'Location'))       valid = false;
    if (!valid) return;

    const payload = {
        Blood_Drive_id:      parseInt(document.getElementById('editDriveId').value),
        EVT_name:            evtName.value.trim(),
        LOC:                 loc.value.trim(),
        SHD:                 document.getElementById('editDriveDate').value,
        BARANGAY_BarangayID: parseInt(document.getElementById('editDriveBarangay').value),
        STU:                 document.getElementById('editDriveStatus').value
    };

    const res = await apiPut('drives.php', payload);
    if (!res.success) { alert(res.message); return; }

    alert('✅ Blood Drive updated successfully!');
    document.getElementById('editDriveModal').style.display = 'none';
    renderDrivesTable();
}

async function deleteBloodDrive(driveId) {
    if (!(await window.appConfirm(`Delete blood drive #${driveId}? This cannot be undone.`))) return;

    const res = await apiPut('drives.php?action=delete', {
        Blood_Drive_id: driveId,
        actor_user_id: session.UserID
    });

    if (!res.success) {
        alert(res.message);
        return;
    }

    alert('Blood drive deleted successfully.');
    renderDrivesTable();
}

// ══════════════════════════════════════════════════════════════
// USER ACCOUNTS
// ══════════════════════════════════════════════════════════════
async function renderUsersTable() {
    const tbody = document.getElementById('userAccountTableBody');
    tbody.innerHTML = loadingRow(5);

    const res = await apiGet('users.php');
    if (!res.success) {
        tbody.innerHTML = emptyRow(5, res.message);
        return;
    }

    if (!res.data || !res.data.length) {
        tbody.innerHTML = emptyRow(5, 'No user accounts found.');
        return;
    }

    tbody.innerHTML = res.data.map(acc => {
        const isActive = acc.active == 1;
        const isSelf   = acc.UserID == session.UserID;

        const statusPill = `<span class="status-pill ${isActive ? 'active' : 'inactive'}">
            ${isActive ? 'Active' : 'Deactivated'}</span>`;

        let actions = `<button onclick="openEditUser(${acc.UserID},
            '${escapeHtml(acc.Username)}')"
            class="btn-icon-sm btn-edit">
            <svg class="icon" viewBox="0 0 24 24" width="13" height="13" stroke="white">
                <path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3Z"/></svg>
            Edit</button>`;

        if (!isSelf) {
            actions += ` <button onclick="toggleUserStatus(${acc.UserID})"
                class="btn-icon-sm ${isActive ? 'btn-toggle-off' : 'btn-toggle-on'}">
                <svg class="icon" viewBox="0 0 24 24" width="13" height="13" stroke="white">
                    <path d="M12 3v9"/>
                    <path d="M6.3 6.3a8 8 0 1 0 11.4 0"/></svg>
                ${isActive ? 'Deactivate' : 'Activate'}</button>`;

                actions += ` <button onclick="deleteUserAccount(${acc.UserID}, '${escapeHtml(acc.Username)}')"
        class="btn-icon-sm btn-decline" style="margin-left:4px;">
        <svg class="icon" viewBox="0 0 24 24" width="13" height="13" stroke="white">
            <path d="M6 6l12 12M18 6 6 18"/></svg>
        Delete</button>`;
                
        } else {
            actions += ` <span style="font-size:0.75rem;color:var(--ink-faint);">
                (current session)</span>`;
        }

        return `<tr>
            <td>${acc.UserID}</td>
            <td>${escapeHtml(acc.Username)}</td>
            <td>${escapeHtml(acc.RoleName || '-')}</td>
            <td>${statusPill}</td>
            <td style="white-space:normal;">${actions}</td>
        </tr>`;
    }).join('');
}

function openEditUser(userId, username) {
    document.getElementById('editUserId').value       = userId;
    document.getElementById('editUserUsername').value = username;
    clearAllValidations('formEditUser');
    document.getElementById('editUserModal').style.display = 'flex';
}

async function handleEditUser(e) {
    e.preventDefault();

    const userId = parseInt(document.getElementById('editUserId').value);
    const uInput = document.getElementById('editUserUsername');

    if (!validateUsernameField(uInput)) return;

    const res = await apiPut('users.php?action=update', {
        UserID:   userId,
        Username: uInput.value.trim()
    });

    if (!res.success) { alert(res.message); return; }

    if (userId === session.UserID) {
        session.Username = uInput.value.trim();
        document.getElementById('welcomeUserMsg').innerText =
            `Logged in: ${session.Username}`;
    }

    alert(`✅ Username updated to "${uInput.value.trim()}".`);
    document.getElementById('editUserModal').style.display = 'none';
    renderUsersTable();
}

async function toggleUserStatus(userId) {
    if (userId === session.UserID) {
        alert('You cannot deactivate your own account while logged in.');
        return;
    }
    if (!(await window.appConfirm('Toggle this user\'s active status?'))) return;

    const res = await apiPut('users.php?action=toggle_status', { UserID: userId });
    if (!res.success) { alert(res.message); return; }

    const status = res.data.active ? 'Active' : 'Deactivated';
    alert(`Account status changed to: ${status}`);
    renderUsersTable();
}

async function deleteUserAccount(userId, username) {
    if (userId === session.UserID) {
        alert('You cannot delete your own active session account.');
        return;
    }

    if (!(await window.appConfirm(`Delete user "${username}" permanently?`))) return;

    const res = await apiPut('users.php?action=delete', {
        UserID: userId,
        actor_user_id: session.UserID
    });

    if (!res.success) {
        alert(res.message);
        return;
    }

    alert(`User "${username}" deleted successfully.`);
    renderUsersTable();
}

// ══════════════════════════════════════════════════════════════
// MANAGE NOTIFICATIONS (CHO Admin)
// ══════════════════════════════════════════════════════════════
async function renderManageNotifications() {
    const container = document.getElementById('adminNotificationsContainer');
    container.innerHTML = `<p style="color:var(--ink-faint);">Loading notifications...</p>`;

    const res = await apiGet(`notifications.php?user_id=${session.UserID}`);
    if (!res.success || !res.data || !res.data.length) {
        container.innerHTML = `<p style="color:var(--ink-faint);">
            No system notifications at this time.</p>`;
        return;
    }

    container.innerHTML = res.data.map(n => `
        <div class="notice notice-warning"
             style="align-items:center;margin-bottom:8px;">
            <svg class="icon" viewBox="0 0 24 24">
                <path d="M18 8a6 6 0 0 0-12 0c0 5.5-2 7-2 7h16s-2-1.5-2-7"/>
                <path d="M10.5 19a1.7 1.7 0 0 0 3 0"/></svg>
            <div style="flex:1;">
                <strong>Notification #${n.NotificationID}</strong>
                <p style="margin-top:2px;font-size:0.86rem;">
                    ${escapeHtml(n.Message)}</p>
                <small style="color:var(--ink-faint);">${n.SentDate}</small>
            </div>
            <button onclick="dismissAdminNotification(${n.NotificationID})"
                class="btn-icon-sm btn-decline">
                <svg class="icon" viewBox="0 0 24 24" width="13" height="13" stroke="white">
                    <path d="M6 6l12 12M18 6 6 18"/></svg>
                Dismiss</button>
        </div>
    `).join('');
}

async function dismissAdminNotification(notificationId) {
    await apiPut('notifications.php?action=dismiss', { NotificationID: notificationId });
    renderManageNotifications();
}

async function clearHospitalNotifications() {
    if (!(await window.appConfirm('Clear all notifications?'))) return;

    const res = await apiPut('notifications.php?action=clear_all', {
        user_id: session.UserID
    });

    if (!res.success) {
        alert(res.message || 'Failed to clear notifications.');
        return;
    }

    alert('All notifications cleared.');
    renderRequestsTable();
}

// ══════════════════════════════════════════════════════════════
// REPORTS
// ══════════════════════════════════════════════════════════════
async function generateReport(type) {
    const out     = document.getElementById('reportOutputContainer');
    const dateStr = new Date().toLocaleString('en-PH', {
        year:'numeric', month:'long', day:'numeric',
        hour:'2-digit', minute:'2-digit'
    });
    out.innerHTML = `<p style="color:var(--ink-faint);">Generating ${type} report...</p>`;

    if (type === 'Donor') {
        const res    = await apiGet('donors.php');
        const donors = (res.success && res.data) ? res.data : [];
        const verified  = donors.filter(d => d.verificationStatus === 'Verified').length;
        const available = donors.filter(d => d.AVB_STU === 'Available').length;
        const pending   = donors.filter(d =>
            d.verificationStatus === 'Pending' ||
            d.verificationStatus === 'Pending Verification').length;

        out.innerHTML = `
            <h4>
                <svg class="icon" viewBox="0 0 24 24" width="17" height="17">
                    <path d="M8 2.5h8a1 1 0 0 1 1 1V5H7V3.5a1 1 0 0 1 1-1Z"/>
                    <rect x="5" y="5" width="14" height="16.5" rx="2"/>
                    <path d="M9 11h6M9 14.5h6M9 18h4"/></svg>
                VOLUNTEER DONOR REPORT
            </h4>
            <p><small>Generated: ${dateStr}</small></p>
            <p><strong>Total Registered Donors:</strong> ${donors.length}</p>
            <p><strong>Verified Donors:</strong> ${verified}</p>
            <p><strong>Pending Verification:</strong> ${pending}</p>
            <p><strong>Available for Donation:</strong> ${available}</p>
            <p><strong>Reserved / Donating:</strong>
                ${donors.filter(d => d.AVB_STU === 'Reserved' ||
                                     d.AVB_STU === 'Donating').length}</p>
            <p><strong>Not Available:</strong>
                ${donors.filter(d => d.AVB_STU === 'Not Available' ||
                                     d.AVB_STU === 'Unavailable').length}</p>
            <p><strong>Rejected:</strong>
                ${donors.filter(d => d.verificationStatus === 'Rejected').length}</p>
        `;

    } else if (type === 'Emergency') {
        const res  = await apiGet('requests.php');
        const reqs = (res.success && res.data) ? res.data : [];

        out.innerHTML = `
            <h4>
                <svg class="icon" viewBox="0 0 24 24" width="17" height="17">
                    <path d="M12 3.5 2 20.5h20L12 3.5Z"/>
                    <path d="M12 10v4.2M12 17.2h.01"/></svg>
                EMERGENCY BLOOD REQUESTS REPORT
            </h4>
            <p><small>Generated: ${dateStr}</small></p>
            <p><strong>Total Requests Filed:</strong> ${reqs.length}</p>
            <p><strong>Matching Active:</strong>
                ${reqs.filter(r => r.REQ_STU === 'Matching Active').length}</p>
            <p><strong>Fulfilled:</strong>
                ${reqs.filter(r => r.REQ_STU === 'Fulfilled').length}</p>
            <p><strong>No Match Found:</strong>
                ${reqs.filter(r => r.REQ_STU === 'No Match Found').length}</p>
            <p><strong>Pending:</strong>
                ${reqs.filter(r => r.REQ_STU === 'Pending').length}</p>
        `;

    } else if (type === 'Donation') {
        const res = await apiGet('donations.php');
        const dns = (res.success && res.data) ? res.data : [];

        out.innerHTML = `
            <h4>
                <svg class="icon" viewBox="0 0 24 24" width="17" height="17">
                    <path d="M12 2.5c3.2 4.4 7 9.2 7 13.2a7 7 0 1 1-14 0
                             c0-4 3.8-8.8 7-13.2Z"/>
                </svg>
                DONATION SUMMARY REPORT
            </h4>
            <p><small>Generated: ${dateStr}</small></p>
            <p><strong>Total Donation Records:</strong> ${dns.length}</p>
            <p><strong>Confirmed Donations:</strong>
                ${dns.filter(d => d.status === 'Confirmed').length}</p>
            <p><strong>Pending Confirmation:</strong>
                ${dns.filter(d => d.status === 'Pending Confirmation').length}</p>
        `;
    }
}

// ══════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ══════════════════════════════════════════════════════════════

function loadingRow(cols) {
    return `<tr><td colspan="${cols}"
        style="text-align:center;color:var(--ink-faint);padding:20px;">
        Loading...</td></tr>`;
}

function emptyRow(cols, msg = 'No records found.') {
    return `<tr class="empty-row"><td colspan="${cols}">${msg}</td></tr>`;
}

// XSS prevention
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g,  '&amp;')
        .replace(/</g,  '&lt;')
        .replace(/>/g,  '&gt;')
        .replace(/"/g,  '&quot;')
        .replace(/'/g,  '&#039;');
}