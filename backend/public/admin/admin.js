// Admin JavaScript for modals and interactions

// Change Password Confirmation Modal
document.addEventListener('DOMContentLoaded', function() {
  const changeForm = document.getElementById('changeForm');
  if (changeForm) {
    const confirmModal = document.getElementById('confirmModal');
    const confirmBtn = document.getElementById('confirmBtn');
    const cancelBtn = document.getElementById('cancelBtn');

    if (confirmModal) {
      changeForm.addEventListener('submit', function(e) {
        e.preventDefault();
        confirmModal.style.display = 'flex';
      });

      confirmBtn.onclick = () => {
        changeForm.submit();
      };

      cancelBtn.onclick = () => {
        confirmModal.style.display = 'none';
      };

      window.onclick = (e) => {
        if (e.target === confirmModal) {
          confirmModal.style.display = 'none';
        }
      };
    }
  }

  // Delete Contact Modal
  const deleteModal = document.getElementById('deleteModal');
  if (deleteModal) {
    const confirmBtn = document.getElementById('confirmBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const modalText = document.getElementById('modalText');
    const csrfToken = document.querySelector('meta[name="csrf-token"]') ? document.querySelector('meta[name="csrf-token"]').getAttribute('content') : '';
    let currentContactId = null;

    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        currentContactId = btn.dataset.id;
        const contactName = btn.dataset.name;
        if (modalText) {
          modalText.textContent = `Är du säker på att du vill radera kontakten "${contactName}"?`;
        }
        deleteModal.style.display = 'flex';
      });
    });

    if (confirmBtn) {
      confirmBtn.onclick = async () => {
        if (!currentContactId) return;
        try {
          const params = new URLSearchParams();
          params.append('id', currentContactId);
          if (csrfToken) {
            params.append('_csrf', csrfToken);
          }

          const res = await fetch('/admin/contacts/delete', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Accept': 'application/json',
              'X-Requested-With': 'XMLHttpRequest'
            },
            body: params
          });
          const data = await res.json();
          if (data.success) {
            location.reload();
          } else {
            alert(data.message || 'Fel vid radering');
          }
        } catch (err) {
          console.error(err);
          alert('Fel vid radering.');
        }
      };
    }

    if (cancelBtn) {
      cancelBtn.onclick = () => {
        deleteModal.style.display = 'none';
        currentContactId = null;
      };
    }

    window.onclick = (e) => {
      if (e.target === deleteModal) {
        deleteModal.style.display = 'none';
        currentContactId = null;
      }
    };
  }

  // Idle logout timer
  let idleTime = 0;
  const idleInterval = setInterval(timerIncrement, 60000); // 1 minute

  function timerIncrement() {
    idleTime++;
    if (idleTime > 25) { // 25 minutes
      showIdleWarning();
    }
    if (idleTime > 30) { // 30 minutes
      window.location.href = '/admin/logout';
    }
  }

  function resetIdle() {
    idleTime = 0;
  }

  // Reset idle time on activity
  document.addEventListener('mousemove', resetIdle);
  document.addEventListener('keypress', resetIdle);
  document.addEventListener('click', resetIdle);
  document.addEventListener('scroll', resetIdle);

  function showIdleWarning() {
    // Create modal for idle warning
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
      <div class="modal-content" style="text-align: center; padding: 25px;">
        <h3>Inaktivitet Varning</h3>
        <p>Du kommer att loggas ut om 5 minuter på grund av inaktivitet.</p>
        <div class="modal-buttons" style="margin-top: 20px;">
          <button id="extendSession" class="btn btn-primary" style="margin-right: 10px;">Förläng Session</button>
          <button id="logoutNow" class="btn">Logga ut nu</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('extendSession').onclick = () => {
      modal.remove();
      resetIdle();
    };

    document.getElementById('logoutNow').onclick = () => {
      window.location.href = '/admin/logout';
    };

    window.onclick = (e) => {
      if (e.target === modal) {
        modal.remove();
        resetIdle();
      }
    };
  }
});
