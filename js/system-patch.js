/* PulseLink runtime patch (additive, non-invasive)
 * - Keeps existing modules/flow
 * - Adds creator_user_id automatically for protected API calls
 * - Disables public login-page registration entry
 * - Auto +63 phone input behavior
 */

(function () {
  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  function installApiPostPatch() {
    if (typeof window.apiPost !== 'function') return;
    if (window.__pulsePatchApiPostInstalled) return;

    const original = window.apiPost;
    window.apiPost = function patchedApiPost(endpoint, data) {
      try {
        const payload = (data && typeof data === 'object') ? { ...data } : data;
        const uid = window.session && window.session.UserID ? Number(window.session.UserID) : null;

        if (uid && payload && typeof payload === 'object') {
          if (String(endpoint).includes('auth.php?action=register')) {
            payload.creator_user_id = uid;
          }
          if (String(endpoint).includes('donors.php?action=bhw_register')) {
            payload.creator_user_id = uid;
          }
          if (String(endpoint).includes('auth.php?action=update_my_profile')) {
            payload.user_id = uid;
          }
          if (String(endpoint).includes('auth.php?action=change_password')) {
            payload.user_id = uid;
          }
        }

        return Promise.resolve(original(endpoint, payload)).then((res) => {
          if (
            String(endpoint).includes('auth.php?action=login') &&
            res &&
            res.success &&
            res.data
          ) {
            window.__pulseMustChangePassword = Number(res.data.must_change_password || 0) === 1;
            window.__pulseMustChangePrompted = false;
          }
          return res;
        });
      } catch (e) {
        return original(endpoint, data);
      }
    };

    window.__pulsePatchApiPostInstalled = true;
  }

  function disablePublicRegisterLink() {
    const link = document.getElementById('linkOpenStaffRegister');
    if (!link) return;

    // Hide entry from login page UI
    const wrapper = link.closest('div');
    if (wrapper) wrapper.style.display = 'none';

    // Block click in case shown by cache/DOM changes
    link.addEventListener(
      'click',
      function (e) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      },
      true,
    );
  }

  function installPhonePrefixBehavior(input) {
    if (!input || input.dataset.phonePatchInstalled === '1') return;

    function normalize(raw) {
      let v = String(raw || '');
      v = v.replace(/\s+/g, '');

      // Convert local 09xxxxxxxxx to +639xxxxxxxxx
      if (v.startsWith('09')) {
        v = '+63' + v.slice(1);
      }

      // Keep digits and plus only
      v = v.replace(/[^\d+]/g, '');

      // Ensure starts with +63
      if (!v.startsWith('+63')) {
        v = '+63' + v.replace(/^\+?63?/, '');
      }

      // keep max 13 chars: +63 + 10 digits
      if (v.length > 13) v = v.slice(0, 13);
      return v;
    }

    input.addEventListener('focus', function () {
      if (!input.value.trim()) input.value = '+63';
    });

    input.addEventListener('input', function () {
      const caretAtEnd = input.selectionStart === input.value.length;
      input.value = normalize(input.value);
      if (caretAtEnd) {
        try {
          input.setSelectionRange(input.value.length, input.value.length);
        } catch (_) {}
      }
    });

    input.addEventListener('blur', function () {
      input.value = normalize(input.value);
      if (input.value === '+63') {
        // keep empty if no digits entered yet
        input.value = '';
      }
    });

    input.dataset.phonePatchInstalled = '1';
  }

 function installPhoneAutoPrefix() {
    const ids = [
      'hospCttNumber',
      'bhwCttNumber',
      'selfDonorPhone',
      'regPhone',
      'editProfilePhone',
    ];
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) installPhonePrefixBehavior(el);
    });
  }
  function patchSystemAccountRegistrationTemporaryPasswordMode() {
    const passInput = document.getElementById('staffRegPass');
    const confirmInput = document.getElementById('staffRegPassConfirm');
    if (!passInput || !confirmInput) return;
    // Keep current flow working but present only temporary password input.
    const confirmGroup = confirmInput.closest('.form-group');
    if (confirmGroup) confirmGroup.style.display = 'none';
    const passGroupLabel = passInput.closest('.form-group')?.querySelector('label');
    if (passGroupLabel) {
      passGroupLabel.innerHTML = 'Temporary Password: <span style="color:var(--garnet);">*</span>';
    }
   passInput.placeholder = 'Set temporary password for user';
    // Hide strength indicator in temporary-password mode to avoid confusion.
    const strengthBar = document.getElementById('passStrengthBar');
    const strengthLabel = document.getElementById('passStrengthLabel');
    if (strengthBar) strengthBar.style.display = 'none';
    if (strengthLabel) strengthLabel.style.display = 'none';
    // Existing validation expects confirm field, so mirror password automatically.
    const syncConfirm = () => {
      confirmInput.value = passInput.value;
    };
    passInput.removeEventListener('input', syncConfirm);
    passInput.addEventListener('input', syncConfirm);
    syncConfirm();
  }
  function patchTemporaryPasswordValidationBypass() {
    if (window.__pulseTempValidationBypassInstalled) return;
    if (typeof window.validatePasswordField === 'function') {
      const originalValidatePasswordField = window.validatePasswordField;
      window.validatePasswordField = function patchedValidatePasswordField(input) {
        if (input && (input.id === 'staffRegPass' || input.id === 'regDonorPassword')) {
          const val = String(input.value || '').trim();
          if (!val) {
            if (typeof window.showValidationError === 'function') {
              window.showValidationError(input, 'Temporary password is required.');
            }
            return false;
          }
          if (typeof window.showValidationSuccess === 'function') {
            window.showValidationSuccess(input);
          }
          return true;
        }
        return originalValidatePasswordField(input);
      };
    }
    if (typeof window.validatePasswordConfirm === 'function') {
      const originalValidatePasswordConfirm = window.validatePasswordConfirm;
      window.validatePasswordConfirm = function patchedValidatePasswordConfirm(passInput, confirmInput) {
        if (passInput && passInput.id === 'staffRegPass') {
          if (confirmInput) confirmInput.value = passInput.value;
          if (typeof window.showValidationSuccess === 'function' && confirmInput) {
            window.showValidationSuccess(confirmInput);
          }
          return true;
        }
        return originalValidatePasswordConfirm(passInput, confirmInput);
      };
    }
    window.__pulseTempValidationBypassInstalled = true;
  }
  function ensureAccountSettingsButton() {
    const panel = document.querySelector('.user-control-panel');
    if (!panel) return;
    if (document.getElementById('btnAccountSettingsPatch')) return;

    const btn = document.createElement('button');
    btn.id = 'btnAccountSettingsPatch';
    btn.type = 'button';
    btn.className = 'btn-auth';
    btn.style.background = 'rgba(255,255,255,0.08)';
    btn.style.border = '1px solid rgba(255,255,255,0.16)';
    btn.textContent = 'Account Settings';
    btn.addEventListener('click', openAccountSettingsModal);
    panel.insertBefore(btn, panel.firstChild);
  }

  function getRoleId() {
    if (!window.session) return null;
    return Number(window.session.ROLES_RoleID || 0) || null;
  }

  function getEntityData() {
    return (window.session && window.session.entityData) ? window.session.entityData : {};
  }

  function openAccountSettingsModal() {
    let modal = document.getElementById('patchAccountSettingsModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'patchAccountSettingsModal';
      modal.className = 'modal';
      modal.style.display = 'none';
      modal.innerHTML = `
        <div class="modal-content" style="max-width:560px;">
          <span class="close-btn" id="patchCloseAccountSettings">&times;</span>
          <h2>Account Settings</h2>
          <form id="patchAccountSettingsForm" novalidate>
            <div id="patchProfileFields"></div>
            <hr>
            <h4>Change Password</h4>
            <div class="form-group">
              <label>Current / Temporary Password</label>
              <input id="patchCurrentPassword" type="password" class="form-control" placeholder="Enter current password">
            </div>
             <div class="form-row">
              <div class="form-group col">
                <label>New Password</label>
                <input id="patchNewPassword" type="password" class="form-control" placeholder="New strong password">
              </div>
              <div class="form-group col">
                <label>Confirm New Password</label>
                <input id="patchConfirmPassword" type="password" class="form-control" placeholder="Confirm new password">
              </div>
            </div>
          <small id="patchStrongHint" style="display:block;margin-top:4px;color:var(--ink-soft);font-size:0.75rem;">
  Strong password required: at least 8 characters, uppercase, lowercase, number, and special character.
</small>
<small id="patchAccountSettingsError" class="error-message" style="display:none;margin-top:8px;"></small>
<small id="patchAccountSettingsSuccess" class="success-message" style="display:none;margin-top:8px;"></small>
<button id="patchSaveAccountSettingsBtn" type="submit" class="btn-submit">Save Changes</button>
          </form>
        </div>
      `;
      document.body.appendChild(modal);

      modal.addEventListener('click', function (e) {
        if (e.target === modal) modal.style.display = 'none';
      });
      const close = modal.querySelector('#patchCloseAccountSettings');
      if (close) {
        close.addEventListener('click', function () {
          modal.style.display = 'none';
        });
      }
     const form = modal.querySelector('#patchAccountSettingsForm');
      if (form) {
        form.addEventListener('submit', handleAccountSettingsSubmit);
      }
      const saveBtn = modal.querySelector('#patchSaveAccountSettingsBtn');
      if (saveBtn && form) {
        saveBtn.addEventListener('click', function (ev) {
          ev.preventDefault();
          if (typeof form.requestSubmit === 'function') {
            form.requestSubmit();
          } else {
            form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
          }
        });
      }
      const np = modal.querySelector('#patchNewPassword');
      const cp = modal.querySelector('#patchConfirmPassword');
      const liveValidate = function () {
        const n = String(np?.value || '');
        const c = String(cp?.value || '');
        if (np) {
          const strong =
            n.length >= 8 && /[A-Z]/.test(n) && /[a-z]/.test(n) && /[0-9]/.test(n) && /[\W_]/.test(n);
          np.classList.toggle('valid', strong && n.length > 0);
          np.classList.toggle('invalid', !strong && n.length > 0);
        }
        if (cp) {
          const match = n.length > 0 && c.length > 0 && n === c;
          cp.classList.toggle('valid', match);
          cp.classList.toggle('invalid', c.length > 0 && !match);
        }
      };
      if (np) np.addEventListener('input', liveValidate);
      if (cp) cp.addEventListener('input', liveValidate);
    }
   renderPatchProfileFields();

const u = document.getElementById('patchUsername');
if (u) {
  u.addEventListener('input', function () {
    let v = String(u.value || '').replace(/[^a-zA-Z0-9_]/g, '').slice(0, 30);
    if (v.length > 0) v = v.charAt(0).toUpperCase() + v.slice(1);
    u.value = v;
  });
}

modal.style.display = 'flex';
  }

  function renderPatchProfileFields() {
    const roleId = getRoleId();
    const data = getEntityData();
    const holder = document.getElementById('patchProfileFields');
    if (!holder) return;

    const safeUsername = ((window.session && window.session.Username) ? window.session.Username : '').replace(/"/g, '&quot;');
const usernameField = `
  <div class="form-group">
    <label>Username</label>
    <input id="patchUsername" class="form-control" value="${safeUsername}" placeholder="Username (letters, numbers, underscore)">
  </div>`;

    if (roleId === 1) {
      holder.innerHTML = `
  <h4>Profile Information</h4>
  ${usernameField}
        <div class="form-row">
          <div class="form-group col"><label>First Name</label><input id="patchFirName" class="form-control" value="${(data.FIR_name || '').replace(/"/g, '&quot;')}"></div>
          <div class="form-group col"><label>Last Name</label><input id="patchLstName" class="form-control" value="${(data.LST_name || '').replace(/"/g, '&quot;')}"></div>
        </div>`;
      return;
    }

    if (roleId === 2) {
   holder.innerHTML = `
  <h4>Hospital Profile</h4>
  ${usernameField}
        <div class="form-group"><label>Hospital Name</label><input id="patchHospitalName" class="form-control" value="${(data.Hospital_name || '').replace(/"/g, '&quot;')}"></div>
        <div class="form-row">
          <div class="form-group col"><label>Contact Number</label><input id="patchHospitalPhone" class="form-control" value="${(data.CTT_number || '').replace(/"/g, '&quot;')}"></div>
          <div class="form-group col"><label>Address</label><input id="patchHospitalAddress" class="form-control" value="${(data.ADD || '').replace(/"/g, '&quot;')}"></div>
        </div>`;
      installPhonePrefixBehavior(document.getElementById('patchHospitalPhone'));
      return;
    }

    if (roleId === 3) {
      holder.innerHTML = `
        <h4>BHW Profile</h4>
         ${usernameField}
        <div class="form-row">
          <div class="form-group col"><label>First Name</label><input id="patchBhwFirName" class="form-control" value="${(data.FIR_name || '').replace(/"/g, '&quot;')}"></div>
          <div class="form-group col"><label>Last Name</label><input id="patchBhwLstName" class="form-control" value="${(data.LST_name || '').replace(/"/g, '&quot;')}"></div>
        </div>
        <div class="form-group"><label>Contact Number</label><input id="patchBhwPhone" class="form-control" value="${(data.CTT_number || '').replace(/"/g, '&quot;')}"></div>`;
      installPhonePrefixBehavior(document.getElementById('patchBhwPhone'));
      return;
    }

    holder.innerHTML = `
      <h4>Profile Information</h4>
        ${usernameField}
      <p class="text-muted">For donor profile details, use your existing "Update Personal Details" module button.</p>
    `;
  }

   function clearPatchAccountSettingsMessages() {
  const err = document.getElementById('patchAccountSettingsError');
  const ok = document.getElementById('patchAccountSettingsSuccess');
  if (err) {
    err.style.display = 'none';
    err.textContent = '';
  }
  if (ok) {
    ok.style.display = 'none';
    ok.textContent = '';
  }
}

function showPatchAccountSettingsError(message) {
  const err = document.getElementById('patchAccountSettingsError');
  const ok = document.getElementById('patchAccountSettingsSuccess');
  if (ok) {
    ok.style.display = 'none';
    ok.textContent = '';
  }
  if (err) {
    err.textContent = message || 'Something went wrong.';
    err.style.display = 'block';
  }
}

function showPatchAccountSettingsSuccess(message) {
  const err = document.getElementById('patchAccountSettingsError');
  const ok = document.getElementById('patchAccountSettingsSuccess');
  if (err) {
    err.style.display = 'none';
    err.textContent = '';
  }
  if (ok) {
    ok.textContent = message || 'Saved successfully.';
    ok.style.display = 'block';
  }
}



  async function handleAccountSettingsSubmit(e) {
    e.preventDefault();
    clearPatchAccountSettingsMessages();
    if (typeof window.apiPost !== 'function' || !window.session || !window.session.UserID) return;

    const roleId = getRoleId();

    const newUsername = (document.getElementById('patchUsername')?.value || '').trim();
if (newUsername) {
  const ok = /^[A-Z][a-zA-Z0-9_]{2,29}$/.test(newUsername);
  if (!ok) {
    alert('Username must be 3-30 characters, start with uppercase letter, and use letters, numbers, underscore only.');
    return;
  }
}

    // Profile update per role (optional fields)
  let profilePayload = null;
    if (roleId === 1) {
      profilePayload = {
         ...profilePayload,
        FIR_name: (document.getElementById('patchFirName')?.value || '').trim(),
        LST_name: (document.getElementById('patchLstName')?.value || '').trim(),
      };
    } else if (roleId === 2) {
      profilePayload = {
         ...profilePayload,
        Hospital_name: (document.getElementById('patchHospitalName')?.value || '').trim(),
        CTT_number: (document.getElementById('patchHospitalPhone')?.value || '').trim(),
        ADD_col: (document.getElementById('patchHospitalAddress')?.value || '').trim(),
      };
    } else if (roleId === 3) {
      profilePayload = {
         ...profilePayload,
        FIR_name: (document.getElementById('patchBhwFirName')?.value || '').trim(),
        LST_name: (document.getElementById('patchBhwLstName')?.value || '').trim(),
        CTT_number: (document.getElementById('patchBhwPhone')?.value || '').trim(),
      };
    }

    

// Donor role (4) must not call update_my_profile in auth.php.
if (profilePayload && roleId !== 4) {
  const pRes = await window.apiPost('auth.php?action=update_my_profile', profilePayload);
  if (!pRes || !pRes.success) {
    alert(pRes?.message || 'Profile update failed.');
    return;
  }
}

    if (newUsername) {
  window.session.Username = newUsername;
  const welcome = document.getElementById('welcomeUserMsg');
  if (welcome) welcome.innerText = `Logged in: ${newUsername}`;
}

    const currentPassword = (document.getElementById('patchCurrentPassword')?.value || '');
    const newPassword = (document.getElementById('patchNewPassword')?.value || '');
    const confirmPassword = (document.getElementById('patchConfirmPassword')?.value || '');

if (newPassword || confirmPassword || currentPassword || window.__pulseMustChangePassword) {
      if (!newPassword || !confirmPassword) {
        showPatchAccountSettingsError('Please enter new password and confirm it.');
        return;
      }
      if (newPassword !== confirmPassword) {
        showPatchAccountSettingsError('New password and confirmation do not match.');
        return;
      }
      const strong =
        newPassword.length >= 8 &&
        /[A-Z]/.test(newPassword) &&
        /[a-z]/.test(newPassword) &&
        /[0-9]/.test(newPassword) &&
        /[\W_]/.test(newPassword);
      if (!strong) {
        showPatchAccountSettingsError('New password must be strong: at least 8 chars with uppercase, lowercase, number, and special character.');
        return;
      }
      const cRes = await window.apiPost('auth.php?action=change_password', {
        current_password: currentPassword,
        new_password: newPassword,
      });

      if (!cRes || !cRes.success) {
        showPatchAccountSettingsError(cRes?.message || 'Password change failed.');
        return;
      }

      window.__pulseMustChangePassword = false;
    }

 showPatchAccountSettingsSuccess('Account changes saved successfully.');
const modal = document.getElementById('patchAccountSettingsModal');
setTimeout(() => {
  if (modal) modal.style.display = 'none';
}, 900);
  }

  function watchLoginAndForcePasswordChange() {
    if (window.__pulsePatchWatcherInstalled) return;
    window.__pulsePatchWatcherInstalled = true;

    setInterval(function () {
      const main = document.getElementById('mainDashboardView');
      if (!main || main.style.display === 'none') return;

      ensureAccountSettingsButton();

      if (window.__pulseMustChangePassword && !document.getElementById('patchAccountSettingsModal')?.style.display?.includes('flex')) {
        openAccountSettingsModal();
        if (!window.__pulseMustChangePrompted) {
          alert('Please change your temporary/default password before continuing.');
          window.__pulseMustChangePrompted = true;
        }
      }
    }, 700);
  }

  ready(function () {
    // Wait a tick so original script globals are ready.
setTimeout(function () {
      installApiPostPatch();
      disablePublicRegisterLink();
      installPhoneAutoPrefix();
      patchSystemAccountRegistrationTemporaryPasswordMode();
      patchTemporaryPasswordValidationBypass();
      watchLoginAndForcePasswordChange();
    }, 0);
    // Re-apply behaviors if modal DOM sections are reset/swapped.
    document.addEventListener('click', function () {
      setTimeout(function () {
        installPhoneAutoPrefix();
        patchSystemAccountRegistrationTemporaryPasswordMode();
      }, 0);
    });
  });
})();
