<p align="center">
  <img src="docs/logo.png" width=400>
</p>

<p align="center">
  <img src="https://img.shields.io/github/release/githubocto/flat.svg">
  <img src="https://img.shields.io/github/release-date/githubocto/flat.svg">
</p>

# Flat Data GitHub Action

👉🏽 👉🏽 👉🏽 **Full writeup**: [Flat Data Project](https://octo.github.com/projects/flat-data) 👈🏽 👈🏽 👈🏽

Flat Data is a GitHub action which makes it easy to fetch data and commit it to your repository as flatfiles. The action is intended to be run on a schedule, retrieving data from any supported target and creating a commit if there is any change to the fetched data. Flat Data builds on the [“git scraping” approach pioneered by Simon Willison](https://simonwillison.net/2020/Oct/9/git-scraping/) to offer a simple pattern for bringing working datasets into your repositories and versioning them, because developing against local datasets is faster and easier than working with data over the wire.

✨ Best used in tandem with the [Flat Editor VS Code Extension](https://marketplace.visualstudio.com/items?itemName=GitHubOCTO.flat).

## Why would I want to use this?

Flat Data aims to simplify everyday data acquisition and cleanup tasks. It runs on GitHub Actions, so there's no infrastructure to provision and monitor. Each Flat workflow fetches the data you specify, and optionally executes a postprocessing script on the fetched data. The resulting data is committed to your repository if the new data is different, with a commit message summarizing the changes. Flat workflows usually run on a periodic timer, but can be triggered by a variety of stimuli, like changes to your code, or manual triggers. That's it! No complicated job dependency graphs or orchestrators. No dependencies, libraries, or package managers. No new mental model to learn and incorporate. Just evergreen data, right in your repo.

[Read more in our writeup](https://octo.github.com/projects/flat-data).

## Examples

Check out our [example repositories](https://github.com/githubocto?q=flat-demo&type=&language=&sort=).

## Usage

### Option 1: Flat Editor VSCode Extension

The easiest way to get a Flat Data action up and running is with the accompanying [Flat Editor VSCode Extension](https://marketplace.visualstudio.com/items?itemName=GitHubOCTO.flat) which helps you author Flat yml files.

To use it, [install the extension](https://marketplace.visualstudio.com/items?itemName=GitHubOCTO.flat) and then invoke `Flat Editor` from the command palette within VSCode (Mac: ⌘⇧P, Others:ctrl-shift-P).

### Option 2: Manually create a GitHub Actions workflow yml file

In the repository where you wish to fetch data, create `.github/workflows/flat.yml`. The following example will fetch a URL every thirty minutes and commit the response, but only if the response has changed since the last commit.

```yaml
name: Flat

on:
  push:
    branches:
      - main
  workflow_dispatch:
  schedule:
    - cron: '*/30 * * * *'

jobs:
  scheduled:
    runs-on: ubuntu-latest
    steps:
      # This step installs Deno, which is a new Javascript runtime that improves on Node. Can be used for an optional postprocessing step
      - name: Setup deno
        uses: denoland/setup-deno@v1
        with:
          deno-version: v1.10.x
      # Check out the repository so it can read the files inside of it and do other operations
      - name: Check out repo
        uses: actions/checkout@v2
      # The Flat Action step. We fetch the data in the http_url and save it as downloaded_filename
      - name: Fetch data
        uses: githubocto/flat@v3
        with:
          http_url: # THE URL YOU WISH TO FETCH GOES HERE
          downloaded_filename: # The http_url gets saved and renamed in our repository. Example: data.json, data.csv, image.png
```

Note that the `schedule` parameter affects the overall workflow, which may contain other jobs and steps beyond Flat.

The `schedule` parameter uses [crontab format](https://docs.github.com/en/actions/reference/events-that-trigger-workflows#schedule). There's a [library of useful examples](https://crontab.guru/examples.html) and an interactive playground on [Crontab guru](https://crontab.guru).

## Inputs

The action currently has two fetching modes:

- `http`: GETs a supplied URL
- `sql`: Queries a SQL datastore

These two modes are exclusive; you cannot mix settings for these two in one Flat step for a workflow job.

### HTTP Mode

#### `http_url`

A URL from which to fetch data. Specifying this input puts Flat into `http` mode.

This can be any endpoint: a json, csv, png, zip, xlsx, etc.

#### `authorization` (optional)

A string used for authorizing the HTTP request. The value of this field is passed in as a header w/ the `authorization` key.

For example, if this field is set to `Bearer abc123` then the following header is sent with each request:

```json
{
  "Authorization": "Bearer abc123"
}
```

And in the action yaml:
`authorization: 'Bearer abc123'`

#### `downloaded_filename`

The name of the file to store data fetched by Flat.

In `http` mode this can be anything. This can be any endpoint: a json, csv, txt, png, zip, xlsx, etc. file

#### `postprocess` (optional)

A path to a local Deno javascript or typescript file for postprocessing the `downloaded_filename` file. Read more in the ["Postprocessing section"](https://github.com/githubocto/flat#postprocessing).

#### `mask` (optional)

If your `http_url` string contains secrets, you can choose to mask it from the commit message. You have two options:

**Option 1**: use a string boolean

`mask: true # removes the source entirely from the commit message, defaults to false`

**Option 2**: use a string array with each secret to mask

`mask: '["${{ secrets.SECRET1 }}", "${{ secrets.SECRET2 }}"]'`

### SQL Mode

#### `sql_connstring`

A URI-style database connection string. Flat will use this connection string to connect to the database and issue the query.

> ⚠️ Don't write secrets into your workflow.yml!
>
> Most connection strings contain an authentication secret like a username and password. GitHub provides an encrypted vault for secrets like these which can be used by the action when it runs. [Create a secret](https://docs.github.com/en/actions/reference/encrypted-secrets#creating-encrypted-secrets-for-a-repository) on the repository where the Flat action will run, and use that secret in your workflow.yaml like so:
>
> ```
> sql_connstring: ${{secrets.NAME_OF_THE_CREATED_SECRET}}
> ```
>
> If you're using the [flat-vscode extension](https://github.com/githubocto/flat-vscode), this is handled for you.

#### `sql_queryfile`

The pathname of the file containing the SQL query that will be issued to the database. Defaults to `.github/workflows/query.sql`. This path is relative to the root of your repo.

#### `downloaded_filename`

The name of the file to store data fetched by Flat.

In `sql` mode this should be one of `csv` or `json`. SQL query results will be serialized to disk in the specified format.

> ⚠️ While the JSON is not pretty-printed, CSV is often a more efficient serialization for tabular data.

#### `typeorm_config` (optional)

A JSON string representing a configuration passed to [TypeORMs createConnection function](https://orkhan.gitbook.io/typeorm/docs/connection-api#main-api).

A common use case for this value is connecting your [Flat action to a Heroku database](https://github.com/typeorm/typeorm/issues/278).

For instance, you can pass the following configuration string to your Flat action in order to connect to a Heroku Postgres database.

```yaml
typeorm_config: '{"ssl":true,"extra":{"ssl":{"rejectUnauthorized":false}}}'
```

#### `postprocess` (optional)

A path to a local Deno javascript or typescript file for postprocessing the `downloaded_filename` file. Read more in the ["Postprocessing section"](https://github.com/githubocto/flat#postprocessing).

## Outputs

### `delta_bytes`

A signed number describing the number of bytes that changed in this run. If the new data is smaller than the existing, committed data, this will be a negative number.

## Postprocessing

You can add a `postprocess` input in the Action which is path to a [deno](https://deno.land) Javascript or Typescript script that will be invoked to postprocess your data after it is fetched. This path is relative to the root of your repo.

The script can use either `Deno.args[0]` or the name of the `downloaded_filename` to access the file fetched by Flat Data.

```ts
import { readJSON, writeJSON } from 'https://deno.land/x/flat/mod.ts'

// The filename is the first invocation argument
const filename = Deno.args[0] // Same name as downloaded_filename
const data = await readJSON(filename)

// Pluck a specific key off
// and write it out to a different file
// Careful! any uncaught errors and the workflow will fail, committing nothing.
const newfile = `subset_of_${filename}`
await writeJSON(newfile, data.path.to.something)
```

You can use `console.log()` as much as you like within your postprocessing script; the results should show up in your actions log.

### Why Deno?

Deno's import-by-url model makes it easy to author lightweight scripts that can include dependencies without forcing you to set up a bundler.

### How is my script invoked?

The postprocessing script is invoked with `deno run -q -A --unstable {your script} {your fetched data file}`. Note that the `-A` grants your script full permissions to access network, disk — everything! Make sure you trust any dependencies you pull in, as they aren't restricted. We will likely revisit this in the future with another setting that specifies which permissions to grant deno.

### How do I do ...?

The learn more about the possibilities for postprocessing check out our [helper and examples postprocessing repo](https://github.com/githubocto/flat-postprocessing).

## Building / Releasing

1. `npm run dist` and commit the built output (yes, you read that right)
2. Bump whatever you want to bump in the `package.json` version field
3. Merge `main` into `vMAJOR` branch. `git checkout vMAJOR && git merge main`

- If this is a new major version, create the branch. `git checkout -b vMAJOR`
- Push the branch. `git push --set-upstream origin vMAJOR`

4. Create a new tag for the version: `git tag -f vMAJOR.MINOR.PATCH`
5. Push main `git checkout main && git push`
6. Navigate to https://github.com/githubocto/flat/tags and cut a new release from the tag you just pushed!

## Issues

If you run into any trouble or have questions, feel free to [open an issue](https://github.com/githubocto/flat/issues).

❤️ GitHub OCTO

## License

[MIT](LICENSE)
