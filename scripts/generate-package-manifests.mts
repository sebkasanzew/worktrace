import fs from 'node:fs/promises';

interface ArtifactInfo {
  file: string;
  sha256: string;
  version: string;
}

interface Hashes {
  [key: string]: ArtifactInfo;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Usage: node generate-package-manifests.mts <path-to-hashes-json>...');
    process.exit(1);
  }

  const mergedHashes: Hashes = {};
  let version = '';

  for (const filePath of args) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(content);
      Object.assign(mergedHashes, data);
      
      // Assume all have same version
      const firstKey = Object.keys(data)[0];
      if (firstKey && data[firstKey].version) {
        version = data[firstKey].version;
      }
    } catch (e) {
      console.warn(`Failed to read/parse ${filePath}:`, e);
    }
  }

  if (!version) {
    console.error('No version found in hashes');
    process.exit(1);
  }

  console.log(`Generating manifests for version ${version}...`);
  console.log('Available artifacts:', Object.keys(mergedHashes));

  await generateHomebrewCask(version, mergedHashes);
  await generateScoopManifest(version, mergedHashes);
}

async function generateHomebrewCask(version: string, hashes: Hashes) {
  const armHash = hashes['macos-aarch64'];
  const intelHash = hashes['macos-x86_64'];

  if (!armHash && !intelHash) {
    console.log('No macOS artifacts found, skipping Homebrew Cask.');
    return;
  }

  let caskContent = `cask "worktrace" do
  version "${version}"
`;

  if (armHash && intelHash) {
    caskContent += `  sha256 arm:   "${armHash.sha256}",
         intel: "${intelHash.sha256}"

  arch arm: "aarch64", intel: "x64"
  
  url "https://github.com/sebkasanzew/worktrace/releases/download/v#{version}/Worktrace_#{version}_#{arch}.dmg"
`;
  } else if (armHash) {
    caskContent += `  sha256 "${armHash.sha256}"
  
  url "https://github.com/sebkasanzew/worktrace/releases/download/v#{version}/${armHash.file}"
`;
  } else if (intelHash) {
    caskContent += `  sha256 "${intelHash.sha256}"
  
  url "https://github.com/sebkasanzew/worktrace/releases/download/v#{version}/${intelHash.file}"
`;
  }

  caskContent += `
  name "Worktrace"
  desc "Time tracking and JIRA integration tool"
  homepage "https://github.com/sebkasanzew/worktrace"

  app "Worktrace.app"

  zap trash: [
    "~/Library/Application Support/com.worktrace.desktop",
    "~/Library/Caches/com.worktrace.desktop",
    "~/Library/Preferences/com.worktrace.desktop.plist",
    "~/Library/Saved Application State/com.worktrace.desktop.savedState",
  ]
end
`;

  await fs.writeFile('worktrace.rb', caskContent);
  console.log('Generated worktrace.rb');
}

async function generateScoopManifest(version: string, hashes: Hashes) {
  const x64Hash = hashes['windows-x86_64'];
  // Scoop mainly supports x64 for Windows usually, but can do arm64 too.
  // We'll focus on x64 for now as that's what we likely have.
  
  if (!x64Hash) {
    console.log('No Windows x64 artifact found, skipping Scoop manifest.');
    return;
  }

  const manifest = {
    version: version,
    description: "Time tracking and JIRA integration tool",
    homepage: "https://github.com/sebkasanzew/worktrace",
    license: "MIT",
    architecture: {
      "64bit": {
        "url": `https://github.com/sebkasanzew/worktrace/releases/download/v${version}/${x64Hash.file}`,
        "hash": x64Hash.sha256
      }
    },
    bin: "Worktrace.exe",
    checkver: "github",
    autoupdate: {
      architecture: {
        "64bit": {
          "url": "https://github.com/sebkasanzew/worktrace/releases/download/v$version/Worktrace_${version}_x64-setup.exe"
        }
      }
    }
  };

  // Note: The autoupdate url might need adjustment based on actual file naming pattern.
  // The hash-artifacts script captures the actual filename in `x64Hash.file`.
  // If the filename follows a pattern, we can use $version.
  // Current pattern seems to be: Worktrace_${version}_x64-setup.exe (NSIS default)
  // Let's verify the file name from the hash info.
  
  // If the file name is exactly `Worktrace_${version}_x64-setup.exe`, then the autoupdate URL is correct.
  // If it's different, we might need to adjust.
  
  await fs.writeFile('worktrace.json', JSON.stringify(manifest, null, 2));
  console.log('Generated worktrace.json');
}

main();
