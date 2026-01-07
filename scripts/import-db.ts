import { MongoClient } from 'mongodb'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
import { client, DEFAULTS } from '../api/_core/_db'
import { getApiText } from '../api/_core/_i18n'

dotenv.config()
const T = getApiText(DEFAULTS.LANG)

async function run() {
  try {
    console.log(T.log_import_conn)
    await client.connect()

    const db = client.db(DEFAULTS.DB.NAME)
    const collection = db.collection(DEFAULTS.DB.TRIVIA)

    const globalDoc: any = { updatedAt: new Date() }

    for (const lang of DEFAULTS.ALLOWED_LANGS) {
      const fileName = `${lang}${DEFAULTS.EXT_JSON}`
      const filePath = path.join(process.cwd(), DEFAULTS.DIRS.LOCALES, fileName)

      if (fs.existsSync(filePath)) {
        globalDoc[lang] = JSON.parse(fs.readFileSync(filePath, 'utf8'))
        console.log(`- ${lang} OK`)
      }
    }

    await collection.replaceOne({}, globalDoc, { upsert: true })
    console.log(T.log_import_success)
  } catch (err: any) {
    console.error(T.log_import_error, err.message)
  } finally {
    await client.close()
  }
}

run()
