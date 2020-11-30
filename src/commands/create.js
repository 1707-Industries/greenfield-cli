const {Command, flags} = require('@oclif/command')
const cli = require('cli-ux')
const config = new (require('../config'))
const fs = require('fs')
const path = require('path')
const request = require('request')
const extract = require('extract-zip')
const replace = require('replace-in-file')
const {exec} = require('child_process')
const yaml = require('yaml')

class CreateCommand extends Command {
  static args = [
    {name: 'name'},
  ]

  projectTemplates = {
    api: 'https://github.com/Johnathan/API-Base/archive/main.zip',
    frontend: 'https://github.com/Johnathan/Frontend-Base/archive/main.zip',
  }

  introMessages = [
    '🙃 Nice. Another side project to work on for an hour or two and leave to rot',
    'Great. Lets get started 👍🏻',
    'Well this is exciting 🥳',
    'Reckon this will be "the one"? 🤔',
  ]

  name = null
  machineName = null
  projectDirectory = null
  apiUrl = null
  backofficeUrl = null
  frontendUrl = null
  frontendPort = null

  async run() {
    const {flags} = this.parse(CreateCommand)
    const {args} = this.parse(CreateCommand)

    cli.ux.info(this.introMessages[Math.floor(Math.random() * this.introMessages.length)])
    this.name = await cli.ux.prompt('Project Name', {
      default: args.name,
    })

    this.machineName = await cli.ux.prompt('Machine Name (nothing weird)', {
      default: this.slugify(this.name),
    })

    this.apiUrl = await cli.ux.prompt('API URL', {default: `api.${this.machineName}.test`})
    this.backofficeUrl = await cli.ux.prompt('Backoffice URL', {default: `backoffice.${this.machineName}.test`})
    this.frontendUrl = await cli.ux.prompt('Frontend URL', {default: `${this.machineName}.test`})
    this.frontendPort = await cli.ux.prompt('Frontend Port', {default: 3000})

    this.projectDirectory = path.join(process.cwd(), this.machineName)

    // Create the project directory
    fs.mkdirSync(this.projectDirectory)

    cli.ux.info('Two secs, just downloading the template projects')
    await this.downloadAndExtractTemplates(this.projectDirectory)

    await this.createDotEnvFiles()

    cli.ux.info('Cool. Now lets get you setup')
    await this.performTextReplacements()

    await this.addToHosts()

    // Install frontend dependencies
    await this.installFrontendDependencies()

    await this.addProjectToHomestead()

    await this.installBackendDependencies()
  }

  async performTextReplacements() {

    const replacements = {
      machineName: this.machineName,
      name: this.name,
      apiUrl: this.apiUrl,
      backofficeUrl: this.backofficeUrl,
      frontendUrl: this.frontendUrl,
      frontendPort: this.frontendPort,
    }

    for (let projectTemplatesKey in this.projectTemplates) {
      const replacementPath = [
        `${path.join(this.projectDirectory, projectTemplatesKey)}/**/*`,
        `${path.join(this.projectDirectory, projectTemplatesKey)}/.env`,
      ]

      this.replaceInPath(replacementPath, replacements)
    }
  }

  async downloadAndExtractTemplates() {
    for (const key of Object.keys(this.projectTemplates)) {
      const destination = path.join(this.projectDirectory, `${key}.zip`)
      await this.download(this.projectTemplates[key], destination)

      let newDir = null

      await extract(path.join(this.projectDirectory, `${key}.zip`), {
        dir: path.join(this.projectDirectory),
        onEntry: (entry) => {
          if (!newDir) {
            newDir = entry.fileName
          }
        },
      })

      fs.renameSync(path.join(this.projectDirectory, newDir), path.join(this.projectDirectory, key))
      fs.rmSync(destination)
    }
  }

  replaceInPath(replacementPath, replacements) {
    const keys = Object.keys(replacements)

    for (let index in keys) {
      let key = keys[index]
      const value = replacements[key]

      // ew.
      key = `\\{\\[${key}\\]\\}`

      const regex = new RegExp(key, 'g')

      replace.sync({
        files: replacementPath,
        from: regex,
        to: value,
      })
    }
  }

  download(url, filename) {
    const options = {
      url,
      headers: {
        'Cache-Control': 'no-cache',
      },
    }

    return new Promise(resolve => {
      request.head(url, () => {
        request(options).pipe(fs.createWriteStream(filename)).on('close', () => {
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

  async createDotEnvFiles() {
    for (const key of Object.keys(this.projectTemplates)) {
      const location = path.join(this.projectDirectory, key)
      fs.copyFileSync(path.join(location, '.env.example'), path.join(location, '.env'))
    }
  }

  async addToHosts() {
    let homesteadIp = await config.get('homesteadIp')

    if (!homesteadIp) {
      homesteadIp = await cli.ux.prompt('Homestead IP Address', {
        default: '192.168.10.10',
      })

      config.set('homesteadIp', homesteadIp)
    }

    // don't know how to do this without doing EVERYTHING as sudo
    cli.ux.info('Add the following lines to /etc/hosts')
    cli.ux.info(`${homesteadIp} ${this.apiUrl}`)
    cli.ux.info(`${homesteadIp} ${this.backofficeUrl}`)
    cli.ux.info(`127.0.0.1 ${this.frontendUrl}`)
  }

  async installFrontendDependencies() {
    cli.ux.info('Installing frontend dependencies 🖍')
    exec(`cd ${path.join(this.projectDirectory, 'frontend')} && yarn`, (error, stdout, stderr) => {
    })
  }

  async addProjectToHomestead() {
    cli.ux.info('Adding project to Homestead, this can take a few minutes.')
    const homesteadYamlPath = path.join(await config.get('homesteadDirectory'), 'Homestead.yaml')
    const homesteadYaml = fs.readFileSync(homesteadYamlPath, 'utf8')
    const parsedYaml = yaml.parse(homesteadYaml)
    const homesteadProjectDirectory = path.join('/home/vagrant/code/', this.machineName, 'backend')

    // Add to folders
    parsedYaml.folders.push({
      map: path.join(this.projectDirectory, 'backend'),
      to: homesteadProjectDirectory,
    })

    // Add to sites
    parsedYaml.sites.push({
      map: this.backofficeUrl,
      to: path.join(homesteadProjectDirectory, 'public'),
    })

    parsedYaml.sites.push({
      map: this.apiUrl,
      to: path.join(homesteadProjectDirectory, 'public'),
    })

    // Add database
    parsedYaml.databases.push(this.machineName)

    // Add test database
    parsedYaml.databases.push(`${this.machineName}_test`)

    // fs.writeFileSync(homesteadYamlPath, yaml.stringify(parsedYaml));

    // Reload vagrant
    exec(`cd ${await config.get('homesteadDirectory')} && vagrant up && vagrant reload --provision`)
  }

  async buildHomesteadCommand(command) {
    const homesteadDirectory = await config.get('homesteadDirectory')
    return `cd ${homesteadDirectory} && vagrant ssh -c "cd /home/vagrant/code/${this.machineName}/backend && ${command}"`
  }

  async installBackendDependencies() {
    const command = await this.buildHomesteadCommand('php -d memory_limit=-1 $(which composer) install')
    console.log(command)
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.log(`error: ${error.message}`)
        return
      }
      if (stderr) {
        console.log(`stderr: ${stderr}`)
        return
      }
      console.log(`stdout: ${stdout}`)
    })
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
