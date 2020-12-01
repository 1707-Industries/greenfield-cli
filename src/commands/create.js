const {Command, flags} = require('@oclif/command')
const cli = require('cli-ux')
const config = new (require('../config'))
const fs = require('fs')
const path = require('path')
const request = require('request')
const extract = require('extract-zip')
const replace = require('replace-in-file')
const exec = require('await-exec')
const yaml = require('yaml')

class CreateCommand extends Command {
  static args = [
    {name: 'name'},
  ]

  projectTemplates = {
    backend: 'https://github.com/Johnathan/API-Base/archive/main.zip',
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
  databaseName = null
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

    this.databaseName = await cli.ux.prompt('Database Name', {default: this.machineName.replace(/-/g, '_')})
    this.apiUrl = await cli.ux.prompt('API URL', {default: `http://api.${this.machineName}.test`})
    this.backofficeUrl = await cli.ux.prompt('Backoffice URL', {default: `http://backoffice.${this.machineName}.test`})
    this.frontendUrl = await cli.ux.prompt('Frontend URL', {default: `http://${this.machineName}.test`})
    this.frontendPort = await cli.ux.prompt('Frontend Port', {default: 3000})

    this.projectDirectory = path.join(process.cwd(), this.machineName)

    // Create the project directory
    fs.mkdirSync(this.projectDirectory)

    cli.ux.info('Two secs, just downloading the template projects')
    await this.downloadAndExtractTemplates(this.projectDirectory)

    await this.createDotEnvFiles()

    await this.createPackageJson()

    const replacements = {
      machineName: this.machineName,
      name: this.name,
      apiUrl: this.apiUrl,
      backofficeUrl: this.backofficeUrl,
      frontendUrl: this.frontendUrl,
      frontendPort: this.frontendPort,
      databaseName: this.databaseName,
    }
    cli.ux.info('Cool. Now lets get you setup')
    await this.performTextReplacements(replacements)

    await this.addToHosts()

    // Install frontend dependencies
    await this.installFrontendDependencies()

    await this.addProjectToHomestead()

    await this.installBackendDependencies()

    // Set App Key
    await this.setAppKey()

    // Run Migrations
    await this.runMigrations()

    // Install Passport
    const passportCredentials = await this.installLaravelPassport()

    await this.addAPIKeyToFrontend(passportCredentials)

    await this.createAdminUser()
  }

  async performTextReplacements(replacements) {
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
    cli.ux.info('===== Add the following lines to /etc/hosts =====')
    cli.ux.info(`${homesteadIp} ${this.apiUrl}`)
    cli.ux.info(`${homesteadIp} ${this.backofficeUrl}`)
    cli.ux.info(`127.0.0.1 ${this.frontendUrl}`)
    cli.ux.info('=================================================')
  }

  async installFrontendDependencies() {
    cli.ux.info('Installing frontend dependencies 🖍')
    await exec(`cd ${path.join(this.projectDirectory, 'frontend')} && yarn`, (error, stdout, stderr) => {
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
    parsedYaml.databases.push(this.databaseName)

    // Add test database
    parsedYaml.databases.push(`${this.databaseName}_testing`)

    fs.writeFileSync(homesteadYamlPath, yaml.stringify(parsedYaml))

    // Reload vagrant
    cli.ux.info('Provisioning your Vagrant box - twss')
    await exec(`cd ${await config.get('homesteadDirectory')} && vagrant up && vagrant reload --provision`, (error, stdout, stderr) => {
      console.log('????')
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

  async buildHomesteadCommand(command) {
    const homesteadDirectory = await config.get('homesteadDirectory')
    return `cd ${homesteadDirectory} && vagrant ssh -c "cd /home/vagrant/code/${this.machineName}/backend && ${command}"`
  }

  async executeCommand(command) {
    return await exec(command)
  }

  async installBackendDependencies() {
    const command = await this.buildHomesteadCommand('php -d memory_limit=-1 $(which composer) install')
    await exec(command, (error, stdout, stderr) => {
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

  async setAppKey() {
    cli.ux.info('Setting Laravel Key')
    const command = await this.buildHomesteadCommand('php artisan key:generate')
    await this.executeCommand(command)
  }

  async runMigrations() {
    cli.ux.info('Running Migrations')
    const command = await this.buildHomesteadCommand('php artisan migrate')
    await this.executeCommand(command)
  }

  async installLaravelPassport() {
    cli.ux.info('Installing Laravel Passport')
    const command = await this.buildHomesteadCommand('php artisan passport:install --force')
    const execution = await this.executeCommand(command)
    const credentials = execution.stdout.split('Password grant client created successfully.')[1].trim().split('\n')
    console.log(credentials)
    const clientId = credentials[0].replace('Client ID: ', '')
    const clientSecret = credentials[1].replace('Client secret: ', '')
    return {
      clientId,
      clientSecret,
    }
  }

  async addAPIKeyToFrontend(passportCredentials) {
    await this.performTextReplacements(passportCredentials)
    console.log('api to the frontend thing')
    console.log({
      passportCredentials,
    })
  }

  async createAdminUser() {
    cli.ux.info('Lets set you up as an admin')
    const command = await this
      .buildHomesteadCommand(`php artisan create-user --firstname=${await cli.ux.prompt('First Name')} --surname=${await cli.ux.prompt('Surname')} --email=${await cli.ux.prompt('Email Address')} --password=${await cli.ux.prompt('Password', {
        type: 'hide',
      })} --admin`)

    await this.executeCommand(command)
  }

  async createPackageJson() {
    const packageJson = path.join(this.projectDirectory, 'frontend', 'package.json')
    const packageJsonExample = path.join(this.projectDirectory, 'frontend', 'package.json.example')

    fs.rmSync(packageJson)
    fs.renameSync(packageJsonExample, packageJson)
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
