import type { VercelRequest, VercelResponse } from '@vercel/node'
import { atlasClientPromise, DEFAULTS } from '../_core/_db'
import { getApiText } from '../_core/_i18n'

// Regex stricte : 2 à 15 caractères, alphanumérique + accents, espaces, tirets
const NAME_REGEX = /^[a-zA-Z0-9\u00C0-\u00FF _-]{2,15}$/

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const lang = (req.query.lang as string) || DEFAULTS.LANG
  const T = getApiText(lang)

  if (req.method !== DEFAULTS.METHODS.POST)
    return res.status(405).json({ error: T.method_not_allowed })

  try {
    const {
      name,
      score,
      memberId,
      socials,
      difficulty = DEFAULTS.LEVEL,
      time
    } = req.body

    if (!name || score === undefined) throw new Error(T.params_missing)

    // 1. Validation et Nettoyage technique
    const safeScore = parseInt(score, DEFAULTS.RADIX)
    if (
      isNaN(safeScore) ||
      safeScore < DEFAULTS.SCORE_RANGE.MIN ||
      safeScore > DEFAULTS.SCORE_RANGE.MAX
    )
      throw new Error(T.invalid_score)

    const safeName = String(name).trim().substring(0, DEFAULTS.NAME_MAX)

    // VALIDATION REGEX DU NOM
    if (!NAME_REGEX.test(safeName)) {
      return res.status(400).json({ error: T.invalid_name })
    }

    const providedId = memberId
      ? String(memberId).trim().substring(0, DEFAULTS.NAME_MAX)
      : ''

    const safeSocials: Record<string, string> = {}
    if (socials && typeof socials === 'object') {
      for (const key of DEFAULTS.SOCIALS) {
        if (socials[key] && typeof socials[key] === 'string') {
          let url = socials[key]
            .trim()
            .substring(0, DEFAULTS.SOCIAL_MAX)
            .replace(/[<>]/g, '')
          if (url.length > 0) safeSocials[key] = url
        }
      }
    }

    const client = await atlasClientPromise
    if (!client) throw new Error(T.db_client_missing)
    const collection = client
      .db(DEFAULTS.DB.NAME)
      .collection(DEFAULTS.DB.SCORES)

    // 2. VÉRIFICATION D'UNICITÉ DU PSEUDO
    const existingUser = await collection.findOne({ name: safeName })

    if (existingUser) {
      // Si le nom existe mais que le memberId ne correspond pas -> Conflit (409)
      if (existingUser.memberId !== providedId) {
        return res
          .status(409)
          .json({ error: T.name_taken || 'Pseudo déjà pris' })
      }
    }

    // 3. MISE À JOUR OU CRÉATION
    await collection.updateOne(
      { name: safeName, difficulty },
      {
        $max: { score: safeScore },
        $set: {
          memberId: providedId,
          socials: safeSocials,
          time,
          updatedAt: new Date()
        },
        $setOnInsert: { createdAt: new Date() }
      },
      { upsert: true }
    )

    // 4. PURGE DU TOP 10
    const survivors = await collection
      .find({ difficulty })
      .sort({ score: -1, time: 1 })
      .limit(DEFAULTS.LB_LIMIT)
      .project({ _id: 1 })
      .toArray()

    const survivorIds = survivors.map((doc) => doc._id)
    if (survivorIds.length > 0) {
      await collection.deleteMany({
        difficulty,
        _id: { $nin: survivorIds }
      })
    }

    // 5. RETOUR DU TOP 10
    const top10 = await collection
      .find({ difficulty })
      .sort({ score: -1, time: 1 })
      .limit(DEFAULTS.LB_LIMIT)
      .project({ _id: 0 })
      .toArray()

    res.status(200).json(top10)
  } catch (e: any) {
    console.error(T.log_score, e.message)
    res.status(500).json({ error: e.message || T.server_error })
  }
}
