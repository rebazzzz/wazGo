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
});
