const core = require('@actions/core')
const fs = require('fs')
const path = require('path')

const signLib = require('./sign')

const walkSync = require('walk-sync')

function findReleaseFile(releaseDir) {
  return walkSync(releaseDir, {globs: ['**/*.apk']})
}

async function run() {
  try {
    const buildDir = core.getInput('buildDirectory') || './config'
    const output = core.getInput('output') || path.join('build', 'signed')

    const releaseDirs = core.getInput('releaseDirectory').split('\n').filter(it => it !== '')
    const signingKeyBase64 = core.getInput('signingKeyBase64')
    const alias = core.getInput('alias')
    const keyStorePassword = core.getInput('keyStorePassword')
    const keyPassword = core.getInput('keyPassword')
    const signingKey = path.join(buildDir, 'signingKey.jks')
    if (!fs.existsSync(buildDir)) {
      fs.mkdirSync(buildDir, {recursive: true})
    }
    fs.writeFileSync(signingKey, signingKeyBase64, 'base64')
    if (!fs.existsSync(output)) {
      fs.mkdirSync(output, {recursive: true})
    }
    for (const releaseDir of releaseDirs) {
      const releaseFiles = findReleaseFile(releaseDir)
      for (const releaseFile of releaseFiles) {
        if (releaseFile !== undefined) {
          const releaseFilePath = path.join(releaseDir, releaseFile)
          let signedReleaseFile = ''
          if (releaseFile.endsWith('.apk')) {
            signedReleaseFile = await signLib.signApkFile(releaseFilePath, signingKey, alias, keyStorePassword, keyPassword)
          } else if (releaseFile.endsWith('.aab')) {
            signedReleaseFile = await signLib.signAabFile(releaseFilePath, signingKey, alias, keyStorePassword, keyPassword)
          } else {
            core.error('No valid release file to sign, abort.')
            core.setFailed('No valid release file to sign.')
          }
          fs.copyFileSync(signedReleaseFile, path.join(output, signedReleaseFile.split(/(\\|\/)/g).pop() || releaseFile))
        } else {
          core.error('No release file (.apk or .aab) could be found. Abort.')
          core.setFailed('No release file (.apk or .aab) could be found.')
        }
      }
    }
  } catch (error) {
    core.setFailed(error.message)
  }
}

core.info('sign run ...')

run().then(r => {
  core.info('android-sign finished successfully')
})
