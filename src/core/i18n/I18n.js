/**
 * I18n.js
 * Lightweight Internationalization & Localization Manager.
 */
import enDictionary from '../../locales/en.json' with { type: 'json' };

class I18nManager {
  constructor() {
    this.locales = {
      en: enDictionary,
    };
    this.currentLocale = 'en';
  }

  setLocale(localeCode) {
    if (this.locales[localeCode]) {
      this.currentLocale = localeCode;
    }
  }

  getLocale() {
    return this.currentLocale;
  }

  /**
   * Translate key with optional parameter substitution.
   * e.g. t('hud.cash') or t('components.COMPUTE_POD.name')
   */
  t(key, params = {}) {
    const dict = this.locales[this.currentLocale] || this.locales.en;
    const parts = key.split('.');
    let val = dict;
    for (const part of parts) {
      if (val && typeof val === 'object' && part in val) {
        val = val[part];
      } else {
        return key;
      }
    }
    if (typeof val === 'string') {
      return val.replace(/\{(\w+)\}/g, (_, k) => (params[k] !== undefined ? params[k] : `{${k}}`));
    }
    return val || key;
  }
}

export const I18n = new I18nManager();
export const t = (key, params) => I18n.t(key, params);
