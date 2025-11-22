import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function mergeLatestJson() {
  try {
    const args = process.argv.slice(2);
    if (args.length === 0) {
      console.error('Usage: node merge-latest-json.mts <file1> <file2> ...');
      process.exit(1);
    }

    let finalJson: any = null;

    for (const file of args) {
      console.log(`Processing ${file}...`);
      const content = await fs.readFile(file, 'utf-8');
      const json = JSON.parse(content);

      if (!finalJson) {
        finalJson = json;
      } else {
        // Merge platforms
        if (json.platforms) {
          finalJson.platforms = {
            ...finalJson.platforms,
            ...json.platforms
          };
        }
        // Keep the latest pub_date if different? Usually they are close.
        // We'll just stick to the first one's metadata for version/notes.
      }
    }

    if (finalJson) {
      const outputPath = 'latest.json';
      await fs.writeFile(outputPath, JSON.stringify(finalJson, null, 2));
      console.log(`Successfully merged ${args.length} files into ${outputPath}`);
    } else {
      console.error('No valid JSON data found.');
      process.exit(1);
    }

  } catch (error) {
    console.error('Error merging latest.json files:', error);
    process.exit(1);
  }
}

mergeLatestJson();
