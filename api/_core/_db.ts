import { MongoClient } from 'mongodb'
import fs from 'fs'
import path from 'path'
import { getApiText } from './_i18n'

const { NODE_ENV, USE_LOCAL_DB, MONGODB_URI, MONGODB_LOCAL_URI } = process.env
const S = getApiText('fr')

export const DEFAULTS = {
  LANG: 'fr',
  LEVEL: 'medium',
  ID_SEP: '_',
  EXT_JSON: '.json',
  RADIX: 10,
  DIRS: { LOCALES: 'locales', SRC: 'src' },
  DB: { NAME: 'norml_trvknn', TRIVIA: 'trivia', SCORES: 'leaderboard' },
  ENV: { PROD: 'production', TRUE: 'true' },
  ALLOWED_LANGS: ['fr', 'en', 'es'],
  ALLOWED_LEVELS: ['easy', 'medium', 'hard'],
  SCORE_LIMIT: 20,
  LB_LIMIT: 10,
  SCORE_RANGE: { MIN: 0, MAX: 50 },
  NAME_MAX: 20,
  SOCIAL_MAX: 100,
  HEADERS: { ADMIN: 'x-admin-secret' },
  SOCIALS: ['instagram', 'x', 'facebook'],
  MONGO: { FAMILY: 4, TIMEOUT: 500 },
  METHODS: { POST: 'POST', GET: 'GET' }
}

const isLocal =
  NODE_ENV !== DEFAULTS.ENV.PROD && USE_LOCAL_DB === DEFAULTS.ENV.TRUE
const uri = isLocal ? MONGODB_LOCAL_URI! : MONGODB_URI!

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined
  var _atlasClientPromise: Promise<MongoClient> | undefined
}

// 1. Connexion principale (suit le réglage USE_LOCAL_DB)
if (!global._mongoClientPromise && uri) {
  const conn = new MongoClient(uri, {
    family: DEFAULTS.MONGO.FAMILY,
    serverSelectionTimeoutMS: DEFAULTS.MONGO.TIMEOUT
  })
  global._mongoClientPromise = conn.connect().catch((e) => Promise.reject(e))
}

// 2. Connexion Atlas forcée (dédiée au Leaderboard)
if (!global._atlasClientPromise && MONGODB_URI) {
  const atlasConn = new MongoClient(MONGODB_URI, {
    family: DEFAULTS.MONGO.FAMILY,
    serverSelectionTimeoutMS: 5000
  })
  global._atlasClientPromise = atlasConn
    .connect()
    .catch((e) => Promise.reject(e))
}

export const clientPromise = global._mongoClientPromise
export const atlasClientPromise = global._atlasClientPromise

export const getData = async (lang: string) => {
  // PLAN A : MongoDB (Atlas ou Local selon config)
  try {
    if (clientPromise) {
      const client = await clientPromise
      const doc = await client
        .db(DEFAULTS.DB.NAME)
        .collection(DEFAULTS.DB.TRIVIA)
        .findOne({})
      if (doc && doc[lang]) return doc[lang]
    }
  } catch (e: any) {
    if (!isLocal) {
      console.warn(`${S.log_db_error}${e.message}`)
      console.warn(S.log_db_fallback)
    }
  }

  // PLAN B : Fallback Fichiers Locaux
  try {
    const fileName = `${lang}${DEFAULTS.EXT_JSON}`
    const possiblePaths = [
      path.join(
        process.cwd(),
        DEFAULTS.DIRS.SRC,
        DEFAULTS.DIRS.LOCALES,
        fileName
      ),
      path.resolve(__dirname, '../../src/locales', fileName),
      path.join(process.cwd(), DEFAULTS.DIRS.LOCALES, fileName)
    ]

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'))
    }

    if (isLocal) console.error(S.log_fallback_fail, possiblePaths)
  } catch (e: any) {
    console.error(`${S.log_file_error}${e.message}`)
  }

  return null
}
