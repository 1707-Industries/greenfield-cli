const {Command, flags} = require('@oclif/command')
const cli = require('cli-ux')
const config = new (require('../config'))
const fs = require('fs')
const path = require('path')
const request = require('request')
const extract = require('extract-zip')
const replace = require('replace-in-file')

class CreateCommand extends Command {
  static args = [
    {name: 'name'},
  ]

  projectTemplates = {
    api: 'https://github.com/Johnathan/API-Base/archive/master.zip',
    frontend: 'https://github.com/Johnathan/Frontend-Base/archive/master.zip',
  };

  introMessages = [
    '🙃 Nice. Another side project to work on for an hour or two and leave to rot',
    'Great. Lets get started 👍🏻',
    'Well this is exciting 🥳',
    'Reckon this will be "the one"? 🤔'
  ];

  name = null;
  machineName = null;
  projectDirectory = null;

  async run() {
    const {flags} = this.parse(CreateCommand)
    const {args} = this.parse(CreateCommand)

    cli.ux.info(this.introMessages[Math.floor(Math.random() * this.introMessages.length)]);
    this.name = await cli.ux.prompt('Project Name', {
      default: args.name,
    });

    this.machineName = await cli.ux.prompt('Machine Name (nothing weird)', {
      default: this.slugify(this.name),
    });

    this.projectDirectory = path.join(process.cwd(), this.machineName);

    // Create the project directory
    fs.mkdirSync(this.projectDirectory);

    cli.ux.info('Two secs, just downloading the template projects');
    await this.downloadAndExtractTemplates(this.projectDirectory);

    await this.createDotEnvFiles();

    cli.ux.info('Cool. Now lets get you setup');
    await this.performTextReplacements();
  }

  async performTextReplacements() {
    const replacements = {
      machineName: this.machineName,
      name: this.name,
      apiUrl: await cli.ux.prompt('API URL', {default: `api.${this.machineName}.test`}),
      backofficeUrl: await cli.ux.prompt('Backoffice URL', {default: `backoffice.${this.machineName}.test`}),
      frontendUrl: await cli.ux.prompt('Frontend URL', {default: `${this.machineName}.test`}),
      frontendPort: await cli.ux.prompt('Frontend Port', {default: 3000}),
    }

    for (let projectTemplatesKey in this.projectTemplates) {
      const replacementPath = [
        `${path.join(this.projectDirectory, projectTemplatesKey)}/**/*`,
        `${path.join(this.projectDirectory, projectTemplatesKey)}/.env`
      ];

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
    const keys = Object.keys(replacements);

    for(let index in keys) {
      let key = keys[index];
      const value = replacements[key];

      // ew.
      key = `\\{\\[${key}\\]\\}`;

      const regex = new RegExp(key, 'g');

      replace.sync({
        files: replacementPath,
        from: regex,
        to: value,
      });
    }
  }

  download(url, filename) {
    const options = {
      url,
      headers: {
        'Cache-Control': 'no-cache'
      }
    };

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
      const location = path.join(this.projectDirectory, key);
      fs.copyFileSync(path.join(location, '.env.example'), path.join(location, '.env'))
    }
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
