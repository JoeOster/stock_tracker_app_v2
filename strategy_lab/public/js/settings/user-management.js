export function initializeUserManagement() {
  const addAccountHolderBtn = document.getElementById('add-account-holder-btn');
  if (addAccountHolderBtn) {
    addAccountHolderBtn.addEventListener('click', addAccountHolder);
  }

  loadAccountHolders();
}

async function loadAccountHolders() {
  const response = await fetch('/api/accounts');
  const holders = await response.json();
  const holderList = document.getElementById('account-holder-list');
  holderList.innerHTML = '';
  if (Array.isArray(holders)) {
    holders.forEach((holder) => {
      const li = document.createElement('li');
      li.textContent = holder.name;
      holderList.appendChild(li);
    });
  }
}

async function addAccountHolder() {
  const newHolderNameInput = document.getElementById('new-holder-name');
  const name = newHolderNameInput.value;
  if (!name) {
    return;
  }

  const response = await fetch('/api/accounts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name }),
  });

  if (response.ok) {
    newHolderNameInput.value = '';
    loadAccountHolders();
  }
}
