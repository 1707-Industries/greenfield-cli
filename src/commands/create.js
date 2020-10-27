const {Command, flags} = require('@oclif/command')
const cli = require('cli-ux');
const config = new (require('../config'));
const fs = require('fs');
const path = require('path');
const request = require('request');
const extract = require('extract-zip')

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
    'Great. Lets get started 👍🏻'
  ];

  async run() {
    const {flags} = this.parse(CreateCommand)
    const {args} = this.parse(CreateCommand)
    cli.ux.info(this.introMessages[Math.floor(Math.random()*this.introMessages.length)]);

    const name = await cli.ux.prompt('Project Name', {
      default: args.name,
    });

    const machineName = await cli.ux.prompt('Machine Name (nothing weird)', {
      default: this.slugify(name),
    });

    const projectDirectory = path.join(process.cwd(), machineName);
    fs.mkdirSync(projectDirectory);

    // Download and unzip projects
    for (const key of Object.keys(this.projectTemplates)) {
      cli.ux.info(`Downloading ${key}`);
      const destination = path.join(projectDirectory, `${key}.zip`);
      const download = await this.download(this.projectTemplates[key], destination);
      cli.ux.info(`Unzipping ${key}.zip`);

      let newDir = null;

      await extract(path.join(projectDirectory, `${key}.zip`), {
        dir: path.join(projectDirectory),
        onEntry: (entry) => {
          if(!newDir) {
            newDir = entry.fileName;
          }
        }
      });

      fs.renameSync(path.join(projectDirectory, newDir), path.join(projectDirectory, key));
      fs.rmSync(destination);
    }
  }

  download(url, filename){
    return new Promise(resolve => {
      request.head(url, () => {
        request(url).pipe(fs.createWriteStream(filename)).on('close', () => {
          resolve(filename);
        });
      });
    });
  }

  slugify(str) {
    str = str.replace(/^\s+|\s+$/g, ''); // trim
    str = str.toLowerCase();

    // remove accents, swap ñ for n, etc
    const from = "àáäâèéëêìíïîòóöôùúüûñç·/,:;";
    const to   = "aaaaeeeeiiiioooouuuunc-----";
    for (let i=0, l=from.length ; i<l ; i++) {
      str = str.replace(new RegExp(from.charAt(i), 'g'), to.charAt(i));
    }

    str = str.replace(/[^a-z0-9 -]/g, '') // remove invalid chars
      .replace(/\s+/g, '-') // collapse whitespace and replace by -
      .replace(/-+/g, '-'); // collapse dashes

    return str;
  }
}

CreateCommand.description = `Create a new project`

CreateCommand.flags = {
  homesteadDirectory: flags.string({
    char: 'd',
    description: 'Path to laravel homestead installation'
  }),
}

module.exports = CreateCommand
