import { MongoClient } from 'mongodb'
import fs from 'fs'
import path from 'path'
import { getApiText } from './_i18n'

// Fallback manual dotenv loader for Vercel CLI local bug
const loadEnv = () => {
  try {
    const envPath = path.resolve(process.cwd(), '.env')
    const localEnvPath = path.resolve(process.cwd(), '.env.local')
    const parse = (file: string) => {
      if (!fs.existsSync(file)) return
      const content = fs.readFileSync(file, 'utf8')
      content.split('\n').forEach((line) => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
        if (match) {
          const key = match[1]
          let val = (match[2] || '').trim()
          if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1)
          if (!process.env[key]) process.env[key] = val
        }
      })
    }
    parse(envPath)
    parse(localEnvPath)
  } catch (e) {
    // ignore
  }
}
if (!process.env.MONGODB_URI) loadEnv()

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
  SOCIALS: ['instagram', 'x', 'facebook', 'bluesky', 'tiktok'],
  MONGO: { FAMILY: undefined, TIMEOUT: 5000, ATLAS_TIMEOUT: 15000 },
  METHODS: { POST: 'POST', GET: 'GET' }
}

const isProd = NODE_ENV === DEFAULTS.ENV.PROD
const useLocalMongo = USE_LOCAL_DB === DEFAULTS.ENV.TRUE
const uri = isProd ? MONGODB_URI : (useLocalMongo ? MONGODB_LOCAL_URI : MONGODB_URI)

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined
  var _atlasClientPromise: Promise<MongoClient> | undefined
}

// 1. Connexion principale (suit le réglage USE_LOCAL_DB)
if (!global._mongoClientPromise && uri) {
  const conn = new MongoClient(uri, {
    family: DEFAULTS.MONGO.FAMILY as any,
    serverSelectionTimeoutMS: DEFAULTS.MONGO.TIMEOUT
  })
  global._mongoClientPromise = conn.connect().catch((e) => {
    console.warn(`[DB] Connexion principale échouée (${uri}):`, e.message)
    return null as any
  })
}

// 2. Connexion Atlas forcée (dédiée au Leaderboard)
if (!global._atlasClientPromise && MONGODB_URI) {
  const atlasConn = new MongoClient(MONGODB_URI, {
    family: DEFAULTS.MONGO.FAMILY as any,
    serverSelectionTimeoutMS: DEFAULTS.MONGO.ATLAS_TIMEOUT
  })
  global._atlasClientPromise = atlasConn.connect().catch((e) => {
    console.error(`[DB] Connexion Atlas Leaderboard échouée:`, e.message)
    return null as any
  })
}

export const clientPromise = global._mongoClientPromise
export const atlasClientPromise = global._atlasClientPromise

export const getData = async (lang: string) => {
  // PLAN A : MongoDB (Atlas ou Local selon config)
  try {
    if (clientPromise) {
      const client = await clientPromise
      if (client) {
        const doc = await client
          .db(DEFAULTS.DB.NAME)
          .collection(DEFAULTS.DB.TRIVIA)
          .findOne({})
        if (doc && doc[lang]) return doc[lang]
      }
    }
  } catch (e: any) {
    if (isProd) {
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

    if (!isProd && useLocalMongo) console.error(S.log_fallback_fail, possiblePaths)
  } catch (e: any) {
    console.error(`${S.log_file_error}${e.message}`)
  }

  return null
}
