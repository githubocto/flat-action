import * as core from '@actions/core'
import { exec } from '@actions/exec'
import fetchHTTP from './backends/http'
import fetchSQL from './backends/sql'
import { getConfig, isHTTPConfig, isSQLConfig } from './config'
import { diff } from './git'

async function run(): Promise<void> {
  core.info('[INFO] Usage https://github.com/githubocto/flat#readme')
  core.startGroup('Configuration')
  const config = getConfig()
  const username = 'flat-data'
  await exec('git', ['config', 'user.name', username])
  await exec('git', [
    'config',
    'user.email',
    `${username}@users.noreply.github.com`,
  ])
  core.endGroup()

  core.startGroup('Fetch data')
  let filename = ''
  if (isHTTPConfig(config)) {
    filename = await fetchHTTP(config)
  } else if (isSQLConfig(config)) {
    filename = await fetchSQL(config)
  } else {
    // typescript should preclude us from ever being here
    // because config is HTTPConfig | SQLConfig
    // But to be on the safe side, blow up if execution
    // has reached this point.
    core.setFailed('Unable to read a coherent action configuration')
  }
  core.endGroup()

  core.startGroup('Calculating diffstat')
  await exec('git', ['add', '-A'])
  const bytes = await diff()
  core.setOutput('delta_bytes', bytes)
  core.endGroup()

  if (bytes === 0) {
    return
  }

  core.startGroup('Committing new data')
  const sign = bytes >= 0 ? '+' : ''
  const date = new Date().toISOString()
  const msg = `Latest data: ${date} (${sign}${bytes}b)`
  const meta = JSON.stringify(
    {
      files: [{ name: filename, deltaBytes: bytes, date: date }],
    },
    undefined,
    2
  )
  core.info(`Committing "${msg}"`)
  core.debug(meta)
  await exec('git', ['commit', '-m', msg + '\n' + meta])
  await exec('git', ['push'])
  core.endGroup()
}

run().catch(error => {
  core.setFailed('Workflow failed! ' + error.message)
})
