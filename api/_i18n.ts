// api/_i18n.ts

const MESSAGES: Record<string, any> = {
  fr: {
    db_empty: 'Base de données vide',
    lang_missing: 'Langue introuvable',
    pool_missing: "Pas de 'questions_pool' trouvé dans la langue",
    level_empty: 'Aucune question pour le niveau',
    params_missing: 'Données manquantes : questionId ou userIndex',
    structure_invalid: 'Structure de données invalide',
    level_missing: 'Niveau introuvable',
    question_missing: 'Question introuvable',
    method_not_allowed: 'Méthode non autorisée'
  },
  en: {
    db_empty: 'Database empty',
    lang_missing: 'Language not found',
    pool_missing: "No 'questions_pool' found for language",
    level_empty: 'No questions for level',
    params_missing: 'Missing data: questionId or userIndex',
    structure_invalid: 'Invalid data structure',
    level_missing: 'Level not found',
    question_missing: 'Question not found',
    method_not_allowed: 'Method not allowed'
  }
}

export const getApiText = (lang: string) => {
  return MESSAGES[lang] || MESSAGES['fr']
}
