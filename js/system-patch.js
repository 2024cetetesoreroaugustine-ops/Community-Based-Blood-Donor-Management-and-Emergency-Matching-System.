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
        }

        return original(endpoint, payload);
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

  ready(function () {
    // Wait a tick so original script globals are ready.
    setTimeout(function () {
      installApiPostPatch();
      disablePublicRegisterLink();
      installPhoneAutoPrefix();
    }, 0);

    // Re-apply phone behavior if modal DOM sections are reset/swapped.
    document.addEventListener('click', function () {
      setTimeout(installPhoneAutoPrefix, 0);
    });
  });
})();
