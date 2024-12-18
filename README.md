## Introduction

This script will find Flutter packages of a pubspec.yaml that have not yet migrated to Swift Package Manager.<br/>
It will search for ```~/.pub-cache/hosted/pub.dev/{package}-{version}/ios/**/Package.swift```.
It may not work on some conditions :
- .pub-cache is not in your home directory
- packages that are not yet downloaded
- packages installed globally
- packages installed from a git url
- packages not hosted in pub.dev
- packages only available for macOS

## Quick start

1. Install pnpm
2. Install dependencies ```pnpm i```
3. Run the script from the root directory with the path to the pubspec.yaml to check ```pnpm start ../my-app/pubspec.yaml```

