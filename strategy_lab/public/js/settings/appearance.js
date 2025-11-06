export async function initializeAppearanceSettings() {
  const themeSelector = document.getElementById('theme-selector');
  const fontSelector = document.getElementById('font-selector');

  let settings = {};
  let availableFonts = []; // Store available fonts with their sizes

  try {
    const settingsResponse = await fetch('/api/settings');
    settings = await settingsResponse.json();
    if (settings.theme) {
      document.body.dataset.theme = settings.theme;
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
  }

  if (themeSelector) {
    try {
      const response = await fetch('/api/themes');
      const themes = await response.json();
      themes.forEach(theme => {
        const option = document.createElement('option');
        option.value = theme.data_theme;
        option.textContent = theme.name;
        themeSelector.appendChild(option);
      });

      if (settings.theme) {
        themeSelector.value = settings.theme;
      }

      themeSelector.addEventListener('change', (event) => {
        document.body.dataset.theme = event.target.value;
      });
    } catch (error) {
      console.error('Failed to load themes:', error);
    }
  }

  if (fontSelector) {
    try {
      const response = await fetch('/api/fonts');
      availableFonts = await response.json(); // Store fonts with sizes
      availableFonts.forEach(font => {
        const option = document.createElement('option');
        option.value = font.font_family;
        option.textContent = font.name;
        fontSelector.appendChild(option);
      });

      if (settings.font) {
        fontSelector.value = settings.font;
        // Apply font size from settings
        const selectedFont = availableFonts.find(f => f.font_family === settings.font);
        if (selectedFont) {
          document.documentElement.style.setProperty('--font-family-base', selectedFont.font_family);
          document.documentElement.style.setProperty('--font-size-base', `${selectedFont.font_size}em`);
        }
      }

      fontSelector.addEventListener('change', (event) => {
        const selectedFont = availableFonts.find(f => f.font_family === event.target.value);
        if (selectedFont) {
          document.documentElement.style.setProperty('--font-family-base', selectedFont.font_family);
          document.documentElement.style.setProperty('--font-size-base', `${selectedFont.font_size}em`);
        }
      });
    } catch (error) {
      console.error('Failed to load fonts:', error);
    }
  }
}