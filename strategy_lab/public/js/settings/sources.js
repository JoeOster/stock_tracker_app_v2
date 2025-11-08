export function initializeSources() {
  const sourceTypeSelect = document.getElementById('source-type');
  const dynamicFieldsDiv = document.getElementById('dynamic-fields');
  const addSourceBtn = document.getElementById('add-source-btn');

  if (sourceTypeSelect) {
    sourceTypeSelect.addEventListener('change', () => {
      renderDynamicFields(sourceTypeSelect.value, dynamicFieldsDiv);
    });
  }

  if (addSourceBtn) {
    addSourceBtn.addEventListener('click', addSource);
  }

  // Initial render in case a type is pre-selected (though not expected here)
  renderDynamicFields(sourceTypeSelect ? sourceTypeSelect.value : '', dynamicFieldsDiv);
}

function renderDynamicFields(sourceType, container) {
  container.innerHTML = ''; // Clear previous fields

  let fieldsHtml = '';

  switch (sourceType) {
    case 'person':
      fieldsHtml = `
        <div class="form-group">
          <label for="person-contact-email">Contact Email (Optional):</label>
          <input type="email" id="person-contact-email" />
        </div>
        <div class="form-group">
          <label for="person-contact-phone">Contact Phone (Optional):</label>
          <input type="tel" id="person-contact-phone" />
        </div>
        <div class="form-group">
          <label for="person-contact-app">Contact App (Optional):</label>
          <input type="text" id="person-contact-app" placeholder="Signal, WhatsApp, etc." />
        </div>
        <div class="form-group">
          <label for="person-app-handle">App Handle (Optional):</label>
          <input type="text" id="person-app-handle" />
        </div>
      `;
      break;
    case 'group':
      fieldsHtml = `
        <div class="form-group">
          <label for="group-primary-contact">Primary Contact (Optional):</label>
          <input type="text" id="group-primary-contact" />
        </div>
        <div class="form-group">
          <label for="group-contact-email">Contact Email (Optional):</label>
          <input type="email" id="group-contact-email" />
        </div>
        <div class="form-group">
          <label for="group-contact-phone">Contact Phone (Optional):</label>
          <input type="tel" id="group-contact-phone" />
        </div>
        <div class="form-group">
          <label for="group-contact-app">Contact App (Optional):</label>
          <input type="text" id="group-contact-app" placeholder="Signal, WhatsApp, etc." />
        </div>
        <div class="form-group">
          <label for="group-app-handle">App Handle (Optional):</label>
          <input type="text" id="group-app-handle" />
        </div>
      `;
      break;
    case 'book':
      fieldsHtml = `
        <div class="form-group">
          <label for="book-author">Author (Optional):</label>
          <input type="text" id="book-author" />
        </div>
        <div class="form-group">
          <label for="book-isbn">ISBN (Optional):</label>
          <input type="text" id="book-isbn" />
        </div>
        <div class="form-group">
          <label for="book-website-links">Website Links (Optional, one per line):</label>
          <textarea id="book-website-links" rows="3"></textarea>
        </div>
        <div class="form-group">
          <label for="book-pdf-links">PDF/Document Links (Optional, one per line):</label>
          <textarea id="book-pdf-links" rows="3"></textarea>
        </div>
      `;
      break;
    case 'website':
      fieldsHtml = `
        <div class="form-group">
          <label for="website-relevant-links">Relevant Links (Optional, one per line):</label>
          <textarea id="website-relevant-links" rows="3"></textarea>
        </div>
        <div class="form-group">
          <label for="website-saved-documents">Saved Documents (Optional, one per line):</label>
          <textarea id="website-saved-documents" rows="3"></textarea>
        </div>
      `;
      break;
    default:
      fieldsHtml = '<p>Select a source type to see available fields.</p>';
      break;
  }
  container.innerHTML = fieldsHtml;
}

function addSource() {
  const sourceType = document.getElementById('source-type').value;
  if (!sourceType) {
    alert('Please select a source type.');
    return;
  }

  const sourceData = {
    type: sourceType,
  };

  // Collect data based on source type
  switch (sourceType) {
    case 'person':
      sourceData.contactEmail = document.getElementById('person-contact-email').value;
      sourceData.contactPhone = document.getElementById('person-contact-phone').value;
      sourceData.contactApp = document.getElementById('person-contact-app').value;
      sourceData.appHandle = document.getElementById('person-app-handle').value;
      break;
    case 'group':
      sourceData.primaryContact = document.getElementById('group-primary-contact').value;
      sourceData.contactEmail = document.getElementById('group-contact-email').value;
      sourceData.contactPhone = document.getElementById('group-contact-phone').value;
      sourceData.contactApp = document.getElementById('group-contact-app').value;
      sourceData.appHandle = document.getElementById('group-app-handle').value;
      break;
    case 'book':
      sourceData.author = document.getElementById('book-author').value;
      sourceData.isbn = document.getElementById('book-isbn').value;
      sourceData.websiteLinks = document.getElementById('book-website-links').value.split('\n').filter(link => link.trim() !== '');
      sourceData.pdfLinks = document.getElementById('book-pdf-links').value.split('\n').filter(link => link.trim() !== '');
      break;
    case 'website':
      sourceData.relevantLinks = document.getElementById('website-relevant-links').value.split('\n').filter(link => link.trim() !== '');
      sourceData.savedDocuments = document.getElementById('website-saved-documents').value.split('\n').filter(link => link.trim() !== '');
      break;
  }

  console.log('Adding source:', sourceData);
  // Here you would typically send this data to your backend API
  alert('Source added (check console for data): ' + JSON.stringify(sourceData, null, 2));

  // Optionally, clear the form or update a list of sources
}