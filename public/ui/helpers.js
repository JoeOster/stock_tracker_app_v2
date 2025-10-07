// public/ui/helpers.js
export function formatQuantity(number) {
    if (number === null || number === undefined || isNaN(number)) { return ''; }
    const options = { maximumFractionDigits: 5 };
    if (number % 1 === 0) { options.maximumFractionDigits = 0; }
    return number.toLocaleString('en-US', options);
}

export function formatAccounting(number, isCurrency = true) {
    if (number === null || number === undefined || isNaN(number)) { return ''; }
    if (Math.abs(number) < 0.001 && isCurrency) { return isCurrency ? '$&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;-' : '-'; }
    if (Math.abs(number) < 0.001 && !isCurrency) { return '-'; }
    const isNegative = number < 0;
    const absoluteValue = Math.abs(number);
    let options = { minimumFractionDigits: 2, maximumFractionDigits: 2 };
    if (!isCurrency) { options.maximumFractionDigits = 5; }
    let formattedNumber = absoluteValue.toLocaleString('en-US', options);
    if (isCurrency) { formattedNumber = '$' + formattedNumber; }
    return isNegative ? `(${formattedNumber})` : formattedNumber;
}

export function showToast(message, type = 'info', duration = 10000) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    if(container) container.appendChild(toast);
    setTimeout(() => { toast.remove(); }, duration);
}

export function getCurrentESTDateString() {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
}

export function getTradingDays(c) {
    let d = [];
    let cd = new Date(getCurrentESTDateString() + 'T12:00:00Z');
    while (d.length < c) {
        const dow = cd.getUTCDay();
        if (dow > 0 && dow < 6) { d.push(cd.toISOString().split('T')[0]); }
        cd.setUTCDate(cd.getUTCDate() - 1);
    }
    return d.reverse();
}

export function getActivePersistentDates() {
    let persistentDates = JSON.parse(localStorage.getItem('persistentDates')) || [];
    const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
    const activeDates = persistentDates.filter(d => d.added > twentyFourHoursAgo);
    if (activeDates.length < persistentDates.length) { localStorage.setItem('persistentDates', JSON.stringify(activeDates)); }
    return activeDates.map(d => d.date);
}
export function showConfirmationModal(title, body, onConfirm) {
    const confirmModal = document.getElementById('confirm-modal');
    document.getElementById('confirm-modal-title').textContent = title;
    document.getElementById('confirm-modal-body').textContent = body;
    const confirmBtn = document.getElementById('confirm-modal-confirm-btn');
    const cancelBtn = document.getElementById('confirm-modal-cancel-btn');
    
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    
    const closeModal = () => confirmModal.classList.remove('visible');
    
    newConfirmBtn.addEventListener('click', () => {
        onConfirm();
        closeModal();
    });
    
    cancelBtn.addEventListener('click', closeModal);
    confirmModal.classList.add('visible');
}