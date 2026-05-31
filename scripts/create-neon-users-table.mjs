import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { neon } from '@neondatabase/serverless';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const drizzleDir = path.resolve(__dirname, '../drizzle');

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required.');
}

const sql = neon(process.env.DATABASE_URL);
const ignorableErrorCodes = new Set([
  '42P07', // duplicate_table / duplicate_relation
  '42710', // duplicate_object
  '42701', // duplicate_column
]);

function splitSqlStatements(content) {
  const statements = [];
  let current = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let dollarTag = null;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const nextTwo = content.slice(index, index + 2);

    if (!inSingleQuote && !inDoubleQuote && !dollarTag && nextTwo === '--') {
      while (index < content.length && content[index] !== '\n') {
        index += 1;
      }
      current += '\n';
      continue;
    }

    if (!inSingleQuote && !inDoubleQuote && char === '$') {
      const rest = content.slice(index);
      const dollarMatch = rest.match(/^\$[A-Za-z0-9_]*\$/);
      if (dollarMatch) {
        const tag = dollarMatch[0];
        current += tag;
        index += tag.length - 1;
        if (dollarTag === tag) {
          dollarTag = null;
        } else if (!dollarTag) {
          dollarTag = tag;
        }
        continue;
      }
    }

    if (!dollarTag && !inDoubleQuote && char === '\'' && content[index - 1] !== '\\') {
      inSingleQuote = !inSingleQuote;
      current += char;
      continue;
    }

    if (!dollarTag && !inSingleQuote && char === '"' && content[index - 1] !== '\\') {
      inDoubleQuote = !inDoubleQuote;
      current += char;
      continue;
    }

    if (!inSingleQuote && !inDoubleQuote && !dollarTag && char === ';') {
      const statement = current.trim();
      if (statement) {
        statements.push(statement);
      }
      current = '';
      continue;
    }

    current += char;
  }

  const tail = current.trim();
  if (tail) {
    statements.push(tail);
  }

  return statements;
}

const migrationFiles = (await fs.readdir(drizzleDir))
  .filter((fileName) => fileName.endsWith('.sql'))
  .sort((left, right) => left.localeCompare(right));

for (const fileName of migrationFiles) {
  const filePath = path.join(drizzleDir, fileName);
  const sqlContent = await fs.readFile(filePath, 'utf8');
  const statements = splitSqlStatements(sqlContent);

  for (const statement of statements) {
    try {
      await sql.query(statement);
    } catch (error) {
      const code = error && typeof error === 'object' && 'code' in error ? error.code : null;
      if (code && ignorableErrorCodes.has(String(code))) {
        continue;
      }
      throw error;
    }
  }
}

const rows = await sql.query(`
  select table_name
  from information_schema.tables
  where table_schema = 'public'
  order by table_name
`);

console.log(
  JSON.stringify(
    {
      appliedMigrations: migrationFiles,
      tableCount: rows.length,
      tables: rows.map((row) => row.table_name),
    },
    null,
    2,
  ),
);
