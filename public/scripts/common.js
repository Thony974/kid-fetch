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

export function getText(key, language = "fr") {
  const lang = translation[language];
  return lang ? lang[key] : undefined;
}
