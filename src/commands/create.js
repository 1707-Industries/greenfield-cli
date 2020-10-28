const {Command, flags} = require('@oclif/command')
const cli = require('cli-ux')
const config = new (require('../config'))
const fs = require('fs')
const path = require('path')
const request = require('request')
const extract = require('extract-zip')
const replace = require('replace-in-file')
const glob = require('glob')

class CreateCommand extends Command {
  static args = [
    {name: 'name'},
  ]

  projectTemplates = {
    // api: 'https://github.com/Johnathan/API-Base/archive/master.zip',
    frontend: 'https://github.com/Johnathan/Frontend-Base/archive/master.zip',
  }

  introMessages = [
    '🙃 Nice. Another side project to work on for an hour or two and leave to rot',
    'Great. Lets get started 👍🏻',
  ]

  async run() {
    const {flags} = this.parse(CreateCommand)
    const {args} = this.parse(CreateCommand)
    cli.ux.info(this.introMessages[Math.floor(Math.random() * this.introMessages.length)])

    const name = await cli.ux.prompt('Project Name', {
      default: args.name,
    })

    const machineName = await cli.ux.prompt('Machine Name (nothing weird)', {
      default: this.slugify(name),
    })

    const projectDirectory = path.join(process.cwd(), machineName)
    fs.mkdirSync(projectDirectory)

    // Download and unzip projects
    for (const key of Object.keys(this.projectTemplates)) {
      const destination = path.join(projectDirectory, `${key}.zip`)
      const download = await this.download(this.projectTemplates[key], destination)

      let newDir = null

      await extract(path.join(projectDirectory, `${key}.zip`), {
        dir: path.join(projectDirectory),
        onEntry: (entry) => {
          if (!newDir) {
            newDir = entry.fileName
          }
        },
      })

      fs.renameSync(path.join(projectDirectory, newDir), path.join(projectDirectory, key))
      fs.rmSync(destination)
    }

    cli.ux.info('Now les get you setup locally')

    const replacements = {
      machineName,
      name,
      apiUrl: await cli.ux.prompt('API URL', {default: `api.${machineName}.test`}),
      backofficeUrl: await cli.ux.prompt('Backoffice URL', {default: `backoffice.${machineName}.test`}),
      frontendUrl: await cli.ux.prompt('Frontend URL', {default: `${machineName}.test`}),
      frontendPort: await cli.ux.prompt('Frontend Port', {default: 3000}),
    }

    for (let projectTemplatesKey in this.projectTemplates) {
      this.doReplacements(path.join(projectDirectory, projectTemplatesKey), replacements)
    }
  }

  async doReplacements(path, replacements) {
  }

  async getFiles(path) {
    const entries = await fs.readdirSync(path, {withFileTypes: true})

    // Get files within the current directory and add a path key to the file objects
    const files = entries
      .filter(file => !file.isDirectory())
      .map(file => ({...file, path: path + file.name}))

    // Get folders within the current directory
    const folders = entries.filter(folder => folder.isDirectory())

    for (const folder of folders)
      /*
        Add the found files within the subdirectory to the files array by calling the
        current function itself
      */
      files.push(...await this.getFiles(`${path}${folder.name}/`))

    return files
  }

  download(url, filename) {
    return new Promise(resolve => {
      request.head(url, () => {
        request(url).pipe(fs.createWriteStream(filename)).on('close', () => {
          resolve(filename)
        })
      })
    })
  }

  slugify(str) {
    str = str.replace(/^\s+|\s+$/g, '') // trim
    str = str.toLowerCase()

    // remove accents, swap ñ for n, etc
    const from = 'àáäâèéëêìíïîòóöôùúüûñç·/,:;'
    const to = 'aaaaeeeeiiiioooouuuunc-----'
    for (let i = 0, l = from.length; i < l; i++) {
      str = str.replace(new RegExp(from.charAt(i), 'g'), to.charAt(i))
    }

    str = str.replace(/[^a-z0-9 -]/g, '') // remove invalid chars
      .replace(/\s+/g, '-') // collapse whitespace and replace by -
      .replace(/-+/g, '-') // collapse dashes

    return str
  }
}

CreateCommand.description = `Create a new project`

CreateCommand.flags = {
  homesteadDirectory: flags.string({
    char: 'd',
    description: 'Path to laravel homestead installation',
  }),
}

module.exports = CreateCommand
