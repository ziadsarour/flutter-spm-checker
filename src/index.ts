import { homedir } from 'os';
import { readdirSync as fsReaddirSync, readFileSync as fsReadFileSync, existsSync as fsExistsSync, lstatSync as fsLstatSync } from 'fs';
import { join as pathJoin } from 'path';
import { parse as yamlParse } from 'yaml';
import { chain as _chain, groupBy as _groupBy } from 'lodash-es';


/* Pubspec */
const pubspecPath = process.argv[2] ?? '';

if (!pubspecPath) {
  console.error('pubspec path is missing');
  process.exit(1);
}

const pubspecContent = fsReadFileSync(pubspecPath, { encoding: 'utf-8' });
const pubspecJson = yamlParse(pubspecContent);
const pubspecJsonDependencies = (pubspecJson.dependencies ?? {}) as Record<string, unknown>;
const pubspecJsonDevDependencies = (pubspecJson.dev_dependencies ?? {}) as Record<string, unknown>;

const dependencies: {
  name: string;
  version: string;
  directory: string;
  spm: ReturnType<typeof searchSpm>;
}[] = _chain([pubspecJsonDependencies, pubspecJsonDevDependencies])
  .map(deps => {
    return Object.keys(deps)
      .filter(k => deps[k] && typeof deps[k] === 'string')
      .map(k => {
        return {
          name: k,
          version: deps[k] as string,
          directory: `${k}-${deps[k]}`,
          spm: 'not-downloaded' as ReturnType<typeof searchSpm>,
        };
      });
  })
  .flatten()
  .uniq()
  .sort((a, b) => a.directory < b.directory ? -1 : 1)
  .value();


/* Functions */
function searchSpm(options: {
  depth: number;
  path: string;
}): 'found' | 'not-found' | 'not-ios' | 'not-downloaded' {
  const isRoot = options.depth === 0;

  const items = fsReaddirSync(options.path)
    .map(item => ({ name: item, path: pathJoin(options.path, item), stat: fsLstatSync(pathJoin(options.path, item)) }))
    .filter(item => (!isRoot && item.stat.isFile()) || (item.stat.isDirectory() && (!isRoot || item.name === 'ios')))
    .sort((a, b) => `${a.stat.isFile() ? 0 : 1}#${a.path}` < `${b.stat.isFile() ? 0 : 1}#${b.path}` ? -1 : 1);

  if (isRoot && !items.some(i => i.stat.isDirectory() && i.name === 'ios')) {
    return 'not-ios';
  }

  for (const item of items) {
    if (item.stat.isFile() && item.name === 'Package.swift') {
      return 'found';
    } else if (item.stat.isDirectory()) {
      const spm = searchSpm({
        depth: options.depth + 1,
        path: item.path,
      });

      switch (spm) {
        case 'found':
          return spm;
        case 'not-found':
          break;
        case 'not-ios':
          break;
      }
    }
  }

  return 'not-found';
}

function logResult(options: {
  title: string;
  dependencies?: typeof dependencies;
}) {
  if (options.dependencies?.length) {
    console.log(`${options.title} (${options.dependencies.length}/${dependencies.length})`);
    options.dependencies.forEach(dependency => console.log(`· ${dependency.name} ${dependency.version}`));
    console.log('');
  }
}


/* Pub */
const pubPath = pathJoin(homedir(), '.pub-cache', 'hosted', 'pub.dev');

for (const dependency of dependencies) {
  const dependencyPath = pathJoin(pubPath, dependency.directory);
  const dependencyExists = fsExistsSync(dependencyPath);

  if (dependencyExists) {
    dependency.spm = searchSpm({
      depth: 0,
      path: dependencyPath,
    });
  }
}


/* Result */
const dependenciesBySpm = _groupBy(dependencies, dependency => dependency.spm ?? 'not-found');

logResult({ title: '🟢 Packages using Swift Package Manager', dependencies: dependenciesBySpm['found']});
logResult({ title: '🔴 Packages not using Swift Package Manager', dependencies: dependenciesBySpm['not-found']});
logResult({ title: '⚪️ Packages not built for iOS', dependencies: dependenciesBySpm['not-ios']});
logResult({ title: '⚫️ Packages not downloaded', dependencies: dependenciesBySpm['not-downloaded']});
