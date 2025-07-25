const translation = {
  fr: {
    coming_to_get: "Je viens récupérer...",
    call: "Appeler",
    cancel: "Annuler",
    ordered: "Appel...",
    preparing: "Se prépare...",
    done: "Terminé",
  },
};

/**
 * Translation function from key and language code
 * @param {*} key - Translation key string
 * @param {*} language - Translation language code (default "fr")
 * @returns - Translated text
 */
export function getText(key, language = "fr") {
  const lang = translation[language];
  return lang ? lang[key] : undefined;
}

/**
 * Sort list of pending data by status order
 * @param {*} data - List of data (type of Data)
 * @param {*} order - Data status order desired
 */
export function sortDataByStatus(data, order) {
  data.sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status));
}
